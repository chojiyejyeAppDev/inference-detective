'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, BookOpen, BarChart3, Award, Settings, MoreHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const MOBILE_NAV = [
  { href: '/levels', label: '홈', icon: Home },
  { href: '/review', label: '훈련', icon: BookOpen },
  { href: '/settings', label: '더보기', icon: MoreHorizontal },
]

const DESKTOP_NAV = [
  { href: '/levels', label: '홈', icon: Home },
  { href: '/review', label: '오답 노트', icon: BookOpen },
  { href: '/dashboard', label: '대시보드', icon: BarChart3 },
  { href: '/badges', label: '배지', icon: Award },
  { href: '/settings', label: '설정', icon: Settings },
]

function isMobileTabActive(href: string, pathname: string): boolean {
  switch (href) {
    case '/levels':
      return pathname === '/levels' || pathname.startsWith('/levels/') || pathname === '/badges' || pathname.startsWith('/badges/')
    case '/review':
      return pathname === '/review' || pathname.startsWith('/review/')
    case '/settings':
      return pathname === '/settings' || pathname.startsWith('/settings/')
        || pathname === '/dashboard' || pathname.startsWith('/dashboard/')
        || pathname === '/pricing' || pathname.startsWith('/pricing/')
    default:
      return false
  }
}

function isDesktopTabActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

export default function GlobalNav() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const hiddenPaths = ['/', '/login', '/signup', '/admin']
  const isHidden = hiddenPaths.some((p) => pathname === p || pathname.startsWith('/admin'))
  const isCompact = pathname.startsWith('/play/')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
    })
  }, [])

  if (isHidden || !isLoggedIn) return null

  if (isCompact) {
    return (
      <div className="fixed top-3 left-3 z-50">
        <Link
          href="/levels"
          className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-exam-rule bg-white text-exam-ink text-xs font-medium hover:bg-stone-50 transition-colors shadow-sm"
        >
          <Home size={12} />
          <span className="hidden sm:inline">레벨 목록</span>
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Desktop top nav */}
      <nav aria-label="메인 네비게이션" className="hidden sm:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-6 py-2.5 border-b border-exam-rule bg-bg-base/95 backdrop-blur-sm">
        <Link href="/levels" className="flex items-center gap-2">
          <span className="font-exam-serif text-base font-bold text-exam-ink tracking-tight">이:르다</span>
        </Link>

        <div className="flex items-center gap-0.5">
          {DESKTOP_NAV.map(({ href, label, icon: Icon }) => {
            const isActive = isDesktopTabActive(href, pathname)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-exam-ink text-white'
                    : 'text-stone-500 hover:text-exam-ink hover:bg-stone-100',
                )}
              >
                <Icon size={13} />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Mobile bottom nav — 3 tabs */}
      <nav
        aria-label="모바일 네비게이션"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-exam-rule bg-white/95 backdrop-blur-sm safe-bottom"
      >
        <div className="flex items-stretch justify-around">
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
            const isActive = isMobileTabActive(href, pathname)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-3 px-1 min-w-[125px] flex-1 transition-colors',
                  isActive ? 'text-exam-ink' : 'text-stone-400',
                )}
                style={{ height: 56 }}
              >
                <Icon size={20} />
                <span className="text-[11px] font-semibold leading-none truncate">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Spacer: top for desktop, bottom for mobile */}
      <div className="h-0 sm:h-11" />
      <div className="h-16 sm:h-0" />
    </>
  )
}
