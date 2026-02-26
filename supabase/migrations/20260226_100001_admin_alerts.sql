-- Admin alerts table for custom site-wide alerts
CREATE TABLE public.admin_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'info', -- info, warning, error, success
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  priority INTEGER NOT NULL DEFAULT 0 -- Higher number = higher priority
);

-- Enable RLS
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- Anyone can read active alerts
CREATE POLICY "Anyone can read active alerts"
  ON public.admin_alerts FOR SELECT
  USING (is_active = true);

-- Anyone can insert and update alerts (for this app without auth)
CREATE POLICY "Anyone can insert alerts"
  ON public.admin_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update alerts"
  ON public.admin_alerts FOR UPDATE
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_admin_alerts_is_active ON public.admin_alerts(is_active);
CREATE INDEX idx_admin_alerts_start_date ON public.admin_alerts(start_date);
CREATE INDEX idx_admin_alerts_end_date ON public.admin_alerts(end_date);
