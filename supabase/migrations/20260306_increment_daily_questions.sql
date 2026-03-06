-- Atomic increment for daily questions counter to prevent race conditions
CREATE OR REPLACE FUNCTION increment_daily_questions(user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET daily_questions_used = daily_questions_used + 1
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
