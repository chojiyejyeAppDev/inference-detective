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

interface QuestionData {
  id?: string
  difficulty_level: number
  topic: string
  passage: string
  sentences: Sentence[]
  conclusion: string
  correct_chain: string[]
  hints: Hint[]
}

interface QuestionFormProps {
  initialData?: QuestionData
}

const TOPICS = [
  { value: 'humanities', label: '인문' },
  { value: 'social', label: '사회' },
  { value: 'science', label: '과학' },
  { value: 'tech', label: '기술' },
  { value: 'arts', label: '예술' },
]

export default function QuestionForm({ initialData }: QuestionFormProps) {
  const router = useRouter()
  const isEdit = !!initialData?.id

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [level, setLevel] = useState(initialData?.difficulty_level ?? 1)
  const [topic, setTopic] = useState(initialData?.topic ?? 'humanities')
  const [passage, setPassage] = useState(initialData?.passage ?? '')
  const [conclusion, setConclusion] = useState(initialData?.conclusion ?? '')
  const [correctChain, setCorrectChain] = useState(initialData?.correct_chain?.join(', ') ?? '')

  const [sentences, setSentences] = useState<Sentence[]>(
    initialData?.sentences ?? [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }]
  )

  const [hints, setHints] = useState<Hint[]>(
    initialData?.hints ?? [{ level: 1, text: '' }, { level: 2, text: '' }, { level: 3, text: '' }]
  )

  const addSentence = () => {
    const nextId = String.fromCharCode(97 + sentences.length) // a, b, c, d...
    setSentences([...sentences, { id: nextId, text: '' }])
  }

  const removeSentence = (idx: number) => {
    setSentences(sentences.filter((_, i) => i !== idx))
  }

  const updateSentence = (idx: number, text: string) => {
    const updated = [...sentences]
    updated[idx] = { ...updated[idx], text }
    setSentences(updated)
  }

  const updateHint = (idx: number, text: string) => {
    const updated = [...hints]
    updated[idx] = { ...updated[idx], text }
    setHints(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const chain = correctChain.split(',').map((s) => s.trim()).filter(Boolean)

    const questionData = {
      difficulty_level: level,
      topic,
      passage,
      sentences,
      conclusion,
      correct_chain: chain,
      hints: hints.filter((h) => h.text.trim()),
    }

    const supabase = createClient()

    if (isEdit) {
      const { error: err } = await supabase
        .from('questions')
        .update(questionData)
        .eq('id', initialData.id)
      if (err) {
        setError(err.message)
        setSaving(false)
        return
      }
    } else {
      const { error: err } = await supabase
        .from('questions')
        .insert(questionData)
      if (err) {
        setError(err.message)
        setSaving(false)
        return
      }
    }

    router.push('/admin/questions')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="border border-red-500/40 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Level & Topic */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-stone-500 mb-1">레벨</label>
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="w-full bg-white border border-exam-rule text-sm px-3 py-2 text-exam-ink"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((l) => (
              <option key={l} value={l}>레벨 {l}</option>
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
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Passage */}
      <div>
        <label className="block text-xs text-stone-500 mb-1">지문</label>
        <textarea
          value={passage}
          onChange={(e) => setPassage(e.target.value)}
          rows={5}
          required
          className="w-full bg-white border border-exam-rule text-sm px-3 py-2 text-exam-ink resize-y"
        />
      </div>

      {/* Conclusion */}
      <div>
        <label className="block text-xs text-stone-500 mb-1">결론 (증명할 명제)</label>
        <textarea
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          rows={2}
          required
          className="w-full bg-white border border-exam-rule text-sm px-3 py-2 text-exam-ink resize-y"
        />
      </div>

      {/* Sentences */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-stone-500">보기 카드</label>
          <button
            type="button"
            onClick={addSentence}
            className="text-xs text-exam-red hover:text-red-700"
          >
            + 카드 추가
          </button>
        </div>
        <div className="space-y-2">
          {sentences.map((s, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="shrink-0 w-7 h-9 flex items-center justify-center bg-stone-100 text-xs font-mono text-stone-700">
                {s.id}
              </span>
              <input
                value={s.text}
                onChange={(e) => updateSentence(i, e.target.value)}
                placeholder={`보기 ${s.id}`}
                required
                className="flex-1 bg-white border border-exam-rule text-sm px-3 py-2 text-exam-ink"
              />
              {sentences.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeSentence(i)}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-2"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Correct chain */}
      <div>
        <label className="block text-xs text-stone-500 mb-1">정답 체인 (쉼표 구분: a, b, c)</label>
        <input
          value={correctChain}
          onChange={(e) => setCorrectChain(e.target.value)}
          placeholder="a, b, c"
          required
          className="w-full bg-white border border-exam-rule text-sm px-3 py-2 text-exam-ink font-mono"
        />
      </div>

      {/* Hints */}
      <div>
        <label className="block text-xs text-stone-500 mb-2">힌트</label>
        <div className="space-y-2">
          {hints.map((h, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="shrink-0 w-7 h-9 flex items-center justify-center bg-stone-100 text-xs text-stone-700">
                {h.level}
              </span>
              <input
                value={h.text}
                onChange={(e) => updateHint(i, e.target.value)}
                placeholder={`힌트 ${h.level}`}
                className="flex-1 bg-white border border-exam-rule text-sm px-3 py-2 text-exam-ink"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-exam-ink text-white text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
        >
          {saving ? '저장 중...' : isEdit ? '수정' : '추가'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/questions')}
          className="px-6 py-2 border border-exam-rule text-stone-700 text-sm hover:bg-stone-100 transition-colors"
        >
          취소
        </button>
      </div>
    </form>
  )
}
