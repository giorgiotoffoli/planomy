import { useMemo, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import type { Category, TaskWithList } from '@planomy/types'
import {
  UPCOMING_SECTION_LABELS,
  type UpcomingEntry,
  type UpcomingSectionKey,
} from '@planomy/lib/home-upcoming'
import { AppIcon, AppSurface, AppText, EmptyState, SectionHeader } from '@/components/ui/primitives'
import { CalendarAgendaRow, CalendarHeader, CalendarPreview, TodayIndicator } from '@/components/calendar'
import { DatePill, UpcomingGroupHeader } from '@/components/scheduling'
import { TaskRow } from '@/components/tasks'
import { getCalendarPreviewDays } from '@/features/home/calendar-preview-model'
import { useHomeTheme, spacing, radii } from '@/features/home/theme'

export function WidgetContainer({
  children,
  variant = 'card',
  style,
}: {
  children: ReactNode
  variant?: 'plain' | 'card' | 'elevated' | 'glass'
  style?: StyleProp<ViewStyle>
}) {
  return <AppSurface variant={variant} style={[styles.widget, style]}>{children}</AppSurface>
}

export function WidgetHeader({
  title,
  subtitle,
  count,
  icon,
  action,
}: {
  title: string
  subtitle?: string
  count?: string | number
  icon?: Parameters<typeof AppIcon>[0]['name']
  action?: ReactNode
}) {
  return <SectionHeader title={title} subtitle={subtitle} count={count} icon={icon} action={action} />
}

export function FocusWidget({
  tasks,
  pinnedTaskCount,
  categories,
  today,
  busy = false,
  isTaskCompletionUnavailable,
  onTaskPress,
  onTaskComplete,
  onTaskActions,
}: {
  tasks: TaskWithList[]
  pinnedTaskCount?: number
  categories: Category[]
  today: string
  busy?: boolean
  isTaskCompletionUnavailable?: (task: TaskWithList) => boolean
  onTaskPress?: (task: TaskWithList) => void
  onTaskComplete?: (task: TaskWithList) => void
  onTaskActions?: (task: TaskWithList) => void
}) {
  const colors = useHomeTheme()
  return (
    <WidgetContainer variant="card" style={styles.focusWidget}>
      <WidgetHeader title="Focus" subtitle="A little space for what matters." count={`${pinnedTaskCount ?? tasks.length} of 3`} icon={{ ios: 'star.fill', android: 'star', web: 'star' }} />
      {tasks.length ? (
        <View style={[styles.focusRows, { backgroundColor: colors.focus }]}>
          {tasks.slice(0, 3).map((task, index) => (
            <View key={task.id}>
              {index > 0 ? <View style={[styles.innerDivider, { backgroundColor: colors.separator }]} /> : null}
              <TaskRow
                task={task}
                category={categories.find((item) => item.id === task.category_id)}
                today={today}
                showDeadline={false}
                completionDisabled={busy || Boolean(isTaskCompletionUnavailable?.(task))}
                onPress={() => onTaskPress?.(task)}
                onToggleComplete={() => onTaskComplete?.(task)}
                onActions={() => onTaskActions?.(task)}
              />
            </View>
          ))}
        </View>
      ) : (
        <EmptyState title="Choose up to three tasks to keep close." icon={{ ios: 'sparkle', android: 'auto_awesome', web: 'auto_awesome' }} />
      )}
    </WidgetContainer>
  )
}

export function UpcomingWidget({
  entries,
  categories,
  today,
  busy = false,
  isTaskCompletionUnavailable,
  expanded = true,
  eventsExpanded = true,
  onToggleExpanded,
  onToggleEvents,
  onTaskPress,
  onTaskComplete,
  onTaskActions,
  onEventPress,
}: {
  entries: UpcomingEntry[]
  categories: Category[]
  today: string
  busy?: boolean
  isTaskCompletionUnavailable?: (task: TaskWithList) => boolean
  expanded?: boolean
  eventsExpanded?: boolean
  onToggleExpanded?: () => void
  onToggleEvents?: () => void
  onTaskPress?: (task: TaskWithList) => void
  onTaskComplete?: (task: TaskWithList) => void
  onTaskActions?: (task: TaskWithList) => void
  onEventPress?: (entry: Extract<UpcomingEntry, { kind: 'event' }>) => void
}) {
  const colors = useHomeTheme()
  const eventCount = entries.filter((entry) => entry.kind === 'event').length
  const toggle = onToggleExpanded ? (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${expanded ? 'Hide' : 'Show'} Upcoming`} onPress={onToggleExpanded} style={styles.widgetAction}>
      <AppText variant="footnote" tone="accent" weight="600">{expanded ? 'Hide' : 'Show'}</AppText>
    </Pressable>
  ) : null
  const sections: UpcomingSectionKey[] = ['overdue', 'today', 'week']
  return (
    <WidgetContainer variant="card">
      <WidgetHeader title="Upcoming" subtitle="Deadlines and events, at a glance." count={entries.length} icon={{ ios: 'calendar', android: 'event', web: 'event' }} action={toggle} />
      {!expanded ? null : entries.length === 0 ? (
        <EmptyState title="A little breathing room." description="Nothing due or planned in the next week." icon={{ ios: 'checkmark.circle', android: 'task_alt', web: 'task_alt' }} />
      ) : (
        <View style={styles.upcomingContent}>
          {eventCount > 0 && onToggleEvents ? (
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: eventsExpanded }} onPress={onToggleEvents} style={styles.eventToggle}>
              <AppText variant="caption" tone="accent" weight="600">{eventsExpanded ? 'Fewer events' : `Show all ${eventCount} events`}</AppText>
              <AppIcon name={{ ios: eventsExpanded ? 'chevron.up' : 'chevron.down', android: eventsExpanded ? 'expand_less' : 'expand_more', web: eventsExpanded ? 'expand_less' : 'expand_more' }} size={15} color={colors.accent} />
            </Pressable>
          ) : null}
          {sections.map((section) => {
            const sectionEntries = entries.filter((entry) => entry.section === section)
            const visible: UpcomingEntry[] = eventsExpanded ? sectionEntries : [
              ...sectionEntries.filter((entry) => entry.kind === 'task'),
              ...sectionEntries.filter((entry) => entry.kind === 'event').slice(0, 1),
            ].sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.tieBreak - b.tieBreak)
            return (
              <View key={section} style={styles.upcomingGroup}>
                <UpcomingGroupHeader title={UPCOMING_SECTION_LABELS[section]} overdue={section === 'overdue'} count={sectionEntries.length} />
                {visible.length ? visible.map((entry) => entry.kind === 'task' ? (
                  <TaskRow
                    key={`task-${entry.task.id}`}
                    task={entry.task}
                    category={categories.find((item) => item.id === entry.task.category_id)}
                    variant="compact"
                    today={today}
                    deadlineLabel={entry.task.recurrence_rule ? undefined : entry.label}
                    deadlineTime={entry.task.recurrence_rule ? undefined : entry.time}
                    occurrenceLabel={entry.task.recurrence_rule ? entry.label : undefined}
                    occurrenceTime={entry.task.recurrence_rule ? entry.time : undefined}
                    completionDisabled={busy || Boolean(isTaskCompletionUnavailable?.(entry.task))}
                    onPress={() => onTaskPress?.(entry.task)}
                    onToggleComplete={() => onTaskComplete?.(entry.task)}
                    onActions={() => onTaskActions?.(entry.task)}
                  />
                ) : (
                  <Pressable key={`event-${entry.event.id}`} accessibilityRole="button" accessibilityLabel={`Event, ${entry.event.title}, ${entry.label}, ${entry.time ?? 'all day'}`} onPress={() => onEventPress?.(entry)} style={[styles.eventRow, { borderBottomColor: colors.separator }]}>
                  <AppIcon name={{ ios: 'calendar', android: 'event', web: 'event' }} color={colors.warning} size={17} />
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <AppText tone="secondary">{entry.event.title}</AppText>
                      <View style={styles.eventMeta}>
                        <DatePill label={entry.label} />
                        <DatePill icon="clock" label={entry.time ?? 'All day'} />
                        {entry.event.list ? <AppText variant="caption" tone="secondary">{entry.event.list.emoji ?? '•'} {entry.event.list.title}</AppText> : null}
                      </View>
                    </View>
                  </Pressable>
                )) : <AppText variant="caption" tone="muted" style={styles.groupEmpty}>{section === 'overdue' ? 'All caught up.' : section === 'today' ? 'A little breathing room.' : 'Nothing coming up yet.'}</AppText>}
              </View>
            )
          })}
        </View>
      )}
    </WidgetContainer>
  )
}

export function TodayWidget({
  day,
  entries,
  onOpen,
}: {
  day: string
  entries: UpcomingEntry[]
  onOpen?: (entry: UpcomingEntry) => void
}) {
  const colors = useHomeTheme()
  const todayEntries = entries.filter((entry) => entry.section === 'today')
  return (
    <WidgetContainer variant="plain">
      <View style={styles.todayHeader}><TodayIndicator /><AppText variant="caption" tone="secondary">{new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(new Date(`${day}T12:00:00`))}</AppText></View>
      {todayEntries.length ? todayEntries.slice(0, 3).map((entry) => (
        <Pressable key={`${entry.kind}-${entry.kind === 'task' ? entry.task.id : entry.event.id}`} onPress={() => onOpen?.(entry)} style={[styles.todayRow, { borderBottomColor: colors.separator }]}>
          <AppText variant="footnote" numberOfLines={1}>{entry.kind === 'task' ? entry.task.title : entry.event.title}</AppText>
          <AppText variant="caption" tone="secondary">{entry.time ?? entry.label}</AppText>
        </Pressable>
      )) : <AppText variant="footnote" tone="secondary">No deadlines or events today.</AppText>}
    </WidgetContainer>
  )
}

export function ListPreviewWidget({
  title,
  tasks,
  children,
  onSeeAll,
  onTaskPress,
}: {
  title: string
  tasks: TaskWithList[]
  children?: ReactNode
  onSeeAll?: () => void
  onTaskPress?: (task: TaskWithList) => void
}) {
  const colors = useHomeTheme()
  return (
    <WidgetContainer variant="card">
      <WidgetHeader title={title} count={tasks.length} action={onSeeAll ? <Pressable accessibilityRole="button" onPress={onSeeAll} style={styles.widgetAction}><AppText variant="footnote" tone="accent">See all</AppText></Pressable> : null} />
      {tasks.length ? tasks.slice(0, 3).map((task) => <TaskRow key={task.id} task={task} showDeadline={false} onPress={() => onTaskPress?.(task)} />) : <AppText variant="footnote" tone="secondary">No tasks in this list yet.</AppText>}
      {children}
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} />
    </WidgetContainer>
  )
}

export function CalendarPreviewWidget({
  day,
  entries,
  onTaskPress,
  onEventPress,
}: {
  day: string
  entries: UpcomingEntry[]
  onTaskPress?: (task: TaskWithList) => void
  onEventPress?: (entry: Extract<UpcomingEntry, { kind: 'event' }>) => void
}) {
  const [selection, setSelection] = useState({ day, date: day })
  const selectedDate = selection.day === day ? selection.date : day
  const colors = useHomeTheme()
  const days = useMemo(() => getCalendarPreviewDays(day, entries), [day, entries])
  const selectedEntries = entries.filter((entry) => entry.sortKey.slice(0, 10) === selectedDate)
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(`${selectedDate}T12:00:00`))
  return (
    <WidgetContainer variant="card">
      <CalendarHeader title="Calendar" trailing={<AppText variant="caption" tone="secondary">{monthLabel}</AppText>} />
      <CalendarPreview days={days} today={day} selectedDate={selectedDate} onSelectDate={(date) => setSelection({ day, date })}>
        {selectedEntries.length ? selectedEntries.slice(0, 3).map((entry) => entry.kind === 'task' ? (
          <CalendarAgendaRow key={`task-${entry.task.id}`} kind="task" task={entry.task} dueDate={entry.task.recurrence_rule ? entry.task.due_date : entry.sortKey.slice(0, 10)} occurrenceLabel={entry.task.recurrence_rule ? entry.label : undefined} dueTime={entry.task.recurrence_rule ? entry.task.due_time : entry.time} occurrenceTime={entry.task.recurrence_rule ? entry.time : undefined} today={day} onPress={() => onTaskPress?.(entry.task)} />
        ) : (
          <CalendarAgendaRow key={`event-${entry.event.id}`} kind="event" event={entry.event} dateLabel={entry.label} timeLabel={entry.time} onPress={() => onEventPress?.(entry)} />
        )) : (
          <View style={[styles.noCalendarItems, { backgroundColor: colors.subtle }]}>
            <AppText variant="caption" tone="secondary">Nothing scheduled or due on this day.</AppText>
          </View>
        )}
      </CalendarPreview>
    </WidgetContainer>
  )
}

const styles = StyleSheet.create({
  widget: { gap: spacing.md, marginTop: spacing.lg },
  focusWidget: { marginTop: spacing.sm },
  focusRows: { overflow: 'hidden', borderRadius: radii.md, paddingHorizontal: spacing.sm },
  innerDivider: { height: StyleSheet.hairlineWidth, marginLeft: 48 },
  widgetAction: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  upcomingContent: { gap: spacing.sm },
  eventToggle: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', paddingHorizontal: spacing.xs },
  upcomingGroup: { gap: spacing.xs },
  groupEmpty: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  eventRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  eventMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  todayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  todayRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  noCalendarItems: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.md },
})
