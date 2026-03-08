'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const TOPIC_LABELS: Record<string, string> = {
  humanities: '인문',
  social: '사회',
  science: '과학',
  tech: '기술',
  arts: '예술',
}

const TOPIC_COLORS: Record<string, string> = {
  humanities: '#1C1917',
  social: '#57534E',
  science: '#16a34a',
  tech: '#78716C',
  arts: '#C22D2D',
}

interface TopicStat {
  topic: string
  total: number
  correct: number
  accuracy: number
}

interface TopicAnalysisCardProps {
  data: TopicStat[]
}

interface TooltipPayloadItem {
  value: number
  payload: TopicStat
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (active && payload?.length) {
    const d = payload[0].payload
    return (
      <div className="border border-exam-rule bg-white px-3 py-2 text-xs shadow-sm">
        <p className="text-exam-ink font-semibold mb-1">{TOPIC_LABELS[d.topic] ?? d.topic}</p>
        <p className="text-exam-ink">정답률: {Math.round(d.accuracy * 100)}%</p>
        <p className="text-stone-500">{d.correct}/{d.total}문제 정답</p>
      </div>
    )
  }
  return null
}

export default function TopicAnalysisCard({ data }: TopicAnalysisCardProps) {
  const sorted = [...data].sort((a, b) => a.accuracy - b.accuracy)
  const weakest = sorted.length > 0 ? sorted[0] : null

  return (
    <div className="border border-exam-rule bg-white p-5">
      <h3 className="text-sm font-exam-serif font-semibold text-exam-ink mb-1">주제별 정답률</h3>
      <p className="text-xs text-stone-500 mb-4">어떤 주제가 약한지 파악하세요</p>

      {data.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-stone-500 text-sm">
          아직 데이터가 없어요
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={150} aria-label="주제별 정확도 차트">
          <BarChart data={data} margin={{ top: 0, right: 5, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="topic"
              tickFormatter={(v) => TOPIC_LABELS[v] ?? v}
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
            <Bar dataKey="accuracy" radius={[0, 0, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.topic} fill={TOPIC_COLORS[entry.topic] ?? '#78716C'} opacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {weakest && weakest.total >= 2 && (
        <p className="text-xs text-stone-500 mt-3">
          가장 약한 주제:{' '}
          <span className="font-medium text-exam-red">
            {TOPIC_LABELS[weakest.topic] ?? weakest.topic}
          </span>
          <span className="text-stone-500"> ({Math.round(weakest.accuracy * 100)}%)</span>
        </p>
      )}
    </div>
  )
}
