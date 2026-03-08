import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { subscription: { endpoint: string; keys: { p256dh: string; auth: string } } }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { subscription } = body
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 })
  }

  const service = await createServiceClient()

  // Upsert subscription
  const { error } = await service
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: 'user_id,endpoint' },
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { endpoint: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
  }

  const service = await createServiceClient()
  await service
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', body.endpoint)

  return NextResponse.json({ success: true })
}
