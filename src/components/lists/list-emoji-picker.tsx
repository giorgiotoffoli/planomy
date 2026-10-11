'use client'

import { useId, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DEFAULT_LIST_EMOJI,
  LIST_EMOJI_OPTIONS,
  normalizeListEmoji,
} from '@/lib/list-emojis'
import { ListEmoji } from './list-emoji'

export { DEFAULT_LIST_EMOJI }

export function ListEmojiPicker({
  value,
  onChange,
  allowClear = true,
}: {
  value: string | null
  onChange: (value: string | null) => void
  allowClear?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const inputId = useId()

  function selectEmoji(nextValue: string | null) {
    onChange(normalizeListEmoji(nextValue))
    setCustomValue('')
    setOpen(false)
  }

  function applyCustomEmoji() {
    const nextValue = normalizeListEmoji(customValue)
    if (nextValue) selectEmoji(nextValue)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={value ? `Change list icon from ${value}` : 'Choose a list icon'}
          className="text-xl"
        >
          <ListEmoji emoji={value} className="text-xl" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <PopoverHeader className="mb-3">
          <PopoverTitle>List icon</PopoverTitle>
          <PopoverDescription>Choose a quick visual cue for this list.</PopoverDescription>
        </PopoverHeader>
        <div className="grid grid-cols-7 gap-1" role="grid" aria-label="List icons">
          {LIST_EMOJI_OPTIONS.map((emoji) => (
            <Button
              key={emoji}
              type="button"
              variant={value === emoji ? 'secondary' : 'ghost'}
              size="icon-sm"
              className="text-lg"
              onClick={() => selectEmoji(emoji)}
              aria-label={`Use ${emoji} as the list icon`}
              aria-pressed={value === emoji}
            >
              {emoji}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium">
              Paste another emoji
            </label>
            <Input
              id={inputId}
              value={customValue}
              onChange={(event) => setCustomValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  applyCustomEmoji()
                }
              }}
              placeholder="e.g. 🧪"
              maxLength={32}
              aria-label="Custom list emoji"
            />
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            onClick={applyCustomEmoji}
            disabled={!normalizeListEmoji(customValue)}
            aria-label="Use custom emoji"
          >
            <Check />
          </Button>
        </div>
        {allowClear && value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-muted-foreground"
            onClick={() => selectEmoji(null)}
          >
            <X />
            Use the neutral folder icon
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
