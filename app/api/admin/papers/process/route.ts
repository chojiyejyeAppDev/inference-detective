import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { parsePdf, chunkText } from '@/lib/papers/parser'
import { generateQuestions, pickLeastUsedTopic } from '@/lib/papers/generator'
import type { Topic } from '@/lib/questions/types'

const MIN_QUESTIONS_PER_LEVEL = 10

export async function POST(request: Request) {
  // Auth: admin user check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const service = createServiceClient(supabaseUrl, serviceKey)

  // Get paper to process
  let paperId: string | undefined
  try {
    const body = await request.json()
    paperId = body.paperId
  } catch {
    // No body — pick oldest pending paper
  }

  const query = paperId
    ? service.from('papers').select('*').eq('id', paperId).limit(1)
    : service.from('papers').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(1)

  const { data: papers, error: fetchError } = await query
  if (fetchError || !papers || papers.length === 0) {
    return NextResponse.json({ message: '처리할 논문이 없습니다.' })
  }

  const paper = papers[0]

  // Mark as processing
  await service.from('papers').update({ status: 'processing' }).eq('id', paper.id)

  try {
    // 1. Download PDF from Storage
    const { data: fileData, error: dlError } = await service.storage
      .from('papers')
      .download(paper.storage_path)

    if (dlError || !fileData) {
      throw new Error(`PDF 다운로드 실패: ${dlError?.message}`)
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())

    // 2. Parse PDF
    const { text } = await parsePdf(buffer)
    if (!text || text.trim().length < 50) {
      throw new Error('PDF에서 충분한 텍스트를 추출할 수 없습니다')
    }

    // Save extracted text
    await service.from('papers').update({ extracted_text: text }).eq('id', paper.id)

    // 3. Check which levels need questions
    const levelCounts: Record<number, number> = {}
    for (let level = 1; level <= 7; level++) {
      const { count } = await service
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('difficulty_level', level)
      levelCounts[level] = count ?? 0
    }

    const deficitLevels = Object.entries(levelCounts)
      .filter(([, count]) => count < MIN_QUESTIONS_PER_LEVEL)
      .map(([level]) => Number(level))
      .sort((a, b) => (levelCounts[a] ?? 0) - (levelCounts[b] ?? 0))

    // If no deficit, generate for levels 3-5 (most commonly played)
    const targetLevels = deficitLevels.length > 0
      ? deficitLevels.slice(0, 3)
      : [3, 4, 5]

    // 4. Get topic distribution for balance
    const topicCounts: Record<Topic, number> = {
      humanities: 0, social: 0, science: 0, tech: 0, arts: 0,
    }
    const { data: topicData } = await service
      .from('questions')
      .select('topic')
    if (topicData) {
      for (const row of topicData) {
        const t = row.topic as Topic
        if (t in topicCounts) topicCounts[t]++
      }
    }

    // 5. Generate questions per target level
    const chunks = chunkText(text)
    let totalGenerated = 0
    const allErrors: string[] = []

    for (const level of targetLevels) {
      const topic = pickLeastUsedTopic(topicCounts)
      const chunkToUse = chunks[totalGenerated % chunks.length] ?? chunks[0]

      const result = await generateQuestions({
        text: chunkToUse,
        level,
        topic,
        count: 3,
        paperId: paper.id,
      })

      if (result.questions.length > 0) {
        const { error: insertError } = await service
          .from('questions')
          .insert(result.questions)

        if (!insertError) {
          totalGenerated += result.questions.length
          topicCounts[topic] += result.questions.length
        } else {
          allErrors.push(`레벨 ${level} 저장 실패: ${insertError.message}`)
        }
      }

      allErrors.push(...result.errors)
    }

    // 6. Mark as done
    await service.from('papers').update({
      status: 'done',
      questions_generated: totalGenerated,
      processed_at: new Date().toISOString(),
    }).eq('id', paper.id)

    return NextResponse.json({
      success: true,
      paperId: paper.id,
      questionsGenerated: totalGenerated,
      targetLevels,
      errors: allErrors,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[papers/process] Failed:', message)

    await service.from('papers').update({
      status: 'failed',
      error_message: message,
    }).eq('id', paper.id)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
