# Supabase database setup

Planomy's application code and database schema must be deployed together. A
fresh project must apply both migrations in filename order:

1. `20261001000000_create_planomy_schema.sql` creates the core keychain, list,
   status, and task tables used throughout the application.
2. `20261002000000_add_daily_task_selections.sql` adds My Day references and
   focus behavior after `public.tasks` exists.

Apply them to the same project used by the app's
`NEXT_PUBLIC_SUPABASE_URL`.

## Hosted project: Dashboard method

Use this method if the Supabase CLI is not configured for this repository.

1. Open the Supabase Dashboard and select the project whose URL appears in the
   app's `NEXT_PUBLIC_SUPABASE_URL`.
2. Open **SQL Editor** and check whether `public.tasks` exists in **Table
   Editor**. For a fresh project, run
   `migrations/20261001000000_create_planomy_schema.sql` first.
3. In a new query, run the complete contents of
   `migrations/20261002000000_add_daily_task_selections.sql`. This creates the
   My Day table, RLS policy, focus RPC, completion trigger, and requests a
   PostgREST schema-cache reload.
4. In **Table Editor**, confirm that `public.daily_task_selections` exists.
5. Reload Planomy and click **Try again** on the My Day screen.

Do not run these migrations against an unrelated project. The error
`relation "public.tasks" does not exist` means the My Day migration was run
before the base migration, or against the wrong project.

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
