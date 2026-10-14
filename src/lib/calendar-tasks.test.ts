import assert from 'node:assert/strict'
import test from 'node:test'
import type { TaskWithList } from '../types.ts'
import {
  formatTaskDueTime,
  getCalendarTasksForDate,
  getCalendarTasksForRange,
  projectCalendarTasks,
} from './calendar-tasks.ts'

function task(overrides: Partial<TaskWithList>): TaskWithList {
  return {
    user_id: 'user',
    id: overrides.id ?? 'task',
    list_id: overrides.list_id ?? null,
    title: overrides.title ?? 'Task',
    completed: overrides.completed ?? false,
    due_date: overrides.due_date ?? null,
    due_time: overrides.due_time ?? null,
    position: overrides.position ?? 0,
    focused: overrides.focused ?? false,
    stashed: overrides.stashed ?? false,
    list: overrides.list ?? null,
  }
}

test('projects only incomplete tasks with valid due dates', () => {
  const result = projectCalendarTasks([
    task({ id: 'dated', due_date: '2026-10-15' }),
    task({ id: 'undated' }),
    task({ id: 'completed', completed: true, due_date: '2026-10-15' }),
    task({ id: 'invalid', due_date: '2026-02-30' }),
  ])

  assert.deepEqual(result.map(({ task }) => task.id), ['dated'])
})

test('keeps overdue tasks on their historical due date', () => {
  const tasks = projectCalendarTasks([
    task({ id: 'overdue', due_date: '2026-10-10' }),
    task({ id: 'today', due_date: '2026-10-14' }),
  ])

  assert.deepEqual(
    getCalendarTasksForDate(tasks, '2026-10-10').map(({ task }) => task.id),
    ['overdue'],
  )
  assert.deepEqual(
    getCalendarTasksForDate(tasks, '2026-10-14').map(({ task }) => task.id),
    ['today'],
  )
})

test('uses an exclusive date-only range without timezone conversion', () => {
  const tasks = projectCalendarTasks([
    task({ id: 'before', due_date: '2026-10-11' }),
    task({ id: 'inside', due_date: '2026-10-12' }),
    task({ id: 'last', due_date: '2026-10-18' }),
    task({ id: 'after', due_date: '2026-10-19' }),
  ])

  assert.deepEqual(
    getCalendarTasksForRange(tasks, '2026-10-12', '2026-10-19').map(
      ({ task }) => task.id,
    ),
    ['inside', 'last'],
  )
})

test('formats due time as display metadata', () => {
  assert.equal(formatTaskDueTime('23:59:00', 'en-US'), '11:59 PM')
  assert.equal(formatTaskDueTime(null, 'en-US'), null)
  assert.equal(formatTaskDueTime('25:00:00', 'en-US'), null)
})
