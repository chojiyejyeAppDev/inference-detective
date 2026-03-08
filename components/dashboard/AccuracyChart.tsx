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
      <div className="border border-exam-rule bg-white px-3 py-2 text-xs shadow-sm">
        <p className="text-stone-400 mb-1">{label}</p>
        <p className="text-exam-ink font-semibold">
          정확도: {Math.round(payload[0].value * 100)}%
        </p>
        <p className="text-stone-500">레벨 {payload[0].payload.level}</p>
      </div>
    )
  }
  return null
}

export default function AccuracyChart({ data }: AccuracyChartProps) {
  return (
    <div className="border border-exam-rule bg-white p-5">
      <h3 className="text-sm font-exam-serif font-semibold text-exam-ink mb-4">정확도 추이</h3>
      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-stone-500 text-sm">
          아직 데이터가 없어요. 문제를 풀어보세요!
        </div>
      ) : data.length < 3 ? (
        <div className="h-40 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-3">
            {data.map((d, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-black text-exam-ink">{Math.round(d.accuracy * 100)}%</p>
                <p className="text-[10px] text-stone-500 mt-0.5">{d.date}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-500 mt-1">{3 - data.length}문제 더 풀면 추이 그래프가 나타나요</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180} aria-label="정확도 추이 차트">
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E0" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#78716C', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              tick={{ fill: '#78716C', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke="#1C1917"
              strokeWidth={2}
              dot={{ fill: '#C22D2D', r: 3 }}
              activeDot={{ r: 5, fill: '#C22D2D' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
