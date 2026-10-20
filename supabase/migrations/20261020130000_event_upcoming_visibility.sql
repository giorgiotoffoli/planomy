begin;

-- Upcoming visibility is a Home-only preference. Null on an exception means
-- that the occurrence inherits the series setting.
alter table public.events
  add column if not exists show_in_upcoming boolean not null default true;

alter table public.event_occurrence_exceptions
  add column if not exists show_in_upcoming boolean;

-- Preserve the effective color of historical exceptions created before the
-- nullable occurrence override existed. New null values remain a reset to
-- Automatic for that occurrence.
update public.event_occurrence_exceptions as exceptions
set color = events.color
from public.events
where exceptions.event_id = events.id
  and exceptions.cancelled = false
  and exceptions.color is null
  and events.color is not null;

notify pgrst, 'reload schema';
commit;
