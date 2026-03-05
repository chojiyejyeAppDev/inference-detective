'use client'

import { useState } from 'react'
import { Share2, Twitter, Copy, Check, MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ShareResultButtonProps {
  level: number
  accuracy: number
  isCorrect: boolean
  levelUp: boolean
  slots: number
}

function buildShareText({
  level,
  accuracy,
  isCorrect,
  levelUp,
  slots,
}: ShareResultButtonProps): string {
  const pct = Math.round(accuracy * 100)
  const emoji = isCorrect ? '🎯' : '🧩'
  const lvlEmoji = levelUp ? '🎉 레벨업!' : ''

  return [
    `${emoji} 이:르다 Lv.${level} — ${slots}단계 추론`,
    `정확도 ${pct}% ${isCorrect ? '정답!' : '도전 중!'}`,
    lvlEmoji,
    '',
    '수능 비문학 추론 훈련, 매일 5문제 무료!',
    'https://inference-detective.vercel.app',
  ]
    .filter(Boolean)
    .join('\n')
}

export default function ShareResultButton(props: ShareResultButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareText = buildShareText(props)
  const appUrl = 'https://inference-detective.vercel.app'
  const pct = Math.round(props.accuracy * 100)
  const title = `이:르다 Lv.${props.level} — 정확도 ${pct}%`

  function shareTwitter() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400')
    setIsOpen(false)
  }

  function shareKakao() {
    // 카카오톡 공유 — 모바일에서 카카오톡 앱으로 연결
    const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(shareText)}`
    window.open(kakaoUrl, '_blank', 'noopener,noreferrer,width=600,height=400')
    setIsOpen(false)
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = shareText
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    setIsOpen(false)
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: appUrl,
        })
        setIsOpen(false)
        return
      } catch {
        // User cancelled or error — fall through to menu
      }
    }
    setIsOpen((prev) => !prev)
  }

  return (
    <div className="relative">
      <button
        onClick={handleNativeShare}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 text-xs hover:border-slate-500 hover:text-slate-300 transition-colors"
      >
        <Share2 size={12} />
        공유
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 w-44 rounded-xl border border-slate-700 bg-slate-800 shadow-xl shadow-black/40 overflow-hidden z-50"
          >
            <button
              onClick={shareTwitter}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700/60 transition-colors"
            >
              <Twitter size={13} className="text-sky-400" />
              X (Twitter)에 공유
            </button>
            <button
              onClick={shareKakao}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700/60 transition-colors"
            >
              <MessageCircle size={13} className="text-yellow-400" />
              카카오스토리에 공유
            </button>
            <div className="h-px bg-slate-700/60" />
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700/60 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  복사됨!
                </>
              ) : (
                <>
                  <Copy size={13} className="text-slate-400" />
                  텍스트 복사
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
