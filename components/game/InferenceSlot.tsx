'use client'

import { Droppable, Draggable } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb } from 'lucide-react'
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
      ? 'border-emerald-500 bg-emerald-500/10'
      : 'border-red-500 bg-red-500/10'
    : sentence
      ? 'border-amber-500/50 bg-slate-800'
      : 'border-dashed border-slate-600 bg-slate-800/40'

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
            'relative min-h-[48px] sm:min-h-[60px] rounded-lg border-2 transition-all duration-200',
            !isEvaluated && 'cursor-pointer',
            snapshot.isDraggingOver
              ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
              : isSelected
                ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/50'
                : hasSelection && !sentence && !isEvaluated
                  ? 'border-amber-400/50 bg-amber-500/5 animate-pulse'
                  : feedbackColor,
          ].filter(Boolean).join(' ')}
        >
          {/* Slot number tag */}
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-10">
            <div className={[
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2',
              isEvaluated
                ? feedback?.is_correct
                  ? 'bg-emerald-500 border-emerald-400 text-white'
                  : 'bg-red-500 border-red-400 text-white'
                : sentence
                  ? 'bg-amber-500 border-amber-400 text-slate-900'
                  : 'bg-slate-700 border-slate-600 text-slate-400',
            ].join(' ')}>
              {slotIndex + 1}
            </div>
          </div>

          {/* Content */}
          <motion.div
            className="px-5 py-2.5 sm:py-3 min-h-[48px] sm:min-h-[60px] flex items-center"
            animate={sentence ? { scale: [1, 1.02, 1] } : {}}
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
                        'w-full text-sm leading-relaxed text-slate-100 select-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none',
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
                  className="text-sm text-slate-400 italic"
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
              className="px-5 pb-2 text-xs text-red-300"
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
