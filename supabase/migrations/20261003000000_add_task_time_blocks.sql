-- Requires the existing public.tasks(id uuid, user_id uuid) application table.
-- This checkout does not contain the application's baseline or My Day migrations.
begin;

create unique index tasks_id_user_id_agenda_key on public.tasks (id, user_id);

create table public.task_time_blocks (
  task_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  constraint task_time_blocks_owned_task foreign key (task_id, user_id)
    references public.tasks(id, user_id) on delete cascade,
  constraint task_time_blocks_valid_interval check (
    isfinite(starts_at) and isfinite(ends_at)
    and ends_at >= starts_at + interval '15 minutes'
  )
);

create index task_time_blocks_user_start on public.task_time_blocks (user_id, starts_at);
create index task_time_blocks_user_end on public.task_time_blocks (user_id, ends_at);
alter table public.task_time_blocks enable row level security;
grant select, insert, update, delete on public.task_time_blocks to authenticated;
revoke all on public.task_time_blocks from anon;

create policy time_blocks_select on public.task_time_blocks for select to authenticated
  using (user_id = (select auth.uid()));
create policy time_blocks_insert on public.task_time_blocks for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.tasks where id = task_id and tasks.user_id = (select auth.uid())
  ));
create policy time_blocks_update on public.task_time_blocks for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.tasks where id = task_id and tasks.user_id = (select auth.uid())
  ));
create policy time_blocks_delete on public.task_time_blocks for delete to authenticated
  using (user_id = (select auth.uid()));

-- Keep the existing My Day completion rule atomic for all completion entry points.
-- Conditional because its baseline migration is absent from this checkout.
create function public.agenda_clear_completed_task_focus() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.completed and not old.completed and to_regclass('public.daily_task_selections') is not null then
    update public.daily_task_selections set focused = false
      where task_id = new.id and user_id = new.user_id and focused;
  end if;
  return new;
end;
$$;
revoke all on function public.agenda_clear_completed_task_focus() from public;
create trigger agenda_task_completion_focus after update of completed on public.tasks
  for each row execute function public.agenda_clear_completed_task_focus();

commit;
