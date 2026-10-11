-- New lists should start with no categories. Uncategorized is represented by
-- tasks.category_id = null, so there is no replacement row to insert.
drop trigger if exists create_statuses_for_new_list on public.lists;
drop function if exists public.create_default_list_statuses();

-- The old trigger inserted this exact plaintext trio at positions 0, 1, and 2.
-- Only remove a trio when all three rows are present for the same list, which
-- avoids deleting an independently created category with one of these titles.
do $$
declare
  default_category_ids uuid[];
begin
  if to_regclass('public.categories') is null then
    return;
  end if;

  with default_lists as (
    select list_id
    from public.categories
    where (title, position) in (
      ('To do', 0),
      ('In progress', 1),
      ('Done', 2)
    )
    group by list_id
    having count(*) = 3
  )
  select coalesce(array_agg(c.id), '{}')
    into default_category_ids
  from public.categories c
  join default_lists dl on dl.list_id = c.list_id
  where (c.title, c.position) in (
    ('To do', 0),
    ('In progress', 1),
    ('Done', 2)
  );

  update public.tasks
  set category_id = null
  where category_id = any(default_category_ids);

  delete from public.categories
  where id = any(default_category_ids);
end;
$$;

notify pgrst, 'reload schema';
