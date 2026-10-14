import { isListColor } from '@/lib/list-colors'
import type {
  AgendaBlock,
  CalendarEventWithList,
  List,
  TaskWithList,
} from '@/types'
import type { Tables } from './database-types'

type ListRow = Tables<'lists'>
type TaskRow = Tables<'tasks'>
type TimeBlockRow = Tables<'task_time_blocks'>
type EventRow = Tables<'events'>

type ListSummaryRow = Pick<
  ListRow,
  'id' | 'title' | 'emoji' | 'default_view' | 'color'
>

export type TaskWithListRow = TaskRow & {
  list: ListSummaryRow | null
}

type AgendaBlockRow = TimeBlockRow & {
  task: TaskWithListRow
}

export type EventWithListRow = EventRow & {
  list: ListSummaryRow | null
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

function listColor(value: string): List['color'] {
  if (!isListColor(value)) {
    throw new Error('Invalid database row: lists.color is not approved')
  }

  return value
}

function toListSummary(row: ListSummaryRow): NonNullable<TaskWithList['list']> {
  return {
    id: row.id,
    title: required(row.title, 'lists.title'),
    emoji: row.emoji,
    default_view: listView(row.default_view),
    color: listColor(row.color),
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
    category_id: row.category_id,
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

export function toCalendarEvent(
  row: EventWithListRow,
): CalendarEventWithList {
  return {
    id: row.id,
    user_id: row.user_id,
    list_id: row.list_id,
    title: row.title,
    all_day: row.all_day,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    starts_on: row.starts_on,
    ends_on: row.ends_on,
    created_at: row.created_at,
    updated_at: row.updated_at,
    list: row.list ? toListSummary(row.list) : null,
  }
}
