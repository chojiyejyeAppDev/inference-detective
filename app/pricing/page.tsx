'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, type Variants } from 'framer-motion'
import { Check, Zap, BookOpen, BarChart3, ArrowLeft } from 'lucide-react'
import { PLANS } from '@/lib/payment/toss'

const PLAN_FEATURES = {
  monthly: {
    label: '월간 구독',
    price: '9,900',
    period: '/ 월',
    badge: null,
    popular: true,
  },
  yearly: {
    label: '연간 구독',
    price: '79,200',
    period: '/ 년',
    badge: '33% 절약',
    popular: false,
  },
  student: {
    label: '학생 할인',
    price: '6,900',
    period: '/ 월',
    badge: '학생 전용',
    popular: false,
  },
}

const PREMIUM_FEATURES = [
  { icon: Zap,       text: '하루 무제한 문제 풀기' },
  { icon: BookOpen,  text: '모든 레벨 전체 힌트 이용' },
  { icon: BarChart3, text: '오답 분석 + 성장 대시보드' },
  { icon: Check,     text: '친구 초대 보너스 무제한' },
]

const FREE_FEATURES  = ['하루 5문제', '레벨 1-7 도전']
const FREE_DISABLED  = ['성장 대시보드', '전체 힌트']

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function PricingPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLANS>('monthly')
  const [loading, setLoading] = useState(false)

  async function handleSubscribe() {
    setLoading(true)
    try {
      const { loadTossPayments } = await import('@tosspayments/payment-sdk')
      const tossPayments = await loadTossPayments(
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
      )
      const customerKey = `user_${Date.now()}`
      await tossPayments.requestBillingAuth('카드', {
        customerKey,
        successUrl: `${window.location.origin}/api/payment/subscribe?plan=${selectedPlan}&customerKey=${customerKey}`,
        failUrl: `${window.location.origin}/pricing?error=billing_auth_failed`,
      })
    } catch (err) {
      console.error('결제 오류:', err)
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#0C1628] px-6 py-12 overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-dot-grid opacity-40 pointer-events-none" />
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(251,191,36,0.07) 0%, transparent 70%)' }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative max-w-2xl mx-auto"
      >
        {/* Back button */}
        <motion.button
          variants={item}
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          돌아가기
        </motion.button>

        {/* Header */}
        <motion.div variants={item} className="text-center mb-12">
          <p className="text-xs font-bold text-amber-500 uppercase tracking-[0.15em] mb-3">Pricing</p>
          <h1 className="text-4xl font-black text-white tracking-tight mb-3">구독 플랜</h1>
          <p className="text-slate-400 text-base">
            무료로 하루 5문제, 구독하면{' '}
            <span className="text-amber-400 font-bold">무제한</span>으로
          </p>
        </motion.div>

        {/* Free vs Pro */}
        <motion.div variants={item} className="grid grid-cols-2 gap-4 mb-8">
          {/* Free */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">무료</p>
            <ul className="space-y-2.5 text-sm">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-slate-400">
                  <span className="text-slate-600 text-xs">✓</span> {f}
                </li>
              ))}
              {FREE_DISABLED.map((f) => (
                <li key={f} className="flex items-center gap-2 text-slate-700 line-through">
                  <span className="text-xs">✗</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Premium */}
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.06] p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-4">프리미엄</p>
            <ul className="space-y-2.5">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f.text} className="flex items-center gap-2 text-sm text-slate-300">
                  <f.icon size={12} className="text-amber-400 shrink-0" />
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Plan selector */}
        <motion.div
          variants={item}
          className="rounded-2xl border border-white/[0.08] bg-[#111C30]/60 p-6 mb-5"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5">플랜 선택</p>

          <div className="space-y-3">
            {(Object.keys(PLAN_FEATURES) as Array<keyof typeof PLAN_FEATURES>).map((key) => {
              const plan = PLAN_FEATURES[key]
              const isSelected = selectedPlan === key
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  className={[
                    'w-full flex items-center justify-between rounded-xl border px-4 py-3.5 transition-all duration-200 text-left relative overflow-hidden',
                    isSelected
                      ? 'border-amber-500/60 bg-amber-500/[0.08]'
                      : 'border-white/[0.07] hover:border-white/[0.13] hover:bg-white/[0.03]',
                  ].join(' ')}
                >
                  {isSelected && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                  )}
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                        isSelected ? 'border-amber-500' : 'border-slate-600',
                      ].join(' ')}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-200">{plan.label}</p>
                        {plan.popular && (
                          <span className="text-[10px] font-black text-slate-900 bg-amber-400 px-1.5 py-0.5 rounded-full leading-none">
                            인기
                          </span>
                        )}
                      </div>
                      {plan.badge && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-white">₩{plan.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{plan.period}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div variants={item}>
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="animate-cta-glow w-full py-4 rounded-2xl bg-amber-500 text-slate-900 font-black text-base hover:bg-amber-400 transition-colors disabled:opacity-50 shadow-xl shadow-amber-500/25"
          >
            {loading ? '결제 페이지 이동 중...' : '카드 등록하고 구독 시작'}
          </button>

          <p className="text-center text-xs text-slate-600 mt-4">
            언제든지 해지 가능 · 해지 후 만료일까지 서비스 이용 가능
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
