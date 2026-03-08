'use client'

import { useState, useCallback } from 'react'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, RefreshCw, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Sentence, EvaluationResult, SlotFeedback } from '@/types'
import { buildConnectionMap } from '@/lib/game/connectionStrength'
import SentenceCard from '@/components/game/SentenceCard'
import InferenceSlot from '@/components/game/InferenceSlot'
import ConnectionIndicator from '@/components/game/ConnectionIndicator'

const DEMO_QUESTION = {
  id: 'demo-1',
  difficulty_level: 1,
  topic: 'humanities' as const,
  passage:
    '현대 사회에서 정보는 단순한 사실의 집합이 아니라 의미를 구성하는 체계이다. 특히 디지털 환경에서 정보의 수용과 해석은 개인의 인식 체계와 밀접하게 연결되어 있다. 이에 따라 정보를 올바르게 이해하고 활용하는 능력이 점점 중요해지고 있다.',
  sentences: [
    { id: 'a', text: '정보 수용 방식이 인식에 영향을 준다' },
    { id: 'b', text: '인식 체계가 판단력을 결정한다' },
    { id: 'c', text: '따라서 리터러시 교육이 필요하다' },
    { id: 'd', text: '디지털 기술은 정보 전달 속도를 높인다' },
  ],
  conclusion: '디지털 리터러시는 현대인의 필수 역량이다.',
  correct_chain: ['a', 'b', 'c'],
  hints: [
    { level: 1, text: '정보의 수용이 인식에 어떤 영향을 주는지 생각해보세요.' },
  ],
}

const DEMO_LEVEL = { level: 1, name: '체험', slots: 3, hint_type: 'direct' as const, description: '' }

function evaluateDemo(chain: (string | null)[]): EvaluationResult {
  const correct = DEMO_QUESTION.correct_chain
  let correctCount = 0
  const feedback: SlotFeedback[] = correct.map((correctId, i) => {
    const submitted = chain[i]
    const isCorrect = submitted === correctId
    if (isCorrect) correctCount++
    return {
      slot_index: i,
      sentence_id: submitted ?? null,
      is_correct: isCorrect,
      hint: isCorrect ? null : `${i + 1}번째 슬롯을 다시 생각해보세요.`,
    }
  })
  const accuracy = correctCount / correct.length
  const explanation = accuracy >= 1
    ? '완벽합니다! 모든 추론 경로를 올바르게 완성했어요.'
    : accuracy >= 0.5
      ? '좋은 출발이에요! 지문의 논리 흐름을 다시 따라가 보세요.'
      : '추론이 쉽지 않죠! 지문에서 접속어에 주목해보세요.'
  return { is_correct: accuracy >= 1, accuracy, level_up: false, feedback, explanation }
}

export default function DemoPage() {
  const [chain, setChain] = useState<(string | null)[]>([null, null, null])
  const [pool, setPool] = useState<Sentence[]>(DEMO_QUESTION.sentences)
  const [result, setResult] = useState<EvaluationResult | null>(null)

  const connectionMap = buildConnectionMap(
    chain.map((id) => (id ? DEMO_QUESTION.sentences.find((s) => s.id === id) ?? null : null)),
  )

  const handleDragEnd = useCallback(
    (r: DropResult) => {
      if (result || !r.destination) return
      const src = r.source
      const dst = r.destination

      if (src.droppableId === 'pool' && dst.droppableId.startsWith('slot-')) {
        const slotIdx = parseInt(dst.droppableId.replace('slot-', ''), 10)
        if (chain[slotIdx] !== null) return
        const card = pool[src.index]
        const newPool = pool.filter((_, i) => i !== src.index)
        const newChain = [...chain]
        newChain[slotIdx] = card.id
        setPool(newPool)
        setChain(newChain)
      } else if (src.droppableId.startsWith('slot-') && dst.droppableId === 'pool') {
        const slotIdx = parseInt(src.droppableId.replace('slot-', ''), 10)
        const cardId = chain[slotIdx]
        if (!cardId) return
        const card = DEMO_QUESTION.sentences.find((s) => s.id === cardId)!
        const newChain = [...chain]
        newChain[slotIdx] = null
        setChain(newChain)
        setPool([...pool, card])
      } else if (src.droppableId.startsWith('slot-') && dst.droppableId.startsWith('slot-')) {
        const srcIdx = parseInt(src.droppableId.replace('slot-', ''), 10)
        const dstIdx = parseInt(dst.droppableId.replace('slot-', ''), 10)
        const newChain = [...chain]
        const temp = newChain[srcIdx]
        newChain[srcIdx] = newChain[dstIdx]
        newChain[dstIdx] = temp
        setChain(newChain)
      }
    },
    [chain, pool, result],
  )

  function handleSubmit() {
    const filled = chain.filter(Boolean).length
    if (filled < 3) return
    setResult(evaluateDemo(chain))
  }

  function handleReset() {
    setChain([null, null, null])
    setPool(DEMO_QUESTION.sentences)
    setResult(null)
  }

  const allFilled = chain.every(Boolean)

  return (
    <div className="min-h-screen bg-bg-base px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 border border-exam-ink flex items-center justify-center">
                <span className="text-exam-ink font-black text-xs">르</span>
              </div>
              <h1 className="font-exam-serif text-lg font-bold text-exam-ink">체험 모드</h1>
              <span className="text-[10px] font-bold text-exam-red border border-exam-red px-2 py-0.5">
                무료 체험
              </span>
            </div>
            <p className="text-stone-500 text-xs">회원가입 없이 추론 훈련을 체험해보세요</p>
          </div>
          <Link
            href="/signup"
            className="text-xs text-exam-ink underline underline-offset-2 hover:text-exam-red transition-colors"
          >
            회원가입 &rarr;
          </Link>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Passage + Pool */}
            <div className="space-y-4">
              {/* Passage */}
              <div className="border border-exam-rule bg-white p-5">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">지문</p>
                <p className="text-sm text-exam-ink leading-[1.8]">{DEMO_QUESTION.passage}</p>
              </div>

              {/* Conclusion */}
              <div className="border border-exam-ink bg-exam-highlight p-4">
                <span className="text-xs font-bold text-exam-red">결론 — </span>
                <span className="text-xs text-exam-ink">{DEMO_QUESTION.conclusion}</span>
              </div>

              {/* Card Pool */}
              <div className="border border-exam-rule bg-white p-4">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                  문장 카드 <span className="text-stone-400 normal-case">— 오른쪽 슬롯으로 드래그하세요</span>
                </p>
                <Droppable droppableId="pool">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 min-h-[40px]">
                      {pool.map((s, i) => (
                        <SentenceCard key={s.id} sentence={s} index={i} />
                      ))}
                      {provided.placeholder}
                      {pool.length === 0 && !result && (
                        <p className="text-xs text-stone-400 text-center py-2">모든 카드를 배치했어요</p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>

            {/* Right: Slots */}
            <div className="space-y-4">
              <div className="border border-exam-rule bg-white p-5">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
                  추론 체인 ({DEMO_LEVEL.slots}단계)
                </p>
                <div className="space-y-1">
                  {chain.map((sentenceId, slotIdx) => {
                    const sentence = sentenceId
                      ? DEMO_QUESTION.sentences.find((s) => s.id === sentenceId) ?? null
                      : null
                    const slotFeedback = result?.feedback[slotIdx]

                    return (
                      <div key={slotIdx}>
                        {slotIdx > 0 && (
                          <ConnectionIndicator strength={connectionMap[slotIdx].strength} />
                        )}
                        <InferenceSlot
                          slotIndex={slotIdx}
                          sentence={sentence}
                          feedback={slotFeedback ?? undefined}
                          isEvaluated={!!result}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Result */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={[
                        'mt-4 border p-4',
                        result.is_correct
                          ? 'border-exam-ink bg-bg-base'
                          : 'border-exam-red bg-exam-highlight',
                      ].join(' ')}
                    >
                      <p className={[
                        'text-sm font-bold mb-1',
                        result.is_correct ? 'text-exam-ink' : 'text-exam-red',
                      ].join(' ')}>
                        {result.is_correct ? '정답!' : '아쉬워요!'} 정확도 {Math.round(result.accuracy * 100)}%
                      </p>
                      <p className="text-xs text-stone-500">{result.explanation}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  {!result ? (
                    <button
                      onClick={handleSubmit}
                      disabled={!allFilled}
                      className={[
                        'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-all',
                        allFilled
                          ? 'bg-exam-ink text-white hover:bg-stone-800'
                          : 'bg-stone-200 text-stone-400 cursor-not-allowed',
                      ].join(' ')}
                    >
                      <Send size={14} />
                      제출하기
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleReset}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-exam-rule text-exam-ink text-sm font-medium hover:bg-bg-base transition-colors"
                      >
                        <RefreshCw size={14} />
                        다시 풀기
                      </button>
                      <Link
                        href="/signup"
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors"
                      >
                        회원가입하고 계속
                        <ArrowRight size={14} />
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className="border border-exam-ink bg-exam-highlight p-4 text-center">
                <p className="text-sm text-exam-ink font-medium mb-1">매일 5문제 무료!</p>
                <p className="text-xs text-stone-500 mb-3">회원가입하면 7레벨까지 도전하고 성장 기록을 확인할 수 있어요.</p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1 px-5 py-2 bg-exam-ink text-white text-xs font-bold hover:bg-stone-800 transition-colors"
                >
                  무료로 시작하기 <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </DragDropContext>
      </div>
    </div>
  )
}
