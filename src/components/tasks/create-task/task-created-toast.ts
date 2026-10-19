'use client'

import { toast } from 'sonner'
import type { Category, ListSummary, TaskWithList } from '@/types'
import { taskCreationMessage } from '@/lib/task-creation'
import { deleteTask } from '@/components/tasks/mutations'

export function showTaskCreatedToast(
  task: TaskWithList,
  lists: readonly ListSummary[],
  categories: readonly Category[] = [],
) {
  let undoing = false
  toast.success(taskCreationMessage(task, lists, categories), {
    id: `task-created:${task.id}`,
    duration: 5000,
    action: {
      label: 'Undo',
      onClick: async () => {
        if (undoing) return
        undoing = true
        try {
          await deleteTask(task.id)
        } catch (cause) {
          undoing = false
          toast.error(cause instanceof Error ? cause.message : 'Could not undo. The task is still saved.')
        }
      },
    },
  })
}
