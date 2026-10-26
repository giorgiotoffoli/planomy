import { useMemo, useState } from 'react'
import { router, Stack } from 'expo-router'
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
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
} from '@planomy/lib/home'
import {
  getHomeUpcomingEntries,
  type UpcomingEntry,
} from '@planomy/lib/home-upcoming'
import type { TaskWithList } from '@planomy/types'
import { AppButton, AppSurface, AppText, EmptyState, SectionHeader } from '@/components/ui/primitives'
import { TaskRow } from '@/components/tasks'
import { CalendarPreviewWidget, FocusWidget, UpcomingWidget } from '@/components/widgets'
import { useHome } from './provider'
import { uncategorizedListIds } from './model'
import { useHomeTheme, spacing } from './theme'
import { useAuth } from '@/lib/auth/AuthProvider'

type Row = { kind: 'task'; task: TaskWithList } | { kind: 'empty'; text: string }
type FeedSection = {
  key: 'tasks' | 'stashed'
  title: string
  subtitle?: string
  count: string
  data: Row[]
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
  } = useHome()
  const colors = useHomeTheme()
  const { lockVault } = useAuth()
  const insets = useSafeAreaInsets()
  const [stashedOpen, setStashedOpen] = useState(false)
  const [eventsOpen, setEventsOpen] = useState(false)
  const [upcomingOpen, setUpcomingOpen] = useState(true)

  const projection = useMemo(() => {
    if (!data) return null
    const definitions = filterHomeTasks(data.tasks, data.preferences, data.categories)
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
      currentOccurrences: data.currentOccurrences,
      upcomingEvents: data.upcomingEvents,
      categories: data.categories,
      preferences: data.preferences,
      day,
      currentTime: now,
    })
    const upcomingTaskIds = new Set(
      upcoming.flatMap((entry) => entry.kind === 'task' ? [entry.task.id] : []),
    )
    const tasks = [...buckets.dueSoon, ...buckets.tasks].filter(
      (task) => !upcomingTaskIds.has(task.id),
    )
    const uncategorized = uncategorizedListIds(data)
    const sources = getHomeSources(data.lists)
    const enabled = sources.filter(
      (source) =>
        getHomeSourceState(
          source,
          data.categories,
          data.preferences,
          source.type === 'list' && uncategorized.has(source.listId),
        ) !== 'disabled',
    ).length
    return { buckets, upcoming, tasks, enabled, sourceCount: sources.length }
  }, [data, day, now])

  const sections = useMemo<FeedSection[]>(() => {
    if (!projection) return []
    return [
      {
        key: 'tasks',
        title: 'Tasks',
        count: String(projection.tasks.length),
        data: projection.tasks.length
          ? projection.tasks.map((task) => ({ kind: 'task' as const, task }))
          : [{ kind: 'empty' as const, text: 'A clear space. Add a task whenever you’re ready.' }],
      },
      {
        key: 'stashed',
        title: 'Stashed',
        subtitle: 'Out of the way. Still in their lists.',
        count: String(projection.buckets.stashed.length),
        data: stashedOpen
          ? projection.buckets.stashed.length
            ? projection.buckets.stashed.map((task) => ({ kind: 'task' as const, task }))
            : [{ kind: 'empty' as const, text: 'Nothing stashed right now.' }]
          : [],
      },
    ]
  }, [projection, stashedOpen])

  function openTask(task: TaskWithList) {
    router.push({ pathname: '/task', params: { id: task.id } })
  }

  function completeTask(task: TaskWithList) {
    const command = { type: 'complete' as const, id: task.id, completed: true, day }
    void run(
      command,
      task.recurrence_rule ? 'Occurrence completed' : 'Task completed',
      { ...command, completed: false },
    )
  }

  function taskActions(task: TaskWithList) {
    if (busy) return
    const choices = [
      'Open task',
      ...(task.stashed ? [] : [task.focused ? 'Remove from Focus' : 'Add to Focus']),
      task.stashed ? 'Unstash task' : 'Stash task',
    ]
    const callbacks = [
      () => openTask(task),
      ...(task.stashed ? [] : [() => void run(
        { type: 'focus', id: task.id, focused: !task.focused },
        task.focused ? 'Removed from Focus' : 'Added to Focus',
      )]),
      () => void run(
        { type: 'stash', id: task.id, stashed: !task.stashed },
        task.stashed ? 'Task unstashed' : 'Task stashed',
        { type: 'stash', id: task.id, stashed: task.stashed },
      ),
    ]
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...choices, 'Cancel'], cancelButtonIndex: choices.length, title: task.title },
        (index) => callbacks[index]?.(),
      )
    } else {
      Alert.alert(task.title, undefined, [
        ...choices.map((text, index) => ({ text, onPress: callbacks[index] })),
        { text: 'Cancel', style: 'cancel' },
      ])
    }
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

  function eventDetails(entry: UpcomingEntry) {
    if (entry.kind !== 'event') return
    Alert.alert(
      entry.event.title,
      [entry.label, entry.time ?? 'All day', entry.event.list?.title, entry.event.location, entry.event.description]
        .filter(Boolean)
        .join('\n'),
    )
  }

  const eventPress = (entry: Extract<UpcomingEntry, { kind: 'event' }>) => eventDetails(entry)

  function renderTask(task: TaskWithList) {
    return (
      <TaskRow
        task={task}
        category={data?.categories.find((item) => item.id === task.category_id)}
        today={day}
        completionDisabled={busy || completionUnavailable(task)}
        onPress={() => openTask(task)}
        onToggleComplete={() => completeTask(task)}
        onActions={() => taskActions(task)}
      />
    )
  }

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${day}T12:00:00`))

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Home', headerLargeTitle: true, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.accent }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="person.crop.circle"
          accessibilityLabel="Home account and privacy information"
          onPress={() => Alert.alert('Private by design', mode === 'preview'
            ? 'You’re exploring sample tasks. Changes stay in memory and are discarded when you leave preview.'
            : 'Your tasks are decrypted only while this vault is unlocked. Locking clears the mobile session copy.')}
        />
        {mode === 'vault' ? <Stack.Toolbar.Button icon="lock.fill" accessibilityLabel="Lock vault" onPress={lockVault} /> : null}
        <Stack.Toolbar.Button icon="plus" accessibilityLabel="Add task" disabled={status !== 'ready'} onPress={() => router.push('/task')} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="archivebox" accessibilityLabel="Open Archive" disabled={status !== 'ready'} onPress={() => router.push('/archive')} />
      </Stack.Toolbar>

      {status === 'ready' && data && projection ? (
        <SectionList
          sections={sections}
          stickySectionHeadersEnabled={false}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.accent} />}
          keyExtractor={(row, index) => row.kind === 'task' ? row.task.id : `empty-${index}`}
          ListHeaderComponent={(
            <View style={styles.headerContent}>
              <AppText variant="footnote" tone="secondary" style={styles.date}>{dateLabel}</AppText>
              {mode === 'preview' ? (
                <AppSurface variant="plain" style={[styles.preview, { backgroundColor: colors.subtle }]}>
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <AppText variant="footnote" weight="600">Sample preview</AppText>
                    <AppText variant="caption" tone="secondary">Changes stay here until you leave.</AppText>
                  </View>
                  <AppButton variant="ghost" title="Leave" onPress={endPreview} />
                </AppSurface>
              ) : null}
              <View style={styles.sourceBar}>
                <AppText variant="footnote" tone="secondary" style={styles.intention}>Make room for your day.</AppText>
                <AppButton
                  variant="secondary"
                  icon={{ ios: 'line.3.horizontal.decrease', android: 'filter_list', web: 'filter_list' }}
                  title={`Sources · ${projection.enabled === projection.sourceCount ? 'All' : `${projection.enabled}/${projection.sourceCount}`}`}
                  accessibilityLabel="Choose Home sources"
                  disabled={busy}
                  onPress={() => router.push('/sources')}
                />
              </View>
              <FocusWidget
                tasks={projection.buckets.focus.slice(0, 3)}
                pinnedTaskCount={projection.buckets.focus.length}
                categories={data.categories}
                today={day}
                busy={busy}
                isTaskCompletionUnavailable={completionUnavailable}
                onTaskPress={openTask}
                onTaskComplete={completeTask}
                onTaskActions={taskActions}
              />
              <UpcomingWidget
                entries={projection.upcoming}
                categories={data.categories}
                today={day}
                busy={busy}
                isTaskCompletionUnavailable={completionUnavailable}
                expanded={upcomingOpen}
                eventsExpanded={eventsOpen}
                onToggleExpanded={() => setUpcomingOpen((value) => !value)}
                onToggleEvents={() => setEventsOpen((value) => !value)}
                onTaskPress={openTask}
                onTaskComplete={completeTask}
                onTaskActions={taskActions}
                onEventPress={eventPress}
              />
              <CalendarPreviewWidget day={day} entries={projection.upcoming} onTaskPress={openTask} onEventPress={eventPress} />
            </View>
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeading}>
              <SectionHeader
                title={section.title}
                subtitle={section.subtitle}
                count={section.count}
                action={section.key === 'stashed' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: stashedOpen }}
                    accessibilityLabel={`${stashedOpen ? 'Hide' : 'Show'} Stashed`}
                    onPress={() => setStashedOpen((value) => !value)}
                    style={styles.sectionAction}
                  >
                    <AppText variant="footnote" tone="accent" weight="600">{stashedOpen ? 'Hide' : 'Show'}</AppText>
                  </Pressable>
                ) : undefined}
              />
            </View>
          )}
          renderItem={({ item }) => item.kind === 'empty'
            ? <AppText variant="footnote" tone="secondary" style={styles.emptyMessage}>{item.text}</AppText>
            : renderTask(item.task)}
        />
      ) : (
        <View style={styles.connection}>
          {status === 'loading' ? <ActivityIndicator size="large" color={colors.accent} /> : (
            <>
              <EmptyState
                title={status === 'error' ? 'Couldn’t load Home' : 'Your day, kept private.'}
                description={status === 'error'
                  ? 'Check your connection and try again.'
                  : 'Native sign-in and vault unlock aren’t connected yet. Your tasks will appear here when that connection is ready.'}
                icon={status === 'error' ? { ios: 'exclamationmark.arrow.trianglehead.2.clockwise.rotate.90', android: 'sync_problem', web: 'sync_problem' } : { ios: 'lock.shield', android: 'lock', web: 'lock' }}
                action={status === 'error'
                  ? <AppButton title="Try again" onPress={() => void refresh()} />
                  : __DEV__ ? <AppButton title="Explore sample Home" onPress={startPreview} /> : undefined}
              />
              {__DEV__ && status === 'blocked' ? <AppText variant="caption" tone="secondary">Sample tasks only · No data is saved</AppText> : null}
            </>
          )}
        </View>
      )}

      {notice ? (
        <View style={[styles.noticePosition, { bottom: insets.bottom + 80 }]} pointerEvents="box-none">
          <AppSurface variant="glass" style={styles.notice}>
            <AppText variant="footnote" style={styles.noticeText} accessibilityLiveRegion="polite">{notice.text}</AppText>
            {notice.undo ? (
              <AppButton variant="ghost" title="Undo" disabled={busy} onPress={() => {
                const undo = notice.undo
                dismissNotice()
                if (undo) void run(undo, 'Change undone')
              }} />
            ) : <AppButton variant="ghost" title="OK" accessibilityLabel="Dismiss message" onPress={dismissNotice} />}
          </AppSurface>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 160, maxWidth: 680, width: '100%', alignSelf: 'center' },
  headerContent: { gap: spacing.xs },
  date: { marginBottom: spacing.sm },
  preview: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  sourceBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.xs },
  intention: { flexShrink: 1 },
  sectionHeading: { paddingTop: spacing.xxl, paddingBottom: spacing.xs },
  sectionAction: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xs },
  emptyMessage: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xs },
  connection: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl, gap: spacing.lg, maxWidth: 480, alignSelf: 'center' },
  noticePosition: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  noticeText: { flex: 1 },
})
