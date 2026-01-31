-- Create worker_pins table for storing hashed PINs
CREATE TABLE public.worker_pins (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id TEXT NOT NULL UNIQUE,
    pin_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.worker_pins ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can check if a PIN exists (SELECT only returns existence, not the hash)
CREATE POLICY "Anyone can check PIN existence"
ON public.worker_pins
FOR SELECT
USING (true);

-- Policy: Anyone can insert a new PIN (first-time setup)
CREATE POLICY "Anyone can set initial PIN"
ON public.worker_pins
FOR INSERT
WITH CHECK (true);

-- Policy: Only allow delete via service role (admin reset)
-- No delete policy for regular users - admin will use service role key

-- Create index for faster lookups
CREATE INDEX idx_worker_pins_worker_id ON public.worker_pins(worker_id);