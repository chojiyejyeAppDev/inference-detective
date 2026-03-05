-- Rename Toss-specific columns to generic names
ALTER TABLE public.subscriptions
  RENAME COLUMN toss_billing_key TO billing_key;

ALTER TABLE public.subscriptions
  RENAME COLUMN toss_customer_key TO customer_key;
