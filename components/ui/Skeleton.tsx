import { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-stone-200',
        className,
      )}
      style={style}
    />
  )
}

/** 레벨 카드 스켈레톤 */
export function LevelCardSkeleton() {
  return (
    <div className="border border-exam-rule bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <Skeleton className="w-12 h-4" />
      </div>
      <Skeleton className="w-3/4 h-4 mb-1.5" />
      <Skeleton className="w-full h-3" />
      <div className="mt-3 flex gap-3">
        <Skeleton className="w-14 h-3" />
        <Skeleton className="w-14 h-3" />
      </div>
      <div className="mt-2 flex gap-0.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="w-2 h-2 rounded-full" />
        ))}
      </div>
    </div>
  )
}

const BAR_HEIGHTS = [60, 40, 80, 55, 70, 45, 90, 65]

/** 대시보드 차트 스켈레톤 */
export function ChartSkeleton({ title }: { title: string }) {
  return (
    <div className="border border-exam-rule bg-white p-4">
      <Skeleton className="w-28 h-4 mb-4" />
      <p className="text-xs text-stone-400 mb-2">{title}</p>
      <div className="flex items-end gap-2 h-24">
        {BAR_HEIGHTS.map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  )
}

/** 텍스트 줄 스켈레톤 */
export function TextLineSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  )
}
