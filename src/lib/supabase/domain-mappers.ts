import type { AgendaBlock, List, TaskWithList } from '@/types'
import type { Tables } from './database-types'

type ListRow = Tables<'lists'>
type TaskRow = Tables<'tasks'>
type TimeBlockRow = Tables<'task_time_blocks'>

type ListSummaryRow = Pick<ListRow, 'id' | 'title' | 'default_view'>

export type TaskWithListRow = TaskRow & {
  list: ListSummaryRow | null
}

type AgendaBlockRow = TimeBlockRow & {
  task: TaskWithListRow
}

function required(value: string | null, column: string): string {
  if (value === null) {
    throw new Error(`Invalid database row: ${column} cannot be null`)
  }

  return value
}

function listView(value: string | null): List['default_view'] {
  if (value !== 'list' && value !== 'board') {
    throw new Error('Invalid database row: lists.default_view must be list or board')
  }

  return value
}

function toListSummary(row: ListSummaryRow): NonNullable<TaskWithList['list']> {
  return {
    id: row.id,
    title: required(row.title, 'lists.title'),
    default_view: listView(row.default_view),
  }
}

export function toList(row: ListRow): List {
  return {
    user_id: required(row.user_id, 'lists.user_id'),
    ...toListSummary(row),
  }
}

export function toTaskWithList(row: TaskWithListRow): TaskWithList {
  return {
    user_id: required(row.user_id, 'tasks.user_id'),
    id: row.id,
    list_id: row.list_id,
    title: required(row.title, 'tasks.title'),
    completed: row.completed,
    due_date: row.due_date,
    due_time: row.due_time,
    notes: row.notes ?? undefined,
    status_id: row.status_id,
    position: row.position,
    created_at: row.created_at,
    focused: row.focused,
    stashed: row.stashed,
    list: row.list ? toListSummary(row.list) : null,
  }
}

export function toAgendaBlock(row: AgendaBlockRow): AgendaBlock {
  return {
    task_id: row.task_id,
    user_id: row.user_id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    task: toTaskWithList(row.task),
  }
}
