import type {
  AgendaBlock,
  CalendarEventWithList,
  Category,
  List,
  TaskWithList,
} from '@/types'
import type { CalendarRangeInput } from '@/lib/events'

export type CalendarClientSnapshot = {
  dueTasks: TaskWithList[]
  scheduledTasks: AgendaBlock[]
  events: CalendarEventWithList[]
  lists: List[]
  categories: Category[]
}

// Keep this cache memory-only. Calendar content is decrypted client-side and
// should not be copied into persistent browser storage.
const snapshots = new WeakMap<Uint8Array, Map<string, CalendarClientSnapshot>>()

function rangeKey(range: CalendarRangeInput) {
  return [range.startsAt, range.endsAt, range.startsOn, range.endsOn].join('|')
}

export function readCalendarSnapshot(
  masterKey: Uint8Array,
  range: CalendarRangeInput,
) {
  return snapshots.get(masterKey)?.get(rangeKey(range)) ?? null
}

export function writeCalendarSnapshot(
  masterKey: Uint8Array,
  range: CalendarRangeInput,
  snapshot: CalendarClientSnapshot,
) {
  let userSnapshots = snapshots.get(masterKey)
  if (!userSnapshots) {
    userSnapshots = new Map()
    snapshots.set(masterKey, userSnapshots)
  }
  userSnapshots.set(rangeKey(range), snapshot)
}
