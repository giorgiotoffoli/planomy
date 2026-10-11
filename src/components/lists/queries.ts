'use server'
import { createClient } from '@/lib/supabase/server'
import { toList, toTaskWithList } from '@/lib/supabase/domain-mappers'
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
    .select('*, list:lists (title, id, emoji, default_view)')
    .eq('user_id', user!.id)
    .eq('list_id', listId)
    .eq('completed', false)

  if (error) {
    throw new Error(error.message)
  }

  return tasks.map(toTaskWithList)
}
