import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'

export default function CreateTaskButton() {
  return (
    <Button
      //   onClick={() => setShowTaskInput(true)}
      className="bg-gray-800 rounded-lg text-sm px-4 py-3 hover:cursor-pointer hover:bg-gray-900 transition-colors duration-200 shadow-lg z-20 w-28 mx-auto mb-24"
    >
      <PlusIcon /> Add task
    </Button>
  )
}
