import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = await createServiceClient()
  const { data: scores, error } = await service
    .from('mock_scores')
    .select('*')
    .eq('user_id', user.id)
    .order('exam_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }

  // Also fetch user's level progression for correlation
  const { data: sessions } = await service
    .from('level_sessions')
    .select('level, accuracy, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ scores: scores ?? [], sessions: sessions ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { exam_date: string; score: number; notes?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.exam_date || typeof body.score !== 'number' || body.score < 0 || body.score > 100) {
    return NextResponse.json({ error: 'Invalid input: exam_date (string) and score (0-100) required' }, { status: 400 })
  }

  const service = await createServiceClient()
  const { data, error } = await service
    .from('mock_scores')
    .insert({
      user_id: user.id,
      exam_date: body.exam_date,
      score: body.score,
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
  }

  return NextResponse.json({ score: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const scoreId = searchParams.get('id')
  if (!scoreId) {
    return NextResponse.json({ error: 'Score ID required' }, { status: 400 })
  }

  const service = await createServiceClient()
  const { error } = await service
    .from('mock_scores')
    .delete()
    .eq('id', scoreId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete score' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
