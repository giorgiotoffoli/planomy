import { useEffect, useRef, useState } from 'react'
import {
  BottomSheet,
  Host,
  RNHostView,
  Switch as NativeSwitch,
} from '@expo/ui'
import { SymbolView } from 'expo-symbols'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { getHomeListState, isHomeCategoryEnabled } from '@planomy/lib/home'
import { AppText } from '@/components/ui/primitives'
import {
  projectHomeCommand,
  uncategorizedListIds,
  type HomeSnapshot,
  type HomeSourcePreferenceCommand,
} from './model'
import { useHome } from './provider'
import { useHomeTheme } from './theme'

type SourcesBottomSheetProps = {
  isPresented: boolean
  onDismiss: () => void
}

type StagedSources = {
  preferences: HomeSnapshot['preferences']
  commands: HomeSourcePreferenceCommand[]
}

export function SourcesBottomSheet({
  isPresented,
  onDismiss,
}: SourcesBottomSheetProps) {
  const { data, applySourcePreferences } = useHome()
  const colors = useHomeTheme()
  const [stagedSources, setStagedSources] = useState<StagedSources | null>(null)
  const stagedSourcesRef = useRef<StagedSources | null>(null)
  const latestDataRef = useRef(data)
  latestDataRef.current = data
  const uncategorized = data ? uncategorizedListIds(data) : new Set<string>()
  const preferences = stagedSources?.preferences ?? data?.preferences

  useEffect(() => {
    if (!isPresented) {
      stagedSourcesRef.current = null
      setStagedSources(null)
      return
    }
    const latestData = latestDataRef.current
    if (!latestData) return
    const initial = { preferences: latestData.preferences, commands: [] }
    stagedSourcesRef.current = initial
    setStagedSources(initial)
  }, [isPresented])

  function stageSourcePreference(command: HomeSourcePreferenceCommand) {
    const latestData = latestDataRef.current
    if (!latestData) return
    const current = stagedSourcesRef.current ?? {
      preferences: latestData.preferences,
      commands: [],
    }
    const next = {
      preferences: projectHomeCommand(
        { ...latestData, preferences: current.preferences },
        command,
      ).preferences,
      commands: [...current.commands, command],
    }
    stagedSourcesRef.current = next
    setStagedSources(next)
  }

  function cancelSourceChanges() {
    stagedSourcesRef.current = null
    setStagedSources(null)
    onDismiss()
  }

  function applyStagedSourceChanges() {
    const commands = stagedSourcesRef.current?.commands ?? []
    if (commands.length === 0) return
    void applySourcePreferences(commands)
    onDismiss()
  }

  return (
    <Host style={StyleSheet.absoluteFill} pointerEvents="none">
      <BottomSheet
        isPresented={isPresented}
        onDismiss={onDismiss}
        snapPoints={['half', 'full']}
        contentPadding={0}
        containerColor={colors.background}
        testID="home-sources-sheet"
      >
        {data ? (
          <RNHostView>
            <View style={[styles.sheet, { backgroundColor: colors.background }]}>
              <View
                style={[
                  styles.sheetHeader,
                  { borderBottomColor: colors.separator },
                ]}
              >
                <View style={styles.sheetHeaderText}>
                  <AppText variant="title" weight="700">
                    Sources
                  </AppText>
                  <AppText variant="footnote" tone="secondary">
                    Choose what appears on Home, then apply. Focus tasks always stay visible.
                  </AppText>
                </View>
                <View style={styles.headerActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel source changes"
                    onPress={cancelSourceChanges}
                    style={styles.done}
                  >
                    <AppText variant="body" tone="secondary" weight="600">
                      Cancel
                    </AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Apply ${stagedSources?.commands.length ?? 0} source changes`}
                    accessibilityState={{
                      disabled: (stagedSources?.commands.length ?? 0) === 0,
                    }}
                    disabled={(stagedSources?.commands.length ?? 0) === 0}
                    onPress={applyStagedSourceChanges}
                    style={[
                      styles.done,
                      (stagedSources?.commands.length ?? 0) === 0 &&
                        styles.disabled,
                    ]}
                  >
                    <AppText
                      variant="body"
                      tone={stagedSources?.commands.length ? 'accent' : 'secondary'}
                      weight="600"
                    >
                      Apply
                    </AppText>
                  </Pressable>
                </View>
              </View>
              <ScrollView
                nestedScrollEnabled
                style={styles.screen}
                contentContainerStyle={styles.content}
              >
                <View style={[styles.group, { backgroundColor: colors.surface }]}>
                  <View style={styles.row}>
                    <SymbolView
                      name={{ ios: 'tray', android: 'inbox', web: 'inbox' }}
                      tintColor={colors.accent}
                      size={20}
                    />
                    <Host
                      style={styles.nativeSwitch}
                      matchContents={{ vertical: true, horizontal: false }}
                    >
                      <NativeSwitch
                        label="Unsorted"
                        value={preferences?.showUnsortedOnHome ?? true}
                        onValueChange={(visible) =>
                          stageSourcePreference({
                            type: 'source',
                            source: { type: 'unsorted' },
                            visible,
                          })
                        }
                      />
                    </Host>
                  </View>
                </View>
                {data.lists.map((list) => {
                  const state = getHomeListState(
                    list.id,
                    data.categories,
                    preferences ?? data.preferences,
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
                      <View style={styles.listHeading}>
                        <AppText variant="body" weight="600">
                          {list.emoji ?? '📋'} {list.title}
                        </AppText>
                      </View>
                      <View style={styles.row}>
                        <SymbolView
                          name={{
                            ios: 'list.bullet',
                            android: 'list',
                            web: 'list',
                          }}
                          tintColor={colors.accent}
                          size={20}
                        />
                        <Host
                          style={styles.nativeSwitch}
                          matchContents={{ vertical: true, horizontal: false }}
                        >
                          <NativeSwitch
                            label="Whole list"
                            value={state === 'enabled'}
                            onValueChange={(visible) =>
                              stageSourcePreference({
                                type: 'source',
                                source: { type: 'list', listId: list.id },
                                visible,
                              })
                            }
                          />
                        </Host>
                      </View>
                      {state === 'partial' ? (
                        <AppText
                          variant="caption"
                          tone="secondary"
                          style={styles.partialState}
                        >
                          Some categories shown
                        </AppText>
                      ) : null}
                      {categories.map((category) => (
                        <View
                          key={category.id}
                          style={[
                            styles.row,
                            styles.category,
                            { borderTopColor: colors.separator },
                          ]}
                        >
                          <Host
                            style={styles.nativeSwitch}
                            matchContents={{ vertical: true, horizontal: false }}
                          >
                            <NativeSwitch
                              label={category.title}
                              value={isHomeCategoryEnabled(
                                category,
                                data.categories,
                                preferences ?? data.preferences,
                              )}
                              onValueChange={(visible) =>
                                stageSourcePreference({
                                  type: 'category',
                                  id: category.id,
                                  visible,
                                })
                              }
                            />
                          </Host>
                        </View>
                      ))}
                    </View>
                  )
                })}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => stageSourcePreference({ type: 'showAll' })}
                  style={[
                    styles.group,
                    styles.showAll,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View style={styles.showAllLabel}>
                    <SymbolView
                      name={{
                        ios: 'square.grid.2x2',
                        android: 'grid_view',
                        web: 'grid_view',
                      }}
                      tintColor={colors.accent}
                      size={20}
                    />
                    <AppText variant="body" tone="accent">
                      Show all sources
                    </AppText>
                  </View>
                </Pressable>
                <AppText variant="footnote" tone="secondary">
                  Stashing hides a task from Home. It stays in its original list.
                </AppText>
              </ScrollView>
            </View>
          </RNHostView>
        ) : null}
      </BottomSheet>
    </Host>
  )
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 60, gap: 18 },
  group: { borderRadius: 16, overflow: 'hidden' },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listHeading: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  sheetHeaderText: { flex: 1, gap: 4 },
  nativeSwitch: { flex: 1 },
  row: {
    padding: 16,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partialState: { paddingHorizontal: 16, paddingBottom: 8 },
  category: { marginLeft: 20, borderTopWidth: StyleSheet.hairlineWidth },
  showAll: { padding: 18, minHeight: 56, justifyContent: 'center' },
  showAllLabel: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  done: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
})
