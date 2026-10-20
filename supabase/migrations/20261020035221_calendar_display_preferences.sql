alter table public.user_preferences
  add column if not exists calendar_first_day smallint not null default 0,
  add column if not exists time_format text not null default '24h';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_preferences'::regclass
      and conname = 'user_preferences_calendar_first_day_check'
  ) then
    alter table public.user_preferences
      add constraint user_preferences_calendar_first_day_check
        check (calendar_first_day between 0 and 6);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_preferences'::regclass
      and conname = 'user_preferences_time_format_check'
  ) then
    alter table public.user_preferences
      add constraint user_preferences_time_format_check
        check (time_format in ('12h', '24h'));
  end if;
end
$$;

notify pgrst, 'reload schema';
