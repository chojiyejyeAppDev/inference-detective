'use client'

import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'

interface PassageViewerProps {
  passage: string
  conclusion: string
  topic?: string
}

export default function PassageViewer({ passage, conclusion, topic }: PassageViewerProps) {
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
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <BookOpen size={14} className="text-amber-400" />
        <span className="text-xs font-semibold text-amber-400 tracking-widest uppercase">
          {topic ? topicLabel[topic] ?? topic : '지문'} 독해
        </span>
      </div>

      {/* Passage */}
      <div className="flex-1 max-h-[30vh] sm:max-h-[40vh] md:max-h-none overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm">
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
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
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
  )
}
