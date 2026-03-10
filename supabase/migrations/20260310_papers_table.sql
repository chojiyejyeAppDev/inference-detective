-- papers 테이블: 업로드된 논문 관리
CREATE TABLE IF NOT EXISTS public.papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  extracted_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  questions_generated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- questions 테이블 확장: 출처 논문 연결 + 자동 생성 플래그
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS paper_id UUID REFERENCES public.papers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_papers_status ON public.papers(status);
CREATE INDEX IF NOT EXISTS idx_questions_paper_id ON public.questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_questions_auto_generated ON public.questions(auto_generated);

-- RLS
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on papers"
  ON public.papers
  FOR ALL
  USING (true)
  WITH CHECK (true);
