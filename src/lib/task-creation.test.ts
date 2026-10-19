import assert from 'node:assert/strict'
import test from 'node:test'
import type { Category, ListSummary, TaskWithList } from '../types.ts'
import { defaultHomeSourcePreferences, filterHomeTasks } from './home.ts'
import { matchesTaskSearch } from './tasks.ts'
import { isCreatedScheduleVisible, isCreatedTaskVisible, taskCreationMessage } from './task-creation.ts'

const list: ListSummary = {
  id: 'personal', title: 'Personal', emoji: '🏡', default_view: 'list', color: 'blue',
}
const categories: Category[] = [
  { id: 'errands', list_id: list.id, title: 'Errands', position: 0 },
  { id: 'projects', list_id: list.id, title: 'Projects', position: 1 },
]
const task: TaskWithList = {
  id: 'new-task', user_id: 'user', title: 'Buy milk', notes: 'On the way home',
  list_id: list.id, category_id: 'errands', list,
  completed: false, focused: false, stashed: false,
  due_date: null, due_time: null, position: 0,
}

test('list and board creation only stays quiet for the current list', () => {
  assert.equal(isCreatedTaskVisible(task, { type: 'list', listId: list.id }), true)
  assert.equal(isCreatedTaskVisible(task, { type: 'list', listId: 'work' }), false)
  assert.equal(isCreatedTaskVisible({ ...task, list_id: null }, { type: 'list', listId: list.id }), false)
})

test('Home creation respects list, category, and Unsorted source filters', () => {
  const preferences = defaultHomeSourcePreferences()
  const view = { type: 'home' as const, preferences, categories, searchQuery: '' }
  assert.equal(isCreatedTaskVisible(task, view), true)
  assert.equal(isCreatedTaskVisible(task, { ...view, preferences: { ...preferences, excludedHomeListIds: [list.id] } }), false)
  assert.equal(isCreatedTaskVisible(task, { ...view, preferences: { ...preferences, excludedHomeCategoryIds: ['errands'] } }), false)
  assert.equal(isCreatedTaskVisible(task, { ...view, preferences: { ...preferences, includedHomeCategoryIds: ['projects'] } }), false)
  assert.equal(isCreatedTaskVisible({ ...task, list_id: null, list: null, category_id: null }, {
    ...view, preferences: { ...preferences, showUnsortedOnHome: false },
  }), false)
})

test('creation visibility agrees with rendered Home filtering, including search', () => {
  const preferences = defaultHomeSourcePreferences()
  for (const searchQuery of ['', '  MILK  ', 'way home', 'personal', 'no match']) {
    const visible = filterHomeTasks([task], preferences, categories)
      .filter((candidate) => matchesTaskSearch(candidate, searchQuery))
    assert.equal(isCreatedTaskVisible(task, {
      type: 'home', preferences, categories, searchQuery,
    }), visible.length > 0)
  }
  assert.equal(isCreatedTaskVisible(task, {
    type: 'home', preferences, categories, searchQuery: 'no match',
  }), false)
})

test('focused tasks remain visible on Home even when their source is hidden', () => {
  assert.equal(isCreatedTaskVisible({ ...task, focused: true }, {
    type: 'home', categories, searchQuery: '',
    preferences: { ...defaultHomeSourcePreferences(), excludedHomeListIds: [list.id] },
  }), true)
})

test('a deadline is required to see a new task in Deadlines', () => {
  assert.equal(isCreatedTaskVisible(task, { type: 'deadlines' }), false)
  assert.equal(isCreatedTaskVisible({ ...task, due_date: '2026-10-20' }, { type: 'deadlines' }), true)
})

test('new incomplete tasks are hidden in Completed and visible in All', () => {
  assert.equal(isCreatedTaskVisible(task, { type: 'completed' }), false)
  assert.equal(isCreatedTaskVisible(task, { type: 'all' }), true)
  assert.equal(isCreatedTaskVisible(task), false)
})

test('Today quick capture only appears immediately when it is a due suggestion', () => {
  const view = { type: 'today' as const, day: '2026-10-19' }
  assert.equal(isCreatedTaskVisible(task, view), false)
  assert.equal(isCreatedTaskVisible({ ...task, due_date: '2026-10-18' }, view), true)
  assert.equal(isCreatedTaskVisible({ ...task, due_date: '2026-10-19' }, view), true)
  assert.equal(isCreatedTaskVisible({ ...task, due_date: '2026-10-20' }, view), false)
})

test('Calendar and agenda visibility uses overlapping time ranges with exclusive ends', () => {
  const range = { startsAt: '2026-10-19T00:00:00Z', endsAt: '2026-10-20T00:00:00Z' }
  assert.equal(isCreatedScheduleVisible({ starts_at: '2026-10-19T12:00:00Z', ends_at: null }, range), true)
  assert.equal(isCreatedScheduleVisible({ starts_at: '2026-10-20T12:00:00Z', ends_at: null }, range), false)
  assert.equal(isCreatedScheduleVisible({ starts_at: range.endsAt, ends_at: null }, range), false)
  assert.equal(isCreatedScheduleVisible({ starts_at: '2026-10-18T23:45:00Z', ends_at: range.startsAt }, range), false)
  assert.equal(isCreatedScheduleVisible({ starts_at: '2026-10-18T23:45:00Z', ends_at: '2026-10-19T00:15:00Z' }, range), true)
  assert.equal(isCreatedScheduleVisible({ starts_at: range.startsAt, ends_at: null }, null), false)
})

test('success copy names the destination using local list and category titles', () => {
  assert.equal(taskCreationMessage(task, [list], categories), 'Task added to 🏡 Personal / Errands')
  assert.equal(taskCreationMessage({ ...task, category_id: null }, [list], categories), 'Task added to 🏡 Personal')
  assert.equal(taskCreationMessage({ list_id: null }, [list]), 'Task added to Unsorted')
  assert.equal(taskCreationMessage(task, []), 'Task added')
  assert.equal(taskCreationMessage(task, [{ ...list, emoji: null }], categories), 'Task added to Personal / Errands')
  assert.equal(taskCreationMessage(task, [list], [{ ...categories[0], list_id: 'work' }]), 'Task added to 🏡 Personal')
})
