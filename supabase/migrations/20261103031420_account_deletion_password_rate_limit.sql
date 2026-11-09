create schema if not exists planomy_private;

revoke all on schema planomy_private from public, anon, authenticated;

create table planomy_private.account_deletion_attempts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null,
  attempt_count integer not null check (attempt_count > 0)
);

alter table planomy_private.account_deletion_attempts enable row level security;
revoke all on table planomy_private.account_deletion_attempts from public, anon, authenticated, service_role;

create or replace function public.consume_account_deletion_attempt(p_user_id uuid)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_started_at timestamptz;
  v_attempt_count integer;
begin
  insert into planomy_private.account_deletion_attempts as attempts (
    user_id,
    window_started_at,
    attempt_count
  )
  values (p_user_id, pg_catalog.now(), 1)
  on conflict (user_id) do update
  set
    window_started_at = case
      when attempts.window_started_at <= pg_catalog.now() - interval '15 minutes'
        then pg_catalog.now()
      else attempts.window_started_at
    end,
    attempt_count = case
      when attempts.window_started_at <= pg_catalog.now() - interval '15 minutes'
        then 1
      else attempts.attempt_count + 1
    end
  returning attempts.window_started_at, attempts.attempt_count
  into v_window_started_at, v_attempt_count;

  return query
  select
    v_attempt_count <= 5,
    case
      when v_attempt_count > 5 then greatest(
        1,
        pg_catalog.ceil(extract(epoch from (v_window_started_at + interval '15 minutes' - pg_catalog.now())))::integer
      )
      else 0
    end;
end;
$$;

revoke all on function public.consume_account_deletion_attempt(uuid) from public, anon, authenticated;
grant execute on function public.consume_account_deletion_attempt(uuid) to service_role;
