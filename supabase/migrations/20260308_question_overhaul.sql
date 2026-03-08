-- 문제 테이블 확장: 상세 해설, 오답 분석, 출처 추가
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS detailed_explanation TEXT,           -- 정답 체인의 상세 해설
  ADD COLUMN IF NOT EXISTS wrong_answer_analysis JSONB,         -- 오답별 분석 [{sentence_id, why_wrong}]
  ADD COLUMN IF NOT EXISTS chain_explanations JSONB,            -- 각 단계 간 연결 이유 [string, ...]
  ADD COLUMN IF NOT EXISTS source TEXT,                         -- 출처 (논문 제목 등)
  ADD COLUMN IF NOT EXISTS source_url TEXT;                     -- 출처 URL

-- correct_chain 최대 5개 제약 (체크 제약)
ALTER TABLE public.questions
  ADD CONSTRAINT correct_chain_max_5
  CHECK (jsonb_array_length(correct_chain) <= 5);

-- user_progress에 오답 분석 결과 저장
ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS wrong_analysis JSONB;  -- 이 시도에서의 오답 분석 결과
