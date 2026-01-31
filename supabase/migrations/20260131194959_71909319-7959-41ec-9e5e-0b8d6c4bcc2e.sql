-- Tighten UPDATE RLS to avoid permissive (true) policies.
-- Allow heartbeat updates ONLY for active (non-stale) sessions.

DROP POLICY IF EXISTS "Can update own device session" ON public.worker_sessions;

CREATE POLICY "Can update active session heartbeat"
ON public.worker_sessions
FOR UPDATE
USING (last_heartbeat > (now() - interval '15 minutes'))
WITH CHECK (last_heartbeat > (now() - interval '15 minutes'));