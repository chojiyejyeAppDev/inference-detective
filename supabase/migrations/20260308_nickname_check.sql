-- Enforce nickname format at the database level to prevent HTML injection
ALTER TABLE public.profiles
  ADD CONSTRAINT nickname_safe_chars
  CHECK (nickname ~ '^[가-힣a-zA-Z0-9_ ]+$');
