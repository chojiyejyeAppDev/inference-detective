'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface PassageViewerProps {
  passage: string
  conclusion: string
  topic?: string
}

export default function PassageViewer({ passage, conclusion, topic }: PassageViewerProps) {
  const [collapsed, setCollapsed] = useState(false)

  const topicLabel: Record<string, string> = {
    humanities: '인문',
    social: '사회',
    science: '과학',
    tech: '기술',
    arts: '예술',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full md:w-[45%] flex flex-col gap-3 min-w-0"
    >
      {/* Header — mobile: clickable toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center justify-between px-1 md:pointer-events-none"
      >
        <div className="flex items-center gap-2">
          <span className="problem-number-sm text-exam-ink font-exam-serif">
            {topic ? topicLabel[topic] ?? topic : '지'}
          </span>
          <span className="text-xs font-semibold text-exam-ink tracking-widest uppercase font-exam-serif">
            {topic ? topicLabel[topic] ?? topic : '지문'} 독해
          </span>
        </div>
        <span className="md:hidden text-stone-400">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </span>
      </button>

      {/* Passage — collapsible on mobile */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden md:!h-auto md:!opacity-100 flex flex-col gap-3"
          >
            <div className="flex-1 max-h-[40vh] sm:max-h-[45vh] md:max-h-none overflow-y-auto passage-box bg-ruled">
              <p
                className="text-sm leading-[2] text-exam-ink break-words font-exam-serif"
                style={{ wordBreak: 'keep-all' }}
              >
                {passage}
              </p>
            </div>

            {/* Conclusion to prove */}
            <div className="border-2 border-exam-ink bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <div className="problem-number font-exam-serif">
                    ?
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-annotation tracking-widest uppercase mb-1">
                    증명할 결론
                  </p>
                  <p className="text-sm leading-relaxed text-exam-ink font-exam-serif" style={{ wordBreak: 'keep-all' }}>
                    {conclusion}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed summary on mobile */}
      {collapsed && (
        <div className="md:hidden border border-exam-rule bg-white px-3 py-2">
          <p className="text-xs text-stone-500 truncate" style={{ wordBreak: 'keep-all' }}>
            {passage.slice(0, 60)}...
          </p>
        </div>
      )}
    </motion.div>
  )
}
