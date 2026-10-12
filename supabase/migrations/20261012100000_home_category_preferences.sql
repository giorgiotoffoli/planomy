alter table public.user_preferences
  add column if not exists excluded_home_category_ids uuid[] not null default '{}'::uuid[];

-- Replace the original two-argument function with a version that can clear
-- category exceptions when a partially-enabled list is explicitly enabled.
drop function if exists public.set_home_list_visibility(uuid, boolean);

create or replace function public.set_home_list_visibility(
  p_list_id uuid,
  p_visible boolean,
  p_clear_category_overrides boolean default false
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

  insert into public.user_preferences (
    user_id,
    excluded_home_list_ids,
    excluded_home_category_ids
  )
  values (
    auth.uid(),
    case when p_visible then '{}'::uuid[] else array[p_list_id] end,
    '{}'::uuid[]
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
  excluded_home_category_ids = case
    when p_visible and p_clear_category_overrides then array(
      select existing_category.category_id
      from unnest(public.user_preferences.excluded_home_category_ids)
        as existing_category(category_id)
      where not exists (
        select 1
        from public.categories
        where id = existing_category.category_id
          and list_id = p_list_id
      )
    )
    else public.user_preferences.excluded_home_category_ids
  end,
  updated_at = now();
end;
$$;

create or replace function public.set_home_category_visibility(
  p_category_id uuid,
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
    from public.categories
    join public.lists on lists.id = categories.list_id
    where categories.id = p_category_id
      and lists.user_id = auth.uid()
  ) then
    raise exception 'Category not found';
  end if;

  insert into public.user_preferences (
    user_id,
    excluded_home_category_ids
  )
  values (
    auth.uid(),
    case when p_visible then '{}'::uuid[] else array[p_category_id] end
  )
  on conflict (user_id) do update
  set excluded_home_category_ids = case
    when p_visible then array_remove(
      public.user_preferences.excluded_home_category_ids,
      p_category_id
    )
    when p_category_id = any(public.user_preferences.excluded_home_category_ids)
      then public.user_preferences.excluded_home_category_ids
    else array_append(
      public.user_preferences.excluded_home_category_ids,
      p_category_id
    )
  end,
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
    excluded_home_category_ids,
    show_unsorted_on_home
  )
  values (auth.uid(), '{}'::uuid[], '{}'::uuid[], true)
  on conflict (user_id) do update
  set excluded_home_list_ids = '{}'::uuid[],
      excluded_home_category_ids = '{}'::uuid[],
      show_unsorted_on_home = true,
      updated_at = now();
end;
$$;

revoke all on function public.set_home_list_visibility(uuid, boolean, boolean) from public;
grant execute on function public.set_home_list_visibility(uuid, boolean, boolean) to authenticated;
revoke all on function public.set_home_category_visibility(uuid, boolean) from public;
grant execute on function public.set_home_category_visibility(uuid, boolean) to authenticated;
revoke all on function public.show_all_home_sources() from public;
grant execute on function public.show_all_home_sources() to authenticated;

notify pgrst, 'reload schema';
