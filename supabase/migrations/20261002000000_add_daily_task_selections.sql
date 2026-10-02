-- Personal, date-scoped references to existing tasks. No decrypted task content is stored here.
create table public.daily_task_selections (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  selected_date date not null,
  focused boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, task_id, selected_date)
);

create index daily_task_selections_user_date_idx on public.daily_task_selections (user_id, selected_date);
alter table public.daily_task_selections enable row level security;

create policy "Users manage their own daily selections"
  on public.daily_task_selections for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.tasks where tasks.id = task_id and tasks.user_id = auth.uid()
    )
  );

-- The row lock serializes focus changes for a user/day, making the three-item limit authoritative.
create or replace function public.set_daily_task_focus(p_task_id uuid, p_selected_date date, p_focused boolean)
returns void language plpgsql security invoker set search_path = public as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  perform pg_advisory_xact_lock(hashtext(v_user_id::text || p_selected_date::text));
  if not exists (
    select 1 from daily_task_selections d join tasks t on t.id = d.task_id
    where d.user_id = v_user_id and d.task_id = p_task_id and d.selected_date = p_selected_date
      and t.user_id = v_user_id and not t.completed
  ) then raise exception 'Only an incomplete task selected for this day can be focused'; end if;
  if p_focused and (select count(*) from daily_task_selections where user_id = v_user_id and selected_date = p_selected_date and focused) >= 3 then
    raise exception 'You can focus up to three tasks. Unpin one first.';
  end if;
  update daily_task_selections set focused = p_focused
  where user_id = v_user_id and task_id = p_task_id and selected_date = p_selected_date;
end $$;

create or replace function public.clear_completed_daily_focus()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.completed and not old.completed then
    update daily_task_selections set focused = false where task_id = new.id;
  end if;
  return new;
end $$;

create trigger clear_daily_focus_when_task_completed after update of completed on public.tasks
for each row execute function public.clear_completed_daily_focus();

-- Ask PostgREST to immediately expose the new table and RPC through Supabase's API.
notify pgrst, 'reload schema';
