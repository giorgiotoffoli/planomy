// this is a server component that modifies the database itself
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { TaskWithList } from '@/types'

// Creates new task to the database
export async function createTask(
  title: string,
  dueDate: string,
  notes: string,
  listId: string,
  pathName?: string,
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Checks if '/today' is current path, so when you make a task there it automatically is due today
  let due_date
  if (pathName === '/today') {
    due_date = dueDate ? new Date(dueDate) : new Date()
  } else {
    due_date = new Date(dueDate)
  }

  if (!title) return

  // Adds list ID later
  const task: any = {
    user_id: user!.id,
    title,
    due_date,
    notes,
  }

  if (listId) {
    task.list_id = listId
  }

  const { data, error } = await supabase.from('tasks').insert([task])

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Task was not created')
  }

  revalidatePath('/')

  return data as TaskWithList
}

// Toggles tasks as complete or incomplete in the database
export async function updateTaskCompleted(id: string, isCompleted: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ completed: isCompleted })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function renameTask(taskId: string, title: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ title })
    .eq('id', taskId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function updateTaskDueDate(taskId: string, newDueDate: string) {
  const supabase = await createClient()

  const due_date = new Date(newDueDate)

  const { error } = await supabase
    .from('tasks')
    .update({ due_date })
    .eq('id', taskId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function updateTaskNotes(taskId: string, notes: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ notes })
    .eq('id', taskId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteTask(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('tasks').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}

export async function moveTask(taskId: string, newListId: string | null) {
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

export async function changeTaskStatus(
  taskId: string,
  newStatusId: string | null,
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ status_id: newStatusId })
    .eq('id', taskId)

  if (error) {
    throw new Error(error.message)
  }
}
