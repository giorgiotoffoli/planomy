import { router, Stack } from 'expo-router'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native'
import { getHomeListState, isHomeCategoryEnabled } from '@planomy/lib/home'
import { AppText } from '@/components/ui/primitives'
import { CategoryIndicator, ListIndicator } from '@/components/lists'
import { uncategorizedListIds } from './model'
import { useHome } from './provider'
import { useHomeTheme } from './theme'

export function SourcesScreen() {
  const { data, busy, run } = useHome()
  const colors = useHomeTheme()
  if (!data) return null
  const uncategorized = uncategorizedListIds(data)
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Sources',
          headerLargeTitleEnabled: true,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done choosing sources"
              onPress={() => router.back()}
              style={styles.done}
            >
              <AppText variant="body" tone="accent" weight="600">
                Done
              </AppText>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <AppText variant="footnote" tone="secondary">
          Choose what appears on Home. Focus tasks always stay visible.
        </AppText>
        <View style={[styles.group, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <AppText weight="600">Unsorted</AppText>
            <Switch
              accessibilityLabel="Show Unsorted on Home"
              disabled={busy}
              value={data.preferences.showUnsortedOnHome}
              onValueChange={(visible) =>
                void run(
                  { type: 'source', source: { type: 'unsorted' }, visible },
                  'Sources updated',
                )
              }
            />
          </View>
        </View>
        {data.lists.map((list) => {
          const state = getHomeListState(
            list.id,
            data.categories,
            data.preferences,
            uncategorized.has(list.id),
          )
          const categories = data.categories.filter(
            (category) => category.list_id === list.id,
          )
          return (
            <View
              key={list.id}
              style={[styles.group, { backgroundColor: colors.surface }]}
            >
              <View style={styles.row}>
                <View style={{ flex: 1, gap: 4 }}>
                  <ListIndicator list={list} />
                  {state === 'partial' ? (
                    <AppText variant="caption" tone="secondary">
                      Some categories shown
                    </AppText>
                  ) : null}
                </View>
                <Switch
                  accessibilityLabel={`Show ${list.title} on Home${state === 'partial' ? ', some categories selected' : ''}`}
                  disabled={busy}
                  value={state !== 'disabled'}
                  onValueChange={(visible) =>
                    void run(
                      {
                        type: 'source',
                        source: { type: 'list', listId: list.id },
                        visible,
                      },
                      'Sources updated',
                    )
                  }
                />
              </View>
              {categories.map((category) => (
                <View
                  key={category.id}
                  style={[
                    styles.row,
                    styles.category,
                    { borderTopColor: colors.separator },
                  ]}
                >
                  <CategoryIndicator category={category} />
                  <Switch
                    accessibilityLabel={`Show ${category.title} from ${list.title} on Home`}
                    disabled={busy}
                    value={isHomeCategoryEnabled(
                      category,
                      data.categories,
                      data.preferences,
                    )}
                    onValueChange={(visible) =>
                      void run(
                        { type: 'category', id: category.id, visible },
                        'Sources updated',
                      )
                    }
                  />
                </View>
              ))}
            </View>
          )
        })}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void run({ type: 'showAll' }, 'Showing all sources')}
          style={[
            styles.group,
            styles.showAll,
            { backgroundColor: colors.surface },
          ]}
        >
          <AppText variant="body" tone="accent">
            Show all sources
          </AppText>
        </Pressable>
        <AppText variant="footnote" tone="secondary">
          Stashing hides a task from Home. It stays in its original list.
        </AppText>
      </ScrollView>
    </>
  )
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 60, gap: 18 },
  group: { borderRadius: 16, overflow: 'hidden' },
  row: {
    padding: 16,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  category: { marginLeft: 20, borderTopWidth: StyleSheet.hairlineWidth },
  showAll: { padding: 18, minHeight: 56 },
  done: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
