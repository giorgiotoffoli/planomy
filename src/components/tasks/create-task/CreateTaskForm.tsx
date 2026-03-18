import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { TaskDatePicker } from '../TaskDatePicker'
import { useParams } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'

export default function CreateTaskForm() {
  const params = useParams()
  const listId = params.listId as string

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>New Task</FieldLegend>
        <FieldDescription>What needs to be done?</FieldDescription>
        <Field>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input placeholder="Task title..." name="title" id="title" required />
        </Field>
        <Field>
          <TaskDatePicker taskDate="" />
        </Field>
        <Field>
          <FieldLabel htmlFor="title">Notes</FieldLabel>
          <Textarea placeholder="Task notes..." name="notes" />
        </Field>
        {/* Sees List ID we are currently in*/}
        <Input hidden name="list_id" value={listId} />
      </FieldSet>
    </FieldGroup>
  )
}
