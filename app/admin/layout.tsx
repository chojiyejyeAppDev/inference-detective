import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/levels')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Admin Nav */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <Link href="/admin" className="text-amber-400 font-bold text-sm tracking-widest uppercase">
            Admin
          </Link>
          <Link href="/admin/questions" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
            문제 관리
          </Link>
          <Link href="/admin/questions/generate" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
            AI 생성
          </Link>
          <Link href="/admin/papers" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
            논문 관리
          </Link>
          <Link href="/admin/users" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
            사용자
          </Link>
          <div className="flex-1" />
          <Link href="/levels" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            게임으로 돌아가기
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
