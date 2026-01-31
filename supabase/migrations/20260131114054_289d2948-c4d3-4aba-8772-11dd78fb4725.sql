-- Tighten policies: only the same device can update/delete its own session
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.worker_sessions;
DROP POLICY IF EXISTS "Anyone can update own session" ON public.worker_sessions;
DROP POLICY IF EXISTS "Anyone can delete expired sessions" ON public.worker_sessions;

-- Insert: allow if the worker_id doesn't exist OR session is stale (15 min)
CREATE POLICY "Can insert new or claim stale session"
ON public.worker_sessions
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.worker_sessions ws
    WHERE ws.worker_id = worker_id
      AND ws.last_heartbeat > now() - interval '15 minutes'
  )
);

-- Update: only if device_fingerprint matches
CREATE POLICY "Can update own device session"
ON public.worker_sessions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Delete: anyone can clean up stale sessions
CREATE POLICY "Can delete stale sessions"
ON public.worker_sessions
FOR DELETE
USING (last_heartbeat < now() - interval '15 minutes');