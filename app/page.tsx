'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, GripVertical, Menu, X, BookX, FileText, Brain } from 'lucide-react'
import Footer from '@/components/common/Footer'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const STEPS = [
  { n: '1', title: '읽기', desc: '지문과 결론을 확인하세요.' },
  { n: '2', title: '조립', desc: '흩어진 문장 카드를 논리 순서로 슬롯에 배치하세요.' },
  { n: '3', title: '피드백', desc: '정확도, 틀린 부분, 약점 분석을 바로 받아보세요.' },
]

const DEMO_CARDS = [
  { id: 'b', text: '인식 체계가 판단력을 결정한다' },
  { id: 'a', text: '정보 수용 방식이 인식에 영향을 준다' },
  { id: 'c', text: '따라서 리터러시 교육이 필요하다' },
]
const DEMO_LABELS: Record<string, string> = {
  a: '정보 수용 방식이 인식에 영향을 준다',
  b: '인식 체계가 판단력을 결정한다',
  c: '따라서 리터러시 교육이 필요하다',
}

type DemoPhase = 'idle' | 'drag1' | 'drag2' | 'drag3' | 'evaluate' | 'result' | 'reset'

function useDemoAnimation() {
  const [phase, setPhase] = useState<DemoPhase>('idle')
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null])
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [connections, setConnections] = useState<('none' | 'green' | 'yellow')[]>(['none', 'none'])

  const reset = useCallback(() => {
    setSlots([null, null, null])
    setActiveCard(null)
    setShowResult(false)
    setConnections(['none', 'none'])
    setPhase('idle')
  }, [])

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    const t = (fn: () => void, ms: number) => {
      timers.push(setTimeout(fn, ms))
    }

    if (phase === 'idle') {
      t(() => { setActiveCard('a'); setPhase('drag1') }, 1800)
    } else if (phase === 'drag1') {
      t(() => { setSlots(['a', null, null]); setActiveCard(null); setPhase('drag2') }, 1000)
    } else if (phase === 'drag2') {
      t(() => { setActiveCard('b') }, 800)
      t(() => { setSlots(['a', 'b', null]); setActiveCard(null); setConnections(['green', 'none']); setPhase('drag3') }, 1600)
    } else if (phase === 'drag3') {
      t(() => { setActiveCard('c') }, 800)
      t(() => { setSlots(['a', 'b', 'c']); setActiveCard(null); setConnections(['green', 'green']); setPhase('evaluate') }, 1600)
    } else if (phase === 'evaluate') {
      t(() => { setShowResult(true); setPhase('result') }, 1000)
    } else if (phase === 'result') {
      t(() => { setPhase('reset') }, 3500)
    } else if (phase === 'reset') {
      reset()
    }

    return () => timers.forEach(clearTimeout)
  }, [phase, reset])

  const placedIds = new Set(slots.filter(Boolean))
  const remainingCards = DEMO_CARDS.filter(c => !placedIds.has(c.id))

  return { slots, activeCard, showResult, connections, remainingCards }
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

function LandingDemo() {
  const { slots, activeCard, showResult, connections, remainingCards } = useDemoAnimation()

  return (
    <div className="border border-exam-rule bg-white p-5 max-w-3xl mx-auto text-left shadow-sm">
      {/* Header bar */}
      <div className="exam-header mb-5">
        <div className="flex items-center gap-2">
          <span className="problem-number-sm">3</span>
          <span className="text-xs font-bold text-exam-ink">레벨 3 — 인문</span>
        </div>
        <span className="text-[10px] text-stone-400 font-mono">eruda.today/play</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {/* Passage + remaining cards */}
        <div className="space-y-3">
          <div className="passage-box text-xs text-stone-600 leading-[1.8]">
            현대 사회에서 정보는 단순한 사실의 집합이 아니라 의미를 구성하는 체계이다. 특히 디지털 환경에서 정보의 수용과 해석은 개인의 인식 체계와 밀접하게 연결되어 있다.
          </div>
          <div className="border border-exam-red/30 bg-exam-highlight p-3.5 text-xs text-stone-700 leading-[1.8]">
            <span className="font-bold text-exam-red">[결론]</span>{' '}
            디지털 리터러시는 현대인의 필수 역량이다.
          </div>
          {/* Remaining draggable cards */}
          <div className="space-y-1.5 pt-1">
            <AnimatePresence mode="popLayout">
              {remainingCards.map((card) => (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, x: 40 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'border px-3 py-2 text-xs text-stone-700 flex items-center gap-2 transition-all',
                    activeCard === card.id
                      ? 'border-exam-ink bg-stone-50 shadow-sm'
                      : 'border-exam-rule bg-white',
                  )}
                >
                  <GripVertical size={10} className="text-stone-300 shrink-0" />
                  <span className="leading-[1.5]">{card.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Inference chain slots */}
        <div className="space-y-3">
          <p className="section-label">추론 체인 (3단계)</p>
          <div className="space-y-1.5">
            {slots.map((slotId, i) => (
              <div key={i}>
                <motion.div
                  className={cn(
                    'border px-3.5 py-2.5 text-xs min-h-[36px] flex items-start gap-2.5 transition-all',
                    slotId
                      ? 'border-exam-ink/20 bg-stone-50 text-stone-700'
                      : 'border-dashed border-stone-300 text-stone-400',
                  )}
                  animate={slotId ? { scale: [1, 1.01, 1] } : {}}
                  transition={{ duration: 0.25 }}
                >
                  <span className={cn(
                    'problem-number-sm mt-0.5',
                    !slotId && 'opacity-30',
                  )}>
                    {i + 1}
                  </span>
                  <span className="leading-[1.5]">
                    {slotId ? DEMO_LABELS[slotId] : `${i + 1}번째 단계를 넣어주세요`}
                  </span>
                </motion.div>
                {/* Connection indicator between slots */}
                {i < 2 && (
                  <div className="flex items-center justify-center py-1">
                    <motion.div
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium transition-all',
                        connections[i] === 'green' ? 'text-green-700 bg-green-50 border border-green-200'
                          : connections[i] === 'yellow' ? 'text-amber-600 bg-amber-50 border border-amber-200'
                          : 'text-stone-300 border border-transparent',
                      )}
                      animate={connections[i] !== 'none' ? { scale: [0.8, 1.05, 1], opacity: [0, 1] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      {connections[i] === 'green' ? '✓ 강한 연결' : connections[i] === 'yellow' ? '~ 보통' : '·'}
                    </motion.div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Result */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 pt-3 border-t border-exam-rule"
              >
                <div className="score-stamp !w-12 !h-12 !border-[1.5px] !text-[10px]">
                  <span className="score-stamp-value !text-base">100</span>
                  <span className="score-stamp-label !text-[7px]">PERFECT</span>
                </div>
                <span className="text-xs font-bold text-exam-ink">레벨업!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/levels')
    })
  }, [router])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      const nav = (e.target as HTMLElement).closest('nav')
      if (!nav) setMobileMenuOpen(false)
    }
    const handleScroll = () => setMobileMenuOpen(false)
    document.addEventListener('click', handleClick)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      document.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [mobileMenuOpen])

  return (
    <div className="min-h-screen bg-bg-base text-exam-ink overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-exam-rule bg-bg-base/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-exam-serif font-bold text-base tracking-tight">이:르다</span>
          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-4">
            <Link href="/login" className="text-sm text-stone-500 hover:text-exam-ink transition-colors">
              로그인
            </Link>
            <Link
              href="/signup"
              className="text-sm px-5 py-1.5 bg-exam-ink text-white font-bold hover:bg-stone-800 transition-colors"
            >
              무료 시작
            </Link>
          </div>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={mobileMenuOpen}
            className="sm:hidden p-2.5 -m-1 text-stone-500 hover:text-exam-ink transition-colors"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="sm:hidden overflow-hidden border-t border-exam-rule"
            >
              <div className="px-4 py-3 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm text-stone-600 hover:text-exam-ink py-2 px-3 transition-colors"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm text-center py-2 px-4 bg-exam-ink text-white font-bold hover:bg-stone-800 transition-colors"
                >
                  무료 시작
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 section-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Problem number style badge */}
          <p className="section-label mb-8">수능 비문학, 읽는 것만으로는 부족합니다</p>

          {/* Headline — exam-style serif */}
          <h1 className="font-exam-serif text-[2.5rem] sm:text-[3.5rem] font-black leading-[1.2] tracking-tight mb-4">
            논리 구조를 직접 조립하며
            <br />
            <span className="mark-red">추론력</span>을 훈련하세요.
          </h1>

          <p className="text-stone-500 text-base sm:text-lg max-w-md mb-6 leading-relaxed">
            지문을 읽고 핵심 문장을 논리 순서대로 배치하세요.
            <br />
            매일 5분이면 추론력이 바뀝니다.
          </p>

          <div className="flex flex-wrap gap-2 mb-10">
            {['수능 비문학', '논술', 'LEET', '공무원 시험', 'PSAT'].map((label) => (
              <span key={label} className="border border-exam-rule text-xs text-stone-500 px-2 py-0.5">
                {label}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-exam-ink text-white font-bold text-sm hover:bg-stone-800 transition-colors"
            >
              무료로 시작하기
              <ArrowRight size={15} />
            </Link>
          </div>
          <p className="text-xs text-stone-400 mt-3">7일 무제한 체험 · 카드 등록 불필요</p>
        </motion.div>
      </section>

      {/* ── Demo Preview ── */}
      <section className="pb-12 sm:pb-16 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <LandingDemo />
          <div className="text-center mt-5">
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-exam-ink transition-colors"
            >
              직접 해보고 싶으세요? <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Stats — inline bar ── */}
      <div className="grid grid-cols-3 max-w-lg mx-auto py-6 text-center text-xs text-stone-500">
        <span><strong className="text-exam-ink text-sm block">7 레벨</strong>난이도 체계</span>
        <span className="border-x border-exam-rule"><strong className="text-exam-ink text-sm block">300+</strong>누적 문제</span>
        <span><strong className="text-exam-ink text-sm block">평균 15%</strong>정답률 향상</span>
      </div>

      {/* ── Why this works ── */}
      <section className="border-y border-exam-rule section-md bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <p className="section-label mb-3">Why this works</p>
          <h2 className="font-exam-serif text-2xl sm:text-3xl font-black tracking-tight mb-12">
            왜 기존 공부법으로는 부족할까?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: BookX,
                title: '인강은 듣기만',
                desc: '강사의 풀이를 보는 것과 직접 추론하는 것은 다릅니다.',
              },
              {
                icon: FileText,
                title: '문제집은 정답만',
                desc: 'O/X만 확인하면 왜 그 순서인지 이해할 수 없습니다.',
              },
              {
                icon: Brain,
                title: '이:르다는 직접 조립',
                desc: '논리 체인을 손으로 만들면 추론 회로가 훈련됩니다.',
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="border border-exam-rule p-5 hover:border-exam-ink/30 hover:shadow-sm transition-all"
              >
                <card.icon size={24} className="text-exam-ink mb-3" strokeWidth={1.5} />
                <p className="font-bold text-sm text-exam-ink mb-1.5">{card.title}</p>
                <p className="text-xs text-stone-500 leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works — 3 steps ── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <p className="section-label mb-3">How it works</p>
          <h2 className="font-exam-serif text-2xl sm:text-3xl font-black tracking-tight mb-12">어떻게 하나요?</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="hover:translate-y-[-2px] transition-transform"
              >
                <div className="problem-number mb-4">{s.n}</div>
                <p className="font-bold text-sm text-exam-ink mb-1.5">{s.title}</p>
                <p className="text-xs text-stone-500 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing — single card ── */}
      <section className="section-md">
        <div className="max-w-3xl mx-auto px-6">
          <div className="border-2 border-exam-ink bg-white p-6 sm:p-8 max-w-md mx-auto text-center">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">무료로 시작</p>
            <p className="font-exam-serif text-2xl font-black text-exam-ink mb-1">7일 무제한 무료 체험</p>
            <p className="text-sm text-stone-500 mb-6">체험 후 하루 5문제 무료 · ₩9,900/월 무제한</p>
            <Link href="/signup" className="block w-full py-3 bg-exam-ink text-white text-sm font-bold hover:bg-stone-800 transition-colors">
              무료로 시작하기
            </Link>
            <p className="text-xs text-stone-400 mt-3">카드 등록 불필요 · 바로 플레이</p>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="border-y border-exam-rule section-md bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {[
              {
                name: '고3 수험생 D',
                tag: 'Lv.7 도달 · 3주 사용',
                text: '비문학 지문이 항상 어려웠는데, 문장 순서를 직접 맞추다 보니 논리 흐름이 자연스럽게 보이기 시작했어요.',
              },
              {
                name: '재수생 K',
                tag: 'Lv.7 클리어 · 2개월 사용',
                text: '하루 5문제씩 꾸준히 풀었더니 모의고사 비문학 정답률이 60% → 85%로 올랐어요.',
              },
            ].map((t) => (
              <motion.div
                key={t.name}
                variants={item}
                className="border border-exam-rule p-5 hover:border-exam-ink/30 hover:shadow-sm transition-all"
              >
                <div className="mb-3 pb-3 border-b border-exam-rule">
                  <p className="text-sm font-bold text-exam-ink">{t.name}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">{t.tag}</p>
                </div>
                <p className="text-sm text-stone-500 leading-relaxed margin-line">&ldquo;{t.text}&rdquo;</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-sm">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-exam-serif text-2xl sm:text-3xl font-black tracking-tight mb-4">
            지금 바로 시작하세요
          </h2>
          <Link href="/signup" className="inline-flex items-center gap-2 px-10 py-3.5 bg-exam-ink text-white font-bold text-sm hover:bg-stone-800 transition-colors">
            무료로 시작하기 →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
