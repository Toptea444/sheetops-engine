
CREATE TABLE public.pin_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by text
);

ALTER TABLE public.pin_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert reset requests" ON public.pin_reset_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read reset requests" ON public.pin_reset_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can update reset requests" ON public.pin_reset_requests FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete reset requests" ON public.pin_reset_requests FOR DELETE USING (true);
