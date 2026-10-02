# Supabase database setup

Planomy's application code and database schema must be deployed together. My
Day requires `migrations/20261002000000_add_daily_task_selections.sql` in the
same Supabase project used by the app's `NEXT_PUBLIC_SUPABASE_URL`.

## Hosted project: Dashboard method

Use this method if the Supabase CLI is not configured for this repository.

1. Open the Supabase Dashboard and select the project whose URL appears in the
   app's `NEXT_PUBLIC_SUPABASE_URL`.
2. Open **SQL Editor**, create a new query, and paste the complete contents of
   `migrations/20261002000000_add_daily_task_selections.sql`.
3. Click **Run** once. This creates the table, RLS policy, focus RPC, completion
   trigger, and requests a PostgREST schema-cache reload.
4. In **Table Editor**, confirm that `public.daily_task_selections` exists.
5. Reload Planomy and click **Try again** on the My Day screen.

Do not run this migration against an unrelated project. If the SQL editor says
that `public.tasks` does not exist, the selected project is not the database
used by this Planomy installation or its base schema has not been installed.

## Hosted project: CLI method

Authenticate, link this checkout to the correct project, and push migrations:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

`YOUR_PROJECT_REF` appears in the Supabase Dashboard project settings. Before
confirming `db push`, verify that its displayed target is the intended
development or staging project. Do not target production until the migration
has been reviewed and tested there.

Check local and remote migration state with:

```bash
npx supabase migration list
```

## If the table exists but the API still cannot find it

The migration requests a schema reload automatically. If the migration was
applied without its final statement, run this once in **SQL Editor**:

```sql
notify pgrst, 'reload schema';
```

Then reload the app. If the error persists, confirm that the browser app uses
the same project URL where the table was created. A common cause is applying
SQL to one project while local or deployed environment variables point to
another.
