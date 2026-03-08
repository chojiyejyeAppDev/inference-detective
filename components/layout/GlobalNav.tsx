'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, BarChart3, CreditCard, BookMarked, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/levels', label: '레벨', icon: LayoutGrid },
  { href: '/review', label: '오답 노트', icon: BookMarked },
  { href: '/dashboard', label: '대시보드', icon: BarChart3 },
  { href: '/pricing', label: '구독', icon: CreditCard },
  { href: '/settings', label: '설정', icon: Settings },
]

export default function GlobalNav() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Hide nav on landing, auth pages
  const hiddenPaths = ['/', '/login', '/signup', '/admin']
  const isHidden = hiddenPaths.some((p) => pathname === p || pathname.startsWith('/admin'))
  // Compact mode on game play page
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-800/90 backdrop-blur-sm text-slate-400 text-xs hover:text-slate-200 hover:border-slate-600 transition-colors shadow-lg shadow-black/30"
        >
          <LayoutGrid size={12} />
          <span className="hidden sm:inline">레벨 목록</span>
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Desktop nav */}
      <nav aria-label="메인 네비게이션" className="hidden sm:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-6 py-2.5 border-b border-slate-800/80 bg-bg-base/90 backdrop-blur-md">
        <Link href="/levels" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/20">
            <span className="text-slate-900 font-black text-[10px]">르</span>
          </div>
          <span className="text-base font-black text-white tracking-tight">이:르다</span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
                ].join(' ')}
              >
                <Icon size={13} />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="모바일 네비게이션"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800/80 bg-bg-base/95 backdrop-blur-md safe-bottom"
      >
        <div className="flex items-stretch justify-around">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-w-0 flex-1 transition-colors',
                  isActive ? 'text-amber-400' : 'text-slate-500',
                ].join(' ')}
              >
                <Icon size={18} />
                <span className="text-[10px] font-medium leading-none truncate">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Spacer: top for desktop, bottom for mobile */}
      <div className="h-0 sm:h-11" />
      <div className="h-14 sm:h-0" />
    </>
  )
}
