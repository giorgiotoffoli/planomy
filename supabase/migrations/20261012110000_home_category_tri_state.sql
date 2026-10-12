alter table public.user_preferences
  add column if not exists included_home_category_ids uuid[] not null default '{}'::uuid[];

-- Existing category exclusions represent the categories that were selected before
-- this migration. Materialize those selections so newly-created categories do not
-- unexpectedly appear in an already-partial list.
update public.user_preferences preferences
set included_home_category_ids = coalesce(
  (
    select array_agg(category.id order by category.position, category.id)
    from public.categories category
    join public.lists list on list.id = category.list_id
    where list.user_id = preferences.user_id
      and not (category.list_id = any(
        coalesce(preferences.excluded_home_list_ids, '{}'::uuid[])
      ))
      and not (category.id = any(
        coalesce(preferences.excluded_home_category_ids, '{}'::uuid[])
      ))
  ),
  '{}'::uuid[]
)
where coalesce(array_length(preferences.excluded_home_category_ids, 1), 0) > 0
  and coalesce(array_length(preferences.included_home_category_ids, 1), 0) = 0;

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
declare
  v_category_ids uuid[];
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

  v_category_ids := coalesce(
    (
      select array_agg(category.id)
      from public.categories category
      where category.list_id = p_list_id
    ),
    '{}'::uuid[]
  );

  insert into public.user_preferences (
    user_id,
    excluded_home_list_ids,
    excluded_home_category_ids,
    included_home_category_ids
  )
  values (
    auth.uid(),
    case when p_visible then '{}'::uuid[] else array[p_list_id] end,
    '{}'::uuid[],
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
  excluded_home_category_ids = array(
    select category_id
    from unnest(coalesce(
      public.user_preferences.excluded_home_category_ids,
      '{}'::uuid[]
    )) as existing(category_id)
    where not (category_id = any(v_category_ids))
  ),
  included_home_category_ids = array(
    select category_id
    from unnest(coalesce(
      public.user_preferences.included_home_category_ids,
      '{}'::uuid[]
    )) as existing(category_id)
    where not (category_id = any(v_category_ids))
  ),
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
declare
  v_list_id uuid;
  v_category_ids uuid[];
  v_existing_excluded_category_ids uuid[];
  v_existing_included_category_ids uuid[];
  v_excluded_list_ids uuid[];
  v_enabled_category_ids uuid[];
  v_parent_is_disabled boolean;
  v_has_uncategorized_tasks boolean;
  v_enabled_count integer;
  v_total_count integer;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select category.list_id
  into v_list_id
  from public.categories category
  join public.lists list on list.id = category.list_id
  where category.id = p_category_id
    and list.user_id = auth.uid();

  if v_list_id is null then
    raise exception 'Category not found';
  end if;

  v_category_ids := coalesce(
    (
      select array_agg(category.id)
      from public.categories category
      where category.list_id = v_list_id
    ),
    '{}'::uuid[]
  );

  select
    coalesce(preferences.excluded_home_list_ids, '{}'::uuid[]),
    coalesce(preferences.excluded_home_category_ids, '{}'::uuid[]),
    coalesce(preferences.included_home_category_ids, '{}'::uuid[])
  into
    v_excluded_list_ids,
    v_existing_excluded_category_ids,
    v_existing_included_category_ids
  from public.user_preferences preferences
  where preferences.user_id = auth.uid();

  v_excluded_list_ids := coalesce(v_excluded_list_ids, '{}'::uuid[]);
  v_existing_excluded_category_ids := coalesce(
    v_existing_excluded_category_ids,
    '{}'::uuid[]
  );
  v_existing_included_category_ids := coalesce(
    v_existing_included_category_ids,
    '{}'::uuid[]
  );
  v_parent_is_disabled := v_list_id = any(v_excluded_list_ids);
  select exists (
    select 1
    from public.tasks task
    where task.user_id = auth.uid()
      and task.list_id = v_list_id
      and task.category_id is null
      and task.completed = false
  )
  into v_has_uncategorized_tasks;

  v_enabled_category_ids := array(
    select category_id
    from unnest(v_category_ids) as current_category(category_id)
    where category_id = any(v_existing_included_category_ids)
  );

  if coalesce(array_length(v_enabled_category_ids, 1), 0) = 0
    and not exists (
      select 1
      from unnest(v_existing_included_category_ids) as current_category(category_id)
      where category_id = any(v_category_ids)
    ) then
    v_enabled_category_ids := array(
      select category_id
      from unnest(v_category_ids) as current_category(category_id)
      where not (category_id = any(v_existing_excluded_category_ids))
    );
  end if;

  v_enabled_count := coalesce(array_length(v_enabled_category_ids, 1), 0);
  v_total_count := coalesce(array_length(v_category_ids, 1), 0);

  if (v_parent_is_disabled or v_enabled_count = 0) and p_visible then
    -- A child checked under an unchecked parent starts a new partial selection.
    v_excluded_list_ids := array_remove(v_excluded_list_ids, v_list_id);
    v_enabled_category_ids := array[p_category_id];
  elsif p_visible then
    v_enabled_category_ids := array(
      select distinct category_id
      from unnest(array_append(v_enabled_category_ids, p_category_id)) as next_category(category_id)
    );
  else
    v_enabled_category_ids := array(
      select category_id
      from unnest(v_enabled_category_ids) as next_category(category_id)
      where category_id <> p_category_id
    );
  end if;

  v_enabled_count := coalesce(array_length(v_enabled_category_ids, 1), 0);

  if v_enabled_count = 0 then
    if v_has_uncategorized_tasks then
      -- Direct list tasks keep the parent source partially enabled.
      v_excluded_list_ids := array_remove(v_excluded_list_ids, v_list_id);
    else
      -- No selected categories and no direct tasks means the whole source is off.
      v_excluded_list_ids := case
        when v_list_id = any(v_excluded_list_ids) then v_excluded_list_ids
        else array_append(v_excluded_list_ids, v_list_id)
      end;
    end if;
  elsif v_enabled_count = v_total_count then
    -- All categories selected: use the compact parent-level representation.
    v_excluded_list_ids := array_remove(v_excluded_list_ids, v_list_id);
  else
    -- Partial state: explicitly store both sides so future categories inherit off.
    v_excluded_list_ids := array_remove(v_excluded_list_ids, v_list_id);
  end if;

  insert into public.user_preferences (
    user_id,
    excluded_home_list_ids,
    excluded_home_category_ids,
    included_home_category_ids
  )
  values (
    auth.uid(),
    v_excluded_list_ids,
    case
      when (v_enabled_count = 0 and not v_has_uncategorized_tasks)
        or v_enabled_count = v_total_count
        then '{}'::uuid[]
      else array(
        select category_id
        from unnest(v_category_ids) as current_category(category_id)
        where not (category_id = any(v_enabled_category_ids))
      )
    end,
    case
      when (v_enabled_count = 0 and not v_has_uncategorized_tasks)
        or v_enabled_count = v_total_count
        then '{}'::uuid[]
      else v_enabled_category_ids
    end
  )
  on conflict (user_id) do update
  set excluded_home_list_ids = excluded.excluded_home_list_ids,
      excluded_home_category_ids = array(
        select category_id
        from unnest(public.user_preferences.excluded_home_category_ids) as existing(category_id)
        where not (category_id = any(v_category_ids))
        union
        select category_id
        from unnest(excluded.excluded_home_category_ids) as next(category_id)
      ),
      included_home_category_ids = array(
        select category_id
        from unnest(public.user_preferences.included_home_category_ids) as existing(category_id)
        where not (category_id = any(v_category_ids))
        union
        select category_id
        from unnest(excluded.included_home_category_ids) as next(category_id)
      ),
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
    included_home_category_ids,
    show_unsorted_on_home
  )
  values (auth.uid(), '{}'::uuid[], '{}'::uuid[], '{}'::uuid[], true)
  on conflict (user_id) do update
  set excluded_home_list_ids = '{}'::uuid[],
      excluded_home_category_ids = '{}'::uuid[],
      included_home_category_ids = '{}'::uuid[],
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
