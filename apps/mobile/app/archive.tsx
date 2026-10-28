import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native'
import { router, Stack } from 'expo-router'
import { AppButton, AppText, EmptyState } from '@/components/ui/primitives'
import { TaskRow } from '@/components/tasks'
import { useHome } from '@/features/home/provider'
import { useHomeTheme, spacing } from '@/features/home/theme'

export default function ArchiveScreen() {
  const { data, status, busy, day, refresh, refreshing, run } = useHome()
  const colors = useHomeTheme()
  const archived = data?.tasks.filter((task) => task.completed) ?? []

  return (
    <>
      <FlatList
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        data={status === 'ready' ? archived : []}
        keyExtractor={(task) => task.id}
        contentContainerStyle={[styles.group, { backgroundColor: colors.surface }]}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        progressViewOffset={spacing.md}
        ListHeaderComponent={(
          <AppText tone="secondary" style={styles.description}>
            Completed tasks stay here until you restore them or delete them.
          </AppText>
        )}
        ListEmptyComponent={status === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
            <AppText tone="secondary">Loading your Archive…</AppText>
          </View>
        ) : status === 'error' ? (
          <EmptyState
            title="Couldn’t load Archive"
            description="Check your connection and try again."
            icon={{ ios: 'exclamationmark.arrow.trianglehead.2.clockwise.rotate.90', android: 'sync_problem', web: 'sync_problem' }}
            action={<AppButton title="Try again" onPress={() => void refresh()} />}
          />
        ) : (
          <EmptyState
            title="Nothing archived"
            description="Tasks you complete will appear here."
            icon={{ ios: 'archivebox', android: 'inventory_2', web: 'inventory_2' }}
          />
        )}
        renderItem={({ item: task }) => (
          <TaskRow
            task={task}
            category={data?.categories.find((category) => category.id === task.category_id)}
            today={day}
            completionDisabled={busy}
            onPress={() => router.push({ pathname: '/task', params: { id: task.id } })}
            onToggleComplete={() => void run(
              { type: 'complete', id: task.id, completed: false, day },
              'Task restored',
            )}
          />
        )}
      />
      <Stack.Screen options={{ title: 'Archive', headerLargeTitleEnabled: true }} />
    </>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  group: { flexGrow: 1, borderRadius: 16, overflow: 'hidden', marginHorizontal: spacing.lg, paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl },
  description: { marginHorizontal: -spacing.md, paddingHorizontal: 0, paddingTop: spacing.lg, paddingBottom: spacing.md },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
})
