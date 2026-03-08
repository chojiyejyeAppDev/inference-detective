import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import AccuracyChart from '@/components/dashboard/AccuracyChart'
import ErrorPatternCard from '@/components/dashboard/ErrorPatternCard'
import HintDependencyChart from '@/components/dashboard/HintDependencyChart'
import TopicAnalysisCard from '@/components/dashboard/TopicAnalysisCard'
import InviteSection from '@/components/dashboard/InviteSection'
import Link from 'next/link'
import { BookOpen, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react'

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

  // 최근 30일 세션 + 전체 진행 데이터 병렬 조회
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [{ data: sessions }, { data: progress }, { data: subscription }] = await Promise.all([
    service
      .from('level_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true }),
    service
      .from('user_progress')
      .select('*, questions(correct_chain, topic)')
      .eq('user_id', user.id),
    service
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const isWeeklyPlan = subscription?.plan === 'weekly'

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

  // 정확도 추세 계산 (최근 5세션 vs 이전 5세션)
  const recentSessions = sessions?.slice(-5) ?? []
  const olderSessions = sessions?.slice(-10, -5) ?? []
  const recentAvg = recentSessions.length > 0
    ? recentSessions.reduce((s, r) => s + Number(r.accuracy), 0) / recentSessions.length
    : 0
  const olderAvg = olderSessions.length > 0
    ? olderSessions.reduce((s, r) => s + Number(r.accuracy), 0) / olderSessions.length
    : 0
  const accuracyTrend: 'improving' | 'declining' | 'stable' =
    olderSessions.length < 3 ? 'stable'
      : recentAvg - olderAvg > 0.05 ? 'improving'
      : olderAvg - recentAvg > 0.05 ? 'declining'
      : 'stable'

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
              className="inline-block px-6 py-2.5 rounded-xl bg-amber-500 text-slate-900 text-sm font-bold hover:bg-amber-400 transition-colors"
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
              className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center card-elevated"
            >
              <p className="text-xl sm:text-2xl font-bold text-white">
                {stat.value}
                <span className="text-base font-normal text-slate-400">{stat.unit}</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
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
            <p className="text-slate-500 text-xs mb-4">
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

            {/* 다음 추천 행동 */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 card-elevated">
              <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
                <Target size={14} className="text-amber-400" />
                다음 추천
              </h3>
              <div className="space-y-3">
                {/* 정확도 추세 */}
                {accuracyTrend === 'improving' && (
                  <div className="flex items-start gap-2.5">
                    <TrendingUp size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-300">정확도가 올라가고 있어요!</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {profile.current_level < 7
                          ? `레벨 ${profile.current_level}에서 80% 이상 3회 연속 달성하면 레벨업!`
                          : '마스터 레벨에서 꾸준히 성장 중이에요.'}
                      </p>
                    </div>
                  </div>
                )}
                {accuracyTrend === 'declining' && (
                  <div className="flex items-start gap-2.5">
                    <TrendingDown size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-300">힌트를 활용해보세요</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        최근 정답률이 낮아지고 있어요. 힌트로 논리 흐름을 확인하면 도움이 돼요.
                      </p>
                    </div>
                  </div>
                )}

                {/* 약점 주제 */}
                {topicData.length > 0 && (() => {
                  const weakest = [...topicData].sort((a, b) => a.accuracy - b.accuracy)[0]
                  if (!weakest || weakest.accuracy >= 0.8) return null
                  const TOPIC_LABELS: Record<string, string> = {
                    humanities: '인문', social: '사회', science: '과학', tech: '기술', arts: '예술',
                  }
                  return (
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-500/5 border border-amber-500/20 px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <Zap size={14} className="text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-amber-300">
                            약점 주제: {TOPIC_LABELS[weakest.topic] ?? weakest.topic}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            정답률 {Math.round(weakest.accuracy * 100)}% — 집중 연습으로 개선해보세요
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/levels?focus_topic=${weakest.topic}`}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-900 text-[11px] font-bold hover:bg-amber-400 transition-colors"
                      >
                        연습하기
                      </Link>
                    </div>
                  )
                })()}

                {/* 레벨업 가이드 */}
                {profile.current_level < 7 && overallAccuracy >= 70 && (
                  <div className="flex items-start gap-2.5">
                    <Target size={14} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-300">
                        레벨 {profile.current_level + 1}을 향해
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        레벨 {profile.current_level}에서 정확도 80% 이상을 3회 연속 달성하면 다음 레벨이 열려요.
                      </p>
                    </div>
                  </div>
                )}

                {/* 바로 연습하기 링크 */}
                <Link
                  href="/levels"
                  className="block text-center text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors pt-1"
                >
                  연습하러 가기 →
                </Link>
              </div>
            </div>

            {/* 주간→월간 업셀 */}
            {isWeeklyPlan && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-amber-300">월간 구독으로 전환하세요</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    월 ₩9,900으로 매일 무제한 문제를 풀 수 있어요. 주간 이용권보다 60% 이상 저렴해요.
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="shrink-0 px-4 py-2 rounded-lg bg-amber-500 text-slate-900 text-xs font-bold hover:bg-amber-400 transition-colors"
                >
                  플랜 변경
                </Link>
              </div>
            )}
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
