-- Earnings audit log for tracking and verifying payment calculations
CREATE TABLE public.earnings_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  payment_type TEXT NOT NULL, -- 'row_payment', 'bonus', 'adjustment', 'correction'
  amount_naira DECIMAL(12, 2) NOT NULL,
  row_count INTEGER,
  rate_per_unit DECIMAL(10, 4),
  bonus_reason TEXT,
  adjustment_reason TEXT,
  status TEXT NOT NULL DEFAULT 'completed', -- pending, completed, cancelled, disputed
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  verified BOOLEAN NOT NULL DEFAULT false,
  verification_note TEXT,
  verified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.earnings_audit_log ENABLE ROW LEVEL SECURITY;

-- Anyone can read audit logs
CREATE POLICY "Anyone can read earnings audit log"
  ON public.earnings_audit_log FOR SELECT
  USING (true);

-- Anyone can insert audit logs
CREATE POLICY "Anyone can insert earnings audit log"
  ON public.earnings_audit_log FOR INSERT
  WITH CHECK (true);

-- Anyone can update audit logs
CREATE POLICY "Anyone can update earnings audit log"
  ON public.earnings_audit_log FOR UPDATE
  USING (true);

-- Create indexes for faster queries
CREATE INDEX idx_earnings_audit_worker_id ON public.earnings_audit_log(worker_id);
CREATE INDEX idx_earnings_audit_sheet_name ON public.earnings_audit_log(sheet_name);
CREATE INDEX idx_earnings_audit_created_at ON public.earnings_audit_log(created_at);
CREATE INDEX idx_earnings_audit_status ON public.earnings_audit_log(status);
