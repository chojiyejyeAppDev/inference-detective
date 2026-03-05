/**
 * Vercel Cron Job: Daily Question Pool Health Check
 *
 * Checks question counts per difficulty level and reports stats.
 * Questions are served directly from the DB by /api/game/question,
 * so this cron ensures adequate question pool coverage.
 *
 * Schedule: Every day at 7:00 AM KST (22:00 UTC previous day)
 * Endpoint: GET /api/cron/generate-questions
 *
 * Protected by CRON_SECRET env var to prevent unauthorized access.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MIN_QUESTIONS_PER_LEVEL = 5

// ── Main handler ───────────────────────────────
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Check question counts per difficulty level
  const levelStats: { level: number; count: number; healthy: boolean }[] = []
  const warnings: string[] = []

  for (let level = 1; level <= 7; level++) {
    const { count, error } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('difficulty_level', level)

    if (error) {
      console.error(`[Cron] Failed to count level ${level} questions:`, error.message)
      levelStats.push({ level, count: 0, healthy: false })
      warnings.push(`Level ${level}: query failed`)
      continue
    }

    const questionCount = count ?? 0
    const healthy = questionCount >= MIN_QUESTIONS_PER_LEVEL

    levelStats.push({ level, count: questionCount, healthy })

    if (!healthy) {
      warnings.push(`Level ${level}: only ${questionCount} questions (min: ${MIN_QUESTIONS_PER_LEVEL})`)
    }
  }

  const totalQuestions = levelStats.reduce((sum, s) => sum + s.count, 0)
  const allHealthy = warnings.length === 0

  if (!allHealthy) {
    console.warn(`[Cron] Question pool warnings:`, warnings.join('; '))
  }

  console.log(`[Cron] Daily health check: ${totalQuestions} total questions, ${allHealthy ? 'all levels healthy' : `${warnings.length} warnings`}`)

  return NextResponse.json({
    success: true,
    date: new Date().toISOString().slice(0, 10),
    total_questions: totalQuestions,
    all_healthy: allHealthy,
    levels: levelStats,
    warnings,
  })
}
