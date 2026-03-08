
-- 1. admin_settings: Remove INSERT and UPDATE policies (writes now go through edge functions)
DROP POLICY IF EXISTS "Anyone can insert admin settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Anyone can update admin settings" ON public.admin_settings;

-- 2. admin_alerts: Remove INSERT, UPDATE, DELETE policies (all managed via admin-data edge function)
DROP POLICY IF EXISTS "Anyone can insert alerts" ON public.admin_alerts;
DROP POLICY IF EXISTS "Anyone can update alerts" ON public.admin_alerts;
DROP POLICY IF EXISTS "Anyone can delete alerts" ON public.admin_alerts;

-- 3. worker_pins: Remove INSERT policy (PIN creation goes through set-worker-pin edge function)
DROP POLICY IF EXISTS "Anyone can set initial PIN" ON public.worker_pins;

-- 4. pin_reset_requests: Remove UPDATE and DELETE policies (managed via admin-data edge function)
-- Keep INSERT so workers can submit forgot-PIN requests from the frontend
DROP POLICY IF EXISTS "Anyone can update reset requests" ON public.pin_reset_requests;
DROP POLICY IF EXISTS "Anyone can delete reset requests" ON public.pin_reset_requests;
