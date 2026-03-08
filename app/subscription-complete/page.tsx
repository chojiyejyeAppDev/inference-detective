'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { PartyPopper, Zap, BarChart3, BookOpen, ArrowRight, Crown } from 'lucide-react'

const PLAN_INFO: Record<string, { name: string; price: string; period: string }> = {
  monthly: { name: '월간 구독', price: '9,900원', period: '30일' },
  weekly: { name: '일주일 이용권', price: '3,900원', period: '7일' },
}

const NEXT_STEPS = [
  {
    icon: Zap,
    title: '무제한 문제 풀기',
    desc: '일일 제한 없이 원하는 만큼 추론 훈련하세요',
    href: '/levels',
    cta: '문제 풀기',
    primary: true,
  },
  {
    icon: BarChart3,
    title: '약점 분석 확인',
    desc: '대시보드에서 정확도 추이와 오류 패턴을 확인하세요',
    href: '/dashboard',
    cta: '대시보드',
    primary: false,
  },
  {
    icon: BookOpen,
    title: '오답 복습',
    desc: '이전에 틀렸던 문제를 다시 풀어보세요',
    href: '/review',
    cta: '오답 노트',
    primary: false,
  },
]

export default function SubscriptionCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-base" />}>
      <SubscriptionCompleteContent />
    </Suspense>
  )
}

function SubscriptionCompleteContent() {
  const searchParams = useSearchParams()
  const planKey = searchParams.get('plan') ?? 'monthly'
  const plan = PLAN_INFO[planKey] ?? PLAN_INFO.monthly

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 bg-dot-grid opacity-40 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md text-center"
      >
        {/* Celebration icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2, duration: 0.6 }}
          className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-6"
        >
          <PartyPopper size={36} className="text-amber-400" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-black text-white mb-2"
        >
          프리미엄 시작!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-slate-400 text-sm mb-6"
        >
          이제 무제한으로 추론 실력을 키울 수 있어요.
          <br />
          어디서부터 시작할까요?
        </motion.p>

        {/* Plan summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown size={14} className="text-amber-400" />
            <span className="text-sm font-bold text-amber-300">{plan.name}</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <span>결제 금액: <span className="text-white font-semibold">{plan.price}</span></span>
            <span className="text-slate-500">|</span>
            <span>이용 기간: <span className="text-white font-semibold">{plan.period}</span></span>
          </div>
        </motion.div>

        {/* Next steps */}
        <div className="space-y-3 mb-6">
          {NEXT_STEPS.map((step, i) => (
            <motion.div
              key={step.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <Link
                href={step.href}
                className={[
                  'flex items-center gap-4 rounded-2xl border p-4 text-left transition-all group',
                  step.primary
                    ? 'border-amber-500/40 bg-amber-500/[0.08] hover:bg-amber-500/[0.12]'
                    : 'border-slate-700 bg-slate-800/40 hover:border-slate-600',
                ].join(' ')}
              >
                <div className={[
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  step.primary ? 'bg-amber-500/20' : 'bg-slate-700/60',
                ].join(' ')}>
                  <step.icon size={18} className={step.primary ? 'text-amber-400' : 'text-slate-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{step.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                </div>
                <ArrowRight
                  size={14}
                  className="text-slate-500 group-hover:text-slate-400 transition-colors shrink-0"
                />
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
