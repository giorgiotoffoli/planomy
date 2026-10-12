'use client'

import type { ReactNode } from 'react'
import type { Category, List } from '@/types'
import { TaskDialog } from '../task-form/task-dialog'

interface CreateTaskDialogProps {
  children: ReactNode
  lists: List[]
  categories?: Category[]
  listId: string | null
  categoryId?: string | null
}

export default function CreateTaskDialog({
  children,
  lists,
  categories = [],
  listId,
  categoryId = null,
}: CreateTaskDialogProps) {
  return (
    <TaskDialog
      mode="create"
      lists={lists}
      categories={categories}
      listId={listId}
      categoryId={categoryId}
    >
      {children}
    </TaskDialog>
  )
}
