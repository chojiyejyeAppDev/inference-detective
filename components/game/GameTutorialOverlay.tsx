'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, HelpCircle } from 'lucide-react'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

const TUTORIAL_KEY = 'iruda_tutorial_seen'

const HELP_ITEMS = [
  '지문을 읽고 핵심 논거를 파악하세요',
  '카드를 순서대로 슬롯에 배치하세요',
  '슬롯 사이 연결 강도를 참고하세요',
  '모든 슬롯을 채우고 제출 버튼을 누르세요',
]

interface Props {
  forceOpen?: boolean
  onClose?: () => void
}

export default function GameTutorialOverlay({ forceOpen, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (forceOpen) {
      setVisible(true)
    }
  }, [forceOpen])

  useEffect(() => {
    if (!visible) return
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  })

  function dismiss() {
    try {
      localStorage.setItem(TUTORIAL_KEY, 'true')
    } catch {
      // localStorage unavailable
    }
    setVisible(false)
    onClose?.()
  }

  const trapRef = useFocusTrap<HTMLDivElement>(visible)

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduced ? undefined : { opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) dismiss()
        }}
      >
        <motion.div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label="게임 도움말"
          initial={reduced ? false : { opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, scale: 0.95, y: 12 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-xs border-2 border-exam-ink bg-white p-5 shadow-lg"
        >
          {/* Close button */}
          <button
            onClick={dismiss}
            aria-label="도움말 닫기"
            className="absolute top-2 right-2 p-2.5 text-stone-400 hover:text-exam-ink transition-colors"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="problem-number-sm font-exam-serif">
              <HelpCircle size={14} className="text-exam-ink" />
            </div>
            <h3 className="text-sm font-bold text-exam-ink font-exam-serif">게임 방법</h3>
          </div>

          {/* Bullet points */}
          <ol className="space-y-2.5">
            {HELP_ITEMS.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-[10px] font-bold text-exam-ink bg-stone-100 w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-xs text-stone-600 leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            className="mt-5 w-full py-2 border-2 border-exam-ink bg-exam-ink text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
          >
            확인
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
