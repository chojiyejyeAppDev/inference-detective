'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LevelUpAnimationProps {
  fromLevel: number
  toLevel: number
  onDismiss: () => void
}

function Particle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full bg-amber-400"
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 400)
    }, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: 0.3 + Math.random() * 0.5,
    x: (Math.random() - 0.5) * 300,
    y: (Math.random() - 0.5) * 300,
  }))

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => {
            setVisible(false)
            setTimeout(onDismiss, 400)
          }}
        >
          <div className="relative flex flex-col items-center">
            {/* Particles */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {particles.map((p) => (
                <Particle key={p.id} delay={p.delay} x={p.x} y={p.y} />
              ))}
            </div>

            {/* Glow ring */}
            <motion.div
              className="absolute w-40 h-40 rounded-full border-2 border-amber-400/30"
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
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/30">
                <div className="text-center">
                  <motion.span
                    className="text-4xl font-black text-slate-900"
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
              <h2 className="text-2xl font-black text-amber-400 tracking-wider">
                LEVEL UP!
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Lv.{fromLevel} → Lv.{toLevel}
              </p>
            </motion.div>

            {/* Continue hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6] }}
              transition={{ delay: 1.5 }}
              className="mt-8 text-xs text-slate-500"
            >
              화면을 터치하면 계속합니다
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
