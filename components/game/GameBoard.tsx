'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Lightbulb, Send, RefreshCw, ChevronRight, Undo2, Flame, HelpCircle, XCircle, Loader2 } from 'lucide-react'
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
  dailyRemaining?: number | null
  inviteCode?: string | null
  streak?: number
  isSubmitting: boolean
  isHintLoading: boolean
  isReviewMode?: boolean
  evaluationResult: EvaluationResult | null
  onSubmit: (chain: (string | null)[]) => void
  onHintRequest: () => void
  onNextQuestion: () => void
  onReset: () => void
  activeHints?: string[]
}

export default function GameBoard({
  question,
  levelConfig,
  hintPoints,
  dailyRemaining,
  inviteCode,
  streak = 0,
  isSubmitting,
  isHintLoading,
  isReviewMode,
  evaluationResult,
  onSubmit,
  onHintRequest,
  onNextQuestion,
  onReset,
  activeHints = [],
}: GameBoardProps) {
  const STORAGE_KEY = `iruda_game_${question.id}`

  // Restore saved state or initialize fresh
  function loadSavedState(): { chain: (string | null)[]; pool: Sentence[] } | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const saved = JSON.parse(raw) as { chain: (string | null)[]; pool: string[] }
      if (saved.chain.length !== levelConfig.slots) return null
      const restoredPool = saved.pool
        .map((id: string) => question.sentences.find((s) => s.id === id))
        .filter((s): s is Sentence => !!s)
      return { chain: saved.chain, pool: restoredPool }
    } catch {
      return null
    }
  }

  const saved = typeof window !== 'undefined' ? loadSavedState() : null
  const [chain, setChain] = useState<(string | null)[]>(
    saved?.chain ?? Array(levelConfig.slots).fill(null),
  )
  const [pool, setPool] = useState<Sentence[]>(saved?.pool ?? question.sentences)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)
  const [history, setHistory] = useState<{ chain: (string | null)[]; pool: Sentence[] }[]>([])
  const [showTutorial, setShowTutorial] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  // Persist game state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        chain,
        pool: pool.map((s) => s.id),
      }))
    } catch { /* quota exceeded — ignore */ }
  }, [chain, pool, STORAGE_KEY])

  // Reset when question changes
  useEffect(() => {
    setChain(Array(levelConfig.slots).fill(null))
    setPool(question.sentences)
    setShowCorrectAnswer(false)
    setHistory([])
    try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }, [question.id, levelConfig.slots, question.sentences, STORAGE_KEY])

  // Keyboard shortcuts ref — declared here, assigned after derived state below
  const kbRef = useRef<{ isEvaluated: boolean; isChainComplete: boolean; isSubmitting: boolean; chain: (string | null)[]; handleUndo: () => void; onNextQuestion: () => void; onSubmit: (c: (string | null)[]) => void } | null>(null)

  // Show level up animation when triggered + clear saved state on evaluation
  useEffect(() => {
    if (evaluationResult) {
      try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
      if (evaluationResult.level_up) {
        setShowLevelUp(true)
      }
    }
  }, [evaluationResult, STORAGE_KEY])

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

  // Keyboard shortcuts — use ref for latest values to keep stable listener
  kbRef.current = { isEvaluated, isChainComplete, isSubmitting, chain, handleUndo, onNextQuestion, onSubmit }

  useEffect(() => {
    if (isReviewMode) return
    function handleKeyDown(e: KeyboardEvent) {
      const s = kbRef.current
      if (!s) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !s.isEvaluated) {
        e.preventDefault()
        s.handleUndo()
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        if (s.isEvaluated) {
          s.onNextQuestion()
        } else if (s.isChainComplete && !s.isSubmitting) {
          s.onSubmit(s.chain)
        }
        return
      }
      if (e.key === 'Escape') {
        setSelectedCardId(null)
        return
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isReviewMode])

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

  // Escape handling is consolidated in the keyboard shortcuts useEffect above

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
        <header className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 border-b border-exam-rule bg-white gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="problem-number-sm font-exam-serif shrink-0">
              {levelConfig.level}
            </span>
            <span className="text-xs font-bold text-exam-ink tracking-widest uppercase shrink-0 font-exam-serif">
              Lv.{levelConfig.level}
            </span>
            <span className="text-stone-300 hidden sm:inline">|</span>
            <span className="text-sm text-stone-600 truncate hidden sm:inline">{levelConfig.name}</span>
            <span className="text-stone-300 hidden sm:inline">|</span>
            <span className="text-xs text-stone-500 shrink-0">{levelConfig.slots}단계</span>
            {isReviewMode && (
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 border border-blue-200">
                복습
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-stone-500 shrink-0">
            {streak >= 2 && (
              <span className="flex items-center gap-1 font-semibold text-exam-red">
                <Flame size={12} />
                {streak}연속
              </span>
            )}
            {dailyRemaining != null && (
              <span className={`font-semibold ${dailyRemaining === 0 ? 'text-exam-red' : 'text-stone-500'}`}>
                {dailyRemaining}개 남음
              </span>
            )}
            <div className="flex items-center gap-1">
              <Lightbulb size={12} className="text-stone-600" />
              <span className="text-exam-ink font-semibold">{hintPoints}</span>
              <span className="hidden sm:inline">힌트 포인트</span>
            </div>
            <button
              onClick={() => setShowTutorial(true)}
              className="p-3 -m-1.5 text-stone-400 hover:text-exam-ink transition-colors"
              aria-label="도움말"
            >
              <HelpCircle size={16} />
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
              <p className="text-[10px] font-semibold text-stone-500 tracking-widest uppercase mb-2 px-1">
                <span className="hidden sm:inline">문장 카드 — 끌어서 배치하거나 클릭하여 선택</span>
                <span className="sm:hidden">문장 카드 — 탭하여 선택 또는 길게 눌러 드래그</span>
              </p>
              <Droppable droppableId="pool" direction="vertical">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={[
                      'flex flex-col gap-2 min-h-[48px] p-2 transition-colors duration-200',
                      snapshot.isDraggingOver ? 'bg-bg-base' : 'bg-transparent',
                    ].join(' ')}
                  >
                    {pool.length === 0 ? (
                      <div className="flex items-center justify-center h-12 text-xs text-stone-400 italic">
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
            <div className="section-label">추론 경로 조립</div>

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
                  <div className="w-px h-3 bg-stone-400" />
                  <ChevronRight size={14} className="text-stone-500 rotate-90" />
                </div>
                <div className="flex-1 border-2 border-exam-ink bg-white px-4 py-2">
                  <p className="text-[10px] text-exam-red font-semibold mb-0.5 font-exam-serif">결론</p>
                  <p className="text-xs text-exam-ink leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                    {question.conclusion}
                  </p>
                </div>
              </div>
            </div>

            {/* Evaluation result */}
            <AnimatePresence>
              {evaluationResult && evaluationResult.is_correct && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="status"
                  aria-live="polite"
                  className="border border-green-200 bg-green-50 p-5 text-center"
                >
                  {/* Big score stamp */}
                  <motion.div
                    initial={{ scale: 2.5, opacity: 0, rotate: -20 }}
                    animate={{ scale: 1, opacity: 1, rotate: -8 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                    className="inline-flex flex-col items-center justify-center w-20 h-20 border-3 border-green-700 rounded-full text-green-700 mb-3"
                  >
                    <span className="text-2xl font-black leading-none">{Math.round(evaluationResult.accuracy * 100)}</span>
                    <span className="text-[9px] font-semibold mt-0.5">정답</span>
                  </motion.div>
                  <p className="text-sm font-bold text-green-700 mb-1">
                    {evaluationResult.level_up
                      ? `레벨업! Lv.${levelConfig.level + 1}로 올라갔어요!`
                      : '완벽한 추론 경로예요!'}
                  </p>
                  <p className="text-xs text-stone-500">{evaluationResult.explanation}</p>

                  {/* Streak + hint bonus inline */}
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                    {(evaluationResult.streak ?? 0) >= 2 && (
                      <span className="flex items-center gap-1 font-semibold text-exam-red">
                        <Flame size={13} /> {evaluationResult.streak}연속 정답!
                      </span>
                    )}
                    {(evaluationResult.daily_streak ?? 0) >= 2 && (
                      <span className="flex items-center gap-1 font-semibold text-orange-600">
                        <Flame size={13} /> {evaluationResult.daily_streak}일 연속 훈련
                      </span>
                    )}
                    <span className="text-green-600 font-medium">+1 힌트 포인트</span>
                  </div>

                  {/* Share button */}
                  <div className="flex justify-center mt-3">
                    <ShareResultButton
                      level={levelConfig.level}
                      accuracy={evaluationResult.accuracy}
                      isCorrect={evaluationResult.is_correct}
                      levelUp={evaluationResult.level_up}
                      slots={levelConfig.slots}
                      inviteCode={inviteCode ?? undefined}
                    />
                  </div>

                  {/* 정답 시 추론 과정 해설 */}
                  {evaluationResult.chain_explanations && evaluationResult.chain_explanations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-exam-rule">
                      <button
                        onClick={() => setShowCorrectAnswer(!showCorrectAnswer)}
                        className="text-xs text-green-700 hover:text-green-900 transition-colors font-medium"
                      >
                        {showCorrectAnswer ? '해설 숨기기' : '왜 이 순서가 맞을까?'}
                      </button>
                      <AnimatePresence>
                        {showCorrectAnswer && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 flex flex-col gap-1 overflow-hidden"
                          >
                            {evaluationResult.chain_explanations.map((explanation, i) => (
                              <div key={i} className="flex items-start gap-2 px-3 py-1.5">
                                <span className="text-[10px] font-bold text-green-700 mt-0.5 shrink-0">{i + 1}.</span>
                                <p className="text-[11px] text-stone-600 leading-relaxed">{explanation}</p>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* 레벨업 진행 상황 */}
                  {evaluationResult.level_progress && !evaluationResult.level_up && levelConfig.level < 7 && (
                    <div className="mt-3 pt-3 border-t border-exam-rule">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                          레벨업 진행
                        </span>
                        <span className="text-[10px] text-stone-500">
                          {evaluationResult.level_progress.qualified}/{evaluationResult.level_progress.required} 세션 달성
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {Array.from({ length: evaluationResult.level_progress.required }).map((_, i) => (
                          <div
                            key={i}
                            className={[
                              'flex-1 h-2 rounded-sm transition-all',
                              i < evaluationResult.level_progress!.qualified
                                ? 'bg-exam-ink'
                                : 'bg-stone-200',
                            ].join(' ')}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1">
                        최근 {evaluationResult.level_progress.required}세션 중 80% 이상 정확도를 모두 달성하면 레벨업
                      </p>
                      {levelConfig.level === 6 && (
                        <p className="text-[10px] text-exam-red mt-1.5">
                          레벨 7에서는 힌트를 사용할 수 없어요. 지금 실력을 충분히 다져두세요!
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {evaluationResult && !evaluationResult.is_correct && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="status"
                  aria-live="polite"
                  className="border border-exam-rule bg-white p-5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <XCircle size={18} className="text-exam-red shrink-0" />
                      <div>
                        <span className="text-lg font-black text-exam-ink">
                          <span className="mark-red">{Math.round(evaluationResult.accuracy * 100)}%</span>
                        </span>
                        <p className="text-xs text-stone-500 mt-0.5">{evaluationResult.explanation}</p>
                      </div>
                    </div>
                    <ShareResultButton
                      level={levelConfig.level}
                      accuracy={evaluationResult.accuracy}
                      isCorrect={evaluationResult.is_correct}
                      levelUp={evaluationResult.level_up}
                      slots={levelConfig.slots}
                      inviteCode={inviteCode ?? undefined}
                    />
                  </div>

                  {/* 일일 스트릭 (오답에서도 표시) */}
                  {(evaluationResult.daily_streak ?? 0) >= 2 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Flame size={13} className="text-orange-500" />
                      <span className="text-xs font-semibold text-orange-600">
                        {evaluationResult.daily_streak}일 연속 훈련
                      </span>
                    </div>
                  )}

                  {/* 레벨업 진행 상황 */}
                  {evaluationResult.level_progress && !evaluationResult.level_up && levelConfig.level < 7 && (
                    <div className="mt-3 pt-3 border-t border-exam-rule">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                          레벨업 진행
                        </span>
                        <span className="text-[10px] text-stone-500">
                          {evaluationResult.level_progress.qualified}/{evaluationResult.level_progress.required} 세션 달성
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {Array.from({ length: evaluationResult.level_progress.required }).map((_, i) => (
                          <div
                            key={i}
                            className={[
                              'flex-1 h-2 rounded-sm transition-all',
                              i < evaluationResult.level_progress!.qualified
                                ? 'bg-exam-ink'
                                : 'bg-stone-200',
                            ].join(' ')}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1">
                        최근 {evaluationResult.level_progress.required}세션 중 80% 이상 정확도를 모두 달성하면 레벨업
                      </p>
                      {levelConfig.level === 6 && (
                        <p className="text-[10px] text-exam-red mt-1.5">
                          레벨 7에서는 힌트를 사용할 수 없어요. 지금 실력을 충분히 다져두세요!
                        </p>
                      )}
                    </div>
                  )}

                  {/* 정답 보기 토글 (오답일 때만) */}
                  {evaluationResult.correct_chain && (
                    <div className="mt-3">
                      <button
                        onClick={() => setShowCorrectAnswer(!showCorrectAnswer)}
                        className="text-xs text-exam-red hover:text-red-800 transition-colors font-medium"
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
                              const stepExplanation = evaluationResult.chain_explanations?.[i]
                              return (
                                <div key={sentenceId} className="space-y-0">
                                  <div className="flex items-start gap-2 border border-green-700/30 bg-green-50 px-3 py-2">
                                    <span className="problem-number-sm shrink-0 !bg-green-700 !border-green-700 !text-white font-exam-serif">
                                      {i + 1}
                                    </span>
                                    <div>
                                      <p className="text-xs text-exam-ink leading-relaxed">
                                        {sentence?.text ?? '(알 수 없는 문장)'}
                                      </p>
                                      {stepExplanation && (
                                        <p className="text-[11px] text-green-800/70 mt-1 leading-relaxed italic">
                                          {stepExplanation}
                                        </p>
                                      )}
                                    </div>
                                  </div>
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

            {/* Persistent hint panel */}
            {activeHints.length > 0 && !isEvaluated && (
              <div className="border border-amber-300 bg-amber-50 p-3">
                <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lightbulb size={12} />
                  힌트 ({activeHints.length}개)
                </p>
                <div className="space-y-1.5">
                  {activeHints.map((hint, i) => (
                    <p key={i} className="text-xs text-amber-900 leading-relaxed">
                      <span className="font-semibold text-amber-700">#{i + 1}</span>{' '}
                      {hint}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-auto pt-2">
              {!isEvaluated ? (
                <>
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={onHintRequest}
                      disabled={hintPoints <= 0 || levelConfig.level === 7 || isHintLoading}
                      aria-label={
                        levelConfig.level === 7
                          ? '레벨 7에서는 힌트를 사용할 수 없습니다'
                          : hintPoints <= 0
                            ? '힌트 포인트가 부족합니다'
                            : `힌트 사용 (남은 포인트: ${hintPoints})`
                      }
                      title={
                        levelConfig.level === 7
                          ? '최고 레벨 — 힌트 없이 도전!'
                          : hintPoints <= 0
                            ? '힌트 포인트 부족'
                            : undefined
                      }
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 border border-exam-rule bg-white text-stone-600 text-sm font-medium hover:bg-bg-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Lightbulb size={14} />
                      {isHintLoading ? '로딩...' : '힌트'}
                    </button>
                    <button
                      onClick={handleUndo}
                      disabled={history.length === 0}
                      aria-label="마지막 동작 되돌리기"
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-3 border border-exam-rule text-stone-500 text-sm hover:border-stone-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      aria-label="모든 배치 초기화"
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 border border-exam-rule text-stone-500 text-sm hover:border-stone-400 transition-colors"
                    >
                      <RefreshCw size={13} />
                      초기화
                    </button>
                  </div>
                  {hintPoints <= 0 && levelConfig.level !== 7 && (
                    <p className="text-[11px] text-stone-500 mt-1">
                      힌트 포인트가 없어요. 매일 +3 자동 충전되고, 정답 시 +1 보너스를 받아요.
                    </p>
                  )}
                  <button
                    onClick={() => onSubmit(chain)}
                    disabled={!isChainComplete || isSubmitting}
                    aria-label="추론 경로 제출"
                    aria-busy={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    {isSubmitting ? '평가 중...' : '추론 경로 제출'}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex gap-2 sm:gap-3">
                    {!evaluationResult.is_correct && (
                      <button
                        onClick={() => {
                          setChain(Array(levelConfig.slots).fill(null))
                          setPool(question.sentences)
                          setHistory([])
                          setShowCorrectAnswer(false)
                          onReset()
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-exam-rule text-exam-ink text-sm font-medium hover:bg-bg-base transition-colors"
                      >
                        <RefreshCw size={14} />
                        다시 풀기
                      </button>
                    )}
                    <button
                      onClick={onNextQuestion}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors"
                    >
                      다음 문제
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Dashboard link for premium users */}
                  {dailyRemaining === null && (
                    <Link
                      href="/dashboard"
                      className="block text-center text-xs text-stone-500 hover:text-exam-ink transition-colors mt-2"
                    >
                      성장 분석 보기 →
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>

    {showLevelUp && (
      <LevelUpAnimation
        fromLevel={levelConfig.level}
        toLevel={levelConfig.level + 1}
        onDismiss={() => setShowLevelUp(false)}
      />
    )}

    <GameTutorialOverlay forceOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </>
  )
}
