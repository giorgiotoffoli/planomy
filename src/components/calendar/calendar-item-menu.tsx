'use client'

import { CalendarFold, ListTodo, Pencil, Trash2 } from 'lucide-react'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover'
import type { CalendarItem } from '@/lib/calendar-items'

export default function CalendarItemMenu({
  item,
  anchor,
  onOpenChange,
  onEdit,
  onConvert,
  onDelete,
}: {
  item: CalendarItem
  anchor: { x: number; y: number }
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onConvert: () => void
  onDelete: () => void
}) {
  const isEvent = item.kind === 'event'
  const itemLabel = isEvent ? 'event' : 'task'

  return (
    <Popover open onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <span
          aria-hidden="true"
          className="pointer-events-none fixed z-50 size-px"
          style={{ left: anchor.x, top: anchor.y }}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        side="right"
        sideOffset={8}
        collisionPadding={12}
        className="w-48 p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
          onClick={onEdit}
        >
          <Pencil className="size-4 text-muted-foreground" aria-hidden="true" />
          Edit {itemLabel}
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
          onClick={onConvert}
        >
          {isEvent ? (
            <ListTodo className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <CalendarFold className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
          Convert to {isEvent ? 'task' : 'event'}
        </button>
        <div className="my-1 h-px bg-border" />
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete {itemLabel}
        </button>
      </PopoverContent>
    </Popover>
  )
}
