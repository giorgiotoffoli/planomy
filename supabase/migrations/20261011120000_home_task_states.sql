alter table public.tasks
  add column if not exists focused boolean not null default false,
  add column if not exists stashed boolean not null default false;

create index if not exists tasks_user_focused_idx
  on public.tasks (user_id, focused)
  where focused = true and completed = false and stashed = false;

create or replace function public.clear_task_focus_for_terminal_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.completed or new.stashed then
    new.focused := false;
  end if;

  return new;
end;
$$;

drop trigger if exists clear_task_focus_for_terminal_state on public.tasks;

create trigger clear_task_focus_for_terminal_state
before update of completed, stashed, focused on public.tasks
for each row
execute function public.clear_task_focus_for_terminal_state();

create or replace function public.set_task_focus(
  p_task_id uuid,
  p_focused boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  focused_count integer;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  -- Serialise focus changes per user so two concurrent requests cannot exceed
  -- the three-task limit.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

  if p_focused then
    if not exists (
      select 1
      from public.tasks
      where id = p_task_id
        and user_id = auth.uid()
        and completed = false
        and stashed = false
    ) then
      raise exception 'Task cannot be focused';
    end if;

    select count(*)
      into focused_count
      from public.tasks
      where user_id = auth.uid()
        and focused = true
        and completed = false
        and stashed = false
        and id <> p_task_id;

    if focused_count >= 3 then
      raise exception 'You can focus up to three tasks. Remove one first.';
    end if;
  end if;

  update public.tasks
  set focused = p_focused
  where id = p_task_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Task not found';
  end if;
end;
$$;
