'use client'
import { deleteTask } from '@/components/tasks/actions'
import { Button } from '@/components/ui/button'

export function TaskDeleteButton({ taskId }: { taskId: string }) {
  return (
    <Button variant="destructive" onClick={() => deleteTask(taskId)}>
      Delete Task
    </Button>
  )
}
