import type {
  AgendaBlock,
  CalendarEventWithList,
  TaskWithList,
} from '@/types'
import { formatTaskDueTime, projectCalendarTasks } from './calendar-tasks.ts'

export type DueTaskCalendarItem = {
  id: string
  kind: 'due-task'
  task: TaskWithList
  dateKey: string
  dueTimeLabel: string | null
}

export type ScheduledTaskCalendarItem = {
  id: string
  kind: 'scheduled-task'
  task: TaskWithList
  startsAt: string
  endsAt: string | null
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

export function projectCalendarItems(
  dueTasks: TaskWithList[],
  scheduledTasks: AgendaBlock[],
  events: CalendarEventWithList[],
): CalendarItem[] {
  const due: DueTaskCalendarItem[] = projectCalendarTasks(dueTasks).map(
    ({ task, dateKey }) => ({
      id: `due:${task.id}`,
      kind: 'due-task',
      task,
      dateKey,
      dueTimeLabel: formatTaskDueTime(task.due_time),
    }),
  )

  const scheduled: ScheduledTaskCalendarItem[] = scheduledTasks.flatMap(
    (block) => {
      if (!Number.isFinite(Date.parse(block.starts_at))) return []
      if (block.ends_at && !Number.isFinite(Date.parse(block.ends_at))) return []
      return [{
        id: `scheduled:${block.task_id}`,
        kind: 'scheduled-task' as const,
        task: block.task,
        startsAt: block.starts_at,
        endsAt: block.ends_at,
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
