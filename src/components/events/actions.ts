'use server'

import { revalidatePath } from 'next/cache'
import { expandCalendarEvents, localDateAndTime, normalizeEventFields, validateCalendarRange, type CalendarRangeInput } from '@/lib/events'
import { addCalendarDays } from '@/lib/today'
import { type RecurrenceScope } from '@/lib/recurrence-scope'
import { generateOccurrenceDateKeys, normalizeRecurrenceRule } from '@/lib/recurrence'
import { createClient } from '@/lib/supabase/server'
import { toCalendarEvent, toEventOccurrenceException } from '@/lib/supabase/domain-mappers'
import type { CreateEventInput, EventOccurrenceException, RecurrenceRule, UpdateEventInput, UpdateEventOccurrenceInput } from '@/types'

const eventSelection =
  '*, list:lists(id, title, emoji, default_view, color), category:categories(id, list_id, color)' as const

async function authenticatedClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

async function validateList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  listId: string | null,
) {
  if (!listId) return
  const { data, error } = await supabase
    .from('lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('List not found.')
}

async function validateCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  listId: string | null,
  categoryId: string | null,
) {
  if (!categoryId) return
  if (!listId) throw new Error('Categories belong to a list.')
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('list_id', listId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Category does not belong to the selected list.')
}

function exceptionFields(input: ReturnType<typeof normalizeEventFields>) {
  return {
    title: input.title,
    description: input.description,
    location: input.location,
    time_zone: input.time_zone,
    list_id: input.list_id,
    category_id: input.category_id,
    color: input.color,
    all_day: input.all_day,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    starts_on: input.starts_on,
    ends_on: input.ends_on,
    show_in_upcoming: input.show_in_upcoming,
    cancelled: false,
  }
}

function dbEventFields(fields: ReturnType<typeof normalizeEventFields>) {
  return {
    ...fields,
    recurrence_rule: fields.recurrence_rule
      ? JSON.parse(JSON.stringify(fields.recurrence_rule))
      : null,
  }
}

// Event text arrives encrypted by the browser, matching task storage.
export async function createEvent(input: CreateEventInput) {
  const fields = normalizeEventFields(input)
  const { supabase, user } = await authenticatedClient()
  await validateList(supabase, user.id, fields.list_id)
  await validateCategory(supabase, user.id, fields.list_id, fields.category_id)

  const { data, error } = await supabase
    .from('events')
    .insert({ ...dbEventFields(fields), user_id: user.id })
    .select(eventSelection)
    .single()
  if (error) throw new Error(error.message)

  revalidatePath('/calendar')
  return toCalendarEvent(data)
}

export async function getEventsInRange(input: CalendarRangeInput) {
  const range = validateCalendarRange(input)
  const { supabase, user } = await authenticatedClient()
  const { data, error } = await supabase
    .from('events')
    .select(eventSelection)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)

  const events = data.map(toCalendarEvent)
  const recurringIds = events.filter((event) => event.recurrence_rule).map((event) => event.id)
  let exceptions: EventOccurrenceException[] = []
  if (recurringIds.length) {
    const result = await supabase
      .from('event_occurrence_exceptions')
      .select('*, category:categories(id, list_id, color)')
      .eq('user_id', user.id)
      .in('event_id', recurringIds)
    if (result.error) throw new Error(result.error.message)
    exceptions = result.data.map(toEventOccurrenceException)
  }
  return expandCalendarEvents(events, exceptions, range)
}

export async function getAllEvents() {
  const { supabase, user } = await authenticatedClient()
  const { data, error } = await supabase
    .from('events')
    .select(eventSelection)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data.map(toCalendarEvent)
}

export async function updateEvent(input: UpdateEventInput) {
  const fields = normalizeEventFields(input)
  const { supabase, user } = await authenticatedClient()
  await validateList(supabase, user.id, fields.list_id)
  await validateCategory(supabase, user.id, fields.list_id, fields.category_id)

  const { data, error } = await supabase
    .from('events')
    .update(dbEventFields(fields))
    .eq('id', input.eventId)
    .eq('user_id', user.id)
    .select(eventSelection)
    .single()
  if (error) throw new Error(error.message)

  revalidatePath('/calendar')
  return toCalendarEvent(data)
}

export async function setEventListVisibility(eventId: string, visible: boolean) {
  const { supabase, user } = await authenticatedClient()
  const { data, error } = await supabase
    .from('events')
    .update({ show_in_list: visible })
    .eq('id', eventId)
    .eq('user_id', user.id)
    .select(eventSelection)
    .single()
  if (error) throw new Error(error.message)

  revalidatePath('/calendar')
  revalidatePath('/lists/[list-id]', 'page')
  return toCalendarEvent(data)
}

export async function updateEventOccurrence(input: UpdateEventOccurrenceInput) {
  if (!input.occurrenceKey || input.occurrenceKey.length > 160) {
    throw new Error('Choose a valid event occurrence.')
  }
  const fields = normalizeEventFields(input)
  const { supabase, user } = await authenticatedClient()
  await validateList(supabase, user.id, fields.list_id)
  await validateCategory(supabase, user.id, fields.list_id, fields.category_id)
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, recurrence_rule')
    .eq('id', input.eventId)
    .eq('user_id', user.id)
    .single()
  if (eventError) throw new Error(eventError.message)
  if (!event.recurrence_rule) throw new Error('This event is not recurring.')

  const { error } = await supabase
    .from('event_occurrence_exceptions')
    .upsert({
      event_id: input.eventId,
      user_id: user.id,
      occurrence_key: input.occurrenceKey,
      ...exceptionFields(fields),
    }, { onConflict: 'event_id,occurrence_key' })
  if (error) throw new Error(error.message)
  revalidatePath('/calendar')
}

function occurrenceDateFromKey(occurrenceKey: string) {
  const date = occurrenceKey.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Choose a valid event occurrence.')
  return date
}

function weekdayForDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return ((new Date(year, month - 1, day, 12).getDay() + 6) % 7) + 1
}

function weekdayRuleWithTiming(
  rule: RecurrenceRule,
  occurrenceKey: string,
  timing: Extract<EventTiming, { allDay: false }>,
  timeZone: string,
) {
  if (!rule.weekdayTimes?.length) return null
  const occurrenceDate = occurrenceDateFromKey(occurrenceKey)
  const weekday = weekdayForDateKey(occurrenceDate)
  const start = Date.parse(timing.startsAt)
  const end = timing.endsAt ? Date.parse(timing.endsAt) : null
  const durationMinutes = end === null ? null : Math.round((end - start) / 60_000)
  if (!Number.isFinite(start) || (end !== null && (!Number.isFinite(end) || durationMinutes! < 1))) {
    throw new Error('Choose a valid event time range.')
  }
  const local = localDateAndTime(timing.startsAt, timeZone)
  if (local.date !== occurrenceDate) return null
  const nextSchedule = {
    weekday,
    startTime: local.time,
    durationMinutes,
  }
  return {
    ...rule,
    weekdayTimes: [
      ...rule.weekdayTimes.filter((schedule) => schedule.weekday !== weekday),
      nextSchedule,
    ].sort((left, right) => left.weekday - right.weekday),
  }
}

function seriesEndBefore(rule: RecurrenceRule | null, occurrenceDate: string) {
  if (!rule) return null
  const previousDate = addCalendarDays(occurrenceDate, -1)
  return {
    ...rule,
    endDate: rule.endDate && rule.endDate < previousDate ? rule.endDate : previousDate,
  }
}

async function loadRecurringEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  eventId: string,
) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('user_id', userId)
    .single()
  if (error) throw new Error(error.message)
  if (!data.recurrence_rule) throw new Error('This event is not recurring.')
  return {
    ...data,
    recurrence_rule: normalizeRecurrenceRule(data.recurrence_rule as unknown as RecurrenceRule),
  }
}

async function migrateFutureEventExceptions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sourceEventId: string,
  targetEventId: string,
  occurrenceDate: string,
) {
  const { data, error } = await supabase
    .from('event_occurrence_exceptions')
    .select('id, occurrence_key')
    .eq('event_id', sourceEventId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)

  for (const exception of data) {
    const exceptionDate = exception.occurrence_key.slice(0, 10)
    if (exceptionDate > occurrenceDate) {
      const { error: updateError } = await supabase
        .from('event_occurrence_exceptions')
        .update({ event_id: targetEventId })
        .eq('id', exception.id)
        .eq('user_id', userId)
      if (updateError) throw new Error(updateError.message)
    } else if (exceptionDate === occurrenceDate) {
      const { error: deleteError } = await supabase
        .from('event_occurrence_exceptions')
        .delete()
        .eq('id', exception.id)
        .eq('user_id', userId)
      if (deleteError) throw new Error(deleteError.message)
    }
  }
}

function eventFieldsForSeries(
  current: { starts_on: string | null; ends_on: string | null; starts_at: string | null; ends_at: string | null; time_zone: string; all_day: boolean },
  fields: ReturnType<typeof normalizeEventFields>,
) {
  if (fields.all_day && current.all_day && current.starts_on && current.ends_on && fields.starts_on) {
    const length = Math.max(1, Math.round((Date.parse(`${current.ends_on}T00:00:00Z`) - Date.parse(`${current.starts_on}T00:00:00Z`)) / 86_400_000))
    return {
      ...fields,
      starts_on: current.starts_on,
      ends_on: addCalendarDays(current.starts_on, length),
      recurrence_rule: fields.recurrence_rule
        ? { ...fields.recurrence_rule, startDate: fields.recurrence_rule.startDate }
        : fields.recurrence_rule,
    }
  }
  return fields
}

function eventFieldsFromStoredSeries(
  current: {
    title: string
    description: string | null
    location: string | null
    list_id: string | null
    category_id: string | null
    color: string | null
    time_zone: string
    all_day: boolean
    starts_on: string | null
    ends_on: string | null
    starts_at: string | null
    ends_at: string | null
    show_in_upcoming: boolean
  },
  recurrenceRule: RecurrenceRule | null,
) {
  return normalizeEventFields((current.all_day
    ? {
        title: current.title,
        description: current.description ?? '',
        location: current.location ?? '',
        listId: current.list_id,
        categoryId: current.category_id,
        color: current.color,
        showInUpcoming: current.show_in_upcoming,
        timeZone: current.time_zone,
        recurrenceRule,
        allDay: true,
        startsOn: current.starts_on!,
        endsOn: current.ends_on!,
      }
    : {
        title: current.title,
        description: current.description ?? '',
        location: current.location ?? '',
        listId: current.list_id,
        categoryId: current.category_id,
        color: current.color,
        showInUpcoming: current.show_in_upcoming,
        timeZone: current.time_zone,
        recurrenceRule,
        allDay: false,
        startsAt: current.starts_at!,
        endsAt: current.ends_at,
      }) as CreateEventInput)
}

function eventRulesForSplit(
  original: RecurrenceRule,
  requested: RecurrenceRule,
  occurrenceDate: string,
) {
  const previousDate = addCalendarDays(occurrenceDate, -1)
  const priorDates = generateOccurrenceDateKeys(original, original.startDate, occurrenceDate)
  return {
    oldRule: {
      ...original,
      endDate: original.endDate && original.endDate < previousDate ? original.endDate : previousDate,
      ...(original.count ? { count: priorDates.length } : { count: null }),
    } satisfies RecurrenceRule,
    nextRule: {
      ...requested,
      startDate: occurrenceDate,
      endDate: (requested.endDate ?? original.endDate ?? null) && (requested.endDate ?? original.endDate)! >= occurrenceDate
        ? requested.endDate ?? original.endDate ?? null
        : null,
      ...(original.count && requested.count === original.count
        ? { count: Math.max(1, original.count - priorDates.length) }
        : {}),
    } satisfies RecurrenceRule,
  }
}

export async function updateEventOccurrenceWithScope(
  input: UpdateEventOccurrenceInput,
  scope: RecurrenceScope,
) {
  if (scope === 'this') return updateEventOccurrence(input)
  if (!input.occurrenceKey || input.occurrenceKey.length > 160) throw new Error('Choose a valid event occurrence.')
  const fields = normalizeEventFields(input)
  const { supabase, user } = await authenticatedClient()
  await validateList(supabase, user.id, fields.list_id)
  await validateCategory(supabase, user.id, fields.list_id, fields.category_id)
  const current = await loadRecurringEvent(supabase, user.id, input.eventId)
  const occurrenceDate = occurrenceDateFromKey(input.occurrenceKey)

  if (scope === 'all') {
    const seriesFields = eventFieldsForSeries(current, fields)
    const { error } = await supabase
      .from('events')
      .update(dbEventFields(seriesFields))
      .eq('id', input.eventId)
      .eq('user_id', user.id)
    if (error) throw new Error(error.message)
    const { error: exceptionError } = await supabase
      .from('event_occurrence_exceptions')
      .delete()
      .eq('event_id', input.eventId)
      .eq('user_id', user.id)
      .eq('cancelled', false)
    if (exceptionError) throw new Error(exceptionError.message)
    revalidatePath('/calendar')
    return
  }

  const originalRule = current.recurrence_rule
  if (!originalRule) throw new Error('This event is not recurring.')
  const nextRule = fields.recurrence_rule
    ? eventRulesForSplit(originalRule, fields.recurrence_rule, occurrenceDate).nextRule
    : null
  if (!nextRule) throw new Error('This and following requires a recurring event.')
  const oldRule = eventRulesForSplit(originalRule, fields.recurrence_rule!, occurrenceDate).oldRule
  const { data: nextEvent, error: insertError } = await supabase
    .from('events')
    .insert({
      ...dbEventFields({ ...fields, recurrence_rule: nextRule }),
      show_in_list: current.show_in_list,
      user_id: user.id,
    })
    .select('id')
    .single()
  if (insertError) throw new Error(insertError.message)
  try {
    const { error: prefixError } = await supabase
      .from('events')
      .update(dbEventFields(eventFieldsFromStoredSeries(current, oldRule)))
      .eq('id', input.eventId)
      .eq('user_id', user.id)
    if (prefixError) throw new Error(prefixError.message)
    await migrateFutureEventExceptions(supabase, user.id, input.eventId, nextEvent.id, occurrenceDate)
  } catch (cause) {
    await supabase
      .from('event_occurrence_exceptions')
      .update({ event_id: input.eventId })
      .eq('event_id', nextEvent.id)
      .eq('user_id', user.id)
    await supabase
      .from('events')
      .update(dbEventFields(eventFieldsFromStoredSeries(current, originalRule)))
      .eq('id', input.eventId)
      .eq('user_id', user.id)
    await supabase.from('events').delete().eq('id', nextEvent.id).eq('user_id', user.id)
    throw cause
  }
  revalidatePath('/calendar')
}

export async function deleteEventOccurrence(eventId: string, occurrenceKey: string) {
  return deleteEventOccurrenceWithScope(eventId, occurrenceKey, 'this')
}

export async function deleteEventOccurrenceWithScope(
  eventId: string,
  occurrenceKey: string,
  scope: RecurrenceScope,
) {
  if (!occurrenceKey || occurrenceKey.length > 160) throw new Error('Choose a valid event occurrence.')
  const { supabase, user } = await authenticatedClient()
  if (scope === 'all') {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id)
    if (error) throw new Error(error.message)
    revalidatePath('/calendar')
    return
  }
  if (scope === 'following') {
    const current = await loadRecurringEvent(supabase, user.id, eventId)
    const occurrenceDate = occurrenceDateFromKey(occurrenceKey)
    const currentRule = current.recurrence_rule
    if (!currentRule) throw new Error('This event is not recurring.')
    if (currentRule.startDate >= occurrenceDate) {
      const { error } = await supabase.from('events').delete().eq('id', eventId).eq('user_id', user.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase
        .from('events')
        .update({ recurrence_rule: JSON.parse(JSON.stringify(seriesEndBefore(currentRule, occurrenceDate))) })
        .eq('id', eventId)
        .eq('user_id', user.id)
      if (error) throw new Error(error.message)
      const { error: exceptionError } = await supabase
        .from('event_occurrence_exceptions')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .gte('occurrence_key', occurrenceDate)
      if (exceptionError) throw new Error(exceptionError.message)
    }
    revalidatePath('/calendar')
    return
  }
  const { error } = await supabase
    .from('event_occurrence_exceptions')
    .upsert({
      event_id: eventId,
      user_id: user.id,
      occurrence_key: occurrenceKey,
      cancelled: true,
      title: null,
      description: null,
      location: null,
      time_zone: null,
      list_id: null,
      category_id: null,
      color: null,
      all_day: null,
      starts_at: null,
      ends_at: null,
      starts_on: null,
      ends_on: null,
      show_in_upcoming: null,
    }, { onConflict: 'event_id,occurrence_key' })
  if (error) throw new Error(error.message)
  revalidatePath('/calendar')
}

type EventTiming =
  | { allDay: true; startsOn: string; endsOn: string }
  | { allDay: false; startsAt: string; endsAt: string | null }

export async function updateEventTiming(
  eventId: string,
  occurrenceKey: string | null,
  timing: EventTiming,
  scope: RecurrenceScope = 'this',
) {
  if (occurrenceKey) {
    const { supabase, user } = await authenticatedClient()
    const { data: current, error } = await supabase
      .from('events')
      .select(eventSelection)
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single()
    if (error) throw new Error(error.message)
    const fields = normalizeEventFields({
      title: current.title,
      description: current.description ?? '',
      location: current.location ?? '',
      listId: current.list_id,
      categoryId: current.category_id,
      color: current.color,
      showInUpcoming: current.show_in_upcoming,
      timeZone: current.time_zone,
      recurrenceRule: current.recurrence_rule,
      ...timing,
    } as CreateEventInput)
    const currentRule = normalizeRecurrenceRule(current.recurrence_rule as RecurrenceRule | null)
    if (!timing.allDay && currentRule?.weekdayTimes?.length) {
      const updatedRule = weekdayRuleWithTiming(currentRule, occurrenceKey, timing, current.time_zone)
      if (updatedRule && scope === 'all') {
        const { error: updateError } = await supabase
          .from('events')
          .update({ recurrence_rule: JSON.parse(JSON.stringify(updatedRule)) })
          .eq('id', eventId)
          .eq('user_id', user.id)
        if (updateError) throw new Error(updateError.message)
        // Timing edits to one weekday change the rule itself. Existing
        // exceptions remain authoritative for their historical occurrences.
        revalidatePath('/calendar')
        return
      }

      if (updatedRule && scope === 'following') {
        const seriesFields = eventFieldsFromStoredSeries(current, updatedRule)
        await updateEventOccurrenceWithScope({
          ...fieldsToInput(seriesFields),
          eventId,
          occurrenceKey,
        }, scope)
        return
      }
    }
    const occurrenceInput = {
      ...fieldsToInput(fields),
      eventId,
      occurrenceKey,
    }
    if (scope === 'this') await updateEventOccurrence(occurrenceInput)
    else await updateEventOccurrenceWithScope(occurrenceInput, scope)
    return
  }

  const { supabase, user } = await authenticatedClient()
  const { data: current, error: currentError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .single()
  if (currentError) throw new Error(currentError.message)
  const fields = normalizeEventFields({
    title: current.title,
    description: current.description ?? '',
    location: current.location ?? '',
    listId: current.list_id,
      categoryId: current.category_id,
      color: current.color,
      showInUpcoming: current.show_in_upcoming,
    timeZone: current.time_zone,
    recurrenceRule: current.recurrence_rule,
    ...timing,
  } as CreateEventInput)
  const { error } = await supabase.from('events').update(dbEventFields(fields)).eq('id', eventId).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/calendar')
}

function fieldsToInput(fields: ReturnType<typeof normalizeEventFields>): CreateEventInput {
  return fields.all_day
    ? {
        title: fields.title,
        description: fields.description ?? '',
        location: fields.location ?? '',
        listId: fields.list_id,
        categoryId: fields.category_id,
        color: fields.color,
        showInUpcoming: fields.show_in_upcoming,
        timeZone: fields.time_zone,
        recurrenceRule: fields.recurrence_rule,
        allDay: true,
        startsOn: fields.starts_on!,
        endsOn: fields.ends_on!,
      }
    : {
        title: fields.title,
        description: fields.description ?? '',
        location: fields.location ?? '',
        listId: fields.list_id,
        categoryId: fields.category_id,
        color: fields.color,
        showInUpcoming: fields.show_in_upcoming,
        timeZone: fields.time_zone,
        recurrenceRule: fields.recurrence_rule,
        allDay: false,
        startsAt: fields.starts_at!,
        endsAt: fields.ends_at,
      }
}

export async function deleteEvent(eventId: string) {
  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)

  revalidatePath('/calendar')
}
