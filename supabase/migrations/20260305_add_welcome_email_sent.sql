-- profiles 테이블에 welcome_email_sent 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT FALSE;
