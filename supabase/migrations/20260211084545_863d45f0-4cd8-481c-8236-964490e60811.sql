
-- Cache individual worker bonus results per sheet per cycle
CREATE TABLE public.cycle_worker_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  cycle_key TEXT NOT NULL,
  result_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(worker_id, sheet_name, cycle_key)
);

-- Cache full sheet data snapshots per cycle (for leaderboard, activity feed, MVPs)
CREATE TABLE public.cycle_sheet_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_name TEXT NOT NULL,
  cycle_key TEXT NOT NULL,
  sheet_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sheet_name, cycle_key)
);

-- Enable RLS
ALTER TABLE public.cycle_worker_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_sheet_cache ENABLE ROW LEVEL SECURITY;

-- Worker cache: anyone can read and upsert (no auth in this app)
CREATE POLICY "Anyone can read worker cache"
  ON public.cycle_worker_cache FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert worker cache"
  ON public.cycle_worker_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update worker cache"
  ON public.cycle_worker_cache FOR UPDATE
  USING (true);

-- Sheet cache: anyone can read and upsert
CREATE POLICY "Anyone can read sheet cache"
  ON public.cycle_sheet_cache FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert sheet cache"
  ON public.cycle_sheet_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update sheet cache"
  ON public.cycle_sheet_cache FOR UPDATE
  USING (true);

-- Indexes for fast lookups
CREATE INDEX idx_worker_cache_lookup ON public.cycle_worker_cache(worker_id, cycle_key);
CREATE INDEX idx_sheet_cache_lookup ON public.cycle_sheet_cache(sheet_name, cycle_key);
