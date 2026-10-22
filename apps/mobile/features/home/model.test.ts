import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createPreviewSource,
  previewSnapshot,
  projectHomeCommand,
  type TaskDraft,
} from './model.ts'
import {
  getHomeBuckets,
  filterHomeTasks,
  getHomeListState,
} from '../../../../src/lib/home.ts'

const day = '2026-10-22'
test('Focus enforces the global three-task limit, including tasks hidden by sources', () => {
  let data = previewSnapshot(day)
  data = projectHomeCommand(data, {
    type: 'source',
    source: { type: 'list', listId: 'work' },
    visible: false,
  })
  data = projectHomeCommand(data, {
    type: 'focus',
    id: 'unsorted',
    focused: true,
  })
  assert.throws(
    () =>
      projectHomeCommand(data, { type: 'focus', id: 'today', focused: true }),
    /three tasks/,
  )
})
test('stash clears Focus, preserves organization, and disappears from active Home', () => {
  const data = projectHomeCommand(previewSnapshot(day), {
    type: 'stash',
    id: 'focus-1',
    stashed: true,
  })
  const task = data.tasks.find((task) => task.id === 'focus-1')!
  assert.equal(task.focused, false)
  assert.equal(task.list_id, 'work')
  assert.equal(task.category_id, 'projects')
  const buckets = getHomeBuckets(
    filterHomeTasks(data.tasks, data.preferences, data.categories),
    day,
  )
  assert.ok(buckets.stashed.some((task) => task.id === 'focus-1'))
  assert.ok(!buckets.focus.some((task) => task.id === 'focus-1'))
})
test('source categories can re-enable a disabled parent using the web partial selection rules', () => {
  let data = projectHomeCommand(previewSnapshot(day), {
    type: 'source',
    source: { type: 'list', listId: 'work' },
    visible: false,
  })
  data = projectHomeCommand(data, {
    type: 'category',
    id: 'ideas',
    visible: true,
  })
  assert.equal(
    getHomeListState('work', data.categories, data.preferences),
    'partial',
  )
  assert.ok(
    filterHomeTasks(data.tasks, data.preferences, data.categories).some(
      (task) => task.id === 'idea',
    ),
  )
  assert.ok(
    !filterHomeTasks(data.tasks, data.preferences, data.categories).some(
      (task) => task.id === 'overdue',
    ),
  )
})
test('creation validates organization, trims titles, and clears time when a date is removed', () => {
  const data = previewSnapshot(day)
  const draft: TaskDraft = {
    title: '  Read  ',
    notes: '',
    listId: null,
    categoryId: null,
    dueDate: null,
    dueTime: '09:00',
  }
  const created = projectHomeCommand(data, {
    type: 'save',
    id: 'new',
    creating: true,
    draft,
  })
  assert.equal(created.tasks.at(-1)?.title, 'Read')
  assert.equal(created.tasks.at(-1)?.due_time, null)
  assert.throws(
    () =>
      projectHomeCommand(data, {
        type: 'save',
        id: 'bad',
        creating: true,
        draft: { ...draft, categoryId: 'ideas' },
      }),
    /category/,
  )
  assert.throws(
    () =>
      projectHomeCommand(data, {
        type: 'save',
        id: 'bad',
        creating: true,
        draft: { ...draft, dueDate: '2026-02-30' },
      }),
    /date/,
  )
})
test('completing a daily occurrence preserves the series and supports Undo', () => {
  const original = previewSnapshot(day)
  const complete = {
    type: 'complete' as const,
    id: 'repeat',
    completed: true,
    day,
  }
  const data = projectHomeCommand(original, complete)
  assert.equal(
    data.tasks.find((task) => task.id === 'repeat')?.completed,
    false,
  )
  assert.equal(data.currentOccurrences[0].completed, true)
  assert.equal(
    projectHomeCommand(data, { ...complete, completed: false })
      .currentOccurrences[0].completed,
    false,
  )
  assert.equal(original.currentOccurrences[0].completed, false)
})
test('leaving preview discards the in-memory snapshot', async () => {
  const source = createPreviewSource(day)
  await source.execute({ type: 'stash', id: 'today', stashed: true })
  assert.ok((await source.read(day)).tasks.length)
  source.dispose()
  assert.equal((await source.read(day)).tasks.length, 0)
})
