import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = await createServiceClient()

  const { data: profile } = await service
    .from('profiles')
    .select('invite_code')
    .eq('id', user.id)
    .single()

  if (!profile?.invite_code) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteLink = `${appUrl}/signup?ref=${profile.invite_code}`

  // 초대한 사람 수 집계
  const { count } = await service
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('inviter_id', user.id)
    .eq('bonus_granted', true)

  return NextResponse.json({
    invite_code: profile.invite_code,
    invite_link: inviteLink,
    successful_invites: count ?? 0,
  })
}
