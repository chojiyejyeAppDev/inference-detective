import { createClient } from '@/lib/supabase/server'

interface LevelStat {
  difficulty_level: number
  count: number
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Fetch stats in parallel
  const [usersRes, questionsRes, subsRes, progressRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('questions').select('difficulty_level'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('user_progress').select('*', { count: 'exact', head: true }),
  ])

  const totalUsers = usersRes.count ?? 0
  const activeSubscriptions = subsRes.count ?? 0
  const totalSessions = progressRes.count ?? 0

  // Count questions per level
  const levelCounts: Record<number, number> = {}
  if (questionsRes.data) {
    for (const q of questionsRes.data) {
      const lvl = (q as LevelStat).difficulty_level
      levelCounts[lvl] = (levelCounts[lvl] ?? 0) + 1
    }
  }
  const totalQuestions = questionsRes.data?.length ?? 0

  const stats = [
    { label: '총 사용자', value: totalUsers },
    { label: '유료 구독', value: activeSubscriptions },
    { label: '총 문제 수', value: totalQuestions },
    { label: '총 풀이 수', value: totalSessions },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-100">대시보드</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-amber-400">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Questions per level */}
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">레벨별 문제 현황</h2>
        <div className="grid grid-cols-7 gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((lvl) => {
            const count = levelCounts[lvl] ?? 0
            const isLow = count < 5
            return (
              <div
                key={lvl}
                className={`rounded-lg border p-4 text-center ${
                  isLow
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-slate-800 bg-slate-900/50'
                }`}
              >
                <p className="text-xs text-slate-400 mb-1">레벨 {lvl}</p>
                <p className={`text-xl font-bold ${isLow ? 'text-red-400' : 'text-slate-200'}`}>
                  {count}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
