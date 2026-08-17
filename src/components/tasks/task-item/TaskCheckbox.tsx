'use client'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskWithList } from '@/types'

interface TaskCheckboxProps {
  task: TaskWithList
  handleOnComplete: (taskId: string, isCompleted: boolean) => void
}

export function TaskCheckbox({ task, handleOnComplete }: TaskCheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={task.completed}
      onCheckedChange={(checked) => {
        handleOnComplete(task.id, checked === true)
      }}
      className={cn(
        `
        group/checkbox
        relative
        flex h-4 w-4 shrink-0
        items-center justify-center
        rounded-full
        border border-gray-400
        bg-transparent
        transition-all duration-200
        hover:border-blue-500
        hover:bg-blue-500/10
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-500/30

        data-[state=checked]:border-blue-500
        data-[state=checked]:bg-blue-500
        data-[state=checked]:scale-105
        `,
      )}
    >
      <CheckboxPrimitive.Indicator
        className="
          flex items-center justify-center
          text-white
          data-[state=checked]:animate-in
          data-[state=checked]:zoom-in-50
          data-[state=checked]:fade-in
          duration-200
        "
      >
        <Check strokeWidth={3} className="h-2.5 w-2.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
