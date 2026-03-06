'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  date: string
  accuracy: number
  level: number
}

interface AccuracyChartProps {
  data: DataPoint[]
}

interface TooltipPayloadItem {
  value: number
  payload: { level: number }
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-xl">
        <p className="text-slate-400 mb-1">{label}</p>
        <p className="text-amber-400 font-semibold">
          정확도: {Math.round(payload[0].value * 100)}%
        </p>
        <p className="text-slate-500">레벨 {payload[0].payload.level}</p>
      </div>
    )
  }
  return null
}

export default function AccuracyChart({ data }: AccuracyChartProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">정확도 추이</h3>
      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-slate-600 text-sm">
          아직 데이터가 없어요. 문제를 풀어보세요!
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180} aria-label="정확도 추이 차트">
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#64748B', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              tick={{ fill: '#64748B', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ fill: '#F59E0B', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
