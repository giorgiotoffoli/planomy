begin;

-- A recurring task keeps its series definition on tasks. Occurrence-specific
-- fields live here so completion/skip state and prior edits remain independent
-- from later series changes.
alter table public.task_occurrences
  add column if not exists cancelled boolean not null default false,
  add column if not exists override_data jsonb;

create index if not exists task_occurrences_active_task_date_idx
  on public.task_occurrences (task_id, occurrence_date)
  where cancelled = false;

notify pgrst, 'reload schema';

commit;
