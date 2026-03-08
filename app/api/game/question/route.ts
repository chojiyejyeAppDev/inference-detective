import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { FREE_DAILY_LIMIT, DAILY_HINT_RECHARGE, MAX_HINT_POINTS } from '@/lib/game/levelConfig'
import { rateLimit, rateLimitResponse } from '@/lib/api/rateLimit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 30 question requests per minute per user
  const { limited } = rateLimit(`question:${user.id}`, { max: 30, windowMs: 60_000 })
  if (limited) return rateLimitResponse()

  const service = await createServiceClient()
  // KST(UTC+9) 기준 오늘 날짜
  const now = new Date()
  const kstOffset = 9 * 60 * 60 * 1000
  const today = new Date(now.getTime() + kstOffset).toISOString().split('T')[0]

  // 프로필 조회
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // 구독 만료 체크 — 만료 시 자동으로 free로 전환
  if (
    profile.subscription_status === 'active' &&
    profile.subscription_expires_at &&
    new Date(profile.subscription_expires_at) < new Date()
  ) {
    await service
      .from('profiles')
      .update({ subscription_status: 'free' })
      .eq('id', user.id)
    profile.subscription_status = 'free'
  }

  // 일일 힌트 포인트 자동 충전 (날짜 변경 시 1회)
  let currentHintPoints = profile.hint_points
  const { data: rechargedPoints } = await service.rpc('recharge_hint_points_if_needed', {
    uid: user.id,
    recharge_amount: DAILY_HINT_RECHARGE,
    max_points: MAX_HINT_POINTS,
    today_date: today,
  })
  if (rechargedPoints != null && rechargedPoints >= 0) {
    currentHintPoints = rechargedPoints
  }

  // 관리자는 모든 제한 면제
  const isAdmin = profile.role === 'admin'
  const isUnlimited = isAdmin || profile.subscription_status === 'active'

  // 무료 사용자: 원자적 일일 제한 체크 + 소비 (race condition 방지)
  if (!isUnlimited) {
    const { data: allowed } = await service.rpc('check_and_consume_daily_question', {
      uid: user.id,
      lim: FREE_DAILY_LIMIT,
      today_date: today,
    })

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'daily_limit_reached',
          used: FREE_DAILY_LIMIT,
          limit: FREE_DAILY_LIMIT,
        },
        { status: 403 },
      )
    }
  }

  // 무료 사용자는 RPC에서 이미 +1 소비됨 — 현재 사용량 재조회
  let dailyUsed = profile.daily_questions_used
  if (!isUnlimited) {
    const { data: freshProfile } = await service
      .from('profiles')
      .select('daily_questions_used')
      .eq('id', user.id)
      .single()
    dailyUsed = freshProfile?.daily_questions_used ?? dailyUsed
  }

  const { searchParams } = new URL(req.url)
  const questionId = searchParams.get('id')
  const maxLevel = isAdmin ? 7 : profile.current_level
  const requestedLevel = parseInt(searchParams.get('level') ?? '0') || profile.current_level
  const level = Math.max(1, Math.min(maxLevel, requestedLevel))
  const VALID_TOPICS = ['humanities', 'social', 'science', 'tech', 'arts']
  const topicParam = searchParams.get('topic')
  const topic = topicParam && VALID_TOPICS.includes(topicParam) ? topicParam : null

  // 특정 문제 ID로 조회
  if (questionId) {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_RE.test(questionId)) {
      return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 })
    }

    const { data: specificQuestion, error: sqError } = await service
      .from('questions')
      .select('id, difficulty_level, topic, passage, sentences, conclusion, hints')
      .eq('id', questionId)
      .single()

    if (sqError || !specificQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // 레벨 제한: 사용자가 접근할 수 없는 레벨의 문제 차단
    if (!isAdmin && specificQuestion.difficulty_level > profile.current_level) {
      return NextResponse.json({ error: 'Level not unlocked' }, { status: 403 })
    }

    return NextResponse.json({
      question: specificQuestion,
      hint_points: currentHintPoints,
      daily_used: dailyUsed,
      daily_limit: isUnlimited ? null : FREE_DAILY_LIMIT,
      subscription_status: isUnlimited ? 'active' : profile.subscription_status,
      invite_code: profile.invite_code ?? null,
    })
  }

  // 전체 진행 기록 조회 (1회 쿼리로 통합)
  const { data: solved } = await service
    .from('user_progress')
    .select('question_id, is_correct, created_at')
    .eq('user_id', user.id)

  const allSolvedIds = solved?.map((s) => s.question_id) ?? []
  const isFirstTime = allSolvedIds.length === 0

  // UUID 형식 검증 (SQL 인젝션 방지)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const correctlyDoneIds = solved
    ?.filter((s) => s.is_correct && typeof s.question_id === 'string' && UUID_RE.test(s.question_id))
    .map((s) => s.question_id) ?? []

  const QUESTION_COLS = 'id, difficulty_level, topic, passage, sentences, conclusion, hints' as const

  // 문제 선택 결과
  type QuestionRow = {
    id: string
    difficulty_level: number
    topic: string
    passage: string
    sentences: unknown
    conclusion: string
    hints: unknown
  }
  let question: QuestionRow | null = null
  let isReview = false
  let adaptiveHint: string | null = null
  let questionSource: 'first-time' | 'retry' | 'weak-topic' | 'fresh' | 'review' = 'fresh'

  // 첫 사용자: 가장 오래된(쉬운) 문제 1개 제공
  if (isFirstTime) {
    let firstQuery = service
      .from('questions')
      .select(QUESTION_COLS)
      .eq('difficulty_level', level)
      .order('created_at', { ascending: true })
      .limit(1)

    if (topic) firstQuery = firstQuery.eq('topic', topic)
    const { data: firstQuestions } = await firstQuery
    question = firstQuestions?.[0] ?? null
    questionSource = 'first-time'
  } else if (topic) {
    // 토픽 지정 시: 해당 토픽에서 미풀이 문제 랜덤 선택
    let topicQuery = service
      .from('questions')
      .select(QUESTION_COLS)
      .eq('difficulty_level', level)
      .eq('topic', topic)
      .limit(10)

    if (correctlyDoneIds.length > 0) {
      topicQuery = topicQuery.not('id', 'in', `(${correctlyDoneIds.join(',')})`)
    }
    const { data: topicQuestions } = await topicQuery
    if (topicQuestions && topicQuestions.length > 0) {
      question = topicQuestions[Math.floor(Math.random() * topicQuestions.length)]
      questionSource = 'fresh'
    }
  } else {
    // ─── Spaced Repetition Priority Queue ───
    const roll = Math.random() * 100
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const TOPIC_LABELS: Record<string, string> = {
      humanities: '인문', social: '사회', science: '과학', tech: '기술', arts: '예술',
    }

    // Queue 1: Wrong answer re-test (30%) — recent wrong answers not yet solved correctly
    if (roll < 30) {
      // Find question IDs answered wrong, excluding those later answered correctly
      const wrongOnlyIds = solved
        ?.filter((s) => !s.is_correct && typeof s.question_id === 'string' && UUID_RE.test(s.question_id))
        .filter((s) => !correctlyDoneIds.includes(s.question_id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((s) => s.question_id) ?? []

      // Deduplicate (keep first = most recent)
      const uniqueWrongIds = [...new Set(wrongOnlyIds)]

      if (uniqueWrongIds.length > 0) {
        // Filter out questions retried within the last 24 hours
        const recentAttemptIds = solved
          ?.filter((s) => s.created_at >= twentyFourHoursAgo)
          .map((s) => s.question_id) ?? []
        const recentSet = new Set(recentAttemptIds)

        const cooledDownIds = uniqueWrongIds.filter((id) => !recentSet.has(id))
        const retryIds = cooledDownIds.length > 0 ? cooledDownIds.slice(0, 5) : uniqueWrongIds.slice(0, 5)

        const { data: retryQuestions } = await service
          .from('questions')
          .select(QUESTION_COLS)
          .eq('difficulty_level', level)
          .in('id', retryIds)

        if (retryQuestions && retryQuestions.length > 0) {
          question = retryQuestions[Math.floor(Math.random() * retryQuestions.length)]
          questionSource = 'retry'
          adaptiveHint = '이전에 틀렸던 문제를 다시 도전해요!'
        }
      }
    }

    // Queue 2: Weak topic targeting (25%) — new unsolved questions in weakest topic
    if (!question && roll < 55) {
      // Calculate per-topic accuracy from last 20 attempts
      const recentAttempts = [...(solved ?? [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20)

      if (recentAttempts.length > 0) {
        const recentQIds = recentAttempts
          .map((s) => s.question_id)
          .filter((id): id is string => typeof id === 'string' && UUID_RE.test(id))
        const uniqueRecentIds = [...new Set(recentQIds)]

        if (uniqueRecentIds.length > 0) {
          const { data: recentQuestions } = await service
            .from('questions')
            .select('id, topic')
            .in('id', uniqueRecentIds)

          if (recentQuestions && recentQuestions.length > 0) {
            const topicMap = new Map(recentQuestions.map((q) => [q.id, q.topic]))

            // Compute per-topic accuracy
            const topicStats: Record<string, { correct: number; total: number }> = {}
            for (const attempt of recentAttempts) {
              const t = topicMap.get(attempt.question_id)
              if (!t) continue
              if (!topicStats[t]) topicStats[t] = { correct: 0, total: 0 }
              topicStats[t].total++
              if (attempt.is_correct) topicStats[t].correct++
            }

            // Find topic with lowest accuracy (minimum 2 attempts to be considered)
            let weakestTopic: string | null = null
            let lowestAccuracy = Infinity
            for (const [t, stats] of Object.entries(topicStats)) {
              if (stats.total < 2) continue
              const accuracy = stats.correct / stats.total
              if (accuracy < lowestAccuracy) {
                lowestAccuracy = accuracy
                weakestTopic = t
              }
            }

            if (weakestTopic) {
              let weakQuery = service
                .from('questions')
                .select(QUESTION_COLS)
                .eq('difficulty_level', level)
                .eq('topic', weakestTopic)
                .limit(10)

              if (correctlyDoneIds.length > 0) {
                weakQuery = weakQuery.not('id', 'in', `(${correctlyDoneIds.join(',')})`)
              }

              const { data: weakQuestions } = await weakQuery
              if (weakQuestions && weakQuestions.length > 0) {
                question = weakQuestions[Math.floor(Math.random() * weakQuestions.length)]
                questionSource = 'weak-topic'
                adaptiveHint = `약점 영역(${TOPIC_LABELS[weakestTopic] ?? weakestTopic})을 집중 연습해요`
              }
            }
          }
        }
      }
    }

    // Queue 3: Fresh questions (45% or fallthrough) — random unsolved at current level
    if (!question) {
      let freshQuery = service
        .from('questions')
        .select(QUESTION_COLS)
        .eq('difficulty_level', level)
        .limit(10)

      if (correctlyDoneIds.length > 0) {
        freshQuery = freshQuery.not('id', 'in', `(${correctlyDoneIds.join(',')})`)
      }

      const { data: freshQuestions } = await freshQuery
      if (freshQuestions && freshQuestions.length > 0) {
        question = freshQuestions[Math.floor(Math.random() * freshQuestions.length)]
        questionSource = 'fresh'
      }
    }

    // Fallback: Review mode — already solved, oldest first
    if (!question) {
      const { data: reviewQuestions } = await service
        .from('questions')
        .select(QUESTION_COLS)
        .eq('difficulty_level', level)
        .order('created_at', { ascending: true })
        .limit(10)

      if (reviewQuestions && reviewQuestions.length > 0) {
        question = reviewQuestions[Math.floor(Math.random() * reviewQuestions.length)]
        questionSource = 'review'
        isReview = true
      }
    }
  }

  // No question found from any source
  if (!question) {
    // Try review fallback for first-time / topic-filtered cases too
    const { data: lastResort } = await service
      .from('questions')
      .select(QUESTION_COLS)
      .eq('difficulty_level', level)
      .limit(10)

    if (lastResort && lastResort.length > 0) {
      question = lastResort[Math.floor(Math.random() * lastResort.length)]
      questionSource = 'review'
      isReview = true
    } else {
      // C-7: Rollback consumed daily question since no question was served
      if (!isUnlimited) {
        await service.rpc('rollback_daily_question', { uid: user.id })
      }
      return NextResponse.json({ error: 'No questions available' }, { status: 404 })
    }
  }

  // Fetch daily streak info
  const streakDays = profile.streak_days ?? 0
  const longestStreak = profile.longest_streak ?? 0
  const streakFreezeCount = profile.streak_freeze_count ?? 0

  const response = NextResponse.json({
    question,
    question_source: questionSource,
    is_review: isReview,
    adaptive_hint: adaptiveHint,
    hint_points: currentHintPoints,
    daily_used: dailyUsed,
    daily_limit: isUnlimited ? null : FREE_DAILY_LIMIT,
    subscription_status: isUnlimited ? 'active' : profile.subscription_status,
    invite_code: profile.invite_code ?? null,
    streak: {
      days: streakDays,
      longest: longestStreak,
      freeze_count: streakFreezeCount,
    },
  })

  response.headers.set('X-Question-Source', questionSource)

  return response
}
