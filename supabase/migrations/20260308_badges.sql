-- 성취 배지 시스템
CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- emoji or icon name
  category TEXT NOT NULL CHECK (category IN ('milestone', 'streak', 'accuracy', 'level', 'social')),
  condition_type TEXT NOT NULL, -- 'total_solved', 'streak', 'accuracy_rate', 'level_reached', 'invites', 'first_solve', 'perfect_score'
  condition_value INTEGER NOT NULL DEFAULT 0,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id TEXT REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges" ON public.user_badges
  FOR SELECT USING (auth.uid() = user_id);

-- service role만 insert (API에서 수여)
CREATE POLICY "Service can insert badges" ON public.user_badges
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);

-- 배지 정의 시딩
INSERT INTO public.badges (id, name, description, icon, category, condition_type, condition_value, rarity) VALUES
  -- Milestone badges
  ('first_solve',     '첫 발자국',       '첫 번째 문제를 풀었어요!',           '👣', 'milestone', 'total_solved',    1,   'common'),
  ('solver_10',       '추론 견습생',     '10문제를 풀었어요!',                 '📝', 'milestone', 'total_solved',    10,  'common'),
  ('solver_50',       '추론 탐정',       '50문제를 풀었어요!',                 '🔍', 'milestone', 'total_solved',    50,  'rare'),
  ('solver_100',      '추론 전문가',     '100문제를 돌파했어요!',              '🏆', 'milestone', 'total_solved',    100, 'rare'),
  ('solver_500',      '추론 마스터',     '500문제를 정복했어요!',              '👑', 'milestone', 'total_solved',    500, 'legendary'),

  -- Streak badges
  ('streak_3',        '3연속 정답',      '연속 3문제를 맞혔어요!',             '🔥', 'streak',    'streak',          3,   'common'),
  ('streak_5',        '5연속 정답',      '연속 5문제를 맞혔어요!',             '💥', 'streak',    'streak',          5,   'rare'),
  ('streak_10',       '10연속 정답',     '연속 10문제를 맞혔어요! 놀라워요!',  '⚡', 'streak',    'streak',          10,  'epic'),

  -- Accuracy badges
  ('accuracy_80',     '정밀 추론가',     '최근 20문제 정답률 80% 이상',        '🎯', 'accuracy',  'accuracy_rate',   80,  'rare'),
  ('accuracy_95',     '완벽주의자',      '최근 20문제 정답률 95% 이상',        '💎', 'accuracy',  'accuracy_rate',   95,  'epic'),
  ('perfect_session', '퍼펙트 세션',     '한 세션에서 모든 문제를 맞혔어요!',  '✨', 'accuracy',  'perfect_score',   1,   'rare'),

  -- Level badges
  ('level_3',         '중급 입문',       '레벨 3에 도달했어요!',               '🌟', 'level',     'level_reached',   3,   'common'),
  ('level_5',         '고급 진입',       '레벨 5에 도달했어요!',               '🌠', 'level',     'level_reached',   5,   'rare'),
  ('level_7',         '그랜드 마스터',   '최고 레벨에 도달했어요!',            '🏅', 'level',     'level_reached',   7,   'legendary'),

  -- Social badges
  ('first_invite',    '소셜 탐정',       '첫 친구를 초대했어요!',              '🤝', 'social',    'invites',         1,   'common'),
  ('inviter_5',       '인기 탐정',       '5명의 친구를 초대했어요!',           '🎉', 'social',    'invites',         5,   'epic')
ON CONFLICT (id) DO NOTHING;
