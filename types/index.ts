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
  streak?: number
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
