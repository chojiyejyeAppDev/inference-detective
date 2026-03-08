'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

type Strength = 'strong' | 'medium' | 'weak' | 'empty'

interface ConnectionIndicatorProps {
  strength: Strength
}

const CONFIG: Record<Strength, { color: string; bgClass: string; label: string; tooltip: string; pulse: boolean; icon: 'check' | 'wave' | 'x' | 'dot' }> = {
  strong: { color: '#16A34A', bgClass: 'bg-green-600', label: '강한 연결', tooltip: '앞뒤 논리가 자연스러워요', pulse: true, icon: 'check' },
  medium: { color: '#D97706', bgClass: 'bg-amber-500', label: '보통 연결', tooltip: '순서를 다시 확인해 보세요', pulse: false, icon: 'wave' },
  weak: { color: '#C22D2D', bgClass: 'bg-exam-red', label: '약한 연결', tooltip: '이 배치는 논리가 맞지 않아요', pulse: false, icon: 'x' },
  empty: { color: '#D6D3D1', bgClass: 'bg-stone-300', label: '비어있음', tooltip: '', pulse: false, icon: 'dot' },
}

function StrengthIcon({ type, color }: { type: 'check' | 'wave' | 'x' | 'dot'; color: string }) {
  const size = 14
  switch (type) {
    case 'check':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M4.5 8.5L7 11L11.5 5.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'wave':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M4 8C5 6.5 6.5 9.5 8 8C9.5 6.5 11 9.5 12 8" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'x':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'dot':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2" fill={color} opacity="0.5" />
        </svg>
      )
  }
}

export default function ConnectionIndicator({ strength }: ConnectionIndicatorProps) {
  const reduced = useReducedMotion()
  const { color, label, tooltip, pulse: shouldPulse, icon } = CONFIG[strength]
  const pulse = shouldPulse && !reduced

  return (
    <div className="flex items-center justify-center py-0.5 relative group" aria-label={label} title={tooltip || undefined} role="img">
      {/* Thin vertical line + shape icon */}
      <div className="flex flex-col items-center gap-0">
        <motion.div
          className="w-px h-2"
          style={{ backgroundColor: color }}
          animate={pulse ? { opacity: [1, 0.4, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
        {/* Shape icon for color-blind accessibility */}
        <motion.div
          animate={pulse ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <StrengthIcon type={icon} color={color} />
        </motion.div>
        {/* Arrow */}
        <motion.svg
          width="8"
          height="5"
          viewBox="0 0 10 6"
          fill="none"
          animate={pulse ? { y: [0, 1, 0] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <path
            d="M1 1L5 5L9 1"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </div>

      {/* Label — always visible on desktop */}
      {strength !== 'empty' && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="hidden sm:block absolute left-[calc(50%+18px)] text-[10px] font-medium px-1.5 py-0.5 whitespace-nowrap border"
          style={{ color, borderColor: `${color}40`, backgroundColor: `${color}0A` }}
        >
          {label}
        </motion.span>
      )}
    </div>
  )
}
