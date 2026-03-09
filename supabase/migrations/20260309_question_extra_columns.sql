-- 문제 생성 스크립트에서 사용하는 추가 컬럼
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS detailed_explanation text,
  ADD COLUMN IF NOT EXISTS wrong_answer_analysis jsonb,
  ADD COLUMN IF NOT EXISTS chain_explanations jsonb,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text;
