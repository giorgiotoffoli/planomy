'use client'

import { useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { encryptString } from '@/lib/crypto/e2ee'
import type { CalendarEventWithList, Category, List } from '@/types'
import { RecurrenceScopeDialog } from '@/components/recurrence/recurrence-scope-dialog'
import type { RecurrenceScope } from '@/lib/recurrence-scope'
import { recurrenceScopeOptionsForWeekday } from '@/lib/recurrence-scope'
import { normalizeRecurrenceRule, recurrenceWeekdayName } from '@/lib/recurrence'
import { localDateAndTime } from '@/lib/events'
import type { EventVisualMutation } from '@/lib/live-mutations'
import { createEvent, deleteEvent, deleteEventOccurrenceWithScope, updateEvent, updateEventOccurrenceWithScope } from './actions'
import { notifyEventsChanged } from './mutations'
import EventForm, { type EventFormInitialValues, type EventFormSeed, type EventFormValues } from './event-form'

async function encryptedInput(values: EventFormValues, masterKey: Uint8Array) {
  const [title, description, location] = await Promise.all([
    encryptString(values.title, masterKey),
    values.description ? encryptString(values.description, masterKey) : Promise.resolve(''),
    values.location ? encryptString(values.location, masterKey) : Promise.resolve(''),
  ])
  return {
    title,
    description,
    location,
    listId: values.listId,
    categoryId: values.categoryId,
    color: values.color,
    showInUpcoming: values.showInUpcoming,
    timeZone: values.timeZone,
    recurrenceRule: values.recurrenceRule,
    ...(values.allDay
      ? { allDay: true as const, startsOn: values.startsOn!, endsOn: values.endsOn! }
      : { allDay: false as const, startsAt: values.startsAt!, endsAt: values.endsAt }),
  }
}

function recurrenceRulesEqual(
  left: EventFormValues['recurrenceRule'],
  right: EventFormValues['recurrenceRule'],
) {
  return JSON.stringify(normalizeRecurrenceRule(left)) === JSON.stringify(normalizeRecurrenceRule(right))
}

function weekdayScopeOptions(event: CalendarEventWithList | undefined) {
  const occurrenceDate = event?.occurrence_key?.slice(0, 10)
  if (!event?.recurrence_rule?.weekdayTimes?.length || !occurrenceDate) return undefined
  const [year, month, day] = occurrenceDate.split('-').map(Number)
  const weekday = ((new Date(year, month - 1, day, 12).getDay() + 6) % 7) + 1
  return recurrenceScopeOptionsForWeekday(recurrenceWeekdayName(weekday))
}

function weekdayTimingChanged(
  event: CalendarEventWithList | undefined,
  values: EventFormValues | null,
) {
  if (!event || !values || !event.occurrence_key) return false
  if (values.timeZone !== event.time_zone || values.allDay !== event.all_day) return false
  if (event.starts_at && values.startsAt) {
    const currentDate = localDateAndTime(event.starts_at, event.time_zone).date
    const nextDate = localDateAndTime(values.startsAt, event.time_zone).date
    if (currentDate !== nextDate) return false
  }
  const currentRule = normalizeRecurrenceRule(event.recurrence_rule)
  const nextRule = normalizeRecurrenceRule(values.recurrenceRule)
  return values.startsAt !== event.starts_at ||
    values.endsAt !== event.ends_at ||
    JSON.stringify(currentRule?.weekdayTimes ?? null) !== JSON.stringify(nextRule?.weekdayTimes ?? null)
}

export default function EventDialog({
  lists,
  categories = [],
  event,
  seed,
  initialListId = null,
  initialValues,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSaved,
  suppressSuccessToast = false,
  children,
}: {
  lists: List[]
  categories?: Category[]
  event?: CalendarEventWithList
  seed?: EventFormSeed
  initialListId?: string | null
  initialValues?: EventFormInitialValues
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSaved?: () => void
  suppressSuccessToast?: boolean
  children?: ReactNode
}) {
  const { masterKey } = useE2EE()
  const [internalOpen, setInternalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scopeAction, setScopeAction] = useState<'edit' | 'delete' | null>(null)
  const [pendingValues, setPendingValues] = useState<EventFormValues | null>(null)
  const submitting = useRef(false)
  const open = controlledOpen ?? internalOpen
  const isEdit = Boolean(event)

  function setOpen(next: boolean) {
    if (submitting.current) return
    setError(null)
    if (controlledOpen === undefined) setInternalOpen(next)
    controlledOnOpenChange?.(next)
  }

  async function persist(values: EventFormValues, scope: RecurrenceScope = 'this') {
    if (submitting.current) return
    if (!masterKey) {
      setError('Unlock your vault before saving an event.')
      return
    }
    submitting.current = true
    setSaving(true)
    setError(null)
    const visualChange: EventVisualMutation | null = event && (
      values.listId !== event.list_id ||
      values.categoryId !== (event.category_id ?? null) ||
      values.color !== (event.color ?? null) ||
      values.showInUpcoming !== (event.show_in_upcoming ?? true)
    )
      ? {
          eventId: event.id,
          sourceEventId: event.source_event_id,
          occurrenceKey: event.occurrence_key,
          listId: values.listId,
          categoryId: values.categoryId,
          color: values.color,
          showInUpcoming: values.showInUpcoming,
          category: values.categoryId
            ? (() => {
                const selected = categories.find((category) => category.id === values.categoryId)
                return selected
                  ? { id: selected.id, list_id: selected.list_id, color: selected.color ?? null }
                  : null
              })()
            : null,
          scope,
          phase: 'optimistic',
        }
      : null
    if (visualChange) notifyEventsChanged(visualChange)
    try {
      const input = await encryptedInput(values, masterKey)
      if (event?.occurrence_key && event.source_event_id) {
        await updateEventOccurrenceWithScope({ ...input, eventId: event.source_event_id, occurrenceKey: event.occurrence_key }, scope)
      } else if (event) {
        await updateEvent({ ...input, eventId: event.id })
      } else {
        await createEvent(input)
      }
      notifyEventsChanged()
      if (!suppressSuccessToast) toast.success(isEdit ? 'Event updated' : 'Event added')
      setOpen(false)
      onSaved?.()
      return true
    } catch (cause) {
      if (visualChange && event) {
        notifyEventsChanged({
          eventId: event.id,
          sourceEventId: event.source_event_id,
          occurrenceKey: event.occurrence_key,
          listId: event.list_id,
          categoryId: event.category_id ?? null,
          color: event.color ?? null,
          showInUpcoming: event.show_in_upcoming ?? true,
          category: event.category ?? null,
          scope,
          phase: 'rollback',
        })
      }
      setError(cause instanceof Error ? cause.message : 'Event could not be saved. Try again.')
      return false
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  async function submit(values: EventFormValues) {
    if (event?.occurrence_key && event.source_event_id && event.recurrence_rule) {
      setPendingValues(values)
      setScopeAction('edit')
      return
    }
    await persist(values)
  }

  const availableEditScopes = pendingValues && event?.recurrence_rule && !recurrenceRulesEqual(pendingValues.recurrenceRule, event.recurrence_rule)
    ? pendingValues.recurrenceRule
      ? (['following', 'all'] as RecurrenceScope[])
      : (['all'] as RecurrenceScope[])
    : undefined

  async function remove(scope: RecurrenceScope = 'this') {
    if (!event || submitting.current) return
    submitting.current = true
    setSaving(true)
    try {
      if (event.occurrence_key && event.source_event_id) {
        await deleteEventOccurrenceWithScope(event.source_event_id, event.occurrence_key, scope)
      } else {
        await deleteEvent(event.id)
      }
      notifyEventsChanged()
      toast.success(event.occurrence_key ? 'Event occurrence deleted' : 'Event deleted')
      setOpen(false)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Event could not be deleted.')
      return false
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      {open ? <DialogContent className="flex max-h-[min(90dvh,52rem)] flex-col overflow-hidden p-5 sm:max-w-2xl sm:p-7">
        <DialogHeader className="mb-1 shrink-0 pr-8"><DialogTitle className="font-heading text-2xl tracking-tight">{isEdit ? 'Edit event' : 'Add event'}</DialogTitle><DialogDescription>{isEdit ? (event?.occurrence_key ? 'Save the details, then choose which recurring events to update.' : 'Keep the details ready for the moment it happens.') : 'Add a commitment to your calendar. Optional details can wait.'}</DialogDescription></DialogHeader>
        <EventForm event={event} seed={seed} initialListId={initialListId} initialValues={initialValues} lists={lists} categories={categories} disabled={saving} error={error} submitLabel={isEdit ? 'Save changes' : 'Add event'} onCancel={() => setOpen(false)} onSubmit={submit} />
        {isEdit ? <button type="button" className="absolute bottom-[1.65rem] left-5 text-sm font-medium text-red-600 underline-offset-4 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300 sm:left-7" disabled={saving} onClick={() => {
          if (event?.occurrence_key && event.source_event_id && event.recurrence_rule) setScopeAction('delete')
          else void remove()
        }}>{event?.occurrence_key ? 'Delete this occurrence' : 'Delete event'}</button> : null}
      </DialogContent> : null}
      </Dialog>
      <RecurrenceScopeDialog
      open={scopeAction !== null}
      action={scopeAction ?? 'edit'}
      itemLabel="event"
      availableScopes={scopeAction === 'edit' ? availableEditScopes : undefined}
      scopeOptions={scopeAction === 'edit' && weekdayTimingChanged(event, pendingValues) ? weekdayScopeOptions(event) : undefined}
      busy={saving}
      onCancel={() => {
        if (saving) return
        setScopeAction(null)
        setPendingValues(null)
      }}
      onConfirm={(scope) => {
        if (scopeAction === 'edit' && pendingValues) {
          void persist(pendingValues, scope).then((saved) => {
            if (!saved) return
            setScopeAction(null)
            setPendingValues(null)
          })
        } else if (scopeAction === 'delete') {
          void remove(scope).then((deleted) => {
            if (deleted) setScopeAction(null)
          })
        }
      }}
      />
    </>
  )
}
