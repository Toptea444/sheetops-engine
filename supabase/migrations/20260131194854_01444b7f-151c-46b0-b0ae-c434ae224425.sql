-- Fix session-lock INSERT RLS policy: it was incorrectly blocking all inserts globally.
-- This policy must only check for an active session for the SAME worker_id.

DROP POLICY IF EXISTS "Can insert new or claim stale session" ON public.worker_sessions;

CREATE POLICY "Can insert new or claim stale session"
ON public.worker_sessions
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1
    FROM public.worker_sessions ws
    WHERE ws.worker_id = worker_sessions.worker_id
      AND ws.last_heartbeat > (now() - interval '15 minutes')
  )
);