'use client'

import { useState } from 'react'
import { CalendarFold, MapPin, Plus, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CalendarEventWithList, Category, List } from '@/types'
import EventDialog from '@/components/events/event-dialog'
import { recurrenceLabel } from '@/lib/recurrence'
import { eventColorStyle } from '@/lib/list-colors'

export default function EventList({ events, lists, categories, listId }: { events: CalendarEventWithList[]; lists: List[]; categories: Category[]; listId: string }) {
  const [editing, setEditing] = useState<CalendarEventWithList | null>(null)
  const [creating, setCreating] = useState(false)
  return (
    <section className="rounded-2xl border border-indigo-200/70 bg-indigo-50/35 p-3 dark:border-indigo-400/20 dark:bg-indigo-500/5 sm:p-4" aria-labelledby="list-events-heading">
      <div className="mb-2 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><CalendarFold className="size-5 text-indigo-600 dark:text-indigo-300" /><h2 id="list-events-heading" className="font-heading text-lg font-semibold">Events</h2><span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">{events.length}</span></div><Button type="button" size="sm" variant="outline" onClick={() => setCreating(true)}><Plus /> Add event</Button></div>
      {events.length ? <ul className="divide-y divide-indigo-200/60 dark:divide-indigo-300/10">{events.map((event) => <li key={event.id}><button type="button" className="flex w-full items-start gap-3 px-2 py-3 text-left hover:bg-indigo-100/40 dark:hover:bg-indigo-500/10" onClick={() => setEditing(event)}><span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border bg-(--list-color)/10 text-(--list-color)" style={eventColorStyle(event.color, event.category?.color, event.list?.color)}><CalendarFold className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{event.title}</span><span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">{event.all_day ? `${event.starts_on} · All day` : event.starts_at ? new Date(event.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Event'}{event.location ? <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{event.location}</span> : null}{event.recurrence_rule ? <span className="inline-flex items-center gap-1"><Repeat className="size-3" />{recurrenceLabel(event.recurrence_rule)}</span> : null}</span></span></button></li>)}</ul> : <p className="rounded-xl border border-dashed border-indigo-200/80 px-4 py-5 text-center text-sm text-muted-foreground dark:border-indigo-300/15">No events in this List yet.</p>}
      {creating ? <EventDialog lists={lists} categories={categories} initialListId={listId} open onOpenChange={(open) => { if (!open) setCreating(false) }} /> : null}
      {editing ? <EventDialog lists={lists} categories={categories} event={editing} open onOpenChange={(open) => { if (!open) setEditing(null) }} /> : null}
    </section>
  )
}
