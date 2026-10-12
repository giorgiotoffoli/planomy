import type { TaskWithList } from '@/types'
import {
  addCalendarDays,
  calendarDaysBetween,
  calendarWeekEndKey,
  localDateKey,
} from './today.ts'

export const deadlineBucketOrder = [
  'pastDue',
  'today',
  'tomorrow',
  'thisWeek',
  'later',
] as const

export type DeadlineBucket = (typeof deadlineBucketOrder)[number]

export type DeadlineBuckets = Record<DeadlineBucket, TaskWithList[]>

function stableTaskOrder(left: TaskWithList, right: TaskWithList) {
  const positionOrder = left.position - right.position
  if (positionOrder !== 0) return positionOrder

  const createdOrder = (left.created_at ?? '').localeCompare(
    right.created_at ?? '',
  )
  if (createdOrder !== 0) return createdOrder

  return left.id.localeCompare(right.id)
}

function deadlineOrder(left: TaskWithList, right: TaskWithList) {
  const dateOrder = (left.due_date ?? '').localeCompare(right.due_date ?? '')
  if (dateOrder !== 0) return dateOrder

  const leftTime = left.due_time ?? '99:99:99'
  const rightTime = right.due_time ?? '99:99:99'
  const timeOrder = leftTime.localeCompare(rightTime)
  if (timeOrder !== 0) return timeOrder

  return stableTaskOrder(left, right)
}

function emptyBuckets(): DeadlineBuckets {
  return {
    pastDue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
  }
}

/**
 * Groups active, dated tasks by local calendar date. Date-only values are
 * compared as keys so a timezone offset can never move a task between days.
 */
export function partitionDeadlineTasks(
  tasks: TaskWithList[],
  localToday = localDateKey(),
): DeadlineBuckets {
  const buckets = emptyBuckets()
  const tomorrow = addCalendarDays(localToday, 1)
  const weekEnd = calendarWeekEndKey(localToday)

  for (const task of tasks) {
    if (task.completed || !task.due_date) continue

    let bucket: DeadlineBucket
    if (task.due_date < localToday) {
      bucket = 'pastDue'
    } else if (task.due_date === localToday) {
      bucket = 'today'
    } else if (task.due_date === tomorrow) {
      bucket = 'tomorrow'
    } else if (task.due_date <= weekEnd) {
      bucket = 'thisWeek'
    } else {
      bucket = 'later'
    }

    buckets[bucket].push(task)
  }

  for (const bucket of deadlineBucketOrder) {
    buckets[bucket].sort(deadlineOrder)
  }

  return buckets
}

export function deadlineTaskCount(buckets: DeadlineBuckets) {
  return deadlineBucketOrder.reduce(
    (count, bucket) => count + buckets[bucket].length,
    0,
  )
}

export function getDeadlineDateLabel(
  task: TaskWithList,
  bucket: DeadlineBucket,
  localToday = localDateKey(),
) {
  if (!task.due_date) return null

  if (bucket === 'pastDue') {
    const daysOverdue = Math.abs(calendarDaysBetween(task.due_date, localToday))
    return `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`
  }

  if (bucket === 'today' || bucket === 'tomorrow') return null

  const date = new Date(`${task.due_date}T12:00:00`)
  return new Intl.DateTimeFormat(undefined, {
    month: bucket === 'thisWeek' ? undefined : 'short',
    day: bucket === 'thisWeek' ? undefined : 'numeric',
    weekday: bucket === 'thisWeek' ? 'long' : undefined,
  }).format(date)
}
