-- Rollback a consumed daily question when no question could be served (C-7 fix)
CREATE OR REPLACE FUNCTION rollback_daily_question(uid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET daily_questions_used = GREATEST(0, daily_questions_used - 1)
  WHERE id = uid;
END;
$$;
