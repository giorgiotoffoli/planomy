create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  excluded_home_list_ids uuid[] not null default '{}'::uuid[],
  show_unsorted_on_home boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users manage their own preferences" on public.user_preferences;
create policy "Users manage their own preferences"
  on public.user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_home_list_visibility(
  p_list_id uuid,
  p_visible boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if not exists (
    select 1
    from public.lists
    where id = p_list_id and user_id = auth.uid()
  ) then
    raise exception 'List not found';
  end if;

  insert into public.user_preferences (user_id, excluded_home_list_ids)
  values (
    auth.uid(),
    case when p_visible then '{}'::uuid[] else array[p_list_id] end
  )
  on conflict (user_id) do update
  set excluded_home_list_ids = case
    when p_visible then array_remove(
      public.user_preferences.excluded_home_list_ids,
      p_list_id
    )
    when p_list_id = any(public.user_preferences.excluded_home_list_ids)
      then public.user_preferences.excluded_home_list_ids
    else array_append(
      public.user_preferences.excluded_home_list_ids,
      p_list_id
    )
  end,
  updated_at = now();
end;
$$;

create or replace function public.set_home_unsorted_visibility(
  p_show_unsorted boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  insert into public.user_preferences (user_id, show_unsorted_on_home)
  values (auth.uid(), p_show_unsorted)
  on conflict (user_id) do update
  set show_unsorted_on_home = excluded.show_unsorted_on_home,
      updated_at = now();
end;
$$;

create or replace function public.show_all_home_sources()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  insert into public.user_preferences (
    user_id,
    excluded_home_list_ids,
    show_unsorted_on_home
  )
  values (auth.uid(), '{}'::uuid[], true)
  on conflict (user_id) do update
  set excluded_home_list_ids = '{}'::uuid[],
      show_unsorted_on_home = true,
      updated_at = now();
end;
$$;

revoke all on function public.set_home_list_visibility(uuid, boolean) from public;
grant execute on function public.set_home_list_visibility(uuid, boolean) to authenticated;
revoke all on function public.set_home_unsorted_visibility(boolean) from public;
grant execute on function public.set_home_unsorted_visibility(boolean) to authenticated;
revoke all on function public.show_all_home_sources() from public;
grant execute on function public.show_all_home_sources() to authenticated;

grant select, insert, update, delete on public.user_preferences to authenticated;

notify pgrst, 'reload schema';
