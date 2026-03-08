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
    <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800/50 p-5 card-elevated">
      <div className="flex items-center gap-2 mb-2">
        <Users size={14} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-slate-300">친구 초대하기</h3>
      </div>

      {isPremium ? (
        <div className="flex items-start gap-3 mb-3 rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2.5">
          <Gift size={14} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="text-amber-300 font-semibold">프리미엄 초대 보너스</p>
            <div className="flex items-center gap-3 mt-1 text-slate-400">
              <span className="flex items-center gap-1">
                <Lightbulb size={10} className="text-amber-400" />
                나: 힌트 +5포인트
              </span>
              <span>친구: +2문제 보너스</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 mb-3">
          친구가 가입하면 둘 다 하루 +2문제 보너스!
        </p>
      )}

      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-amber-400 truncate">
          {link}
        </code>
        <button
          onClick={copyLink}
          className="px-3 py-2 rounded-lg bg-slate-700 text-slate-300 text-xs hover:bg-slate-600 transition-colors shrink-0 flex items-center gap-1"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
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
      <p className="text-xs text-slate-500 mt-2">
        내 초대 코드: <span className="text-slate-400 font-mono">{inviteCode}</span>
      </p>
    </div>
  )
}
