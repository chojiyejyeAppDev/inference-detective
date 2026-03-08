'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, BarChart3, CreditCard, BookMarked, Settings, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/levels', label: '레벨', icon: LayoutGrid },
  { href: '/badges', label: '배지', icon: Award },
  { href: '/review', label: '오답 노트', icon: BookMarked },
  { href: '/dashboard', label: '대시보드', icon: BarChart3 },
  { href: '/pricing', label: '구독', icon: CreditCard },
  { href: '/settings', label: '설정', icon: Settings },
]

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
          <LayoutGrid size={12} />
          <span className="hidden sm:inline">레벨 목록</span>
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Desktop nav */}
      <nav aria-label="메인 네비게이션" className="hidden sm:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-6 py-2.5 border-b border-exam-rule bg-bg-base/95 backdrop-blur-sm">
        <Link href="/levels" className="flex items-center gap-2">
          <span className="font-exam-serif text-base font-bold text-exam-ink tracking-tight">이:르다</span>
        </Link>

        <div className="flex items-center gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-exam-ink text-white'
                    : 'text-stone-500 hover:text-exam-ink hover:bg-stone-100',
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
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-exam-rule bg-white/95 backdrop-blur-sm safe-bottom"
      >
        <div className="flex items-stretch justify-around">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 min-w-0 flex-1 transition-colors',
                  isActive ? 'text-exam-ink' : 'text-stone-400',
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
