'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Brain, Target, TrendingUp, Lock, Zap, Users } from 'lucide-react'

const FEATURES = [
  {
    icon: Brain,
    title: '추론 체인 조립',
    desc: '흩어진 문장을 논리적 순서로 드래그해 이어붙이세요. 수능 지문의 흐름이 눈에 보입니다.',
  },
  {
    icon: Target,
    title: '7단계 레벨업',
    desc: '3단계 추론부터 7단계까지. 80% 정확도를 넘으면 다음 레벨로 자동 승급됩니다.',
  },
  {
    icon: TrendingUp,
    title: '성장 대시보드',
    desc: '정확도 추이, 오류 패턴, 힌트 의존도를 분석해 약점을 정확히 파악하세요.',
  },
]

const STEPS = [
  { n: '01', title: '지문 읽기', desc: '왼쪽 패널에서 수능 비문학 지문을 읽습니다' },
  { n: '02', title: '카드 배치', desc: '오른쪽 슬롯에 문장 카드를 논리적 순서로 드래그합니다' },
  { n: '03', title: '연결 확인', desc: '슬롯 사이 🟢🟡🔴 표시로 연결 강도를 실시간 확인합니다' },
  { n: '04', title: '제출 & 피드백', desc: '정확도와 어느 단계가 틀렸는지 즉시 알려드립니다' },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#0F172A]/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-lg">추론 탐정</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
              로그인
            </Link>
            <Link
              href="/signup"
              className="text-sm px-4 py-1.5 rounded-full bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400 transition-colors"
            >
              무료 시작
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-400 font-medium mb-6">
            <Zap size={12} />
            수능 비문학 추론 훈련 앱
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-5">
            논리의 빈칸을 채우세요.
            <br />
            <span className="text-amber-400">추론 체인을 직접 조립하며</span>
            <br />
            수능 국어를 정복하세요.
          </h1>

          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            흩어진 문장을 드래그해 논리 순서로 잇는 훈련.
            매일 5문제 무료, 레벨업할수록 추론 깊이가 깊어집니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-base hover:bg-amber-400 transition-all hover:scale-105 shadow-lg shadow-amber-500/20"
            >
              무료로 시작하기
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/levels"
              className="px-8 py-3.5 rounded-xl border border-slate-700 text-slate-300 font-medium text-base hover:border-slate-600 hover:bg-slate-800/50 transition-colors"
            >
              레벨 구경하기
            </Link>
          </div>

          <p className="text-xs text-slate-600 mt-4">
            신용카드 불필요 · 매일 5문제 무료 · 언제든지 업그레이드
          </p>
        </motion.div>

        {/* Mock UI */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 rounded-2xl border border-slate-700 bg-slate-800/60 p-4 max-w-3xl mx-auto text-left"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-amber-500/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
            <span className="text-xs text-slate-600 ml-2">게임 화면 미리보기</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Passage */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">지문</p>
              <div className="rounded-lg bg-slate-900 p-3 text-xs text-slate-400 leading-5">
                현대 사회에서 정보는 단순한 사실의 집합이 아니라 의미를 구성하는 체계이다. 특히 디지털 환경에서 정보의 수용과 해석은 개인의 인식 체계와 밀접하게 연결되어 있다.
              </div>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300 leading-5">
                <span className="font-semibold text-amber-400">결론:</span> 디지털 리터러시는 현대인의 필수 역량이다.
              </div>
            </div>
            {/* Slots */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">추론 체인 (3단계)</p>
              <div className="space-y-1.5">
                {['정보 수용 방식이 인식에 영향을 준다', '인식 체계가 판단력을 결정한다', '따라서 리터러시 교육이 필요하다'].map((text, i) => (
                  <div key={i} className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-slate-300">
                    <span className="text-emerald-400 font-bold mr-2">{i + 1}</span>
                    {text}
                  </div>
                ))}
              </div>
              <div className="text-xs text-emerald-400 font-semibold mt-1">✓ 정확도 100% — 레벨업!</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-slate-800/30 border-y border-slate-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-center mb-12">이런 훈련이에요</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <motion.div
                  key={f.title}
                  variants={item}
                  className="rounded-xl border border-slate-700 bg-slate-800/60 p-6"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center mb-4">
                    <f.icon size={18} className="text-amber-400" />
                  </div>
                  <h3 className="font-semibold text-slate-200 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-center mb-12">어떻게 하나요?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-amber-400 mx-auto mb-3">
                {s.n}
              </div>
              <p className="font-semibold text-sm text-slate-200 mb-1">{s.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-slate-800/30 border-y border-slate-800 py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 text-slate-500">
            <Users size={16} />
            <span className="text-sm">친구를 초대하면 둘 다 보너스 문제 지급</span>
          </div>
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { n: '7', label: '추론 레벨' },
              { n: '5', label: '일일 무료 문제' },
              { n: '∞', label: '구독 시 무제한' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold text-amber-400">{s.n}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl font-bold mb-3">부담 없이 시작하세요</h2>
        <p className="text-slate-400 text-sm mb-10">매일 5문제 무료. 더 원하시면 구독하세요.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
            <p className="text-sm font-semibold text-slate-400 mb-2">무료</p>
            <p className="text-3xl font-bold text-white mb-4">₩0</p>
            <ul className="text-sm text-slate-500 space-y-2 text-left mb-6">
              <li>✓ 하루 5문제</li>
              <li>✓ 레벨 1-7 도전</li>
              <li className="text-slate-700">✗ 성장 대시보드</li>
              <li className="text-slate-700">✗ 전체 힌트</li>
            </ul>
            <Link href="/signup" className="block w-full py-2.5 rounded-lg border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors text-center">
              무료 시작
            </Link>
          </div>
          <div className="rounded-2xl border border-amber-500/50 bg-amber-500/5 p-6">
            <p className="text-sm font-semibold text-amber-400 mb-2">프리미엄</p>
            <p className="text-3xl font-bold text-white mb-4">₩9,900<span className="text-base font-normal text-slate-400">/월</span></p>
            <ul className="text-sm text-slate-300 space-y-2 text-left mb-6">
              <li>✓ 하루 무제한 문제</li>
              <li>✓ 레벨 1-7 전체</li>
              <li>✓ 성장 대시보드</li>
              <li>✓ 전체 힌트 이용</li>
            </ul>
            <Link href="/signup" className="block w-full py-2.5 rounded-lg bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors text-center">
              구독 시작
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-12"
        >
          <h2 className="text-2xl font-bold mb-3">지금 바로 추론을 훈련하세요</h2>
          <p className="text-slate-400 mb-8">매일 5문제로 시작해서 추론 실력을 키우세요.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 transition-all hover:scale-105 shadow-lg shadow-amber-500/20"
          >
            무료로 시작하기
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs text-slate-600">
          <span>© 2025 추론 탐정</span>
          <div className="flex gap-4">
            <span>이용약관</span>
            <span>개인정보처리방침</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
