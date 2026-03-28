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
import { List, Task } from '../../types'
import { TaskEditDialog } from './TaskEditDialog'
import { TaskEditMoveList } from './TaskEditMoveList'
import { TaskDeleteButton } from './TaskDeleteButton'

export async function TaskEditDropdown({
  task,
  lists,
  currentListId,
  children,
}: {
  task: Task
  lists: List[]
  currentListId?: string
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
          <TaskEditMoveList
            taskId={task.id}
            lists={lists}
            currentListId={currentListId}
          />
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <TaskDeleteButton taskId={task.id} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
