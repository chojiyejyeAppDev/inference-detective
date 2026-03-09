-- Initial diagnostic score tracking for onboarding & improvement measurement
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS initial_diagnostic_accuracy DECIMAL,
  ADD COLUMN IF NOT EXISTS initial_diagnostic_level INTEGER,
  ADD COLUMN IF NOT EXISTS initial_diagnostic_at TIMESTAMPTZ;
