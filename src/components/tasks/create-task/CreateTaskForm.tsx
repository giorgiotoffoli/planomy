import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { TaskDatePicker } from '../TaskDatePicker'
import { Textarea } from '@/components/ui/textarea'
import TaskListDropdown from '../TaskListDropdown'
import { List } from '@/types'

interface CreateTaskFormProps {
  lists: List[]
  currentListId: string | null
}

export default function CreateTaskForm({
  lists,
  currentListId,
}: CreateTaskFormProps) {
  return (
    <>
      <Field>
        <FieldLegend>New Task</FieldLegend>
        <FieldDescription>What needs to be done?</FieldDescription>
        <FieldLabel htmlFor="title">Title</FieldLabel>
        <Input placeholder="Task title..." name="title" id="title" required />
      </Field>
      <Field>
        <TaskDatePicker taskDate="" />
      </Field>
      <Field>
        <FieldLabel htmlFor="title" className="mt-3">
          Notes
        </FieldLabel>
        <Textarea placeholder="Task notes..." name="notes" />
      </Field>
      <Field>
        <FieldLabel className="mt-3">List</FieldLabel>
        <TaskListDropdown lists={lists} currentListId={currentListId} />
      </Field>
    </>
  )
}
