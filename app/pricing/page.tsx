'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, Zap, BookOpen, BarChart3 } from 'lucide-react'
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

const FEATURES = [
  { icon: Zap, text: '하루 무제한 문제 풀기' },
  { icon: BookOpen, text: '모든 레벨 전체 힌트 이용' },
  { icon: BarChart3, text: '오답 분석 + 성장 대시보드' },
  { icon: Check, text: '친구 초대 보너스 무제한' },
]

export default function PricingPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLANS>('monthly')
  const [loading, setLoading] = useState(false)

  async function handleSubscribe() {
    setLoading(true)

    try {
      // Toss Payments 위젯 로드
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
    <div className="min-h-screen bg-[#0F172A] px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-3">구독 플랜</h1>
          <p className="text-slate-400">
            무료로 하루 5문제, 구독하면 <span className="text-amber-400 font-semibold">무제한</span>으로
          </p>
        </div>

        {/* Free vs Pro comparison */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
            <p className="text-sm font-semibold text-slate-400 mb-3">무료</p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>✓ 하루 5문제</li>
              <li>✓ 레벨 1-3</li>
              <li>✗ 성장 대시보드</li>
              <li>✗ 전체 힌트</li>
            </ul>
          </div>
          <div className="rounded-xl border border-amber-500/50 bg-amber-500/5 p-5">
            <p className="text-sm font-semibold text-amber-400 mb-3">프리미엄</p>
            <ul className="space-y-2 text-sm text-slate-300">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <f.icon size={13} className="text-amber-400 shrink-0" />
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Plan selector */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 mb-6">
          <p className="text-sm font-semibold text-slate-300 mb-4">플랜 선택</p>

          <div className="space-y-3">
            {(Object.keys(PLAN_FEATURES) as Array<keyof typeof PLAN_FEATURES>).map((key) => {
              const plan = PLAN_FEATURES[key]
              const isSelected = selectedPlan === key
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  className={[
                    'w-full flex items-center justify-between rounded-xl border px-4 py-3.5 transition-all text-left',
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-700 hover:border-slate-600',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                        isSelected ? 'border-amber-500' : 'border-slate-600',
                      ].join(' ')}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{plan.label}</p>
                      {plan.badge && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-white">₩{plan.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{plan.period}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {loading ? '결제 페이지 이동 중...' : '카드 등록하고 구독 시작'}
        </button>

        <p className="text-center text-xs text-slate-600 mt-4">
          언제든지 해지 가능 · 해지 후 만료일까지 서비스 이용 가능
        </p>

        <button
          onClick={() => router.back()}
          className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-400 transition-colors"
        >
          돌아가기
        </button>
      </motion.div>
    </div>
  )
}
