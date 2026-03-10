// this is a server component that modifies the database itself
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Creates new task to the database
export async function createTask(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const title = formData.get('title') as string
  const dueDate = formData.get('due_date') as string
  const due_date = new Date(dueDate)
  console.log(title)
  if (!title) return

  const { error } = await supabase.from('tasks').insert([
    {
      user_id: user!.id,
      title,
      due_date,
    },
  ])

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}

// Toggles tasks as complete or incomplete in the database
export async function toggleTaskComplete(id: string, completed: boolean) {
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

export async function renameTask(formData: FormData) {
  const supabase = await createClient()

  const newTitle = formData.get('newTitle') as string
  const title = newTitle.trim()
  const id = formData.get('id') as string

  const { error } = await supabase.from('tasks').update({ title }).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}

export async function updateTask(formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const notes = formData.get('notes') as string
  const dueDate = formData.get('due_date') as string
  const due_date = new Date(dueDate)

  const { error } = await supabase
    .from('tasks')
    .update({ due_date, notes })
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

  revalidatePath('/')
}
