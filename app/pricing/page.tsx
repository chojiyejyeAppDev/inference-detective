'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, type Variants } from 'framer-motion'
import { Check, ArrowLeft, Loader2, CreditCard, ShieldCheck, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PLANS, type PlanKey } from '@/lib/payment/portone'
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
  const planInfo = PLANS[selectedPlan]
  const isSubscription = planInfo.type === 'subscription'
  const isAlreadySubscribed = currentSubscription?.status === 'active'

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
    let subscribeLevel: number | undefined
    try {
      const PortOne = await import('@portone/browser-sdk/v2')

      if (isSubscription) {
        // ── 빌링키 플로우 (월간 구독) ──
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
        if (!cleanPhone || cleanPhone.length < 10) {
          toast.error('휴대폰 번호를 정확히 입력해주세요.')
          setLoading(false)
          setPaymentStep('idle')
          return
        }

        const response = await PortOne.requestIssueBillingKey({
          storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
          billingKeyMethod: 'CARD',
          issueId: `issue_${Date.now()}`,
          issueName: planInfo.name,
          customer: {
            customerId: userId,
            fullName: userName || '이용자',
            email: userEmail,
            phoneNumber: cleanPhone,
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
          }),
        })

        const resData = await res.json()
        if (!res.ok) {
          throw new Error(resData.error ?? '결제 처리 실패')
        }
        subscribeLevel = resData.current_level
      } else {
        // ── 일회성 결제 플로우 (주간 이용권) ──
        const paymentId = `payment_${userId}_${Date.now()}`

        const response = await PortOne.requestPayment({
          storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
          paymentId,
          orderName: planInfo.name,
          totalAmount: planInfo.amount,
          currency: 'CURRENCY_KRW',
          payMethod: 'CARD',
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
          }),
        })

        const resData = await res.json()
        if (!res.ok) {
          throw new Error(resData.error ?? '결제 처리 실패')
        }
        subscribeLevel = resData.current_level
      }

      setPaymentStep('done')
      toast.success('구독이 완료되었어요!')
      const levelParam = subscribeLevel ? `&level=${subscribeLevel}` : ''
      setTimeout(() => {
        router.push(`/subscription-complete?plan=${selectedPlan}${levelParam}`)
        router.refresh()
      }, 800)
    } catch (_err) {
      toast.error('결제 처리 중 오류가 발생했어요.')
      setLoading(false)
      setPaymentStep('idle')
    }
  }

  return (
    <div className="relative min-h-screen bg-bg-base px-4 sm:px-6 py-10 sm:py-12 overflow-hidden">
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
          className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-exam-ink transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          돌아가기
        </motion.button>

        {/* Header */}
        <motion.div variants={item} className="text-center mb-12">
          <p className="text-xs font-bold text-exam-red uppercase tracking-[0.15em] mb-3">Pricing</p>
          <h1 className="font-exam-serif text-4xl font-black text-exam-ink tracking-tight mb-3">프리미엄 플랜</h1>
          <p className="text-stone-500 text-base">
            무료로 하루 5문제, 프리미엄이면{' '}
            <span className="text-exam-red font-bold">무제한</span>으로
          </p>
        </motion.div>

        {/* Feature comparison table */}
        <motion.div variants={item} className="border border-exam-rule bg-white overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-exam-rule">
                <th className="text-left px-5 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider">기능</th>
                <th className="px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wider text-center">무료</th>
                <th className="px-4 py-3 text-xs font-bold text-exam-red uppercase tracking-wider text-center">프리미엄</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-exam-rule">
              {[
                { feature: '일일 문제 수', free: '5문제', premium: '무제한' },
                { feature: '레벨 1-7 도전', free: true, premium: true },
                { feature: '힌트 시스템', free: '제한적', premium: '전체 이용' },
                { feature: '성장 대시보드', free: false, premium: true },
                { feature: '오답 분석', free: false, premium: true },
                { feature: '초대 보너스', free: '1회', premium: '무제한' },
              ].map((row) => (
                <tr key={row.feature}>
                  <td className="px-5 py-3 text-exam-ink">{row.feature}</td>
                  <td className="px-4 py-3 text-center">
                    {typeof row.free === 'boolean'
                      ? row.free
                        ? <span className="text-stone-500">O</span>
                        : <span className="text-stone-300">&mdash;</span>
                      : <span className="text-stone-500 text-xs">{row.free}</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {typeof row.premium === 'boolean'
                      ? row.premium
                        ? <span className="text-exam-red">O</span>
                        : <span className="text-stone-300">&mdash;</span>
                      : <span className="text-exam-red text-xs font-semibold">{row.premium}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Plan selector */}
        <motion.div
          variants={item}
          className="border border-exam-rule bg-white p-6 mb-5"
        >
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-5">플랜 선택</p>

          <div className="space-y-3">
            {(Object.keys(PLAN_FEATURES) as PlanKey[]).map((key) => {
              const plan = PLAN_FEATURES[key]
              const isSelected = selectedPlan === key
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  className={[
                    'w-full flex items-center justify-between border px-4 py-3.5 transition-all duration-200 text-left relative',
                    isSelected
                      ? 'border-exam-ink bg-exam-highlight'
                      : 'border-exam-rule hover:border-stone-400 hover:bg-bg-base',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                        isSelected ? 'border-exam-ink' : 'border-stone-300',
                      ].join(' ')}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-exam-ink" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-exam-ink">{plan.label}</p>
                        {plan.popular && (
                          <span className="text-[10px] font-black text-white bg-exam-red px-1.5 py-0.5 leading-none">
                            인기
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {plan.badge && (
                          <span className="text-[10px] font-bold text-exam-ink border border-exam-rule px-1.5 py-0.5">
                            {plan.badge}
                          </span>
                        )}
                        <span className="text-[11px] text-stone-500">{plan.description}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-exam-ink tabular-nums">{'\u20A9'}{plan.price}</span>
                    <span className="text-xs text-stone-500 ml-1">{plan.period}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* 서비스 제공 기간 안내 (PG 심사 필수 항목) */}
        <motion.div
          variants={item}
          className="border border-exam-rule bg-white p-5 mb-5"
        >
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">서비스 제공 기간</p>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="shrink-0 mt-1.5 w-5 h-5 border border-exam-ink flex items-center justify-center text-[10px] font-bold text-exam-ink">1</span>
              <div>
                <p className="font-semibold text-exam-ink">월간 구독 ({'\u20A9'}9,900/월)</p>
                <p className="text-stone-500 text-xs mt-0.5">
                  결제일로부터 1개월(30일) 이용 후 자동 갱신
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 mt-1.5 w-5 h-5 border border-exam-ink flex items-center justify-center text-[10px] font-bold text-exam-ink">2</span>
              <div>
                <p className="font-semibold text-exam-ink">일주일 이용권 ({'\u20A9'}3,900)</p>
                <p className="text-stone-500 text-xs mt-0.5">
                  결제일로부터 7일간 서비스 제공 / 자동 갱신 없음 (일회성 결제)
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 결제 정보 입력 + 버튼 */}
        <motion.div variants={item}>
          {/* 전화번호: 구독(빌링키)일 때만 표시 */}
          {isSubscription && (
            <div className="mb-4">
              <label htmlFor="phoneNumber" className="block text-xs text-stone-500 mb-1.5">
                휴대폰 번호 <span className="text-exam-red">*</span>
              </label>
              <input
                id="phoneNumber"
                type="tel"
                placeholder="01012345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                className="w-full px-3 py-2.5 border border-exam-rule bg-white text-sm text-exam-ink placeholder-stone-400 focus:border-exam-ink focus:outline-none transition-colors"
              />
            </div>
          )}

          {isAlreadySubscribed ? (
            <div className="w-full py-4 bg-exam-highlight border border-exam-rule text-center">
              <p className="text-exam-ink font-bold text-sm">현재 구독 중이에요</p>
              {currentSubscription?.expiresAt && (
                <p className="text-stone-500 text-xs mt-1">
                  만료일: {new Date(currentSubscription.expiresAt).toLocaleDateString('ko-KR')}
                </p>
              )}
              <button
                onClick={openCancelModal}
                className="mt-3 text-xs text-stone-500 hover:text-exam-red transition-colors underline underline-offset-2"
              >
                구독 취소
              </button>
            </div>
          ) : (
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-2.5 bg-exam-ink text-white font-bold text-sm hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              {loading
                ? '결제 진행 중...'
                : isSubscription
                  ? '카드 등록하고 구독 시작'
                  : '결제하기'
              }
            </button>
          )}

          <p className="text-center text-xs text-stone-500 mt-4">
            {isSubscription
              ? '언제든지 해지 가능 · 해지 후 만료일까지 서비스 이용 가능'
              : `${planInfo.days}일 이용권 · 자동 갱신 없음`
            }
          </p>
          <p className="text-center text-[11px] text-stone-400 mt-2 space-x-3">
            <Link href="/terms" className="hover:text-exam-ink underline underline-offset-2 transition-colors">이용약관</Link>
            <Link href="/refund" className="hover:text-exam-ink underline underline-offset-2 transition-colors">환불규정</Link>
            <Link href="/privacy" className="hover:text-exam-ink underline underline-offset-2 transition-colors">개인정보처리방침</Link>
          </p>
        </motion.div>
      </motion.div>

      {/* Cancel subscription modal */}
      {showCancelModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeCancelModal() }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm border border-exam-rule bg-white p-6 shadow-lg relative"
          >
            {/* Close button */}
            <button
              onClick={closeCancelModal}
              className="absolute top-4 right-4 text-stone-400 hover:text-exam-ink transition-colors"
            >
              <X size={18} />
            </button>

            {cancelStep === 'reason' && (
              <>
                <h3 className="font-exam-serif text-lg font-bold text-exam-ink mb-1">구독을 취소하시겠어요?</h3>
                <p className="text-xs text-stone-500 mb-5">
                  더 나은 서비스를 위해 이유를 알려주세요.
                </p>
                <div className="space-y-2 mb-5">
                  {CANCEL_REASONS.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setCancelReason(r.key)}
                      className={[
                        'w-full text-left px-4 py-3 border text-sm transition-all',
                        cancelReason === r.key
                          ? 'border-exam-ink bg-exam-highlight text-exam-ink'
                          : 'border-exam-rule hover:border-stone-400 text-stone-500',
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
                  className="w-full py-3 border border-exam-rule text-stone-700 text-sm font-semibold hover:bg-bg-base transition-colors"
                >
                  다음
                </button>
              </>
            )}

            {cancelStep === 'offer' && (
              <>
                <h3 className="font-exam-serif text-lg font-bold text-exam-ink mb-1">잠깐만요!</h3>
                <p className="text-xs text-stone-500 mb-5">
                  {cancelReason === 'too_expensive'
                    ? '일주일 이용권(\u20A93,900)으로 부담 없이 계속해보세요.'
                    : cancelReason === 'no_time'
                      ? '하루 5분이면 충분해요. 짧은 시간 꾸준히 풀어보세요.'
                      : cancelReason === 'not_enough_content'
                        ? '매주 새로운 문제가 추가되고 있어요!'
                        : '취소 전에 이것만 확인해주세요.'}
                </p>

                <div className="border border-exam-rule bg-exam-highlight p-4 mb-4">
                  <p className="text-exam-red font-semibold text-sm mb-2">지금 유지하면</p>
                  <ul className="space-y-1.5 text-xs text-stone-700">
                    <li className="flex items-center gap-1">
                      <Check size={12} className="text-exam-red shrink-0" />
                      무제한 문제 + 전체 힌트
                    </li>
                    <li className="flex items-center gap-1">
                      <Check size={12} className="text-exam-red shrink-0" />
                      성장 대시보드 & 오답 분석
                    </li>
                    <li className="flex items-center gap-1">
                      <Check size={12} className="text-exam-red shrink-0" />
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
                    className="w-full py-3 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors"
                  >
                    구독 유지하기
                  </button>
                  {cancelReason === 'no_time' && (
                    <button
                      onClick={() => {
                        closeCancelModal()
                        toast.info('구독 일시정지는 준비 중이에요.', {
                          description: '곧 1개월 일시정지 기능이 추가될 예정이에요. 그때까지 구독은 유지됩니다.',
                        })
                      }}
                      className="w-full py-3 border border-exam-rule text-stone-700 text-sm font-medium hover:bg-bg-base transition-colors"
                    >
                      1개월 일시정지 (준비 중)
                    </button>
                  )}
                  <button
                    onClick={() => setCancelStep('confirm')}
                    className="w-full py-3 text-stone-400 text-sm hover:text-stone-700 transition-colors"
                  >
                    그래도 취소할게요
                  </button>
                </div>
              </>
            )}

            {cancelStep === 'confirm' && (
              <>
                <h3 className="font-exam-serif text-lg font-bold text-exam-ink mb-1">정말 취소하시겠어요?</h3>
                <p className="text-xs text-stone-500 mb-5">
                  만료일까지는 프리미엄 기능을 계속 이용할 수 있어요.
                  {currentSubscription?.expiresAt && (
                    <span className="block mt-1 text-stone-400">
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
                    className="w-full py-3 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors"
                  >
                    역시 유지할게요
                  </button>
                  <button
                    onClick={executeCancelSubscription}
                    disabled={cancelLoading}
                    className="w-full py-3 border border-exam-red text-exam-red text-sm font-semibold hover:bg-exam-highlight transition-colors disabled:opacity-50"
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
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xs border border-exam-rule bg-white p-6 text-center shadow-lg"
          >
            {paymentStep === 'card' && (
              <>
                <CreditCard size={28} className="text-exam-ink mx-auto mb-3" />
                <p className="text-sm font-semibold text-exam-ink mb-1">카드 정보 입력 중</p>
                <p className="text-xs text-stone-500">결제창에서 카드 정보를 입력해주세요</p>
              </>
            )}
            {paymentStep === 'processing' && (
              <>
                <Loader2 size={28} className="text-exam-ink mx-auto mb-3 animate-spin" />
                <p className="text-sm font-semibold text-exam-ink mb-1">결제 처리 중</p>
                <p className="text-xs text-stone-500">잠시만 기다려주세요...</p>
              </>
            )}
            {paymentStep === 'done' && (
              <>
                <ShieldCheck size={28} className="text-exam-ink mx-auto mb-3" />
                <p className="text-sm font-semibold text-exam-ink mb-1">결제 완료!</p>
                <p className="text-xs text-stone-500">곧 이동합니다...</p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
