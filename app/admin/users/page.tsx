import { createClient } from '@/lib/supabase/server'

interface Profile {
  id: string
  nickname: string | null
  subscription_status: string
  current_level: number
  daily_questions_used: number
  created_at: string
  role: string
}

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, nickname, subscription_status, current_level, daily_questions_used, created_at, role')
    .order('created_at', { ascending: false })
    .limit(100)

  const profiles = (users as Profile[]) ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-exam-ink">사용자 관리</h1>
      <p className="text-sm text-stone-500">최근 가입 순 (최대 100명)</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-exam-rule text-left">
              <th className="py-3 px-2 text-stone-500 font-medium">닉네임</th>
              <th className="py-3 px-2 text-stone-500 font-medium">역할</th>
              <th className="py-3 px-2 text-stone-500 font-medium">구독</th>
              <th className="py-3 px-2 text-stone-500 font-medium">레벨</th>
              <th className="py-3 px-2 text-stone-500 font-medium">오늘 풀이</th>
              <th className="py-3 px-2 text-stone-500 font-medium">가입일</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((u) => (
              <tr key={u.id} className="border-b border-exam-rule hover:bg-stone-100">
                <td className="py-3 px-2 text-exam-ink">{u.nickname ?? '(미설정)'}</td>
                <td className="py-3 px-2">
                  <span className={`text-xs px-2 py-0.5 ${
                    u.role === 'admin'
                      ? 'bg-stone-100 text-exam-red'
                      : 'bg-stone-100 text-stone-500'
                  }`}>
                    {u.role ?? 'user'}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <span className={`text-xs px-2 py-0.5 ${
                    u.subscription_status === 'active'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-stone-100 text-stone-500'
                  }`}>
                    {u.subscription_status}
                  </span>
                </td>
                <td className="py-3 px-2 text-stone-700">{u.current_level}</td>
                <td className="py-3 px-2 text-stone-700">{u.daily_questions_used}</td>
                <td className="py-3 px-2 text-stone-400 text-xs">
                  {new Date(u.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {profiles.length === 0 && (
          <p className="text-center text-stone-400 py-8">사용자가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
