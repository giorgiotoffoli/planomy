import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export default function CreateTaskForm() {
  return (
    <FieldGroup>
      <FieldLegend>New Task</FieldLegend>
      <Field>
        <FieldLabel htmlFor="title">List Title</FieldLabel>
        <Input
          placeholder="Homework, Groceries..."
          name="title"
          id="title"
          required
        />
      </Field>
    </FieldGroup>
  )
}
