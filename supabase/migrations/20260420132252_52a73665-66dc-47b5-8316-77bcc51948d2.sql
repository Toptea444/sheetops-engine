
DELETE FROM public.cycle_worker_cache
WHERE cycle_key = '2026-03'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(result_data->'dailyBreakdown') AS d
    WHERE (d->>'fullDate') ~ '^[0-9]+$'
      AND to_timestamp(((d->>'fullDate')::bigint)/1000) >= '2026-03-16'::date
      AND to_timestamp(((d->>'fullDate')::bigint)/1000) <= '2026-04-15 23:59:59'::timestamp
  );

DELETE FROM public.cycle_worker_cache
WHERE cycle_key = '2026-02'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(result_data->'dailyBreakdown') AS d
    WHERE (d->>'fullDate') ~ '^[0-9]+$'
      AND to_timestamp(((d->>'fullDate')::bigint)/1000) >= '2026-02-16'::date
      AND to_timestamp(((d->>'fullDate')::bigint)/1000) <= '2026-03-15 23:59:59'::timestamp
  );

DELETE FROM public.cycle_worker_cache
WHERE cycle_key = '2026-04'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(result_data->'dailyBreakdown') AS d
    WHERE (d->>'fullDate') ~ '^[0-9]+$'
      AND to_timestamp(((d->>'fullDate')::bigint)/1000) >= '2026-04-16'::date
      AND to_timestamp(((d->>'fullDate')::bigint)/1000) <= '2026-05-15 23:59:59'::timestamp
  );

DELETE FROM public.cycle_worker_cache
WHERE cycle_key = '2026-01'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(result_data->'dailyBreakdown') AS d
    WHERE (d->>'fullDate') ~ '^[0-9]+$'
      AND to_timestamp(((d->>'fullDate')::bigint)/1000) >= '2026-01-16'::date
      AND to_timestamp(((d->>'fullDate')::bigint)/1000) <= '2026-02-15 23:59:59'::timestamp
  );

DELETE FROM public.cycle_sheet_cache
WHERE (cycle_key = '2026-03' AND (UPPER(sheet_name) LIKE '%FEB%' OR UPPER(sheet_name) LIKE '%JAN%'))
   OR (cycle_key = '2026-02' AND (UPPER(sheet_name) LIKE '%MAR%' OR UPPER(sheet_name) LIKE '%APR%'))
   OR (cycle_key = '2026-04' AND UPPER(sheet_name) NOT LIKE '%APR%' AND UPPER(sheet_name) NOT LIKE '%MAY%' AND UPPER(sheet_name) NOT LIKE '%TRANSPORT%');

DROP POLICY IF EXISTS "Anyone can delete worker cache" ON public.cycle_worker_cache;
CREATE POLICY "Anyone can delete worker cache"
  ON public.cycle_worker_cache FOR DELETE USING (true);

DROP POLICY IF EXISTS "Anyone can delete sheet cache" ON public.cycle_sheet_cache;
CREATE POLICY "Anyone can delete sheet cache"
  ON public.cycle_sheet_cache FOR DELETE USING (true);
