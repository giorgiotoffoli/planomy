'use client'

import type { ReactNode } from 'react'
import type { Category, List } from '@/types'
import { TaskDialog } from '../task-form/task-dialog'
import type { TaskCreationView } from '@/lib/task-creation'

interface CreateTaskDialogProps {
  children: ReactNode
  lists: List[]
  categories?: Category[]
  listId: string | null
  categoryId?: string | null
  creationView?: TaskCreationView
}

export default function CreateTaskDialog({
  children,
  lists,
  categories = [],
  listId,
  categoryId = null,
  creationView,
}: CreateTaskDialogProps) {
  return (
    <TaskDialog
      mode="create"
      lists={lists}
      categories={categories}
      listId={listId}
      categoryId={categoryId}
      creationView={creationView}
    >
      {children}
    </TaskDialog>
  )
}
