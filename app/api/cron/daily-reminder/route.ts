/**
 * Vercel Cron Job: Daily Reminder Email
 *
 * Sends a reminder email to users who haven't played in 1-3 days.
 *
 * Schedule: Every day at 8:00 AM KST (23:00 UTC previous day)
 * Endpoint: GET /api/cron/daily-reminder
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/resend'
import { dailyReminderEmail } from '@/lib/email/templates'

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

  // 최근 24시간 내 활동한 유저 ID 조회
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: recentActive } = await supabase
    .from('user_progress')
    .select('user_id')
    .gt('created_at', oneDayAgo)

  const activeIds = new Set((recentActive ?? []).map((r) => r.user_id))

  // 전체 프로필 조회 (최근 가입 유저 제외 — 가입 후 하루 이내는 리마인더 불필요)
  const { data: allProfiles, error } = await supabase
    .from('profiles')
    .select('id, nickname, created_at')
    .lt('created_at', oneDayAgo)
    .limit(200)

  if (error) {
    console.error('[daily-reminder] Query error:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  // 최근 활동하지 않은 유저만 필터
  const inactiveUsers = (allProfiles ?? [])
    .filter((p) => !activeIds.has(p.id))
    .slice(0, MAX_EMAILS_PER_RUN)

  if (!inactiveUsers.length) {
    return NextResponse.json({ sent: 0, message: 'No inactive users found' })
  }

  let sentCount = 0
  const errors: string[] = []

  for (const profile of inactiveUsers) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
      const email = authUser?.user?.email
      if (!email) continue

      const result = await sendEmail({
        to: email,
        subject: '오늘의 추론 문제가 기다리고 있어요!',
        html: dailyReminderEmail(profile.nickname ?? '탐정'),
      })

      if (result.success) sentCount++
      else errors.push(`${profile.id}: ${JSON.stringify(result.error)}`)
    } catch (err) {
      errors.push(`${profile.id}: ${err}`)
    }
  }

  return NextResponse.json({
    sent: sentCount,
    total: inactiveUsers.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
