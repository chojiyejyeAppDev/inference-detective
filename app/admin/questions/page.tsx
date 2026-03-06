'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Question {
  id: string
  difficulty_level: number
  topic: string
  passage: string
  conclusion: string
  correct_chain: string[]
  created_at: string
}

const topicLabel: Record<string, string> = {
  humanities: '인문',
  social: '사회',
  science: '과학',
  tech: '기술',
  arts: '예술',
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState<number | null>(null)
  const [filterTopic, setFilterTopic] = useState<string | null>(null)

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('questions')
      .select('id, difficulty_level, topic, passage, conclusion, correct_chain, created_at')
      .order('difficulty_level')
      .order('created_at', { ascending: false })

    if (filterLevel) query = query.eq('difficulty_level', filterLevel)
    if (filterTopic) query = query.eq('topic', filterTopic)

    const { data } = await query
    setQuestions((data as Question[]) ?? [])
    setLoading(false)
  }, [filterLevel, filterTopic])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const handleDelete = async (id: string) => {
    if (!confirm('이 문제를 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('questions').delete().eq('id', id)
    fetchQuestions()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">문제 관리</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/questions/generate"
            className="px-4 py-2 rounded-lg border border-amber-500/50 text-amber-400 text-sm font-semibold hover:bg-amber-500/10 transition-colors"
          >
            AI 생성
          </Link>
          <Link
            href="/admin/questions/new"
            className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 text-sm font-semibold hover:bg-amber-400 transition-colors"
          >
            + 새 문제
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterLevel ?? ''}
          onChange={(e) => setFilterLevel(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg bg-slate-800 border border-slate-700 text-sm px-3 py-2 text-slate-200"
        >
          <option value="">전체 레벨</option>
          {[1, 2, 3, 4, 5, 6, 7].map((l) => (
            <option key={l} value={l}>레벨 {l}</option>
          ))}
        </select>
        <select
          value={filterTopic ?? ''}
          onChange={(e) => setFilterTopic(e.target.value || null)}
          className="rounded-lg bg-slate-800 border border-slate-700 text-sm px-3 py-2 text-slate-200"
        >
          <option value="">전체 주제</option>
          {Object.entries(topicLabel).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-slate-400 text-sm">로딩 중...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="py-3 px-2 text-slate-400 font-medium">레벨</th>
                <th className="py-3 px-2 text-slate-400 font-medium">주제</th>
                <th className="py-3 px-2 text-slate-400 font-medium">결론</th>
                <th className="py-3 px-2 text-slate-400 font-medium">체인</th>
                <th className="py-3 px-2 text-slate-400 font-medium">작업</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold">
                      {q.difficulty_level}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-slate-300">{topicLabel[q.topic] ?? q.topic}</td>
                  <td className="py-3 px-2 text-slate-300 max-w-xs truncate">{q.conclusion}</td>
                  <td className="py-3 px-2 text-slate-500 font-mono text-xs">
                    {q.correct_chain.join(' → ')}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/questions/${q.id}`}
                        className="text-xs text-amber-400 hover:text-amber-300"
                      >
                        편집
                      </Link>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {questions.length === 0 && (
            <p className="text-center text-slate-500 py-8">문제가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  )
}
