import assert from 'node:assert/strict'
import test from 'node:test'
import { getDeadlineLabel, getHomeBuckets } from './home.ts'
import type { TaskWithList } from '../types'

function task(overrides: Partial<TaskWithList>): TaskWithList {
  return {
    user_id: 'user',
    id: overrides.id ?? crypto.randomUUID(),
    list_id: null,
    title: overrides.title ?? 'Task',
    completed: false,
    due_date: null,
    due_time: null,
    notes: undefined,
    category_id: null,
    position: 0,
    created_at: null,
    focused: false,
    stashed: false,
    list: null,
    ...overrides,
  }
}

test('home buckets are mutually exclusive and use focus precedence', () => {
  const result = getHomeBuckets(
    [
      task({ id: 'focus', focused: true, due_date: '2026-10-12' }),
      task({ id: 'due', due_date: '2026-10-13' }),
      task({ id: 'task' }),
      task({ id: 'stashed', stashed: true, due_date: '2026-10-12' }),
      task({ id: 'completed', completed: true }),
    ],
    '2026-10-12',
  )

  assert.deepEqual(result.focus.map(({ id }) => id), ['focus'])
  assert.deepEqual(result.dueSoon.map(({ id }) => id), ['due'])
  assert.deepEqual(result.tasks.map(({ id }) => id), ['task'])
  assert.deepEqual(result.stashed.map(({ id }) => id), ['stashed'])
})

test('deadline labels use friendly local calendar language', () => {
  assert.equal(getDeadlineLabel('2026-10-10', '2026-10-12'), '2 days overdue')
  assert.equal(getDeadlineLabel('2026-10-12', '2026-10-12'), 'Today')
  assert.equal(getDeadlineLabel('2026-10-13', '2026-10-12'), 'Tomorrow')
})

test('due soon sorts by calendar date and then due time', () => {
  const result = getHomeBuckets(
    [
      task({ id: 'late', due_date: '2026-10-13', due_time: '18:00:00' }),
      task({ id: 'early', due_date: '2026-10-13', due_time: '09:00:00' }),
      task({ id: 'boundary', due_date: '2026-10-19' }),
      task({ id: 'outside', due_date: '2026-10-20' }),
    ],
    '2026-10-12',
  )

  assert.deepEqual(result.dueSoon.map(({ id }) => id), [
    'early',
    'late',
    'boundary',
  ])
  assert.deepEqual(result.tasks.map(({ id }) => id), ['outside'])
})
