import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { addCalendarDays, isDateKey } from '@planomy/lib/today'
import { generateOccurrenceDateKeys, recurringSessionTimes } from '@planomy/lib/recurrence'
import type { CalendarEventWithList, TaskWithList } from '@planomy/types'
import { AppButton, AppText, EmptyState } from '@/components/ui/primitives'
import {
  CalendarAgendaRow,
  CalendarHeader,
  CalendarPreview,
  CalendarSessionCard,
  type CalendarPreviewDay,
} from '@/components/calendar'
import { useHome } from '@/features/home/provider'
import { useHomeTheme, spacing } from '@/features/home/theme'
import {
  AndroidMoreHeaderButton,
  AndroidSearchHeaderButton,
  NativeTabToolbar,
} from '@/features/navigation/header-actions'

const AGENDA_DAYS = 14

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

export default function CalendarScreen() {
  const { data, day, status, refresh } = useHome()
  const colors = useHomeTheme()
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>()
  const requestedDate = typeof dateParam === 'string' && isDateKey(dateParam)
    ? dateParam
    : null
  const [selection, setSelection] = useState(() => ({
    day,
    date: requestedDate && requestedDate >= day ? requestedDate : day,
    routeDate: requestedDate,
  }))
  const routeChanged = selection.routeDate !== requestedDate
  const selectedDate = routeChanged
    ? requestedDate && requestedDate >= day ? requestedDate : day
    : selection.day === day ? selection.date : day
  const selectDate = (date: string) => setSelection({ day, date, routeDate: requestedDate })

  const days = useMemo<CalendarPreviewDay[]>(() => {
    if (!data) return []
    return Array.from({ length: AGENDA_DAYS }, (_, index) => {
      const date = addCalendarDays(day, index)
      const taskIds = new Set(data.tasks.filter((task) =>
        !task.completed && !task.stashed && (
          task.recurrence_rule
            ? generateOccurrenceDateKeys(task.recurrence_rule, date, addCalendarDays(date, 1)).includes(date)
            : task.due_date === date
        ),
      ).map((task) => task.id))
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
        <CalendarHeader
          title={selectedDate === day ? 'Today' : dateLabel(selectedDate)}
          trailing={selectedDate === day ? undefined : <AppButton variant="ghost" title="Today" onPress={() => selectDate(day)} />}
        />
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
          <CalendarPreview days={days} selectedDate={selectedDate} today={day} onSelectDate={selectDate}>
            {items.length ? (
            <View style={styles.agenda}>
              {items.map((item) => item.kind === 'event' ? (
                <CalendarAgendaRow
                  key={item.key}
                  kind="event"
                  event={item.event}
                  dateLabel={item.event.all_day ? 'All day' : dateLabel(selectedDate)}
                  timeLabel={eventTime(item.event)}
                  onPress={() => Alert.alert(item.event.title, [
                    item.event.all_day ? 'All day' : eventTime(item.event),
                    item.event.list?.title,
                    item.event.location,
                    item.event.description,
                  ].filter(Boolean).join('\n'))}
                />
              ) : item.kind === 'deadline' ? (
                <CalendarAgendaRow
                  key={item.key}
                  kind="task"
                  task={item.task}
                  today={day}
                  onPress={() => router.push({ pathname: '/task', params: { id: item.task.id } })}
                />
              ) : (
                <CalendarSessionCard
                  key={item.key}
                  task={item.task}
                  label={item.label}
                  time={item.time}
                  onPress={() => router.push({ pathname: '/task', params: { id: item.task.id } })}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="Nothing planned"
              description="Tasks with deadlines, recurring work, planned sessions and events will appear here."
              icon={{ ios: 'calendar', android: 'event', web: 'event' }}
            />
          )}
          </CalendarPreview>
        )}
        {status === 'ready' ? (
          <AppText variant="caption" tone="secondary" style={styles.note}>
            Deadlines, recurring task dates and planned sessions are shown separately. Rescheduling sessions is not available in this alpha.
          </AppText>
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  agenda: { gap: spacing.sm },
  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  note: { paddingHorizontal: spacing.xs, lineHeight: 19 },
})
