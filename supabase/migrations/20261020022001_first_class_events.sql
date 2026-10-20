begin;

-- Events are intentionally separate from tasks. Text fields continue to use
-- Planomy's client-side encryption convention; recurrence metadata is kept
-- structured so the server can deterministically expand visible occurrences.
alter table public.events
  add column if not exists description text,
  add column if not exists location text,
  add column if not exists time_zone text not null default 'UTC',
  add column if not exists recurrence_rule jsonb;

alter table public.events
  drop constraint if exists events_time_shape;
alter table public.events
  add constraint events_time_shape check (
    (
      all_day = false
      and starts_at is not null
      and (ends_at is null or ends_at > starts_at)
      and starts_on is null
      and ends_on is null
    )
    or
    (
      all_day = true
      and starts_at is null
      and ends_at is null
      and starts_on is not null
      and ends_on is not null
      and ends_on > starts_on
    )
  );

alter table public.events
  drop constraint if exists events_time_zone_check;
alter table public.events
  add constraint events_time_zone_check check (length(time_zone) between 1 and 128);

create index if not exists events_user_recurrence_idx
  on public.events (user_id)
  where recurrence_rule is not null;

create table if not exists public.event_occurrence_exceptions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_key text not null,
  cancelled boolean not null default false,
  title text,
  description text,
  location text,
  time_zone text,
  list_id uuid references public.lists(id) on delete set null,
  all_day boolean,
  starts_at timestamptz,
  ends_at timestamptz,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_occurrence_exceptions_unique unique (event_id, occurrence_key),
  constraint event_occurrence_exceptions_shape check (
    cancelled
    or (
      (all_day = false and starts_at is not null and (ends_at is null or ends_at > starts_at) and starts_on is null and ends_on is null)
      or
      (all_day = true and starts_at is null and ends_at is null and starts_on is not null and ends_on is not null and ends_on > starts_on)
    )
  )
);

create index if not exists event_occurrence_exceptions_user_event_idx
  on public.event_occurrence_exceptions (user_id, event_id, occurrence_key);

create or replace function public.set_event_occurrence_exception_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_event_occurrence_exception_updated_at on public.event_occurrence_exceptions;
create trigger set_event_occurrence_exception_updated_at
before update on public.event_occurrence_exceptions
for each row execute function public.set_event_occurrence_exception_updated_at();

alter table public.event_occurrence_exceptions enable row level security;
revoke all on public.event_occurrence_exceptions from public, anon;
grant select, insert, update, delete on public.event_occurrence_exceptions to authenticated;

drop policy if exists event_occurrence_exceptions_select on public.event_occurrence_exceptions;
create policy event_occurrence_exceptions_select
on public.event_occurrence_exceptions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists event_occurrence_exceptions_insert on public.event_occurrence_exceptions;
create policy event_occurrence_exceptions_insert
on public.event_occurrence_exceptions for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.events
    where events.id = event_occurrence_exceptions.event_id
      and events.user_id = (select auth.uid())
      and events.recurrence_rule is not null
  )
  and (
    list_id is null
    or exists (
      select 1 from public.lists
      where lists.id = event_occurrence_exceptions.list_id
        and lists.user_id = (select auth.uid())
    )
  )
);

drop policy if exists event_occurrence_exceptions_update on public.event_occurrence_exceptions;
create policy event_occurrence_exceptions_update
on public.event_occurrence_exceptions for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    list_id is null
    or exists (
      select 1 from public.lists
      where lists.id = event_occurrence_exceptions.list_id
        and lists.user_id = (select auth.uid())
    )
  )
);

drop policy if exists event_occurrence_exceptions_delete on public.event_occurrence_exceptions;
create policy event_occurrence_exceptions_delete
on public.event_occurrence_exceptions for delete to authenticated
using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
commit;
