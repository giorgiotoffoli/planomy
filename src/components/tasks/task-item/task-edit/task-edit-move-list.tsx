'use client'
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { Category, List } from '../../../../types'
import {
  moveTask,
  notifyTaskOrganizationChanged,
} from '../../mutations'
import { Check, ListX } from 'lucide-react'
import { toast } from 'sonner'
import { ListEmoji } from '@/components/lists/list-emoji'

export function TaskEditMoveList({
  taskId,
  lists,
  currentListId,
  taskListId,
  taskCategoryId,
  categories = [],
}: {
  taskId: string
  lists: List[]
  currentListId: string | null
  taskListId?: string | null
  taskCategoryId?: string | null
  categories?: Category[]
}) {
  const sourceListId =
    taskListId === undefined ? currentListId : taskListId
  const currentCategoryId = taskCategoryId ?? null
  const visibleLists = lists.filter((list) => list.id !== sourceListId)

  async function handleSelect(
    newListId: string | null,
    newCategoryId: string | null = null,
  ) {
    notifyTaskOrganizationChanged({
      taskId,
      listId: newListId,
      categoryId: newCategoryId,
    })

    try {
      await moveTask(taskId, newListId, newCategoryId)
    } catch (error) {
      notifyTaskOrganizationChanged({
        taskId,
        listId: sourceListId ?? null,
        categoryId: taskCategoryId ?? null,
      })
      toast.error(error instanceof Error ? error.message : 'Task was not moved.')
    }
  }

  return (
    <>
      {sourceListId && (
        <DropdownMenuItem onSelect={() => void handleSelect(null)}>
          <ListX />
          Unsorted
        </DropdownMenuItem>
      )}

      {visibleLists.map((list) => {
        const listCategories = categories
          .filter((category) => category.list_id === list.id)
          .sort((a, b) => a.position - b.position)

        if (listCategories.length === 0) {
          return (
            <DropdownMenuItem
              key={list.id}
              onSelect={() => void handleSelect(list.id)}
            >
              <ListEmoji emoji={list.emoji} />
              {list.title}
            </DropdownMenuItem>
          )
        }

        return (
          <DropdownMenuSub key={list.id}>
            <DropdownMenuSubTrigger>
              <ListEmoji emoji={list.emoji} />
              {list.title}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={() => void handleSelect(list.id)}>
                {currentCategoryId === null && <Check />}
                Uncategorized
              </DropdownMenuItem>
              {listCategories.map((category) => (
                <DropdownMenuItem
                  key={category.id}
                  onSelect={() => void handleSelect(list.id, category.id)}
                >
                  {currentCategoryId === category.id && <Check />}
                  {category.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )
      })}
    </>
  )
}
