/**
 * Vercel Cron Job: Daily Question Pool Replenishment
 *
 * 1. Check question counts per level (min 10)
 * 2. Process any pending papers
 * 3. Generate questions for deficit levels using paper text or AI self-generation
 *
 * Schedule: Every day at 7:00 AM KST (22:00 UTC)
 * Endpoint: GET /api/cron/generate-questions
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateQuestions, pickLeastUsedTopic } from '@/lib/papers/generator'
import type { Topic } from '@/lib/questions/types'

const MIN_QUESTIONS_PER_LEVEL = 10

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const log: string[] = []

  // Step 1: Check level counts
  const levelCounts: Record<number, number> = {}
  for (let level = 1; level <= 7; level++) {
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('difficulty_level', level)
    levelCounts[level] = count ?? 0
  }

  const deficitLevels = Object.entries(levelCounts)
    .filter(([, count]) => count < MIN_QUESTIONS_PER_LEVEL)
    .map(([level]) => Number(level))
    .sort((a, b) => (levelCounts[a] ?? 0) - (levelCounts[b] ?? 0))

  log.push(`레벨별 현황: ${JSON.stringify(levelCounts)}`)
  log.push(`부족 레벨: ${deficitLevels.length > 0 ? deficitLevels.join(', ') : '없음'}`)

  // Step 2: Process pending papers (trigger fire-and-forget)
  const { data: pendingPapers } = await supabase
    .from('papers')
    .select('id')
    .eq('status', 'pending')
    .limit(3)

  if (pendingPapers && pendingPapers.length > 0) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inference-detective.vercel.app'
    for (const paper of pendingPapers) {
      fetch(`${appUrl}/api/admin/papers/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId: paper.id }),
      }).catch(err => console.error('[cron] Process trigger failed:', err))
    }
    log.push(`미처리 논문 ${pendingPapers.length}개 처리 트리거`)
  }

  // Step 3: Generate for deficit levels
  if (deficitLevels.length === 0) {
    log.push('모든 레벨이 충분합니다. 생성 건너뜀.')
    console.log(`[Cron] 헬스 체크 완료: 모든 레벨 충분`)
    return NextResponse.json({
      success: true,
      date: new Date().toISOString().slice(0, 10),
      total_questions: Object.values(levelCounts).reduce((a, b) => a + b, 0),
      generated: 0,
      log,
    })
  }

  // Get topic distribution
  const topicCounts: Record<Topic, number> = {
    humanities: 0, social: 0, science: 0, tech: 0, arts: 0,
  }
  const { data: topicData } = await supabase.from('questions').select('topic')
  if (topicData) {
    for (const row of topicData) {
      const t = row.topic as Topic
      if (t in topicCounts) topicCounts[t]++
    }
  }

  // Try to use existing paper text first
  const { data: donePapers } = await supabase
    .from('papers')
    .select('id, extracted_text')
    .eq('status', 'done')
    .not('extracted_text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5)

  let totalGenerated = 0

  for (const level of deficitLevels.slice(0, 3)) {
    const topic = pickLeastUsedTopic(topicCounts)
    const needed = MIN_QUESTIONS_PER_LEVEL - (levelCounts[level] ?? 0)
    const count = Math.min(needed, 3)

    // Use paper text if available, otherwise AI self-generate
    const paperIndex = totalGenerated % (donePapers?.length || 1)
    const paperText = donePapers?.[paperIndex]?.extracted_text
    const paperId = paperText ? donePapers?.[paperIndex]?.id : undefined

    const result = await generateQuestions({
      text: paperText ? paperText.slice(0, 4000) : '',
      level,
      topic,
      count,
      paperId,
    })

    if (result.questions.length > 0) {
      const { error: insertError } = await supabase
        .from('questions')
        .insert(result.questions)

      if (!insertError) {
        totalGenerated += result.questions.length
        topicCounts[topic] += result.questions.length
        log.push(`레벨 ${level} (${topic}): ${result.questions.length}개 생성`)
      } else {
        log.push(`레벨 ${level} 저장 실패: ${insertError.message}`)
      }
    }

    if (result.errors.length > 0) {
      log.push(`레벨 ${level} 경고: ${result.errors.join('; ')}`)
    }
  }

  console.log(`[Cron] 보충 생성 완료: ${totalGenerated}개`)

  return NextResponse.json({
    success: true,
    date: new Date().toISOString().slice(0, 10),
    total_questions: Object.values(levelCounts).reduce((a, b) => a + b, 0) + totalGenerated,
    generated: totalGenerated,
    deficit_levels: deficitLevels,
    log,
  })
}
