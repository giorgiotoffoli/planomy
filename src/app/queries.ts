'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getTasks(
  view: 'inbox' | 'today' | 'scheduled' | 'all' | 'completed',
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  let query = supabase.from('tasks').select('*').eq('user_id', user!.id)

  switch (view) {
    case 'inbox':
      query = query.is('list_id', null).is('completed', false)
      break

    case 'today':
      const today = new Date().toISOString().split('T')[0]
      query = query.eq('due_date', today)
      break

    case 'scheduled':
      query = query.not('due_date', 'is', null)
      break

    case 'completed':
      query = query.is('completed', true)

    case 'all':
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
