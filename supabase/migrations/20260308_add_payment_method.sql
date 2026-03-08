-- 결제 수단 추적 컬럼 추가 (다중 PG 지원)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'card';

-- 허용값 제한
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_payment_method_check
  CHECK (payment_method IN ('card', 'kakaopay'));
