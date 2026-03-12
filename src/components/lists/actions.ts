'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  const { error: taskError } = await supabase
    .from('tasks')
    .delete()
    .eq('list_id', list_id)

  if (taskError) {
    throw new Error(taskError.message)
  }

  const { error: listError } = await supabase
    .from('lists')
    .delete()
    .eq('id', list_id)

  if (listError) {
    throw new Error(listError.message)
  }

  revalidatePath('/')
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
