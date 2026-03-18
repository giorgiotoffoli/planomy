import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'

export default function CreateTaskButton() {
  return (
    <Button
      type="button"
      variant="default"
      className="rounded-2xl sm:rounded-md sm:relative fixed bottom-0 right-0 m-6 sm:m-0"
    >
      <PlusIcon />
      <span className="hidden sm:inline ">Add task</span>
    </Button>
  )
}
