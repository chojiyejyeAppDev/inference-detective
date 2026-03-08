/**
 * Vercel Cron Job: Daily Reminder & Inactivity Email
 *
 * - 1일 미접속: 일일 리마인더
 * - 3일 미접속: 리텐션 이메일 (짧은 버전)
 * - 7일 미접속: 리텐션 이메일 (긴 버전)
 *
 * Schedule: Every day at 8:00 AM KST (23:00 UTC previous day)
 * Endpoint: GET /api/cron/daily-reminder
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/resend'
import { dailyReminderEmail, inactivityReminderEmail } from '@/lib/email/templates'

const MAX_EMAILS_PER_RUN = 50

export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 기간별 비활성 유저 조회
  const now = Date.now()
  const oneDayAgo = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString()
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString()

  // 최근 24시간 내 활동한 유저 ID (제외 대상)
  const { data: recentActive } = await supabase
    .from('user_progress')
    .select('user_id')
    .gt('created_at', oneDayAgo)

  const activeIds = new Set((recentActive ?? []).map((r) => r.user_id))

  // 각 유저의 마지막 활동 시간 조회
  const { data: allProfiles, error } = await supabase
    .from('profiles')
    .select('id, nickname, created_at')
    .lt('created_at', oneDayAgo) // 가입 24시간 이후만
    .limit(300)

  if (error) {
    console.error('[daily-reminder] Query error:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  // 비활성 유저 필터 + 마지막 활동 시간 기준 분류
  type ReminderTarget = { id: string; nickname: string; daysAway: number; type: '1day' | '3day' | '7day' }
  const targets: ReminderTarget[] = []

  for (const profile of allProfiles ?? []) {
    if (activeIds.has(profile.id)) continue

    // 마지막 활동 시간 조회
    const { data: lastActivity } = await supabase
      .from('user_progress')
      .select('created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastActiveAt = lastActivity?.created_at ?? profile.created_at
    const daysAway = Math.floor((now - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24))

    // 14일 이상은 스팸 방지로 스킵
    if (new Date(lastActiveAt) < new Date(fourteenDaysAgo)) continue

    // 정확히 해당 날짜에만 발송 (매일 중복 방지)
    if (daysAway === 1) {
      targets.push({ id: profile.id, nickname: profile.nickname ?? '탐정', daysAway, type: '1day' })
    } else if (daysAway === 3) {
      targets.push({ id: profile.id, nickname: profile.nickname ?? '탐정', daysAway, type: '3day' })
    } else if (daysAway === 7) {
      targets.push({ id: profile.id, nickname: profile.nickname ?? '탐정', daysAway, type: '7day' })
    }
  }

  const selected = targets.slice(0, MAX_EMAILS_PER_RUN)

  let sentCount = 0
  const errors: string[] = []

  for (const target of selected) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(target.id)
      const email = authUser?.user?.email
      if (!email) continue

      let subject: string
      let html: string

      if (target.type === '1day') {
        subject = '오늘의 추론 문제가 기다리고 있어요!'
        html = dailyReminderEmail(target.nickname)
      } else {
        subject = target.type === '7day'
          ? '다시 돌아와주세요! 새로운 문제가 기다려요'
          : '추론 훈련을 쉬고 있어요 — 감각을 유지하세요!'
        html = inactivityReminderEmail(target.nickname, target.daysAway)
      }

      const result = await sendEmail({ to: email, subject, html })
      if (result.success) sentCount++
      else errors.push(`${target.id}: ${JSON.stringify(result.error)}`)
    } catch (err) {
      errors.push(`${target.id}: ${err}`)
    }
  }

  return NextResponse.json({
    sent: sentCount,
    total: selected.length,
    breakdown: {
      '1day': targets.filter((t) => t.type === '1day').length,
      '3day': targets.filter((t) => t.type === '3day').length,
      '7day': targets.filter((t) => t.type === '7day').length,
    },
    errors: errors.length > 0 ? errors : undefined,
  })
}
