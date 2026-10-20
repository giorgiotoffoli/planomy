begin;

-- Lists has its own event widget visibility. This is intentionally separate
-- from Home's upcoming visibility and does not remove the event from Calendar.
alter table public.events
  add column if not exists show_in_list boolean not null default true;

notify pgrst, 'reload schema';
commit;
