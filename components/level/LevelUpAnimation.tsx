'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

interface LevelUpAnimationProps {
  fromLevel: number
  toLevel: number
  onDismiss: () => void
}

function Particle({ delay, x, y, color }: { delay: number; x: number; y: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2"
      style={{ backgroundColor: color }}
      initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [0, x * 0.5, x],
        y: [0, y * 0.5, y],
        scale: [0, 1.5, 0],
      }}
      transition={{
        duration: 1.2,
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
    }, reduced ? 2000 : 4000)
    return () => clearTimeout(timer)
  }, [onDismiss, reduced])

  const particleColors = ['#1C1917', '#C22D2D', '#1C1917', '#C22D2D', '#78716C']

  const particles = reduced
    ? []
    : Array.from({ length: 20 }, (_, i) => ({
        id: i,
        delay: 0.3 + Math.random() * 0.5,
        x: (Math.random() - 0.5) * 300,
        y: (Math.random() - 0.5) * 300,
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
                <Particle key={p.id} delay={p.delay} x={p.x} y={p.y} color={p.color} />
              ))}
            </div>

            {/* Ring */}
            <motion.div
              className="absolute w-40 h-40 border-2 border-exam-ink/20"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 2.5], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, delay: 0.2 }}
            />

            {/* Level number */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="relative"
            >
              <div className="w-28 h-28 border-4 border-exam-ink bg-white flex items-center justify-center">
                <div className="text-center">
                  <motion.span
                    className="text-4xl font-exam-serif font-black text-exam-ink"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {toLevel}
                  </motion.span>
                </div>
              </div>
            </motion.div>

            {/* Level up text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-center"
            >
              <h2 className="text-2xl font-exam-serif font-black text-exam-ink tracking-wider">
                LEVEL UP!
              </h2>
              <p className="mt-2 text-sm text-stone-500">
                Lv.{fromLevel} → Lv.{toLevel}
              </p>
            </motion.div>

            {/* Continue hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6] }}
              transition={{ delay: 1.5 }}
              className="mt-8 text-xs text-stone-400"
            >
              화면을 터치하면 계속합니다
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
