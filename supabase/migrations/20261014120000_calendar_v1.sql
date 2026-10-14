-- Calendar V1 keeps Lists as organization metadata, reuses task time blocks
-- for explicit scheduling, and introduces Events as a separate entity.

alter table public.lists
  add column if not exists color text;

-- Existing rows receive stable, varied colors. Ordering by id makes the
-- backfill deterministic even though the legacy Lists table has no created_at.
with ranked_lists as (
  select
    id,
    row_number() over (partition by user_id order by id) - 1 as color_index
  from public.lists
  where color is null
),
palette as (
  select array[
    'blue', 'indigo', 'violet', 'pink', 'red',
    'orange', 'amber', 'green', 'teal', 'cyan'
  ]::text[] as colors
)
update public.lists as list
set color = palette.colors[((ranked_lists.color_index % 10) + 1)::integer]
from ranked_lists, palette
where list.id = ranked_lists.id;

-- "auto" is an insert-only sentinel. The trigger replaces it before the row
-- is checked or stored, choosing the user's least-used approved color.
create or replace function public.assign_list_color()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.color is null or new.color = 'auto' then
    select candidate.color
    into new.color
    from unnest(array[
      'blue', 'indigo', 'violet', 'pink', 'red',
      'orange', 'amber', 'green', 'teal', 'cyan'
    ]::text[]) with ordinality as candidate(color, palette_order)
    left join public.lists existing
      on existing.user_id = new.user_id
      and existing.color = candidate.color
      and (tg_op = 'INSERT' or existing.id <> new.id)
    group by candidate.color, candidate.palette_order
    order by count(existing.id), candidate.palette_order
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists assign_list_color on public.lists;
create trigger assign_list_color
before insert or update of color on public.lists
for each row execute function public.assign_list_color();

alter table public.lists
  alter column color set default 'auto',
  alter column color set not null;

alter table public.lists
  drop constraint if exists lists_color_check;
alter table public.lists
  add constraint lists_color_check check (
    color = any (array[
      'blue', 'indigo', 'violet', 'pink', 'red',
      'orange', 'amber', 'green', 'teal', 'cyan'
    ]::text[])
  );

-- A nullable end represents a scheduled task with no explicit duration. The
-- Calendar and Agenda may give it a minimum visual height without persisting
-- that display-only duration.
alter table public.task_time_blocks
  alter column ends_at drop not null;

alter table public.task_time_blocks
  drop constraint if exists task_time_blocks_valid_interval;
alter table public.task_time_blocks
  add constraint task_time_blocks_valid_interval check (
    ends_at is null or ends_at > starts_at
  );

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid references public.lists(id) on delete set null,
  title text not null,
  all_day boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_shape check (
    (
      all_day = false
      and starts_at is not null
      and ends_at is not null
      and ends_at > starts_at
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
  )
);

comment on column public.events.title is
  'Client-encrypted event title, following the same convention as tasks.title.';
comment on column public.events.ends_on is
  'Exclusive date-only end for all-day events; never convert it through UTC.';

create index if not exists events_user_timed_range_idx
  on public.events (user_id, starts_at, ends_at)
  where all_day = false;
create index if not exists events_user_all_day_range_idx
  on public.events (user_id, starts_on, ends_on)
  where all_day = true;
create index if not exists events_list_id_idx
  on public.events (list_id);

create or replace function public.set_event_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_event_updated_at on public.events;
create trigger set_event_updated_at
before update on public.events
for each row execute function public.set_event_updated_at();

alter table public.events enable row level security;

drop policy if exists "Users can read their own events" on public.events;
create policy "Users can read their own events"
on public.events for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their own events" on public.events;
create policy "Users can create their own events"
on public.events for insert
with check (
  auth.uid() = user_id
  and (
    list_id is null
    or exists (
      select 1
      from public.lists
      where lists.id = events.list_id
        and lists.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can update their own events" on public.events;
create policy "Users can update their own events"
on public.events for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    list_id is null
    or exists (
      select 1
      from public.lists
      where lists.id = events.list_id
        and lists.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can delete their own events" on public.events;
create policy "Users can delete their own events"
on public.events for delete
using (auth.uid() = user_id);

grant select, insert, update, delete on public.events to authenticated;

notify pgrst, 'reload schema';
