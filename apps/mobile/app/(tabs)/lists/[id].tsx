import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import type { TaskWithList } from '@planomy/types'
import { AppButton, EmptyState, SectionHeader } from '@/components/ui/primitives'
import { TaskRow } from '@/components/tasks'
import { useHome } from '@/features/home/provider'
import { listIdentityColors, useHomeTheme, spacing } from '@/features/home/theme'

function hasCurrentOccurrence(task: TaskWithList, occurrences: NonNullable<ReturnType<typeof useHome>['data']>['currentOccurrences']) {
  return !task.recurrence_rule || occurrences.some((occurrence) =>
    occurrence.task_id === task.id &&
    !occurrence.completed &&
    !occurrence.skipped &&
    !occurrence.cancelled,
  )
}

export default function ListDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>()
  const { data, status, busy, day, refreshing, refresh, run } = useHome()
  const colors = useHomeTheme()
  const unsorted = id === 'unsorted'
  const list = data?.lists.find((item) => item.id === id)
  const exists = unsorted || Boolean(list)
  const listHeaderColor = unsorted ? listIdentityColors.blue : list ? listIdentityColors[list.color] : colors.text
  const tasks = data?.tasks.filter((task) =>
    !task.completed && (unsorted ? !task.list_id : task.list_id === id),
  ) ?? []
  const title = unsorted ? 'Unsorted' : list?.title ?? 'List'

  function completeTask(task: TaskWithList) {
    if (busy || !data || !hasCurrentOccurrence(task, data.currentOccurrences)) return
    const command = { type: 'complete' as const, id: task.id, completed: true, day }
    void run(command, task.recurrence_rule ? 'Occurrence completed' : 'Task completed', {
      ...command,
      completed: false,
    })
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
        <ScrollView
          style={styles.screen}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.accent} />}
        >
          <SectionHeader title="Tasks" subtitle="Open tasks stay here until you complete them." count={tasks.length} />
          {tasks.length ? tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              category={data.categories.find((category) => category.id === task.category_id)}
              showList={false}
              today={day}
              completionDisabled={busy || !hasCurrentOccurrence(task, data.currentOccurrences)}
              onPress={() => router.push({ pathname: '/task', params: { id: task.id } })}
              onToggleComplete={() => completeTask(task)}
            />
          )) : (
            <EmptyState
              title="No open tasks"
              description="New tasks you add to this list will show up here."
              icon={{ ios: 'checkmark.circle', android: 'task_alt', web: 'task_alt' }}
            />
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
