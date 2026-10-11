'use client'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { List } from '../../../../types'
import { moveTask } from '../../mutations'
import { Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { ListEmoji } from '@/components/lists/list-emoji'

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
    try { await moveTask(taskId, newListId) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Task was not moved.') }
  }

  return (
    <>
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
          <ListEmoji emoji={list.emoji} />
          {list.title}
        </DropdownMenuItem>
      ))}
    </>
  )
}
