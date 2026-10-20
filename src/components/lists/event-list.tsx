'use client'

import { useEffect, useState } from 'react'
import { CalendarFold, ChevronDown, Eye, EyeOff, MapPin, Plus, Repeat } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { CalendarEventWithList, Category, List } from '@/types'
import EventDialog from '@/components/events/event-dialog'
import { setEventListVisibility } from '@/components/events/actions'
import { notifyEventsChanged } from '@/components/events/mutations'
import { recurrenceLabel } from '@/lib/recurrence'
import { eventColorStyle } from '@/lib/list-colors'

const OPEN_STORAGE_PREFIX = 'planomy:list-events-open:'

type EventListProps = {
  events: CalendarEventWithList[]
  lists: List[]
  categories: Category[]
  listId: string
}

function eventDateLabel(event: CalendarEventWithList) {
  if (event.all_day) return `${event.starts_on} · All day`
  if (event.starts_at) {
    return new Date(event.starts_at).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }
  return 'Event'
}

export default function EventList({ events, lists, categories, listId }: EventListProps) {
  const [editing, setEditing] = useState<CalendarEventWithList | null>(null)
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(true)
  const [showHidden, setShowHidden] = useState(false)
  const [savingEventId, setSavingEventId] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShowHidden(false)
      try {
        const saved = window.localStorage.getItem(`${OPEN_STORAGE_PREFIX}${listId}`)
        setOpen(saved === null ? true : saved === 'true')
      } catch {
        setOpen(true)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [listId])

  const visibleEvents = events.filter((event) => event.show_in_list !== false)
  const hiddenEvents = events.filter((event) => event.show_in_list === false)
  const displayedEvents = showHidden
    ? [...visibleEvents, ...hiddenEvents]
    : visibleEvents

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    try {
      window.localStorage.setItem(`${OPEN_STORAGE_PREFIX}${listId}`, String(nextOpen))
    } catch {
      // The widget still works when browser storage is unavailable.
    }
  }

  async function handleVisibilityChange(event: CalendarEventWithList, visible: boolean) {
    if (savingEventId) return

    setSavingEventId(event.id)
    notifyEventsChanged({
      eventId: event.id,
      showInList: visible,
      phase: 'optimistic',
    })

    try {
      await setEventListVisibility(event.id, visible)
      notifyEventsChanged()
      toast.success(visible ? 'Event shown in Lists' : 'Event hidden from Lists')
    } catch (cause) {
      notifyEventsChanged({
        eventId: event.id,
        showInList: !visible,
        phase: 'rollback',
      })
      toast.error(cause instanceof Error ? cause.message : 'Event visibility could not be saved.')
    } finally {
      setSavingEventId(null)
    }
  }

  return (
    <section
      className="rounded-2xl border border-indigo-200/70 bg-indigo-50/35 p-3 dark:border-indigo-400/20 dark:bg-indigo-500/5 sm:p-4"
      aria-labelledby="list-events-heading"
    >
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="group flex min-w-0 items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label={`${open ? 'Collapse' : 'Expand'} Events`}
            >
              <CalendarFold className="size-5 shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
              <h2 id="list-events-heading" className="font-heading text-lg font-semibold">Events</h2>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
                {visibleEvents.length}
              </span>
              <ChevronDown
                className={`size-4 shrink-0 text-indigo-500 transition-transform duration-200 dark:text-indigo-300 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
          </CollapsibleTrigger>

          <div className="flex shrink-0 items-center gap-1">
            {hiddenEvents.length ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-pressed={showHidden}
                title={showHidden ? 'Hide hidden events' : 'Show hidden events'}
                onClick={() => setShowHidden((current) => !current)}
                className="px-2 text-xs text-muted-foreground"
              >
                {showHidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                <span className="hidden sm:inline">{showHidden ? 'Hide hidden' : `${hiddenEvents.length} hidden`}</span>
                <span className="sr-only">{showHidden ? 'Hide hidden events' : 'Show hidden events'}</span>
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" />
              <span className="hidden sm:inline">Add event</span>
              <span className="sr-only sm:hidden">Add event</span>
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          {displayedEvents.length ? (
            <ul className="divide-y divide-indigo-200/60 dark:divide-indigo-300/10">
              {displayedEvents.map((event) => {
                const hidden = event.show_in_list === false
                const saving = savingEventId === event.id

                return (
                  <li key={event.id} className={`group flex items-start gap-2 ${hidden ? 'opacity-60' : ''}`}>
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-start gap-3 px-2 py-3 text-left hover:bg-indigo-100/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 dark:hover:bg-indigo-500/10"
                      onClick={() => setEditing(event)}
                    >
                      <span
                        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border bg-(--list-color)/10 text-(--list-color)"
                        style={eventColorStyle(event.color, event.category?.color, event.list?.color)}
                      >
                        <CalendarFold className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{event.title}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          {eventDateLabel(event)}
                          {event.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" aria-hidden="true" />
                              {event.location}
                            </span>
                          ) : null}
                          {event.recurrence_rule ? (
                            <span className="inline-flex items-center gap-1">
                              <Repeat className="size-3" aria-hidden="true" />
                              {recurrenceLabel(event.recurrence_rule)}
                            </span>
                          ) : null}
                          {hidden ? <span className="text-indigo-700 dark:text-indigo-200">Hidden from Lists</span> : null}
                        </span>
                      </span>
                    </button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={saving}
                      title={hidden ? 'Show event in Lists' : 'Hide event from Lists'}
                      aria-label={hidden ? `Show ${event.title} in Lists` : `Hide ${event.title} from Lists`}
                      onClick={() => void handleVisibilityChange(event, hidden)}
                      className="mt-2 shrink-0 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                    >
                      {hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : events.length ? (
            <div className="rounded-xl border border-dashed border-indigo-200/80 px-4 py-5 text-center text-sm text-muted-foreground dark:border-indigo-300/15">
              All events are hidden from this widget.
              <Button type="button" variant="link" size="sm" onClick={() => setShowHidden(true)}>
                Show hidden events
              </Button>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-indigo-200/80 px-4 py-5 text-center text-sm text-muted-foreground dark:border-indigo-300/15">
              No events in this List yet.
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>

      {creating ? <EventDialog lists={lists} categories={categories} initialListId={listId} open onOpenChange={(nextOpen) => { if (!nextOpen) setCreating(false) }} /> : null}
      {editing ? <EventDialog lists={lists} categories={categories} event={editing} open onOpenChange={(nextOpen) => { if (!nextOpen) setEditing(null) }} /> : null}
    </section>
  )
}
