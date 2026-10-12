import assert from 'node:assert/strict'
import test from 'node:test'
import type { TaskWithList } from '../types'
import {
  deadlineTaskCount,
  partitionDeadlineTasks,
} from './deadlines.ts'

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

test('partitions local calendar dates into exactly one deadline bucket', () => {
  const buckets = partitionDeadlineTasks(
    [
      task({ id: 'yesterday', due_date: '2026-10-13' }),
      task({ id: 'today', due_date: '2026-10-14' }),
      task({ id: 'tomorrow', due_date: '2026-10-15' }),
      task({ id: 'friday', due_date: '2026-10-16' }),
      task({ id: 'sunday', due_date: '2026-10-18' }),
      task({ id: 'later', due_date: '2026-10-20' }),
      task({ id: 'undated' }),
      task({ id: 'completed', due_date: '2026-10-14', completed: true }),
    ],
    '2026-10-14',
  )

  assert.deepEqual(buckets.pastDue.map(({ id }) => id), ['yesterday'])
  assert.deepEqual(buckets.today.map(({ id }) => id), ['today'])
  assert.deepEqual(buckets.tomorrow.map(({ id }) => id), ['tomorrow'])
  assert.deepEqual(buckets.thisWeek.map(({ id }) => id), ['friday', 'sunday'])
  assert.deepEqual(buckets.later.map(({ id }) => id), ['later'])
  assert.equal(deadlineTaskCount(buckets), 6)
})

test('sorts deadline tasks by date, time, and deterministic fallback', () => {
  const buckets = partitionDeadlineTasks(
    [
      task({ id: 'untimed', due_date: '2026-10-14', position: 1 }),
      task({ id: 'late', due_date: '2026-10-14', due_time: '18:00:00' }),
      task({ id: 'early', due_date: '2026-10-14', due_time: '09:00:00' }),
      task({ id: 'older', due_date: '2026-10-13', position: 0 }),
      task({ id: 'newer', due_date: '2026-10-13', position: 1 }),
    ],
    '2026-10-14',
  )

  assert.deepEqual(buckets.pastDue.map(({ id }) => id), ['older', 'newer'])
  assert.deepEqual(buckets.today.map(({ id }) => id), [
    'early',
    'late',
    'untimed',
  ])
})

test('date-only keys stay local around date boundaries', () => {
  const buckets = partitionDeadlineTasks(
    [
      task({ id: 'before', due_date: '2026-03-07' }),
      task({ id: 'same', due_date: '2026-03-08' }),
      task({ id: 'after', due_date: '2026-03-09' }),
    ],
    '2026-03-08',
  )

  assert.deepEqual(buckets.pastDue.map(({ id }) => id), ['before'])
  assert.deepEqual(buckets.today.map(({ id }) => id), ['same'])
  assert.deepEqual(buckets.tomorrow.map(({ id }) => id), ['after'])
})

test('focused and stashed active tasks remain visible in deadlines', () => {
  const buckets = partitionDeadlineTasks(
    [
      task({ id: 'stashed', due_date: '2026-10-15', stashed: true }),
      task({ id: 'focused', due_date: '2026-10-14', focused: true }),
    ],
    '2026-10-14',
  )

  assert.deepEqual(buckets.tomorrow.map(({ id }) => id), ['stashed'])
  assert.deepEqual(buckets.today.map(({ id }) => id), ['focused'])
})
