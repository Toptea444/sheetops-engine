
-- Admin settings table for site-wide configurations
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  description TEXT
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read admin settings"
  ON public.admin_settings FOR SELECT USING (true);

CREATE POLICY "Anyone can insert admin settings"
  ON public.admin_settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update admin settings"
  ON public.admin_settings FOR UPDATE USING (true);

-- Insert default settings
INSERT INTO public.admin_settings (setting_key, setting_value, description) VALUES
  ('site_restricted', '{"enabled": false, "message": "The site is temporarily under maintenance. Please check back later."}', 'Controls whether the site is restricted'),
  ('currency_symbol', '"₦"', 'Currency symbol used throughout the app');

-- Admin alerts table for custom site-wide alerts
CREATE TABLE public.admin_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'info',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  priority INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read alerts"
  ON public.admin_alerts FOR SELECT USING (true);

CREATE POLICY "Anyone can insert alerts"
  ON public.admin_alerts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update alerts"
  ON public.admin_alerts FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete alerts"
  ON public.admin_alerts FOR DELETE USING (true);

CREATE INDEX idx_admin_alerts_is_active ON public.admin_alerts(is_active);
