import type {
  AgendaBlock,
  CalendarEvent,
  CalendarEventWithList,
  TaskWithList,
} from '@/types'
import { formatTaskDueTime, projectCalendarTasks } from './calendar-tasks.ts'
import type { TimeFormat } from './calendar-preferences.ts'
import { addCalendarDays, isDateKey, localDateKey } from './today.ts'
import { sessionPhase, type SessionPhase } from './recurrence.ts'

export type DueTaskCalendarItem = {
  id: string
  kind: 'due-task'
  task: TaskWithList
  dateKey: string
  dueTimeLabel: string | null
}

export type ScheduledTaskCalendarItem = {
  id: string
  sessionId: string
  kind: 'scheduled-task'
  task: TaskWithList
  startsAt: string
  endsAt: string | null
  occurrenceId: string | null
  sessionIndex: number | null
  status: 'scheduled' | 'skipped'
  sessionState: SessionPhase
}

export type EventCalendarItem = {
  id: string
  kind: 'event'
  event: CalendarEventWithList
}

export type CalendarItem =
  | DueTaskCalendarItem
  | ScheduledTaskCalendarItem
  | EventCalendarItem

export type ScheduledTaskPhase = 'upcoming' | 'in-progress' | 'past'

export function isCalendarEventPast(
  event: Pick<CalendarEvent, 'all_day' | 'starts_at' | 'ends_at' | 'ends_on'>,
  now = new Date(),
) {
  if (event.all_day) {
    return Boolean(event.ends_on && event.ends_on <= localDateKey(now))
  }

  if (!event.starts_at) return false
  const start = Date.parse(event.starts_at)
  if (!Number.isFinite(start)) return false
  const end = event.ends_at ? Date.parse(event.ends_at) : start
  return Number.isFinite(end) && end <= now.getTime()
}

export function isTaskDeadlineOverdue(
  task: Pick<TaskWithList, 'completed' | 'due_date' | 'due_time'>,
  now = new Date(),
) {
  if (task.completed || !task.due_date || !isDateKey(task.due_date)) return false

  const deadline = task.due_time
    ? new Date(`${task.due_date}T${task.due_time}`)
    : new Date(`${addCalendarDays(task.due_date, 1)}T00:00:00`)

  return Number.isFinite(deadline.getTime()) && deadline.getTime() <= now.getTime()
}

export function scheduledTaskPhase(
  item: Pick<ScheduledTaskCalendarItem, 'startsAt' | 'endsAt'>,
  now = new Date(),
): ScheduledTaskPhase {
  const start = Date.parse(item.startsAt)
  if (!Number.isFinite(start)) return 'upcoming'

  const end = item.endsAt
    ? Date.parse(item.endsAt)
    : start + 15 * 60_000
  if (!Number.isFinite(end)) return 'upcoming'
  if (end <= now.getTime()) return 'past'
  if (start <= now.getTime()) return 'in-progress'
  return 'upcoming'
}

export function scheduledTaskProgress(
  item: Pick<ScheduledTaskCalendarItem, 'startsAt' | 'endsAt'>,
  now = new Date(),
) {
  const start = Date.parse(item.startsAt)
  if (!Number.isFinite(start)) return 0

  const end = item.endsAt
    ? Date.parse(item.endsAt)
    : start + 15 * 60_000
  if (!Number.isFinite(end) || end <= start) return 0

  return Math.max(0, Math.min(100, ((now.getTime() - start) / (end - start)) * 100))
}

export function scheduledTaskState(
  item: Pick<ScheduledTaskCalendarItem, 'startsAt' | 'endsAt' | 'status' | 'task'>,
  now = new Date(),
) {
  return sessionPhase({
    starts_at: item.startsAt,
    ends_at: item.endsAt,
    status: item.status,
  }, item.task.completed, now)
}

export function projectCalendarItems(
  dueTasks: TaskWithList[],
  scheduledTasks: AgendaBlock[],
  events: CalendarEventWithList[],
  timeFormat: TimeFormat = '12h',
): CalendarItem[] {
  const due: DueTaskCalendarItem[] = projectCalendarTasks(dueTasks, timeFormat).map(
    ({ task, dateKey }) => ({
      id: `due:${task.id}`,
      kind: 'due-task',
      task,
      dateKey,
      dueTimeLabel: formatTaskDueTime(task.due_time, undefined, timeFormat),
    }),
  )

  const scheduled: ScheduledTaskCalendarItem[] = scheduledTasks.flatMap(
    (block) => {
      if (!Number.isFinite(Date.parse(block.starts_at))) return []
      if (block.ends_at && !Number.isFinite(Date.parse(block.ends_at))) return []
      const sessionId = block.id ?? `${block.task_id}:${block.starts_at}`
      const task = block.occurrence
        ? { ...block.task, completed: block.occurrence.completed }
        : block.task
      return [{
        id: `scheduled:${sessionId}`,
        sessionId,
        kind: 'scheduled-task' as const,
        task,
        startsAt: block.starts_at,
        endsAt: block.ends_at,
        occurrenceId: block.occurrence?.id ?? block.occurrence_id ?? null,
        sessionIndex: block.session_index ?? null,
        status: block.status === 'skipped' ? 'skipped' as const : 'scheduled' as const,
        sessionState: scheduledTaskState({
          startsAt: block.starts_at,
          endsAt: block.ends_at,
          status: block.status === 'skipped' ? 'skipped' : 'scheduled',
          task,
        }),
      }]
    },
  )

  const nativeEvents: EventCalendarItem[] = events.map((event) => ({
    id: `event:${event.id}`,
    kind: 'event',
    event,
  }))

  return [...due, ...scheduled, ...nativeEvents]
}
