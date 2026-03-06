'use client'

import { useState, useCallback, useEffect } from 'react'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Send, RefreshCw, ChevronRight, Trophy, Undo2, Flame, HelpCircle, CheckCircle2, XCircle } from 'lucide-react'
import { Question, Sentence, EvaluationResult, LevelConfig } from '@/types'
import { buildConnectionMap } from '@/lib/game/connectionStrength'
import PassageViewer from './PassageViewer'
import SentenceCard from './SentenceCard'
import InferenceSlot from './InferenceSlot'
import ConnectionIndicator from './ConnectionIndicator'
import LevelUpAnimation from '@/components/level/LevelUpAnimation'
import ShareResultButton from './ShareResultButton'
import GameTutorialOverlay from './GameTutorialOverlay'

interface GameBoardProps {
  question: Question
  levelConfig: LevelConfig
  hintPoints: number
  isSubmitting: boolean
  isHintLoading: boolean
  isReviewMode?: boolean
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
  isHintLoading,
  isReviewMode,
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
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)
  const [history, setHistory] = useState<{ chain: (string | null)[]; pool: Sentence[] }[]>([])
  const [showTutorial, setShowTutorial] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  // Reset when question changes
  useEffect(() => {
    setChain(Array(levelConfig.slots).fill(null))
    setPool(question.sentences)
    setShowCorrectAnswer(false)
    setHistory([])
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

  function handleUndo() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setChain(prev.chain)
    setPool(prev.pool)
    setHistory(history.slice(0, -1))
  }

  // Keyboard-accessible: click-to-select, click-to-place
  function handleCardSelect(sentenceId: string) {
    if (isEvaluated) return
    setSelectedCardId((prev) => (prev === sentenceId ? null : sentenceId))
  }

  function handleSlotClick(slotIndex: number) {
    if (isEvaluated) return

    // If a card is selected, place it in this slot
    if (selectedCardId) {
      setHistory((prev) => [...prev.slice(-19), { chain: [...chain], pool: [...pool] }])

      const newChain = [...chain]
      const newPool = [...pool]

      const isFromPool = newPool.some((s) => s.id === selectedCardId)
      const sourceSlotIdx = newChain.indexOf(selectedCardId)

      if (isFromPool) {
        // Pool → Slot: displace existing card if any
        if (newChain[slotIndex]) {
          const displaced = getSentenceById(newChain[slotIndex]!)
          if (displaced) newPool.push(displaced)
        }
        newChain[slotIndex] = selectedCardId
        const poolIdx = newPool.findIndex((s) => s.id === selectedCardId)
        if (poolIdx !== -1) newPool.splice(poolIdx, 1)
      } else if (sourceSlotIdx !== -1) {
        // Slot → Slot: swap
        ;[newChain[sourceSlotIdx], newChain[slotIndex]] = [newChain[slotIndex], newChain[sourceSlotIdx]]
      }

      setChain(newChain)
      setPool(newPool)
      setSelectedCardId(null)
      return
    }

    // No card selected: if slot has a card, select it
    if (chain[slotIndex]) {
      setSelectedCardId(chain[slotIndex])
    }
  }

  function handleReturnToPool(sentenceId: string) {
    if (isEvaluated) return
    const slotIdx = chain.indexOf(sentenceId)
    if (slotIdx === -1) return

    setHistory((prev) => [...prev.slice(-19), { chain: [...chain], pool: [...pool] }])
    const newChain = [...chain]
    const newPool = [...pool]
    const sentence = getSentenceById(sentenceId)
    if (sentence) newPool.push(sentence)
    newChain[slotIdx] = null
    setChain(newChain)
    setPool(newPool)
    setSelectedCardId(null)
  }

  // Clear selection on Escape
  useEffect(() => {
    if (!selectedCardId) return
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedCardId(null)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [selectedCardId])

  const onDragEnd = (result: DropResult) => {
    if (isEvaluated) return
    const { source, destination, draggableId } = result
    if (!destination) return
    const srcId = source.droppableId
    const dstId = destination.droppableId
    if (srcId === dstId && source.index === destination.index) return

    // Save current state for undo
    setHistory((prev) => [...prev.slice(-19), { chain: [...chain], pool: [...pool] }])

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
    setSelectedCardId(null)
  }

  return (
    <>
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="min-h-screen bg-bg-game flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xs font-bold text-amber-400 tracking-widest uppercase shrink-0">
              Lv.{levelConfig.level}
            </span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="text-sm text-slate-400 truncate hidden sm:inline">{levelConfig.name}</span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="text-xs text-slate-500 shrink-0">{levelConfig.slots}단계</span>
            {isReviewMode && (
              <span className="text-[10px] font-bold text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded-full border border-blue-500/30">
                복습
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-400 shrink-0">
            <div className="flex items-center gap-1.5">
              <Lightbulb size={12} className="text-amber-400" />
              <span className="text-amber-400 font-semibold">{hintPoints}</span>
              <span className="hidden sm:inline">힌트 포인트</span>
            </div>
            <button
              onClick={() => setShowTutorial(true)}
              className="p-2.5 -m-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="도움말"
            >
              <HelpCircle size={14} />
            </button>
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
                문장 카드 — 끌어서 배치하거나 클릭하여 선택
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
                        <SentenceCard
                          key={sentence.id}
                          sentence={sentence}
                          index={i}
                          isSelected={selectedCardId === sentence.id}
                          onSelect={() => handleCardSelect(sentence.id)}
                        />
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
                    hasSelection={!!selectedCardId}
                    isSelected={selectedCardId === sentenceId}
                    onSlotClick={() => handleSlotClick(i)}
                    onReturnToPool={sentenceId ? () => handleReturnToPool(sentenceId) : undefined}
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
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {evaluationResult.level_up ? (
                        <Trophy size={16} className="text-amber-400" />
                      ) : evaluationResult.is_correct ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <XCircle size={16} className="text-red-400" />
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
                    <ShareResultButton
                      level={levelConfig.level}
                      accuracy={evaluationResult.accuracy}
                      isCorrect={evaluationResult.is_correct}
                      levelUp={evaluationResult.level_up}
                      slots={levelConfig.slots}
                    />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {evaluationResult.explanation}
                  </p>

                  {/* 연속 정답 스트릭 */}
                  {evaluationResult.is_correct && (evaluationResult.streak ?? 0) >= 2 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Flame size={13} className="text-orange-400" />
                      <span className="text-xs font-semibold text-orange-400">
                        {evaluationResult.streak}연속 정답!
                      </span>
                    </div>
                  )}

                  {/* 레벨업 진행 상황 */}
                  {evaluationResult.level_progress && !evaluationResult.level_up && levelConfig.level < 7 && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          레벨업 진행
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {evaluationResult.level_progress.qualified}/{evaluationResult.level_progress.required} 세션 달성
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: evaluationResult.level_progress.required }).map((_, i) => (
                          <div
                            key={i}
                            className={[
                              'flex-1 h-1.5 rounded-full transition-all',
                              i < evaluationResult.level_progress!.qualified
                                ? 'bg-amber-400'
                                : 'bg-slate-700',
                            ].join(' ')}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1">
                        80% 이상 정확도 {evaluationResult.level_progress.required}회 달성 시 레벨업
                      </p>
                    </div>
                  )}

                  {/* 정답 보기 토글 (오답일 때만) */}
                  {!evaluationResult.is_correct && evaluationResult.correct_chain && (
                    <div className="mt-3">
                      <button
                        onClick={() => setShowCorrectAnswer(!showCorrectAnswer)}
                        className="text-xs text-amber-400/80 hover:text-amber-400 transition-colors font-medium"
                      >
                        {showCorrectAnswer ? '정답 숨기기' : '정답 순서 보기'}
                      </button>
                      <AnimatePresence>
                        {showCorrectAnswer && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 flex flex-col gap-1.5 overflow-hidden"
                          >
                            {evaluationResult.correct_chain.map((sentenceId, i) => {
                              const sentence = getSentenceById(sentenceId)
                              return (
                                <div
                                  key={sentenceId}
                                  className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
                                >
                                  <span className="shrink-0 w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center border border-emerald-500/30">
                                    {i + 1}
                                  </span>
                                  <p className="text-xs text-slate-300 leading-relaxed">
                                    {sentence?.text ?? '(알 수 없는 문장)'}
                                  </p>
                                </div>
                              )
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-auto pt-2">
              {!isEvaluated ? (
                <>
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={onHintRequest}
                      disabled={hintPoints <= 0 || levelConfig.level === 7 || isHintLoading}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Lightbulb size={14} />
                      힌트
                    </button>
                    <button
                      onClick={handleUndo}
                      disabled={history.length === 0}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-700 text-slate-400 text-sm hover:border-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Undo2 size={13} />
                      되돌리기
                    </button>
                    <button
                      onClick={() => {
                        setChain(Array(levelConfig.slots).fill(null))
                        setPool(question.sentences)
                        setHistory([])
                        onReset()
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-700 text-slate-400 text-sm hover:border-slate-600 transition-colors"
                    >
                      <RefreshCw size={13} />
                      초기화
                    </button>
                  </div>
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

    <GameTutorialOverlay forceOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </>
  )
}
