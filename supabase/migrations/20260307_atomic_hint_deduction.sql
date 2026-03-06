-- Atomic hint point deduction to prevent race conditions
-- Returns remaining hint_points, or -1 if insufficient
CREATE OR REPLACE FUNCTION deduct_hint_points(uid UUID, cost_param INT)
RETURNS INT AS $$
DECLARE
  remaining INT;
BEGIN
  UPDATE profiles
  SET hint_points = hint_points - cost_param
  WHERE id = uid AND hint_points >= cost_param
  RETURNING hint_points INTO remaining;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  RETURN remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add CHECK constraint to prevent negative hint_points
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_hint_points_non_negative CHECK (hint_points >= 0);

-- Add CHECK constraint to prevent negative daily_questions_used
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_daily_questions_non_negative CHECK (daily_questions_used >= 0);
