-- Daily streak tracking columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streak_days INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date DATE,
  ADD COLUMN IF NOT EXISTS streak_freeze_count INT NOT NULL DEFAULT 0;

-- Mock exam score tracking table
CREATE TABLE IF NOT EXISTS public.mock_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mock_scores_user_id ON public.mock_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_scores_user_date ON public.mock_scores(user_id, exam_date DESC);

-- Enable RLS
ALTER TABLE public.mock_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mock scores"
  ON public.mock_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mock scores"
  ON public.mock_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mock scores"
  ON public.mock_scores FOR DELETE
  USING (auth.uid() = user_id);

-- RPC: Update daily streak atomically
-- Called on first question of the day
CREATE OR REPLACE FUNCTION public.update_daily_streak(uid UUID, today_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_active DATE;
  v_streak INT;
  v_longest INT;
  v_freeze INT;
  v_used_freeze BOOLEAN := FALSE;
BEGIN
  SELECT last_active_date, streak_days, longest_streak, streak_freeze_count
  INTO v_last_active, v_streak, v_longest, v_freeze
  FROM public.profiles
  WHERE id = uid
  FOR UPDATE;

  -- Already active today, no change
  IF v_last_active = today_date THEN
    RETURN jsonb_build_object(
      'streak_days', v_streak,
      'longest_streak', v_longest,
      'streak_freeze_count', v_freeze,
      'used_freeze', FALSE
    );
  END IF;

  IF v_last_active = today_date - 1 THEN
    -- Consecutive day: increment streak
    v_streak := v_streak + 1;
  ELSIF v_last_active = today_date - 2 AND v_freeze > 0 THEN
    -- Missed 1 day but has freeze: use it
    v_freeze := v_freeze - 1;
    v_streak := v_streak + 1;
    v_used_freeze := TRUE;
  ELSE
    -- Streak broken: reset to 1
    v_streak := 1;
  END IF;

  -- Update longest streak
  IF v_streak > v_longest THEN
    v_longest := v_streak;
  END IF;

  UPDATE public.profiles
  SET
    last_active_date = today_date,
    streak_days = v_streak,
    longest_streak = v_longest,
    streak_freeze_count = v_freeze
  WHERE id = uid;

  RETURN jsonb_build_object(
    'streak_days', v_streak,
    'longest_streak', v_longest,
    'streak_freeze_count', v_freeze,
    'used_freeze', v_used_freeze
  );
END;
$$;

-- RPC: Purchase streak freeze with hint points
CREATE OR REPLACE FUNCTION public.purchase_streak_freeze(uid UUID, cost INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points INT;
BEGIN
  SELECT hint_points INTO v_points
  FROM public.profiles
  WHERE id = uid
  FOR UPDATE;

  IF v_points < cost THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET
    hint_points = hint_points - cost,
    streak_freeze_count = streak_freeze_count + 1
  WHERE id = uid;

  RETURN TRUE;
END;
$$;

-- Add daily streak badges
INSERT INTO public.badges (id, name, description, icon, condition_type, condition_value, rarity)
VALUES
  ('streak_day_3', '3일 연속 훈련', '3일 연속으로 문제를 풀었어요', '🔥', 'daily_streak', 3, 'common'),
  ('streak_day_7', '7일 연속 훈련', '일주일 연속 훈련! 습관이 만들어지고 있어요', '🔥', 'daily_streak', 7, 'rare'),
  ('streak_day_14', '14일 연속 훈련', '2주 연속 훈련! 대단해요', '💪', 'daily_streak', 14, 'epic'),
  ('streak_day_30', '30일 연속 훈련', '한 달 연속 훈련! 마스터의 길', '👑', 'daily_streak', 30, 'legendary')
ON CONFLICT (id) DO NOTHING;
