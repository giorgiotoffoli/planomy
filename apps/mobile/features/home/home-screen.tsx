import { useEffect, useMemo, useState, type ComponentProps } from 'react'
import { router, Stack } from 'expo-router'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  filterHomeTasks,
  getHomeBuckets,
  getHomeSources,
  getHomeSourceState,
  MAX_FOCUS_TASKS,
} from '@planomy/lib/home'
import {
  getHomeUpcomingEntries,
  UPCOMING_SECTION_LABELS,
  type UpcomingEventEntry,
  type UpcomingSectionKey,
  type UpcomingTaskEntry,
} from '@planomy/lib/home-upcoming'
import type { TaskWithList } from '@planomy/types'
import {
  AppButton,
  AppDivider,
  AppIcon,
  AppSurface,
  AppText,
  EmptyState,
} from '@/components/ui/primitives'
import { TaskRow, TaskRowDivider } from '@/components/tasks'
import { UpcomingGroupHeader } from '@/components/scheduling'
import { useHome } from './provider'
import { uncategorizedListIds } from './model'
import { useHomeTheme, spacing, radii } from './theme'
import { useAuth } from '@/lib/auth/AuthProvider'
import {
  AndroidMoreHeaderButton,
  AndroidSearchHeaderButton,
  NativeTabToolbar,
} from '@/features/navigation/header-actions'
import {
  defaultHomeViewPreferences,
  loadHomeViewPreferences,
  saveHomeViewPreferences,
  type HomeSectionKey,
} from './view-preferences'
import { SourcesBottomSheet } from './sources-bottom-sheet'

type HomeRow =
  | {
      kind: 'task'
      key: string
      task: TaskWithList
      upcoming?: UpcomingTaskEntry
      hideDeadline?: boolean
    }
  | { kind: 'event'; key: string; entry: UpcomingEventEntry }
  | {
      kind: 'upcoming-heading'
      key: string
      section: UpcomingSectionKey
      count: number
    }
  | {
      kind: 'upcoming-toggle'
      key: string
      hiddenCount: number
      expanded: boolean
    }
  | { kind: 'see-all'; key: string }
  | { kind: 'empty'; key: string; text: string }
type FeedSection = { key: HomeSectionKey; data: HomeRow[] }

const sectionLabels: Record<HomeSectionKey, string> = {
  focus: 'Focus',
  upcoming: 'Upcoming',
  tasks: 'Tasks',
  stashed: 'Stashed Tasks',
}

const sectionIcons = {
  focus: { ios: 'star.fill', android: 'star', web: 'star' },
  upcoming: { ios: 'calendar', android: 'event', web: 'event' },
  tasks: { ios: 'checklist', android: 'checklist', web: 'checklist' },
  stashed: { ios: 'archivebox', android: 'inventory_2', web: 'inventory_2' },
} as const

const chevrons = {
  expanded: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  collapsed: {
    ios: 'chevron.right',
    android: 'chevron_right',
    web: 'chevron_right',
  },
} as const

const upcomingSections: UpcomingSectionKey[] = ['overdue', 'today', 'week']

function displayUpcomingDate(entry: UpcomingTaskEntry | UpcomingEventEntry) {
  if (entry.kind === 'task' && entry.section === 'overdue') return entry.label
  if (entry.section === 'today') return 'Today'
  const date = entry.sortKey.slice(0, 10)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

function displayEventTime(entry: UpcomingEventEntry) {
  if (entry.event.all_day || !entry.event.starts_at) return 'All day'
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: entry.event.time_zone,
  }).format(new Date(entry.event.starts_at))
}

function HomeSectionHeader({
  section,
  expanded,
  count,
  onPress,
}: {
  section: HomeSectionKey
  expanded: boolean
  count: string | number
  onPress: () => void
}) {
  const colors = useHomeTheme()
  const iconColors = {
    focus: colors.accent,
    upcoming: colors.homeUpcomingIcon,
    tasks: colors.secondary,
    stashed: colors.muted,
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sectionLabels[section]}, ${count}, ${expanded ? 'expanded' : 'collapsed'}`}
      accessibilityHint={`${expanded ? 'Collapse' : 'Expand'} ${sectionLabels[section]}`}
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sectionToggle,
        pressed && styles.sectionPressed,
      ]}
    >
      <AppIcon
        name={sectionIcons[section]}
        size={18}
        color={iconColors[section]}
      />
      <AppText
        variant="title"
        weight="600"
        tone="primary"
        style={styles.sectionTitle}
      >
        {sectionLabels[section]}
      </AppText>
      <AppIcon
        name={expanded ? chevrons.expanded : chevrons.collapsed}
        size={18}
        color={colors.secondary}
      />
    </Pressable>
  )
}

function AndroidToolbarButton({
  name,
  label,
  onPress,
  disabled = false,
}: {
  name: ComponentProps<typeof AppIcon>['name']
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  const colors = useHomeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.androidToolbarButton,
        { backgroundColor: colors.subtle },
        pressed && !disabled && styles.androidToolbarButtonPressed,
        disabled && styles.androidToolbarButtonDisabled,
      ]}
    >
      <AppIcon name={name} size={22} color={colors.accent} />
    </Pressable>
  )
}

export function HomeScreen() {
  const {
    status,
    data,
    busy,
    day,
    now,
    mode,
    refresh,
    refreshing,
    startPreview,
    endPreview,
    notice,
    dismissNotice,
    run,
    animateLayout,
  } = useHome()
  const colors = useHomeTheme()
  const { lockVault, state: authState } = useAuth()
  const preferencesUserId =
    authState.status === 'unlocked' ? authState.user.id : null
  const insets = useSafeAreaInsets()
  const [expanded, setExpanded] = useState(
    () => defaultHomeViewPreferences().expanded,
  )
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const [sourcesPresented, setSourcesPresented] = useState(false)
  const [preferencesLoadedFor, setPreferencesLoadedFor] = useState<
    string | null
  >(null)
  const viewPreferencesReady =
    !preferencesUserId || preferencesLoadedFor === preferencesUserId

  useEffect(() => {
    if (!preferencesUserId) return

    let active = true
    void loadHomeViewPreferences(preferencesUserId).then((preferences) => {
      if (!active) return
      const loaded = preferences ?? defaultHomeViewPreferences()
      setExpanded(loaded.expanded)
      setShowAllUpcoming(loaded.showAllUpcoming)
      setPreferencesLoadedFor(preferencesUserId)
    })
    return () => {
      active = false
    }
  }, [preferencesUserId])

  useEffect(() => {
    if (!preferencesUserId || preferencesLoadedFor !== preferencesUserId) return
    void saveHomeViewPreferences(preferencesUserId, {
      expanded,
      showAllUpcoming,
    })
  }, [expanded, preferencesLoadedFor, preferencesUserId, showAllUpcoming])

  const projection = useMemo(() => {
    if (!data) return null
    const definitions = filterHomeTasks(
      data.tasks,
      data.preferences,
      data.categories,
    )
    const active = definitions.filter(
      (task) =>
        !task.recurrence_rule ||
        data.currentOccurrences.some(
          (occurrence) =>
            occurrence.task_id === task.id &&
            !occurrence.completed &&
            !occurrence.skipped &&
            !occurrence.cancelled &&
            occurrence.occurrence_date === day,
        ),
    )
    const buckets = getHomeBuckets(active, day)
    const upcoming = getHomeUpcomingEntries({
      tasks: definitions,
      orderedTasks: definitions,
      currentOccurrences: data.currentOccurrences,
      upcomingEvents: data.upcomingEvents,
      categories: data.categories,
      preferences: data.preferences,
      day,
      currentTime: now,
    })
    const uncategorized = uncategorizedListIds(data)
    const sources = getHomeSources(data.lists)
    const visibleListCount = sources.filter(
      (source) =>
        source.type === 'list' &&
        getHomeSourceState(
          source,
          data.categories,
          data.preferences,
          uncategorized.has(source.listId),
        ) !== 'disabled',
    ).length
    return { buckets, upcoming, visibleListCount }
  }, [data, day, now])

  const sections = useMemo<FeedSection[]>(() => {
    if (!projection) return []

    const focusRows: HomeRow[] = projection.buckets.focus.length
      ? projection.buckets.focus.slice(0, MAX_FOCUS_TASKS).map((task) => ({
          kind: 'task',
          key: `focus-${task.id}`,
          task,
          hideDeadline: true,
        }))
      : [
          {
            kind: 'empty',
            key: 'focus-empty',
            text: 'Pick up to three tasks to keep close today.',
          },
        ]

    const upcomingRows: HomeRow[] = []
    if (projection.upcoming.length === 0) {
      upcomingRows.push({
        kind: 'empty',
        key: 'upcoming-empty',
        text: 'Nothing due or planned in the next week.',
      })
    } else {
      const visibleUpcoming = showAllUpcoming
        ? projection.upcoming
        : projection.upcoming.slice(0, 3)

      for (const section of upcomingSections) {
        const entries = visibleUpcoming.filter(
          (entry) => entry.section === section,
        )
        if (entries.length === 0) continue
        const sectionCount = projection.upcoming.filter(
          (entry) => entry.section === section,
        ).length

        upcomingRows.push({
          kind: 'upcoming-heading',
          key: `upcoming-heading-${section}`,
          section,
          count: sectionCount,
        })
        for (const entry of entries) {
          if (entry.kind === 'task') {
            upcomingRows.push({
              kind: 'task',
              key: `upcoming-task-${entry.task.id}`,
              task: entry.task,
              upcoming: entry,
            })
          } else {
            upcomingRows.push({
              kind: 'event',
              key: `upcoming-event-${entry.event.id}`,
              entry,
            })
          }
        }
      }
      if (projection.upcoming.length > 3) {
        upcomingRows.push({
          kind: 'upcoming-toggle',
          key: 'upcoming-toggle',
          hiddenCount: projection.upcoming.length - 3,
          expanded: showAllUpcoming,
        })
      }
      upcomingRows.push({ kind: 'see-all', key: 'upcoming-see-all' })
    }

    const taskRows: HomeRow[] = projection.buckets.tasks.length
      ? projection.buckets.tasks.map((task) => ({
          kind: 'task',
          key: `task-${task.id}`,
          task,
        }))
      : [
          {
            kind: 'empty',
            key: 'tasks-empty',
            text: 'Everything is captured. Use + to add a task.',
          },
        ]
    const stashedRows: HomeRow[] = projection.buckets.stashed.length
      ? projection.buckets.stashed.map((task) => ({
          kind: 'task',
          key: `stashed-${task.id}`,
          task,
        }))
      : [
          {
            kind: 'empty',
            key: 'stashed-empty',
            text: 'Nothing is stashed right now.',
          },
        ]

    return [
      { key: 'focus', data: expanded.focus ? focusRows : [] },
      { key: 'upcoming', data: expanded.upcoming ? upcomingRows : [] },
      { key: 'tasks', data: expanded.tasks ? taskRows : [] },
      { key: 'stashed', data: expanded.stashed ? stashedRows : [] },
    ]
  }, [expanded, projection, showAllUpcoming])

  function toggleSection(section: HomeSectionKey) {
    animateLayout()
    setExpanded((current) => ({ ...current, [section]: !current[section] }))
  }

  function toggleUpcomingItems() {
    animateLayout()
    setShowAllUpcoming((current) => !current)
  }

  function openTask(task: TaskWithList) {
    router.push({ pathname: '/task', params: { id: task.id } })
  }

  function completeTask(task: TaskWithList) {
    const command = {
      type: 'complete' as const,
      id: task.id,
      completed: true,
      day,
    }
    void run(
      command,
      task.recurrence_rule ? 'Occurrence completed' : 'Task completed',
      { ...command, completed: false },
    )
  }

  function completionUnavailable(task: TaskWithList) {
    return Boolean(
      task.recurrence_rule &&
      !data?.currentOccurrences.some(
        (item) =>
          item.task_id === task.id &&
          item.occurrence_date === day &&
          !item.completed &&
          !item.skipped &&
          !item.cancelled,
      ),
    )
  }

  function openCalendarDate(date: string) {
    router.navigate({ pathname: '/(tabs)/calendar', params: { date } })
  }

  function renderTask(
    task: TaskWithList,
    upcoming?: UpcomingTaskEntry,
    hideDeadline = false,
    showDivider = true,
  ) {
    return (
      <TaskRow
        task={task}
        category={data?.categories.find((item) => item.id === task.category_id)}
        today={day}
        metadataAppearance="plain"
        showDivider={showDivider}
        showDeadline={hideDeadline ? false : undefined}
        deadlineLabel={
          upcoming && !task.recurrence_rule
            ? displayUpcomingDate(upcoming)
            : undefined
        }
        deadlineTime={
          upcoming && !task.recurrence_rule ? upcoming.time : undefined
        }
        occurrenceLabel={
          upcoming && task.recurrence_rule
            ? displayUpcomingDate(upcoming)
            : undefined
        }
        occurrenceTime={
          upcoming && task.recurrence_rule ? upcoming.time : undefined
        }
        completionDisabled={busy || completionUnavailable(task)}
        onPress={() => openTask(task)}
        onToggleComplete={() => completeTask(task)}
      />
    )
  }

  function renderRow(row: HomeRow, showDivider: boolean) {
    if (row.kind === 'task') {
      return renderTask(row.task, row.upcoming, row.hideDeadline, showDivider)
    }

    const content = (() => {
      switch (row.kind) {
        case 'event': {
          const { entry } = row
          const date = displayUpcomingDate(entry)
          const time = displayEventTime(entry)
          const metadata = [
            date,
            time,
            entry.event.list?.title ?? 'Unsorted',
          ].join(' · ')
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Event, ${entry.event.title}, ${metadata}`}
              accessibilityHint="Opens this date in Calendar."
              onPress={() => openCalendarDate(entry.sortKey.slice(0, 10))}
              style={({ pressed }) => [
                styles.eventRow,
                pressed && styles.rowPressed,
              ]}
            >
              <AppIcon
                name={{ ios: 'calendar', android: 'event', web: 'event' }}
                size={18}
                color={colors.accent}
              />
              <View style={styles.eventCopy}>
                <AppText variant="body" weight="500" numberOfLines={2}>
                  {entry.event.title}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={2}>
                  {metadata}
                </AppText>
              </View>
              <AppIcon
                name={chevrons.collapsed}
                size={15}
                color={colors.muted}
              />
            </Pressable>
          )
        }
        case 'upcoming-heading':
          return (
            <UpcomingGroupHeader
              title={UPCOMING_SECTION_LABELS[row.section]}
              count={row.count}
              overdue={row.section === 'overdue'}
              compact
            />
          )
        case 'upcoming-toggle':
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                row.expanded
                  ? 'Show fewer upcoming items'
                  : `Show ${row.hiddenCount} more upcoming items`
              }
              accessibilityState={{ expanded: row.expanded }}
              onPress={toggleUpcomingItems}
              style={styles.upcomingToggle}
            >
              <AppText variant="footnote" tone="accent" weight="600">
                {row.expanded ? 'Show less' : `Show more (${row.hiddenCount})`}
              </AppText>
              <AppIcon
                name={row.expanded ? chevrons.expanded : chevrons.collapsed}
                size={15}
                color={colors.accent}
              />
            </Pressable>
          )
        case 'see-all':
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="See all deadlines"
              onPress={() => router.push('/home/deadlines')}
              style={styles.seeAll}
            >
              <AppText variant="footnote" tone="accent" weight="600">
                See all deadlines
              </AppText>
              <AppIcon
                name={chevrons.collapsed}
                size={15}
                color={colors.accent}
              />
            </Pressable>
          )
        case 'empty':
          return (
            <AppText
              variant="footnote"
              tone="secondary"
              style={styles.emptyMessage}
            >
              {row.text}
            </AppText>
          )
      }
    })()

    return (
      <View>
        {content}
        {showDivider && row.kind !== 'empty' ? <TaskRowDivider /> : null}
      </View>
    )
  }

  function getSectionCount(section: FeedSection) {
    return section.key === 'focus'
      ? `${projection?.buckets.focus.length ?? 0} of ${MAX_FOCUS_TASKS}`
      : section.key === 'upcoming'
        ? (projection?.upcoming.length ?? 0)
        : section.key === 'tasks'
          ? (projection?.buckets.tasks.length ?? 0)
          : (projection?.buckets.stashed.length ?? 0)
  }

  return (
    <View
      collapsable={false}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Home',
          headerLargeTitleEnabled: true,
          headerTintColor: colors.accent,
          headerLargeTitleStyle: { color: colors.accent, fontWeight: '700' },
          ...(Platform.OS === 'android'
            ? { headerLeft: () => <AndroidSearchHeaderButton /> }
            : {}),
          headerRight:
            Platform.OS === 'android'
              ? () => (
                  <View style={styles.androidToolbar}>
                    <AndroidToolbarButton
                      name={{
                        ios: 'line.3.horizontal.decrease',
                        android: 'filter_list',
                        web: 'filter_list',
                      }}
                      label="Choose Home sources"
                      disabled={status !== 'ready'}
                      onPress={() => setSourcesPresented(true)}
                    />
                    <AndroidMoreHeaderButton
                      includeArchive
                      archiveDisabled={status !== 'ready'}
                    />
                    {mode === 'vault' ? (
                      <AndroidToolbarButton
                        name={{
                          ios: 'lock.fill',
                          android: 'lock',
                          web: 'lock',
                        }}
                        label="Lock vault"
                        onPress={lockVault}
                      />
                    ) : null}
                  </View>
                )
              : undefined,
        }}
      />

      <NativeTabToolbar
        includeArchive
        archiveDisabled={status !== 'ready'}
        onChooseHomeSources={() => setSourcesPresented(true)}
        homeSourcesDisabled={status !== 'ready'}
      />

      {status === 'ready' && data && projection && !viewPreferencesReady ? (
        <View style={styles.connection}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : status === 'ready' && data && projection ? (
        <SectionList<HomeRow, FeedSection>
          style={styles.screen}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          sections={sections}
          keyExtractor={(row) => row.key}
          renderSectionHeader={({ section }) => (
            <View
              style={[
                styles.sectionHeading,
                section.key === sections[0]?.key && styles.firstSectionHeading,
              ]}
            >
              <HomeSectionHeader
                section={section.key}
                count={getSectionCount(section)}
                expanded={expanded[section.key]}
                onPress={() => toggleSection(section.key)}
              />
            </View>
          )}
          renderSectionFooter={({ section }) =>
            section.key === 'stashed' ? null : (
              <View style={styles.sectionDivider}>
                <AppDivider />
              </View>
            )
          }
          renderItem={({ item, index, section }) =>
            renderRow(item, index < section.data.length - 1)
          }
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={styles.headerContent}>
              <AppText variant="footnote" tone="secondary">
                Showing {projection.visibleListCount}{' '}
                {projection.visibleListCount === 1 ? 'list' : 'lists'}
              </AppText>
              {mode === 'preview' ? (
                <AppSurface
                  variant="plain"
                  style={[styles.preview, { backgroundColor: colors.subtle }]}
                >
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <AppText variant="footnote" weight="600">
                      Sample preview
                    </AppText>
                    <AppText variant="caption" tone="secondary">
                      Changes stay here until you leave.
                    </AppText>
                  </View>
                  <AppButton
                    variant="ghost"
                    title="Leave"
                    onPress={endPreview}
                  />
                </AppSurface>
              ) : null}
            </View>
          }
          contentContainerStyle={[
            styles.content,
            { paddingBottom: spacing.xxl },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.accent}
            />
          }
        />
      ) : (
        <View style={styles.connection}>
          {status === 'loading' ? (
            <ActivityIndicator size="large" color={colors.accent} />
          ) : (
            <>
              <EmptyState
                title={
                  status === 'error'
                    ? 'Couldn’t load Home'
                    : 'Your day, kept private.'
                }
                description={
                  status === 'error'
                    ? 'Check your connection and try again.'
                    : 'Native sign-in and vault unlock aren’t connected yet. Your tasks will appear here when that connection is ready.'
                }
                icon={
                  status === 'error'
                    ? {
                        ios: 'exclamationmark.arrow.trianglehead.2.clockwise.rotate.90',
                        android: 'sync_problem',
                        web: 'sync_problem',
                      }
                    : { ios: 'lock.shield', android: 'lock', web: 'lock' }
                }
                action={
                  status === 'error' ? (
                    <AppButton
                      title="Try again"
                      onPress={() => void refresh()}
                    />
                  ) : __DEV__ ? (
                    <AppButton
                      title="Explore sample Home"
                      onPress={startPreview}
                    />
                  ) : undefined
                }
              />
              {__DEV__ && status === 'blocked' ? (
                <AppText variant="caption" tone="secondary">
                  Sample tasks only · No data is saved
                </AppText>
              ) : null}
            </>
          )}
        </View>
      )}

      <SourcesBottomSheet
        isPresented={sourcesPresented}
        onDismiss={() => setSourcesPresented(false)}
      />

      {notice ? (
        <View
          style={[styles.noticePosition, { bottom: insets.bottom + 80 }]}
          pointerEvents="box-none"
        >
          <AppSurface variant="glass" style={styles.notice}>
            <AppText
              variant="footnote"
              style={styles.noticeText}
              accessibilityLiveRegion="polite"
            >
              {notice.text}
            </AppText>
            {notice.undo ? (
              <AppButton
                variant="ghost"
                title="Undo"
                disabled={busy}
                onPress={() => {
                  const undo = notice.undo
                  dismissNotice()
                  if (undo) void run(undo, 'Change undone')
                }}
              />
            ) : (
              <AppButton
                variant="ghost"
                title="OK"
                accessibilityLabel="Dismiss message"
                onPress={dismissNotice}
              />
            )}
          </AppSurface>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 0,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  headerContent: { gap: spacing.xs, paddingBottom: spacing.xxs },
  preview: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  androidToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.xs,
  },
  androidToolbarButton: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidToolbarButtonPressed: { opacity: 0.72 },
  androidToolbarButtonDisabled: { opacity: 0.45 },
  sectionHeading: { paddingTop: spacing.lg, paddingBottom: spacing.xs },
  firstSectionHeading: { paddingTop: spacing.xs },
  sectionDivider: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
  sectionToggle: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: { flex: 1, letterSpacing: -0.3 },
  sectionPressed: { opacity: 0.68 },
  emptyMessage: { paddingVertical: spacing.md, paddingHorizontal: 44 },
  eventRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  eventCopy: { flex: 1, gap: spacing.xxs },
  rowPressed: { opacity: 0.68 },
  upcomingToggle: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
  },
  seeAll: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  connection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
    gap: spacing.lg,
    maxWidth: 480,
    alignSelf: 'center',
  },
  noticePosition: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  noticeText: { flex: 1 },
})
