'use client'

import type { ReactNode } from 'react'
import type { Category, List, TaskWithList } from '@/types'
import { TaskDialog } from '../../task-form/task-dialog'

interface TaskEditDialogProps {
  task: TaskWithList
  lists: List[]
  currentListId?: string | null
  categories?: Category[]
  children?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  focusPlanTime?: boolean
  // Optional compatibility props for callers that still perform their own
  // optimistic row updates. The unified dialog persists all fields itself.
  handleOnDueDateChange?: (taskId: string, newDueDate: string) => void
  handleOnNotesChange?: (taskId: string, notes: string) => void
  handleOnRename?: (taskId: string, newName: string) => void
}

export function TaskEditDialog({
  task,
  lists,
  categories = [],
  children,
  open,
  onOpenChange,
  focusPlanTime = false,
}: TaskEditDialogProps) {
  return (
    <TaskDialog
      mode="edit"
      task={task}
      lists={lists}
      categories={categories}
      listId={task.list_id}
      focusPlanTime={focusPlanTime}
      open={open}
      onOpenChange={onOpenChange}
    >
      {children}
    </TaskDialog>
  )
}
