import { Button } from '@/components/ui/button'
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

export default function CreateTaskForm() {
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
    </FieldGroup>
  )
}
