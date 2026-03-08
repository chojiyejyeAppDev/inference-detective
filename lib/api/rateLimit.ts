import { NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
let lastCleanup = Date.now()
function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < 5 * 60 * 1000) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}

/**
 * In-memory rate limiter for Vercel serverless.
 * Not shared across instances — protects against burst from a single instance.
 * For distributed rate limiting, use @upstash/ratelimit.
 */
export function rateLimit(
  identifier: string,
  { max, windowMs }: { max: number; windowMs: number },
): { limited: boolean; remaining: number } {
  cleanup()
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || entry.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + windowMs })
    return { limited: false, remaining: max - 1 }
  }

  entry.count++
  if (entry.count > max) {
    return { limited: true, remaining: 0 }
  }

  return { limited: false, remaining: max - entry.count }
}

/** Standard rate limit response */
export function rateLimitResponse() {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429 },
  )
}
