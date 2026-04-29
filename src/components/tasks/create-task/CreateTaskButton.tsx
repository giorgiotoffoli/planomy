import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import CreateTaskDialog from './CreateTaskDialog'

export default function CreateTaskButton() {
  return (
    <CreateTaskDialog>
      <Button
        type="button"
        variant="default"
        className="rounded-full w-12 h-12 
     
      fixed bottom-0 right-0 m-6 
      
      shadow-lg hover:scale-105 transition 
     
      bg-blue-500 hover:bg-blue-800 hover:cursor-pointer"
      >
        <PlusIcon className="size-6 sm:size-4" />
      </Button>
    </CreateTaskDialog>
  )
}
