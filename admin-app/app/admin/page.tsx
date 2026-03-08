import { createClient } from '@/lib/supabase/server'

interface LevelStat {
  difficulty_level: number
  count: number
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [usersRes, questionsRes, subsRes, progressRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('questions').select('difficulty_level'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('user_progress').select('*', { count: 'exact', head: true }),
  ])

  const totalUsers = usersRes.count ?? 0
  const activeSubscriptions = subsRes.count ?? 0
  const totalSessions = progressRes.count ?? 0

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
      <h1 className="text-2xl font-bold text-exam-ink">대시보드</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-exam-rule bg-white p-5">
            <p className="text-xs text-stone-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-exam-red">{s.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-exam-ink mb-4">레벨별 문제 현황</h2>
        <div className="grid grid-cols-7 gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((lvl) => {
            const count = levelCounts[lvl] ?? 0
            const isLow = count < 5
            return (
              <div
                key={lvl}
                className={`border p-4 text-center ${
                  isLow ? 'border-red-500/40 bg-red-50' : 'border-exam-rule bg-white'
                }`}
              >
                <p className="text-xs text-stone-500 mb-1">레벨 {lvl}</p>
                <p className={`text-xl font-bold ${isLow ? 'text-red-400' : 'text-exam-ink'}`}>
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
