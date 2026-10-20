import { decryptString } from '@/lib/crypto/e2ee'
import type { Category, List, TaskOccurrence, TaskWithList } from '@/types'

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

export async function applyTaskOccurrenceOverride(
  task: TaskWithList,
  occurrence: TaskOccurrence | null | undefined,
  masterKey: Uint8Array,
  lists: List[],
  categories: Category[] = [],
) {
  const raw = occurrence?.override_data
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return task
  const override = raw as Record<string, unknown>
  const title = hasOwn(override, 'title') && typeof override.title === 'string'
    ? await decryptString(override.title, masterKey)
    : task.title
  const notes = hasOwn(override, 'notes') && typeof override.notes === 'string'
    ? await decryptString(override.notes, masterKey)
    : task.notes
  const listId = hasOwn(override, 'listId')
    ? (typeof override.listId === 'string' ? override.listId : null)
    : task.list_id
  const categoryId = hasOwn(override, 'categoryId')
    ? (typeof override.categoryId === 'string' ? override.categoryId : null)
    : task.category_id ?? null
  const list = listId ? lists.find((candidate) => candidate.id === listId) ?? null : null
  const category = categoryId
    ? categories.find((candidate) => candidate.id === categoryId) ?? null
    : null
  return {
    ...task,
    title,
    notes,
    list_id: listId,
    category_id: categoryId,
    due_date: hasOwn(override, 'dueDate')
      ? (typeof override.dueDate === 'string' ? override.dueDate : null)
      : task.due_date,
    due_time: hasOwn(override, 'dueTime')
      ? (typeof override.dueTime === 'string' ? override.dueTime : null)
      : task.due_time,
    list,
    category: category
      ? { id: category.id, list_id: category.list_id, color: category.color ?? null }
      : null,
  }
}
