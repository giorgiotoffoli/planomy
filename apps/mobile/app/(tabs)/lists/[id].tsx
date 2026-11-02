import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import type { CalendarEventWithList, Category, TaskWithList } from '@planomy/types'
import {
  AppButton,
  AppDivider,
  AppIcon,
  AppText,
  EmptyState,
} from '@/components/ui/primitives'
import { TaskRow } from '@/components/tasks'
import { useHome } from '@/features/home/provider'
import { getListEvents } from '@/features/home/list-events'
import { eventDisplayColor, listIdentityColors, useHomeTheme, spacing } from '@/features/home/theme'

type ListRowItem = { kind: 'task'; task: TaskWithList } | { kind: 'event'; event: CalendarEventWithList }

type ListTaskSection = {
  key: string
  title: string
  category: Category | null
  taskCount: number
  data: ListRowItem[]
  kind?: 'events'
}

const categoryChevrons = {
  expanded: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  collapsed: {
    ios: 'chevron.right',
    android: 'chevron_right',
    web: 'chevron_right',
  },
} as const

function hasCurrentOccurrence(
  task: TaskWithList,
  occurrences: NonNullable<ReturnType<typeof useHome>['data']>['currentOccurrences'],
) {
  return !task.recurrence_rule || occurrences.some((occurrence) =>
    occurrence.task_id === task.id &&
    !occurrence.completed &&
    !occurrence.skipped &&
    !occurrence.cancelled,
  )
}

export default function ListDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>()
  const { data, status, busy, day, refreshing, refresh, run, animateLayout } = useHome()
  const colors = useHomeTheme()
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})
  const [showHiddenEvents, setShowHiddenEvents] = useState(false)
  const unsorted = id === 'unsorted'
  const list = data?.lists.find((item) => item.id === id)
  const exists = unsorted || Boolean(list)
  const listHeaderColor = unsorted ? listIdentityColors.blue : list ? listIdentityColors[list.color] : colors.text
  const title = unsorted ? 'Unsorted' : list?.title ?? 'List'

  const categories = useMemo(
    () => (data?.categories ?? [])
      .filter((category) => category.list_id === id)
      .sort((left, right) => left.position - right.position),
    [data?.categories, id],
  )
  const tasks = useMemo(
    () => (data?.tasks ?? []).filter((task) =>
      !task.completed && (unsorted ? !task.list_id : task.list_id === id),
    ),
    [data?.tasks, id, unsorted],
  )
  const showCategorySections = !unsorted && categories.length > 0
  const listEvents = useMemo(() => getListEvents(data?.events ?? [], unsorted ? null : id),
  [data?.events, id, unsorted])
  const hiddenEventCount = listEvents.filter((event) => event.show_in_list === false).length
  const visibleEvents = listEvents.filter((event) => event.show_in_list !== false || showHiddenEvents)

  const sections = useMemo<ListTaskSection[]>(() => {
    if (!showCategorySections) {
      return [{ key: 'all', title: '', category: null, taskCount: tasks.length, data: tasks.map((task) => ({ kind: 'task' as const, task })) }]
    }

    const tasksByCategory = new Map(
      categories.map((category) => [category.id, [] as TaskWithList[]]),
    )
    const uncategorizedTasks: TaskWithList[] = []
    for (const task of tasks) {
      const categoryTasks = task.category_id
        ? tasksByCategory.get(task.category_id)
        : undefined
      if (categoryTasks) categoryTasks.push(task)
      else uncategorizedTasks.push(task)
    }
    const categorySections = categories.map((category) => {
      const categoryTasks = tasksByCategory.get(category.id) ?? []
      return {
        key: category.id,
        title: category.title,
        category,
        taskCount: categoryTasks.length,
        data: collapsedCategories[category.id] ? [] : categoryTasks.map((task) => ({ kind: 'task' as const, task })),
      }
    })
    return [
      ...categorySections,
      {
        key: 'uncategorized',
        title: 'Uncategorized',
        category: null,
        taskCount: uncategorizedTasks.length,
        data: collapsedCategories.uncategorized ? [] : uncategorizedTasks.map((task) => ({ kind: 'task' as const, task })),
      },
    ]
  }, [categories, collapsedCategories, showCategorySections, tasks])

  const eventSection: ListTaskSection = {
    key: 'events', kind: 'events', title: 'Events', category: null,
    taskCount: listEvents.length - hiddenEventCount,
    data: collapsedCategories.events ? [] : visibleEvents.map((event) => ({ kind: 'event', event })),
  }

  function completeTask(task: TaskWithList) {
    if (busy || !data || !hasCurrentOccurrence(task, data.currentOccurrences)) return
    const command = { type: 'complete' as const, id: task.id, completed: true, day }
    void run(command, task.recurrence_rule ? 'Occurrence completed' : 'Task completed', {
      ...command,
      completed: false,
    })
  }

  function toggleCategory(sectionKey: string) {
    animateLayout()
    setCollapsedCategories((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }))
  }

  return (
    <View collapsable={false} style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{
        title,
        headerLargeTitleEnabled: true,
        headerLargeTitleStyle: { color: listHeaderColor },
        headerTitleStyle: { color: listHeaderColor },
      }} />
      {status === 'loading' ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : status === 'error' || !data ? (
        <EmptyState
          title="Couldn’t load this list"
          description="Check your connection and try again. Your encrypted data stays in the vault."
          icon={{ ios: 'exclamationmark.arrow.trianglehead.2.clockwise.rotate.90', android: 'sync_problem', web: 'sync_problem' }}
          action={<AppButton title="Try again" onPress={() => void refresh()} />}
        />
      ) : !exists ? (
        <EmptyState title="List not found" description="This list may have been removed." />
      ) : (
        <SectionList<ListRowItem, ListTaskSection>
          style={styles.screen}
          contentInsetAdjustmentBehavior="automatic"
          sections={[eventSection, ...sections]}
          keyExtractor={(item) => item.kind === 'event' ? `event-${item.event.id}` : `task-${item.task.id}`}
          renderSectionHeader={({ section }) => {
            if (section.kind === 'events') return (
              <View style={styles.eventHeading}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Events, ${section.taskCount}, ${collapsedCategories.events ? 'collapsed' : 'expanded'}`} accessibilityState={{ expanded: !collapsedCategories.events }} onPress={() => toggleCategory('events')} style={styles.eventHeadingButton}>
                  <AppIcon name={{ ios: 'calendar', android: 'event', web: 'event' }} color={listHeaderColor} />
                  <AppText variant="title" weight="600" style={styles.categoryTitle}>Events</AppText>
                  <AppText variant="footnote" tone="secondary">{section.taskCount}</AppText>
                  <AppIcon name={collapsedCategories.events ? categoryChevrons.collapsed : categoryChevrons.expanded} size={18} />
                </Pressable>
                {hiddenEventCount > 0 ? <AppButton variant="ghost" title={showHiddenEvents ? 'Hide hidden' : `Show hidden (${hiddenEventCount})`} onPress={() => setShowHiddenEvents((value) => !value)} /> : null}
              </View>
            )
            if (!showCategorySections) return null
            const expanded = !collapsedCategories[section.key]
            const accent = section.category?.color
              ? listIdentityColors[section.category.color]
              : colors.muted
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${section.title}, ${section.taskCount} ${section.taskCount === 1 ? 'task' : 'tasks'}, ${expanded ? 'expanded' : 'collapsed'}`}
                accessibilityState={{ expanded }}
                onPress={() => toggleCategory(section.key)}
                style={({ pressed }) => [styles.categoryHeading, pressed && styles.pressed]}
              >
                <View style={[styles.categoryDot, { backgroundColor: accent }]} />
                <AppText variant="title" weight="600" style={styles.categoryTitle}>
                  {section.title}
                </AppText>
                <AppText variant="footnote" tone="secondary">
                  {section.taskCount}
                </AppText>
                <AppIcon
                  name={expanded ? categoryChevrons.expanded : categoryChevrons.collapsed}
                  size={18}
                  color={colors.secondary}
                />
              </Pressable>
            )
          }}
          renderSectionFooter={({ section }) => (section.kind === 'events' || (showCategorySections && section.key !== 'uncategorized')) ? (
            <View style={styles.categoryDivider}>
              <AppDivider />
            </View>
          ) : undefined}
          renderItem={({ item, index, section }) => item.kind === 'event' ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`${item.event.title}, ${item.event.show_in_list === false ? 'hidden event' : 'event'}`} onPress={() => Alert.alert(item.event.title, [item.event.all_day ? `${item.event.starts_on ?? ''} · All day` : item.event.starts_at ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: item.event.time_zone }).format(new Date(item.event.starts_at)) : 'Event', item.event.recurrence_rule ? 'Repeats' : null, item.event.location, item.event.description, item.event.show_in_list === false ? 'Hidden from Lists' : null].filter(Boolean).join('\n'))} style={({ pressed }) => [styles.eventRow, pressed && styles.pressed]}>
              <View style={styles.eventIcon}><AppIcon name={{ ios: 'calendar', android: 'event', web: 'event' }} size={20} color={eventDisplayColor(item.event, colors.accent)} /></View>
              <View style={styles.eventCopy}>
                <AppText weight="500" numberOfLines={2}>{item.event.title}</AppText>
                <AppText variant="caption" tone="secondary">{item.event.all_day ? `${item.event.starts_on ?? ''} · All day` : item.event.starts_at ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: item.event.time_zone }).format(new Date(item.event.starts_at)) : 'Event'}{item.event.recurrence_rule ? ' · Repeats' : ''}{item.event.show_in_list === false ? ' · Hidden' : ''}</AppText>
              </View>
            </Pressable>
          ) : (
            <TaskRow
              task={item.task}
              category={data.categories.find((category) => category.id === item.task.category_id)}
              metadataAppearance="plain"
              showList={false}
              today={day}
              showDivider={index < section.data.length - 1}
              completionDisabled={busy || !hasCurrentOccurrence(item.task, data.currentOccurrences)}
              onPress={() => router.push({ pathname: '/task', params: { id: item.task.id } })}
              onToggleComplete={() => completeTask(item.task)}
            />
          )}
          ListFooterComponent={tasks.length === 0 ? (
            <EmptyState
              title="No open tasks"
              description="New tasks you add to this list will show up here."
              icon={{ ios: 'checkmark.circle', android: 'task_alt', web: 'task_alt' }}
            />
          ) : undefined}
          contentContainerStyle={styles.content}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.accent}
            />
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  categoryHeading: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.md,
  },
  eventHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  eventHeadingButton: { minHeight: 52, flex: 1, minWidth: 160, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eventRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  eventIcon: { width: 44, alignItems: 'center', justifyContent: 'center' },
  eventCopy: { flex: 1, gap: spacing.xxs },
  categoryDot: { width: 9, height: 9, borderRadius: 5 },
  categoryTitle: { flex: 1 },
  categoryDivider: { paddingVertical: spacing.md },
  pressed: { opacity: 0.68 },
})
