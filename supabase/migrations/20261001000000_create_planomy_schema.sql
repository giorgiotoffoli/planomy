-- Base schema required by the Planomy application.
-- Planner content columns contain client-side ciphertext, never decrypted text.

create extension if not exists pgcrypto;

create table if not exists public.user_keychain (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wrapped_master_key text not null,
  wrapping_key_salt text not null,
  wrapping_key_iv text not null,
  kdf text not null,
  kdf_iterations integer not null,
  wrapping_algorithm text not null,
  version integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  default_view text not null default 'list'
    check (default_view in ('list', 'board')),
  created_at timestamptz not null default now()
);

create table if not exists public.statuses (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid references public.lists(id) on delete set null,
  status_id uuid references public.statuses(id) on delete set null,
  title text not null,
  notes text not null default '',
  completed boolean not null default false,
  due_date date,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists lists_user_id_idx on public.lists(user_id);
create index if not exists statuses_list_id_idx on public.statuses(list_id);
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_list_id_idx on public.tasks(list_id);
create index if not exists tasks_due_date_idx on public.tasks(user_id, due_date)
  where due_date is not null;

alter table public.user_keychain enable row level security;
alter table public.lists enable row level security;
alter table public.statuses enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "Users manage their own keychain" on public.user_keychain;
create policy "Users manage their own keychain"
  on public.user_keychain for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own lists" on public.lists;
create policy "Users manage their own lists"
  on public.lists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage statuses in their own lists" on public.statuses;
create policy "Users manage statuses in their own lists"
  on public.statuses for all
  using (
    exists (
      select 1 from public.lists
      where lists.id = statuses.list_id and lists.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lists
      where lists.id = statuses.list_id and lists.user_id = auth.uid()
    )
  );

drop policy if exists "Users manage their own tasks" on public.tasks;
create policy "Users manage their own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      list_id is null
      or exists (
        select 1 from public.lists
        where lists.id = tasks.list_id and lists.user_id = auth.uid()
      )
    )
    and (
      status_id is null
      or exists (
        select 1
        from public.statuses
        join public.lists on lists.id = statuses.list_id
        where statuses.id = tasks.status_id
          and statuses.list_id = tasks.list_id
          and lists.user_id = auth.uid()
      )
    )
  );

create or replace function public.create_default_list_statuses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.statuses (list_id, title, position)
  values
    (new.id, 'To do', 0),
    (new.id, 'In progress', 1),
    (new.id, 'Done', 2);
  return new;
end;
$$;

drop trigger if exists create_statuses_for_new_list on public.lists;
create trigger create_statuses_for_new_list
after insert on public.lists
for each row execute function public.create_default_list_statuses();

revoke execute on function public.create_default_list_statuses() from public, anon, authenticated;

grant select, insert, update, delete on public.user_keychain to authenticated;
grant select, insert, update, delete on public.lists to authenticated;
grant select, insert, update, delete on public.statuses to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

notify pgrst, 'reload schema';
