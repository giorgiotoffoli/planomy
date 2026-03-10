import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'

export default function CreateTaskButton() {
  return (
    <Button type="button" variant="default">
      <PlusIcon /> Add task
    </Button>
  )
}
