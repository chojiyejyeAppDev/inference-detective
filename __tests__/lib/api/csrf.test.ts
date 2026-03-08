import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock process.env before importing
vi.stubEnv('NODE_ENV', 'production')
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://inference-detective.vercel.app')

// Must import after env is set
const { checkCsrf } = await import('@/lib/api/csrf')

function makeRequest(method: string, origin?: string) {
  const headers = new Headers()
  if (origin) headers.set('origin', origin)
  return {
    method,
    headers: {
      get: (name: string) => headers.get(name),
    },
  } as unknown as import('next/server').NextRequest
}

describe('checkCsrf', () => {
  it('allows GET requests', () => {
    const result = checkCsrf(makeRequest('GET', 'https://evil.com'))
    expect(result).toBeNull()
  })

  it('allows HEAD requests', () => {
    const result = checkCsrf(makeRequest('HEAD', 'https://evil.com'))
    expect(result).toBeNull()
  })

  it('allows POST with valid origin', () => {
    const result = checkCsrf(makeRequest('POST', 'https://inference-detective.vercel.app'))
    expect(result).toBeNull()
  })

  it('allows POST without origin header (same-origin)', () => {
    const result = checkCsrf(makeRequest('POST'))
    expect(result).toBeNull()
  })

  it('rejects POST with invalid origin', () => {
    const result = checkCsrf(makeRequest('POST', 'https://evil.com'))
    expect(result).not.toBeNull()
    // Check it's a 403 response
    if (result) {
      expect(result.status).toBe(403)
    }
  })

  it('rejects PUT with invalid origin', () => {
    const result = checkCsrf(makeRequest('PUT', 'https://attacker.example.com'))
    expect(result).not.toBeNull()
  })

  it('rejects DELETE with invalid origin', () => {
    const result = checkCsrf(makeRequest('DELETE', 'https://attacker.example.com'))
    expect(result).not.toBeNull()
  })
})
