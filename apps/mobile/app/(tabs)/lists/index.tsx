import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { router, Stack } from 'expo-router'
import { AppBadge, AppButton, AppText, EmptyState, SectionHeader } from '@/components/ui/primitives'
import { ListRow } from '@/components/lists'
import { useHome } from '@/features/home/provider'
import { useHomeTheme, spacing } from '@/features/home/theme'
import {
  AndroidMoreHeaderButton,
  AndroidSearchHeaderButton,
  NativeTabToolbar,
} from '@/features/navigation/header-actions'

function taskCountLabel(count: number) {
  return `${count} open task${count === 1 ? '' : 's'}`
}

export default function ListsScreen() {
  const { data, status, refreshing, refresh } = useHome()
  const colors = useHomeTheme()
  const unsortedCount = data?.tasks.filter((task) => !task.completed && !task.list_id).length ?? 0

  return (
    <View collapsable={false} style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{
        headerShown: true,
        title: 'Lists',
        headerLargeTitleEnabled: true,
        ...(Platform.OS === 'android'
          ? {
              headerLeft: () => <AndroidSearchHeaderButton />,
              headerRight: () => <AndroidMoreHeaderButton />,
            }
          : {}),
      }} />
      <NativeTabToolbar />
      {status === 'loading' ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.accent} />
          <AppText tone="secondary">Loading your lists…</AppText>
        </View>
      ) : status === 'error' || !data ? (
        <EmptyState
          title="Couldn’t load Lists"
          description="Check your connection and try again. Your encrypted data stays in the vault."
          icon={{ ios: 'exclamationmark.arrow.trianglehead.2.clockwise.rotate.90', android: 'sync_problem', web: 'sync_problem' }}
          action={<AppButton title="Try again" onPress={() => void refresh()} />}
        />
      ) : (
        <ScrollView
          style={styles.screen}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.accent} />}
        >
          <SectionHeader
            title="Your lists"
            subtitle="Find tasks by where they belong."
            count={data.lists.length}
          />
          {data.lists.map((list) => {
            const count = data.tasks.filter((task) => !task.completed && task.list_id === list.id).length
            return (
              <ListRow
                key={list.id}
                list={list}
                subtitle={taskCountLabel(count)}
                trailing={<AppBadge>{count}</AppBadge>}
                onPress={() => router.push({ pathname: '/lists/[id]', params: { id: list.id } })}
              />
            )
          })}
          <SectionHeader title="Unsorted" subtitle="Tasks without a list" />
          <ListRow
            list={{ title: 'Unsorted', emoji: null, color: 'blue' }}
            subtitle={taskCountLabel(unsortedCount)}
            trailing={<AppBadge>{unsortedCount}</AppBadge>}
            onPress={() => router.push({ pathname: '/lists/[id]', params: { id: 'unsorted' } })}
          />
          {!data.lists.length && !unsortedCount ? (
            <AppText style={styles.hint} tone="secondary">
              Add a task with the plus button whenever you’re ready.
            </AppText>
          ) : null}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  hint: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
})
