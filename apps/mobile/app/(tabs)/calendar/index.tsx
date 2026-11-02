import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { addCalendarDays, isDateKey } from '@planomy/lib/today'
import { generateOccurrenceDateKeys, recurringSessionTimes } from '@planomy/lib/recurrence'
import type { CalendarEventWithList, TaskWithList } from '@planomy/types'
import { AppButton, AppIcon, AppText, EmptyState } from '@/components/ui/primitives'
import type { CalendarPreviewDay } from '@/components/calendar'
import { useHome } from '@/features/home/provider'
import { eventDisplayColor, listIdentityColors, useHomeTheme, spacing } from '@/features/home/theme'
import {
  AndroidMoreHeaderButton,
  AndroidSearchHeaderButton,
  NativeTabToolbar,
} from '@/features/navigation/header-actions'

// The mobile vault source loads calendar data for today and the next 30 days.
const AGENDA_DAYS = 31

type AgendaItem =
  | { kind: 'event'; key: string; startsAt: string; event: CalendarEventWithList }
  | { kind: 'deadline'; key: string; startsAt: string; task: TaskWithList }
  | { kind: 'session'; key: string; startsAt: string; task: TaskWithList; label: string; time: string | null }

function dateLabel(date: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    .format(new Date(`${date}T12:00:00`))
}

function eventDate(event: CalendarEventWithList) {
  if (event.all_day) return event.starts_on
  if (!event.starts_at) return null
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZone: event.time_zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(event.starts_at))
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function eventTime(event: CalendarEventWithList) {
  if (event.all_day || !event.starts_at) return null
  return new Intl.DateTimeFormat(undefined, {
    timeZone: event.time_zone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(event.starts_at))
}

function instantTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function localDate(value: string) {
  const parts = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(value))
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function monthStart(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month - 1, 1, 12)
}

export default function CalendarScreen() {
  const { data, day, status, refresh } = useHome()
  const colors = useHomeTheme()
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>()
  const requestedDate = typeof dateParam === 'string' && isDateKey(dateParam)
    ? dateParam
    : null
  const lastDate = addCalendarDays(day, AGENDA_DAYS - 1)
  const initialDate = requestedDate && requestedDate >= day && requestedDate <= lastDate ? requestedDate : day
  const [selection, setSelection] = useState(() => ({
    day,
    date: initialDate,
    routeDate: requestedDate,
  }))
  const routeChanged = selection.routeDate !== requestedDate
  const selectedDate = routeChanged
    ? initialDate
    : selection.day === day ? selection.date : day
  const selectDate = (date: string) => setSelection({ day, date, routeDate: requestedDate })
  const displayedMonth = monthStart(selectedDate)
  const monthKey = dateKey(displayedMonth).slice(0, 7)
  const lastMonthKey = lastDate.slice(0, 7)
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(2023, 0, 1 + index, 12)),
  )
  const gridStart = addCalendarDays(dateKey(displayedMonth), -displayedMonth.getDay())
  const monthCells = Array.from({ length: 42 }, (_, index) => addCalendarDays(gridStart, index))
  const changeMonth = (offset: number) => {
    const target = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + offset, 1, 12)
    const candidate = dateKey(target)
    selectDate(candidate < day ? day : candidate > lastDate ? lastDate : candidate)
  }

  const days = useMemo<CalendarPreviewDay[]>(() => {
    if (!data) return []
    return Array.from({ length: AGENDA_DAYS }, (_, index) => {
      const date = addCalendarDays(day, index)
      const taskIds = new Set(data.tasks.filter((task) => {
        if (task.completed || task.stashed) return false
        if (!task.recurrence_rule) return task.due_date === date
        const occurrence = data.occurrences.find((item) => item.task_id === task.id && item.occurrence_date === date)
        return !occurrence?.cancelled && !occurrence?.completed && !occurrence?.skipped &&
          generateOccurrenceDateKeys(task.recurrence_rule, date, addCalendarDays(date, 1)).includes(date)
      }).map((task) => task.id))
      for (const block of data.scheduledBlocks) {
        const occurrence = block.occurrence_id
          ? data.occurrences.find((item) => item.id === block.occurrence_id)
          : null
        if (
          block.status === 'scheduled' &&
          block.task &&
          !block.task.completed &&
          localDate(block.starts_at) === date &&
          !occurrence?.cancelled &&
          !occurrence?.completed &&
          !occurrence?.skipped
        ) taskIds.add(block.task_id)
      }
      const taskCount = taskIds.size
      const eventCount = data.upcomingEvents.filter((event) => eventDate(event) === date).length
      return { date, taskCount, eventCount }
    })
  }, [data, day])
  const dayCounts = useMemo(() => new Map(days.map((item) => [item.date, item])), [days])

  const items = useMemo<AgendaItem[]>(() => {
    if (!data) return []
    const result: AgendaItem[] = []
    const occurrenceById = new Map(data.occurrences.map((item) => [item.id, item]))
    const materializedSessions = new Set(
      data.scheduledBlocks
        .filter((block) => block.occurrence_id && block.session_index !== null && block.session_index !== undefined)
        .map((block) => `${block.occurrence_id}:${block.session_index}`),
    )

    for (const event of data.upcomingEvents) {
      if (eventDate(event) !== selectedDate) continue
      result.push({
        kind: 'event',
        key: event.id,
        startsAt: event.starts_at ?? `${event.starts_on ?? selectedDate}T00:00:00`,
        event,
      })
    }

    for (const task of data.tasks) {
      if (task.completed || task.stashed) continue
      if (task.recurrence_rule) {
        const occurrenceDates = generateOccurrenceDateKeys(
          task.recurrence_rule,
          selectedDate,
          addCalendarDays(selectedDate, 1),
        )
        if (!occurrenceDates.includes(selectedDate)) continue
        const occurrence = data.occurrences.find((item) =>
          item.task_id === task.id && item.occurrence_date === selectedDate,
        )
        if (occurrence?.cancelled || occurrence?.completed || occurrence?.skipped) continue
        const displayTask = occurrence?.override_data
          ? {
              ...task,
              title: occurrence.override_data.title ?? task.title,
              notes: occurrence.override_data.notes ?? task.notes,
              list_id: occurrence.override_data.listId ?? task.list_id,
              category_id: occurrence.override_data.categoryId ?? task.category_id,
              due_date: occurrence.override_data.dueDate ?? task.due_date,
              due_time: occurrence.override_data.dueTime ?? task.due_time,
            }
          : task
        const sessions = recurringSessionTimes(task.recurrence_rule, selectedDate)
        if (sessions.length) {
          for (const session of sessions) {
            if (occurrence && materializedSessions.has(`${occurrence.id}:${session.sessionIndex}`)) continue
            result.push({
              kind: 'session',
              key: `${task.id}:${selectedDate}:${session.sessionIndex}`,
              startsAt: session.startsAt,
              task: displayTask,
              label: `Occurrence · ${dateLabel(selectedDate)}`,
              time: instantTime(session.startsAt),
            })
          }
        } else if (!sessions.length) {
          result.push({
            kind: 'session',
            key: `${task.id}:${selectedDate}:occurrence`,
            startsAt: task.due_time ? `${selectedDate}T${task.due_time}` : `${selectedDate}T23:59:00`,
            task: displayTask,
            label: `Occurrence · ${dateLabel(selectedDate)}`,
            time: task.due_time
              ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(`${selectedDate}T${task.due_time}`))
              : null,
          })
        }
      } else if (task.due_date === selectedDate) {
        result.push({
          kind: 'deadline',
          key: task.id,
          startsAt: task.due_time ? `${selectedDate}T${task.due_time}` : `${selectedDate}T23:59:00`,
          task,
        })
      }
    }

    for (const block of data.scheduledBlocks) {
      const occurrence = block.occurrence_id ? occurrenceById.get(block.occurrence_id) : null
      const blockDate = occurrence?.occurrence_date ?? block.starts_at.slice(0, 10)
      if (localDate(block.starts_at) !== selectedDate) continue
      if (block.status !== 'scheduled' || block.task.completed || occurrence?.cancelled || occurrence?.completed || occurrence?.skipped) continue
      if (!block.occurrence_id || block.session_index === null || block.session_index === undefined) {
        result.push({
          kind: 'session',
          key: block.id ?? `${block.task_id}:${block.starts_at}`,
          startsAt: block.starts_at,
          task: block.task,
          label: blockDate === selectedDate ? `Scheduled · ${dateLabel(selectedDate)}` : `Moved from ${dateLabel(blockDate)}`,
          time: instantTime(block.starts_at),
        })
      } else {
        const label = blockDate === selectedDate ? `Scheduled · ${dateLabel(selectedDate)}` : `Moved from ${dateLabel(blockDate)}`
        result.push({
          kind: 'session',
          key: block.id ?? `${block.task_id}:${block.starts_at}`,
          startsAt: block.starts_at,
          task: block.task,
          label,
          time: instantTime(block.starts_at),
        })
      }
    }
    return result.sort((left, right) => left.startsAt.localeCompare(right.startsAt))
  }, [data, selectedDate])

  return (
    <View collapsable={false} style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{
        headerShown: true,
        title: 'Calendar',
        headerLargeTitleEnabled: true,
        headerTintColor: colors.accent,
        ...(Platform.OS === 'android'
          ? {
              headerLeft: () => <AndroidSearchHeaderButton />,
              headerRight: () => <AndroidMoreHeaderButton />,
            }
          : {}),
      }} />
      <NativeTabToolbar />
      <ScrollView style={styles.screen} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {status === 'loading' ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.accent} />
            <AppText tone="secondary">Loading your calendar…</AppText>
          </View>
        ) : status === 'error' ? (
          <EmptyState
            title="Couldn’t load Calendar"
            description="Check your connection and try again. Your encrypted data stays in the vault."
            icon={{ ios: 'exclamationmark.arrow.trianglehead.2.clockwise.rotate.90', android: 'sync_problem', web: 'sync_problem' }}
            action={<AppButton title="Try again" onPress={() => void refresh()} />}
          />
        ) : (
          <View style={styles.calendar}>
            <View style={styles.monthHeader}>
              <AppText variant="heading" weight="600" accessibilityRole="header" style={styles.monthTitle}>
                {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(displayedMonth)}
              </AppText>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous month" disabled={monthKey <= day.slice(0, 7)} onPress={() => changeMonth(-1)} style={[styles.monthButton, monthKey <= day.slice(0, 7) && styles.disabled]}>
                <AppIcon name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={18} color={colors.accent} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Next month" disabled={monthKey >= lastMonthKey} onPress={() => changeMonth(1)} style={[styles.monthButton, monthKey >= lastMonthKey && styles.disabled]}>
                <AppIcon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} color={colors.accent} />
              </Pressable>
            </View>
            <View style={styles.weekdays}>
              {weekdays.map((label, index) => <AppText key={index} variant="caption" tone="secondary" style={styles.weekday}>{label}</AppText>)}
            </View>
            <View style={styles.monthGrid}>
              {monthCells.map((date) => {
                const inMonth = date.slice(0, 7) === monthKey
                const available = inMonth && date >= day && date <= lastDate
                const selected = date === selectedDate
                const count = dayCounts.get(date)
                const itemCount = (count?.taskCount ?? 0) + (count?.eventCount ?? 0)
                return (
                  <Pressable key={date} accessibilityRole="button" accessibilityLabel={`${dateLabel(date)}${date === day ? ', today' : ''}${itemCount ? `, ${itemCount} items` : ''}`} accessibilityState={{ selected, disabled: !available }} disabled={!available} onPress={() => selectDate(date)} style={styles.monthCell}>
                    {inMonth ? <>
                      <View style={[styles.dayNumber, selected && { backgroundColor: colors.accent }]}>
                        <AppText variant="body" weight={date === day || selected ? '700' : '400'} style={[!available && { color: colors.muted, opacity: 0.48 }, selected && { color: colors.onAccent }, date === day && !selected && { color: colors.accent }]}>{Number(date.slice(-2))}</AppText>
                      </View>
                      <View style={[styles.dayDot, { backgroundColor: itemCount ? colors.secondary : 'transparent' }]} />
                    </> : null}
                  </Pressable>
                )
              })}
            </View>
            <View style={[styles.agendaHeader, { borderTopColor: colors.separator }]}>
              <View style={styles.agendaHeadingCopy}>
                <AppText variant="title" weight="600" accessibilityRole="header">{selectedDate === day ? 'Today' : dateLabel(selectedDate)}</AppText>
                <AppText variant="footnote" tone="secondary">{items.length ? `${items.length} ${items.length === 1 ? 'item' : 'items'}` : 'No items planned'}</AppText>
              </View>
              {selectedDate !== day ? <AppButton variant="ghost" title="Today" onPress={() => selectDate(day)} /> : null}
            </View>
            <View style={styles.agenda}>
              {items.map((item) => {
                const event = item.kind === 'event' ? item.event : null
                const task = item.kind === 'event' ? null : item.task
                const label = event ? eventTime(event) ?? 'All day' : item.kind === 'session' ? item.time ?? 'Any time' : task?.due_time ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(`${selectedDate}T${task.due_time}`)) : 'Any time'
                const detail = item.kind === 'event' ? item.event.list?.title ?? 'Event' : item.kind === 'deadline' ? 'Deadline' : item.label
                const color = event ? eventDisplayColor(event, colors.warning) : task?.list?.color ? listIdentityColors[task.list.color] : colors.accent
                const title = event?.title ?? task?.title ?? ''
                return (
                  <Pressable key={`${item.kind}:${item.key}`} accessibilityRole="button" accessibilityLabel={`${title}, ${label}, ${detail}`} onPress={() => event ? Alert.alert(event.title, [event.all_day ? 'All day' : eventTime(event), event.list?.title, event.location, event.description].filter(Boolean).join('\n')) : task && router.push({ pathname: '/task', params: { id: task.id } })} style={({ pressed }) => [styles.agendaRow, pressed && styles.pressed]}>
                    <AppText variant="caption" tone="secondary" style={styles.timeLabel}>{label}</AppText>
                    <View style={[styles.eventBar, { backgroundColor: color }]} />
                    <View style={styles.agendaCopy}>
                      <AppText weight="600" numberOfLines={2}>{title}</AppText>
                      <AppText variant="footnote" tone="secondary" numberOfLines={2}>{detail}</AppText>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )}
        {status === 'ready' ? (
          <AppText variant="caption" tone="secondary" style={styles.note}>
            Calendar shows today and the next 30 days. Rescheduling sessions is not available yet.
          </AppText>
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  calendar: { gap: spacing.sm },
  monthHeader: { flexDirection: 'row', alignItems: 'center' },
  monthTitle: { flex: 1, letterSpacing: -0.3 },
  monthButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  weekdays: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: '14.285714%', minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  dayNumber: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  agendaHeader: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  agendaHeadingCopy: { flex: 1, gap: spacing.xs },
  agenda: { gap: spacing.xs },
  agendaRow: { minHeight: 60, flexDirection: 'row', alignItems: 'stretch', gap: spacing.md, paddingVertical: spacing.sm },
  timeLabel: { width: 64, textAlign: 'right', paddingTop: spacing.xs, fontVariant: ['tabular-nums'] },
  eventBar: { width: 4, borderRadius: 2 },
  agendaCopy: { flex: 1, gap: spacing.xxs },
  pressed: { opacity: 0.65 },
  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  note: { paddingHorizontal: spacing.xs, lineHeight: 19 },
})
