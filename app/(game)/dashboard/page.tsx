import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import AccuracyChart from '@/components/dashboard/AccuracyChart'
import ErrorPatternCard from '@/components/dashboard/ErrorPatternCard'
import HintDependencyChart from '@/components/dashboard/HintDependencyChart'
import TopicAnalysisCard from '@/components/dashboard/TopicAnalysisCard'
import InviteSection from '@/components/dashboard/InviteSection'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const service = await createServiceClient()

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/login')
  }

  const isPremium =
    profile.subscription_status === 'active' &&
    (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date())

  // 최근 30일 세션 데이터
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: sessions } = await service
    .from('level_sessions')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true })

  // 전체 진행 데이터 (correct_chain, topic 포함)
  const { data: progress } = await service
    .from('user_progress')
    .select('*, questions(correct_chain, topic)')
    .eq('user_id', user.id)

  // 차트 데이터 변환
  const accuracyData = (sessions ?? []).map((s) => ({
    date: new Date(s.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    accuracy: s.accuracy,
    level: s.level,
  }))

  // 오류 패턴: 실제로 틀린 슬롯 위치만 분석
  const errorPatterns: Record<string, number> = {}
  for (const p of progress ?? []) {
    if (!p.is_correct && p.submitted_chain) {
      const submitted = p.submitted_chain as (string | null)[]
      const correct = (p.questions as { correct_chain: string[] } | null)?.correct_chain
      submitted.forEach((val, idx) => {
        // correct_chain이 있으면 실제 틀린 슬롯만, 없으면 모든 슬롯 카운트
        if (!correct || val !== correct[idx]) {
          const key = `슬롯 ${idx + 1}`
          errorPatterns[key] = (errorPatterns[key] ?? 0) + 1
        }
      })
    }
  }
  const errorPatternData = Object.entries(errorPatterns).map(([position, count]) => ({
    position: position.replace('슬롯 ', 'S'),
    label: position,
    count,
  }))

  // 힌트 의존도
  const totalQ = progress?.length ?? 0
  const withHints = progress?.filter((p) => (p.hints_used ?? 0) > 0).length ?? 0
  const totalHints = progress?.reduce((sum, p) => sum + (p.hints_used ?? 0), 0) ?? 0
  const avgHints = totalQ > 0 ? totalHints / totalQ : 0

  // 주제별 분석
  const topicMap: Record<string, { total: number; correct: number }> = {}
  for (const p of progress ?? []) {
    const topic = (p.questions as { correct_chain: string[]; topic?: string } | null)?.topic
    if (topic) {
      if (!topicMap[topic]) topicMap[topic] = { total: 0, correct: 0 }
      topicMap[topic].total++
      if (p.is_correct) topicMap[topic].correct++
    }
  }
  const topicData = Object.entries(topicMap).map(([topic, { total, correct }]) => ({
    topic,
    total,
    correct,
    accuracy: total > 0 ? correct / total : 0,
  }))

  // 전체 정확도
  const totalCorrect = progress?.filter((p) => p.is_correct).length ?? 0
  const overallAccuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0

  return (
    <div className="min-h-screen bg-bg-game px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">성장 대시보드</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {profile.nickname ?? '탐정'}님의 추론 능력 분석
            </p>
          </div>
          <Link
            href="/levels"
            className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            ← 레벨로
          </Link>
        </div>

        {/* Paywall for free users */}
        {!isPremium && (
          <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
            <p className="text-amber-300 font-semibold mb-2">프리미엄 전용 기능이에요</p>
            <p className="text-slate-400 text-sm mb-4">
              구독하면 정확도 추이, 오류 패턴, 힌트 의존도를 분석할 수 있어요.
            </p>
            <Link
              href="/pricing"
              className="inline-block px-6 py-2.5 rounded-lg bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors"
            >
              구독 플랜 보기
            </Link>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          {[
            { label: '전체 문제', value: totalQ, unit: '개' },
            { label: '정답률', value: overallAccuracy, unit: '%' },
            { label: '현재 레벨', value: profile.current_level, unit: '' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center"
            >
              <p className="text-xl sm:text-2xl font-bold text-white">
                {stat.value}
                <span className="text-base font-normal text-slate-400">{stat.unit}</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts — blur for free users, empty state for no data */}
        {!isPremium ? (
          <div className="relative">
            <div className="absolute inset-0 z-10 backdrop-blur-md rounded-xl flex flex-col items-center justify-center gap-3">
              <p className="text-slate-300 font-semibold text-sm">구독 후 확인 가능</p>
              <Link
                href="/pricing"
                className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 text-xs font-bold hover:bg-amber-400 transition-colors"
              >
                구독 플랜 보기
              </Link>
            </div>
            {/* Placeholder charts behind blur */}
            <div className="space-y-4 select-none" aria-hidden>
              <AccuracyChart data={accuracyData.length > 0 ? accuracyData : [{ date: '-', accuracy: 0, level: 1 }]} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ErrorPatternCard patterns={[]} />
                <HintDependencyChart totalQuestions={0} questionsWithHints={0} avgHintsPerQuestion={0} />
              </div>
              <TopicAnalysisCard data={[]} />
            </div>
          </div>
        ) : totalQ === 0 || totalQ < 5 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-3">
              <BookOpen size={20} className="text-slate-500" />
            </div>
            <p className="text-slate-400 font-medium text-sm mb-1">
              {totalQ === 0 ? '아직 풀어본 문제가 없어요' : `${totalQ}문제 풀었어요!`}
            </p>
            <p className="text-slate-600 text-xs mb-4">
              {totalQ === 0
                ? '문제를 풀면 여기서 성장 그래프를 확인할 수 있어요.'
                : '최소 5문제를 풀면 의미 있는 분석이 시작돼요. 조금만 더 풀어보세요!'}
            </p>
            <Link
              href="/levels"
              className="inline-block px-5 py-2 rounded-lg bg-amber-500 text-slate-900 text-xs font-bold hover:bg-amber-400 transition-colors"
            >
              문제 풀러 가기
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <AccuracyChart data={accuracyData} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ErrorPatternCard patterns={errorPatternData} />
              <HintDependencyChart
                totalQuestions={totalQ}
                questionsWithHints={withHints}
                avgHintsPerQuestion={avgHints}
              />
            </div>
            <TopicAnalysisCard data={topicData} />

            {/* 약점 주제 집중 훈련 CTA */}
            {topicData.length > 0 && (() => {
              const weakest = [...topicData].sort((a, b) => a.accuracy - b.accuracy)[0]
              if (!weakest || weakest.accuracy >= 0.8) return null
              const TOPIC_LABELS: Record<string, string> = {
                humanities: '인문', social: '사회', science: '과학', tech: '기술', arts: '예술',
              }
              return (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-amber-300">
                      약점 주제: {TOPIC_LABELS[weakest.topic] ?? weakest.topic}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      정답률 {Math.round(weakest.accuracy * 100)}% — 집중 연습으로 개선해보세요
                    </p>
                  </div>
                  <Link
                    href="/levels"
                    className="shrink-0 px-4 py-2 rounded-lg bg-amber-500 text-slate-900 text-xs font-bold hover:bg-amber-400 transition-colors"
                  >
                    연습하기
                  </Link>
                </div>
              )
            })()}
          </div>
        )}

        {/* Invite section */}
        {profile.invite_code && (
          <InviteSection
            inviteCode={profile.invite_code}
            appUrl={process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}
            isPremium={isPremium}
          />
        )}
      </div>
    </div>
  )
}
