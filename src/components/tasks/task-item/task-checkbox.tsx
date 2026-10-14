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
      aria-label={`${task.completed ? 'Reopen' : 'Complete'} ${task.title}`}
      checked={task.completed}
      onCheckedChange={(checked) => {
        handleOnComplete(task.id, checked === true)
      }}
      className={cn(
        `
        group/checkbox
        task-checkbox
        relative
        flex h-[1.125rem] w-[1.125rem] shrink-0
        items-center justify-center
        rounded-full
        border border-border
        bg-transparent
        touch-action-manipulation
        transition-[background-color,border-color,transform] duration-200
        hover:border-primary
        hover:bg-primary/10
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-primary/30

        data-[state=checked]:border-primary
        data-[state=checked]:bg-primary
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
        <Check strokeWidth={3} className="h-3 w-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
