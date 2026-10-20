import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  AgendaBlock,
  CalendarEventWithList,
  TaskWithList,
} from '../types.ts'
import {
  isCalendarEventPast,
  isTaskDeadlineOverdue,
  projectCalendarItems,
  scheduledTaskProgress,
  scheduledTaskPhase,
} from './calendar-items.ts'

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

test('multiple sessions keep independent calendar identities for one task', () => {
  const laundry = task({ id: 'laundry', due_date: null, due_time: null })
  const items = projectCalendarItems([], [
    {
      id: 'morning',
      task_id: laundry.id,
      user_id: laundry.user_id,
      starts_at: '2026-10-19T09:00:00-05:00',
      ends_at: '2026-10-19T09:30:00-05:00',
      status: 'scheduled',
      task: laundry,
    },
    {
      id: 'evening',
      task_id: laundry.id,
      user_id: laundry.user_id,
      starts_at: '2026-10-19T17:30:00-05:00',
      ends_at: '2026-10-19T18:00:00-05:00',
      status: 'scheduled',
      task: laundry,
    },
  ], [])
  assert.deepEqual(items.map((item) => item.id), ['scheduled:morning', 'scheduled:evening'])
  assert.deepEqual(items.map((item) => item.kind === 'scheduled-task' && item.sessionId), ['morning', 'evening'])
})

test('native events remain distinct and retain their List relationship', () => {
  const event: CalendarEventWithList = {
    id: 'lecture',
    user_id: 'user',
    list_id: 'school',
    title: 'Data Structures',
    description: null,
    location: null,
    all_day: false,
    starts_at: '2026-10-13T09:30:00-05:00',
    ends_at: '2026-10-13T10:50:00-05:00',
    starts_on: null,
    ends_on: null,
    time_zone: 'UTC',
    recurrence_rule: null,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    list: task().list,
  }

  const [item] = projectCalendarItems([], [], [event])
  assert.equal(item.kind, 'event')
  if (item.kind === 'event') assert.equal(item.event.list?.color, 'blue')
})

test('task deadline status uses the due time when present', () => {
  const taskWithTime = task({ due_date: '2026-10-19', due_time: '09:00:00' })
  assert.equal(
    isTaskDeadlineOverdue(taskWithTime, new Date('2026-10-19T08:59:00')),
    false,
  )
  assert.equal(
    isTaskDeadlineOverdue(taskWithTime, new Date('2026-10-19T09:00:00')),
    true,
  )
})

test('untimed task deadlines remain active through the due date', () => {
  const taskWithoutTime = task({ due_date: '2026-10-19', due_time: null })
  assert.equal(
    isTaskDeadlineOverdue(taskWithoutTime, new Date('2026-10-19T23:59:59')),
    false,
  )
  assert.equal(
    isTaskDeadlineOverdue(taskWithoutTime, new Date('2026-10-20T00:00:00')),
    true,
  )
})

test('scheduled plans distinguish upcoming, in-progress, and past time', () => {
  const item = {
    startsAt: '2026-10-19T09:00:00-05:00',
    endsAt: '2026-10-19T10:00:00-05:00',
  }
  assert.equal(scheduledTaskPhase(item, new Date('2026-10-19T08:59:00-05:00')), 'upcoming')
  assert.equal(scheduledTaskPhase(item, new Date('2026-10-19T09:30:00-05:00')), 'in-progress')
  assert.equal(scheduledTaskPhase(item, new Date('2026-10-19T10:00:00-05:00')), 'past')
  assert.equal(scheduledTaskProgress(item, new Date('2026-10-19T09:30:00-05:00')), 50)
})

test('events become past after their end, or at their start when untimed', () => {
  const timed = {
    all_day: false,
    starts_at: '2026-10-19T09:00:00-05:00',
    ends_at: '2026-10-19T10:00:00-05:00',
    ends_on: null,
  } as const
  assert.equal(isCalendarEventPast(timed, new Date('2026-10-19T09:30:00-05:00')), false)
  assert.equal(isCalendarEventPast(timed, new Date('2026-10-19T10:00:00-05:00')), true)
  assert.equal(isCalendarEventPast({ ...timed, ends_at: null }, new Date('2026-10-19T09:00:00-05:00')), true)
})
