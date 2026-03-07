// this is a server component that modifies the database itself
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Creates new task to the database
export async function createTask() {
  const title = 'Test'

  if (!title) return

  const supabase = await createClient()

  const { error } = await supabase.from('tasks').insert([
    {
      title,
      completed: false,
    },
  ])

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}

// Toggles tasks as complete or incomplete in the database
export async function toggleTask(id: string, completed: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ completed: !completed })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}

export async function deleteTask(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('tasks').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}
