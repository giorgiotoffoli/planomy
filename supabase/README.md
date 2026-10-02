# Daily agenda database setup

Apply `migrations/20261003000000_add_task_time_blocks.sql` to the same Supabase
project used by Planomy. Paste the complete transaction into the Supabase SQL
editor, or apply it through your established Supabase migration workflow. Do not
run a database reset: this checkout does not include a baseline schema.

Before applying, confirm the existing schema has `public.tasks.id` and
`public.tasks.user_id` as UUIDs, `public.tasks.completed` as a boolean, and the
standard Supabase `auth.users` table and `auth.uid()` function. The application
already depends on task/list ownership RLS; keep those policies enabled.
The migration adds a unique `(id, user_id)` task index so a composite foreign key
can enforce task ownership even for writes that bypass RLS. It creates one time
block per task, with finite `timestamptz` boundaries at least 15 minutes apart.

The referenced My Day migration (`20261002000000_add_daily_task_selections.sql`)
was not present in this checkout. It is not recreated here. If your existing
project has `daily_task_selections(task_id, user_id, focused)`, the completion trigger
clears focus atomically when a task is completed from any view. Without that
table, the trigger safely skips this step; My Day itself still requires its
original schema and focus RPC. Existing equivalent completion triggers may
coexist because clearing focus is idempotent.
The trigger runs with a fixed search path as its owner so it also works when
focus changes are normally RPC-only. Its update is limited to the completed
task and that task's owner, and direct execution is revoked.

The new table contains only `task_id`, `user_id`, `starts_at`, and `ends_at`.
Task/list content stays encrypted in the existing tables. Agenda actions use the
authenticated Supabase client, not a service-role key. No task deadline or My Day
membership is changed by scheduling. Removing a block preserves its task;
deleting a task cascades to its block.

## Verification

`pnpm test` includes the actual migration executed in an isolated in-memory
PostgreSQL instance (PGlite), with authenticated and anonymous roles. It checks
RLS, cross-user references, composite foreign keys, uniqueness, interval
constraints, upserts, moves/resizes, cascading deletion, and completion/focus.
The fixture represents the documented schema contract; it does not certify the
schema or policies of a deployed Supabase project.

The same command tests local dates, 23/25-hour DST days, missing/repeated local
times, snapping, midnight clipping, overlap columns, and scheduling versus
reordering routes. These tests do not require Supabase credentials.

After applying to a development project, use two test accounts for these browser
checks (not yet automated):

- Drag from Inbox, a manually ordered plan, a sorted plan, and My Day. Refresh
  and confirm the block remains. Reschedule the same task and confirm only one
  block exists. Reorder a manual list and move board cards between statuses.
- Move and resize a block; remove it through its clock button. Confirm the task,
  deadline, My Day membership, and focus are unchanged. Complete a focused task
  from the agenda and confirm focus clears. Rename, move, and delete tasks from
  both views and confirm synchronization.
- Place overlapping blocks and a block crossing midnight. Navigate days,
  including local DST transitions. Confirm full duration remains in the editing
  form and each repeated hour has its timezone offset/abbreviation.
- Navigate between workspaces while the agenda is open. Reload to check its
  open preference. Test narrow-screen Sheet dismissal, Tab/Shift-Tab, Escape,
  focus restoration, keyboard drag handles, and the Schedule time form on touch.
- Reject a network mutation and confirm error feedback and rollback; switch
  dates during a pending mutation. Lock the vault and confirm agenda content is
  unmounted. Check each account sees only its own blocks.

No external calendars, recurrence, standalone events, or week/month views are
introduced. `/scheduled` and `/today` continue to use task deadlines. Scheduling
uses the browser timezone; the application has no user timezone setting.
