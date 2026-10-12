'use client'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { List } from '../../../../types'
import { moveTask } from '../../mutations'
import { ListX } from 'lucide-react'
import { toast } from 'sonner'
import { ListEmoji } from '@/components/lists/list-emoji'

export function TaskEditMoveList({
  taskId,
  lists,
  currentListId,
  taskListId,
}: {
  taskId: string
  lists: List[]
  currentListId: string | null
  taskListId?: string | null
}) {
  const sourceListId = taskListId ?? currentListId
  const visibleLists = lists.filter((list) => list.id !== sourceListId)

  async function handleSelect(newListId: string | null) {
    try { await moveTask(taskId, newListId) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Task was not moved.') }
  }

  return (
    <>
      {sourceListId && (
        <DropdownMenuItem onSelect={() => void handleSelect(null)}>
          <ListX />
          Unsorted
        </DropdownMenuItem>
      )}

      {visibleLists.map((list) => (
        <DropdownMenuItem
          key={list.id}
          onSelect={() => void handleSelect(list.id)}
        >
          <ListEmoji emoji={list.emoji} />
          {list.title}
        </DropdownMenuItem>
      ))}
    </>
  )
}
