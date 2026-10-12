import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import CreateTaskDialog from './create-task-dialog'
import type { Category, List } from '@/types'

interface CreateTaskButtonProps {
  lists: List[]
  categories?: Category[]
  listId: string | null
  categoryId?: string | null
}

export default function CreateTaskButton({
  lists,
  categories,
  listId,
  categoryId,
}: CreateTaskButtonProps) {
  return (
    <CreateTaskDialog
      listId={listId}
      categoryId={categoryId}
      lists={lists}
      categories={categories}
    >
      <Button
        type="button"
        aria-label="Create task"
        variant="default"
        className="absolute bottom-0 right-0 m-6 h-12 w-12 rounded-full bg-blue-500 shadow-lg transition hover:scale-105 hover:cursor-pointer hover:bg-sky-400"
      >
        <PlusIcon className="size-6 sm:size-4" />
      </Button>
    </CreateTaskDialog>
  )
}
