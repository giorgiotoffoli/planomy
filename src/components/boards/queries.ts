import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Category } from '@/types'
import { isListColor } from '@/lib/list-colors'

export default async function getCategories(listId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: list, error: listError } = await supabase
    .from('lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (listError) throw new Error(listError.message)
  if (!list) throw new Error('List not found')

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .eq('list_id', listId)
    .order('position', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return categories.map((category): Category => ({
    ...category,
    color: isListColor(category.color) ? category.color : null,
  }))
}
