'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, CheckCircle2, XCircle, Lightbulb, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface ReviewItem {
  id: string
  questionId: string
  isCorrect: boolean
  submittedChain: string[]
  hintsUsed: number
  createdAt: string
  question: {
    id: string
    difficulty_level: number
    topic: string
    passage: string
    sentences: { id: string; text: string }[]
    conclusion: string
    correct_chain: string[]
  }
}

interface ReviewListProps {
  items: ReviewItem[]
}

const topicLabel: Record<string, string> = {
  humanities: '인문',
  social: '사회',
  science: '과학',
  tech: '기술',
  arts: '예술',
}

type FilterType = 'all' | 'wrong' | 'correct'

export default function ReviewList({ items }: ReviewListProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = items.filter((item) => {
    if (filter === 'wrong') return !item.isCorrect
    if (filter === 'correct') return item.isCorrect
    return true
  })

  const wrongCount = items.filter((i) => !i.isCorrect).length

  return (
    <div className="min-h-screen bg-bg-base px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-exam-serif font-bold text-exam-ink">오답 노트</h1>
            <p className="text-stone-500 text-sm mt-0.5">
              풀었던 문제를 복습하고 추론 경로를 비교해보세요
            </p>
          </div>
          <Link
            href="/levels"
            className="text-sm text-stone-500 hover:text-exam-ink transition-colors"
          >
            ← 레벨로
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { key: 'all', label: `전체 (${items.length})` },
            { key: 'wrong', label: `오답 (${wrongCount})` },
            { key: 'correct', label: `정답 (${items.length - wrongCount})` },
          ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={[
                'px-3 py-1.5 text-xs font-medium transition-colors',
                filter === key
                  ? 'bg-exam-ink text-white'
                  : 'text-stone-500 border border-exam-rule hover:border-stone-400',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="border border-exam-rule bg-white p-10 text-center">
            <BookOpen size={24} className="text-stone-400 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">
              {filter === 'wrong' ? '오답이 없어요! 대단해요!' : '아직 풀어본 문제가 없어요.'}
            </p>
            <Link
              href="/levels"
              className="inline-block mt-4 px-5 py-2 bg-exam-ink text-white text-xs font-bold hover:bg-stone-800 transition-colors"
            >
              문제 풀러 가기
            </Link>
          </div>
        )}

        {/* Review items */}
        <div className="space-y-3">
          {filtered.map((item) => {
            const isExpanded = expandedId === item.id
            const date = new Date(item.createdAt)
            const dateStr = date.toLocaleDateString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })

            // Calculate accuracy
            const correctCount = item.submittedChain.filter(
              (id, i) => id === item.question.correct_chain[i]
            ).length
            const accuracy = Math.round((correctCount / item.question.correct_chain.length) * 100)

            return (
              <div key={item.id} className="border border-exam-rule bg-white overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  aria-expanded={isExpanded}
                  aria-label={`Lv.${item.question.difficulty_level} ${item.isCorrect ? '정답' : '오답'} — 정확도 ${accuracy}%`}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-base transition-colors"
                >
                  {item.isCorrect ? (
                    <CheckCircle2 size={16} className="text-green-700 shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-exam-red shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="problem-number-sm text-[10px]">{item.question.difficulty_level}</span>
                      <span className="text-xs text-stone-500">{topicLabel[item.question.topic] ?? item.question.topic}</span>
                      {item.hintsUsed > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-stone-400">
                          <Lightbulb size={9} />
                          {item.hintsUsed}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-exam-ink truncate mt-0.5">
                      {item.question.conclusion}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={[
                      'text-xs font-semibold',
                      item.isCorrect ? 'text-green-700' : 'text-stone-500',
                    ].join(' ')}>
                      {accuracy}%
                    </span>
                    <span className="text-[10px] text-stone-400">{dateStr}</span>
                    <ChevronDown
                      size={14}
                      className={[
                        'text-stone-400 transition-transform',
                        isExpanded ? 'rotate-180' : '',
                      ].join(' ')}
                    />
                  </div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-exam-rule">
                        {/* Passage excerpt */}
                        <p className="text-xs text-stone-500 leading-relaxed mb-4 line-clamp-3" style={{ wordBreak: 'keep-all' }}>
                          {item.question.passage}
                        </p>

                        {/* Chain comparison */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* My answer */}
                          <div>
                            <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                              내 답안
                            </p>
                            <div className="space-y-1.5">
                              {item.submittedChain.map((sentenceId, i) => {
                                const sentence = item.question.sentences.find((s) => s.id === sentenceId)
                                const isSlotCorrect = sentenceId === item.question.correct_chain[i]
                                return (
                                  <div
                                    key={`my-${i}`}
                                    className={[
                                      'flex items-start gap-1.5 px-2 py-1.5 border text-xs',
                                      isSlotCorrect
                                        ? 'border-green-200 bg-green-50 text-exam-ink'
                                        : 'border-red-200 bg-exam-highlight text-stone-700',
                                    ].join(' ')}
                                  >
                                    <span className={[
                                      'shrink-0 w-4 h-4 text-[9px] font-bold flex items-center justify-center',
                                      isSlotCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-exam-red',
                                    ].join(' ')}>
                                      {i + 1}
                                    </span>
                                    <span className="line-clamp-2 leading-relaxed">
                                      {sentence?.text ?? '(비어있음)'}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Correct answer */}
                          <div>
                            <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wider mb-2">
                              정답
                            </p>
                            <div className="space-y-1.5">
                              {item.question.correct_chain.map((sentenceId, i) => {
                                const sentence = item.question.sentences.find((s) => s.id === sentenceId)
                                return (
                                  <div
                                    key={`correct-${i}`}
                                    className="flex items-start gap-1.5 border border-green-200 bg-green-50 px-2 py-1.5 text-xs text-exam-ink"
                                  >
                                    <span className="shrink-0 w-4 h-4 bg-green-100 text-green-700 text-[9px] font-bold flex items-center justify-center">
                                      {i + 1}
                                    </span>
                                    <span className="line-clamp-2 leading-relaxed">
                                      {sentence?.text ?? ''}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Re-try button */}
                        {!item.isCorrect && (
                          <Link
                            href={`/play/${item.question.id}`}
                            className="mt-3 flex items-center justify-center gap-2 px-4 py-2 border border-exam-ink text-exam-ink text-xs font-medium hover:bg-exam-ink hover:text-white transition-colors"
                          >
                            이 문제 다시 풀기
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
