import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LevelGrid from '@/components/level/LevelGrid'
import { LEVEL_UP_SESSIONS, LEVEL_UP_ACCURACY } from '@/lib/game/levelConfig'

export default async function LevelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_level, subscription_status, subscription_expires_at, daily_questions_used, hint_points, role, streak_days, longest_streak, streak_freeze_count, last_active_date')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const currentLevel = isAdmin ? 7 : (profile?.current_level ?? 1)

  // 현재 레벨의 레벨업 진행 상황 조회
  let qualifiedSessions = 0
  if (currentLevel < 7) {
    const { data: recentSessions } = await supabase
      .from('level_sessions')
      .select('accuracy')
      .eq('user_id', user.id)
      .eq('level', currentLevel)
      .order('created_at', { ascending: false })
      .limit(LEVEL_UP_SESSIONS)

    qualifiedSessions = (recentSessions ?? []).filter(
      (s) => Number(s.accuracy) >= LEVEL_UP_ACCURACY,
    ).length
  }

  // Calculate if streak is at risk (last_active_date is yesterday or earlier)
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const todayKST = kstNow.toISOString().split('T')[0]
  const lastActive = profile?.last_active_date ?? null
  const streakAtRisk = lastActive !== null && lastActive !== todayKST && (profile?.streak_days ?? 0) > 0

  return (
    <LevelGrid
      currentLevel={currentLevel}
      subscriptionStatus={isAdmin ? 'active' : (profile?.subscription_status ?? 'free')}
      subscriptionExpiresAt={profile?.subscription_expires_at ?? null}
      dailyUsed={isAdmin ? 0 : (profile?.daily_questions_used ?? 0)}
      hintPoints={profile?.hint_points ?? 10}
      levelProgress={{ qualified: qualifiedSessions, required: LEVEL_UP_SESSIONS }}
      streakDays={profile?.streak_days ?? 0}
      longestStreak={profile?.longest_streak ?? 0}
      streakFreezeCount={profile?.streak_freeze_count ?? 0}
      streakAtRisk={streakAtRisk}
      streak={profile?.streak_days ?? 0}
    />
  )
}
