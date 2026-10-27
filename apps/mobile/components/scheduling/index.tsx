import { StyleSheet, View } from 'react-native'
import type { TimeBlock } from '@planomy/types'
import { getDeadlineLabel, getDueTimeLabel } from '@planomy/lib/home'
import { recurrenceLabel } from '@planomy/lib/recurrence'
import { AppBadge, AppIcon, AppText } from '@/components/ui/primitives'
import { useHomeTheme, spacing, radii } from '@/features/home/theme'

function formatLocalDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function DatePill({
  date,
  label,
  icon = 'calendar',
}: {
  date?: string | null
  label?: string
  icon?: 'calendar' | 'clock' | 'repeat'
}) {
  const colors = useHomeTheme()
  if (!label && !date) return null
  return (
    <View style={[styles.pill, { backgroundColor: colors.subtle }]}>
      <AppIcon
        name={icon === 'clock' ? { ios: 'clock', android: 'schedule', web: 'schedule' } : icon === 'repeat' ? { ios: 'repeat', android: 'repeat', web: 'repeat' } : { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
        size={13}
        color={colors.secondary}
      />
      <AppText variant="caption" tone="secondary" numberOfLines={1}>
        {label ?? formatLocalDate(date!)}
      </AppText>
    </View>
  )
}

export function TimeLabel({ time, accessibilityLabel }: { time?: string | null; accessibilityLabel?: string }) {
  const label = getDueTimeLabel(time ?? null)
  return label ? <AppText variant="caption" tone="secondary" accessibilityLabel={accessibilityLabel ?? `Due at ${label}`}>{label}</AppText> : null
}

export function DateTimeLabel({
  date,
  time,
  label,
}: {
  date?: string | null
  time?: string | null
  label?: string
}) {
  return (
    <View style={styles.inline}>
      {date || label ? <DatePill date={date} label={label} /> : null}
      {time ? <DatePill icon="clock" label={getDueTimeLabel(time) ?? time} /> : null}
    </View>
  )
}

export function DeadlineIndicator({
  dueDate,
  dueTime,
  today,
  label,
}: {
  dueDate?: string | null
  dueTime?: string | null
  today?: string
  label?: string
}) {
  const colors = useHomeTheme()
  if (!label && !dueDate) return null
  const overdue = Boolean(today && dueDate && dueDate < today)
  const dueToday = Boolean(today && dueDate === today)
  const text = label ?? (dueDate && today ? getDeadlineLabel(dueDate, today) : dueDate ? formatLocalDate(dueDate) : '')
  const tone = overdue ? 'danger' : dueToday ? 'accent' : 'secondary'
  return (
    <View style={[styles.deadline, { backgroundColor: overdue ? colors.dangerSubtle : dueToday ? colors.accentSubtle : colors.subtle }]}>
      <AppIcon
        name={{ ios: overdue ? 'exclamationmark.circle' : 'calendar', android: overdue ? 'error_outline' : 'calendar_today', web: overdue ? 'error_outline' : 'calendar_today' }}
        size={13}
        color={overdue ? colors.deadlineOverdue : dueToday ? colors.deadlineToday : colors.deadlineUpcoming}
      />
      <AppText variant="caption" tone={tone}>{text}</AppText>
      {dueTime ? <AppText variant="caption" tone={tone}>· {getDueTimeLabel(dueTime) ?? dueTime}</AppText> : null}
    </View>
  )
}

export function RecurrenceIndicator({ rule }: { rule?: Parameters<typeof recurrenceLabel>[0] | null }) {
  if (!rule) return null
  const label = recurrenceLabel(rule)
  return label ? <DatePill icon="repeat" label={label} /> : null
}

/** A scheduled session is planned time, separate from a task deadline. */
export function ScheduledBlock({ block }: { block: Pick<TimeBlock, 'starts_at' | 'ends_at' | 'status'> }) {
  const colors = useHomeTheme()
  const start = new Date(block.starts_at)
  const end = block.ends_at ? new Date(block.ends_at) : null
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(start)
  const endTime = end ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(end) : null
  return (
    <View style={[styles.scheduled, { backgroundColor: colors.focus }]}>
      <AppIcon name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} size={14} color={colors.accent} />
      <AppText variant="caption" tone="accent" weight="600">Planned · {time}{endTime ? `–${endTime}` : ''}</AppText>
      {block.status === 'skipped' ? <AppBadge>Skipped</AppBadge> : null}
    </View>
  )
}

export function UpcomingGroupHeader({ title, count, overdue = false, subtitle }: { title: string; count?: number; overdue?: boolean; subtitle?: string }) {
  const colors = useHomeTheme()
  return (
    <View style={styles.groupHeader}>
      <AppText variant="footnote" weight="700" tone={overdue ? 'danger' : 'secondary'} accessibilityRole="header">{title}</AppText>
      {count !== undefined ? <AppText variant="caption" tone="muted">{count}</AppText> : null}
      {subtitle ? <AppText variant="caption" tone="secondary" style={styles.groupSubtitle}>{subtitle}</AppText> : null}
      <View style={[styles.groupRule, { backgroundColor: overdue ? colors.dangerSubtle : colors.separator }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  deadline: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  scheduled: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  groupHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs, paddingTop: spacing.lg, paddingBottom: spacing.xs },
  groupSubtitle: { flexBasis: '100%' },
  groupRule: { height: StyleSheet.hairlineWidth, flexBasis: '100%', marginTop: spacing.xs },
})
