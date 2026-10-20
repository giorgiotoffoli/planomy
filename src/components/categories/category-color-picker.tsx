'use client'

import { useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  PLANOMY_LIST_COLORS,
  listColorStyle,
  type ListColor,
} from '@/lib/list-colors'

export default function CategoryColorPicker({
  value,
  listColor,
  disabled = false,
  onChange,
}: {
  value: ListColor | null
  listColor: ListColor
  disabled?: boolean
  onChange: (color: ListColor | null) => void
}) {
  const [open, setOpen] = useState(false)
  const label = value ? 'Custom' : "Use this list's color"

  function select(color: ListColor | null) {
    onChange(color)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          className="h-8 max-w-full justify-start gap-2 px-2 text-sm font-normal"
          aria-label={`Category color: ${label}`}
        >
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-full border border-black/10 bg-(--list-color) dark:border-white/20"
            style={listColorStyle(value ?? listColor)}
          />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Palette className="size-4" aria-hidden="true" />
          Category color
        </div>
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => select(null)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className="size-4 shrink-0 rounded-full border border-black/10 bg-(--list-color) dark:border-white/20"
            style={listColorStyle(listColor)}
          />
          <span className="min-w-0 flex-1 truncate">Use this list&apos;s color</span>
          {value === null ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
        </button>
        <div role="group" aria-label="Custom category colors" className="mt-2 grid grid-cols-5 gap-1.5 border-t border-border/60 pt-3">
          {PLANOMY_LIST_COLORS.map((option) => {
            const selected = value === option.id
            return (
              <button
                key={option.id}
                type="button"
                title={option.label}
                aria-label={`${option.label}${selected ? ', selected' : ''}`}
                aria-pressed={selected}
                onClick={() => select(option.id)}
                className="flex size-8 items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-popover transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring"
                style={listColorStyle(option.id)}
              >
                <span className={`flex size-5 items-center justify-center rounded-full bg-(--list-color) ${selected ? 'ring-2 ring-foreground/70 ring-offset-1 ring-offset-popover' : ''}`}>
                  {selected ? <Check className="size-3.5 stroke-[3] text-white drop-shadow-sm" aria-hidden="true" /> : null}
                </span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
