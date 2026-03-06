'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GripVertical, ArrowDown, MousePointerClick, X } from 'lucide-react'

const TUTORIAL_KEY = 'iruda_tutorial_seen'

const STEPS = [
  {
    icon: MousePointerClick,
    title: '문장 카드를 확인하세요',
    desc: '지문을 읽고, 추론에 필요한 문장 카드를 파악하세요.',
  },
  {
    icon: GripVertical,
    title: '카드를 드래그하세요',
    desc: '문장 카드를 길게 누른 채 아래 슬롯으로 끌어다 놓으세요.',
  },
  {
    icon: ArrowDown,
    title: '올바른 순서로 배치하세요',
    desc: '결론에 이르는 논리적 추론 순서대로 배치하면 완성!',
  },
]

export default function GameTutorialOverlay() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const seen = localStorage.getItem(TUTORIAL_KEY)
    if (!seen) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(TUTORIAL_KEY, 'true')
    setVisible(false)
  }

  function nextStep() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      dismiss()
    }
  }

  if (!visible) return null

  const current = STEPS[step]
  const Icon = current.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) dismiss()
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl shadow-black/60"
        >
          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 transition-colors"
          >
            <X size={16} />
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={[
                  'h-1 rounded-full transition-all duration-300',
                  i === step ? 'w-6 bg-amber-400' : i < step ? 'w-3 bg-amber-400/50' : 'w-3 bg-slate-600',
                ].join(' ')}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-4">
            <Icon size={24} className="text-amber-400" />
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-lg font-bold text-white mb-1.5">{current.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{current.desc}</p>
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={dismiss}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              건너뛰기
            </button>
            <button
              onClick={nextStep}
              className="px-5 py-2 rounded-xl bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors"
            >
              {step < STEPS.length - 1 ? '다음' : '시작하기'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
