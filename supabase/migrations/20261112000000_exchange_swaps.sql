-- A two-person exchange consists of two linked directional moves. Legacy rows
-- remain one-person moves; their meaning must not be guessed retroactively.
alter table public.id_swaps add column if not exists exchange_group uuid;
create index if not exists id_swaps_exchange_group_idx on public.id_swaps(exchange_group);

-- The records and PIN resets must succeed or fail together.
create or replace function public.admin_record_id_change(
  p_old_id text, p_new_id text, p_date date, p_cycle text, p_notes text, p_exchange boolean
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_old text := upper(trim(p_old_id));
  v_new text := upper(trim(p_new_id));
  v_group uuid := case when p_exchange then gen_random_uuid() else null end;
  v_first public.id_swaps;
  v_second public.id_swaps;
begin
  if coalesce(v_old, '') = '' or coalesce(v_new, '') = '' or v_old = v_new or p_date is null or coalesce(trim(p_cycle), '') = '' then
    raise exception 'Two different IDs, an effective date and cycle are required';
  end if;
  if p_date > current_date then
    raise exception 'Future ID changes cannot be recorded because PINs are reset immediately.';
  end if;
  -- Serialize changes involving either ID, including concurrent requests.
  perform pg_advisory_xact_lock(hashtextextended(least(v_old, v_new), 0));
  perform pg_advisory_xact_lock(hashtextextended(greatest(v_old, v_new), 0));
  if exists (select 1 from id_swaps where effective_date = p_date and (old_worker_id in (v_old, v_new) or new_worker_id in (v_old, v_new))) then
    raise exception 'An ID change already involves one of these IDs on that date. Review the existing record before continuing.';
  end if;
  if not p_exchange and exists (select 1 from worker_pins where worker_id = v_new) then
    raise exception 'The destination ID already has a PIN. Use an exchange if two workers are swapping IDs, or verify the destination with support.';
  end if;
  insert into id_swaps(worker_name, old_worker_id, new_worker_id, effective_date, cycle_key, notes, exchange_group)
    values (v_old || ' → ' || v_new, v_old, v_new, p_date, p_cycle, nullif(trim(p_notes), ''), v_group)
    returning * into v_first;
  if p_exchange then
    insert into id_swaps(worker_name, old_worker_id, new_worker_id, effective_date, cycle_key, notes, exchange_group)
      values (v_new || ' → ' || v_old, v_new, v_old, p_date, p_cycle, nullif(trim(p_notes), ''), v_group)
      returning * into v_second;
  end if;
  delete from worker_pins where worker_id = v_old or (p_exchange and worker_id = v_new);
  return jsonb_build_object('swap', to_jsonb(v_first), 'reverse_swap', case when p_exchange then to_jsonb(v_second) else null end);
end;
$$;
revoke all on function public.admin_record_id_change(text,text,date,text,text,boolean) from public, anon, authenticated;
grant execute on function public.admin_record_id_change(text,text,date,text,text,boolean) to service_role;

create or replace function public.admin_delete_id_change(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_group uuid;
begin
  select exchange_group into v_group from id_swaps where id = p_id;
  if v_group is null then
    delete from id_swaps where id = p_id;
  else
    delete from id_swaps where exchange_group = v_group;
  end if;
end;
$$;
revoke all on function public.admin_delete_id_change(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_id_change(uuid) to service_role;

-- Move a PIN and record its one-way history in the same transaction. An
-- occupied destination is never overwritten by a self-service request.
create or replace function public.user_record_id_move(
  p_old_id text, p_new_id text, p_old_hash text, p_new_hash text,
  p_date date, p_cycle text, p_notes text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_old text := upper(trim(p_old_id));
  v_new text := upper(trim(p_new_id));
  v_pin text;
  v_swap public.id_swaps;
begin
  if coalesce(v_old, '') = '' or coalesce(v_new, '') = '' or v_old = v_new or p_date is null or coalesce(trim(p_cycle), '') = '' then
    raise exception 'Invalid ID change';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(least(v_old, v_new), 0));
  perform pg_advisory_xact_lock(hashtextextended(greatest(v_old, v_new), 0));
  select pin_hash into v_pin from worker_pins where worker_id = v_old for update;
  if v_pin is null or v_pin <> p_old_hash then
    raise exception 'Could not verify your current ID and PIN. Please log in and try again.';
  end if;
  if exists (select 1 from id_swaps where effective_date = p_date and (old_worker_id in (v_old, v_new) or new_worker_id in (v_old, v_new))) then
    raise exception 'An ID change already involves one of these IDs on that date. Please contact Support.';
  end if;
  if exists (select 1 from worker_pins where worker_id = v_new) then
    raise exception 'That ID already has an account. If two workers are exchanging IDs, please ask an admin to record the exchange.';
  end if;
  insert into id_swaps(worker_name, old_worker_id, new_worker_id, effective_date, cycle_key, notes, created_by)
    values (v_old, v_old, v_new, p_date, p_cycle, nullif(trim(p_notes), ''), 'user:' || v_old)
    returning * into v_swap;
  update worker_pins set worker_id = v_new, pin_hash = p_new_hash where worker_id = v_old;
  delete from worker_sessions where worker_id = v_old;
  return to_jsonb(v_swap);
end;
$$;
revoke all on function public.user_record_id_move(text,text,text,text,date,text,text) from public, anon, authenticated;
grant execute on function public.user_record_id_move(text,text,text,text,date,text,text) to service_role;
