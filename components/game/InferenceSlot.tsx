'use client'

import { Droppable, Draggable } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import { Sentence } from '@/types'
import { SlotFeedback } from '@/types'

interface InferenceSlotProps {
  slotIndex: number
  sentence: Sentence | null
  feedback?: SlotFeedback
  isEvaluated?: boolean
}

export default function InferenceSlot({
  slotIndex,
  sentence,
  feedback,
  isEvaluated = false,
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
          className={[
            'relative min-h-[60px] rounded-lg border-2 transition-all duration-200',
            snapshot.isDraggingOver ? 'border-amber-400 bg-amber-500/10 scale-[1.01]' : feedbackColor,
          ].join(' ')}
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
          <div className="px-5 py-3 min-h-[60px] flex items-center">
            <AnimatePresence mode="wait">
              {sentence ? (
                <Draggable draggableId={sentence.id} index={0}>
                  {(draggableProvided, draggableSnapshot) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      {...draggableProvided.dragHandleProps}
                      className={[
                        'w-full text-sm leading-relaxed text-slate-100 cursor-grab active:cursor-grabbing transition-opacity duration-150',
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
                  className="text-sm text-slate-500 italic"
                >
                  {snapshot.isDraggingOver
                    ? '여기에 놓으세요'
                    : `${slotIndex + 1}번째 추론 단계를 끌어다 놓으세요`}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Feedback hint */}
          {isEvaluated && feedback?.hint && !feedback.is_correct && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-5 pb-2 text-xs text-red-300"
            >
              💡 {feedback.hint}
            </motion.div>
          )}

          {provided.placeholder}
        </div>
      )}
    </Droppable>
  )
}
