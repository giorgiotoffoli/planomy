'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createList(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const title = formData.get('title') as string

  const { error } = await supabase.from('lists').insert([
    {
      title,
      user_id: user!.id,
    },
  ])

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}

export async function deleteList(formData: FormData) {
  const supabase = await createClient()

  const list_id = formData.get('list_id')

  const { error: listError } = await supabase
    .from('lists')
    .delete()
    .eq('id', list_id)

  if (listError) {
    throw new Error(listError.message)
  }

  revalidatePath('/')
  redirect('/inbox')
}

export async function renameList(formData: FormData) {
  const supabase = await createClient()

  const title = formData.get('new_title') as string
  const list_id = formData.get('list_id') as string

  const { error } = await supabase
    .from('lists')
    .update({ title })
    .eq('id', list_id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}

export async function updateListDefaultView(
  listId: string,
  defaultView: string,
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
