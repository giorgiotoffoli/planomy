'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Clock3, FolderOpen, Home, MapPin, NotebookPen, Palette, Repeat, Tag, Type } from 'lucide-react'
import type { CalendarEventWithList, Category, List, RecurrenceRule } from '@/types'
import type { ListColor } from '@/lib/list-colors'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ListEmoji } from '@/components/lists/list-emoji'
import { addCalendarDays, isDateKey, localDateKey } from '@/lib/today'
import { zonedDateTimeToInstant } from '@/lib/recurrence'
import { resolveInheritedColor } from '@/lib/list-colors'
import ItemColorPicker from '@/components/items/item-color-picker'

export type EventFormSeed = {
  startsAt?: Date
  endsAt?: Date | null
}

export type EventFormValues = {
  title: string
  description: string
  location: string
  listId: string | null
  categoryId: string | null
  color: ListColor | null
  showInUpcoming: boolean
  allDay: boolean
  startsAt: string | null
  endsAt: string | null
  startsOn: string | null
  endsOn: string | null
  timeZone: string
  recurrenceRule: RecurrenceRule | null
}

/** Browser-local defaults used when another form hands its draft to Events. */
export type EventFormInitialValues = {
  title?: string
  description?: string
  location?: string
  listId?: string | null
  categoryId?: string | null
  color?: ListColor | null
  showInUpcoming?: boolean
  allDay?: boolean
  startsAt?: string
  endsAt?: string
  startsOn?: string
  endsOn?: string
  timeZone?: string
  recurrenceRule?: RecurrenceRule | null
}

const weekdays = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
]

const commonTimeZones = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
]

function localParts(instant: string | undefined, timeZone: string) {
  if (!instant) return null
  const date = new Date(instant)
  if (!Number.isFinite(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

function weekdayForDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return ((new Date(year, month - 1, day, 12).getDay() + 6) % 7) + 1
}

function initialValues(
  event: CalendarEventWithList | undefined,
  seed: EventFormSeed | undefined,
  initialListId: string | null,
  overrides: EventFormInitialValues | undefined,
) {
  const timeZone = event?.time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  if (event?.all_day) {
    const base = {
      timeZone,
      title: event.title,
      description: event.description ?? '',
      location: event.location ?? '',
      listId: event.list_id ?? initialListId,
      categoryId: event.category_id ?? null,
      color: event.color ?? null,
      showInUpcoming: event.show_in_upcoming ?? true,
      allDay: true,
      startsOn: event.starts_on ?? localDateKey(),
      endsOn: event.ends_on ?? addCalendarDays(event.starts_on ?? localDateKey(), 1),
      startsAt: null,
      endsAt: null,
      recurrence: event.recurrence_rule,
    }
    return { ...base, ...overrides, recurrence: overrides?.recurrenceRule ?? base.recurrence }
  }

  const fallbackStart = seed?.startsAt ?? new Date()
  const fallbackEnd = seed?.endsAt ?? null
  const startParts = localParts(event?.starts_at ?? undefined, timeZone) ?? {
    date: localDateKey(fallbackStart),
    time: fallbackStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
  }
  const endParts = localParts(event?.ends_at ?? undefined, timeZone) ?? (fallbackEnd ? {
    date: localDateKey(fallbackEnd),
    time: fallbackEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
  } : null)
  const base = {
    timeZone,
    title: event?.title ?? '',
    description: event?.description ?? '',
    location: event?.location ?? '',
    listId: event?.list_id ?? initialListId,
    categoryId: event?.category_id ?? null,
    color: event?.color ?? null,
    showInUpcoming: event?.show_in_upcoming ?? true,
    allDay: false,
    startsOn: startParts.date,
    endsOn: endParts?.date ?? startParts.date,
    startsAt: startParts.time,
    endsAt: endParts?.time ?? '',
    recurrence: event?.recurrence_rule ?? null,
  }
  return { ...base, ...overrides, recurrence: overrides?.recurrenceRule ?? base.recurrence }
}

function toInstant(date: string, time: string, timeZone: string) {
  return zonedDateTimeToInstant(date, time, timeZone)
}

export default function EventForm({
  event,
  seed,
  initialListId = null,
  initialValues: initialDraft,
  lists,
  categories,
  disabled = false,
  error,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  event?: CalendarEventWithList
  seed?: EventFormSeed
  initialListId?: string | null
  initialValues?: EventFormInitialValues
  lists: List[]
  categories?: Category[]
  disabled?: boolean
  error?: string | null
  submitLabel: string
  onCancel: () => void
  onSubmit: (values: EventFormValues) => void | Promise<void>
}) {
  const initial = useMemo(() => initialValues(event, seed, initialListId, initialDraft), [event, initialDraft, initialListId, seed])
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [location, setLocation] = useState(initial.location)
  const [listId, setListId] = useState(initial.listId)
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? null)
  const [color, setColor] = useState<ListColor | null>(initial.color ?? null)
  const [showInUpcoming, setShowInUpcoming] = useState(initial.showInUpcoming ?? true)
  const [allDay, setAllDay] = useState(initial.allDay)
  const [startsOn, setStartsOn] = useState(initial.startsOn)
  const [endsOn, setEndsOn] = useState(initial.endsOn)
  const [startsAt, setStartsAt] = useState(initial.startsAt ?? '')
  const [endsAt, setEndsAt] = useState(initial.endsAt ?? '')
  const [timeZone, setTimeZone] = useState(initial.timeZone)
  const [frequency, setFrequency] = useState<RecurrenceRule['frequency'] | 'never'>(initial.recurrence?.frequency ?? 'never')
  const [interval, setInterval] = useState(String(initial.recurrence?.interval ?? 1))
  const [selectedWeekdays, setSelectedWeekdays] = useState(initial.recurrence?.weekdays ?? [weekdayForDate(initial.startsOn)])
  const [endDate, setEndDate] = useState(initial.recurrence?.endDate ?? '')
  const [monthlyPosition, setMonthlyPosition] = useState(String(initial.recurrence?.monthlyPosition ?? 'date'))
  const [monthlyWeekday, setMonthlyWeekday] = useState(String(initial.recurrence?.monthlyWeekday ?? weekdayForDate(initial.startsOn)))
  const [localError, setLocalError] = useState<string | null>(null)
  const availableCategories = useMemo(
    () => (categories ?? [])
      .filter((category) => category.list_id === listId)
      .sort((a, b) => a.position - b.position),
    [categories, listId],
  )
  const inheritedColor = useMemo(() => {
    const category = availableCategories.find((candidate) => candidate.id === categoryId)
    const list = lists.find((candidate) => candidate.id === listId)
    return resolveInheritedColor(category?.color, list?.color)
  }, [availableCategories, categoryId, listId, lists])

  function changeList(value: string) {
    const nextListId = value === '__none__' ? null : value
    setListId(nextListId)
    if (nextListId !== listId) setCategoryId(null)
  }

  function toggleWeekday(day: number) {
    setSelectedWeekdays((current) => current.includes(day)
      ? current.filter((value) => value !== day)
      : [...current, day].sort())
  }

  function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (disabled) return
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setLocalError('Add an event title.')
      return
    }
    if (!isDateKey(startsOn)) {
      setLocalError('Choose a valid start date.')
      return
    }

    const recurrenceStartDate = event?.occurrence_key
      ? initial.recurrence?.startDate ?? startsOn
      : startsOn
    const recurrenceRule = frequency === 'never'
      ? null
      : {
          frequency,
          startDate: recurrenceStartDate,
          interval: Math.max(1, Number(interval) || 1),
          weekdays: frequency === 'weekly' || frequency === 'custom' ? selectedWeekdays : undefined,
          endDate: endDate || null,
          count: initial.recurrence?.count ?? null,
          ...(frequency === 'monthly' && monthlyPosition !== 'date'
            ? { monthlyPosition: Number(monthlyPosition) || 1, monthlyWeekday: Number(monthlyWeekday) || weekdayForDate(startsOn) }
            : {}),
        } satisfies RecurrenceRule

    let next: EventFormValues
    if (allDay) {
      if (!isDateKey(endsOn) || endsOn <= startsOn) {
        setLocalError('All-day events need an end date after the start date.')
        return
      }
      next = {
        title: trimmedTitle,
        description,
        location,
        listId,
        categoryId: listId ? categoryId : null,
        color,
        showInUpcoming,
        allDay: true,
        startsAt: null,
        endsAt: null,
        startsOn,
        endsOn,
        timeZone,
        recurrenceRule,
      }
    } else {
      const start = toInstant(startsOn, startsAt, timeZone)
      const end = endsAt ? toInstant(endsOn || startsOn, endsAt, timeZone) : null
      if (!start || (endsAt && !end) || (end && Date.parse(end) <= Date.parse(start))) {
        setLocalError('Choose a valid time range, or leave the end time empty for a point event.')
        return
      }
      next = {
        title: trimmedTitle,
        description,
        location,
        listId,
        categoryId: listId ? categoryId : null,
        color,
        showInUpcoming,
        allDay: false,
        startsAt: start,
        endsAt: end,
        startsOn: null,
        endsOn: null,
        timeZone,
        recurrenceRule,
      }
    }
    setLocalError(null)
    void onSubmit(next)
  }

  return (
    <form onSubmit={submit} aria-busy={disabled} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="event-title" className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Type className="size-4" aria-hidden="true" />Title</label>
            <Input id="event-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What’s happening?" required disabled={disabled} className="h-12 border-0 bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0 sm:text-2xl" />
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><CalendarDays className="size-4" aria-hidden="true" />When</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input type="date" value={startsOn} onChange={(e) => {
                const nextStartsOn = e.target.value
                setStartsOn(nextStartsOn)
                if (allDay && isDateKey(nextStartsOn) && (!isDateKey(endsOn) || endsOn <= nextStartsOn)) {
                  setEndsOn(addCalendarDays(nextStartsOn, 1))
                }
                if (!event?.occurrence_key && frequency !== 'never' && isDateKey(nextStartsOn)) setSelectedWeekdays([weekdayForDate(nextStartsOn)])
              }} disabled={disabled} aria-label="Event start date" />
              {allDay ? <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} disabled={disabled} aria-label="Event end date" /> : <Input type="time" step={60} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} disabled={disabled} aria-label="Event start time" />}
              {!allDay ? <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} disabled={disabled} aria-label="Event end date" /> : null}
              {!allDay ? <Input type="time" step={60} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} disabled={disabled} aria-label="Optional event end time" /> : null}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm"><Checkbox checked={allDay} onCheckedChange={(checked) => {
              const nextAllDay = checked === true
              setAllDay(nextAllDay)
              if (nextAllDay && isDateKey(startsOn) && (!isDateKey(endsOn) || endsOn <= startsOn)) {
                setEndsOn(addCalendarDays(startsOn, 1))
              }
            }} disabled={disabled} /><span>All day</span></label>
            {!allDay ? <div className="mt-3 flex items-center gap-2"><Clock3 className="size-4 text-muted-foreground" aria-hidden="true" /><Select value={timeZone} onValueChange={setTimeZone} disabled={disabled}><SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger><SelectContent>{Array.from(new Set([timeZone, ...commonTimeZones])).map((zone) => <SelectItem key={zone} value={zone}>{zone.replaceAll('_', ' ')}</SelectItem>)}</SelectContent></Select></div> : null}
          </div>

          <div className="rounded-xl border border-border/60 p-3">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><Repeat className="size-4" aria-hidden="true" />Repeat</div>
              <label htmlFor="event-repeat-frequency" className="mb-1.5 block text-xs font-medium text-muted-foreground">Frequency</label>
              <Select value={frequency} onValueChange={(value) => setFrequency(value as typeof frequency)} disabled={disabled}>
                <SelectTrigger id="event-repeat-frequency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="daily">Every day</SelectItem>
                  <SelectItem value="weekday">Every weekday</SelectItem>
                  <SelectItem value="weekly">Every week</SelectItem>
                  <SelectItem value="monthly">Every month</SelectItem>
                  <SelectItem value="yearly">Every year</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {frequency !== 'never' ? (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label htmlFor="event-repeat-interval" className="space-y-1.5">
                      <span className="block text-xs font-medium text-muted-foreground">Repeat every</span>
                      <Input id="event-repeat-interval" type="number" min={1} step={1} value={interval} onChange={(e) => setInterval(e.target.value)} aria-label="Repeat interval" disabled={disabled} />
                    </label>
                    <label htmlFor="event-repeat-end-date" className="space-y-1.5">
                      <span className="block text-xs font-medium text-muted-foreground">Ends</span>
                      <Input id="event-repeat-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="Repeat end date, optional" disabled={disabled} />
                    </label>
                  </div>
                  {frequency === 'weekly' || frequency === 'custom' ? (
                    <fieldset className="space-y-1.5">
                      <legend className="text-xs font-medium text-muted-foreground">Repeat on</legend>
                      <div className="flex flex-wrap gap-1.5">
                        {weekdays.map((day) => <Button key={day.value} type="button" variant={selectedWeekdays.includes(day.value) ? 'default' : 'outline'} size="sm" className="h-8 px-2.5" onClick={() => toggleWeekday(day.value)} disabled={disabled}>{day.label}</Button>)}
                      </div>
                    </fieldset>
                  ) : null}
                  {frequency === 'monthly' ? (
                    <div className={`grid gap-2 ${monthlyPosition === 'date' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      <div className="space-y-1.5">
                        <label htmlFor="event-monthly-pattern" className="block text-xs font-medium text-muted-foreground">Pattern</label>
                        <Select value={monthlyPosition} onValueChange={setMonthlyPosition} disabled={disabled}>
                          <SelectTrigger id="event-monthly-pattern" aria-label="Monthly pattern"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="date">Same date each month</SelectItem><SelectItem value="1">First</SelectItem><SelectItem value="2">Second</SelectItem><SelectItem value="3">Third</SelectItem><SelectItem value="4">Fourth</SelectItem><SelectItem value="5">Fifth</SelectItem><SelectItem value="-1">Last</SelectItem></SelectContent>
                        </Select>
                      </div>
                      {monthlyPosition !== 'date' ? (
                        <div className="space-y-1.5">
                          <label htmlFor="event-monthly-weekday" className="block text-xs font-medium text-muted-foreground">Weekday</label>
                          <Select value={monthlyWeekday} onValueChange={setMonthlyWeekday} disabled={disabled}>
                            <SelectTrigger id="event-monthly-weekday" aria-label="Monthly weekday"><SelectValue /></SelectTrigger>
                            <SelectContent>{weekdays.map((day) => <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><label htmlFor="event-list" className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><FolderOpen className="size-4" aria-hidden="true" />List</label><Select value={listId ?? '__none__'} onValueChange={changeList} disabled={disabled}><SelectTrigger id="event-list"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Unsorted</SelectItem>{lists.map((list) => <SelectItem key={list.id} value={list.id}><ListEmoji emoji={list.emoji} />{list.title}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><label htmlFor="event-category" className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Tag className="size-4" aria-hidden="true" />Category</label><Select value={categoryId ?? '__none__'} onValueChange={(value) => setCategoryId(value === '__none__' ? null : value)} disabled={disabled || !listId}><SelectTrigger id="event-category"><SelectValue placeholder={listId ? 'Uncategorized' : 'Choose a list first'} /></SelectTrigger><SelectContent><SelectItem value="__none__">Uncategorized</SelectItem>{availableCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.title}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Palette className="size-4" aria-hidden="true" />Color</span><ItemColorPicker value={color} listColor={inheritedColor} automaticLabel="Automatic" disabled={disabled} onChange={setColor} /></div>
            <div className="space-y-2 sm:col-span-2"><label htmlFor="event-location" className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><MapPin className="size-4" aria-hidden="true" />Location</label><Input id="event-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add a location" disabled={disabled} /></div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3"><label className="flex items-start gap-3 text-sm"><Checkbox checked={showInUpcoming} onCheckedChange={(checked) => setShowInUpcoming(checked === true)} disabled={disabled} /><span className="min-w-0"><span className="flex items-center gap-2 font-medium"><Home className="size-4 text-muted-foreground" aria-hidden="true" />Show in Home Upcoming</span><span className="mt-0.5 block text-xs text-muted-foreground">Keep this event eligible for Home&apos;s Upcoming section. It will remain on the Calendar.</span></span></label></div>
          <div className="space-y-2"><label htmlFor="event-description" className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><NotebookPen className="size-4" aria-hidden="true" />Description</label><Textarea id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details…" className="min-h-20 resize-none" disabled={disabled} /></div>
          {(localError || error) ? <p role="alert" className="text-sm text-destructive">{localError || error}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 pt-4"><Button type="button" variant="ghost" disabled={disabled} onClick={onCancel}>Cancel</Button><Button type="submit" disabled={disabled}>{disabled ? 'Saving…' : submitLabel}</Button></div>
    </form>
  )
}
