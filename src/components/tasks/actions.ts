// this is a server component that modifies the database itself
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { toTaskWithList } from '@/lib/supabase/domain-mappers'

// Creates new task to the database
export async function createTask(
  title: string,
  dueDate: string,
  notes: string,
  listId: string | null,
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const due_date = dueDate ? dueDate.slice(0, 10) : null

  if (!title) return

  // Adds list ID later
  const task = {
    user_id: user.id,
    title,
    due_date,
    notes,
    ...(listId ? { list_id: listId } : {}),
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select('*, list:lists(id, title, emoji, default_view)')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')

  return toTaskWithList(data)
}

// Toggles tasks as complete or incomplete in the database
export async function updateTaskCompleted(id: string, isCompleted: boolean) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tasks')
    .update({ completed: isCompleted, ...(isCompleted ? { focused: false } : {}) })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
  revalidatePath('/')
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

  const { error } = await supabase
    .from('tasks')
    .update({ due_date: newDueDate || null })
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  if (newListId) {
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id')
      .eq('id', newListId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (listError) throw new Error(listError.message)
    if (!list) throw new Error('List not found')
  }

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('list_id')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (taskError) throw new Error(taskError.message)

  const { error } = await supabase
    .from('tasks')
    .update({
      list_id: newListId,
      ...(task.list_id !== newListId ? { category_id: null } : {}),
    })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
}

export async function changeTaskCategory(
  taskId: string,
  newCategoryId: string | null,
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('list_id')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (taskError) throw new Error(taskError.message)

  if (newCategoryId) {
    if (!task.list_id) {
      throw new Error('Tasks in Inbox cannot be assigned to a category.')
    }

    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', newCategoryId)
      .eq('list_id', task.list_id)
      .single()

    if (categoryError) throw new Error(categoryError.message)
    if (!category) throw new Error('Category not found')
  }

  const { error } = await supabase
    .from('tasks')
    .update({ category_id: newCategoryId })
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function reorderTasks(
  updates: { id: string; position: number }[],
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  await Promise.all(
    updates.map(async ({ id, position }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ position })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        throw new Error(error.message)
      }
    }),
  )
}
