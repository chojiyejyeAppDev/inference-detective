'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ArrowRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface DiagnosticQuestion {
  id: string
  difficulty_level: number
  topic: string
  passage: string
  sentences: Array<{ id: string; text: string }>
  conclusion: string
  hints: Array<{ level: number; text: string }>
}

type Phase = 'intro' | 'test' | 'submitting' | 'result'

export default function DiagnosticPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetLevel = parseInt(searchParams.get('target') ?? '0')

  const [phase, setPhase] = useState<Phase>('intro')
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [chains, setChains] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    passed: boolean
    correct_count: number
    total: number
    new_level: number
  } | null>(null)

  // 현재 문제의 드래그 가능 카드 + 슬롯
  const currentQ = questions[currentIndex]
  const currentChain = currentQ ? (chains[currentQ.id] ?? []) : []
  const availableCards = currentQ
    ? currentQ.sentences.filter((s) => !currentChain.includes(s.id))
    : []

  async function startTest() {
    if (targetLevel < 2 || targetLevel > 7) {
      toast.error('잘못된 레벨입니다.')
      router.push('/levels')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/game/diagnostic?target_level=${targetLevel}`)
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? '진단 테스트를 시작할 수 없어요.')
        if (data.error === 'Already at or above target level') {
          router.push('/levels')
        }
        return
      }

      setQuestions(data.questions)
      setPhase('test')
    } catch {
      toast.error('네트워크 오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  async function submitAll() {
    setPhase('submitting')
    try {
      const results = questions.map((q) => ({
        question_id: q.id,
        submitted_chain: chains[q.id] ?? [],
      }))

      const res = await fetch('/api/game/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_level: targetLevel, results }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? '제출에 실패했어요.')
        setPhase('test')
        return
      }

      setResult(data)
      setPhase('result')
    } catch {
      toast.error('네트워크 오류가 발생했어요.')
      setPhase('test')
    }
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination || !currentQ) return

    const { source, destination, draggableId } = result

    if (source.droppableId === 'cards' && destination.droppableId === 'slots') {
      // 카드 → 슬롯
      const newChain = [...currentChain]
      newChain.splice(destination.index, 0, draggableId)
      setChains({ ...chains, [currentQ.id]: newChain })
    } else if (source.droppableId === 'slots' && destination.droppableId === 'cards') {
      // 슬롯 → 카드 (제거)
      const newChain = currentChain.filter((id) => id !== draggableId)
      setChains({ ...chains, [currentQ.id]: newChain })
    } else if (source.droppableId === 'slots' && destination.droppableId === 'slots') {
      // 슬롯 내 재정렬
      const newChain = [...currentChain]
      newChain.splice(source.index, 1)
      newChain.splice(destination.index, 0, draggableId)
      setChains({ ...chains, [currentQ.id]: newChain })
    }
  }

  if (targetLevel < 2 || targetLevel > 7) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <p className="text-stone-500">잘못된 레벨이에요.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Intro */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-6 pt-20"
            >
              <div className="w-16 h-16 border border-exam-rule bg-white flex items-center justify-center mx-auto">
                <Zap size={28} className="text-exam-ink" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-exam-ink mb-2">레벨 {targetLevel} 진단 테스트</h1>
                <p className="text-stone-500 text-sm max-w-md mx-auto">
                  레벨 {targetLevel}의 문제 3개를 풀어 실력을 증명하세요.
                  2개 이상 정답이면 바로 레벨 {targetLevel}로 스킵!
                </p>
              </div>
              <div className="border border-exam-rule bg-white p-5 max-w-sm mx-auto text-left space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">문제 수</span>
                  <span className="text-exam-ink font-semibold">3문제</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">통과 조건</span>
                  <span className="text-exam-ink font-semibold">2/3 정답</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">힌트</span>
                  <span className="text-stone-500">사용 불가</span>
                </div>
              </div>
              <button
                onClick={startTest}
                disabled={loading}
                className="px-8 py-3 bg-exam-ink text-white font-black text-sm hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {loading ? '준비 중...' : '테스트 시작'}
              </button>
              <button
                onClick={() => router.push('/levels')}
                className="text-stone-500 text-xs hover:text-stone-400 transition-colors"
              >
                레벨 선택으로 돌아가기
              </button>
            </motion.div>
          )}

          {/* Test */}
          {phase === 'test' && currentQ && (
            <motion.div
              key={`test-${currentIndex}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-5"
            >
              {/* Progress */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-exam-ink">
                  문제 {currentIndex + 1}/{questions.length}
                </h2>
                <span className="text-xs text-stone-500 bg-stone-100 px-3 py-1 rounded-full">
                  레벨 {targetLevel} 진단
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-exam-ink transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Passage */}
              <div className="border border-exam-rule bg-white p-5">
                <p className="text-sm text-exam-ink leading-relaxed whitespace-pre-wrap">
                  {currentQ.passage}
                </p>
              </div>

              {/* Conclusion */}
              <div className="border border-exam-rule bg-white p-4">
                <p className="text-xs text-stone-500 mb-1 font-semibold">결론</p>
                <p className="text-sm text-exam-ink">{currentQ.conclusion}</p>
              </div>

              {/* Drag & Drop area */}
              <DragDropContext onDragEnd={handleDragEnd}>
                {/* Slots */}
                <Droppable droppableId="slots">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 min-h-[80px] border border-exam-rule bg-white p-3"
                    >
                      <p className="text-[10px] text-stone-500 font-semibold mb-1">추론 순서 (드래그하여 배치)</p>
                      {currentChain.map((id, idx) => {
                        const sentence = currentQ.sentences.find((s) => s.id === id)
                        if (!sentence) return null
                        return (
                          <Draggable key={id} draggableId={id} index={idx}>
                            {(prov) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className="rounded-lg border border-exam-ink bg-stone-50 p-3 text-xs text-exam-ink"
                              >
                                <span className="text-exam-ink font-bold mr-2">{idx + 1}</span>
                                {sentence.text}
                              </div>
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                      {currentChain.length === 0 && (
                        <p className="text-xs text-stone-400 text-center py-4">
                          아래 카드를 여기로 드래그하세요
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>

                {/* Cards */}
                <Droppable droppableId="cards">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2"
                    >
                      <p className="text-[10px] text-stone-500 font-semibold">보기 카드</p>
                      {availableCards.map((s, idx) => (
                        <Draggable key={s.id} draggableId={s.id} index={idx}>
                          {(prov) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className="rounded-lg border border-exam-rule bg-white p-3 text-xs text-exam-ink hover:border-stone-400 transition-colors cursor-grab"
                            >
                              {s.text}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 rounded-lg border border-exam-rule text-stone-500 text-xs hover:text-exam-ink transition-colors disabled:opacity-30"
                >
                  이전
                </button>
                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex(currentIndex + 1)}
                    className="px-4 py-2 rounded-lg bg-stone-100 border border-exam-rule text-exam-ink text-xs font-semibold hover:bg-stone-200 transition-colors flex items-center gap-1"
                  >
                    다음 <ArrowRight size={12} />
                  </button>
                ) : (
                  <button
                    onClick={submitAll}
                    disabled={!questions.every((q) => (chains[q.id] ?? []).length > 0)}
                    className="px-6 py-2.5 bg-exam-ink text-white text-xs font-black hover:bg-stone-800 transition-colors disabled:opacity-40"
                  >
                    결과 확인
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Submitting */}
          {phase === 'submitting' && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center pt-32 gap-4"
            >
              <Loader2 size={32} className="text-exam-ink animate-spin" />
              <p className="text-stone-500 text-sm">채점 중...</p>
            </motion.div>
          )}

          {/* Result */}
          {phase === 'result' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 pt-16"
            >
              <div className={`w-20 h-20 flex items-center justify-center mx-auto ${
                result.passed
                  ? 'bg-green-50 border border-green-300'
                  : 'bg-red-50 border border-red-300'
              }`}>
                {result.passed
                  ? <CheckCircle2 size={36} className="text-green-700" />
                  : <XCircle size={36} className="text-red-600" />}
              </div>

              <div>
                <h1 className={`text-2xl font-black mb-2 ${result.passed ? 'text-green-700' : 'text-red-600'}`}>
                  {result.passed ? '통과!' : '아쉬워요!'}
                </h1>
                <p className="text-stone-500 text-sm">
                  {result.passed
                    ? `레벨 ${result.new_level}로 스킵했어요! 새로운 도전을 시작하세요.`
                    : `${result.correct_count}/${result.total} 정답이에요. 현재 레벨에서 조금 더 연습해보세요.`}
                </p>
              </div>

              <div className="border border-exam-rule bg-white p-5 max-w-xs mx-auto">
                <div className="flex justify-center gap-3">
                  {Array.from({ length: result.total }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-12 h-12 flex items-center justify-center text-lg font-bold ${
                        i < result.correct_count
                          ? 'bg-green-50 text-green-700 border border-green-300'
                          : 'bg-red-50 text-red-600 border border-red-300'
                      }`}
                    >
                      {i < result.correct_count ? 'O' : 'X'}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => router.push('/levels')}
                className="px-8 py-3 bg-exam-ink text-white font-black text-sm hover:bg-stone-800 transition-colors"
              >
                레벨 선택으로 돌아가기
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
