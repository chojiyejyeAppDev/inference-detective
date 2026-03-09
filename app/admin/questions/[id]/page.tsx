'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import QuestionForm from '../QuestionForm'

interface Sentence {
  id: string
  text: string
}

interface Hint {
  level: number
  text: string
}

interface QuestionData {
  id: string
  difficulty_level: number
  topic: string
  passage: string
  sentences: Sentence[]
  conclusion: string
  correct_chain: string[]
  hints: Hint[]
}

export default function EditQuestionPage() {
  const params = useParams()
  const id = params.id as string

  const [question, setQuestion] = useState<QuestionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .single()

      if (data) setQuestion(data as QuestionData)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <p className="text-slate-400 text-sm">로딩 중...</p>
  if (!question) return <p className="text-red-400 text-sm">문제를 찾을 수 없습니다.</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">문제 편집</h1>
      <QuestionForm initialData={question} />
    </div>
  )
}
