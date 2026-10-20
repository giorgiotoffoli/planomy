import type { ListColor } from '@/lib/list-colors'

export interface ListSummary {
  id: string
  title: string
  emoji: string | null
  default_view: 'list' | 'board'
  color: ListColor
}

export interface Task {
  user_id: string
  id: string
  list_id: string | null
  title: string
  completed: boolean
  due_date: string | null
  due_time: string | null
  notes?: string
  category_id?: string | null
  position: number
  created_at?: string | null
  focused: boolean
  stashed: boolean
  recurrence_rule?: RecurrenceRule | null
}

export interface CategorySummary {
  id: string
  list_id: string
  color: ListColor | null
}

export interface TaskWithList extends Task {
  list: ListSummary | null
  category?: CategorySummary | null
}

export interface List extends ListSummary {
  user_id: string
}

export interface Category {
  id: string
  list_id: string
  title: string
  position: number
  color?: ListColor | null
  created_at?: string | null
}

export interface DailySelection {
  task_id: string
  selected_date: string
  focused: boolean
}

export interface TimeBlock {
  /** Stable session identity. Legacy fixtures may omit this during migration. */
  id?: string
  task_id: string
  user_id: string
  starts_at: string
  ends_at: string | null
  occurrence_id?: string | null
  session_index?: number | null
  is_override?: boolean
  status?: ScheduledSessionStatus
  created_at?: string | null
  updated_at?: string | null
}

export interface AgendaBlock extends TimeBlock {
  task: TaskWithList
  occurrence?: TaskOccurrence | null
}

export type ScheduledSessionStatus = 'scheduled' | 'skipped'

export type RecurrenceFrequency =
  | 'daily'
  | 'weekday'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  /** First local calendar date on which the series occurs. */
  startDate: string
  /** Every N units for custom/daily/weekly/monthly/yearly rules. */
  interval?: number
  /** ISO weekday numbers, where 1 is Monday and 7 is Sunday. */
  weekdays?: number[]
  /** Optional inclusive local end date. */
  endDate?: string | null
  /** Optional maximum number of generated occurrences. */
  count?: number | null
  /** Optional ordinal weekday for monthly rules, e.g. first Monday. */
  monthlyPosition?: number | null
  /** ISO weekday used with monthlyPosition. */
  monthlyWeekday?: number | null
  /** Optional wall-clock sessions repeated for every generated occurrence. */
  scheduledSessions?: RecurrenceSession[]
}

export interface RecurrenceSession {
  /** Stable position identity inside the recurrence series. */
  id: string
  /** Local wall-clock start in HH:mm. */
  startTime: string
  /** Elapsed duration in minutes, or null for an untimed session. */
  durationMinutes: number | null
  /** IANA time zone used to interpret startTime across DST changes. */
  timeZone: string
}

export interface TaskOccurrence {
  id: string
  user_id: string
  task_id: string
  occurrence_date: string
  completed: boolean
  skipped: boolean
  cancelled: boolean
  override_data?: TaskOccurrenceOverride | null
  created_at?: string | null
  updated_at?: string | null
}

export interface TaskOccurrenceOverride {
  title?: string
  notes?: string
  listId?: string | null
  categoryId?: string | null
  dueDate?: string | null
  dueTime?: string | null
}

export type NeedsAttentionKind = 'missed-session' | 'missed-occurrence'

export interface NeedsAttentionItem {
  id: string
  kind: NeedsAttentionKind
  task: TaskWithList
  session: TimeBlock | null
  occurrences: TaskOccurrence[]
  occurredAt: string
}

export interface CalendarEvent {
  id: string
  user_id: string
  list_id: string | null
  category_id?: string | null
  category?: CategorySummary | null
  color?: ListColor | null
  title: string
  description: string | null
  location: string | null
  all_day: boolean
  starts_at: string | null
  ends_at: string | null
  starts_on: string | null
  ends_on: string | null
  time_zone: string
  recurrence_rule: RecurrenceRule | null
  show_in_upcoming?: boolean
  created_at: string
  updated_at: string
  /** The persisted series id for a generated occurrence. */
  source_event_id?: string
  /** Stable original occurrence key, or null for a non-recurring event. */
  occurrence_key?: string | null
}

export interface CalendarEventWithList extends CalendarEvent {
  list: ListSummary | null
  category?: CategorySummary | null
}

type EventOrganizationInput = {
  title: string
  listId: string | null
  categoryId?: string | null
  color?: ListColor | null
  showInUpcoming?: boolean
  description?: string
  location?: string
  timeZone?: string
  recurrenceRule?: RecurrenceRule | null
}

export type CreateEventInput = EventOrganizationInput & (
  | {
      allDay: false
      startsAt: string
      endsAt: string | null
    }
  | {
      allDay: true
      startsOn: string
      endsOn: string
    }
)

export type UpdateEventInput = CreateEventInput & { eventId: string }

export type UpdateEventOccurrenceInput = CreateEventInput & {
  eventId: string
  occurrenceKey: string
}

export interface EventOccurrenceException {
  id: string
  event_id: string
  user_id: string
  occurrence_key: string
  cancelled: boolean
  title: string | null
  description: string | null
  location: string | null
  time_zone: string | null
  list_id: string | null
  category_id?: string | null
  category?: CategorySummary | null
  color?: ListColor | null
  all_day: boolean | null
  starts_at: string | null
  ends_at: string | null
  starts_on: string | null
  ends_on: string | null
  show_in_upcoming?: boolean | null
  created_at: string
  updated_at: string
}

export interface CreateTaskInput {
  title: string
  notes: string
  listId: string | null
  categoryId: string | null
  dueDate: string | null
  dueTime: string | null
  focused: boolean
  repeatRule?: RecurrenceRule | null
}

export interface UpdateTaskInput extends CreateTaskInput {
  taskId: string
}
