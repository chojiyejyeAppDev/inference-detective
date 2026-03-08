'use client'

import { Droppable, Draggable } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, X } from 'lucide-react'
import { Sentence } from '@/types'
import { SlotFeedback } from '@/types'

interface InferenceSlotProps {
  slotIndex: number
  sentence: Sentence | null
  feedback?: SlotFeedback
  isEvaluated?: boolean
  hasSelection?: boolean
  isSelected?: boolean
  onSlotClick?: () => void
  onReturnToPool?: () => void
}

export default function InferenceSlot({
  slotIndex,
  sentence,
  feedback,
  isEvaluated = false,
  hasSelection = false,
  isSelected = false,
  onSlotClick,
  onReturnToPool,
}: InferenceSlotProps) {
  const feedbackColor = isEvaluated
    ? feedback?.is_correct
      ? 'border-green-700 bg-green-50'
      : 'border-exam-red bg-exam-highlight'
    : sentence
      ? 'border-exam-ink bg-white'
      : 'border-dashed border-exam-rule bg-bg-base'

  return (
    <Droppable droppableId={`slot-${slotIndex}`}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          role="region"
          tabIndex={isEvaluated ? undefined : 0}
          aria-label={`추론 ${slotIndex + 1}단계 슬롯${sentence ? `: ${sentence.text}` : ' (비어있음)'}${hasSelection && !sentence ? ' — 클릭하여 배치' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onSlotClick?.()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSlotClick?.()
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
              e.preventDefault()
              onReturnToPool?.()
            }
          }}
          className={[
            'relative min-h-[48px] sm:min-h-[60px] border-2 transition-all duration-200',
            !isEvaluated && 'cursor-pointer',
            snapshot.isDraggingOver
              ? 'border-exam-ink bg-amber-50 scale-[1.02] shadow-sm'
              : isSelected
                ? 'border-exam-ink bg-exam-highlight ring-2 ring-exam-red/20'
                : hasSelection && !sentence && !isEvaluated
                  ? 'border-stone-400 bg-bg-base animate-pulse'
                  : feedbackColor,
          ].filter(Boolean).join(' ')}
        >
          {/* Slot number tag — exam problem number style */}
          <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 z-10">
            <div className={[
              'problem-number-sm font-exam-serif',
              isEvaluated
                ? feedback?.is_correct
                  ? '!bg-green-700 !border-green-700 !text-white'
                  : '!bg-exam-red !border-exam-red !text-white'
                : sentence
                  ? '!bg-exam-ink !border-exam-ink !text-white'
                  : '',
            ].join(' ')}>
              {slotIndex + 1}
            </div>
          </div>

          {/* Remove button for filled slots (especially important on mobile) */}
          {sentence && !isEvaluated && onReturnToPool && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onReturnToPool()
              }}
              className="absolute top-1.5 right-1.5 z-10 p-1.5 text-stone-400 hover:text-exam-red hover:bg-exam-highlight transition-colors"
              aria-label="카드를 풀로 되돌리기"
            >
              <X size={14} />
            </button>
          )}

          {/* Content */}
          <motion.div
            className="px-5 py-2.5 sm:py-3 pr-8 min-h-[48px] sm:min-h-[60px] flex items-center"
            animate={sentence ? { scale: [1, 1.01, 1] } : {}}
            transition={{ duration: 0.2 }}
            key={sentence?.id ?? 'empty'}
          >
            <AnimatePresence mode="wait">
              {sentence ? (
                <Draggable draggableId={sentence.id} index={0} isDragDisabled={isEvaluated}>
                  {(draggableProvided, draggableSnapshot) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      {...draggableProvided.dragHandleProps}
                      className={[
                        'w-full text-sm leading-relaxed text-exam-ink select-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-exam-ink focus-visible:outline-none',
                        isEvaluated ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
                        draggableSnapshot.isDragging ? 'opacity-50' : 'opacity-100',
                      ].join(' ')}
                      style={draggableProvided.draggableProps.style}
                    >
                      {sentence.text}
                    </div>
                  )}
                </Draggable>
              ) : (
                <motion.span
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-stone-400 italic"
                >
                  {snapshot.isDraggingOver
                    ? '여기에 놓으세요'
                    : hasSelection
                      ? '클릭하여 여기에 배치'
                      : `${slotIndex + 1}번째 추론 단계를 끌어다 놓으세요`}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Feedback hint */}
          {isEvaluated && feedback?.hint && !feedback.is_correct && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-5 pb-2 text-xs text-exam-red"
            >
              <Lightbulb size={12} className="inline shrink-0 -mt-0.5" /> {feedback.hint}
            </motion.div>
          )}

          {provided.placeholder}
        </div>
      )}
    </Droppable>
  )
}
