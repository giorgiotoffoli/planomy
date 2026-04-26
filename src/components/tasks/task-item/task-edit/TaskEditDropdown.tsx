import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { List, Task } from '@/types'
import { ReactNode } from 'react'
import { TaskEditDialog } from './TaskEditDialog'
import { Edit, ListEnd } from 'lucide-react'
import { TaskEditMoveList } from './TaskEditMoveList'
import { TaskDeleteButton } from './TaskDeleteButton'

export function TaskEditDropdown({
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
