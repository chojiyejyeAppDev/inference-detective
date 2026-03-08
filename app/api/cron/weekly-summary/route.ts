/**
 * Vercel Cron Job: Weekly Performance Summary Email
 *
 * Sends a weekly summary email to users who solved at least 1 question this week.
 *
 * Schedule: Every Monday at 9:00 AM KST (Sunday 00:00 UTC)
 * Endpoint: GET /api/cron/weekly-summary
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/resend'
import { weeklySummaryEmail } from '@/lib/email/templates'

const MAX_EMAILS_PER_RUN = 100

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 지난 7일간 활동 데이터
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: weekProgress, error } = await supabase
    .from('user_progress')
    .select('user_id, is_correct, created_at')
    .gte('created_at', sevenDaysAgo)

  if (error) {
    console.error('[weekly-summary] Query error:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  if (!weekProgress || weekProgress.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No active users this week' })
  }

  // 유저별 통계 집계
  const userStats = new Map<string, { totalSolved: number; correctCount: number }>()
  for (const p of weekProgress) {
    const existing = userStats.get(p.user_id) ?? { totalSolved: 0, correctCount: 0 }
    existing.totalSolved++
    if (p.is_correct) existing.correctCount++
    userStats.set(p.user_id, existing)
  }

  // 프로필 조회 (레벨, 닉네임)
  const userIds = [...userStats.keys()].slice(0, MAX_EMAILS_PER_RUN)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, current_level')
    .in('id', userIds)

  // 이번 주 활동 일수 계산 (streak 대용)
  const activeDaysMap = new Map<string, number>()
  for (const p of weekProgress) {
    const day = new Date(p.created_at).toISOString().slice(0, 10)
    const key = `${p.user_id}:${day}`
    if (!activeDaysMap.has(key)) {
      activeDaysMap.set(key, 1)
    }
  }
  const userActiveDays = new Map<string, number>()
  for (const key of activeDaysMap.keys()) {
    const userId = key.split(':')[0]
    userActiveDays.set(userId, (userActiveDays.get(userId) ?? 0) + 1)
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  let sentCount = 0
  const errors: string[] = []

  for (const userId of userIds) {
    try {
      const stats = userStats.get(userId)!
      const profile = profileMap.get(userId)
      if (!profile) continue

      const { data: authUser } = await supabase.auth.admin.getUserById(userId)
      const email = authUser?.user?.email
      if (!email) continue

      const accuracy = stats.totalSolved > 0 ? stats.correctCount / stats.totalSolved : 0

      const mail = weeklySummaryEmail(profile.nickname ?? '탐정', {
        totalSolved: stats.totalSolved,
        correctCount: stats.correctCount,
        accuracy,
        currentLevel: profile.current_level ?? 1,
        streak: userActiveDays.get(userId) ?? 0,
      })

      const result = await sendEmail({ to: email, ...mail })
      if (result.success) sentCount++
      else errors.push(`${userId}: ${JSON.stringify(result.error)}`)
    } catch (err) {
      errors.push(`${userId}: ${err}`)
    }
  }

  return NextResponse.json({
    sent: sentCount,
    total: userIds.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
