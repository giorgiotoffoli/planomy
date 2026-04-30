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
import { Textarea } from '@/components/ui/textarea'

export default function CreateTaskForm() {
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
      </FieldSet>
    </FieldGroup>
  )
}
