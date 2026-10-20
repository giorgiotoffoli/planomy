'use server'

import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_CALENDAR_PREFERENCES,
  normalizeCalendarPreferences,
  type CalendarPreferences,
} from '@/lib/calendar-preferences'

export async function getCalendarPreferences(): Promise<CalendarPreferences> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return DEFAULT_CALENDAR_PREFERENCES

  const { data, error } = await supabase
    .from('user_preferences')
    .select('calendar_first_day, time_format')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw new Error(error.message)

  return normalizeCalendarPreferences({
    firstDay: data?.calendar_first_day as CalendarPreferences['firstDay'] | undefined,
    timeFormat: data?.time_format as CalendarPreferences['timeFormat'] | undefined,
  })
}

export async function saveCalendarPreferences(
  input: CalendarPreferences,
): Promise<CalendarPreferences> {
  const preferences = normalizeCalendarPreferences(input)
  if (preferences.firstDay !== input.firstDay || preferences.timeFormat !== input.timeFormat) {
    throw new Error('Choose valid calendar preferences.')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to save calendar preferences.')

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      calendar_first_day: preferences.firstDay,
      time_format: preferences.timeFormat,
    }, { onConflict: 'user_id' })

  if (error) throw new Error(error.message)
  return preferences
}
