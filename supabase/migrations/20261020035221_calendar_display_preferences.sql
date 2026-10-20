alter table public.user_preferences
  add column if not exists calendar_first_day smallint not null default 0,
  add column if not exists time_format text not null default '24h';

alter table public.user_preferences
  add constraint user_preferences_calendar_first_day_check
    check (calendar_first_day between 0 and 6),
  add constraint user_preferences_time_format_check
    check (time_format in ('12h', '24h'));

notify pgrst, 'reload schema';
