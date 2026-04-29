'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Task } from '../../../types'
import { updateTaskCompleted } from '../actions'

export function TaskCheckbox({ task }: { task: Task }) {
  return (
    <Checkbox
      className="mr-2 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 border-blue-500"
      checked={task.completed}
      onCheckedChange={() => {
        updateTaskCompleted(task.id, task.completed)
      }}
    />
  )
}
