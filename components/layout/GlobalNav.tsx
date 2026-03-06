'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, BarChart3, CreditCard, LogOut, Menu, X, BookMarked } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'

const NAV_ITEMS = [
  { href: '/levels', label: '레벨', icon: LayoutGrid },
  { href: '/review', label: '오답 노트', icon: BookMarked },
  { href: '/dashboard', label: '대시보드', icon: BarChart3 },
  { href: '/pricing', label: '구독', icon: CreditCard },
]

export default function GlobalNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const drawerRef = useFocusTrap<HTMLDivElement>(isOpen)

  // Hide nav on landing, auth pages
  const hiddenPaths = ['/', '/login', '/signup', '/admin']
  const isHidden = hiddenPaths.some((p) => pathname === p || pathname.startsWith('/admin'))
  // Compact mode on game play page
  const isCompact = pathname.startsWith('/play/')

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
    })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  if (isHidden || !isLoggedIn) return null

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

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
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button
            onClick={handleLogout}
            aria-label="로그아웃"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={13} />
            로그아웃
          </button>
        </div>
      </nav>

      {/* Mobile nav trigger */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="네비게이션 열기"
        className="sm:hidden fixed top-3 right-3 z-50 p-2.5 rounded-lg border border-slate-700/80 bg-slate-800/90 backdrop-blur-sm text-slate-400 shadow-lg shadow-black/30"
      >
        <Menu size={18} />
      </button>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="sm:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="네비게이션 메뉴"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="sm:hidden fixed top-0 right-0 bottom-0 z-[61] w-64 border-l border-slate-700 bg-slate-900 p-5 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-base font-black text-white">이:르다</span>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="네비게이션 닫기"
                  className="p-2.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(href + '/')
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={[
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'text-slate-300 hover:bg-slate-800',
                      ].join(' ')}
                    >
                      <Icon size={16} />
                      {label}
                    </Link>
                  )
                })}
              </div>

              <div className="mt-auto pt-4 border-t border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={16} />
                  로그아웃
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer for fixed nav */}
      <div className="h-12 sm:h-11" />
    </>
  )
}
