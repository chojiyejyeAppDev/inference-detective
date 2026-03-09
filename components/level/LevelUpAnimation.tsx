'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

interface LevelUpAnimationProps {
  fromLevel: number
  toLevel: number
  onDismiss: () => void
}

function Particle({ delay, x, y, size, color }: { delay: number; x: number; y: number; size: number; color: string }) {
  return (
    <motion.div
      className="absolute"
      style={{ backgroundColor: color, width: size, height: size }}
      initial={{ opacity: 0, x: 0, y: 0, scale: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [0, x * 0.4, x],
        y: [0, y * 0.4, y],
        scale: [0, 1.5, 0],
        rotate: [0, Math.random() * 360],
      }}
      transition={{
        duration: 1.4,
        delay,
        ease: 'easeOut',
      }}
    />
  )
}

export default function LevelUpAnimation({ fromLevel, toLevel, onDismiss }: LevelUpAnimationProps) {
  const [visible, setVisible] = useState(true)
  const reduced = useReducedMotion()

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, reduced ? 0 : 400)
    }, reduced ? 2000 : 5000)
    return () => clearTimeout(timer)
  }, [onDismiss, reduced])

  const particleColors = ['#1C1917', '#C22D2D', '#1C1917', '#C22D2D', '#78716C', '#D6D3CA']

  const particles = reduced
    ? []
    : Array.from({ length: 32 }, (_, i) => ({
        id: i,
        delay: 0.2 + Math.random() * 0.6,
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        size: 4 + Math.random() * 8,
        color: particleColors[i % particleColors.length],
      }))

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm"
          onClick={() => {
            setVisible(false)
            setTimeout(onDismiss, 400)
          }}
        >
          <div className="relative flex flex-col items-center">
            {/* Particles */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {particles.map((p) => (
                <Particle key={p.id} delay={p.delay} x={p.x} y={p.y} size={p.size} color={p.color} />
              ))}
            </div>

            {/* Expanding rings */}
            {!reduced && [0, 0.3, 0.6].map((delay, i) => (
              <motion.div
                key={i}
                className="absolute w-40 h-40 border-2 border-exam-ink/15 rounded-full"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 3], opacity: [0.5, 0] }}
                transition={{ duration: 1.8, delay: 0.2 + delay, ease: 'easeOut' }}
              />
            ))}

            {/* Score stamp — teacher's red circle */}
            <motion.div
              initial={{ scale: 2.5, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: -8, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
                delay: 0.1,
              }}
              className="relative"
            >
              <div className="w-32 h-32 border-[3px] border-exam-red rounded-full flex items-center justify-center bg-white">
                <div className="text-center">
                  <motion.span
                    className="block text-5xl font-exam-serif font-black text-exam-red"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 400 }}
                  >
                    {toLevel}
                  </motion.span>
                  <motion.span
                    className="block text-[10px] font-bold text-exam-red tracking-widest mt-0.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    LEVEL
                  </motion.span>
                </div>
              </div>
            </motion.div>

            {/* Level up text with wavy underline */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-8 text-center"
            >
              <h2 className="text-3xl font-exam-serif font-black text-exam-ink tracking-wider">
                <span className="mark-red">LEVEL UP!</span>
              </h2>
              <motion.p
                className="mt-3 text-sm text-stone-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                Lv.{fromLevel} → Lv.{toLevel}
              </motion.p>
            </motion.div>

            {/* Continue hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6] }}
              transition={{ delay: 2.0 }}
              className="mt-10 text-xs text-stone-400"
            >
              화면을 터치하면 계속합니다
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
