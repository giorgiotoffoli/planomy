import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import type { CalendarEventWithList, TaskWithList } from '@planomy/types'
import { AppIcon, AppText } from '@/components/ui/primitives'
import { DeadlineIndicator, DatePill, TimeLabel } from '@/components/scheduling'
import { ListIndicator } from '@/components/lists'
import { useHomeTheme, spacing, radii } from '@/features/home/theme'

export type CalendarPreviewDay = {
  date: string
  taskCount: number
  eventCount: number
}

function localDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function TodayIndicator() {
  const colors = useHomeTheme()
  return (
    <View style={styles.todayIndicator}>
      <View style={[styles.todayDot, { backgroundColor: colors.accent }]} />
      <AppText variant="caption" tone="accent" weight="600">Today</AppText>
    </View>
  )
}

export function CalendarHeader({
  title,
  onPrevious,
  onNext,
  trailing,
}: {
  title: string
  onPrevious?: () => void
  onNext?: () => void
  trailing?: ReactNode
}) {
  const colors = useHomeTheme()
  return (
    <View style={styles.calendarHeader}>
      <AppText variant="title" weight="700" accessibilityRole="header" style={{ flex: 1 }}>{title}</AppText>
      {onPrevious ? <Pressable accessibilityRole="button" accessibilityLabel="Previous period" onPress={onPrevious} style={styles.navButton}><AppIcon name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} color={colors.secondary} /></Pressable> : null}
      {onNext ? <Pressable accessibilityRole="button" accessibilityLabel="Next period" onPress={onNext} style={styles.navButton}><AppIcon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} color={colors.secondary} /></Pressable> : null}
      {trailing}
    </View>
  )
}

export function CalendarDayCell({
  date,
  selected = false,
  today = false,
  taskCount = 0,
  eventCount = 0,
  onPress,
}: CalendarPreviewDay & {
  selected?: boolean
  today?: boolean
  onPress?: () => void
}) {
  const colors = useHomeTheme()
  const dateValue = localDate(date)
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(dateValue)
  const dayNumber = new Intl.DateTimeFormat(undefined, { day: 'numeric' }).format(dateValue)
  const count = taskCount + eventCount
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${weekday}, ${new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(dateValue)}${today ? ', today' : ''}${count ? `, ${count} items` : ''}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.dayCell, selected && { backgroundColor: colors.accent, borderColor: colors.accent }, pressed && { opacity: 0.7 }]}
    >
      <AppText variant="caption" tone={selected ? 'primary' : 'secondary'} style={selected && { color: colors.onAccent }}>{weekday}</AppText>
      <AppText variant="body" weight={selected || today ? '700' : '500'} tone={selected ? 'primary' : today ? 'accent' : 'primary'} style={selected && { color: colors.onAccent }}>{dayNumber}</AppText>
      <View style={styles.dots}>
        {taskCount > 0 ? <View style={[styles.dot, { backgroundColor: selected ? colors.onAccent : colors.accent }]} /> : null}
        {eventCount > 0 ? <View style={[styles.dot, { backgroundColor: selected ? '#BFD0FF' : colors.warning }]} /> : null}
        {count === 0 ? <View style={styles.dotPlaceholder} /> : null}
      </View>
    </Pressable>
  )
}

export function CalendarPreview({
  days,
  selectedDate,
  today,
  onSelectDate,
  children,
}: {
  days: CalendarPreviewDay[]
  selectedDate: string
  today: string
  onSelectDate: (date: string) => void
  children?: ReactNode
}) {
  return (
    <View style={styles.calendarPreview}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
        {days.map((day) => (
          <CalendarDayCell
            key={day.date}
            {...day}
            selected={day.date === selectedDate}
            today={day.date === today}
            onPress={() => onSelectDate(day.date)}
          />
        ))}
      </ScrollView>
      {children}
    </View>
  )
}

export function CalendarEventCard({
  event,
  dateLabel,
  timeLabel,
  onPress,
}: {
  event: CalendarEventWithList
  dateLabel?: string
  timeLabel?: string | null
  onPress?: () => void
}) {
  const colors = useHomeTheme()
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Event, ${event.title}${dateLabel ? `, ${dateLabel}` : ''}${timeLabel ? `, ${timeLabel}` : ', all day'}`} onPress={onPress} style={({ pressed }) => [styles.agendaRow, { borderLeftColor: colors.warning, backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}>
      <AppIcon name={{ ios: 'calendar', android: 'event', web: 'event' }} size={17} color={colors.warning} />
      <View style={styles.agendaCopy}>
        <AppText weight="600" numberOfLines={2}>{event.title}</AppText>
        <View style={styles.agendaMeta}>
          {dateLabel ? <DatePill label={dateLabel} /> : null}
          <DatePill icon="clock" label={timeLabel ?? 'All day'} />
          {event.list ? <ListIndicator list={event.list} compact /> : null}
        </View>
      </View>
    </Pressable>
  )
}

export function CalendarSessionCard({
  task,
  label,
  time,
  onPress,
}: {
  task: TaskWithList
  label: string
  time: string | null
  onPress?: () => void
}) {
  const colors = useHomeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Scheduled task, ${task.title}, ${label}${time ? `, ${time}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.agendaRow, { borderLeftColor: colors.accent, backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}
    >
      <AppIcon name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} size={17} color={colors.accent} />
      <View style={styles.agendaCopy}>
        <AppText weight="600" numberOfLines={2}>{task.title}</AppText>
        <View style={styles.agendaMeta}>
          <DatePill icon="repeat" label={label} />
          <DatePill icon="clock" label={time ?? 'Time not set'} />
          {task.list ? <ListIndicator list={task.list} compact /> : null}
        </View>
      </View>
    </Pressable>
  )
}

export function CalendarTaskCard({
  task,
  dueDate,
  dueTime,
  occurrenceLabel,
  occurrenceTime,
  today,
  onPress,
}: {
  task: TaskWithList
  dueDate?: string | null
  dueTime?: string | null
  occurrenceLabel?: string
  occurrenceTime?: string | null
  today?: string
  onPress?: () => void
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Task, ${task.title}`} onPress={onPress} style={({ pressed }) => [styles.agendaRow, pressed && { opacity: 0.7 }]}>
      <AppIcon name={{ ios: 'checkmark.circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }} size={18} />
      <View style={styles.agendaCopy}>
        <AppText weight="600" numberOfLines={2}>{task.title}</AppText>
        <View style={styles.agendaMeta}>
          {occurrenceLabel ? <DatePill icon="repeat" label={`Occurrence · ${occurrenceLabel}`} /> : <DeadlineIndicator dueDate={dueDate ?? task.due_date} dueTime={dueTime ?? task.due_time} today={today} />}
          {occurrenceLabel && task.due_date ? <DeadlineIndicator dueDate={dueDate ?? task.due_date} dueTime={task.due_time} today={today} /> : null}
          {occurrenceLabel && occurrenceTime && !task.due_date ? <TimeLabel time={occurrenceTime} accessibilityLabel="Due time" /> : null}
          {task.list ? <ListIndicator list={task.list} compact /> : null}
        </View>
      </View>
    </Pressable>
  )
}

export function CalendarAgendaRow(props: {
  kind: 'event'
  event: CalendarEventWithList
  dateLabel?: string
  timeLabel?: string | null
  onPress?: () => void
} | {
  kind: 'task'
  task: TaskWithList
  dueDate?: string | null
  dueTime?: string | null
  occurrenceLabel?: string
  occurrenceTime?: string | null
  today?: string
  onPress?: () => void
}) {
  return props.kind === 'event' ? (
    <CalendarEventCard event={props.event} dateLabel={props.dateLabel} timeLabel={props.timeLabel} onPress={props.onPress} />
  ) : (
    <CalendarTaskCard task={props.task} dueDate={props.dueDate} dueTime={props.dueTime} occurrenceLabel={props.occurrenceLabel} occurrenceTime={props.occurrenceTime} today={props.today} onPress={props.onPress} />
  )
}

const styles = StyleSheet.create({
  todayIndicator: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  todayDot: { width: 7, height: 7, borderRadius: radii.pill },
  calendarHeader: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  navButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  dayCell: { width: 42, minHeight: 68, alignItems: 'center', justifyContent: 'center', gap: spacing.xxs, borderRadius: radii.md, borderWidth: 1, borderColor: 'transparent' },
  dots: { minHeight: 8, flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: radii.pill },
  dotPlaceholder: { width: 5, height: 5, borderRadius: radii.pill, opacity: 0 },
  calendarPreview: { gap: spacing.md },
  days: { flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.xs },
  agendaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, borderRadius: radii.md, borderLeftWidth: 3, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  agendaCopy: { flex: 1, gap: spacing.xs },
  agendaMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
})
