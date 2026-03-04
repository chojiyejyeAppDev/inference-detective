'use client'

import { Draggable } from '@hello-pangea/dnd'
import { Sentence } from '@/types'

interface SentenceCardProps {
  sentence: Sentence
  index: number
  isDimmed?: boolean
}

export default function SentenceCard({ sentence, index, isDimmed = false }: SentenceCardProps) {
  return (
    <Draggable draggableId={sentence.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={[
            'group relative flex items-start gap-2 rounded-lg border px-3 py-2.5 cursor-grab active:cursor-grabbing select-none',
            'transition-all duration-150',
            snapshot.isDragging
              ? 'border-amber-400 bg-slate-700 shadow-lg shadow-amber-500/20 scale-[1.02] rotate-1 z-50'
              : 'border-slate-600 bg-slate-800/80 hover:border-slate-500 hover:bg-slate-700/80',
            isDimmed ? 'opacity-35' : 'opacity-100',
          ].join(' ')}
          style={provided.draggableProps.style}
        >
          {/* Number badge */}
          <span className="shrink-0 mt-0.5 w-5 h-5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center border border-amber-500/30">
            {String.fromCharCode(65 + index)}
          </span>

          {/* Sentence text */}
          <p className="flex-1 text-sm leading-relaxed text-slate-200 break-words">
            {sentence.text}
          </p>

          {/* Drag grip */}
          <div className="shrink-0 flex flex-col gap-0.5 opacity-30 group-hover:opacity-60 mt-1 transition-opacity">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-slate-400" />
                <div className="w-1 h-1 rounded-full bg-slate-400" />
              </div>
            ))}
          </div>
        </div>
      )}
    </Draggable>
  )
}
