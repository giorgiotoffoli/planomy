'use client'

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { DEFAULT_LIST_EMOJI } from '@/lib/list-emojis'
import { useState } from 'react'
import { ListEmojiPicker } from '../list-emoji-picker'

export default function CreateListForm() {
  const [emoji, setEmoji] = useState<string | null>(DEFAULT_LIST_EMOJI)

  return (
    <FieldGroup>
      <FieldLegend>New List</FieldLegend>
      <Field orientation="horizontal" className="items-center">
        <FieldLabel htmlFor="emoji">Icon</FieldLabel>
        <ListEmojiPicker value={emoji} onChange={setEmoji} />
        <input type="hidden" name="emoji" value={emoji ?? ''} />
      </Field>
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
