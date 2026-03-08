import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Supabase 환경변수 없으면 미들웨어 스킵 (로컬 개발 시에만)
  if (
    process.env.NODE_ENV === 'development' &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
     process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))
  ) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase 장애 시 페이지 접근 허용 (API에서 개별 인증 체크)
    return supabaseResponse
  }

  // 인증 필요 경로
  const protectedPaths = ['/levels', '/play', '/dashboard']
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 이미 로그인한 경우 auth 페이지 접근 차단
  const authPaths = ['/login', '/signup']
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p))

  if (isAuthPage && user) {
    const levelsUrl = request.nextUrl.clone()
    levelsUrl.pathname = '/levels'
    return NextResponse.redirect(levelsUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|auth/callback).*)',
  ],
}
