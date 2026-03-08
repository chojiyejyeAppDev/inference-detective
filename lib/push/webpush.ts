import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? 'mailto:eonlab.official@gmail.com'

// Only initialize when both keys are present and look valid (URL-safe base64, no "=")
if (VAPID_PUBLIC_KEY.length > 10 && VAPID_PRIVATE_KEY.length > 10) {
  try {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  } catch {
    // VAPID keys not configured or invalid — push notifications disabled
  }
}

interface PushPayload {
  title: string
  body: string
  icon?: string
  url?: string
  tag?: string
}

/**
 * Send push notification to a specific user.
 * Returns number of successfully sent notifications.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return 0

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subscriptions || subscriptions.length === 0) return 0

  let sent = 0
  const expiredIds: string[] = []

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      )
      sent++
    } catch (err: unknown) {
      // 410 Gone or 404 = subscription expired, clean up
      if (err && typeof err === 'object' && 'statusCode' in err) {
        const statusCode = (err as { statusCode: number }).statusCode
        if (statusCode === 410 || statusCode === 404) {
          expiredIds.push(sub.id)
        }
      }
    }
  }

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('id', expiredIds)
  }

  return sent
}

/**
 * Send push to multiple users (batch, for cron jobs).
 */
export async function sendPushBatch(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  let totalSent = 0
  let totalFailed = 0

  for (const userId of userIds) {
    try {
      const sent = await sendPushToUser(userId, payload)
      if (sent > 0) totalSent++
      else totalFailed++
    } catch {
      totalFailed++
    }
  }

  return { sent: totalSent, failed: totalFailed }
}
