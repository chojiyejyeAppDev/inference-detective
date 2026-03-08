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
import { dailyReminderEmail, inactivityReminderEmail, subscriptionExpiryReminderEmail } from '@/lib/email/templates'
import type { ReminderSegment } from '@/lib/email/templates'

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
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString()

  // 최근 24시간 내 활동한 유저 ID (제외 대상)
  const { data: recentActive } = await supabase
    .from('user_progress')
    .select('user_id')
    .gt('created_at', oneDayAgo)

  const activeIds = new Set((recentActive ?? []).map((r) => r.user_id))

  // 각 유저의 마지막 활동 시간 조회 (세그먼트 데이터 포함)
  const { data: allProfiles, error } = await supabase
    .from('profiles')
    .select('id, nickname, created_at, current_level, subscription_status')
    .lt('created_at', oneDayAgo) // 가입 24시간 이후만
    .limit(300)

  if (error) {
    console.error('[daily-reminder] Query error:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  // 비활성 유저 필터 + 마지막 활동 시간 기준 분류 (세그먼트 포함)
  type ReminderTarget = {
    id: string; nickname: string; daysAway: number; type: '1day' | '3day' | '7day'
    segment: ReminderSegment
  }
  const targets: ReminderTarget[] = []

  for (const profile of allProfiles ?? []) {
    if (activeIds.has(profile.id)) continue

    // 마지막 활동 + 최근 정답률 병렬 조회
    const [{ data: lastActivity }, { data: recentProgress }] = await Promise.all([
      supabase
        .from('user_progress')
        .select('created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('user_progress')
        .select('is_correct, question_id')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const lastActiveAt = lastActivity?.created_at ?? profile.created_at
    const daysAway = Math.floor((now - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24))

    // 14일 이상은 스팸 방지로 스킵
    if (new Date(lastActiveAt) < new Date(fourteenDaysAgo)) continue

    // 세그먼트: 정답률
    const progressItems = recentProgress ?? []
    const correctCount = progressItems.filter((p) => p.is_correct).length
    const accuracy = progressItems.length > 0 ? correctCount / progressItems.length : null

    // 세그먼트: 약점 주제
    let weakTopic: string | null = null
    const wrongIds = progressItems.filter((p) => !p.is_correct).map((p) => p.question_id)
    if (wrongIds.length >= 2) {
      const { data: wrongQuestions } = await supabase
        .from('questions')
        .select('topic')
        .in('id', wrongIds.slice(0, 5))
      if (wrongQuestions && wrongQuestions.length > 0) {
        const counts: Record<string, number> = {}
        for (const q of wrongQuestions) counts[q.topic] = (counts[q.topic] ?? 0) + 1
        weakTopic = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      }
    }

    const segment: ReminderSegment = {
      level: profile.current_level ?? 1,
      isPremium: profile.subscription_status === 'active',
      weakTopic,
      accuracy,
    }

    // 정확히 해당 날짜에만 발송 (매일 중복 방지)
    if (daysAway === 1) {
      targets.push({ id: profile.id, nickname: profile.nickname ?? '탐정', daysAway, type: '1day', segment })
    } else if (daysAway === 3) {
      targets.push({ id: profile.id, nickname: profile.nickname ?? '탐정', daysAway, type: '3day', segment })
    } else if (daysAway === 7) {
      targets.push({ id: profile.id, nickname: profile.nickname ?? '탐정', daysAway, type: '7day', segment })
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
        html = dailyReminderEmail(target.nickname, target.segment)
      } else {
        subject = target.type === '7day'
          ? '다시 돌아와주세요! 새로운 문제가 기다려요'
          : '추론 훈련을 쉬고 있어요 — 감각을 유지하세요!'
        html = inactivityReminderEmail(target.nickname, target.daysAway, target.segment)
      }

      const result = await sendEmail({ to: email, subject, html })
      if (result.success) sentCount++
      else errors.push(`${target.id}: ${JSON.stringify(result.error)}`)
    } catch (err) {
      errors.push(`${target.id}: ${err}`)
    }
  }

  // ── 구독 만료 임박 알림 (D-3, D-1) ──
  let expirySentCount = 0
  const threeDaysFromNow = new Date(now + 3 * 24 * 60 * 60 * 1000)

  const { data: expiringSubscriptions } = await supabase
    .from('profiles')
    .select('id, nickname, subscription_expires_at')
    .eq('subscription_status', 'active')
    .not('subscription_expires_at', 'is', null)
    .lte('subscription_expires_at', threeDaysFromNow.toISOString())
    .gt('subscription_expires_at', new Date(now).toISOString())

  for (const profile of expiringSubscriptions ?? []) {
    if (expirySentCount >= 20) break

    const expiresAt = new Date(profile.subscription_expires_at!).getTime()
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))

    // Only send at D-3 and D-1
    if (daysLeft !== 3 && daysLeft !== 1) continue

    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
      const email = authUser?.user?.email
      if (!email) continue

      const { subject, html } = subscriptionExpiryReminderEmail(
        profile.nickname ?? '학습자',
        daysLeft,
      )
      const result = await sendEmail({ to: email, subject, html })
      if (result.success) expirySentCount++
      else errors.push(`expiry-${profile.id}: ${JSON.stringify(result.error)}`)
    } catch (err) {
      errors.push(`expiry-${profile.id}: ${err}`)
    }
  }

  return NextResponse.json({
    sent: sentCount,
    expirySent: expirySentCount,
    total: selected.length,
    breakdown: {
      '1day': targets.filter((t) => t.type === '1day').length,
      '3day': targets.filter((t) => t.type === '3day').length,
      '7day': targets.filter((t) => t.type === '7day').length,
      expiryReminder: expirySentCount,
    },
    errors: errors.length > 0 ? errors : undefined,
  })
}
