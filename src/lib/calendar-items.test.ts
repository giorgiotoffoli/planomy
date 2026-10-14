import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  AgendaBlock,
  CalendarEventWithList,
  TaskWithList,
} from '../types.ts'
import { projectCalendarItems } from './calendar-items.ts'

function task(overrides: Partial<TaskWithList> = {}): TaskWithList {
  return {
    user_id: 'user',
    id: 'task',
    list_id: 'school',
    title: 'Finish essay',
    completed: false,
    due_date: '2026-10-16',
    due_time: '23:59',
    position: 0,
    focused: false,
    stashed: false,
    list: {
      id: 'school',
      title: 'School',
      emoji: null,
      default_view: 'list',
      color: 'blue',
    },
    ...overrides,
  }
}

test('the same task projects independently as scheduled work and a deadline', () => {
  const essay = task()
  const block: AgendaBlock = {
    task_id: essay.id,
    user_id: essay.user_id,
    starts_at: '2026-10-15T19:00:00-05:00',
    ends_at: '2026-10-15T20:30:00-05:00',
    task: essay,
  }

  const items = projectCalendarItems([essay], [block], [])
  assert.deepEqual(items.map(({ kind }) => kind), [
    'due-task',
    'scheduled-task',
  ])
  assert.notEqual(items[0].id, items[1].id)
})

test('duration-less scheduled tasks keep a null end', () => {
  const scheduled = task({ due_date: null, due_time: null })
  const items = projectCalendarItems([], [{
    task_id: scheduled.id,
    user_id: scheduled.user_id,
    starts_at: '2026-10-15T14:00:00-05:00',
    ends_at: null,
    task: scheduled,
  }], [])

  assert.equal(items[0].kind, 'scheduled-task')
  if (items[0].kind === 'scheduled-task') assert.equal(items[0].endsAt, null)
})

test('native events remain distinct and retain their List relationship', () => {
  const event: CalendarEventWithList = {
    id: 'lecture',
    user_id: 'user',
    list_id: 'school',
    title: 'Data Structures',
    all_day: false,
    starts_at: '2026-10-13T09:30:00-05:00',
    ends_at: '2026-10-13T10:50:00-05:00',
    starts_on: null,
    ends_on: null,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    list: task().list,
  }

  const [item] = projectCalendarItems([], [], [event])
  assert.equal(item.kind, 'event')
  if (item.kind === 'event') assert.equal(item.event.list?.color, 'blue')
})
