import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = [
  'https://inference-detective.vercel.app',
  'https://www.inference-detective.vercel.app',
]

if (process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:3000')
}

// Add custom domain if configured
const appUrl = process.env.NEXT_PUBLIC_APP_URL
if (appUrl && !ALLOWED_ORIGINS.includes(appUrl)) {
  ALLOWED_ORIGINS.push(appUrl)
}

/**
 * Validates Origin header for state-changing requests (POST, PUT, DELETE, PATCH).
 * Returns a 403 response if origin is invalid, or null if valid.
 */
export function checkCsrf(req: NextRequest): NextResponse | null {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return null
  }

  const origin = req.headers.get('origin')

  // Allow requests without origin (same-origin navigations, server-to-server)
  if (!origin) return null

  if (!ALLOWED_ORIGINS.some((allowed) => origin === allowed)) {
    return NextResponse.json(
      { error: 'Forbidden: invalid origin' },
      { status: 403 },
    )
  }

  return null
}
