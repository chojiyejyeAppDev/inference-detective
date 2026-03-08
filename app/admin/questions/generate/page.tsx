'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Sentence {
  id: string
  text: string
}

interface Hint {
  level: number
  text: string
}

interface GeneratedQuestion {
  difficulty_level: number
  topic: string
  passage: string
  sentences: Sentence[]
  conclusion: string
  correct_chain: string[]
  hints: Hint[]
}

const TOPICS = [
  { value: 'humanities', label: '인문' },
  { value: 'social', label: '사회' },
  { value: 'science', label: '과학' },
  { value: 'tech', label: '기술' },
  { value: 'arts', label: '예술' },
]

export default function GenerateQuestionsPage() {
  const router = useRouter()

  const [text, setText] = useState('')
  const [level, setLevel] = useState(3)
  const [topic, setTopic] = useState('social')
  const [count, setCount] = useState(3)

  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('텍스트를 입력해주세요.')
      return
    }

    setGenerating(true)
    setError('')
    setQuestions([])
    setSelected(new Set())

    try {
      const res = await fetch('/api/admin/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, level, topic, count }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '문제 생성에 실패했습니다.')
        return
      }

      setQuestions(data.questions)
      // Select all by default
      setSelected(new Set(data.questions.map((_: GeneratedQuestion, i: number) => i)))
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleSave = async () => {
    const toSave = questions.filter((_, i) => selected.has(i))
    if (toSave.length === 0) {
      setError('저장할 문제를 선택해주세요.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: err } = await supabase.from('questions').insert(toSave)

      if (err) {
        setError(`저장 실패: ${err.message}`)
        return
      }

      router.push('/admin/questions')
      router.refresh()
    } catch {
      setError('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-exam-ink">AI 문제 생성</h1>
      <p className="text-sm text-stone-500">
        논문이나 지문 텍스트를 입력하면 AI가 추론 문제를 자동으로 생성합니다.
      </p>

      {error && (
        <div className="border border-red-500/40 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Input section */}
      <div className="space-y-4 max-w-3xl">
        <div>
          <label className="block text-xs text-stone-500 mb-1">
            원문 텍스트 (논문, 기사, 교과서 등)
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder="여기에 논문이나 지문 텍스트를 붙여넣으세요..."
            className="w-full bg-white border border-exam-rule text-sm px-3 py-2 text-exam-ink resize-y placeholder:text-stone-400"
          />
          <p className="text-xs text-stone-400 mt-1">
            {text.length.toLocaleString()}자 입력됨 (최대 15,000자 사용)
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-stone-500 mb-1">레벨</label>
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="w-full bg-white border border-exam-rule text-sm px-3 py-2 text-exam-ink"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((l) => (
                <option key={l} value={l}>
                  레벨 {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">주제</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-white border border-exam-rule text-sm px-3 py-2 text-exam-ink"
            >
              {TOPICS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">생성 개수</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full bg-white border border-exam-rule text-sm px-3 py-2 text-exam-ink"
            >
              {[1, 2, 3, 5, 10].map((c) => (
                <option key={c} value={c}>
                  {c}개
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !text.trim()}
          className="px-6 py-2 bg-exam-ink text-white text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? 'AI 생성 중...' : 'AI로 문제 생성'}
        </button>
      </div>

      {/* Loading indicator */}
      {generating && (
        <div className="flex items-center gap-3 py-8">
          <div className="w-5 h-5 border-2 border-exam-ink border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-stone-500">AI가 문제를 생성하고 있습니다... (약 10~30초)</p>
        </div>
      )}

      {/* Results */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-exam-ink">
              생성된 문제 ({questions.length}개)
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (selected.size === questions.length) setSelected(new Set())
                  else setSelected(new Set(questions.map((_, i) => i)))
                }}
                className="text-xs text-stone-500 hover:text-exam-ink transition-colors"
              >
                {selected.size === questions.length ? '전체 해제' : '전체 선택'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || selected.size === 0}
                className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {saving ? '저장 중...' : `선택한 ${selected.size}개 저장`}
              </button>
            </div>
          </div>

          {questions.map((q, idx) => (
            <div
              key={idx}
              onClick={() => toggleSelect(idx)}
              className={`border p-5 cursor-pointer transition-colors ${
                selected.has(idx)
                  ? 'border-exam-ink bg-stone-50'
                  : 'border-exam-rule bg-white hover:border-stone-400'
              }`}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`shrink-0 w-5 h-5 border-2 flex items-center justify-center mt-0.5 ${
                    selected.has(idx)
                      ? 'border-exam-ink bg-exam-ink'
                      : 'border-stone-300'
                  }`}
                >
                  {selected.has(idx) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-stone-100 text-exam-ink">
                      레벨 {q.difficulty_level}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-stone-100 text-stone-700">
                      {TOPICS.find((t) => t.value === q.topic)?.label ?? q.topic}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium bg-stone-100 text-stone-500">
                      {q.correct_chain.join(' → ')}
                    </span>
                  </div>

                  {/* Passage */}
                  <p className="text-sm text-stone-700 mb-3 leading-relaxed">{q.passage}</p>

                  {/* Conclusion */}
                  <p className="text-sm text-exam-red mb-3">
                    <span className="text-stone-400">결론:</span> {q.conclusion}
                  </p>

                  {/* Sentences */}
                  <div className="space-y-1.5 mb-3">
                    {q.sentences.map((s) => {
                      const isCorrect = q.correct_chain.includes(s.id)
                      return (
                        <div
                          key={s.id}
                          className={`flex gap-2 items-start text-sm ${
                            isCorrect ? 'text-exam-ink' : 'text-red-400/70'
                          }`}
                        >
                          <span className="shrink-0 w-5 h-5 bg-stone-100 flex items-center justify-center text-xs font-mono">
                            {s.id}
                          </span>
                          <span>
                            {s.text}
                            {!isCorrect && <span className="text-xs text-red-500 ml-1">(오답)</span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Hints */}
                  {q.hints.length > 0 && (
                    <div className="text-xs text-stone-400 space-y-0.5">
                      {q.hints.map((h) => (
                        <p key={h.level}>힌트 {h.level}: {h.text}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
