'use client'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { deleteTask } from '../../actions'
import { Trash } from 'lucide-react'

export function TaskDeleteButton({ taskId }: { taskId: string }) {
  return (
    <DropdownMenuItem variant="destructive" onSelect={() => deleteTask(taskId)}>
      <Trash />
      Delete
    </DropdownMenuItem>
  )
}
