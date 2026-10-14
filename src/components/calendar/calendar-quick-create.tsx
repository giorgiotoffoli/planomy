'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  durationEnd,
  localInputValue,
  resolveLocalCalendarTime,
  taskDisplayEnd,
} from '@/lib/calendar-interactions'
import { MINUTE, SLOT_MINUTES, timeLabel } from '@/lib/agenda'
import type { List } from '@/types'

export type QuickCreateDraft = {
  startsAt: Date
  endsAt: Date | null
  anchor: { x: number; y: number }
  title: string
  listId: string | null
}

export type QuickCreateInput = {
  title: string
  listId: string | null
  startsAt: Date
  endsAt: Date | null
}

const NO_LIST = '__none__'

function rangeLabel(start: Date, end: Date | null) {
  const day = start.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const displayedEnd = taskDisplayEnd(start, end)
  return `${day} · ${timeLabel(start.getTime())}–${timeLabel(displayedEnd.getTime())}`
}

function durationValue(start: Date, end: Date | null) {
  return String(
    end
      ? Math.max(
          SLOT_MINUTES,
          Math.round((end.getTime() - start.getTime()) / MINUTE),
        )
      : SLOT_MINUTES,
  )
}

function rangeKey(start: Date, end: Date | null) {
  return `${start.getTime()}:${end?.getTime() ?? 'default'}`
}

export default function CalendarQuickCreate({
  draft,
  lists,
  onDraftTitleChange,
  onDraftListChange,
  onDraftRangeChange,
  onCancel,
  onCreate,
}: {
  draft: QuickCreateDraft
  lists: List[]
  onDraftTitleChange: (title: string) => void
  onDraftListChange: (listId: string | null) => void
  onDraftRangeChange: (startsAt: Date, endsAt: Date | null) => void
  onCancel: () => void
  onCreate: (input: QuickCreateInput) => Promise<boolean>
}) {
  const initial = localInputValue(draft.startsAt)
  const [title, setTitle] = useState(draft.title)
  const [listId, setListId] = useState(draft.listId ?? NO_LIST)
  const [date, setDate] = useState(initial.date)
  const [startTime, setStartTime] = useState(initial.time)
  const [duration, setDuration] = useState(() =>
    durationValue(draft.startsAt, draft.endsAt),
  )
  const [error, setError] = useState<string | null>(null)
  const draftStart = draft.startsAt.getTime()
  const draftEnd = draft.endsAt?.getTime() ?? null
  const draftRangeKey = rangeKey(draft.startsAt, draft.endsAt)
  const lastPublishedRange = useRef(draftRangeKey)
  const syncingFromDraft = useRef(false)

  useEffect(() => {
    onDraftTitleChange(title)
  }, [onDraftTitleChange, title])

  useEffect(() => {
    if (draftRangeKey === lastPublishedRange.current) return
    const nextStart = new Date(draftStart)
    const nextEnd = draftEnd === null ? null : new Date(draftEnd)
    const nextInput = localInputValue(nextStart)

    syncingFromDraft.current = true
    lastPublishedRange.current = draftRangeKey
    setDate(nextInput.date)
    setStartTime(nextInput.time)
    setDuration(durationValue(nextStart, nextEnd))
    setError(null)
  }, [draftEnd, draftRangeKey, draftStart])

  const resolvedRange = useMemo(() => {
    const minute = Number(startTime.split(':')[1])
    if (!Number.isFinite(minute) || minute % SLOT_MINUTES !== 0) return null
    const start = resolveLocalCalendarTime(date, startTime, draft.startsAt.getTime())
    if (start === null) return null

    const minutes = Number(duration)
    if (
      !Number.isFinite(minutes) ||
      minutes < SLOT_MINUTES ||
      minutes % SLOT_MINUTES !== 0
    ) {
      return null
    }

    return {
      start: new Date(start),
      end: durationEnd(new Date(start), minutes),
    }
  }, [date, draft.startsAt, duration, startTime])

  useEffect(() => {
    if (!resolvedRange) return
    if (syncingFromDraft.current) {
      syncingFromDraft.current = false
      return
    }

    const nextRangeKey = rangeKey(resolvedRange.start, resolvedRange.end)
    if (nextRangeKey === lastPublishedRange.current) return
    lastPublishedRange.current = nextRangeKey
    onDraftRangeChange(resolvedRange.start, resolvedRange.end)
  }, [onDraftRangeChange, resolvedRange])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Add a task name.')
      return
    }
    if (!resolvedRange) {
      setError('Choose a valid time and a duration in 15-minute steps.')
      return
    }

    // The parent installs an optimistic block synchronously. Closing now keeps
    // the popover lightweight while persistence finishes in the background.
    void onCreate({
      title: trimmedTitle,
      listId: listId === NO_LIST ? null : listId,
      startsAt: resolvedRange.start,
      endsAt: resolvedRange.end,
    })
    onCancel()
  }

  return (
    <Popover open onOpenChange={(open) => { if (!open) onCancel() }}>
      <PopoverAnchor asChild>
        <span
          aria-hidden="true"
          className="pointer-events-none fixed z-50 size-px"
          style={{ left: draft.anchor.x, top: draft.anchor.y }}
        />
      </PopoverAnchor>
      <PopoverContent
        data-calendar-quick-create
        align="start"
        side="right"
        sideOffset={10}
        collisionPadding={12}
        className="w-[min(22rem,calc(100vw-1.5rem))] rounded-xl p-4"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          requestAnimationFrame(() => {
            document.querySelector<HTMLInputElement>('[data-calendar-quick-title]')?.focus()
          })
        }}
        onInteractOutside={(event) => {
          const target = event.target
          if (target instanceof Element && target.closest('.planomy-create-draft')) {
            event.preventDefault()
          }
        }}
      >
        <form className="space-y-3" onSubmit={submit}>
          <PopoverHeader>
            <PopoverTitle>New task</PopoverTitle>
            <PopoverDescription>
              {resolvedRange
                ? rangeLabel(resolvedRange.start, resolvedRange.end)
                : 'Choose a valid time range.'}
            </PopoverDescription>
          </PopoverHeader>

          <Input
            data-calendar-quick-title
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setError(null)
            }}
            placeholder="Task name…"
            aria-label="Task name"
            autoComplete="off"
          />

          <Select
            value={listId}
            onValueChange={(value) => {
              setListId(value)
              onDraftListChange(value === NO_LIST ? null : value)
            }}
          >
            <SelectTrigger className="w-full" aria-label="List">
              <SelectValue placeholder="Choose a List" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={NO_LIST}>Unsorted</SelectItem>
              {lists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.emoji ? `${list.emoji} ` : ''}{list.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-[1.25fr_1fr_0.8fr] gap-2">
            <Input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                setError(null)
              }}
              aria-label="Scheduled date"
            />
            <Input
              type="time"
              step={SLOT_MINUTES * 60}
              value={startTime}
              onChange={(event) => {
                setStartTime(event.target.value)
                setError(null)
              }}
              aria-label="Start time"
            />
            <Input
              type="number"
              inputMode="numeric"
              min={SLOT_MINUTES}
              step={SLOT_MINUTES}
              value={duration}
              onChange={(event) => {
                setDuration(event.target.value)
                setError(null)
              }}
              placeholder={String(SLOT_MINUTES)}
              aria-label="Duration in minutes; minimum 15 minutes"
            />
          </div>

          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm">Add task</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
