import assert from 'node:assert/strict'
import test from 'node:test'
import { sortTasks } from '../components/lists/task-sorting.ts'
import {
  defaultHomeSourcePreferences,
  filterHomeEvents,
  filterHomeTasks,
  getDeadlineLabel,
  getHomeBuckets,
  getHomeListState,
  isHomeCategoryEnabled,
  isHomeSourceEnabled,
  normalizeHomeSourcePreferences,
  setHomeCategoryEnabled,
  setHomeListEnabled,
  setHomeSourceEnabled,
} from './home.ts'
import type { CalendarEventWithList, TaskWithList } from '../types'

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

function event(overrides: Partial<CalendarEventWithList>): CalendarEventWithList {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    user_id: 'user',
    list_id: null,
    title: 'Event',
    description: null,
    location: null,
    all_day: false,
    starts_at: '2026-10-20T14:00:00.000Z',
    ends_at: '2026-10-20T15:00:00.000Z',
    starts_on: null,
    ends_on: null,
    time_zone: 'UTC',
    recurrence_rule: null,
    created_at: '',
    updated_at: '',
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
      task({ id: 'boundary', due_date: '2026-10-14' }),
      task({ id: 'outside', due_date: '2026-10-15' }),
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

test('Home event filtering respects visibility, list, category, and Unsorted settings', () => {
  const categories = [
    { id: 'classes', list_id: 'school' },
    { id: 'exams', list_id: 'school' },
  ]
  const preferences = setHomeCategoryEnabled(
    defaultHomeSourcePreferences(),
    'classes',
    false,
    categories,
  )
  const visible = filterHomeEvents(
    [
      event({ id: 'hidden-series', show_in_upcoming: false }),
      event({ id: 'hidden-category', list_id: 'school', category_id: 'classes' }),
      event({ id: 'exam', list_id: 'school', category_id: 'exams' }),
      event({ id: 'hidden-list', list_id: 'personal' }),
      event({ id: 'unsorted', list_id: null }),
    ],
    { ...preferences, excludedHomeListIds: ['personal'] },
    categories,
  )

  assert.deepEqual(visible.map(({ id }) => id), ['exam', 'unsorted'])
  assert.deepEqual(
    filterHomeEvents(
      [event({ id: 'unsorted' })],
      { ...defaultHomeSourcePreferences(), showUnsortedOnHome: false },
    ).map(({ id }) => id),
    [],
  )
})

test('category visibility inherits from lists and filters stashed tasks', () => {
  const categories = [
    { id: 'errands', list_id: 'personal' },
    { id: 'to-buy', list_id: 'personal' },
  ]
  const preferences = setHomeCategoryEnabled(
    defaultHomeSourcePreferences(),
    'to-buy',
    false,
    categories,
  )

  assert.equal(getHomeListState('personal', categories, preferences), 'partial')
  assert.equal(isHomeCategoryEnabled(categories[0], categories, preferences), true)
  assert.equal(isHomeCategoryEnabled(categories[1], categories, preferences), false)

  const categoriesWithNewCategory = [
    ...categories,
    { id: 'new-category', list_id: 'personal' },
  ]
  assert.equal(
    isHomeCategoryEnabled(
      categoriesWithNewCategory[2],
      categoriesWithNewCategory,
      preferences,
    ),
    false,
  )

  const visible = filterHomeTasks(
    [
      task({ id: 'uncategorized', list_id: 'personal' }),
      task({ id: 'errand', list_id: 'personal', category_id: 'errands' }),
      task({ id: 'hidden', list_id: 'personal', category_id: 'to-buy' }),
      task({
        id: 'hidden-stashed',
        list_id: 'personal',
        category_id: 'to-buy',
        stashed: true,
      }),
      task({
        id: 'new-category-task',
        list_id: 'personal',
        category_id: 'new-category',
      }),
    ],
    preferences,
    categoriesWithNewCategory,
  )

  assert.deepEqual(visible.map(({ id }) => id), ['uncategorized', 'errand'])
})

test('parent and child toggles use standard tri-state selection semantics', () => {
  const categories = [
    { id: 'errands', list_id: 'personal' },
    { id: 'to-buy', list_id: 'personal' },
  ]
  const partial = setHomeCategoryEnabled(
    defaultHomeSourcePreferences(),
    'to-buy',
    false,
    categories,
  )
  const disabled = setHomeListEnabled(
    partial,
    'personal',
    false,
    categories,
  )
  const restored = setHomeListEnabled(disabled, 'personal', true, categories)
  const selected = setHomeCategoryEnabled(
    disabled,
    'errands',
    true,
    categories,
  )
  const completed = setHomeCategoryEnabled(
    selected,
    'to-buy',
    true,
    categories,
  )
  const partialAgain = setHomeCategoryEnabled(
    completed,
    'to-buy',
    false,
    categories,
  )
  const fullyDisabled = setHomeCategoryEnabled(
    partialAgain,
    'errands',
    false,
    categories,
  )
  const categoriesOffWithDirectTask = setHomeCategoryEnabled(
    partialAgain,
    'errands',
    false,
    categories,
    true,
  )

  assert.equal(getHomeListState('personal', categories, disabled), 'disabled')
  assert.equal(getHomeListState('personal', categories, restored), 'enabled')
  assert.equal(getHomeListState('personal', categories, selected), 'partial')
  assert.equal(getHomeListState('personal', categories, completed), 'enabled')
  assert.equal(getHomeListState('personal', categories, partialAgain), 'partial')
  assert.equal(getHomeListState('personal', categories, fullyDisabled), 'disabled')
  assert.equal(
    getHomeListState(
      'personal',
      categories,
      categoriesOffWithDirectTask,
      true,
    ),
    'partial',
  )
  assert.deepEqual(
    filterHomeTasks(
      [task({ id: 'direct', list_id: 'personal' })],
      categoriesOffWithDirectTask,
      categories,
    ).map(({ id }) => id),
    ['direct'],
  )
  assert.equal(isHomeCategoryEnabled(categories[0], categories, restored), true)
  assert.equal(isHomeCategoryEnabled(categories[1], categories, restored), true)
  assert.equal(isHomeCategoryEnabled(categories[0], categories, selected), true)
  assert.equal(isHomeCategoryEnabled(categories[1], categories, selected), false)
  assert.equal(isHomeCategoryEnabled(categories[1], categories, completed), true)
  assert.equal(isHomeCategoryEnabled(categories[0], categories, fullyDisabled), false)
  assert.equal(isHomeCategoryEnabled(categories[1], categories, fullyDisabled), false)
})

test('new lists are enabled by default and stale exclusions are ignored', () => {
  assert.deepEqual(
    normalizeHomeSourcePreferences(
      {
        excluded_home_list_ids: ['missing', 'school', 'school'],
        excluded_home_category_ids: ['missing-category', 'essay', 'essay'],
        included_home_category_ids: ['missing-category', 'exam', 'exam'],
        show_unsorted_on_home: true,
      },
      ['school', 'personal'],
      ['essay', 'exam'],
    ),
    {
      excludedHomeListIds: ['school'],
      excludedHomeCategoryIds: ['essay'],
      includedHomeCategoryIds: ['exam'],
      showUnsortedOnHome: true,
    },
  )

  assert.deepEqual(
    setHomeSourceEnabled(
      {
        excludedHomeListIds: ['school'],
        excludedHomeCategoryIds: [],
        includedHomeCategoryIds: [],
        showUnsortedOnHome: true,
      },
      { type: 'list', listId: 'school' },
      true,
    ),
    {
        excludedHomeListIds: [],
        excludedHomeCategoryIds: [],
        includedHomeCategoryIds: [],
        showUnsortedOnHome: true,
    },
  )
})
