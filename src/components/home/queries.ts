'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { toList, toTaskWithList } from '@/lib/supabase/domain-mappers'
import { getUserCategories } from '@/components/categories/queries'
import { normalizeHomeSourcePreferences } from '@/lib/home'

export async function getHomeData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const [
    { data: tasks, error: tasksError },
    { data: lists, error: listsError },
    categories,
    { data: homePreferences, error: homePreferencesError },
  ] = await Promise.all([
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
      getUserCategories(),
      supabase
        .from('user_preferences')
        .select('excluded_home_list_ids, show_unsorted_on_home')
        .eq('user_id', user.id)
        .maybeSingle(),
  ])

  if (tasksError) throw new Error(tasksError.message)
  if (listsError) throw new Error(listsError.message)
  if (homePreferencesError) throw new Error(homePreferencesError.message)

  const mappedLists = lists.map(toList)

  return {
    tasks: tasks.map(toTaskWithList),
    lists: mappedLists,
    categories,
    homePreferences: normalizeHomeSourcePreferences(
      homePreferences,
      mappedLists.map((list) => list.id),
    ),
  }
}
