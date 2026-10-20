import type { TaskWithList } from '@/types'
import { formatTime, type TimeFormat } from './calendar-preferences.ts'
import { isDateKey } from './today.ts'

export type CalendarTask = {
  task: TaskWithList
  dateKey: string
  dueTimeLabel: string | null
}

export function formatTaskDueTime(
  dueTime: string | null,
  locales?: Intl.LocalesArgument,
  timeFormat: TimeFormat = '12h',
) {
  if (!dueTime) return null

  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(dueTime)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null

  const date = new Date(2000, 0, 1, hours, minutes)
  return locales
    ? new Intl.DateTimeFormat(locales, {
        hour: timeFormat === '12h' ? 'numeric' : '2-digit',
        minute: '2-digit',
        hour12: timeFormat === '12h',
      }).format(date)
    : formatTime(date, timeFormat)
}

export function projectCalendarTasks(tasks: TaskWithList[], timeFormat: TimeFormat = '12h'): CalendarTask[] {
  return tasks
    .filter(
      (task): task is TaskWithList & { due_date: string } =>
        !task.completed &&
        task.due_date !== null &&
        isDateKey(task.due_date),
    )
    .map((task) => ({
      task,
      dateKey: task.due_date,
      dueTimeLabel: formatTaskDueTime(task.due_time, undefined, timeFormat),
    }))
    .sort((left, right) => {
      const dateOrder = left.dateKey.localeCompare(right.dateKey)
      if (dateOrder !== 0) return dateOrder

      const leftTime = left.task.due_time ?? '24:00:00'
      const rightTime = right.task.due_time ?? '24:00:00'
      const timeOrder = leftTime.localeCompare(rightTime)
      if (timeOrder !== 0) return timeOrder

      return (
        left.task.position - right.task.position ||
        left.task.title.localeCompare(right.task.title)
      )
    })
}

export function getCalendarTasksForDate(
  tasks: CalendarTask[],
  dateKey: string,
) {
  return tasks.filter((task) => task.dateKey === dateKey)
}

/** End is exclusive, matching FullCalendar's visible-range convention. */
export function getCalendarTasksForRange(
  tasks: CalendarTask[],
  startDateKey: string,
  endDateKey: string,
) {
  return tasks.filter(
    (task) => task.dateKey >= startDateKey && task.dateKey < endDateKey,
  )
}
