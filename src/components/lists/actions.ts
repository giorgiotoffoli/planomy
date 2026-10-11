'use server'

import { createClient } from '@/lib/supabase/server'
import type { List } from '@/types'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createList(title: string, emoji: string | null) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { error } = await supabase.from('lists').insert([
    {
      title,
      emoji,
      user_id: user!.id,
    },
  ])

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}

export async function deleteList(list_id: string) {
  const supabase = await createClient()

  const { error: listError } = await supabase
    .from('lists')
    .delete()
    .eq('id', list_id)

  if (listError) {
    throw new Error(listError.message)
  }

  revalidatePath('/')
  redirect('/home')
}

export async function renameList(
  list_id: string,
  title: string,
  emoji: string | null,
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lists')
    .update({ title, emoji })
    .eq('id', list_id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}

export async function updateListDefaultView(
  listId: string,
  defaultView: List['default_view'],
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('lists')
    .update({ default_view: defaultView })
    .eq('id', listId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}
