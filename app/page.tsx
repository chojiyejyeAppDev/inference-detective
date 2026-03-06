'use client'

import { motion, type Variants } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Brain, Target, TrendingUp, Zap, Users, ChevronRight } from 'lucide-react'
import Footer from '@/components/common/Footer'

const FEATURES = [
  {
    icon: Brain,
    title: '추론 체인 조립',
    desc: '흩어진 문장을 논리 순서로 드래그해 이어붙이세요. 수능 지문의 흐름이 눈에 들어옵니다.',
    color: 'amber',
  },
  {
    icon: Target,
    title: '7단계 레벨업',
    desc: '3단계 추론부터 7단계까지. 3회 연속 80% 이상이면 다음 레벨로 자동 승급됩니다.',
    color: 'amber',
  },
  {
    icon: TrendingUp,
    title: '성장 대시보드',
    desc: '정확도 추이, 오류 패턴, 힌트 의존도를 분석해 약점을 정확히 파악하세요.',
    color: 'amber',
  },
]

const STEPS = [
  { n: '01', title: '지문 읽기', desc: '왼쪽 패널에서 수능 비문학 지문을 꼼꼼히 읽습니다' },
  { n: '02', title: '카드 배치', desc: '오른쪽 슬롯에 문장 카드를 논리 순서로 드래그합니다' },
  { n: '03', title: '연결 확인', desc: '🟢🟡🔴 표시로 추론 연결 강도를 실시간 확인합니다' },
  { n: '04', title: '즉시 피드백', desc: '정확도와 어느 단계가 틀렸는지 바로 알려드립니다' },
]

const STATS = [
  { n: '7', label: '추론 레벨', sub: 'Level 1 → 7' },
  { n: '5', label: '일일 무료 문제', sub: '매일 리셋' },
  { n: '∞', label: '구독 시 무제한', sub: '₩9,900 / 월' },
]

const MOCK_CHAIN = [
  { text: '정보 수용 방식이 인식에 영향을 준다', correct: true },
  { text: '인식 체계가 판단력을 결정한다', correct: true },
  { text: '따라서 리터러시 교육이 필요하다', correct: true },
]

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.09 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45 } },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0C1628] text-white overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0C1628]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <span className="text-slate-900 font-black text-xs">르</span>
            </div>
            <span className="font-bold text-base tracking-tight">이:르다</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5">
              로그인
            </Link>
            <Link
              href="/signup"
              className="text-sm px-4 py-1.5 rounded-full bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/25"
            >
              무료 시작
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-28 text-center overflow-hidden">
        {/* Background dot grid */}
        <div className="absolute inset-0 bg-dot-grid opacity-60 pointer-events-none" />
        {/* Amber radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2 w-[900px] h-[520px] animate-hero-glow"
            style={{
              background: 'radial-gradient(ellipse 70% 55% at 50% 20%, rgba(251,191,36,0.10) 0%, transparent 72%)',
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative z-10"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-400 font-semibold mb-7 shadow-inner shadow-amber-500/10"
          >
            <Zap size={11} className="fill-amber-400" />
            수능 비문학 추론 훈련 앱
          </motion.div>

          {/* Headline */}
          <h1 className="text-[2.6rem] sm:text-[3.4rem] font-black leading-[1.12] tracking-tight mb-6">
            논리의 빈칸을 채우세요.
            <br />
            <span className="text-shimmer">추론 체인을 직접 조립하며</span>
            <br />
            수능 국어를 정복하세요.
          </h1>

          <p className="text-slate-400 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
            흩어진 문장을 드래그해 논리 순서로 잇는 훈련.
            <br className="hidden sm:block" />
            매일 5문제 무료, 레벨업할수록 추론이 깊어집니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center">
            <Link
              href="/signup"
              className="animate-cta-glow flex items-center gap-2 px-9 py-3.5 rounded-xl bg-amber-500 text-slate-900 font-black text-base hover:bg-amber-400 transition-all hover:scale-105 shadow-xl shadow-amber-500/25"
            >
              무료로 시작하기
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/levels"
              className="flex items-center gap-2 px-9 py-3.5 rounded-xl border border-white/10 text-slate-300 font-medium text-base hover:border-white/20 hover:bg-white/[0.04] transition-all"
            >
              레벨 구경하기
              <ChevronRight size={14} className="text-slate-500" />
            </Link>
          </div>

          <p className="text-xs text-slate-600 mt-4">
            신용카드 불필요 · 매일 5문제 무료 · 언제든지 업그레이드
          </p>
        </motion.div>

        {/* Mock UI Preview */}
        <motion.div
          initial={{ opacity: 0, y: 44 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="animate-float-y mt-16 relative z-10"
        >
          <div className="rounded-2xl border border-white/10 bg-[#111C30]/80 backdrop-blur-sm shadow-2xl shadow-black/40 p-5 max-w-3xl mx-auto text-left">
            {/* Window chrome */}
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/[0.07]">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-amber-500/60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              <span className="text-xs text-slate-600 ml-2 font-mono">iruda.kr/play</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {/* Passage */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">지문</p>
                </div>
                <div className="rounded-xl bg-slate-900/70 border border-white/[0.05] p-3.5 text-xs text-slate-400 leading-[1.7]">
                  현대 사회에서 정보는 단순한 사실의 집합이 아니라 의미를 구성하는 체계이다. 특히 디지털 환경에서 정보의 수용과 해석은 개인의 인식 체계와 밀접하게 연결되어 있다.
                </div>
                <div className="rounded-xl bg-amber-500/8 border border-amber-500/25 p-3.5 text-xs text-amber-300/90 leading-[1.7]">
                  <span className="font-bold text-amber-400">결론 —</span>{' '}
                  디지털 리터러시는 현대인의 필수 역량이다.
                </div>
              </div>
              {/* Chain */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">추론 체인 (3단계)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {MOCK_CHAIN.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3.5 py-2.5 text-xs text-slate-300 flex items-start gap-2.5"
                    >
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-[1.5]">{c.text}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold mt-1 pt-2 border-t border-white/[0.05]">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center">✓</span>
                  정확도 100% — 레벨업!
                </div>
              </div>
            </div>
          </div>
          {/* Bottom glow reflection */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.18), transparent)' }}
          />
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-white/[0.06] bg-white/[0.015] py-14">
        <motion.div
          className="max-w-5xl mx-auto px-6"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-center gap-2 mb-8 text-slate-500 text-xs">
            <Users size={14} />
            <span>친구를 초대하면 둘 다 보너스 문제 지급</span>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-lg mx-auto text-center">
            {STATS.map((s, i) => (
              <motion.div key={s.label} variants={item} style={{ animationDelay: `${i * 0.12}s` }}>
                <p className="text-4xl font-black text-amber-400 text-glow-amber leading-none mb-1">{s.n}</p>
                <p className="text-sm font-semibold text-slate-300 mb-0.5">{s.label}</p>
                <p className="text-[11px] text-slate-600">{s.sub}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid opacity-40 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <p className="text-xs font-bold text-amber-500 uppercase tracking-[0.15em] mb-3">Features</p>
            <h2 className="text-3xl font-black tracking-tight">이런 훈련이에요</h2>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-5"
          >
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={item}
                className="group rounded-2xl border border-white/[0.08] bg-[#111C30]/60 p-6 hover:border-amber-500/30 hover:bg-amber-500/[0.04] transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-500/12 border border-amber-500/20 flex items-center justify-center mb-5 group-hover:bg-amber-500/20 group-hover:border-amber-500/40 transition-all">
                  <f.icon size={19} className="text-amber-400" />
                </div>
                <h3 className="font-bold text-slate-100 mb-2.5 text-base">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y border-white/[0.06] bg-white/[0.015] py-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <p className="text-xs font-bold text-amber-500 uppercase tracking-[0.15em] mb-3">How it works</p>
            <h2 className="text-3xl font-black tracking-tight">어떻게 하나요?</h2>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 relative">
            {/* Connector line (desktop) */}
            <div className="absolute top-5 left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent hidden sm:block" />
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center relative"
              >
                <div className="w-10 h-10 rounded-full bg-[#0C1628] border-2 border-amber-500/40 flex items-center justify-center text-xs font-black text-amber-400 mx-auto mb-4 relative z-10">
                  {s.n}
                </div>
                <p className="font-bold text-sm text-slate-200 mb-1.5">{s.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Preview ── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid opacity-40 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-bold text-amber-500 uppercase tracking-[0.15em] mb-3">Pricing</p>
            <h2 className="text-3xl font-black tracking-tight mb-3">부담 없이 시작하세요</h2>
            <p className="text-slate-400 text-sm mb-12">매일 5문제 무료. 더 원하시면 구독하세요.</p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-lg mx-auto"
          >
            {/* Free */}
            <motion.div
              variants={item}
              className="rounded-2xl border border-white/[0.08] bg-[#111C30]/60 p-7 text-left"
            >
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">무료</p>
              <p className="text-4xl font-black text-white mb-6">₩0</p>
              <ul className="text-sm text-slate-500 space-y-2.5 mb-8">
                <li className="flex items-center gap-2"><span className="text-slate-600">✓</span> 하루 5문제</li>
                <li className="flex items-center gap-2"><span className="text-slate-600">✓</span> 레벨 1-7 도전</li>
                <li className="flex items-center gap-2 line-through opacity-40"><span>✗</span> 성장 대시보드</li>
                <li className="flex items-center gap-2 line-through opacity-40"><span>✗</span> 전체 힌트</li>
              </ul>
              <Link href="/signup" className="block w-full py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-semibold hover:bg-white/[0.04] transition-colors text-center">
                무료 시작
              </Link>
            </motion.div>

            {/* Premium */}
            <motion.div
              variants={item}
              className="animate-level-pulse rounded-2xl border border-amber-500/45 bg-gradient-to-b from-amber-500/8 to-amber-500/3 p-7 text-left relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">프리미엄</p>
                <span className="text-[10px] font-black text-slate-900 bg-amber-400 px-2 py-0.5 rounded-full">인기</span>
              </div>
              <p className="text-4xl font-black text-white mb-1">
                ₩9,900
                <span className="text-base font-normal text-slate-400">/월</span>
              </p>
              <p className="text-xs text-slate-500 mb-6">일주일 체험 ₩3,900부터</p>
              <ul className="text-sm text-slate-300 space-y-2.5 mb-8">
                <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> 하루 무제한 문제</li>
                <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> 레벨 1-7 전체</li>
                <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> 성장 대시보드</li>
                <li className="flex items-center gap-2"><span className="text-amber-400">✓</span> 전체 힌트 이용</li>
              </ul>
              <Link href="/signup" className="block w-full py-2.5 rounded-xl bg-amber-500 text-slate-900 text-sm font-black hover:bg-amber-400 transition-colors text-center shadow-lg shadow-amber-500/25">
                구독 시작
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="relative rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.07] to-amber-500/[0.02] p-8 sm:p-14 text-center overflow-hidden"
        >
          {/* Top glow line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
          <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tight mb-3">지금 바로 추론을 훈련하세요</h2>
            <p className="text-slate-400 mb-9 max-w-sm mx-auto">
              매일 5문제로 시작해서 수능 비문학 추론 실력을 키우세요.
            </p>
            <Link
              href="/signup"
              className="animate-cta-glow inline-flex items-center gap-2.5 px-11 py-4 rounded-2xl bg-amber-500 text-slate-900 font-black text-base hover:bg-amber-400 transition-all hover:scale-105 shadow-2xl shadow-amber-500/30"
            >
              무료로 시작하기
              <ArrowRight size={17} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <Footer />
    </div>
  )
}
