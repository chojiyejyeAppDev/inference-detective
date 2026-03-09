-- 7-day unlimited trial for new users
-- trial_expires_at 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;

-- 기존 사용자들의 trial_expires_at 설정 (created_at + 7일, 대부분 이미 만료)
UPDATE public.profiles
  SET trial_expires_at = created_at + INTERVAL '7 days'
  WHERE trial_expires_at IS NULL;

-- 새 사용자 생성 시 trial_expires_at 자동 설정
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_invite_code TEXT;
BEGIN
  LOOP
    new_invite_code := upper(substring(md5(random()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = new_invite_code);
  END LOOP;

  INSERT INTO public.profiles (id, invite_code, trial_expires_at)
  VALUES (NEW.id, new_invite_code, NOW() + INTERVAL '7 days');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
