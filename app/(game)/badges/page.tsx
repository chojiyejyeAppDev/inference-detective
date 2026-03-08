'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Award, Lock } from 'lucide-react'

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  category: string
  rarity: string
  earned: boolean
  earned_at: string | null
}

const RARITY_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  common: { border: 'border-stone-300', bg: 'bg-stone-50', text: 'text-stone-500' },
  rare: { border: 'border-blue-300', bg: 'bg-blue-50', text: 'text-blue-700' },
  epic: { border: 'border-purple-300', bg: 'bg-purple-50', text: 'text-purple-700' },
  legendary: { border: 'border-amber-300', bg: 'bg-amber-50', text: 'text-exam-red' },
}

const RARITY_LABELS: Record<string, string> = {
  common: '일반',
  rare: '희귀',
  epic: '영웅',
  legendary: '전설',
}

const CATEGORY_LABELS: Record<string, string> = {
  milestone: '마일스톤',
  streak: '연속 정답',
  accuracy: '정확도',
  level: '레벨',
  social: '소셜',
}

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, earned: 0 })

  useEffect(() => {
    fetch('/api/game/badges')
      .then((r) => r.json())
      .then((data) => {
        setBadges(data.badges ?? [])
        setStats({ total: data.total ?? 0, earned: data.earned ?? 0 })
      })
      .finally(() => setLoading(false))
  }, [])

  const categories = [...new Set(badges.map((b) => b.category))]

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-exam-ink border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <Award size={20} className="text-exam-ink" />
            <h1 className="text-xl font-bold text-exam-ink">성취 배지</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 rounded-full bg-stone-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-exam-ink transition-all duration-500"
                style={{ width: stats.total > 0 ? `${(stats.earned / stats.total) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-xs text-stone-500 font-semibold shrink-0">
              {stats.earned}/{stats.total}
            </span>
          </div>
        </motion.div>

        {/* Badge grid by category */}
        {categories.map((category) => (
          <div key={category} className="mb-8">
            <h2 className="text-sm font-semibold text-stone-500 mb-3">
              {CATEGORY_LABELS[category] ?? category}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges
                .filter((b) => b.category === category)
                .map((badge, i) => {
                  const colors = RARITY_COLORS[badge.rarity] ?? RARITY_COLORS.common
                  return (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`border p-4 text-center transition-all ${
                        badge.earned
                          ? `${colors.border} ${colors.bg}`
                          : 'border-stone-200 bg-stone-50 opacity-50'
                      }`}
                    >
                      <div className="text-2xl mb-2">
                        {badge.earned ? badge.icon : <Lock size={20} className="mx-auto text-stone-400" />}
                      </div>
                      <p className={`text-xs font-semibold mb-0.5 ${badge.earned ? 'text-exam-ink' : 'text-stone-400'}`}>
                        {badge.name}
                      </p>
                      <p className="text-[10px] text-stone-500 leading-tight">
                        {badge.description}
                      </p>
                      <span className={`inline-block mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                        badge.earned ? `${colors.text} bg-stone-100` : 'text-stone-400'
                      }`}>
                        {RARITY_LABELS[badge.rarity] ?? badge.rarity}
                      </span>
                      {badge.earned && badge.earned_at && (
                        <p className="text-[9px] text-stone-400 mt-1">
                          {new Date(badge.earned_at).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                    </motion.div>
                  )
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
