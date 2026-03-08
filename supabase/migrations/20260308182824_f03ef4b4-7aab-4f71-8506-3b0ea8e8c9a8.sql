
-- Drop the old restrictive INSERT policy that blocks multi-device
DROP POLICY IF EXISTS "Can insert new or claim stale session" ON public.worker_sessions;

-- Create a new INSERT policy that allows multiple devices per worker
-- Only blocks duplicate sessions from the same device
CREATE POLICY "Can insert new or claim stale session" ON public.worker_sessions
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM worker_sessions ws
    WHERE ws.worker_id = worker_sessions.worker_id
      AND ws.device_fingerprint = worker_sessions.device_fingerprint
      AND ws.last_heartbeat > (now() - '00:15:00'::interval)
  )
);
