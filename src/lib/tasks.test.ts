import assert from 'node:assert/strict'
import test from 'node:test'
import type { ListSummary, TaskWithList } from '../types.ts'
import { applyTaskOrganizationChange } from './tasks.ts'

const lists: ListSummary[] = [
  {
    id: 'personal',
    title: 'Personal',
    emoji: '🏡',
    default_view: 'list',
    color: 'blue',
  },
  {
    id: 'work',
    title: 'Work',
    emoji: '💼',
    default_view: 'board',
    color: 'orange',
  },
]

const task: TaskWithList = {
  id: 'task-1',
  user_id: 'user-1',
  list_id: 'personal',
  category_id: 'errands',
  title: 'Buy milk',
  completed: false,
  due_date: null,
  due_time: null,
  position: 0,
  focused: false,
  stashed: false,
  list: lists[0],
}

test('applies an optimistic task list and category change', () => {
  const result = applyTaskOrganizationChange(task, lists, {
    taskId: task.id,
    listId: 'work',
    categoryId: null,
  })

  assert.equal(result.list_id, 'work')
  assert.equal(result.category_id, null)
  assert.equal(result.list, lists[1])
})

test('restores the previous task organization during rollback', () => {
  const moved = applyTaskOrganizationChange(task, lists, {
    taskId: task.id,
    listId: 'work',
    categoryId: null,
  })
  const restored = applyTaskOrganizationChange(moved, lists, {
    taskId: task.id,
    listId: 'personal',
    categoryId: 'errands',
  })

  assert.equal(restored.list_id, 'personal')
  assert.equal(restored.category_id, 'errands')
  assert.equal(restored.list, lists[0])
})

test('leaves unrelated tasks unchanged', () => {
  const result = applyTaskOrganizationChange(task, lists, {
    taskId: 'task-2',
    listId: 'work',
    categoryId: null,
  })

  assert.equal(result, task)
})
