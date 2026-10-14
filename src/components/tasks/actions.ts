// this is a server component that modifies the database itself
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { toTaskWithList } from '@/lib/supabase/domain-mappers'
import type { CreateTaskInput, UpdateTaskInput } from '@/types'
import { normalizeDeadline } from '@/lib/task-form'

type SupabaseError = { code?: string; message: string }

function focusError(error: SupabaseError) {
  if (error.message.includes('set_task_focus') || error.code === 'PGRST202') {
    return new Error(
      'Home focus is not configured in this Supabase project. Apply the latest database migration first.',
    )
  }

  return new Error(error.message)
}

async function validateTaskOrganization(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  listId: string | null,
  categoryId: string | null,
) {
  if (listId) {
    const { data: list, error } = await supabase
      .from('lists')
      .select('id')
      .eq('id', listId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!list) throw new Error('List not found.')
  }

  if (!categoryId) return
  if (!listId) throw new Error('Categories belong to a list.')

  const { data: category, error } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('list_id', listId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!category) throw new Error('Category does not belong to the selected list.')
}

function normalizedTaskFields(input: CreateTaskInput) {
  const { dueDate, dueTime } = normalizeDeadline(input.dueDate, input.dueTime)
  return {
    title: input.title.trim(),
    notes: input.notes ?? '',
    list_id: input.listId || null,
    category_id: input.categoryId || null,
    due_date: dueDate,
    // A time without a date is never persisted as an invisible deadline.
    due_time: dueTime,
  }
}

// Creates a task. The title and notes have already been encrypted in the browser.
export async function createTask(input: CreateTaskInput) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const fields = normalizedTaskFields(input)
  if (!fields.title) throw new Error('A task title is required.')
  await validateTaskOrganization(
    supabase,
    user.id,
    fields.list_id,
    fields.category_id,
  )

  // Focus is applied through the trusted RPC after the task has an id. This
  // preserves the database's serialized three-task limit.
  const task = {
    user_id: user.id,
    ...fields,
    focused: false,
    stashed: false,
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select('*, list:lists(id, title, emoji, default_view, color)')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (input.focused) {
    const { error: focusMutationError } = await supabase.rpc('set_task_focus', {
      p_task_id: data.id,
      p_focused: true,
    })

    if (focusMutationError) {
      // Keep creation atomic from the user's perspective when the focus limit
      // rejects the requested state. If cleanup ever fails, the task remains
      // safely un-focused rather than exceeding the limit.
      await supabase.from('tasks').delete().eq('id', data.id).eq('user_id', user.id)
      throw focusError(focusMutationError)
    }
  }

  const { data: savedTask, error: savedTaskError } = await supabase
    .from('tasks')
    .select('*, list:lists(id, title, emoji, default_view, color)')
    .eq('id', data.id)
    .eq('user_id', user.id)
    .single()

  if (savedTaskError) throw new Error(savedTaskError.message)

  revalidatePath('/')

  return toTaskWithList(savedTask)
}

export async function updateTask(input: UpdateTaskInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: existing, error: existingError } = await supabase
    .from('tasks')
    .select('focused, completed, stashed')
    .eq('id', input.taskId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (!existing) throw new Error('Task not found.')

  const fields = normalizedTaskFields(input)
  if (!fields.title) throw new Error('A task title is required.')
  await validateTaskOrganization(
    supabase,
    user.id,
    fields.list_id,
    fields.category_id,
  )

  const { error } = await supabase
    .from('tasks')
    .update(fields)
    .eq('id', input.taskId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  if (input.focused !== existing.focused) {
    const { error: focusMutationError } = await supabase.rpc('set_task_focus', {
      p_task_id: input.taskId,
      p_focused: input.focused,
    })

    if (focusMutationError) throw focusError(focusMutationError)
  }

  const { data: savedTask, error: savedTaskError } = await supabase
    .from('tasks')
    .select('*, list:lists(id, title, emoji, default_view, color)')
    .eq('id', input.taskId)
    .eq('user_id', user.id)
    .single()

  if (savedTaskError) throw new Error(savedTaskError.message)
  revalidatePath('/')
  return toTaskWithList(savedTask)
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
    .update({
      due_date: newDueDate || null,
      ...(newDueDate ? {} : { due_time: null }),
    })
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
      throw new Error('Unsorted tasks cannot be assigned to a category.')
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
