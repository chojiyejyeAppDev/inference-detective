'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

const STEPS_KEY = 'tutorial_steps_seen'
const LEGACY_KEY = 'iruda_tutorial_seen'

export type HintStepId = 'step_read' | 'step_drag' | 'step_connection' | 'step_submit'

interface ContextualHintProps {
  stepId: HintStepId
  message: string
  autoDismissMs?: number
  /** Called when this hint is dismissed (by user or auto) */
  onDismiss?: () => void
}

function getSeenSteps(): Set<string> {
  try {
    // Legacy key — if user already saw the full tutorial, skip everything
    if (localStorage.getItem(LEGACY_KEY)) {
      return new Set(['step_read', 'step_drag', 'step_connection', 'step_submit'])
    }
    const raw = localStorage.getItem(STEPS_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {
    // localStorage unavailable
  }
  return new Set()
}

function markStepSeen(stepId: string): void {
  try {
    const seen = getSeenSteps()
    seen.add(stepId)
    localStorage.setItem(STEPS_KEY, JSON.stringify([...seen]))
  } catch {
    // localStorage unavailable
  }
}

export function hasStepBeenSeen(stepId: HintStepId): boolean {
  return getSeenSteps().has(stepId)
}

export default function ContextualHint({ stepId, message, autoDismissMs, onDismiss }: ContextualHintProps) {
  const [visible, setVisible] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!hasStepBeenSeen(stepId)) {
      setVisible(true)
    }
  }, [stepId])

  const dismiss = useCallback(() => {
    markStepSeen(stepId)
    setVisible(false)
    onDismiss?.()
  }, [stepId, onDismiss])

  // Auto-dismiss timer
  useEffect(() => {
    if (!visible || !autoDismissMs) return
    const timer = setTimeout(dismiss, autoDismissMs)
    return () => clearTimeout(timer)
  }, [visible, autoDismissMs, dismiss])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
          className="flex items-center gap-2 bg-exam-highlight border border-exam-red/20 px-3 py-1.5 rounded-full w-fit"
          role="status"
        >
          <span className="text-xs text-exam-ink leading-snug">{message}</span>
          <button
            onClick={dismiss}
            className="shrink-0 p-0.5 text-stone-400 hover:text-exam-ink transition-colors"
            aria-label="힌트 닫기"
          >
            <X size={12} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
