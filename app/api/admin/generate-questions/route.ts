import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQuestionsSchema } from '@/lib/api/schemas'
import { generateQuestions } from '@/lib/papers/generator'
import type { Topic } from '@/lib/questions/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = generateQuestionsSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { text, level, topic, count } = parsed.data

  const result = await generateQuestions({
    text,
    level,
    topic: topic as Topic,
    count,
  })

  if (result.questions.length === 0 && result.errors.length > 0) {
    return NextResponse.json({ error: result.errors.join('; ') }, { status: 500 })
  }

  return NextResponse.json({
    questions: result.questions,
    errors: result.errors,
  })
}
