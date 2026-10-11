import { format } from 'date-fns'
import type { TaskWithList } from '@/types'
import { localDateKey } from './today.ts'

export const MAX_FOCUS_TASKS = 3
export const DUE_SOON_DAYS = 7

export type HomeBuckets = {
  focus: TaskWithList[]
  dueSoon: TaskWithList[]
  tasks: TaskWithList[]
  stashed: TaskWithList[]
}

function dateKeyToUtcDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function addCalendarDays(dateKey: string, days: number) {
  const date = dateKeyToUtcDate(dateKey)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function calendarDaysBetween(startDateKey: string, endDateKey: string) {
  const millisecondsPerDay = 86_400_000
  return Math.round(
    (dateKeyToUtcDate(endDateKey).getTime() -
      dateKeyToUtcDate(startDateKey).getTime()) /
      millisecondsPerDay,
  )
}

export function isDueSoon(task: TaskWithList, day = localDateKey()) {
  if (!task.due_date) return false

  return task.due_date <= addCalendarDays(day, DUE_SOON_DAYS)
}

function stableTaskOrder(a: TaskWithList, b: TaskWithList) {
  const positionOrder = a.position - b.position
  if (positionOrder !== 0) return positionOrder

  const createdOrder = (a.created_at ?? '').localeCompare(b.created_at ?? '')
  if (createdOrder !== 0) return createdOrder

  return a.id.localeCompare(b.id)
}

function dueDateOrder(a: TaskWithList, b: TaskWithList) {
  const dateOrder = (a.due_date ?? '').localeCompare(b.due_date ?? '')
  if (dateOrder !== 0) return dateOrder

  const timeOrder = (a.due_time ?? '99:99:99').localeCompare(
    b.due_time ?? '99:99:99',
  )
  if (timeOrder !== 0) return timeOrder

  return stableTaskOrder(a, b)
}

export function getHomeBuckets(
  input: TaskWithList[],
  day = localDateKey(),
): HomeBuckets {
  const focus: TaskWithList[] = []
  const dueSoon: TaskWithList[] = []
  const tasks: TaskWithList[] = []
  const stashed: TaskWithList[] = []

  for (const task of input) {
    if (task.completed) continue

    if (task.stashed) {
      stashed.push(task)
    } else if (task.focused) {
      focus.push(task)
    } else if (isDueSoon(task, day)) {
      dueSoon.push(task)
    } else {
      tasks.push(task)
    }
  }

  focus.sort(stableTaskOrder)
  dueSoon.sort(dueDateOrder)
  tasks.sort(stableTaskOrder)
  stashed.sort(stableTaskOrder)

  return { focus, dueSoon, tasks, stashed }
}

export function getDeadlineLabel(
  dueDate: string | null,
  day = localDateKey(),
) {
  if (!dueDate) return null

  const difference = calendarDaysBetween(day, dueDate)

  if (difference < 0) {
    const overdueDays = Math.abs(difference)
    return `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`
  }

  if (difference === 0) return 'Today'
  if (difference === 1) return 'Tomorrow'

  return format(new Date(`${dueDate}T12:00:00`), 'EEEE')
}

export function getDueTimeLabel(dueTime: string | null) {
  if (!dueTime) return null

  const [hours, minutes] = dueTime.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes))
}
