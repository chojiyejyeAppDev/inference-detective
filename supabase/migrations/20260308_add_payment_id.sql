-- Add payment_id column for one-time (weekly) payments
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_id TEXT;
