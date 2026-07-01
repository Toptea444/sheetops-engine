
DROP POLICY IF EXISTS "Deny direct client writes" ON public.support_conversations;
DROP POLICY IF EXISTS "Deny direct client writes" ON public.support_messages;
-- Allow the anon key to read messages/conversations (chat widget needs this
-- to display history and receive realtime updates). Writes still require the
-- service role via edge function.
CREATE POLICY "Public read" ON public.support_conversations FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.support_messages FOR SELECT USING (true);
