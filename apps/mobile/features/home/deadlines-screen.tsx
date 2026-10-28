import { useMemo } from 'react'
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, View } from 'react-native'
import { router, Stack } from 'expo-router'
import {
  deadlineBucketOrder,
  getDeadlineDateLabel,
  partitionDeadlineTasks,
  type DeadlineBucket,
} from '@planomy/lib/deadlines'
import type { TaskWithList } from '@planomy/types'
import { TaskRow } from '@/components/tasks'
import { AppButton, AppText, EmptyState } from '@/components/ui/primitives'
import { UpcomingGroupHeader } from '@/components/scheduling'
import { useHome } from '@/features/home/provider'
import { useHomeTheme, spacing } from '@/features/home/theme'

const bucketTitles: Record<DeadlineBucket, string> = {
  pastDue: 'Past Due',
  today: 'Today',
  tomorrow: 'Tomorrow',
  thisWeek: 'This Week',
  later: 'Later',
}

export function DeadlinesScreen() {
  const { data, status, busy, day, refreshing, refresh, run } = useHome()
  const colors = useHomeTheme()
  const sections = useMemo(() => {
    if (!data) return []
    const buckets = partitionDeadlineTasks(data.tasks, day)
    return deadlineBucketOrder.flatMap((bucket) => {
      const tasks = buckets[bucket]
      return tasks.length
        ? [{ key: bucket, title: bucketTitles[bucket], bucket, data: tasks.map((task) => ({ task, bucket })) }]
        : []
    })
  }, [data, day])

  function hasCurrentOccurrence(task: TaskWithList) {
    return !task.recurrence_rule || Boolean(data?.currentOccurrences.some((occurrence) =>
      occurrence.task_id === task.id &&
      occurrence.occurrence_date === day &&
      !occurrence.completed &&
      !occurrence.skipped &&
      !occurrence.cancelled,
    ))
  }

  function completeTask(task: TaskWithList) {
    if (busy || !hasCurrentOccurrence(task)) return
    const command = { type: 'complete' as const, id: task.id, completed: true, day }
    void run(command, task.recurrence_rule ? 'Occurrence completed' : 'Task completed', {
      ...command,
      completed: false,
    })
  }

  return (
    <View collapsable={false} style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Deadlines', headerLargeTitleEnabled: true }} />
      {status === 'loading' ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.accent} />
          <AppText tone="secondary">Loading deadlines…</AppText>
        </View>
      ) : status === 'error' || !data ? (
        <EmptyState
          title="Couldn’t load Deadlines"
          description="Check your connection and try again. Your encrypted data stays in the vault."
          icon={{ ios: 'exclamationmark.arrow.trianglehead.2.clockwise.rotate.90', android: 'sync_problem', web: 'sync_problem' }}
          action={<AppButton title="Try again" onPress={() => void refresh()} />}
        />
      ) : (
        <SectionList
          style={styles.screen}
          sections={sections}
          stickySectionHeadersEnabled={false}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.accent} />}
          keyExtractor={(row) => row.task.id}
          renderSectionHeader={({ section }) => (
            <UpcomingGroupHeader
              title={section.title}
              count={section.data.length}
              overdue={section.bucket === 'pastDue'}
            />
          )}
          renderItem={({ item }) => (
            <TaskRow
              task={item.task}
              category={data.categories.find((category) => category.id === item.task.category_id)}
              today={day}
              deadlineLabel={getDeadlineDateLabel(item.task, item.bucket, day) ?? undefined}
              completionDisabled={busy || !hasCurrentOccurrence(item.task)}
              onPress={() => router.push({ pathname: '/task', params: { id: item.task.id } })}
              onToggleComplete={() => completeTask(item.task)}
            />
          )}
          ListEmptyComponent={(
            <EmptyState
              title="No upcoming deadlines"
              description="Tasks with due dates will appear here, grouped by when they’re due."
              icon={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
            />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, flexGrow: 1 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
})
