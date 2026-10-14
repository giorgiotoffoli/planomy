import { CalendarX, Check, CheckCircle2, Clock3, ExternalLink, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CalendarItem } from '@/lib/calendar-items'
import { taskDisplayEnd } from '@/lib/calendar-interactions'

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function CalendarItemContent({
  item,
  compact,
  displayStartsAt,
  displayEndsAt,
  interactionPreview = false,
  selected = false,
  menuOpen,
  onMenuOpenChange,
  onOpenTask,
  onUnschedule,
  onSetDuration,
  onToggleComplete,
}: {
  item: CalendarItem
  compact: boolean
  displayStartsAt?: string
  displayEndsAt?: string | null
  interactionPreview?: boolean
  selected?: boolean
  menuOpen?: boolean
  onMenuOpenChange?: (open: boolean) => void
  onOpenTask?: () => void
  onUnschedule?: () => void
  onSetDuration?: (minutes: number) => void
  onToggleComplete?: () => void
}) {
  if (item.kind === 'due-task') {
    return (
      <div className={`planomy-due-task ${compact ? 'is-month' : ''}`}>
        <span className="planomy-due-task-marker" aria-hidden="true" />
        <span className="planomy-due-task-title">{item.task.title}</span>
        {!compact && item.dueTimeLabel ? (
          <span className="planomy-due-task-time">{item.dueTimeLabel}</span>
        ) : null}
      </div>
    )
  }

  if (item.kind === 'scheduled-task') {
    const startsAt = displayStartsAt ?? item.startsAt
    const endsAt = displayEndsAt === undefined ? item.endsAt : displayEndsAt
    const displayedEnd = taskDisplayEnd(new Date(startsAt), endsAt ? new Date(endsAt) : null)
    return (
      <div className="planomy-calendar-block-content">
        <div className="planomy-calendar-block-title">
          {onToggleComplete ? (
            <button
              type="button"
              className="planomy-scheduled-task-marker"
              aria-label={`${item.task.completed ? 'Mark incomplete' : 'Complete'} ${item.task.title}`}
              aria-pressed={item.task.completed}
              onMouseDownCapture={(event) => event.stopPropagation()}
              onTouchStartCapture={(event) => event.stopPropagation()}
              onPointerDownCapture={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                onToggleComplete()
              }}
            >
              {item.task.completed ? <Check aria-hidden="true" /> : null}
            </button>
          ) : (
            <span className="planomy-scheduled-task-marker" aria-hidden="true" />
          )}
          <span className={item.task.completed ? 'line-through opacity-70' : ''}>
            {item.task.title}
          </span>
        </div>
        {!compact ? (
          <span className={`planomy-calendar-block-time ${interactionPreview ? 'is-live-preview' : ''}`}>
            {timeLabel(startsAt)}
            {` – ${timeLabel(displayedEnd.toISOString())}`}
          </span>
        ) : null}

        {selected && !compact && onOpenTask && onUnschedule && onSetDuration ? (
          <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="planomy-calendar-task-menu"
                aria-label={`Actions for ${item.task.title}`}
                onMouseDownCapture={(event) => event.stopPropagation()}
                onTouchStartCapture={(event) => event.stopPropagation()}
                onPointerDownCapture={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6}>
              <DropdownMenuItem onSelect={onOpenTask}>
                <ExternalLink /> Open task
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Clock3 /> Set duration
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {[15, 30, 45, 60, 90, 120].map((minutes) => (
                    <DropdownMenuItem key={minutes} onSelect={() => onSetDuration(minutes)}>
                      {minutes < 60
                        ? `${minutes} minutes`
                        : `${minutes / 60} hour${minutes === 60 ? '' : 's'}`}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {onToggleComplete ? (
                <DropdownMenuItem onSelect={onToggleComplete}>
                  <CheckCircle2 />
                  {item.task.completed ? 'Mark incomplete' : 'Complete'}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  // Let Radix finish closing the menu before removing the
                  // event that owns its trigger.
                  window.setTimeout(() => onUnschedule(), 0)
                }}
              >
                <CalendarX /> Unschedule
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    )
  }

  const { event } = item
  return (
    <div className="planomy-calendar-block-content">
      <div className="planomy-calendar-block-title">{event.title}</div>
      {!compact && !event.all_day && event.starts_at && event.ends_at ? (
        <span className="planomy-calendar-block-time">
          {timeLabel(event.starts_at)} – {timeLabel(event.ends_at)}
        </span>
      ) : null}
    </div>
  )
}
