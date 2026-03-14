import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Edit, ListEnd } from 'lucide-react'
import { ReactNode } from 'react'
import { Task } from '../../types'
import { TaskEditDialog } from './TaskEditDialog'
import { TaskEditMoveList } from './TaskEditMoveList'
import { TaskDeleteButton } from './TaskDeleteButton'

export async function TaskEditDropdown({
  task,
  children,
}: {
  task: Task
  children: ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent>
        <TaskEditDialog task={task}>
          <DropdownMenuItem>
            <Edit />
            Edit
          </DropdownMenuItem>
        </TaskEditDialog>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ListEnd />
            Move
          </DropdownMenuSubTrigger>
          <TaskEditMoveList />
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <TaskDeleteButton taskId={task.id} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
