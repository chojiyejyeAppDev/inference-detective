'use client'

// SVG-based gauge used instead of Recharts radial chart

interface HintDependencyChartProps {
  totalQuestions: number
  questionsWithHints: number
  avgHintsPerQuestion: number
}

export default function HintDependencyChart({
  totalQuestions,
  questionsWithHints,
  avgHintsPerQuestion,
}: HintDependencyChartProps) {
  const dependencyRate = totalQuestions > 0
    ? Math.round((questionsWithHints / totalQuestions) * 100)
    : 0

  const color = dependencyRate <= 30
    ? '#16a34a'  // green-600: 독립적
    : dependencyRate <= 60
      ? '#1C1917'  // ink: 중간
      : '#C22D2D'  // red: 의존적

  const label = dependencyRate <= 30
    ? '우수 — 독립적으로 풀고 있어요'
    : dependencyRate <= 60
      ? '보통 — 힌트에 의존하는 경향이 있어요'
      : '주의 — 힌트 의존도가 높아요'

  return (
    <div className="border border-exam-rule bg-white p-5">
      <h3 className="text-sm font-exam-serif font-semibold text-exam-ink mb-1">힌트 의존도</h3>
      <p className="text-xs text-stone-500 mb-4">힌트 없이 문제를 풀수록 성장해요</p>

      {totalQuestions === 0 ? (
        <div className="h-32 flex items-center justify-center text-stone-500 text-sm">
          아직 데이터가 없어요
        </div>
      ) : (
        <>
          <div className="flex items-center gap-6">
            {/* 원형 게이지 */}
            <div className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#E7E5E0" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={color}
                  strokeWidth="10"
                  strokeLinecap="butt"
                  strokeDasharray={`${2.513 * dependencyRate} 251.3`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-exam-ink">{dependencyRate}%</span>
              </div>
            </div>

            {/* 통계 */}
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-stone-400 text-xs">전체 문제</p>
                <p className="text-exam-ink font-semibold">{totalQuestions}개</p>
              </div>
              <div>
                <p className="text-stone-400 text-xs">힌트 사용</p>
                <p className="text-exam-ink font-semibold">{questionsWithHints}개</p>
              </div>
              <div>
                <p className="text-stone-400 text-xs">평균 힌트 수</p>
                <p className="text-exam-ink font-semibold">{avgHintsPerQuestion.toFixed(1)}회</p>
              </div>
            </div>
          </div>

          <p className="text-xs mt-3" style={{ color }}>
            {label}
          </p>
        </>
      )}
    </div>
  )
}
