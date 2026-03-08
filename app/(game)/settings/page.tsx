import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/settings/SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const service = await createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('nickname, current_level, subscription_status, subscription_expires_at, hint_points, invite_code')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <SettingsForm
      email={user.email ?? ''}
      nickname={profile.nickname ?? ''}
      currentLevel={profile.current_level}
      subscriptionStatus={profile.subscription_status}
      subscriptionExpiresAt={profile.subscription_expires_at}
      hintPoints={profile.hint_points ?? 0}
      inviteCode={profile.invite_code ?? ''}
    />
  )
}
