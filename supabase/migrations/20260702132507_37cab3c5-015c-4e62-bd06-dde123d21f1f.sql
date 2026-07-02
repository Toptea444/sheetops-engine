
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.support_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_for text;

ALTER TABLE public.support_conversations
  ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text;
