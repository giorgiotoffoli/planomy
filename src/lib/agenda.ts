import { isDateKey, localDateKey } from './my-day.ts'

export const MINUTE = 60_000
export const SLOT_MINUTES = 15
export const PIXELS_PER_MINUTE = 1.6

export function shiftDay(day: string, delta: number) {
  if (!isDateKey(day)) throw new Error('Invalid calendar date')
  const date = new Date(`${day}T12:00:00`)
  date.setDate(date.getDate() + delta)
  return localDateKey(date)
}

/** Elapsed instants, not a hard-coded 24 hours: DST days can be shorter or longer. */
export function dayBounds(day: string) {
  if (!isDateKey(day)) throw new Error('Invalid calendar date')
  const start = new Date(`${day}T00:00:00`).getTime()
  const end = new Date(`${shiftDay(day, 1)}T00:00:00`).getTime()
  return { start, end, minutes: (end - start) / MINUTE }
}

/** Return both occurrences during a fall-back, and none for a spring-forward gap. */
export function localTimeCandidates(day: string, time: string) {
  if (!isDateKey(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return []
  const { start, end } = dayBounds(day)
  const result: number[] = []
  for (let instant = start; instant < end; instant += MINUTE) {
    if (timeInput(instant) === time) result.push(instant)
  }
  return result
}

export function timeInput(instant: number) {
  const date = new Date(instant)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function timeLabel(instant: number) {
  return new Date(instant).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
}

export function snapInstant(day: string, offsetMinutes: number) {
  const { start, minutes } = dayBounds(day)
  return start + Math.max(0, Math.min(minutes - SLOT_MINUTES, Math.round(offsetMinutes / SLOT_MINUTES) * SLOT_MINUTES)) * MINUTE
}

export function validateInterval(startsAt: string, endsAt: string) {
  // Require an explicit offset so the server never interprets a browser wall time.
  const zoned = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/
  const start = Date.parse(startsAt), end = Date.parse(endsAt)
  if (!zoned.test(startsAt) || !zoned.test(endsAt) || !Number.isFinite(start) || !Number.isFinite(end) || end - start < SLOT_MINUTES * MINUTE) {
    throw new Error('Choose valid times at least 15 minutes apart.')
  }
  return { start, end }
}

export type Interval = { task_id: string; starts_at: string; ends_at: string }

/** Clip for display only. Connected overlapping groups share equal-width columns. */
export function layoutBlocks<T extends Interval>(blocks: T[], day: string) {
  const { start, end } = dayBounds(day)
  const visible = blocks.map(block => ({ block, start: Math.max(start, Date.parse(block.starts_at)), end: Math.min(end, Date.parse(block.ends_at)), column: 0, columns: 1 }))
    .filter(block => block.start < block.end).sort((a, b) => a.start - b.start || a.end - b.end)
  let group: typeof visible = [], columnEnds: number[] = [], groupEnd = 0
  const finish = () => { for (const item of group) item.columns = columnEnds.length }
  for (const item of visible) {
    if (item.start >= groupEnd) { finish(); group = []; columnEnds = [] }
    let column = columnEnds.findIndex(end => end <= item.start)
    if (column < 0) column = columnEnds.length
    item.column = column
    columnEnds[column] = item.end
    groupEnd = Math.max(group.length ? groupEnd : 0, item.end)
    group.push(item)
  }
  finish()
  return visible
}

/** A schedule target always wins; reordering is confined to its originating list. */
export function dragIntent(source: { kind?: string; scope?: string }, target: { kind?: string; scope?: string } | undefined) {
  if (!target) return 'none'
  if (target.kind === 'agenda-slot' && ['task', 'agenda-block', 'agenda-resize'].includes(source.kind ?? '')) return 'schedule'
  if (source.kind === 'task' && target.kind === 'task' && source.scope && source.scope === target.scope) return 'reorder'
  return 'none'
}
