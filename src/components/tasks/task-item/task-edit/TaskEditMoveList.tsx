'use client'
import {
  DropdownMenuItem,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { List } from '../../../../types'
import { moveTask } from '../../actions'
import { Inbox } from 'lucide-react'

export function TaskEditMoveList({
  taskId,
  lists,
  currentListId,
}: {
  taskId: string
  lists: List[]
  currentListId: string | null
}) {
  const visibleLists = lists.filter((list) => list.id !== currentListId)

  async function handleSelect(newListId: string | null) {
    await moveTask(taskId, newListId)
  }

  return (
    <DropdownMenuSubContent>
      {currentListId && (
        <DropdownMenuItem onSelect={() => void handleSelect(null)}>
          <Inbox />
          Inbox
        </DropdownMenuItem>
      )}

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
