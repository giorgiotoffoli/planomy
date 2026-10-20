'use client'

import { useTransition } from 'react'
import { Check, Paintbrush } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import {
  PLANOMY_LIST_COLORS,
  listColorStyle,
  type ListColor,
} from '@/lib/list-colors'
import { updateListColor } from './actions'
import { notifyListsChanged } from './mutations'

export function ListColorMenu({
  listId,
  color,
  onChange,
}: {
  listId: string
  color: ListColor
  onChange: (color: ListColor) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function changeColor(nextColor: ListColor) {
    if (nextColor === color || isPending) return

    const previous = color
    onChange(nextColor)
    notifyListsChanged({
      listId,
      color: nextColor,
      phase: 'optimistic',
    })
    startTransition(async () => {
      try {
        await updateListColor(listId, nextColor)
        notifyListsChanged()
        router.refresh()
      } catch (cause) {
        onChange(previous)
        notifyListsChanged({
          listId,
          color: previous,
          phase: 'rollback',
        })
        toast.error(
          cause instanceof Error ? cause.message : 'List color was not saved.',
        )
      }
    })
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Paintbrush />
        Color
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-44 p-2">
        <div
          role="group"
          aria-label="List color"
          className="grid grid-cols-5 gap-1.5"
        >
          {PLANOMY_LIST_COLORS.map((option) => {
            const isSelected = color === option.id
            return (
              <button
                key={option.id}
                type="button"
                title={option.label}
                aria-label={`${option.label}${isSelected ? ', selected' : ''}`}
                aria-pressed={isSelected}
                disabled={isPending}
                onClick={() => changeColor(option.id)}
                className="flex size-7 items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-popover transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                style={listColorStyle(option.id)}
              >
                <span
                  className={`flex size-5 items-center justify-center rounded-full bg-(--list-color) ${isSelected ? 'ring-2 ring-foreground/70 ring-offset-1 ring-offset-popover' : ''}`}
                >
                  {isSelected ? (
                    <Check className="size-3.5 stroke-[3] text-white drop-shadow-sm" />
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
