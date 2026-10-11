'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { toList, toTaskWithList } from '@/lib/supabase/domain-mappers'

export async function getHomeData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const [{ data: tasks, error: tasksError }, { data: lists, error: listsError }] =
    await Promise.all([
      supabase
        .from('tasks')
        .select('*, list:lists (title, id, emoji, default_view)')
        .eq('user_id', user.id)
        .is('completed', false)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false }),
      supabase
        .from('lists')
        .select('*')
        .eq('user_id', user.id)
        .order('title', { ascending: true }),
    ])

  if (tasksError) throw new Error(tasksError.message)
  if (listsError) throw new Error(listsError.message)

  return {
    tasks: tasks.map(toTaskWithList),
    lists: lists.map(toList),
  }
}
