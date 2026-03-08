/** Centralized design tokens for consistent UI across the app */

/** Icon sizes — use instead of magic numbers */
export const ICON_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
} as const

/** Chart color palette — maps to CSS custom properties */
export const CHART_COLORS = {
  ink: '#1C1917',
  red: '#C22D2D',
  muted: '#78716C',
  rule: '#D6D3CA',
  grid: '#E7E5E0',
  green: '#16a34a',
  background: '#E7E5E0',
} as const

/** Topic-specific chart colors */
export const TOPIC_COLORS: Record<string, string> = {
  humanities: CHART_COLORS.ink,
  social: '#57534E',
  science: CHART_COLORS.green,
  tech: CHART_COLORS.muted,
  arts: CHART_COLORS.red,
}

/** Framer Motion duration tokens */
export const DURATION = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.6,
  slower: 1.0,
} as const

/** Framer Motion stagger delay */
export const STAGGER = 0.08
