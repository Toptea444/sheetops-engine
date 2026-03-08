
-- ID Swaps: tracks permanent mid-cycle ID reassignments
CREATE TABLE public.id_swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_name text NOT NULL,
  old_worker_id text NOT NULL,
  new_worker_id text NOT NULL,
  effective_date date NOT NULL,
  cycle_key text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text DEFAULT 'admin'
);

-- Day Transfers: tracks single-day earnings transfers between IDs
CREATE TABLE public.day_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_worker_id text NOT NULL,
  target_worker_id text NOT NULL,
  transfer_date date NOT NULL,
  sheet_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  bonus_amount numeric DEFAULT 0,
  ranking_bonus_amount numeric DEFAULT 0,
  cycle_key text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text DEFAULT 'admin'
);

-- RLS
ALTER TABLE public.id_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_transfers ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed by frontend to apply corrections)
CREATE POLICY "Anyone can read swaps" ON public.id_swaps FOR SELECT USING (true);
CREATE POLICY "Anyone can read transfers" ON public.day_transfers FOR SELECT USING (true);

-- Writes only via edge functions (service role)
-- No INSERT/UPDATE/DELETE policies for anon
