-- Expand the original one-time task_time_blocks table into a session table.
-- Existing rows are preserved: their starts_at/ends_at values remain the
-- user's existing planned times, while tasks.due_date/due_time remain the
-- user's existing Finish by values.
begin;

alter table public.tasks
  add column if not exists recurrence_rule jsonb;

-- The old table used task_id as its primary key, which made a second session
-- impossible. Stable row identity is required for moving/resizing one session
-- without touching its siblings.
alter table public.task_time_blocks
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists status text not null default 'scheduled',
  add column if not exists occurrence_id uuid,
  add column if not exists session_index integer,
  add column if not exists is_override boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.task_time_blocks
set id = gen_random_uuid()
where id is null;

alter table public.task_time_blocks
  alter column id set not null,
  alter column id set default gen_random_uuid();

alter table public.task_time_blocks
  drop constraint if exists task_time_blocks_pkey;

alter table public.task_time_blocks
  add constraint task_time_blocks_pkey primary key (id);

alter table public.task_time_blocks
  drop constraint if exists task_time_blocks_status_check;
alter table public.task_time_blocks
  add constraint task_time_blocks_status_check
  check (status in ('scheduled', 'skipped'));

create index if not exists task_time_blocks_user_task_idx
  on public.task_time_blocks (user_id, task_id, starts_at);
create index if not exists task_time_blocks_user_start_idx
  on public.task_time_blocks (user_id, starts_at, ends_at)
  where status = 'scheduled';

-- A recurring task owns stable, idempotent occurrence rows. The application
-- upserts these rows by (task_id, occurrence_date), so refreshes never create
-- another copy of the same occurrence.
create table if not exists public.task_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null,
  occurrence_date date not null,
  completed boolean not null default false,
  skipped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_occurrences_unique_date unique (task_id, occurrence_date),
  constraint task_occurrences_identity unique (id, user_id, task_id),
  constraint task_occurrences_owned_task foreign key (task_id, user_id)
    references public.tasks(id, user_id) on delete cascade,
  constraint task_occurrences_terminal_state check (not (completed and skipped))
);

alter table public.task_time_blocks
  drop constraint if exists task_time_blocks_owned_occurrence;
alter table public.task_time_blocks
  add constraint task_time_blocks_owned_occurrence
  foreign key (occurrence_id, user_id, task_id)
  references public.task_occurrences(id, user_id, task_id)
  on delete cascade;

alter table public.task_time_blocks
  drop constraint if exists task_time_blocks_occurrence_session_unique;
alter table public.task_time_blocks
  add constraint task_time_blocks_occurrence_session_unique
  unique (occurrence_id, session_index);

alter table public.task_time_blocks
  drop constraint if exists task_time_blocks_session_index_check;
alter table public.task_time_blocks
  add constraint task_time_blocks_session_index_check
  check (session_index is null or session_index >= 0);

create index if not exists task_occurrences_user_date_idx
  on public.task_occurrences (user_id, occurrence_date);
create index if not exists task_occurrences_task_date_idx
  on public.task_occurrences (task_id, occurrence_date);

alter table public.task_occurrences enable row level security;
revoke all on public.task_occurrences from public, anon;
grant select, insert, update, delete on public.task_occurrences to authenticated;

drop policy if exists task_occurrences_select on public.task_occurrences;
create policy task_occurrences_select
on public.task_occurrences for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists task_occurrences_insert on public.task_occurrences;
create policy task_occurrences_insert
on public.task_occurrences for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.tasks
    where tasks.id = task_occurrences.task_id
      and tasks.user_id = (select auth.uid())
      and tasks.recurrence_rule is not null
  )
);

drop policy if exists task_occurrences_update on public.task_occurrences;
create policy task_occurrences_update
on public.task_occurrences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists task_occurrences_delete on public.task_occurrences;
create policy task_occurrences_delete
on public.task_occurrences for delete to authenticated
using ((select auth.uid()) = user_id);

-- Existing session policies already scope task_time_blocks by user_id. Keep
-- them and add the new column relationship to the schema cache.
notify pgrst, 'reload schema';

commit;
