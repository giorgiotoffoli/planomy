'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/database-types'
import { isListColor, type ListColor } from '@/lib/list-colors'

type CategoryRow = Tables<'categories'>

async function requireOwnedList(listId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: list, error } = await supabase
    .from('lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!list) throw new Error('List not found')

  return { supabase, user }
}

export async function createCategory(
  listId: string,
  encryptedTitle: string,
  color: ListColor | null = null,
): Promise<CategoryRow> {
  if (!encryptedTitle.trim()) throw new Error('Category name cannot be empty.')
  if (color !== null && !isListColor(color)) throw new Error('Invalid category color.')

  const { supabase } = await requireOwnedList(listId)
  const { data: lastCategory, error: positionError } = await supabase
    .from('categories')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (positionError) throw new Error(positionError.message)

  const { data: category, error } = await supabase
    .from('categories')
    .insert({
      list_id: listId,
      title: encryptedTitle,
      color,
      position: (lastCategory?.position ?? -1) + 1,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/lists/${listId}`)
  return category
}

export async function renameCategory(
  listId: string,
  categoryId: string,
  encryptedTitle: string,
  color: ListColor | null = null,
): Promise<void> {
  if (!encryptedTitle.trim()) throw new Error('Category name cannot be empty.')
  if (color !== null && !isListColor(color)) throw new Error('Invalid category color.')

  const { supabase } = await requireOwnedList(listId)
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('list_id', listId)
    .maybeSingle()

  if (categoryError) throw new Error(categoryError.message)
  if (!category) throw new Error('Category not found')

  const { error } = await supabase
    .from('categories')
    .update({ title: encryptedTitle, color })
    .eq('id', categoryId)
    .eq('list_id', listId)

  if (error) throw new Error(error.message)

  revalidatePath(`/lists/${listId}`)
}

export async function deleteCategory(
  listId: string,
  categoryId: string,
): Promise<void> {
  const { supabase } = await requireOwnedList(listId)
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('list_id', listId)
    .maybeSingle()

  if (categoryError) throw new Error(categoryError.message)
  if (!category) throw new Error('Category not found')

  const { error } = await supabase.rpc('delete_category', {
    p_category_id: categoryId,
    p_list_id: listId,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/lists/${listId}`)
}

export async function reorderCategories(
  listId: string,
  updates: { id: string; position: number }[],
): Promise<void> {
  const { supabase } = await requireOwnedList(listId)
  const ids = updates.map(({ id }) => id)

  if (new Set(ids).size !== ids.length) {
    throw new Error('Category order contains duplicates.')
  }

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id')
    .eq('list_id', listId)
    .in('id', ids)

  if (categoriesError) throw new Error(categoriesError.message)
  if (categories.length !== ids.length) throw new Error('Category not found')

  const results = await Promise.all(
    updates.map(({ id, position }) =>
      supabase
        .from('categories')
        .update({ position })
        .eq('id', id)
        .eq('list_id', listId),
    ),
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) throw new Error(failed.error.message)

  revalidatePath(`/lists/${listId}`)
}
