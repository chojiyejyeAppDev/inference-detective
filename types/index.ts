export type SubscriptionStatus = 'free' | 'active' | 'cancelled'

export type Topic = 'humanities' | 'social' | 'science' | 'tech' | 'arts'

export interface Sentence {
  id: string
  text: string
}

export interface Hint {
  level: number // 1=direct, 2=semi-direct, 3=indirect, 4=none
  text: string
}

export interface Question {
  id: string
  difficulty_level: number // 1-7
  topic: Topic
  passage: string
  sentences: Sentence[]
  conclusion: string
  correct_chain: string[] // sentence ids in order
  hints: Hint[]
  chain_explanations?: string[] // why each step follows the previous
  detailed_explanation?: string // 정답 체인의 전체 상세 해설
  wrong_answer_analysis?: { sentence_id: string; why_wrong: string }[] // 오답별 분석
  source?: string // 출처
  source_url?: string // 출처 URL
}

export interface Profile {
  id: string
  nickname: string | null
  subscription_status: SubscriptionStatus
  subscription_expires_at: string | null
  current_level: number
  hint_points: number
  invite_code: string
  daily_questions_used: number
  daily_reset_at: string
  streak_days: number
  longest_streak: number
  last_active_date: string | null
  streak_freeze_count: number
}

export interface MockScore {
  id: string
  user_id: string
  exam_date: string
  score: number
  notes: string | null
  created_at: string
}

export interface UserProgress {
  id: string
  user_id: string
  question_id: string
  submitted_chain: string[]
  is_correct: boolean
  hints_used: number
  created_at: string
}

export interface ConnectionStrength {
  slotIndex: number
  strength: 'strong' | 'medium' | 'weak' | 'empty'
}

export interface EvaluationResult {
  is_correct: boolean
  accuracy: number // 0-1
  level_up: boolean
  correct_chain?: string[]
  feedback: SlotFeedback[]
  explanation: string
  chain_explanations?: string[]
  detailed_explanation?: string // 상세 해설
  wrong_analysis?: { sentence_id: string; why_wrong: string; user_placed_at: number }[] // 사용자의 오답 분석
  streak?: number
  daily_streak?: number
  hint_points_bonus?: number
  hint_points_remaining?: number | null
  level_progress?: {
    qualified: number
    required: number
  }
}

export interface SlotFeedback {
  slot_index: number
  sentence_id: string | null
  is_correct: boolean
  hint: string | null
}

export type LevelConfig = {
  level: number
  name: string
  slots: number
  hint_type: 'direct' | 'semi' | 'indirect' | 'none'
  description: string
}
