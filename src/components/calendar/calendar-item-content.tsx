import type { CalendarItem } from '@/lib/calendar-items'

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function CalendarItemContent({
  item,
  compact,
}: {
  item: CalendarItem
  compact: boolean
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
    return (
      <div className="planomy-calendar-block-content">
        <div className="planomy-calendar-block-title">
          <span className="planomy-scheduled-task-marker" aria-hidden="true" />
          <span className={item.task.completed ? 'line-through opacity-70' : ''}>
            {item.task.title}
          </span>
        </div>
        {!compact ? (
          <span className="planomy-calendar-block-time">
            {timeLabel(item.startsAt)}
            {item.endsAt ? ` – ${timeLabel(item.endsAt)}` : ''}
          </span>
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
