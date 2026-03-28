// this is a server component that modifies the database itself
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Creates new task to the database
export async function createTask(formData: FormData, pathName?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const title = formData.get('title') as string
  const dueDate = formData.get('due_date') as string
  // Checks if '/today' is current path, so when you make a task there it automatically is due today
  let due_date
  if (pathName === '/today') {
    due_date = dueDate ? new Date(dueDate) : new Date()
  } else {
    due_date = new Date(dueDate)
  }
  const notes = formData.get('notes') as string
  const list_id = formData.get('list_id') as string

  if (!title) return

  // Adds list ID later
  const task: any = {
    user_id: user!.id,
    title,
    due_date,
    notes,
  }

  if (list_id) {
    task.list_id = list_id
  }

  const { error } = await supabase.from('tasks').insert([task])

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

export async function moveTask(taskId: string, newListId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ list_id: newListId })
    .eq('id', taskId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}
