'use server'

import { revalidatePath } from 'next/cache'
import { normalizeEventFields, validateCalendarRange, type CalendarRangeInput } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import { toCalendarEvent } from '@/lib/supabase/domain-mappers'
import type { CreateEventInput, UpdateEventInput } from '@/types'

const eventSelection =
  '*, list:lists(id, title, emoji, default_view, color)' as const

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

// Event titles arrive encrypted by the browser, matching task title storage.
export async function createEvent(input: CreateEventInput) {
  const fields = normalizeEventFields(input)
  const { supabase, user } = await authenticatedClient()
  await validateList(supabase, user.id, fields.list_id)

  const { data, error } = await supabase
    .from('events')
    .insert({ ...fields, user_id: user.id })
    .select(eventSelection)
    .single()
  if (error) throw new Error(error.message)

  revalidatePath('/calendar')
  return toCalendarEvent(data)
}

export async function getEventsInRange(input: CalendarRangeInput) {
  const range = validateCalendarRange(input)
  const { supabase, user } = await authenticatedClient()
  const [timed, allDay] = await Promise.all([
    supabase
      .from('events')
      .select(eventSelection)
      .eq('user_id', user.id)
      .eq('all_day', false)
      .lt('starts_at', range.endsAt)
      .gt('ends_at', range.startsAt)
      .order('starts_at'),
    supabase
      .from('events')
      .select(eventSelection)
      .eq('user_id', user.id)
      .eq('all_day', true)
      .lt('starts_on', range.endsOn)
      .gt('ends_on', range.startsOn)
      .order('starts_on'),
  ])

  if (timed.error) throw new Error(timed.error.message)
  if (allDay.error) throw new Error(allDay.error.message)
  return [...timed.data, ...allDay.data].map(toCalendarEvent)
}

export async function updateEvent(input: UpdateEventInput) {
  const fields = normalizeEventFields(input)
  const { supabase, user } = await authenticatedClient()
  await validateList(supabase, user.id, fields.list_id)

  const { data, error } = await supabase
    .from('events')
    .update(fields)
    .eq('id', input.eventId)
    .eq('user_id', user.id)
    .select(eventSelection)
    .single()
  if (error) throw new Error(error.message)

  revalidatePath('/calendar')
  return toCalendarEvent(data)
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
