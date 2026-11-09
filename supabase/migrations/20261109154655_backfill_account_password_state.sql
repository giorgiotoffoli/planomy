-- Older web signups did not persist account_password_set. Reconstruct the
-- marker from Supabase Auth's password hash so existing sessions are subject
-- to current-password verification when changing an existing password.
-- Passwordless users are explicitly marked false; unrelated metadata is kept.
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'account_password_set', coalesce(encrypted_password, '') <> ''
  ),
  updated_at = pg_catalog.now()
where raw_user_meta_data -> 'account_password_set' is distinct from
  to_jsonb(coalesce(encrypted_password, '') <> '');
