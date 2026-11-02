import type { CalendarEventWithList } from '../../../../src/types.ts'

/** List views show persisted series, rather than duplicate expanded occurrences. */
export function getListEvents(events: readonly CalendarEventWithList[], listId: string | null) {
  return events
    .filter((event) => event.list_id === listId)
    .slice()
    .sort((a, b) => (a.starts_on ?? a.starts_at ?? '').localeCompare(b.starts_on ?? b.starts_at ?? ''))
}
