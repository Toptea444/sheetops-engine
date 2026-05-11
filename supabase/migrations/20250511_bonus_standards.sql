-- Create table to store bonus standards for each stage
CREATE TABLE IF NOT EXISTS bonus_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage TEXT NOT NULL UNIQUE,
  tier_excellent_threshold NUMERIC NOT NULL,
  tier_excellent_bonus INTEGER NOT NULL,
  tier_excellent_recovery_rate INTEGER NOT NULL,
  tier_good_threshold NUMERIC NOT NULL,
  tier_good_bonus INTEGER NOT NULL,
  tier_good_recovery_rate INTEGER NOT NULL,
  tier_fair_threshold NUMERIC NOT NULL,
  tier_fair_bonus INTEGER NOT NULL,
  tier_fair_recovery_rate INTEGER NOT NULL,
  tier_poor_threshold NUMERIC NOT NULL,
  tier_poor_bonus INTEGER NOT NULL,
  tier_poor_recovery_rate INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table to track earnings by stage with color coding
CREATE TABLE IF NOT EXISTS earnings_by_stage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  date DATE NOT NULL,
  recovery_rate NUMERIC,
  bonus_amount INTEGER,
  performance_tier TEXT CHECK (performance_tier IN ('excellent', 'good', 'fair', 'poor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(worker_id, stage, date)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_earnings_by_stage_worker_id ON earnings_by_stage(worker_id);
CREATE INDEX IF NOT EXISTS idx_earnings_by_stage_stage ON earnings_by_stage(stage);
CREATE INDEX IF NOT EXISTS idx_earnings_by_stage_date ON earnings_by_stage(date);
CREATE INDEX IF NOT EXISTS idx_earnings_by_stage_performance_tier ON earnings_by_stage(performance_tier);

-- Insert default bonus standards
INSERT INTO bonus_standards (
  stage,
  tier_excellent_threshold, tier_excellent_bonus, tier_excellent_recovery_rate,
  tier_good_threshold, tier_good_bonus, tier_good_recovery_rate,
  tier_fair_threshold, tier_fair_bonus, tier_fair_recovery_rate,
  tier_poor_threshold, tier_poor_bonus, tier_poor_recovery_rate
) VALUES
  ('T-1', 0.52, 1500, 10, 0.46, 1000, 30, 0.40, 500, 50, 0.00, 0, 70),
  ('T0', 0.24, 1500, 10, 0.20, 1000, 30, 0.16, 500, 50, 0.00, 0, 70),
  ('S1', 0.065, 1500, 10, 0.045, 1000, 30, 0.025, 500, 50, 0.00, 0, 70),
  ('S2', 0.013, 1500, 10, 0.009, 1000, 30, 0.005, 500, 50, 0.00, 0, 70),
  ('S3', 0.004, 1500, 10, 0.003, 1000, 30, 0.002, 500, 50, 0.00, 0, 70),
  ('S4', 0.0008, 1500, 10, 0.0005, 1000, 30, 0.0002, 500, 50, 0.00, 0, 70)
ON CONFLICT (stage) DO NOTHING;
