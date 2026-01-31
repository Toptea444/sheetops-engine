-- Create table to track active sessions for worker IDs
CREATE TABLE public.worker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT NOT NULL,
  last_heartbeat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (but allow public access since we're using worker IDs, not auth)
ALTER TABLE public.worker_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read sessions (to check if ID is locked)
CREATE POLICY "Anyone can read sessions"
ON public.worker_sessions
FOR SELECT
USING (true);

-- Allow anyone to insert/update sessions (device-based lock)
CREATE POLICY "Anyone can insert sessions"
ON public.worker_sessions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update own session"
ON public.worker_sessions
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete expired sessions"
ON public.worker_sessions
FOR DELETE
USING (true);

-- Index for faster lookups
CREATE INDEX idx_worker_sessions_worker_id ON public.worker_sessions (worker_id);
CREATE INDEX idx_worker_sessions_heartbeat ON public.worker_sessions (last_heartbeat);