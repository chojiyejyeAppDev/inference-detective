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
    <div className="min-h-screen bg-bg-base text-exam-ink">
      {/* Admin Nav */}
      <nav className="border-b border-exam-rule bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <Link href="/admin" className="text-exam-red font-bold text-sm tracking-widest uppercase">
            Admin
          </Link>
          <Link href="/admin/questions" className="text-xs text-stone-500 hover:text-exam-ink transition-colors">
            문제 관리
          </Link>
          <Link href="/admin/questions/generate" className="text-xs text-stone-500 hover:text-exam-ink transition-colors">
            AI 생성
          </Link>
          <Link href="/admin/users" className="text-xs text-stone-500 hover:text-exam-ink transition-colors">
            사용자
          </Link>
          <div className="flex-1" />
          <Link href="/levels" className="text-xs text-stone-400 hover:text-stone-700 transition-colors">
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
