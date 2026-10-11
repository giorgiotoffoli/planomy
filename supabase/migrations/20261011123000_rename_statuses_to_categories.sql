-- Categories replace the old Status concept without copying or dropping data.
do $$
begin
  if to_regclass('public.statuses') is not null
     and to_regclass('public.categories') is null then
    alter table public.statuses rename to categories;
  end if;

  if to_regclass('public.tasks') is not null
     and exists (
       select 1 from pg_attribute
       where attrelid = 'public.tasks'::regclass
         and attname = 'status_id'
         and not attisdropped
     )
     and not exists (
       select 1 from pg_attribute
       where attrelid = 'public.tasks'::regclass
         and attname = 'category_id'
         and not attisdropped
     ) then
    alter table public.tasks rename column status_id to category_id;
  end if;
end;
$$;

-- PostgreSQL keeps old constraint names after a table/column rename. Rename the
-- known generated names when they exist, while remaining safe across installs.
do $$
begin
  if to_regclass('public.categories') is not null
     and exists (
    select 1 from pg_constraint
    where conname = 'statuses_list_id_fkey'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      rename constraint statuses_list_id_fkey to categories_list_id_fkey;
  end if;

  if to_regclass('public.tasks') is not null
     and exists (
    select 1 from pg_constraint
    where conname = 'tasks_status_id_fkey'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      rename constraint tasks_status_id_fkey to tasks_category_id_fkey;
  end if;
end;
$$;

-- Rename related policy, index, and trigger names in place when an existing
-- installation used generated names containing the old terminology.
do $$
declare
  object_record record;
  renamed_name text;
begin
  for object_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('categories', 'tasks')
      and policyname ~* 'status'
  loop
    renamed_name := regexp_replace(
      regexp_replace(object_record.policyname, 'statuses', 'categories', 'gi'),
      'status', 'category', 'gi'
    );

    if renamed_name <> object_record.policyname
       and not exists (
         select 1 from pg_policies
         where schemaname = object_record.schemaname
           and tablename = object_record.tablename
           and policyname = renamed_name
       ) then
      execute format(
        'alter policy %I on %I.%I rename to %I',
        object_record.policyname,
        object_record.schemaname,
        object_record.tablename,
        renamed_name
      );
    end if;
  end loop;

  for object_record in
    select schemaname, tablename, indexname
    from pg_indexes
    where schemaname = 'public'
      and tablename in ('categories', 'tasks')
      and indexname ~* 'status'
  loop
    renamed_name := left(
      regexp_replace(
        regexp_replace(object_record.indexname, 'statuses', 'categories', 'gi'),
        'status', 'category', 'gi'
      ),
      63
    );

    if renamed_name <> object_record.indexname
       and to_regclass(format('%I.%I', object_record.schemaname, renamed_name)) is null then
      execute format(
        'alter index %I.%I rename to %I',
        object_record.schemaname,
        object_record.indexname,
        renamed_name
      );
    end if;
  end loop;

  for object_record in
    select n.nspname as schemaname, c.relname as tablename, t.tgname as triggername
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('categories', 'tasks')
      and not t.tgisinternal
      and t.tgname ~* 'status'
  loop
    renamed_name := regexp_replace(
      regexp_replace(object_record.triggername, 'statuses', 'categories', 'gi'),
      'status', 'category', 'gi'
    );

    if renamed_name <> object_record.triggername then
      execute format(
        'alter trigger %I on %I.%I rename to %I',
        object_record.triggername,
        object_record.schemaname,
        object_record.tablename,
        renamed_name
      );
    end if;
  end loop;
end;
$$;

-- Keep category deletion atomic: tasks are uncategorized before the category
-- row is deleted, and the whole function runs in one transaction.
create or replace function public.delete_category(
  p_category_id uuid,
  p_list_id uuid
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
    select 1 from public.lists
    where id = p_list_id and user_id = auth.uid()
  ) then
    raise exception 'List not found';
  end if;

  if not exists (
    select 1 from public.categories
    where id = p_category_id and list_id = p_list_id
  ) then
    raise exception 'Category not found';
  end if;

  update public.tasks
  set category_id = null
  where category_id = p_category_id
    and list_id = p_list_id
    and user_id = auth.uid();

  delete from public.categories
  where id = p_category_id and list_id = p_list_id;
end;
$$;

revoke all on function public.delete_category(uuid, uuid) from public;
grant execute on function public.delete_category(uuid, uuid) to authenticated;
