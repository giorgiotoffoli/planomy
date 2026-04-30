'use client'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Trash } from 'lucide-react'

interface TaskDeleteButtonProps {
  taskId: string
  handleOnDelete: (taskId: string) => void
}

export function TaskDeleteButton({
  taskId,
  handleOnDelete,
}: TaskDeleteButtonProps) {
  return (
    <DropdownMenuItem
      variant="destructive"
      onSelect={() => {
        handleOnDelete(taskId)
      }}
    >
      <Trash />
      Delete
    </DropdownMenuItem>
  )
}
