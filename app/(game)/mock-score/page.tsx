'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { toast } from 'sonner'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

interface MockScore {
  id: string
  exam_date: string
  score: number
  notes: string | null
}

interface LevelSession {
  level: number
  accuracy: number
  created_at: string
}

export default function MockScorePage() {
  const router = useRouter()
  const [scores, setScores] = useState<MockScore[]>([])
  const [sessions, setSessions] = useState<LevelSession[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split('T')[0])
  const [score, setScore] = useState('')
  const [notes, setNotes] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/game/mock-score')
      if (res.ok) {
        const data = await res.json()
        setScores(data.scores)
        setSessions(data.sessions)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const scoreNum = parseInt(score)
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      toast.error('점수는 0~100 사이로 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/game/mock-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_date: examDate,
          score: scoreNum,
          notes: notes || undefined,
        }),
      })

      if (res.ok) {
        toast.success('모의고사 점수가 기록되었어요!')
        setScore('')
        setNotes('')
        setShowForm(false)
        fetchData()
      } else {
        toast.error('저장에 실패했어요.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/game/mock-score?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('삭제되었어요.')
      setScores((prev) => prev.filter((s) => s.id !== id))
    }
  }

  // Calculate trend
  const trend = scores.length >= 2
    ? scores[scores.length - 1].score - scores[scores.length - 2].score
    : null

  // Build chart data: merge mock scores with IRUDA level at that time
  const chartData = scores.map((s) => {
    // Find the user's level around the exam date
    const examTime = new Date(s.exam_date).getTime()
    const nearestSession = sessions.reduce<LevelSession | null>((best, sess) => {
      const sessTime = new Date(sess.created_at).getTime()
      if (!best) return sess
      const bestDiff = Math.abs(new Date(best.created_at).getTime() - examTime)
      const sessDiff = Math.abs(sessTime - examTime)
      return sessDiff < bestDiff ? sess : best
    }, null)

    return {
      date: new Date(s.exam_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      score: s.score,
      irudaLevel: nearestSession?.level ?? null,
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-exam-ink border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-exam-ink transition-colors mb-6"
          >
            <ArrowLeft size={14} />
            돌아가기
          </button>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-exam-serif font-bold text-exam-ink">모의고사 기록</h1>
              <p className="text-stone-500 text-sm mt-0.5">비문학 점수를 기록하고 성장을 추적하세요</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-4 py-2 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors"
            >
              <Plus size={14} />
              기록 추가
            </button>
          </div>
        </motion.div>

        {/* Input form */}
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            onSubmit={handleSubmit}
            className="border border-exam-rule bg-white p-5 mb-6"
          >
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">점수 입력</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="examDate" className="block text-xs text-stone-500 mb-1.5">시험 날짜</label>
                <input
                  id="examDate"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-exam-rule bg-white text-sm text-exam-ink focus:border-exam-ink focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label htmlFor="score" className="block text-xs text-stone-500 mb-1.5">
                  비문학 정답률 (0~100)
                </label>
                <input
                  id="score"
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="85"
                  className="w-full px-3 py-2.5 border border-exam-rule bg-white text-sm text-exam-ink placeholder-stone-400 focus:border-exam-ink focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="notes" className="block text-xs text-stone-500 mb-1.5">메모 (선택)</label>
              <input
                id="notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="6월 모의고사, 시간 부족했음"
                className="w-full px-3 py-2.5 border border-exam-rule bg-white text-sm text-exam-ink placeholder-stone-400 focus:border-exam-ink focus:outline-none transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !score}
                className="px-5 py-2 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-exam-rule text-stone-500 text-sm hover:border-stone-400 transition-colors"
              >
                취소
              </button>
            </div>
          </motion.form>
        )}

        {/* Summary stats */}
        {scores.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="border border-exam-rule bg-white p-4 text-center">
              <p className="text-xs text-stone-500 mb-1">최근 점수</p>
              <p className="text-xl font-black text-exam-ink">{scores[scores.length - 1].score}%</p>
            </div>
            <div className="border border-exam-rule bg-white p-4 text-center">
              <p className="text-xs text-stone-500 mb-1">최고 점수</p>
              <p className="text-xl font-black text-exam-ink">{Math.max(...scores.map((s) => s.score))}%</p>
            </div>
            <div className="border border-exam-rule bg-white p-4 text-center">
              <p className="text-xs text-stone-500 mb-1">변화</p>
              <div className="flex items-center justify-center gap-1">
                {trend !== null ? (
                  <>
                    {trend > 0 ? (
                      <TrendingUp size={16} className="text-green-700" />
                    ) : trend < 0 ? (
                      <TrendingDown size={16} className="text-exam-red" />
                    ) : (
                      <Minus size={16} className="text-stone-400" />
                    )}
                    <span className={`text-xl font-black ${trend > 0 ? 'text-green-700' : trend < 0 ? 'text-exam-red' : 'text-stone-400'}`}>
                      {trend > 0 ? '+' : ''}{trend}
                    </span>
                  </>
                ) : (
                  <span className="text-xl font-black text-stone-300">-</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length >= 2 && (
          <div className="border border-exam-rule bg-white p-5 mb-6">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">점수 추이</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#a8a29e" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#a8a29e" />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: '1px solid #d6d3d1' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((value: number, name: string) => {
                    if (name === 'score') return [`${value}%`, '비문학 정답률']
                    if (name === 'irudaLevel') return [`Lv.${value}`, '이:르다 레벨']
                    return [`${value}`, name]
                  }) as any}
                />
                <ReferenceLine y={80} stroke="#dc2626" strokeDasharray="3 3" label={{ value: '목표 80%', fontSize: 10, fill: '#dc2626' }} />
                <Line type="monotone" dataKey="score" stroke="#1c1917" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                {chartData.some((d) => d.irudaLevel !== null) && (
                  <Line type="stepAfter" dataKey="irudaLevel" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} yAxisId={0} />
                )}
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-stone-400 mt-2">
              실선: 모의고사 비문학 정답률 / 점선: 이:르다 레벨 (상관관계 참고)
            </p>
          </div>
        )}

        {/* Score list */}
        {scores.length === 0 ? (
          <div className="border border-exam-rule bg-white p-10 text-center">
            <p className="text-exam-ink font-medium text-sm mb-1">아직 기록이 없어요</p>
            <p className="text-stone-500 text-xs mb-4">모의고사 비문학 점수를 기록하면 성장 추이를 확인할 수 있어요.</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2 bg-exam-ink text-white text-xs font-bold hover:bg-stone-800 transition-colors"
            >
              첫 기록 추가하기
            </button>
          </div>
        ) : (
          <div className="border border-exam-rule bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-exam-rule">
                  <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">날짜</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">점수</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider hidden sm:table-cell">메모</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-exam-rule">
                {[...scores].reverse().map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-exam-ink">
                      {new Date(s.exam_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${s.score >= 80 ? 'text-green-700' : s.score >= 60 ? 'text-exam-ink' : 'text-exam-red'}`}>
                        {s.score}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs hidden sm:table-cell">{s.notes ?? '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-stone-400 hover:text-exam-red transition-colors p-1"
                        aria-label="삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Insight */}
        {scores.length >= 3 && (
          <div className="mt-6 border border-exam-rule bg-exam-highlight p-5">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">분석</p>
            {(() => {
              const avg = scores.reduce((s, sc) => s + sc.score, 0) / scores.length
              const recentAvg = scores.slice(-3).reduce((s, sc) => s + sc.score, 0) / Math.min(3, scores.length)
              const improving = recentAvg > avg

              return (
                <div className="flex items-start gap-2.5">
                  {improving ? (
                    <TrendingUp size={14} className="text-green-700 mt-0.5 shrink-0" />
                  ) : (
                    <TrendingDown size={14} className="text-exam-red mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className={`text-xs font-semibold ${improving ? 'text-green-700' : 'text-exam-red'}`}>
                      {improving
                        ? '점수가 올라가고 있어요!'
                        : '최근 점수가 낮아지고 있어요'}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      전체 평균 {Math.round(avg)}% · 최근 3회 평균 {Math.round(recentAvg)}%
                      {improving
                        ? ' — 이:르다 훈련이 효과를 보고 있을 수 있어요!'
                        : ' — 약점 주제 집중 연습을 추천해요.'}
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
