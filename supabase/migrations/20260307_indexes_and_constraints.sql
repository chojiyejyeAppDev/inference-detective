-- 1. user_progress 중복 제출 방지 (race condition 대응)
-- 기존 중복 데이터가 있을 수 있으므로 먼저 정리
DELETE FROM user_progress a
  USING user_progress b
  WHERE a.id > b.id
    AND a.user_id = b.user_id
    AND a.question_id = b.question_id;

ALTER TABLE user_progress
  ADD CONSTRAINT uq_user_progress_user_question UNIQUE (user_id, question_id);

-- 2. 누락 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_level_sessions_user_level
  ON level_sessions(user_id, level);

CREATE INDEX IF NOT EXISTS idx_profiles_invite_code
  ON profiles(invite_code) WHERE invite_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_active
  ON subscriptions(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_user_progress_user_correct
  ON user_progress(user_id, is_correct);

-- 3. 초대 보너스 힌트 포인트 원자적 추가 RPC
CREATE OR REPLACE FUNCTION add_hint_points(uid UUID, amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  remaining INT;
BEGIN
  UPDATE profiles
  SET hint_points = hint_points + amount
  WHERE id = uid
  RETURNING hint_points INTO remaining;

  RETURN COALESCE(remaining, -1);
END;
$$;

-- 4. subscriptions.plan CHECK 업데이트 (deprecated 값 제거)
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('monthly', 'weekly'));

-- 기존 deprecated 플랜 데이터 마이그레이션
UPDATE subscriptions SET plan = 'monthly' WHERE plan IN ('yearly', 'student');
