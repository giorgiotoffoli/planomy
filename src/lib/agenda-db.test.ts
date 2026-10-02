import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Minimal fixture contract, not an invented baseline application migration.
// Execute the real migration against PostgreSQL with two authenticated identities.
test('time block migration enforces persistence, ownership and independent task semantics', async t => {
  const db = new PGlite()
  const alice = '00000000-0000-4000-8000-000000000001'
  const bob = '00000000-0000-4000-8000-000000000002'
  const taskA = '00000000-0000-4000-8000-000000000011'
  const taskB = '00000000-0000-4000-8000-000000000012'
  try {
    await db.exec(`
      create role authenticated; create role anon;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select current_setting('request.jwt.claim.sub', true)::uuid $$;
      grant usage on schema auth to authenticated;
      create table public.tasks (id uuid primary key, user_id uuid not null references auth.users, title text, due_date date, completed boolean not null default false);
      create table public.daily_task_selections (task_id uuid references public.tasks on delete cascade, user_id uuid not null, selected_date date, focused boolean);
      grant select, update, delete on public.tasks to authenticated;
      grant select on public.daily_task_selections to authenticated;
      alter table public.daily_task_selections enable row level security;
      create policy read_own_selections on public.daily_task_selections for select to authenticated using (user_id = auth.uid());
      alter table public.tasks enable row level security;
      create policy own_tasks on public.tasks to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
      insert into auth.users values ('${alice}'), ('${bob}');
      insert into public.tasks (id, user_id, title, due_date) values ('${taskA}', '${alice}', 'ciphertext-a', '2026-10-09'), ('${taskB}', '${bob}', 'ciphertext-b', '2026-10-09');
      insert into public.daily_task_selections values ('${taskA}', '${alice}', '2026-10-07', true);
    `)
    await db.exec(await readFile(new URL('../../supabase/migrations/20261003000000_add_task_time_blocks.sql', import.meta.url), 'utf8'))
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${alice}', false);`)

    await t.test('owner can insert and upsert only one block per task', async () => {
      await db.query('insert into task_time_blocks values ($1, $2, $3, $4)', [taskA, alice, '2026-10-07T19:00:00Z', '2026-10-07T19:30:00Z'])
      await db.query(`insert into task_time_blocks values ($1, $2, $3, $4) on conflict (task_id) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at`, [taskA, alice, '2026-10-07T20:00:00Z', '2026-10-07T21:00:00Z'])
      const { rows } = await db.query<{ count: number }>('select count(*)::int as count from task_time_blocks')
      assert.equal(rows[0].count, 1)
      await assert.rejects(db.query('insert into task_time_blocks values ($1, $2, $3, $4)', [taskA, alice, '2026-10-08T19:00:00Z', '2026-10-08T19:30:00Z']), /duplicate key/)
    })
    await t.test('invalid, reversed, infinite and short intervals are rejected', async () => {
      for (const end of ['2026-10-07T19:00:00Z', '2026-10-07T20:14:00Z', 'infinity']) {
        await assert.rejects(db.query('update task_time_blocks set ends_at = $1 where task_id = $2', [end, taskA]), /check constraint/)
      }
    })
    await t.test('cross-user references and ownership spoofing are rejected by RLS', async () => {
      await assert.rejects(db.query('insert into task_time_blocks values ($1, $2, $3, $4)', [taskB, alice, '2026-10-07T19:00:00Z', '2026-10-07T19:30:00Z']), /row-level security/)
      await assert.rejects(db.query('insert into task_time_blocks values ($1, $2, $3, $4)', [taskB, bob, '2026-10-07T19:00:00Z', '2026-10-07T19:30:00Z']), /row-level security/)
      await assert.rejects(db.query('update task_time_blocks set user_id = $1 where task_id = $2', [bob, taskA]), /row-level security/)
      await assert.rejects(db.query('update task_time_blocks set task_id = $1 where task_id = $2', [taskB, taskA]), /row-level security/)
    })
    await t.test('another owner cannot read, update, delete or overwrite the block', async () => {
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [bob])
      assert.equal((await db.query('select * from task_time_blocks')).rows.length, 0)
      assert.equal((await db.query('update task_time_blocks set ends_at = ends_at + interval \'1 hour\' returning *')).rows.length, 0)
      assert.equal((await db.query('delete from task_time_blocks returning *')).rows.length, 0)
      await assert.rejects(db.query(`insert into task_time_blocks values ($1, $2, $3, $4) on conflict (task_id) do update set user_id = excluded.user_id`, [taskA, bob, '2026-10-07T19:00:00Z', '2026-10-07T19:30:00Z']), /row-level security/)
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [alice])
    })
    await t.test('composite foreign key also enforces ownership for privileged writes', async () => {
      await db.exec('reset role')
      await assert.rejects(db.query('update task_time_blocks set user_id = $1 where task_id = $2', [bob, taskA]), /foreign key/)
      await db.exec('set role authenticated')
    })
    await t.test('move and resize persist without changing deadlines or daily selections', async () => {
      await db.query('update task_time_blocks set starts_at = $1, ends_at = $2 where task_id = $3', ['2026-10-08T04:45:00Z', '2026-10-08T06:00:00Z', taskA])
      const block = (await db.query<{ starts_at: Date; ends_at: Date }>('select * from task_time_blocks')).rows[0]
      assert.equal(block.starts_at.toISOString(), '2026-10-08T04:45:00.000Z')
      assert.equal(block.ends_at.toISOString(), '2026-10-08T06:00:00.000Z')
      assert.equal((await db.query<{ due: string }>('select due_date::text as due from tasks')).rows[0].due, '2026-10-09')
      assert.equal((await db.query<{ focused: boolean }>('select focused from daily_task_selections')).rows[0].focused, true)
      // Intersects the next local day even though it starts the previous day.
      assert.equal((await db.query('select * from task_time_blocks where starts_at < $1 and ends_at > $2', ['2026-10-09T05:00:00Z', '2026-10-08T05:00:00Z'])).rows.length, 1)
    })
    await t.test('completion retains its block and clears focus; reopening does not repin', async () => {
      await db.query('update tasks set completed = true where id = $1', [taskA])
      assert.equal((await db.query('select * from task_time_blocks')).rows.length, 1)
      assert.equal((await db.query<{ focused: boolean }>('select focused from daily_task_selections')).rows[0].focused, false)
      await db.query('update tasks set completed = false where id = $1', [taskA])
      assert.equal((await db.query<{ focused: boolean }>('select focused from daily_task_selections')).rows[0].focused, false)
    })
    await t.test('removing a block leaves its task and My Day membership intact', async () => {
      await db.query('delete from task_time_blocks where task_id = $1', [taskA])
      assert.equal((await db.query('select * from tasks')).rows.length, 1)
      assert.equal((await db.query('select * from daily_task_selections')).rows.length, 1)
    })
    await t.test('task deletion cascades to its block', async () => {
      await db.query('insert into task_time_blocks values ($1, $2, $3, $4)', [taskA, alice, '2026-10-07T19:00:00Z', '2026-10-07T19:30:00Z'])
      await db.query('delete from tasks where id = $1', [taskA])
      assert.equal((await db.query('select * from task_time_blocks')).rows.length, 0)
    })
    await t.test('anonymous access is denied', async () => {
      await db.exec('reset role; set role anon')
      await assert.rejects(db.query('select * from task_time_blocks'), /permission denied/)
    })
  } finally { await db.close() }
})
