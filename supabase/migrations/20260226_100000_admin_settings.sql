-- Admin settings table for site-wide configurations
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  description TEXT
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read admin settings
CREATE POLICY "Anyone can read admin settings"
  ON public.admin_settings FOR SELECT
  USING (true);

-- Anyone can insert and update admin settings (for this app without auth)
CREATE POLICY "Anyone can insert admin settings"
  ON public.admin_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update admin settings"
  ON public.admin_settings FOR UPDATE
  USING (true);

-- Insert default settings
INSERT INTO public.admin_settings (setting_key, setting_value, description) VALUES
  ('site_restricted', '{"enabled": false, "message": "The site is temporarily under maintenance. Please check back later."}', 'Controls whether the site is restricted'),
  ('currency_symbol', '"₦"', 'Currency symbol used throughout the app');
