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
    primary: true,
  },
  {
    icon: BarChart3,
    title: '약점 분석 확인',
    desc: '대시보드에서 정확도 추이와 오류 패턴을 확인하세요',
    href: '/dashboard',
    primary: false,
  },
  {
    icon: BookOpen,
    title: '오답 복습',
    desc: '이전에 틀렸던 문제를 다시 풀어보세요',
    href: '/review',
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

function getPersonalizedTip(level: number): string | null {
  if (level <= 2) return '현재 기초 단계예요. 매일 꾸준히 풀면 빠르게 레벨업할 수 있어요!'
  if (level <= 4) return '중급 단계에 도달했어요. 대시보드에서 약점 주제를 확인해보세요.'
  if (level <= 6) return '고급 단계까지 올라왔어요! 힌트 없이 도전하는 연습을 시작해보세요.'
  return '최고 레벨이에요! 모든 주제를 고르게 연습해서 실전에 대비하세요.'
}

function SubscriptionCompleteContent() {
  const searchParams = useSearchParams()
  const planKey = searchParams.get('plan') ?? 'monthly'
  const plan = PLAN_INFO[planKey] ?? PLAN_INFO.monthly
  const level = parseInt(searchParams.get('level') ?? '0') || 0
  const tip = level > 0 ? getPersonalizedTip(level) : null

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4 py-12">
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
          className="w-20 h-20 border-2 border-exam-ink flex items-center justify-center mx-auto mb-6"
        >
          <PartyPopper size={36} className="text-exam-ink" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="font-exam-serif text-2xl font-black text-exam-ink mb-2"
        >
          프리미엄 시작!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-stone-500 text-sm mb-6"
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
          className="border border-exam-rule bg-white p-4 mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown size={14} className="text-exam-red" />
            <span className="text-sm font-bold text-exam-ink">{plan.name}</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-stone-500">
            <span>결제 금액: <span className="text-exam-ink font-semibold">{plan.price}</span></span>
            <span className="text-stone-300">|</span>
            <span>이용 기간: <span className="text-exam-ink font-semibold">{plan.period}</span></span>
          </div>
        </motion.div>

        {/* Personalized tip */}
        {tip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.48 }}
            className="border border-exam-rule bg-exam-highlight px-4 py-3 mb-6 text-left"
          >
            <p className="text-xs text-stone-700">
              <span className="text-exam-red font-semibold">Lv.{level}</span> — {tip}
            </p>
          </motion.div>
        )}

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
                  'flex items-center gap-4 border p-4 text-left transition-all group',
                  step.primary
                    ? 'border-exam-ink bg-exam-highlight hover:bg-red-50'
                    : 'border-exam-rule bg-white hover:border-stone-400',
                ].join(' ')}
              >
                <div className={[
                  'w-10 h-10 flex items-center justify-center shrink-0 border',
                  step.primary ? 'border-exam-ink bg-white' : 'border-exam-rule bg-bg-base',
                ].join(' ')}>
                  <step.icon size={18} className={step.primary ? 'text-exam-red' : 'text-stone-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-exam-ink">{step.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{step.desc}</p>
                </div>
                <ArrowRight
                  size={14}
                  className="text-stone-400 group-hover:text-exam-ink transition-colors shrink-0"
                />
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
