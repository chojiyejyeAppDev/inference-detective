import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = await createServiceClient()

  // 전체 배지 정의 + 유저가 획득한 배지
  const [{ data: allBadges }, { data: userBadges }] = await Promise.all([
    service.from('badges').select('*').order('condition_value', { ascending: true }),
    service.from('user_badges').select('badge_id, earned_at').eq('user_id', user.id),
  ])

  const earnedMap = new Map(
    (userBadges ?? []).map((ub) => [ub.badge_id, ub.earned_at]),
  )

  const badges = (allBadges ?? []).map((badge) => ({
    ...badge,
    earned: earnedMap.has(badge.id),
    earned_at: earnedMap.get(badge.id) ?? null,
  }))

  return NextResponse.json({
    badges,
    total: allBadges?.length ?? 0,
    earned: userBadges?.length ?? 0,
  })
}
