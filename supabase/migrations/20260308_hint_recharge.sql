-- 힌트 포인트 일일 자동 충전 + 정답 보너스 시스템

-- 1. hint_recharge_date 컬럼 추가 (일일 충전 추적)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hint_recharge_date DATE;

-- 2. 일일 힌트 포인트 충전 (하루 1회, 날짜 변경 시)
-- 이미 충전된 경우 현재 포인트 반환, 아닌 경우 충전 후 반환
CREATE OR REPLACE FUNCTION recharge_hint_points_if_needed(
  uid UUID,
  recharge_amount INT,
  max_points INT,
  today_date DATE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_points INT;
  current_date_val DATE;
BEGIN
  SELECT hint_points, hint_recharge_date
  INTO current_points, current_date_val
  FROM profiles WHERE id = uid;

  IF current_points IS NULL THEN
    RETURN -1;
  END IF;

  -- 이미 오늘 충전됨
  IF current_date_val = today_date THEN
    RETURN current_points;
  END IF;

  -- 충전: 최대치까지만
  UPDATE profiles
  SET hint_points = LEAST(hint_points + recharge_amount, max_points),
      hint_recharge_date = today_date
  WHERE id = uid
  RETURNING hint_points INTO current_points;

  RETURN current_points;
END;
$$;

-- 3. 힌트 포인트 추가 (정답 보상용, 최대치 제한)
CREATE OR REPLACE FUNCTION add_hint_points(
  uid UUID,
  amount INT,
  max_points INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_points INT;
BEGIN
  UPDATE profiles
  SET hint_points = LEAST(hint_points + amount, max_points)
  WHERE id = uid
  RETURNING hint_points INTO new_points;

  RETURN COALESCE(new_points, -1);
END;
$$;
