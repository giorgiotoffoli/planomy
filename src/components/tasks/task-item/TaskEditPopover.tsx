import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Task } from '../types'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { TaskDatePicker } from '../TaskDatePicker'
import { TaskDeleteButton } from './TaskDeleteButton'
import { updateTask } from '@/components/tasks/actions'

export function TaskEditPopover({ task }: { task: Task }) {
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="ghost" className="mr-3 cursor-pointer">
          ⋯
        </Button>
      </PopoverTrigger>

      <PopoverContent className="min-w-1/2">
        <PopoverHeader>
          <PopoverTitle className="text-xl font-bold">
            {task.title ? (
              task.title
            ) : (
              <span className="opacity-75 italic font-medium">
                Unnamed task
              </span>
            )}
          </PopoverTitle>
          <PopoverDescription>{task.notes}</PopoverDescription>
        </PopoverHeader>
        <form action={updateTask}>
          <input type="hidden" name="id" value={task.id} />
          <FieldGroup className="gap-4">
            <Field orientation="horizontal">
              <TaskDatePicker taskDate={task.due_date} />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="notes" className="w-1/2">
                Notes
              </FieldLabel>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Task notes..."
                defaultValue={task.notes}
              />
            </Field>
            <Button variant="default" type="submit">
              Save Changes
            </Button>
            <TaskDeleteButton taskId={task.id} />
          </FieldGroup>
        </form>
      </PopoverContent>
    </Popover>
  )
}
