begin;

-- Nullable item colors intentionally mean "Automatic": Tasks ignore the
-- legacy field and Events inherit their effective Category/List color.
-- The palette IDs stay shared with Lists so Events use one visual system in
-- every view.
alter table public.tasks
  add column if not exists color text;

alter table public.events
  add column if not exists color text;

alter table public.event_occurrence_exceptions
  add column if not exists color text;

alter table public.tasks
  drop constraint if exists tasks_color_check;
alter table public.tasks
  add constraint tasks_color_check check (
    color is null or color = any (array[
      'blue', 'indigo', 'violet', 'pink', 'red',
      'orange', 'amber', 'green', 'teal', 'cyan'
    ]::text[])
  );

alter table public.events
  drop constraint if exists events_color_check;
alter table public.events
  add constraint events_color_check check (
    color is null or color = any (array[
      'blue', 'indigo', 'violet', 'pink', 'red',
      'orange', 'amber', 'green', 'teal', 'cyan'
    ]::text[])
  );

alter table public.event_occurrence_exceptions
  drop constraint if exists event_occurrence_exceptions_color_check;
alter table public.event_occurrence_exceptions
  add constraint event_occurrence_exceptions_color_check check (
    color is null or color = any (array[
      'blue', 'indigo', 'violet', 'pink', 'red',
      'orange', 'amber', 'green', 'teal', 'cyan'
    ]::text[])
  );

notify pgrst, 'reload schema';
commit;
