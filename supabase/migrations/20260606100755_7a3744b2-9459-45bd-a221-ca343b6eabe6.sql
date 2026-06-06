
ALTER TABLE public.day_transfers
  ADD COLUMN IF NOT EXISTS created_by_user_id text,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'admin_transfer';

CREATE INDEX IF NOT EXISTS day_transfers_created_by_user_idx
  ON public.day_transfers (created_by_user_id);

CREATE INDEX IF NOT EXISTS day_transfers_kind_idx
  ON public.day_transfers (kind);

-- Allow public inserts/updates/deletes only for user-initiated rows.
-- The edge function (service role) bypasses RLS, but these policies make
-- the admin-managed rows safe from public modification.

DROP POLICY IF EXISTS "Users can insert their own adjustments" ON public.day_transfers;
CREATE POLICY "Users can insert their own adjustments"
  ON public.day_transfers
  FOR INSERT
  TO public
  WITH CHECK (created_by_user_id IS NOT NULL AND kind IN ('user_deduction','user_addition'));

DROP POLICY IF EXISTS "Users can delete their own adjustments" ON public.day_transfers;
CREATE POLICY "Users can delete their own adjustments"
  ON public.day_transfers
  FOR DELETE
  TO public
  USING (created_by_user_id IS NOT NULL AND kind IN ('user_deduction','user_addition'));

GRANT INSERT, DELETE ON public.day_transfers TO anon, authenticated;
