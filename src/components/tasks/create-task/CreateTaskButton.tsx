import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'

export default function CreateTaskButton() {
  return (
    <Button
      type="button"
      variant="default"
      className="rounded-full w-12 h-12 sm:w-auto sm:h-auto sm:rounded-md sm:relative fixed bottom-0 right-0 my-6 mx-4 sm:mx-0 sm:mt-0 sm:mb-3 shadow-lg hover:scale-105 transition sm:hover:scale-100 bg-blue-500 hover:bg-blue-800"
    >
      <PlusIcon className="size-6 sm:size-4" />
      <span className="hidden sm:inline">Add task</span>
    </Button>
  )
}
