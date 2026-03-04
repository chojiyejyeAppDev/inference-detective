import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import AccuracyChart from '@/components/dashboard/AccuracyChart'
import ErrorPatternCard from '@/components/dashboard/ErrorPatternCard'
import HintDependencyChart from '@/components/dashboard/HintDependencyChart'
import InviteSection from '@/components/dashboard/InviteSection'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const service = await createServiceClient()

  const { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isPremium = profile.subscription_status === 'active'

  // 최근 30일 세션 데이터
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: sessions } = await service
    .from('level_sessions')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true })

  // 전체 진행 데이터
  const { data: progress } = await service
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)

  // 차트 데이터 변환
  const accuracyData = (sessions ?? []).map((s) => ({
    date: new Date(s.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    accuracy: s.accuracy,
    level: s.level,
  }))

  // 오류 패턴: 틀린 문제의 슬롯 위치 분석
  const errorPatterns: Record<string, number> = {}
  for (const p of progress ?? []) {
    if (!p.is_correct && p.submitted_chain) {
      const chain = p.submitted_chain as (string | null)[]
      chain.forEach((_, idx) => {
        const key = `슬롯 ${idx + 1}`
        errorPatterns[key] = (errorPatterns[key] ?? 0) + 1
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

  // 전체 정확도
  const totalCorrect = progress?.filter((p) => p.is_correct).length ?? 0
  const overallAccuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0

  return (
    <div className="min-h-screen bg-[#0F172A] px-6 py-10">
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
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: '전체 문제', value: totalQ, unit: '개' },
            { label: '정답률', value: overallAccuracy, unit: '%' },
            { label: '현재 레벨', value: profile.current_level, unit: '' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center"
            >
              <p className="text-2xl font-bold text-white">
                {stat.value}
                <span className="text-base font-normal text-slate-400">{stat.unit}</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts — blur for free users */}
        <div className={isPremium ? '' : 'relative'}>
          {!isPremium && (
            <div className="absolute inset-0 z-10 backdrop-blur-md rounded-xl flex items-center justify-center">
              <p className="text-slate-400 text-sm font-medium">구독 후 확인 가능</p>
            </div>
          )}
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
          </div>
        </div>

        {/* Invite section */}
        {profile.invite_code && (
          <InviteSection
            inviteCode={profile.invite_code}
            appUrl={process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}
          />
        )}
      </div>
    </div>
  )
}
