begin;

-- Categories may refine their parent List color. Null means inherit the List.
alter table public.categories
  add column if not exists color text;

alter table public.categories
  drop constraint if exists categories_color_check;
alter table public.categories
  add constraint categories_color_check check (
    color is null or color = any (array[
      'blue', 'indigo', 'violet', 'pink', 'red',
      'orange', 'amber', 'green', 'teal', 'cyan'
    ]::text[])
  );

-- Events use the same List -> Category hierarchy as Tasks. Existing events
-- remain uncategorized and therefore inherit only their List color.
alter table public.events
  add column if not exists category_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_category_id_fkey'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_category_id_fkey
      foreign key (category_id) references public.categories(id) on delete set null;
  end if;
end;
$$;

create index if not exists events_category_id_idx
  on public.events (category_id);

alter table public.event_occurrence_exceptions
  add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists event_occurrence_exceptions_category_id_idx
  on public.event_occurrence_exceptions (category_id);

-- Rebuild event policies so a category must belong to the selected List and
-- that List must belong to the current user.
drop policy if exists "Users can create their own events" on public.events;
create policy "Users can create their own events"
on public.events for insert
with check (
  auth.uid() = user_id
  and (
    list_id is null
    or exists (
      select 1 from public.lists
      where lists.id = events.list_id and lists.user_id = auth.uid()
    )
  )
  and (
    category_id is null
    or exists (
      select 1
      from public.categories
      join public.lists on lists.id = categories.list_id
      where categories.id = events.category_id
        and categories.list_id = events.list_id
        and lists.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can update their own events" on public.events;
create policy "Users can update their own events"
on public.events for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    list_id is null
    or exists (
      select 1 from public.lists
      where lists.id = events.list_id and lists.user_id = auth.uid()
    )
  )
  and (
    category_id is null
    or exists (
      select 1
      from public.categories
      join public.lists on lists.id = categories.list_id
      where categories.id = events.category_id
        and categories.list_id = events.list_id
        and lists.user_id = auth.uid()
    )
  )
);

drop policy if exists event_occurrence_exceptions_insert on public.event_occurrence_exceptions;
create policy event_occurrence_exceptions_insert
on public.event_occurrence_exceptions for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.events
    where events.id = event_occurrence_exceptions.event_id
      and events.user_id = (select auth.uid())
      and events.recurrence_rule is not null
  )
  and (
    list_id is null
    or exists (
      select 1 from public.lists
      where lists.id = event_occurrence_exceptions.list_id
        and lists.user_id = (select auth.uid())
    )
  )
  and (
    category_id is null
    or exists (
      select 1
      from public.categories
      join public.lists on lists.id = categories.list_id
      where categories.id = event_occurrence_exceptions.category_id
        and categories.list_id = event_occurrence_exceptions.list_id
        and lists.user_id = (select auth.uid())
    )
  )
);

drop policy if exists event_occurrence_exceptions_update on public.event_occurrence_exceptions;
create policy event_occurrence_exceptions_update
on public.event_occurrence_exceptions for update
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    list_id is null
    or exists (
      select 1 from public.lists
      where lists.id = event_occurrence_exceptions.list_id
        and lists.user_id = (select auth.uid())
    )
  )
  and (
    category_id is null
    or exists (
      select 1
      from public.categories
      join public.lists on lists.id = categories.list_id
      where categories.id = event_occurrence_exceptions.category_id
        and categories.list_id = event_occurrence_exceptions.list_id
        and lists.user_id = (select auth.uid())
    )
  )
);

notify pgrst, 'reload schema';
commit;
