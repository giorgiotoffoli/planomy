import { Checkbox } from '@/components/ui/checkbox'
import { TaskWithList } from '../../../types'

interface TaskCheckboxProps {
  task: TaskWithList
  handleOnComplete: (taskId: string, isCompleted: boolean) => void
}

export function TaskCheckbox({ task, handleOnComplete }: TaskCheckboxProps) {
  return (
    <Checkbox
      className="mr-2 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 border-blue-500"
      checked={task.completed}
      onCheckedChange={(checked) => {
        handleOnComplete(task.id, checked === true)
      }}
    />
  )
}
