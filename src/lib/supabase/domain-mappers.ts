import { isListColor } from '@/lib/list-colors'
import type {
  AgendaBlock,
  EventOccurrenceException,
  CalendarEventWithList,
  CategorySummary,
  List,
  RecurrenceRule,
  TaskOccurrence,
  TaskOccurrenceOverride,
  TaskWithList,
} from '@/types'
import type { Tables } from './database-types'
import { normalizeRecurrenceRule } from '@/lib/recurrence'

type ListRow = Tables<'lists'>
type TaskRow = Tables<'tasks'>
type TimeBlockRow = Tables<'task_time_blocks'>
type EventRow = Tables<'events'>
type CategorySummaryRow = Pick<Tables<'categories'>, 'id' | 'list_id' | 'color'>

type ListSummaryRow = Pick<
  ListRow,
  'id' | 'title' | 'emoji' | 'default_view' | 'color'
>

export type TaskWithListRow = TaskRow & {
  list: ListSummaryRow | null
  category?: CategorySummaryRow | null
}

type AgendaBlockRow = TimeBlockRow & {
  task: TaskWithListRow
  occurrence: TaskOccurrenceRow | null
}

type TaskOccurrenceRow = Tables<'task_occurrences'>

export type EventWithListRow = EventRow & {
  list: ListSummaryRow | null
  category?: CategorySummaryRow | null
}

export type EventOccurrenceExceptionRow = Tables<'event_occurrence_exceptions'> & {
  category?: CategorySummaryRow | null
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

function categorySummary(row: CategorySummaryRow | null | undefined): CategorySummary | null {
  if (!row) return null
  return {
    id: row.id,
    list_id: row.list_id,
    color: row.color && isListColor(row.color) ? row.color : null,
  }
}

function recurrenceRule(value: unknown): RecurrenceRule | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return normalizeRecurrenceRule(value as RecurrenceRule)
}

function taskOccurrence(row: TaskOccurrenceRow): TaskOccurrence {
  const override = row.override_data
  return {
    ...row,
    override_data: override && typeof override === 'object' && !Array.isArray(override)
      ? override as TaskOccurrenceOverride
      : null,
  }
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
    recurrence_rule: recurrenceRule(row.recurrence_rule),
    list: row.list ? toListSummary(row.list) : null,
    category: categorySummary(row.category),
  }
}

export function toAgendaBlock(row: AgendaBlockRow): AgendaBlock {
  const task = toTaskWithList(row.task)
  const occurrence = row.occurrence ? taskOccurrence(row.occurrence) : null
  return {
    id: row.id,
    task_id: row.task_id,
    user_id: row.user_id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    occurrence_id: row.occurrence_id,
    session_index: row.session_index,
    is_override: row.is_override,
    status: row.status === 'skipped' || occurrence?.skipped ? 'skipped' : 'scheduled',
    created_at: row.created_at,
    updated_at: row.updated_at,
    occurrence,
    task: occurrence ? { ...task, completed: occurrence.completed } : task,
  }
}

export function toCalendarEvent(
  row: EventWithListRow,
): CalendarEventWithList {
  return {
    id: row.id,
    user_id: row.user_id,
    list_id: row.list_id,
    category_id: row.category_id,
    color: row.color && isListColor(row.color) ? row.color : null,
    title: row.title,
    description: row.description,
    location: row.location,
    time_zone: row.time_zone,
    all_day: row.all_day,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    starts_on: row.starts_on,
    ends_on: row.ends_on,
    recurrence_rule: recurrenceRule(row.recurrence_rule),
    show_in_upcoming: row.show_in_upcoming ?? true,
    show_in_list: row.show_in_list ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
    list: row.list ? toListSummary(row.list) : null,
    category: categorySummary(row.category),
  }
}

export function toEventOccurrenceException(
  row: EventOccurrenceExceptionRow,
): EventOccurrenceException {
  return {
    id: row.id,
    event_id: row.event_id,
    user_id: row.user_id,
    occurrence_key: row.occurrence_key,
    cancelled: row.cancelled,
    title: row.title,
    description: row.description,
    location: row.location,
    time_zone: row.time_zone,
    list_id: row.list_id,
    category_id: row.category_id,
    color: row.color && isListColor(row.color) ? row.color : null,
    all_day: row.all_day,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    starts_on: row.starts_on,
    ends_on: row.ends_on,
    created_at: row.created_at,
    updated_at: row.updated_at,
    show_in_upcoming: row.show_in_upcoming,
    category: categorySummary(row.category),
  }
}
