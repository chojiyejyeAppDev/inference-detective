import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = await createServiceClient()

  const { data: subscription } = await service
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!subscription) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 404 })
  }

  // Toss Payments는 billing key 비활성화 필요 시 API 호출
  // 현재는 DB에서만 취소 처리 (만료일까지 서비스 제공)
  await service
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('id', subscription.id)

  // 프로필의 subscription_status는 만료일 이후 webhook에서 처리
  // 즉시 취소 원할 경우 아래 주석 해제
  // await service
  //   .from('profiles')
  //   .update({ subscription_status: 'cancelled' })
  //   .eq('id', user.id)

  return NextResponse.json({
    message: '구독이 취소되었어요. 만료일까지 서비스를 이용할 수 있어요.',
    expires_at: subscription.expires_at,
  })
}
