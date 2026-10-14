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
}

export interface TaskWithList extends Task {
  list: ListSummary | null
}

export interface List extends ListSummary {
  user_id: string
}

export interface Category {
  id: string
  list_id: string
  title: string
  position: number
  created_at?: string | null
}

export interface DailySelection {
  task_id: string
  selected_date: string
  focused: boolean
}

export interface TimeBlock {
  task_id: string
  user_id: string
  starts_at: string
  ends_at: string | null
}

export interface AgendaBlock extends TimeBlock {
  task: TaskWithList
}

export interface CalendarEvent {
  id: string
  user_id: string
  list_id: string | null
  title: string
  all_day: boolean
  starts_at: string | null
  ends_at: string | null
  starts_on: string | null
  ends_on: string | null
  created_at: string
  updated_at: string
}

export interface CalendarEventWithList extends CalendarEvent {
  list: ListSummary | null
}

type EventOrganizationInput = {
  title: string
  listId: string | null
}

export type CreateEventInput = EventOrganizationInput & (
  | {
      allDay: false
      startsAt: string
      endsAt: string
    }
  | {
      allDay: true
      startsOn: string
      endsOn: string
    }
)

export type UpdateEventInput = CreateEventInput & { eventId: string }

export interface CreateTaskInput {
  title: string
  notes: string
  listId: string | null
  categoryId: string | null
  dueDate: string | null
  dueTime: string | null
  focused: boolean
}

export interface UpdateTaskInput extends CreateTaskInput {
  taskId: string
}
