import assert from 'node:assert/strict'
import test from 'node:test'
import { sortTasks } from '../components/lists/task-sorting.ts'
import {
  defaultHomeSourcePreferences,
  filterHomeTasks,
  getDeadlineLabel,
  getHomeBuckets,
  isHomeSourceEnabled,
  normalizeHomeSourcePreferences,
  setHomeSourceEnabled,
} from './home.ts'
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

test('task sorting keeps undated tasks last and preserves stable ties', () => {
  const tasks = [
    task({ id: 'undated', title: 'Zebra' }),
    task({ id: 'later', title: 'Beta', due_date: '2026-10-14' }),
    task({
      id: 'timed',
      title: 'Alpha',
      due_date: '2026-10-13',
      due_time: '09:00:00',
    }),
    task({
      id: 'untimed',
      title: 'Gamma',
      due_date: '2026-10-13',
    }),
  ]

  assert.deepEqual(
    sortTasks(tasks, 'due-date-asc').map(({ id }) => id),
    ['timed', 'untimed', 'later', 'undated'],
  )
  assert.deepEqual(
    sortTasks(tasks, 'due-date-desc').map(({ id }) => id),
    ['later', 'timed', 'untimed', 'undated'],
  )
})

test('task sorting supports newest and oldest creation dates', () => {
  const tasks = [
    task({ id: 'newest', created_at: '2026-10-12T09:00:00.000Z' }),
    task({ id: 'oldest', created_at: '2026-10-10T09:00:00.000Z' }),
    task({ id: 'middle', created_at: '2026-10-11T09:00:00.000Z' }),
    task({ id: 'missing-date', created_at: null }),
  ]

  assert.deepEqual(
    sortTasks(tasks, 'created-desc').map(({ id }) => id),
    ['newest', 'middle', 'oldest', 'missing-date'],
  )
  assert.deepEqual(
    sortTasks(tasks, 'created-asc').map(({ id }) => id),
    ['oldest', 'middle', 'newest', 'missing-date'],
  )
})

test('home source filtering happens before stashed bucketing', () => {
  const preferences = setHomeSourceEnabled(
    setHomeSourceEnabled(defaultHomeSourcePreferences(), { type: 'list', listId: 'school' }, false),
    { type: 'unsorted' },
    false,
  )
  const visible = filterHomeTasks(
    [
      task({ id: 'school-stashed', list_id: 'school', stashed: true }),
      task({ id: 'personal', list_id: 'personal' }),
      task({ id: 'unsorted-stashed', stashed: true }),
    ],
    preferences,
  )

  assert.deepEqual(visible.map(({ id }) => id), ['personal'])
  assert.equal(
    isHomeSourceEnabled({ type: 'list', listId: 'school' }, preferences),
    false,
  )
})

test('focused tasks stay visible when their source is hidden', () => {
  const preferences = setHomeSourceEnabled(
    defaultHomeSourcePreferences(),
    { type: 'list', listId: 'school' },
    false,
  )
  const visible = filterHomeTasks(
    [
      task({ id: 'focused-school', list_id: 'school', focused: true }),
      task({ id: 'hidden-school', list_id: 'school' }),
      task({ id: 'personal', list_id: 'personal' }),
    ],
    preferences,
  )

  assert.deepEqual(visible.map(({ id }) => id), [
    'focused-school',
    'personal',
  ])
})

test('new lists are enabled by default and stale exclusions are ignored', () => {
  assert.deepEqual(
    normalizeHomeSourcePreferences(
      {
        excluded_home_list_ids: ['missing', 'school', 'school'],
        show_unsorted_on_home: true,
      },
      ['school', 'personal'],
    ),
    { excludedHomeListIds: ['school'], showUnsortedOnHome: true },
  )

  assert.deepEqual(
    setHomeSourceEnabled(
      {
        excludedHomeListIds: ['school'],
        showUnsortedOnHome: true,
      },
      { type: 'list', listId: 'school' },
      true,
    ),
    { excludedHomeListIds: [], showUnsortedOnHome: true },
  )
})
