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
        variant="default"
        className="rounded-full w-12 h-12 
     
      fixed bottom-0 right-0 m-6 
      
      shadow-lg hover:scale-105 transition 
     
      bg-blue-500 hover:bg-sky-400 hover:cursor-pointer"
      >
        <PlusIcon className="size-6 sm:size-4" />
      </Button>
    </CreateTaskDialog>
  )
}
