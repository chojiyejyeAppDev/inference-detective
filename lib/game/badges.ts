import { SupabaseClient } from '@supabase/supabase-js'

interface BadgeDef {
  id: string
  condition_type: string
  condition_value: number
}

/**
 * Check and award badges after a question is evaluated.
 * Returns array of newly earned badge IDs.
 */
export async function checkAndAwardBadges(
  supabase: SupabaseClient,
  userId: string,
  context: {
    totalSolved: number
    streak: number
    recentAccuracy: number | null // 0-1, based on last 20
    currentLevel: number
    isCorrect: boolean
    levelUp: boolean
  },
): Promise<string[]> {
  // Fetch all badge definitions
  const { data: allBadges } = await supabase
    .from('badges')
    .select('id, condition_type, condition_value')

  if (!allBadges || allBadges.length === 0) return []

  // Fetch user's existing badges
  const { data: existingBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId)

  const earnedSet = new Set((existingBadges ?? []).map((b) => b.badge_id))
  const newBadges: string[] = []

  for (const badge of allBadges as BadgeDef[]) {
    if (earnedSet.has(badge.id)) continue

    let qualifies = false

    switch (badge.condition_type) {
      case 'total_solved':
        qualifies = context.totalSolved >= badge.condition_value
        break
      case 'streak':
        qualifies = context.streak >= badge.condition_value
        break
      case 'accuracy_rate':
        qualifies = context.recentAccuracy !== null &&
          context.recentAccuracy * 100 >= badge.condition_value
        break
      case 'level_reached':
        qualifies = context.currentLevel >= badge.condition_value
        break
      case 'perfect_score':
        qualifies = context.isCorrect // perfect_score checked per-session elsewhere
        break
      default:
        break
    }

    if (qualifies) {
      newBadges.push(badge.id)
    }
  }

  // Award new badges
  if (newBadges.length > 0) {
    await supabase.from('user_badges').insert(
      newBadges.map((badgeId) => ({
        user_id: userId,
        badge_id: badgeId,
      })),
    )
  }

  return newBadges
}

/**
 * Check invite-based badges (called from invite/redeem).
 */
export async function checkInviteBadges(
  supabase: SupabaseClient,
  inviterId: string,
): Promise<string[]> {
  const { data: invites } = await supabase
    .from('invitations')
    .select('id')
    .eq('inviter_id', inviterId)

  const inviteCount = invites?.length ?? 0

  const { data: allBadges } = await supabase
    .from('badges')
    .select('id, condition_type, condition_value')
    .eq('condition_type', 'invites')

  if (!allBadges) return []

  const { data: existing } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', inviterId)

  const earnedSet = new Set((existing ?? []).map((b) => b.badge_id))
  const newBadges: string[] = []

  for (const badge of allBadges as BadgeDef[]) {
    if (earnedSet.has(badge.id)) continue
    if (inviteCount >= badge.condition_value) {
      newBadges.push(badge.id)
    }
  }

  if (newBadges.length > 0) {
    await supabase.from('user_badges').insert(
      newBadges.map((badgeId) => ({
        user_id: inviterId,
        badge_id: badgeId,
      })),
    )
  }

  return newBadges
}
