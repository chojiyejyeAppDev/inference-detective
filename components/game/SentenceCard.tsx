'use client'

import { Draggable } from '@hello-pangea/dnd'
import { cn } from '@/lib/utils'
import { Sentence } from '@/types'

interface SentenceCardProps {
  sentence: Sentence
  index: number
  isDimmed?: boolean
  isSelected?: boolean
  onSelect?: () => void
}

export default function SentenceCard({ sentence, index, isDimmed = false, isSelected = false, onSelect }: SentenceCardProps) {
  return (
    <Draggable draggableId={sentence.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          role="listitem"
          tabIndex={0}
          aria-label={`문장 카드 ${String.fromCharCode(65 + index)}: ${sentence.text}`}
          aria-grabbed={snapshot.isDragging}
          aria-selected={isSelected}
          onClick={(e) => {
            e.stopPropagation()
            onSelect?.()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelect?.()
            }
          }}
          className={cn(
            'group relative flex items-start gap-2.5 border px-3 py-2.5 cursor-grab active:cursor-grabbing select-none touch-manipulation',
            'transition-all duration-150 focus-visible:ring-2 focus-visible:ring-exam-ink focus-visible:outline-none',
            snapshot.isDragging
              ? 'border-exam-ink bg-white shadow-md scale-[1.01] z-50'
              : isSelected
                ? 'border-exam-ink bg-exam-highlight ring-2 ring-exam-red/20'
                : 'border-exam-rule bg-white hover:border-stone-400 hover:bg-bg-base',
            isDimmed ? 'opacity-35' : 'opacity-100',
          )}
          style={provided.draggableProps.style}
        >
          {/* Number badge — exam circle style */}
          <span className="problem-number-sm shrink-0 mt-0.5 font-exam-serif">
            {String.fromCharCode(65 + index)}
          </span>

          {/* Sentence text */}
          <p className="flex-1 text-sm leading-relaxed text-exam-ink break-words">
            {sentence.text}
          </p>

          {/* Drag grip — subtle dots */}
          <div className="shrink-0 flex flex-col gap-[3px] opacity-40 group-hover:opacity-60 mt-0.5 p-1 transition-opacity">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-[3px]">
                <div className="w-1 h-1 rounded-full bg-stone-400" />
                <div className="w-1 h-1 rounded-full bg-stone-400" />
              </div>
            ))}
          </div>
        </div>
      )}
    </Draggable>
  )
}
