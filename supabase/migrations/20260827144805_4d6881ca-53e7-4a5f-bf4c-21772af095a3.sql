ALTER TABLE public.demo_leads
  ADD COLUMN IF NOT EXISTS ultimo_email_id text,
  ADD COLUMN IF NOT EXISTS ultimo_email_estado text,
  ADD COLUMN IF NOT EXISTS ultimo_email_at timestamp with time zone;