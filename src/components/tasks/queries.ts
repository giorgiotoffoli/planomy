'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getTasks(
  view: 'inbox' | 'today' | 'scheduled' | 'all' | 'completed',
) {
  function getTodayDateString() {
    const today = new Date()

    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  let query = supabase
    .from('tasks')
    .select('*, list:lists (title, id)')
    .eq('user_id', user!.id)

  switch (view) {
    case 'inbox':
      query = query.is('list_id', null).is('completed', false)
      break

    case 'today':
      const today = getTodayDateString()
      query = query.eq('due_date', today).eq('completed', false)
      break

    case 'scheduled':
      query = query.not('due_date', 'is', null).is('completed', false)
      break

    case 'completed':
      query = query.is('completed', true)
      break
    case 'all':
      query = query.is('completed', false)
      break

    default:
      break
  }

  const { data: tasks, error } = await query.order('created_at', {
    ascending: false,
  })

  if (error) {
    throw new Error(error.message)
  }

  return tasks
}
