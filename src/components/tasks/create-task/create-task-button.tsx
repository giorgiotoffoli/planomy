import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import CreateTaskDialog from './create-task-dialog'
import type { Category, List } from '@/types'
import type { TaskCreationView } from '@/lib/task-creation'

interface CreateTaskButtonProps {
  lists: List[]
  categories?: Category[]
  listId: string | null
  categoryId?: string | null
  creationView?: TaskCreationView
}

export default function CreateTaskButton({
  lists,
  categories,
  listId,
  categoryId,
  creationView,
}: CreateTaskButtonProps) {
  return (
    <CreateTaskDialog
      listId={listId}
      categoryId={categoryId}
      creationView={creationView}
      lists={lists}
      categories={categories}
    >
      <Button
        type="button"
        aria-label="Create task"
        data-floating-task-trigger
        variant="default"
        className="floating-task-trigger absolute bottom-0 right-0 m-6 h-12 w-12 rounded-full bg-primary transition hover:scale-105 hover:cursor-pointer hover:bg-accent-hover active:bg-accent-active"
      >
        <PlusIcon className="size-6 sm:size-4" />
      </Button>
    </CreateTaskDialog>
  )
}
