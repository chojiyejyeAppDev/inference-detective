'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, GripVertical, Menu, X } from 'lucide-react'
import Footer from '@/components/common/Footer'
import { createClient } from '@/lib/supabase/client'

const FEATURES = [
  {
    num: '01',
    title: '수능 기출 패턴 기반',
    desc: '실제 수능·모의고사 비문학 논리 구조를 재현한 문제로 훈련해요. 단순 독해가 아닌 추론 조립이에요.',
  },
  {
    num: '02',
    title: '약점 자동 분석',
    desc: '어떤 주제, 어떤 추론 단계에서 자주 틀리는지 분석하고 집중 연습을 추천해줘요.',
  },
  {
    num: '03',
    title: '7단계 점진적 난이도',
    desc: '3슬롯 입문부터 7슬롯 마스터까지. 80% 이상 3회 연속 달성하면 자동 레벨업돼요.',
  },
]

const STEPS = [
  { n: '1', title: '지문 읽기', desc: '왼쪽 패널에서 수능 비문학 지문을 꼼꼼히 읽어요' },
  { n: '2', title: '카드 배치', desc: '오른쪽 슬롯에 문장 카드를 논리 순서로 드래그해요' },
  { n: '3', title: '연결 확인', desc: '연결 강도 표시로 추론 연결을 실시간 확인해요' },
  { n: '4', title: '즉시 피드백', desc: '정확도와 어느 단계가 틀렸는지 바로 알려줘요' },
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
      t(() => { setActiveCard('a'); setPhase('drag1') }, 1200)
    } else if (phase === 'drag1') {
      t(() => { setSlots(['a', null, null]); setActiveCard(null); setPhase('drag2') }, 800)
    } else if (phase === 'drag2') {
      t(() => { setActiveCard('b') }, 600)
      t(() => { setSlots(['a', 'b', null]); setActiveCard(null); setConnections(['green', 'none']); setPhase('drag3') }, 1400)
    } else if (phase === 'drag3') {
      t(() => { setActiveCard('c') }, 600)
      t(() => { setSlots(['a', 'b', 'c']); setActiveCard(null); setConnections(['green', 'green']); setPhase('evaluate') }, 1400)
    } else if (phase === 'evaluate') {
      t(() => { setShowResult(true); setPhase('result') }, 800)
    } else if (phase === 'result') {
      t(() => { setPhase('reset') }, 2800)
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
                  className={[
                    'border px-3 py-2 text-xs text-stone-700 flex items-center gap-2 transition-all',
                    activeCard === card.id
                      ? 'border-exam-ink bg-stone-50 shadow-sm'
                      : 'border-exam-rule bg-white',
                  ].join(' ')}
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
                  className={[
                    'border px-3.5 py-2.5 text-xs min-h-[36px] flex items-start gap-2.5 transition-all',
                    slotId
                      ? 'border-exam-ink/20 bg-stone-50 text-stone-700'
                      : 'border-dashed border-stone-300 text-stone-400',
                  ].join(' ')}
                  animate={slotId ? { scale: [1, 1.01, 1] } : {}}
                  transition={{ duration: 0.25 }}
                >
                  <span className={[
                    'problem-number-sm mt-0.5',
                    slotId ? '' : 'opacity-30',
                  ].join(' ')}>
                    {i + 1}
                  </span>
                  <span className="leading-[1.5]">
                    {slotId ? DEMO_LABELS[slotId] : `${i + 1}번째 단계를 넣어주세요`}
                  </span>
                </motion.div>
                {/* Connection indicator between slots */}
                {i < 2 && (
                  <div className="flex justify-center py-0.5">
                    <motion.div
                      className={[
                        'w-1 h-1 rounded-full transition-colors',
                        connections[i] === 'green' ? 'bg-green-600'
                          : connections[i] === 'yellow' ? 'bg-amber-500'
                          : 'bg-stone-200',
                      ].join(' ')}
                      animate={connections[i] !== 'none' ? { scale: [0, 1.3, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    />
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
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-20 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Problem number style badge */}
          <p className="section-label mb-8">수능 비문학 추론 훈련</p>

          {/* Headline — exam-style serif */}
          <h1 className="font-exam-serif text-[2.2rem] sm:text-[3rem] font-black leading-[1.2] tracking-tight mb-4">
            추론을 직접 조립하며
            <br />
            <span className="mark-red">정복</span>하세요.
          </h1>
          <p className="font-annotation text-sm mb-6">※ 읽기가 아닌, 조립하는 독해</p>

          <p className="text-stone-500 text-base sm:text-lg max-w-md mb-10 leading-relaxed">
            흩어진 문장을 드래그해 논리 순서로 잇는 훈련.
            <br />
            매일 5문제 무료, 레벨업할수록 추론이 깊어집니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-exam-ink text-white font-bold text-sm hover:bg-stone-800 transition-colors"
            >
              무료로 시작하기
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-1.5 px-8 py-3.5 border border-exam-rule text-stone-600 font-medium text-sm hover:border-exam-ink hover:text-exam-ink transition-colors"
            >
              바로 체험하기
            </Link>
          </div>

          <p className="text-xs text-stone-400 mt-4">
            신용카드 불필요 · 매일 5문제 무료 · 언제든지 업그레이드
          </p>
        </motion.div>
      </section>

      {/* ── Demo Preview ── */}
      <section className="pb-20 sm:pb-28 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p className="section-label mb-3 justify-center">
            실제 플레이 미리보기
          </p>
          <LandingDemo />
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-exam-rule py-14">
        <div className="max-w-3xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { n: '7', label: '추론 레벨', sub: 'Level 1 → 7' },
              { n: '5', label: '일일 무료 문제', sub: '매일 자정 리셋' },
              { n: '100+', label: '문제 은행', sub: '매주 추가' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <span className="grade-circle mb-2 text-lg">{s.n}</span>
                <p className="text-sm font-semibold text-stone-700 mb-0.5">{s.label}</p>
                <p className="text-[11px] text-stone-400">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <p className="section-label mb-3">Features</p>
            <h2 className="font-exam-serif text-2xl sm:text-3xl font-black tracking-tight">이런 훈련이에요</h2>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="space-y-0"
          >
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={item}
                className="flex gap-5 py-6 border-b border-exam-rule group"
              >
                <span className="font-exam-serif text-2xl font-black text-stone-200 group-hover:text-exam-red transition-colors shrink-0 w-10">
                  {f.num}
                </span>
                <div>
                  <h3 className="font-bold text-exam-ink mb-1.5">{f.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y border-exam-rule py-20 sm:py-24 bg-ruled bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <p className="section-label mb-3">How it works</p>
          <h2 className="font-exam-serif text-2xl sm:text-3xl font-black tracking-tight mb-12">어떻게 하나요?</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="problem-number mb-4">{s.n}</div>
                <p className="font-bold text-sm text-exam-ink mb-1.5">{s.title}</p>
                <p className="text-xs text-stone-500 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Preview ── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <p className="section-label mb-3">Pricing</p>
          <h2 className="font-exam-serif text-2xl sm:text-3xl font-black tracking-tight mb-3">부담 없이 시작하세요</h2>
          <p className="text-stone-500 text-sm mb-10">매일 5문제 무료. 더 원하시면 구독하세요.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            {/* Free */}
            <div className="border border-exam-rule p-6 text-left">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-4">무료</p>
              <p className="font-exam-serif text-3xl font-black text-exam-ink mb-5">&#8361;0</p>
              <ul className="text-sm text-stone-500 space-y-2 mb-6">
                <li className="flex items-center gap-2"><span className="text-stone-400">&#10003;</span> 하루 5문제</li>
                <li className="flex items-center gap-2"><span className="text-stone-400">&#10003;</span> 레벨 1-7 도전</li>
                <li className="flex items-center gap-2 line-through opacity-40"><span>&#10007;</span> 성장 대시보드</li>
                <li className="flex items-center gap-2 line-through opacity-40"><span>&#10007;</span> 전체 힌트</li>
              </ul>
              <Link href="/signup" className="block w-full py-2.5 border border-exam-rule text-stone-600 text-sm font-semibold hover:border-exam-ink hover:text-exam-ink transition-colors text-center">
                무료 시작
              </Link>
            </div>

            {/* Premium */}
            <div className="border-2 border-exam-ink p-6 text-left relative">
              <div className="absolute -top-3 right-4 bg-exam-ink text-white text-[10px] font-black px-3 py-1 tracking-wider">
                인기
              </div>
              <p className="text-[10px] font-bold text-exam-ink uppercase tracking-wider mb-4">프리미엄</p>
              <p className="font-exam-serif text-3xl font-black text-exam-ink mb-1">
                &#8361;9,900
                <span className="text-base font-normal text-stone-400">/월</span>
              </p>
              <p className="text-xs text-stone-400 mb-5">일주일 체험 &#8361;3,900부터</p>
              <ul className="text-sm text-stone-700 space-y-2 mb-6">
                <li className="flex items-center gap-2"><span className="text-exam-red font-bold">&#10003;</span> 하루 무제한 문제</li>
                <li className="flex items-center gap-2"><span className="text-exam-red font-bold">&#10003;</span> 레벨 1-7 전체</li>
                <li className="flex items-center gap-2"><span className="text-exam-red font-bold">&#10003;</span> 성장 대시보드</li>
                <li className="flex items-center gap-2"><span className="text-exam-red font-bold">&#10003;</span> 전체 힌트 이용</li>
              </ul>
              <Link href="/signup" className="block w-full py-2.5 bg-exam-ink text-white text-sm font-black hover:bg-stone-800 transition-colors text-center">
                구독 시작
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="border-y border-exam-rule py-20 sm:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <p className="section-label mb-3">Reviews</p>
          <h2 className="font-exam-serif text-2xl sm:text-3xl font-black tracking-tight mb-12">학생들의 후기</h2>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {[
              {
                name: '고3 수험생 D',
                tag: 'Lv.5 도달 · 3주 사용',
                text: '비문학 지문이 항상 어려웠는데, 문장 순서를 직접 맞추다 보니 논리 흐름이 자연스럽게 보이기 시작했어요.',
              },
              {
                name: '재수생 K',
                tag: 'Lv.7 클리어 · 2개월 사용',
                text: '하루 5문제씩 꾸준히 풀었더니 모의고사 비문학 정답률이 60% → 85%로 올랐어요.',
              },
              {
                name: '고2 학생 S',
                tag: 'Lv.3 진행 중 · 1주 사용',
                text: '드래그로 카드 배치하는 게 게임 같아서 공부 같지 않아요. 매일 아침 5문제 푸는 게 습관이 됐어요.',
              },
            ].map((t) => (
              <motion.div
                key={t.name}
                variants={item}
                className="border border-exam-rule p-5"
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
      <section className="py-20 sm:py-28 bg-ruled">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="border-2 border-exam-ink p-8 sm:p-12 text-center bg-white relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 opacity-20">
              <div className="score-stamp">
                <span className="score-stamp-value">A+</span>
                <span className="score-stamp-label">GRADE</span>
              </div>
            </div>
            <h2 className="font-exam-serif text-2xl sm:text-3xl font-black tracking-tight mb-3 relative">지금 바로 추론을 훈련하세요</h2>
            <p className="text-stone-500 mb-8 max-w-sm mx-auto text-sm relative">
              매일 5문제로 시작해서 수능 비문학 추론 실력을 키우세요.
            </p>
            <Link
              href="/signup"
              className="relative inline-flex items-center gap-2 px-10 py-3.5 bg-exam-ink text-white font-bold text-sm hover:bg-stone-800 transition-colors"
            >
              무료로 시작하기
              <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
