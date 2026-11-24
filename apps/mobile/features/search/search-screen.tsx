import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  SectionList,
  StyleSheet,
  View,
} from 'react-native'
import { router, Stack } from 'expo-router'
import type { CalendarEventWithList, TaskWithList } from '@planomy/types'
import { AppButton, AppIcon, AppText, EmptyState } from '@/components/ui/primitives'
import { useHome } from '@/features/home/provider'
import { spacing, useHomeTheme } from '@/features/home/theme'
import { SearchInput } from './search-input'

type SearchResult =
  | { type: 'task'; task: TaskWithList; key: string; subtitle: string }
  | { type: 'event'; event: CalendarEventWithList; key: string; subtitle: string }

type SearchSection = { title: string; data: SearchResult[] }

function normalizeSearchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
}

function matchesSearch(value: string, terms: string[]) {
  const normalized = normalizeSearchText(value)
  return terms.every((term) => normalized.includes(term))
}

function dateOnlyLabel(value: string | null) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day, 12))
}

function eventDateLabel(event: CalendarEventWithList) {
  if (event.recurrence_rule && !event.occurrence_key) return 'Repeats'
  if (event.all_day) return dateOnlyLabel(event.starts_on) ?? 'All day'
  if (!event.starts_at) {
    return event.recurrence_rule ? 'Repeats' : null
  }
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: event.time_zone,
  }
  if (event.recurrence_rule && !event.occurrence_key) return 'Repeats'
  options.hour = 'numeric'
  options.minute = '2-digit'
  return new Intl.DateTimeFormat(undefined, options).format(new Date(event.starts_at))
}

function eventStartValue(event: CalendarEventWithList) {
  if (event.all_day && event.starts_on) return Date.parse(`${event.starts_on}T00:00:00Z`)
  return event.starts_at ? Date.parse(event.starts_at) : Number.MAX_SAFE_INTEGER
}

function nonEmpty(values: (string | null | undefined)[]) {
  return values.filter((value): value is string => Boolean(value?.trim()))
}

export function SearchScreen() {
  const { data, status, refresh } = useHome()
  const colors = useHomeTheme()
  const [query, setQuery] = useState('')
  const terms = useMemo(
    () => normalizeSearchText(query.trim()).split(/\s+/).filter(Boolean),
    [query],
  )

  const sections = useMemo<SearchSection[]>(() => {
    if (!data || terms.length === 0) return []

    const categoryTitles = new Map(data.categories.map((item) => [item.id, item.title]))
    const listTitles = new Map(data.lists.map((item) => [item.id, item.title]))
    const tasks: SearchResult[] = data.tasks.flatMap((task) => {
      const category = task.category_id ? categoryTitles.get(task.category_id) : null
      const searchable = nonEmpty([
        task.title,
        task.notes,
        task.list?.title,
        category,
        task.completed ? 'Completed' : null,
        task.stashed ? 'Stashed' : null,
        task.recurrence_rule ? 'Repeats' : null,
        task.due_date,
        task.due_date ? dateOnlyLabel(task.due_date) : null,
      ]).join(' ')
      if (!matchesSearch(searchable, terms)) return []

      const details = nonEmpty([
        task.completed ? 'Completed' : task.stashed ? 'Stashed' : null,
        task.list?.title,
        category,
        task.due_date ? `Due ${dateOnlyLabel(task.due_date)}` : null,
        task.due_time ? new Intl.DateTimeFormat(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        }).format(new Date(`2000-01-01T${task.due_time}`)) : null,
        task.recurrence_rule ? 'Repeats' : null,
      ])
      return [{
        type: 'task',
        task,
        key: `task:${task.id}`,
        subtitle: details.join(' · ') || 'Task',
      }]
    })

    const eventCandidates = new Map<string, CalendarEventWithList[]>()
    for (const event of [...data.events, ...data.upcomingEvents]) {
      const seriesId = event.source_event_id ?? event.id
      const candidates = eventCandidates.get(seriesId) ?? []
      candidates.push(event)
      eventCandidates.set(seriesId, candidates)
    }

    const events: SearchResult[] = []
    for (const [seriesId, candidates] of eventCandidates) {
      const searchableCandidates = candidates.filter((event) => {
        const category = event.category_id ? categoryTitles.get(event.category_id) : null
        return matchesSearch(nonEmpty([
          event.title,
          event.description,
          event.location,
          event.list_id ? listTitles.get(event.list_id) ?? event.list?.title : null,
          category,
          event.starts_on,
          event.starts_at,
          eventDateLabel(event),
        ]).join(' '), terms)
      })
      if (searchableCandidates.length === 0) continue

      searchableCandidates.sort((left, right) => eventStartValue(left) - eventStartValue(right))
      const matchedOccurrence = searchableCandidates.find((event) => event.occurrence_key)
      const matchedSeries = searchableCandidates.find((event) => !event.occurrence_key)
      const nextOccurrence = candidates
        .filter((event) => event.occurrence_key)
        .sort((left, right) => eventStartValue(left) - eventStartValue(right))[0]
      const event = matchedOccurrence ?? (matchedSeries ? nextOccurrence ?? matchedSeries : searchableCandidates[0])
      const category = event.category_id ? categoryTitles.get(event.category_id) : null
      const details = nonEmpty([
        eventDateLabel(event),
        event.list_id ? listTitles.get(event.list_id) ?? event.list?.title : null,
        category,
        event.location,
      ])
      events.push({
        type: 'event',
        event,
        key: `event:${seriesId}`,
        subtitle: details.join(' · ') || 'Event',
      })
    }

    tasks.sort((left, right) => left.type === 'task' && right.type === 'task'
      ? left.task.title.localeCompare(right.task.title)
      : 0)
    events.sort((left, right) => left.type === 'event' && right.type === 'event'
      ? eventStartValue(left.event) - eventStartValue(right.event)
      : 0)

    return [
      ...(tasks.length ? [{ title: 'Tasks', data: tasks }] : []),
      ...(events.length ? [{ title: 'Events', data: events }] : []),
    ]
  }, [data, terms])

  function openResult(result: SearchResult) {
    Keyboard.dismiss()
    if (result.type === 'task') {
      router.push({ pathname: '/task', params: { id: result.task.id } })
      return
    }

    const category = result.event.category_id
      ? data?.categories.find((item) => item.id === result.event.category_id)?.title
      : null
    const listTitle = result.event.list_id
      ? data?.lists.find((item) => item.id === result.event.list_id)?.title ?? result.event.list?.title
      : null
    Alert.alert(
      result.event.title,
      nonEmpty([
        result.event.all_day ? `All day · ${dateOnlyLabel(result.event.starts_on) ?? ''}` : eventDateLabel(result.event),
        listTitle,
        category,
        result.event.location,
        result.event.description,
      ]).join('\n'),
    )
  }

  const matchingCount = sections.reduce((count, section) => count + section.data.length, 0)
  const noResultsState = (
    <View style={styles.emptyState}>
      <EmptyState
        icon="magnifyingglass"
        title="No results found"
        description={`Try another title, list, location, or detail for “${query.trim()}”.`}
      />
    </View>
  )

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{
        headerShown: true,
        headerTransparent: false,
        title: 'Search',
        headerLargeTitleEnabled: false,
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
      }} />

      <SearchInput
        autoFocus
        query={query}
        topPadding={spacing.lg}
        onChangeText={setQuery}
      />

      {status === 'loading' && !data ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.accent} size="large" />
          <AppText variant="footnote" tone="secondary">Loading your tasks and events…</AppText>
        </View>
      ) : status === 'error' && !data ? (
        <View style={styles.state}>
          <EmptyState
            title="Search is unavailable"
            description="Your tasks and events couldn’t be loaded. Check your connection and try again."
            action={<AppButton title="Try again" variant="secondary" onPress={() => void refresh()} />}
          />
        </View>
      ) : terms.length === 0 ? (
        <View style={styles.emptySearchState}>
          <View accessible accessibilityLabel="Search tasks and events">
            <AppIcon
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              size={72}
              color={colors.text}
            />
          </View>
        </View>
      ) : matchingCount === 0 ? (
        noResultsState
      ) : (
        <SectionList
          style={styles.resultsList}
          contentContainerStyle={styles.resultsContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          sections={sections}
          keyExtractor={(item) => item.key}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <AppText variant="footnote" tone="secondary" weight="600">{section.title}</AppText>
              <AppText variant="caption" tone="muted">{section.data.length}</AppText>
            </View>
          )}
          renderItem={({ item }) => (
            <SearchResultRow item={item} onPress={() => openResult(item)} />
          )}
          ListHeaderComponent={terms.length > 0 && matchingCount > 0
            ? <AppText variant="caption" tone="secondary" style={styles.resultCount}>
                {matchingCount} {matchingCount === 1 ? 'result' : 'results'}
              </AppText>
            : undefined}
        />
      )}
    </View>
  )
}

function SearchResultRow({ item, onPress }: { item: SearchResult; onPress: () => void }) {
  const colors = useHomeTheme()
  const isTask = item.type === 'task'
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.type === 'task' ? 'Task' : 'Event'}: ${item.type === 'task' ? item.task.title : item.event.title}. ${item.subtitle}`}
        onPress={onPress}
        style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}
      >
        <View style={[styles.resultIcon, { backgroundColor: isTask ? colors.accentSubtle : colors.subtle }]}>
          <AppIcon
            name={isTask
              ? { ios: 'checklist', android: 'checklist', web: 'checklist' }
              : { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
            size={19}
            color={isTask ? colors.accent : colors.secondary}
          />
        </View>
        <View style={styles.resultCopy}>
          <AppText weight="600" numberOfLines={1}>
            {isTask ? item.task.title : item.event.title}
          </AppText>
          <AppText variant="footnote" tone="secondary" numberOfLines={2}>
            {item.subtitle}
          </AppText>
        </View>
        <AppIcon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={15} color={colors.muted} />
      </Pressable>
      <View style={[styles.separator, { backgroundColor: colors.separator }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  resultsList: { flex: 1 },
  resultsContent: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  emptyState: { flex: 1, justifyContent: 'center' },
  emptySearchState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  resultCount: { paddingTop: spacing.xs, paddingBottom: spacing.sm },
  sectionHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  resultRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  resultIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  resultCopy: { flex: 1, gap: spacing.xxs },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 50 },
  pressed: { opacity: 0.62 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
})
