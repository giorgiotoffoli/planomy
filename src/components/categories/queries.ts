'use server'

import type { Category } from '@/types'
import { isListColor } from '@/lib/list-colors'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getUserCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: lists, error: listsError } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', user.id)

  if (listsError) throw new Error(listsError.message)

  const listIds = lists.map((list) => list.id)
  if (listIds.length === 0) return []

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .in('list_id', listIds)
    .order('position', { ascending: true })

  if (error) throw new Error(error.message)

  return categories.map((category) => ({
    id: category.id,
    list_id: category.list_id,
    title: category.title,
    position: category.position,
    color: isListColor(category.color) ? category.color : null,
    created_at: category.created_at,
  }))
}
