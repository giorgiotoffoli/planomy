alter table public.lists
  add column if not exists emoji text;

notify pgrst, 'reload schema';
