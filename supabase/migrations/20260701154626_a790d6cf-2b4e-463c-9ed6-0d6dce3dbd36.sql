
CREATE TABLE public.support_conversations (
  worker_id TEXT PRIMARY KEY,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sender TEXT NOT NULL DEFAULT 'user',
  last_message_preview TEXT,
  unread_admin INTEGER NOT NULL DEFAULT 0,
  unread_user INTEGER NOT NULL DEFAULT 0,
  last_admin_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_conversations TO anon, authenticated;
GRANT ALL ON public.support_conversations TO service_role;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny direct client writes" ON public.support_conversations FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user','admin')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX support_messages_worker_id_idx ON public.support_messages(worker_id, created_at DESC);
GRANT SELECT ON public.support_messages TO anon, authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny direct client writes" ON public.support_messages FOR ALL USING (false) WITH CHECK (false);

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
