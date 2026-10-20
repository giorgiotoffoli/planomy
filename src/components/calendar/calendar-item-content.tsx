import { Check } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { CalendarItem } from '@/lib/calendar-items'
import { taskDisplayEnd } from '@/lib/calendar-interactions'
import { formatTime, type TimeFormat } from '@/lib/calendar-preferences'

export default function CalendarItemContent({
  item,
  timeFormat,
  compact,
  displayStartsAt,
  displayEndsAt,
  planProgress,
  interactionPreview = false,
  onToggleComplete,
}: {
  item: CalendarItem
  timeFormat: TimeFormat
  compact: boolean
  displayStartsAt?: string
  displayEndsAt?: string | null
  planProgress?: number
  interactionPreview?: boolean
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
      <div
        className="planomy-calendar-block-content"
        style={planProgress === undefined
          ? undefined
          : { '--plan-progress': `${planProgress}%` } as CSSProperties}
      >
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
            {formatTime(startsAt, timeFormat)}
            {` – ${formatTime(displayedEnd.toISOString(), timeFormat)}`}
          </span>
        ) : null}

        {item.sessionState === 'missed' && !compact ? (
          <span className="planomy-calendar-block-status">Missed · choose what’s next</span>
        ) : null}
      </div>
    )
  }

  const { event } = item
  return (
    <div className="planomy-calendar-block-content">
      <div className="planomy-calendar-block-title"><span>{event.title}</span></div>
      {!compact && !event.all_day && event.starts_at && event.ends_at ? (
        <span className="planomy-calendar-block-time">
          {formatTime(event.starts_at, timeFormat)} – {formatTime(event.ends_at, timeFormat)}
        </span>
      ) : null}
    </div>
  )
}
