'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GripVertical, ArrowDown, MousePointerClick, X, Lightbulb } from 'lucide-react'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

const TUTORIAL_KEY = 'iruda_tutorial_seen'

import { Brain } from 'lucide-react'

const STEPS: { icon: typeof Brain; title: string; desc: string; hasConnectionVisual?: boolean; hasDragDemo?: boolean }[] = [
  {
    icon: Brain,
    title: '왜 추론 조립인가요?',
    desc: '논리 순서를 직접 구성하면 단순 독해보다 사고력이 깊어집니다. 수능 비문학의 핵심은 "논리 흐름 파악"이에요.',
  },
  {
    icon: MousePointerClick,
    title: '지문을 읽고 카드를 확인하세요',
    desc: '왼쪽 지문을 읽은 뒤, 오른쪽 문장 카드 중 결론에 이르는 논거를 파악하세요.',
  },
  {
    icon: GripVertical,
    title: '카드를 슬롯으로 드래그하세요',
    desc: '문장 카드를 길게 누른 채 아래 슬롯으로 끌어다 놓으세요. 모바일에서도 동일해요.',
    hasDragDemo: true,
  },
  {
    icon: ArrowDown,
    title: '연결 강도를 참고하세요',
    desc: '슬롯 사이 표시가 논리 연결 강도를 알려줘요.\n● 강한 연결 — 앞뒤 논리가 자연스러워요\n● 보통 연결 — 순서를 다시 확인해 보세요\n● 약한 연결 — 이 배치는 논리가 맞지 않아요',
    hasConnectionVisual: true,
  },
  {
    icon: Lightbulb,
    title: '힌트 포인트 활용법',
    desc: '막힐 때 힌트 버튼을 눌러보세요.\n매일 +3 포인트 자동 충전, 정답 시 +1 보너스!\n레벨 7에서는 힌트 없이 도전해야 해요.',
  },
  {
    icon: ArrowDown,
    title: '모든 슬롯을 채우고 제출!',
    desc: '문장 카드를 모두 배치한 뒤 "추론 경로 제출" 버튼을 눌러주세요. 정확도와 틀린 부분을 바로 알려드려요.',
  },
]

interface Props {
  forceOpen?: boolean
  onClose?: () => void
}

export default function GameTutorialOverlay({ forceOpen, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (forceOpen) {
      setVisible(true)
      setStep(0)
      return
    }
    try {
      const seen = localStorage.getItem(TUTORIAL_KEY)
      if (!seen) {
        setVisible(true)
      }
    } catch {
      // localStorage unavailable (e.g., Safari private browsing)
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

  function nextStep() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      dismiss()
    }
  }

  const trapRef = useFocusTrap<HTMLDivElement>(visible)

  if (!visible) return null

  const current = STEPS[step]
  const Icon = current.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduced ? undefined : { opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) dismiss()
        }}
      >
        <motion.div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label="게임 튜토리얼"
          initial={reduced ? false : { opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, scale: 0.95, y: 20 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', duration: 0.5 }}
          className="relative w-full max-w-sm border-2 border-exam-ink bg-white p-6 shadow-lg"
        >
          {/* Close button */}
          <button
            onClick={dismiss}
            aria-label="튜토리얼 닫기"
            className="absolute top-2 right-2 p-2.5 text-stone-400 hover:text-exam-ink transition-colors"
          >
            <X size={16} />
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={[
                  'h-0.5 transition-all duration-300',
                  i === step ? 'w-6 bg-exam-ink' : i < step ? 'w-3 bg-stone-400' : 'w-3 bg-stone-200',
                ].join(' ')}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="problem-number mb-4 font-exam-serif">
            <Icon size={20} className="text-exam-ink" />
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduced ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? undefined : { opacity: 0, x: -20 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              <h3 className="text-lg font-bold text-exam-ink mb-1.5 font-exam-serif">{current.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{current.desc}</p>

              {/* Drag demo animation */}
              {current.hasDragDemo && !reduced && (
                <div className="mt-4 relative h-24 bg-bg-base border border-exam-rule overflow-hidden">
                  {/* Slot target */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-36 h-8 border-2 border-dashed border-stone-300 flex items-center justify-center">
                    <span className="text-[10px] text-stone-400">슬롯</span>
                  </div>
                  {/* Animated card */}
                  <motion.div
                    animate={{ y: [0, 40, 40, 0], x: [0, 0, 0, 0], scale: [1, 1.05, 1, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
                    className="absolute top-2 left-1/2 -translate-x-1/2 w-36 h-8 bg-white border border-exam-ink flex items-center justify-center gap-1.5"
                  >
                    <GripVertical size={10} className="text-stone-400" />
                    <span className="text-[10px] text-exam-ink font-medium">문장 카드</span>
                  </motion.div>
                  {/* Cursor hint */}
                  <motion.div
                    animate={{ y: [0, 40, 40, 0], opacity: [1, 1, 0.5, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
                    className="absolute top-5 left-[calc(50%+40px)]"
                  >
                    <MousePointerClick size={14} className="text-exam-ink" />
                  </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={dismiss}
              className="text-xs text-stone-400 hover:text-exam-ink transition-colors"
            >
              건너뛰기
            </button>
            <button
              onClick={nextStep}
              className="px-5 py-2 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors"
            >
              {step < STEPS.length - 1 ? '다음' : '시작하기'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
