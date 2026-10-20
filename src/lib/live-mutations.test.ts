import assert from 'node:assert/strict'
import test from 'node:test'
import type { CalendarEventWithList, TaskWithList } from '@/types'
import {
  applyCategoryMutationToEvent,
  applyCategoryMutationToTask,
} from './live-mutations.ts'

const list = {
  id: 'school',
  title: 'School',
  emoji: null,
  default_view: 'list' as const,
  color: 'green' as const,
}

test('category color changes propagate to task and event summaries', () => {
  const task: TaskWithList = {
    user_id: 'user',
    id: 'task',
    list_id: list.id,
    title: 'Essay',
    completed: false,
    due_date: null,
    due_time: null,
    category_id: 'projects',
    position: 0,
    focused: false,
    stashed: false,
    list,
    category: { id: 'projects', list_id: list.id, color: null },
  }
  const event: CalendarEventWithList = {
    id: 'event',
    user_id: 'user',
    list_id: list.id,
    category_id: 'projects',
    title: 'Review',
    description: null,
    location: null,
    all_day: false,
    starts_at: '2026-10-20T14:00:00Z',
    ends_at: '2026-10-20T15:00:00Z',
    starts_on: null,
    ends_on: null,
    time_zone: 'UTC',
    recurrence_rule: null,
    created_at: '2026-10-20T00:00:00Z',
    updated_at: '2026-10-20T00:00:00Z',
    list,
    category: { id: 'projects', list_id: list.id, color: null },
  }
  const change = { categoryId: 'projects', listId: list.id, color: 'pink' as const }

  assert.equal(applyCategoryMutationToTask(task, change).category?.color, 'pink')
  assert.equal(applyCategoryMutationToEvent(event, change).category?.color, 'pink')
})
