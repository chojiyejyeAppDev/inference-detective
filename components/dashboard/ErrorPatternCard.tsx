'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface ErrorPattern {
  position: string
  count: number
  label: string
}

interface ErrorPatternCardProps {
  patterns: ErrorPattern[]
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-xl">
        <p className="text-slate-400">{payload[0].payload.label}</p>
        <p className="text-red-400 font-semibold">{payload[0].value}회 오류</p>
      </div>
    )
  }
  return null
}

export default function ErrorPatternCard({ patterns }: ErrorPatternCardProps) {
  const topErrors = [...patterns].sort((a, b) => b.count - a.count).slice(0, 5)

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-1">오류 패턴 분석</h3>
      <p className="text-xs text-slate-600 mb-4">어느 단계에서 자주 실수하나요?</p>

      {patterns.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-slate-600 text-sm">
          아직 데이터가 없어요
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={topErrors} margin={{ top: 0, right: 5, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="position"
              tick={{ fill: '#64748B', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748B', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#EF4444" opacity={0.7} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {topErrors.length > 0 && (
        <p className="text-xs text-slate-500 mt-3">
          가장 자주 틀리는 위치:{' '}
          <span className="text-red-400 font-medium">{topErrors[0].label}</span>
        </p>
      )}
    </div>
  )
}
