'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react'

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
        <div className="flex items-center gap-1.5">
          <BookOpen size={14} className="text-amber-400" />
          <span className="text-xs font-semibold text-amber-400 tracking-widest uppercase">
            {topic ? topicLabel[topic] ?? topic : '지문'} 독해
          </span>
        </div>
        <span className="md:hidden text-slate-500">
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
            <div className="flex-1 max-h-[40vh] sm:max-h-[45vh] md:max-h-none overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
              <div className="p-3 sm:p-5">
                <p
                  className="text-sm leading-[1.95] text-slate-200 break-words"
                  style={{ wordBreak: 'keep-all' }}
                >
                  {passage}
                </p>
              </div>
            </div>

            {/* Conclusion to prove */}
            <div className="rounded-xl border border-amber-500/50 bg-amber-500/5 p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-900">?</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-amber-400 tracking-widest uppercase mb-1">
                    증명할 결론
                  </p>
                  <p className="text-sm leading-relaxed text-amber-100" style={{ wordBreak: 'keep-all' }}>
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
        <div className="md:hidden rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2">
          <p className="text-xs text-slate-400 truncate" style={{ wordBreak: 'keep-all' }}>
            {passage.slice(0, 60)}...
          </p>
        </div>
      )}
    </motion.div>
  )
}
