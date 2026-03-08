'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

type Strength = 'strong' | 'medium' | 'weak' | 'empty'

interface ConnectionIndicatorProps {
  strength: Strength
}

const CONFIG: Record<Strength, { color: string; label: string; tooltip: string; pulse: boolean; icon: 'check' | 'wave' | 'x' | 'dot' }> = {
  strong: { color: '#16A34A', label: '✓ 강한 연결', tooltip: '논리 흐름이 자연스럽습니다', pulse: true, icon: 'check' },
  medium: { color: '#D97706', label: '~ 보통 연결', tooltip: '카드 순서를 바꿔 보세요', pulse: false, icon: 'wave' },
  weak: { color: '#C22D2D', label: '✗ 약한 연결', tooltip: '이 배치는 논리적으로 맞지 않습니다', pulse: false, icon: 'x' },
  empty: { color: '#D6D3D1', label: '· · ·', tooltip: '', pulse: false, icon: 'dot' },
}

function StrengthIcon({ type, color }: { type: 'check' | 'wave' | 'x' | 'dot'; color: string }) {
  const size = 12
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
  const config = CONFIG[strength]
  const shouldPulse = config.pulse && !reduced

  return (
    <div className="flex items-center justify-center py-1.5 relative" role="img" aria-label={config.label} title={config.tooltip || undefined}>
      {/* Vertical connector line */}
      <div className="absolute left-[calc(50%-0.5px)] w-px h-full" style={{ backgroundColor: config.color + '30' }} />

      {/* Bridge badge */}
      <motion.div
        className={[
          'relative z-10 flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-full transition-all',
          strength === 'strong' ? 'text-green-700 bg-green-50 border border-green-200' :
          strength === 'medium' ? 'text-amber-600 bg-amber-50 border border-amber-200' :
          strength === 'weak' ? 'text-red-700 bg-red-50 border border-red-200' :
          'text-stone-300 border border-dashed border-stone-200 bg-white',
        ].join(' ')}
        initial={reduced ? false : { scale: 0.8, opacity: 0 }}
        animate={shouldPulse
          ? { scale: [1, 1.05, 1], opacity: 1 }
          : { scale: 1, opacity: 1 }
        }
        transition={shouldPulse
          ? { scale: { repeat: Infinity, duration: 1.5 }, opacity: { duration: 0.3 } }
          : { type: 'spring', stiffness: 300, damping: 25 }
        }
      >
        {strength === 'strong' && <StrengthIcon type="check" color="#15803D" />}
        {strength === 'medium' && <StrengthIcon type="wave" color="#D97706" />}
        {strength === 'weak' && <StrengthIcon type="x" color="#B91C1C" />}
        {strength === 'empty' && <StrengthIcon type="dot" color="#D6D3D1" />}
        <span>{config.label}</span>
      </motion.div>
    </div>
  )
}
