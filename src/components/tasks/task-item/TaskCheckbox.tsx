'use client'

import { toggleTaskComplete } from '@/components/tasks/actions'
import { Checkbox } from '@/components/ui/checkbox'
import { Task } from '../../../types'

export function TaskCheckbox({ task }: { task: Task }) {
  return (
    <Checkbox
      className="mr-2 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 border-blue-500"
      checked={task.completed}
      onCheckedChange={() => {
        toggleTaskComplete(task.id, task.completed)
      }}
    />
  )
}
