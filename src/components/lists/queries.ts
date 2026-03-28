'use server'
import { createClient } from '@/lib/supabase/server'
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

  return lists
}

export async function getList(listId: string) {
  const supabase = await createClient()

  const { data: list, error } = await supabase
    .from('lists')
    .select('*')
    .eq('id', listId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return list
}

export async function getListTasks(listId: string) {
  const supabase = await createClient()

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('list_id', listId)
    .eq('completed', false)

  if (error) {
    throw new Error(error.message)
  }

  return tasks
}
