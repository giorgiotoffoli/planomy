import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import CreateTaskDialog from './CreateTaskDialog'
import { List } from '@/types'

interface CreateTaskButtonProps {
  lists: List[]
  handleOnCreate: (
    title: string,
    dueDate: string,
    notes: string,
    listId: string | null,
  ) => void
  listId: string | null
}

export default function CreateTaskButton({
  handleOnCreate,
  lists,
  listId,
}: CreateTaskButtonProps) {
  return (
    <CreateTaskDialog
      handleOnCreate={handleOnCreate}
      listId={listId}
      lists={lists}
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
