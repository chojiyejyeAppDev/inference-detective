'use client'

import { useState } from 'react'
import { Copy, Check, Gift, Lightbulb, Users } from 'lucide-react'

interface InviteSectionProps {
  inviteCode: string
  appUrl: string
  isPremium?: boolean
}

export default function InviteSection({ inviteCode, appUrl, isPremium }: InviteSectionProps) {
  const link = `${appUrl}/signup?ref=${inviteCode}`
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-6 border border-exam-rule bg-white p-5">
      <div className="flex items-center gap-2 mb-2">
        <Users size={14} className="text-exam-ink" />
        <h3 className="text-sm font-exam-serif font-semibold text-exam-ink">친구 초대하기</h3>
      </div>

      {isPremium ? (
        <div className="flex items-start gap-3 mb-3 border border-exam-rule bg-bg-base px-3 py-2.5">
          <Gift size={14} className="text-exam-ink mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="text-exam-ink font-semibold">프리미엄 초대 보너스</p>
            <div className="flex items-center gap-3 mt-1 text-stone-500">
              <span className="flex items-center gap-1">
                <Lightbulb size={10} className="text-exam-ink" />
                나: 힌트 +5포인트
              </span>
              <span>친구: +2문제 보너스</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-stone-500 mb-3">
          친구가 가입하면 둘 다 하루 +2문제 보너스!
        </p>
      )}

      <div className="flex items-center gap-2">
        <code className="flex-1 border border-exam-rule bg-bg-base px-3 py-2 text-xs text-exam-ink truncate font-mono">
          {link}
        </code>
        <button
          onClick={copyLink}
          className="px-3 py-2 border border-exam-rule text-exam-ink text-xs hover:bg-bg-base transition-colors shrink-0 flex items-center gap-1"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-700" />
              복사됨
            </>
          ) : (
            <>
              <Copy size={12} />
              복사
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-stone-400 mt-2">
        내 초대 코드: <span className="text-exam-ink font-mono">{inviteCode}</span>
      </p>
    </div>
  )
}
