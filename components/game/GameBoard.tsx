'use client'

import { useState, useCallback, useEffect } from 'react'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Send, RefreshCw, ChevronRight, Trophy } from 'lucide-react'
import { Question, Sentence, EvaluationResult, LevelConfig } from '@/types'
import { buildConnectionMap } from '@/lib/game/connectionStrength'
import PassageViewer from './PassageViewer'
import SentenceCard from './SentenceCard'
import InferenceSlot from './InferenceSlot'
import ConnectionIndicator from './ConnectionIndicator'
import LevelUpAnimation from '@/components/level/LevelUpAnimation'

interface GameBoardProps {
  question: Question
  levelConfig: LevelConfig
  hintPoints: number
  isSubmitting: boolean
  evaluationResult: EvaluationResult | null
  onSubmit: (chain: (string | null)[]) => void
  onHintRequest: () => void
  onNextQuestion: () => void
  onReset: () => void
}

export default function GameBoard({
  question,
  levelConfig,
  hintPoints,
  isSubmitting,
  evaluationResult,
  onSubmit,
  onHintRequest,
  onNextQuestion,
  onReset,
}: GameBoardProps) {
  const [chain, setChain] = useState<(string | null)[]>(
    Array(levelConfig.slots).fill(null),
  )
  const [pool, setPool] = useState<Sentence[]>(question.sentences)
  const [showLevelUp, setShowLevelUp] = useState(false)

  // Reset when question changes
  useEffect(() => {
    setChain(Array(levelConfig.slots).fill(null))
    setPool(question.sentences)
  }, [question.id, levelConfig.slots, question.sentences])

  // Show level up animation when triggered
  useEffect(() => {
    if (evaluationResult?.level_up) {
      setShowLevelUp(true)
    }
  }, [evaluationResult])

  const getSentenceById = useCallback(
    (id: string) => question.sentences.find((s) => s.id === id) ?? null,
    [question.sentences],
  )

  const chainSentences = chain.map((id) => (id ? getSentenceById(id) : null))
  const connections = buildConnectionMap(chainSentences)
  const isChainComplete = chain.every((id) => id !== null)
  const isEvaluated = evaluationResult !== null

  const onDragEnd = (result: DropResult) => {
    if (isEvaluated) return
    const { source, destination, draggableId } = result
    if (!destination) return
    const srcId = source.droppableId
    const dstId = destination.droppableId
    if (srcId === dstId && source.index === destination.index) return

    const newChain = [...chain]
    const newPool = [...pool]

    // Pool → Slot
    if (srcId === 'pool' && dstId.startsWith('slot-')) {
      const slotIdx = parseInt(dstId.replace('slot-', ''))
      if (newChain[slotIdx]) {
        const displaced = getSentenceById(newChain[slotIdx]!)
        if (displaced) newPool.push(displaced)
      }
      newChain[slotIdx] = draggableId
      const poolIdx = newPool.findIndex((s) => s.id === draggableId)
      if (poolIdx !== -1) newPool.splice(poolIdx, 1)
    }

    // Slot → Pool
    else if (srcId.startsWith('slot-') && dstId === 'pool') {
      const slotIdx = parseInt(srcId.replace('slot-', ''))
      const sentence = getSentenceById(draggableId)
      if (sentence) newPool.splice(destination.index, 0, sentence)
      newChain[slotIdx] = null
    }

    // Slot → Slot (swap)
    else if (srcId.startsWith('slot-') && dstId.startsWith('slot-')) {
      const srcSlot = parseInt(srcId.replace('slot-', ''))
      const dstSlot = parseInt(dstId.replace('slot-', ''))
      ;[newChain[srcSlot], newChain[dstSlot]] = [newChain[dstSlot], newChain[srcSlot]]
    }

    setChain(newChain)
    setPool(newPool)
  }

  return (
    <>
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="min-h-screen bg-[#0F172A] flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-amber-400 tracking-widest uppercase">
              Lv.{levelConfig.level}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-sm text-slate-400">{levelConfig.name}</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-500">{levelConfig.slots}단계 추론</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Lightbulb size={12} className="text-amber-400" />
            <span className="text-amber-400 font-semibold">{hintPoints}</span>
            <span>힌트 포인트</span>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-5 p-4 md:p-5 min-h-0 overflow-auto md:overflow-hidden">
          {/* Left: Passage */}
          <PassageViewer
            passage={question.passage}
            conclusion={question.conclusion}
            topic={question.topic}
          />

          {/* Right: Game area */}
          <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto">
            {/* Sentence pool */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 tracking-widest uppercase mb-2 px-1">
                문장 카드 — 끌어서 슬롯에 배치
              </p>
              <Droppable droppableId="pool" direction="vertical">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={[
                      'flex flex-col gap-2 min-h-[48px] rounded-xl p-2 transition-colors duration-200',
                      snapshot.isDraggingOver ? 'bg-slate-800/60' : 'bg-transparent',
                    ].join(' ')}
                  >
                    {pool.length === 0 ? (
                      <div className="flex items-center justify-center h-12 text-xs text-slate-600 italic">
                        모든 문장이 슬롯에 배치되었어요
                      </div>
                    ) : (
                      pool.map((sentence, i) => (
                        <SentenceCard key={sentence.id} sentence={sentence} index={i} />
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[10px] font-semibold text-slate-600 tracking-widest uppercase">
                추론 경로 조립
              </span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Chain slots */}
            <div className="flex flex-col pl-4">
              {chain.map((sentenceId, i) => (
                <div key={i}>
                  <InferenceSlot
                    slotIndex={i}
                    sentence={sentenceId ? getSentenceById(sentenceId) : null}
                    feedback={evaluationResult?.feedback[i]}
                    isEvaluated={isEvaluated}
                  />
                  {i < chain.length - 1 && (
                    <ConnectionIndicator strength={connections[i + 1]?.strength ?? 'empty'} />
                  )}
                </div>
              ))}

              {/* Arrow to conclusion */}
              <div className="flex items-center gap-3 mt-2 pl-3">
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-3 bg-slate-700" />
                  <ChevronRight size={14} className="text-slate-600 rotate-90" />
                </div>
                <div className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2">
                  <p className="text-[10px] text-amber-400 font-semibold mb-0.5">결론</p>
                  <p className="text-xs text-amber-200/80 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                    {question.conclusion}
                  </p>
                </div>
              </div>
            </div>

            {/* Evaluation result */}
            <AnimatePresence>
              {evaluationResult && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={[
                    'rounded-xl border p-4',
                    evaluationResult.is_correct
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-slate-700 bg-slate-800/60',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {evaluationResult.level_up ? (
                      <Trophy size={16} className="text-amber-400" />
                    ) : evaluationResult.is_correct ? (
                      <span className="text-emerald-400">✓</span>
                    ) : (
                      <span className="text-red-400">✗</span>
                    )}
                    <span className={[
                      'text-sm font-semibold',
                      evaluationResult.is_correct ? 'text-emerald-400' : 'text-slate-300',
                    ].join(' ')}>
                      {evaluationResult.level_up
                        ? `레벨업! Lv.${levelConfig.level + 1}로 올라갔어요!`
                        : evaluationResult.is_correct
                          ? '정답! 완벽한 추론 경로예요.'
                          : `정확도 ${Math.round(evaluationResult.accuracy * 100)}%`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {evaluationResult.explanation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex gap-3 mt-auto pt-2">
              {!isEvaluated ? (
                <>
                  <button
                    onClick={onHintRequest}
                    disabled={hintPoints <= 0 || levelConfig.level === 7}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Lightbulb size={14} />
                    힌트 사용
                  </button>
                  <button
                    onClick={onReset}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-700 text-slate-400 text-sm hover:border-slate-600 transition-colors"
                  >
                    <RefreshCw size={13} />
                    초기화
                  </button>
                  <button
                    onClick={() => onSubmit(chain)}
                    disabled={!isChainComplete || isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send size={14} />
                    {isSubmitting ? '평가 중...' : '추론 경로 제출'}
                  </button>
                </>
              ) : (
                <button
                  onClick={onNextQuestion}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors"
                >
                  다음 문제
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>

    {showLevelUp && (
      <LevelUpAnimation
        fromLevel={levelConfig.level - 1}
        toLevel={levelConfig.level}
        onDismiss={() => setShowLevelUp(false)}
      />
    )}
    </>
  )
}
