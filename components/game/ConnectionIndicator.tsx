'use client'

import { motion } from 'framer-motion'

type Strength = 'strong' | 'medium' | 'weak' | 'empty'

interface ConnectionIndicatorProps {
  strength: Strength
}

const CONFIG: Record<Strength, { color: string; label: string; pulse: boolean }> = {
  strong: { color: '#10B981', label: '강한 연결', pulse: true },
  medium: { color: '#F59E0B', label: '약한 연결', pulse: false },
  weak: { color: '#EF4444', label: '논리 단절', pulse: false },
  empty: { color: '#334155', label: '비어있음', pulse: false },
}

export default function ConnectionIndicator({ strength }: ConnectionIndicatorProps) {
  const { color, label, pulse } = CONFIG[strength]

  return (
    <div className="flex items-center justify-center py-1 relative">
      {/* Vertical line */}
      <div className="flex flex-col items-center gap-0.5">
        <motion.div
          className="w-0.5 h-3 rounded-full"
          style={{ backgroundColor: color }}
          animate={pulse ? { opacity: [1, 0.4, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
        {/* Arrow */}
        <motion.svg
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          animate={pulse ? { y: [0, 2, 0] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <path
            d="M1 1L6 6L11 1"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </div>

      {/* Label */}
      {strength !== 'empty' && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute left-[calc(50%+20px)] text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ color, backgroundColor: `${color}18` }}
        >
          {label}
        </motion.span>
      )}
    </div>
  )
}
