import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LevelGrid from '@/components/level/LevelGrid'

export default async function LevelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_level, subscription_status, daily_questions_used, hint_points')
    .eq('id', user.id)
    .single()

  return (
    <LevelGrid
      currentLevel={profile?.current_level ?? 1}
      subscriptionStatus={profile?.subscription_status ?? 'free'}
      dailyUsed={profile?.daily_questions_used ?? 0}
      hintPoints={profile?.hint_points ?? 10}
    />
  )
}
