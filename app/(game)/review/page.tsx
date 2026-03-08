import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ReviewList from '@/components/review/ReviewList'

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const service = await createServiceClient()

  // Check subscription status
  const { data: profile } = await service
    .from('profiles')
    .select('subscription_status, role')
    .eq('id', user.id)
    .single()

  const isPremium = profile?.subscription_status === 'active' || profile?.role === 'admin'

  // 최근 50개 풀이 기록 (오답 우선)
  // Only include correct_chain for premium users or correctly-solved questions
  const { data: progress } = await service
    .from('user_progress')
    .select('*, questions(id, difficulty_level, topic, passage, sentences, conclusion, correct_chain)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = (progress ?? [])
    .filter((p) => p.questions)
    .map((p) => {
      const q = p.questions as {
        id: string
        difficulty_level: number
        topic: string
        passage: string
        sentences: { id: string; text: string }[]
        conclusion: string
        correct_chain: string[]
      }
      return {
        id: p.id,
        questionId: p.question_id,
        isCorrect: p.is_correct,
        submittedChain: p.submitted_chain as string[],
        hintsUsed: p.hints_used ?? 0,
        createdAt: p.created_at,
        // m-7: Only expose correct_chain for premium users or already-correct submissions
        question: (isPremium || p.is_correct)
          ? q
          : { ...q, correct_chain: [] },
      }
    })

  return <ReviewList items={items} />
}
