-- The old statuses table was renamed to categories, but an already-applied
-- migration may have left a list trigger whose function still references it.
-- Remove those leftovers so inserting a list does not call public.statuses.
do $$
declare
  legacy record;
begin
  if to_regclass('public.lists') is null then
    return;
  end if;

  for legacy in
    select
      table_namespace.nspname as table_schema,
      table_record.relname as table_name,
      trigger_record.tgname as trigger_name
    from pg_trigger trigger_record
    join pg_class table_record on table_record.oid = trigger_record.tgrelid
    join pg_namespace table_namespace on table_namespace.oid = table_record.relnamespace
    join pg_proc function_record on function_record.oid = trigger_record.tgfoid
    where table_namespace.nspname = 'public'
      and table_record.relname = 'lists'
      and not trigger_record.tgisinternal
      and function_record.prorettype = 'pg_catalog.trigger'::regtype
      and (
        function_record.prosrc ilike '%public.statuses%'
        or function_record.prosrc ilike '%statuses%'
      )
  loop
    execute format(
      'drop trigger if exists %I on %I.%I',
      legacy.trigger_name,
      legacy.table_schema,
      legacy.table_name
    );
  end loop;

  -- Drop any orphaned legacy trigger functions as well. This is intentionally
  -- limited to trigger-returning functions whose source mentions statuses.
  for legacy in
    select
      function_namespace.nspname as function_schema,
      function_record.proname as function_name,
      pg_get_function_identity_arguments(function_record.oid) as function_arguments
    from pg_proc function_record
    join pg_namespace function_namespace on function_namespace.oid = function_record.pronamespace
    where function_namespace.nspname = 'public'
      and function_record.prorettype = 'pg_catalog.trigger'::regtype
      and (
        function_record.prosrc ilike '%public.statuses%'
        or function_record.prosrc ilike '%statuses%'
      )
      and not exists (
        select 1
        from pg_trigger remaining_trigger
        where remaining_trigger.tgfoid = function_record.oid
          and not remaining_trigger.tgisinternal
      )
  loop
    execute format(
      'drop function if exists %I.%I(%s)',
      legacy.function_schema,
      legacy.function_name,
      legacy.function_arguments
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';
