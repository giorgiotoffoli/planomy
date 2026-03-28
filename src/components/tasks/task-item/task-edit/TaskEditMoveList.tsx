'use client'
import {
  DropdownMenuItem,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { List } from '../../types'
import { moveTask } from '../../actions'

export function TaskEditMoveList({
  taskId,
  lists,
  currentListId,
}: {
  taskId: string
  lists: List[]
  currentListId?: string
}) {
  const visibleLists = lists.filter((list) => list.id !== currentListId)

  async function handleSelect(newListId: string) {
    await moveTask(taskId, newListId)
  }

  return (
    <DropdownMenuSubContent>
      {visibleLists.map((list) => (
        <DropdownMenuItem
          key={list.id}
          onSelect={() => void handleSelect(list.id)}
        >
          {list.title}
        </DropdownMenuItem>
      ))}
    </DropdownMenuSubContent>
  )
}
