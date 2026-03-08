'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, type Variants } from 'framer-motion'
import { Check, Zap, BookOpen, BarChart3, ArrowLeft, Loader2, CreditCard, ShieldCheck, X, Smartphone } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PLANS, type PlanKey } from '@/lib/payment/portone'
import {
  PAYMENT_CHANNELS,
  PAYMENT_METHOD_ORDER,
  DEFAULT_PAYMENT_METHOD,
  type PaymentMethodKey,
} from '@/lib/payment/channels'
import { createClient } from '@/lib/supabase/client'

const PLAN_FEATURES: Record<PlanKey, {
  label: string
  price: string
  period: string
  badge: string | null
  popular: boolean
  description: string
}> = {
  monthly: {
    label: '월간 구독',
    price: '9,900',
    period: '/ 월',
    badge: null,
    popular: true,
    description: '매월 자동 갱신',
  },
  weekly: {
    label: '일주일 이용권',
    price: '3,900',
    period: '/ 7일',
    badge: '체험',
    popular: false,
    description: '자동 갱신 없음',
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
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('monthly')
  const [loading, setLoading] = useState(false)
  const [paymentStep, setPaymentStep] = useState<'idle' | 'card' | 'processing' | 'done'>('idle')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [currentSubscription, setCurrentSubscription] = useState<{
    status: string
    expiresAt: string | null
  } | null>(null)

  const [cancelLoading, setCancelLoading] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState<string | null>(null)
  const [cancelStep, setCancelStep] = useState<'reason' | 'offer' | 'confirm'>('reason')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodKey>(DEFAULT_PAYMENT_METHOD)
  const activeChannel = PAYMENT_CHANNELS[selectedMethod]
  const planInfo = PLANS[selectedPlan]
  const isSubscription = planInfo.type === 'subscription'
  const isAlreadySubscribed = currentSubscription?.status === 'active'

  // 구독 플랜 선택 시 빌링키 미지원 PG가 선택되어 있으면 기본값으로 리셋
  useEffect(() => {
    const ch = PAYMENT_CHANNELS[selectedMethod]
    if (isSubscription && !ch.supportsBillingKey) {
      setSelectedMethod(DEFAULT_PAYMENT_METHOD)
    }
  }, [selectedPlan, selectedMethod, isSubscription])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null)
        setUserId(user.id)
        supabase
          .from('profiles')
          .select('nickname, subscription_status, subscription_expires_at')
          .eq('id', user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.nickname) setUserName(profile.nickname)
            if (profile) {
              setCurrentSubscription({
                status: profile.subscription_status,
                expiresAt: profile.subscription_expires_at,
              })
            }
          })
      }
    })
  }, [])

  const CANCEL_REASONS = [
    { key: 'too_expensive', label: '가격이 부담돼요' },
    { key: 'not_enough_content', label: '문제가 부족해요' },
    { key: 'no_time', label: '시간이 없어요' },
    { key: 'not_helpful', label: '학습에 도움이 안 돼요' },
    { key: 'other', label: '기타' },
  ]

  function openCancelModal() {
    setCancelReason(null)
    setCancelStep('reason')
    setShowCancelModal(true)
  }

  function closeCancelModal() {
    setShowCancelModal(false)
  }

  async function executeCancelSubscription() {
    setCancelLoading(true)
    try {
      const res = await fetch('/api/payment/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? '취소 처리 실패')
      }
      const data = await res.json()
      toast.success(data.message)
      setCurrentSubscription((prev) =>
        prev ? { ...prev, status: 'cancelled' } : prev,
      )
      closeCancelModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '구독 취소 중 오류가 발생했어요.')
    } finally {
      setCancelLoading(false)
    }
  }

  async function handlePayment() {
    if (!userEmail || !userId) {
      router.push('/login?redirect=/pricing')
      return
    }

    setLoading(true)
    setPaymentStep('card')
    try {
      const PortOne = await import('@portone/browser-sdk/v2')

      if (isSubscription) {
        // ── 빌링키 플로우 (월간 구독) ──
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
        if (activeChannel.requiresPhone && (!cleanPhone || cleanPhone.length < 10)) {
          toast.error('휴대폰 번호를 정확히 입력해주세요.')
          setLoading(false)
          setPaymentStep('idle')
          return
        }

        const response = await PortOne.requestIssueBillingKey({
          storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
          channelKey: activeChannel.channelKey,
          billingKeyMethod: activeChannel.billingKeyMethod,
          issueId: `issue_${Date.now()}`,
          issueName: planInfo.name,
          customer: {
            customerId: userId,
            fullName: userName || '이용자',
            email: userEmail,
            ...(activeChannel.requiresPhone && cleanPhone
              ? { phoneNumber: cleanPhone }
              : {}),
          },
        })

        if (!response || response.code != null) {
          toast.error('카드 등록에 실패했어요. 다시 시도해주세요.')
          setLoading(false)
          setPaymentStep('idle')
          return
        }

        setPaymentStep('processing')
        const res = await fetch('/api/payment/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            billingKey: response.billingKey,
            plan: selectedPlan,
            paymentMethod: selectedMethod,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? '결제 처리 실패')
        }
      } else {
        // ── 일회성 결제 플로우 (주간 이용권) ──
        const paymentId = `payment_${userId}_${Date.now()}`

        const response = await PortOne.requestPayment({
          storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
          channelKey: activeChannel.onetimeChannelKey || activeChannel.channelKey,
          paymentId,
          orderName: planInfo.name,
          totalAmount: planInfo.amount,
          currency: 'CURRENCY_KRW',
          payMethod: activeChannel.payMethod,
          customer: {
            customerId: userId,
            fullName: userName || '이용자',
            email: userEmail,
          },
        })

        if (!response || response.code != null) {
          toast.error('결제에 실패했어요. 다시 시도해주세요.')
          setLoading(false)
          setPaymentStep('idle')
          return
        }

        setPaymentStep('processing')
        const res = await fetch('/api/payment/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId,
            plan: selectedPlan,
            paymentMethod: selectedMethod,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? '결제 처리 실패')
        }
      }

      setPaymentStep('done')
      toast.success('구독이 완료되었어요!')
      setTimeout(() => {
        router.push(`/subscription-complete?plan=${selectedPlan}`)
        router.refresh()
      }, 800)
    } catch (err) {
      toast.error('결제 처리 중 오류가 발생했어요.')
      setLoading(false)
      setPaymentStep('idle')
    }
  }

  return (
    <div className="relative min-h-screen bg-bg-base px-4 sm:px-6 py-10 sm:py-12 overflow-hidden">
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
          <h1 className="text-4xl font-black text-white tracking-tight mb-3">프리미엄 플랜</h1>
          <p className="text-slate-400 text-base">
            무료로 하루 5문제, 프리미엄이면{' '}
            <span className="text-amber-400 font-bold">무제한</span>으로
          </p>
        </motion.div>

        {/* Free vs Pro */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Free */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">무료</p>
            <ul className="space-y-2.5 text-sm">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-slate-400">
                  <span className="text-slate-500 text-xs">✓</span> {f}
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
          className="rounded-2xl border border-white/[0.08] bg-bg-surface/60 p-6 mb-5"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5">플랜 선택</p>

          <div className="space-y-3">
            {(Object.keys(PLAN_FEATURES) as PlanKey[]).map((key) => {
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
                      <div className="flex items-center gap-2 mt-0.5">
                        {plan.badge && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full">
                            {plan.badge}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">{plan.description}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-white tabular-nums">₩{plan.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{plan.period}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* 결제 수단 선택 */}
        <motion.div
          variants={item}
          className="rounded-2xl border border-white/[0.08] bg-bg-surface/60 p-6 mb-5"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5">결제 수단</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PAYMENT_METHOD_ORDER.map((key) => {
              const ch = PAYMENT_CHANNELS[key]
              const isSelected = selectedMethod === key
              const disabled = isSubscription && !ch.supportsBillingKey
              return (
                <button
                  key={key}
                  onClick={() => !disabled && setSelectedMethod(key)}
                  disabled={disabled}
                  className={[
                    'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3.5 transition-all duration-200 relative overflow-hidden',
                    disabled
                      ? 'border-white/[0.04] opacity-40 cursor-not-allowed'
                      : isSelected
                        ? 'border-amber-500/60 bg-amber-500/[0.08]'
                        : 'border-white/[0.07] hover:border-white/[0.13] hover:bg-white/[0.03]',
                  ].join(' ')}
                >
                  {isSelected && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                  )}
                  {key === 'kakaopay' ? (
                    <Smartphone size={18} className={isSelected ? 'text-amber-400' : 'text-slate-500'} />
                  ) : (
                    <CreditCard size={18} className={isSelected ? 'text-amber-400' : 'text-slate-500'} />
                  )}
                  <p className={['text-xs font-bold', isSelected ? 'text-slate-200' : 'text-slate-400'].join(' ')}>
                    {ch.label}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {disabled ? '일회성 결제만' : ch.description}
                  </p>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* 서비스 제공 기간 안내 (PG 심사 필수 항목) */}
        <motion.div
          variants={item}
          className="rounded-2xl border border-white/[0.08] bg-bg-surface/60 p-5 mb-5"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">서비스 제공 기간</p>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
              <div>
                <p className="font-semibold text-slate-200">월간 구독 (₩9,900/월)</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  결제일로부터 1개월(30일) 이용 후 자동 갱신
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <div>
                <p className="font-semibold text-slate-200">일주일 이용권 (₩3,900)</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  결제일로부터 7일간 서비스 제공 / 자동 갱신 없음 (일회성 결제)
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 결제 정보 입력 + 버튼 */}
        <motion.div variants={item}>
          {/* 전화번호: 구독 + 전화번호 필요한 PG일 때만 표시 */}
          {isSubscription && activeChannel.requiresPhone && (
            <div className="mb-4">
              <label htmlFor="phoneNumber" className="block text-xs text-slate-500 mb-1.5">
                휴대폰 번호 <span className="text-amber-500">*</span>
              </label>
              <input
                id="phoneNumber"
                type="tel"
                placeholder="01012345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>
          )}

          {isAlreadySubscribed ? (
            <div className="w-full py-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-center">
              <p className="text-emerald-400 font-bold text-sm">현재 구독 중이에요</p>
              {currentSubscription?.expiresAt && (
                <p className="text-emerald-400/70 text-xs mt-1">
                  만료일: {new Date(currentSubscription.expiresAt).toLocaleDateString('ko-KR')}
                </p>
              )}
              <button
                onClick={openCancelModal}
                className="mt-3 text-xs text-slate-500 hover:text-red-400 transition-colors underline underline-offset-2"
              >
                구독 취소
              </button>
            </div>
          ) : (
            <button
              onClick={handlePayment}
              disabled={loading}
              className="animate-cta-glow w-full py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 shadow-lg shadow-amber-500/25"
            >
              {loading
                ? '결제 진행 중...'
                : isSubscription
                  ? selectedMethod === 'kakaopay'
                    ? '카카오페이로 구독 시작'
                    : '카드 등록하고 구독 시작'
                  : selectedMethod === 'kakaopay'
                    ? '카카오페이로 결제하기'
                    : '결제하기'
              }
            </button>
          )}

          <p className="text-center text-xs text-slate-500 mt-4">
            {isSubscription
              ? '언제든지 해지 가능 · 해지 후 만료일까지 서비스 이용 가능'
              : `${planInfo.days}일 이용권 · 자동 갱신 없음`
            }
          </p>
          <p className="text-center text-[11px] text-slate-700 mt-2 space-x-3">
            <Link href="/terms" className="hover:text-slate-400 underline transition-colors">이용약관</Link>
            <Link href="/refund" className="hover:text-slate-400 underline transition-colors">환불규정</Link>
            <Link href="/privacy" className="hover:text-slate-400 underline transition-colors">개인정보처리방침</Link>
          </p>
        </motion.div>
      </motion.div>

      {/* Cancel subscription modal */}
      {showCancelModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeCancelModal() }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl relative"
          >
            {/* Close button */}
            <button
              onClick={closeCancelModal}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={18} />
            </button>

            {cancelStep === 'reason' && (
              <>
                <h3 className="text-lg font-bold text-white mb-1">구독을 취소하시겠어요?</h3>
                <p className="text-xs text-slate-400 mb-5">
                  더 나은 서비스를 위해 이유를 알려주세요.
                </p>
                <div className="space-y-2 mb-5">
                  {CANCEL_REASONS.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setCancelReason(r.key)}
                      className={[
                        'w-full text-left px-4 py-3 rounded-xl border text-sm transition-all',
                        cancelReason === r.key
                          ? 'border-amber-500/50 bg-amber-500/10 text-slate-200'
                          : 'border-slate-700 hover:border-slate-600 text-slate-400',
                      ].join(' ')}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (!cancelReason) {
                      toast.error('취소 이유를 선택해주세요.')
                      return
                    }
                    setCancelStep('offer')
                  }}
                  className="w-full py-3 rounded-xl bg-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-600 transition-colors"
                >
                  다음
                </button>
              </>
            )}

            {cancelStep === 'offer' && (
              <>
                <h3 className="text-lg font-bold text-white mb-1">잠깐만요!</h3>
                <p className="text-xs text-slate-400 mb-5">
                  {cancelReason === 'too_expensive'
                    ? '일주일 이용권(₩3,900)으로 부담 없이 계속해보세요.'
                    : cancelReason === 'no_time'
                      ? '하루 5분이면 충분해요. 짧은 시간 꾸준히 풀어보세요.'
                      : cancelReason === 'not_enough_content'
                        ? '매주 새로운 문제가 추가되고 있어요!'
                        : '취소 전에 이것만 확인해주세요.'}
                </p>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4">
                  <p className="text-amber-300 font-semibold text-sm mb-2">지금 유지하면</p>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    <li className="flex items-center gap-2">
                      <Check size={12} className="text-amber-400 shrink-0" />
                      무제한 문제 + 전체 힌트
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={12} className="text-amber-400 shrink-0" />
                      성장 대시보드 & 오답 분석
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={12} className="text-amber-400 shrink-0" />
                      레벨업 진행 상황 유지
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      closeCancelModal()
                      toast.success('좋은 선택이에요! 계속 함께해요.')
                    }}
                    className="w-full py-3 rounded-xl bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors"
                  >
                    구독 유지하기
                  </button>
                  <button
                    onClick={() => setCancelStep('confirm')}
                    className="w-full py-3 rounded-xl text-slate-500 text-sm hover:text-slate-400 transition-colors"
                  >
                    그래도 취소할게요
                  </button>
                </div>
              </>
            )}

            {cancelStep === 'confirm' && (
              <>
                <h3 className="text-lg font-bold text-white mb-1">정말 취소하시겠어요?</h3>
                <p className="text-xs text-slate-400 mb-5">
                  만료일까지는 프리미엄 기능을 계속 이용할 수 있어요.
                  {currentSubscription?.expiresAt && (
                    <span className="block mt-1 text-slate-500">
                      만료일: {new Date(currentSubscription.expiresAt).toLocaleDateString('ko-KR')}
                    </span>
                  )}
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      closeCancelModal()
                      toast.success('감사합니다! 계속 함께해요.')
                    }}
                    className="w-full py-3 rounded-xl bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors"
                  >
                    역시 유지할게요
                  </button>
                  <button
                    onClick={executeCancelSubscription}
                    disabled={cancelLoading}
                    className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {cancelLoading ? '처리 중...' : '구독 취소하기'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Payment processing overlay */}
      {paymentStep !== 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xs rounded-2xl border border-slate-700 bg-slate-800 p-6 text-center shadow-2xl"
          >
            {paymentStep === 'card' && (
              selectedMethod === 'kakaopay' ? (
                <>
                  <Smartphone size={28} className="text-amber-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-white mb-1">카카오페이 결제 중</p>
                  <p className="text-xs text-slate-400">카카오페이에서 결제를 진행해주세요</p>
                </>
              ) : (
                <>
                  <CreditCard size={28} className="text-amber-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-white mb-1">카드 정보 입력 중</p>
                  <p className="text-xs text-slate-400">결제창에서 카드 정보를 입력해주세요</p>
                </>
              )
            )}
            {paymentStep === 'processing' && (
              <>
                <Loader2 size={28} className="text-amber-400 mx-auto mb-3 animate-spin" />
                <p className="text-sm font-semibold text-white mb-1">결제 처리 중</p>
                <p className="text-xs text-slate-400">잠시만 기다려주세요...</p>
              </>
            )}
            {paymentStep === 'done' && (
              <>
                <ShieldCheck size={28} className="text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-white mb-1">결제 완료!</p>
                <p className="text-xs text-slate-400">곧 이동합니다...</p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
