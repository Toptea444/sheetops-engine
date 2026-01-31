-- Create confirmed_identities table for permanent device-to-worker binding
CREATE TABLE public.confirmed_identities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    device_fingerprint TEXT NOT NULL UNIQUE,
    worker_id TEXT NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.confirmed_identities ENABLE ROW LEVEL SECURITY;

-- Anyone can read (to check if a fingerprint is already bound)
CREATE POLICY "Anyone can read confirmed identities"
ON public.confirmed_identities
FOR SELECT
USING (true);

-- Anyone can insert (when confirming identity)
CREATE POLICY "Anyone can insert confirmed identity"
ON public.confirmed_identities
FOR INSERT
WITH CHECK (true);

-- No update or delete policies - binding is permanent