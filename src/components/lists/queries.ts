'use server'
import { createClient } from '@/lib/supabase/server'
import { toCalendarEvent, toList, toTaskWithList } from '@/lib/supabase/domain-mappers'
import type { CalendarEventWithList } from '@/types'
import { redirect } from 'next/navigation'

export async function getUserLists() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: lists, error } = await supabase.from('lists').select('*')

  if (error) {
    throw new Error(error.message)
  }

  return lists.map(toList)
}

export async function getList(listId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: list, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', user!.id)
    .eq('id', listId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return toList(list)
}

export async function getListTasks(listId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*, list:lists (title, id, emoji, default_view, color), category:categories(id, list_id, color)')
    .eq('user_id', user!.id)
    .eq('list_id', listId)
    .eq('completed', false)

  if (error) {
    throw new Error(error.message)
  }

  return tasks.map(toTaskWithList)
}

export async function getListEvents(listId: string): Promise<CalendarEventWithList[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data, error } = await supabase
    .from('events')
    .select('*, list:lists(id, title, emoji, default_view, color), category:categories(id, list_id, color)')
    .eq('user_id', user.id)
    .eq('list_id', listId)
    .order('starts_on', { ascending: true })
    .order('starts_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data.map(toCalendarEvent)
}
