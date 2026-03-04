-- profiles (auth.users 확장)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  nickname VARCHAR(50),
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'cancelled')),
  subscription_expires_at TIMESTAMPTZ,
  current_level INTEGER DEFAULT 1 CHECK (current_level BETWEEN 1 AND 7),
  hint_points INTEGER DEFAULT 10,
  invite_code VARCHAR(10) UNIQUE,
  invited_by UUID REFERENCES public.profiles(id),
  daily_questions_used INTEGER DEFAULT 0,
  daily_reset_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 자동 프로필 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_invite_code TEXT;
BEGIN
  -- 8자리 유니크 초대 코드 생성
  LOOP
    new_invite_code := upper(substring(md5(random()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = new_invite_code);
  END LOOP;

  INSERT INTO public.profiles (id, invite_code)
  VALUES (NEW.id, new_invite_code);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- questions (콘텐츠 DB)
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 7),
  topic TEXT CHECK (topic IN ('humanities', 'social', 'science', 'tech', 'arts')),
  passage TEXT NOT NULL,
  sentences JSONB NOT NULL,      -- [{id, text}, ...]
  conclusion TEXT NOT NULL,
  correct_chain JSONB NOT NULL,  -- [sentence_id, ...]
  hints JSONB,                   -- [{level, text}, ...]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read questions" ON public.questions
  FOR SELECT USING (true);

-- user_progress
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id),
  submitted_chain JSONB,
  is_correct BOOLEAN,
  hints_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- level_sessions (레벨업 조건 계산용)
CREATE TABLE IF NOT EXISTS public.level_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  level INTEGER,
  accuracy DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.level_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.level_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.level_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  plan TEXT CHECK (plan IN ('monthly', 'yearly', 'student')),
  toss_billing_key TEXT,
  toss_customer_key TEXT UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- invitations (바이럴)
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  bonus_granted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invitee_id) -- 초대는 1번만 적용
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invitations" ON public.invitations
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- 인덱스
CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX idx_user_progress_created_at ON public.user_progress(created_at DESC);
CREATE INDEX idx_level_sessions_user_id ON public.level_sessions(user_id);
CREATE INDEX idx_questions_difficulty ON public.questions(difficulty_level);
