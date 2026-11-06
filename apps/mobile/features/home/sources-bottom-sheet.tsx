import { useEffect, useRef, useState } from 'react'
import {
  BottomSheet,
  Host,
  RNHostView,
  Switch as NativeSwitch,
} from '@expo/ui'
import { SymbolView } from 'expo-symbols'
import { AppIcon, AppText } from '@/components/ui/primitives'
import { GlassSurface } from '@/components/glass-surface'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { getHomeListState, isHomeCategoryEnabled } from '@planomy/lib/home'
import { unsortedIcon } from '@/components/lists'
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
  const changeCount = stagedSources?.commands.length ?? 0
  const hasChanges = changeCount > 0

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
              <View style={styles.sheetHeader}>
                <View style={styles.headerSide}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel source changes"
                    onPress={cancelSourceChanges}
                    style={({ pressed }) => [
                      styles.headerIconPressable,
                      pressed && styles.pressed,
                    ]}
                  >
                    <GlassSurface
                      interactive
                      style={styles.headerIconSurface}
                    >
                      <AppIcon
                        name={{ ios: 'xmark', android: 'close', web: 'close' }}
                        size={19}
                        color={colors.secondary}
                      />
                    </GlassSurface>
                  </Pressable>
                </View>
                <AppText
                  variant="body"
                  weight="600"
                  accessibilityRole="header"
                  style={styles.sheetTitle}
                >
                  Sources
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Apply ${changeCount} source changes`}
                  accessibilityState={{ disabled: !hasChanges }}
                  disabled={!hasChanges}
                  onPress={applyStagedSourceChanges}
                  style={({ pressed }) => [
                    styles.applyButton,
                    pressed && hasChanges && styles.pressed,
                    !hasChanges && styles.disabled,
                  ]}
                >
                  <GlassSurface
                    interactive
                    tintColor={colors.accent}
                    style={styles.applyGlassSurface}
                  >
                    <AppText
                      variant="body"
                      weight="600"
                      style={[styles.applyLabel, { color: colors.text }]}
                    >
                      Apply
                    </AppText>
                  </GlassSurface>
                </Pressable>
              </View>
              <ScrollView
                nestedScrollEnabled
                style={styles.screen}
                contentContainerStyle={styles.content}
              >
                <GlassSurface style={[styles.group, styles.glassGroup]}>
                  <View style={styles.row}>
                    <SymbolView
                      name={unsortedIcon}
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
                </GlassSurface>
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
                    <GlassSurface
                      key={list.id}
                      style={[styles.group, styles.glassGroup]}
                    >
                      <View>
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
                    </GlassSurface>
                  )
                })}
                <GlassSurface
                  interactive
                  style={[styles.group, styles.glassGroup]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Show all sources"
                    onPress={() => stageSourcePreference({ type: 'showAll' })}
                    style={styles.showAll}
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
                </GlassSurface>
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
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60, gap: 16 },
  group: { borderRadius: 16, overflow: 'hidden' },
  glassGroup: { padding: 0, gap: 0 },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSide: { width: 84, alignItems: 'flex-start' },
  sheetTitle: { flex: 1, textAlign: 'center' },
  headerIconPressable: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  headerIconSurface: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 0,
    gap: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButton: { minWidth: 84, minHeight: 44, borderRadius: 22, overflow: 'hidden' },
  applyGlassSurface: {
    minWidth: 84,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 0,
    gap: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyLabel: { textAlign: 'center' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  listHeading: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
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
})
