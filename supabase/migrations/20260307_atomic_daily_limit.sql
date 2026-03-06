-- Atomic daily question check-and-consume to prevent race conditions
-- Combines date reset + limit check + increment in a single transaction with row lock
-- Returns TRUE if question can be consumed, FALSE if limit reached
CREATE OR REPLACE FUNCTION check_and_consume_daily_question(
  uid UUID,
  lim INT,
  today_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  profile_row profiles%ROWTYPE;
BEGIN
  SELECT * INTO profile_row FROM profiles WHERE id = uid FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- 날짜가 바뀌었으면 리셋
  IF profile_row.daily_reset_at < today_date THEN
    UPDATE profiles
    SET daily_questions_used = 1, daily_reset_at = today_date
    WHERE id = uid;
    RETURN TRUE;
  END IF;

  -- 제한 체크
  IF profile_row.daily_questions_used < lim THEN
    UPDATE profiles
    SET daily_questions_used = daily_questions_used + 1
    WHERE id = uid;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
