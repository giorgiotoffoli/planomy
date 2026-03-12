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

export default function CreateTaskForm() {
  const params = useParams()
  const listId = params.listId as string

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>New Task</FieldLegend>
      </FieldSet>
      <Field>
        <FieldLabel htmlFor="title">Task Title</FieldLabel>
        <FieldDescription>What needs to be done?</FieldDescription>
        <Input placeholder="Go dancing..." name="title" id="title" required />
        {/* Would be cool if this ^ cycles to random tasks */}
      </Field>
      <Field>
        <TaskDatePicker taskDate="" />
      </Field>
      {/* Sees List ID */}
      <Input hidden name="list_id" value={listId} />
    </FieldGroup>
  )
}
