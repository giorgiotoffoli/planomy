import type { ComponentProps } from 'react'
import { router, Stack } from 'expo-router'
import { Alert, Platform, Pressable, StyleSheet } from 'react-native'
import { AppIcon } from '@/components/ui/primitives'
import { useHomeTheme } from '@/features/home/theme'

export function NativeTabToolbar({
  includeArchive = false,
  archiveDisabled = false,
  onChooseHomeSources,
  homeSourcesDisabled = false,
}: {
  includeArchive?: boolean
  archiveDisabled?: boolean
  onChooseHomeSources?: () => void
  homeSourcesDisabled?: boolean
}) {
  if (Platform.OS !== 'ios') return null

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="magnifyingglass"
          accessibilityLabel="Search"
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        {onChooseHomeSources ? (
          <Stack.Toolbar.Button
            icon="line.3.horizontal.decrease"
            accessibilityLabel="Choose Home sources"
            disabled={homeSourcesDisabled}
            onPress={onChooseHomeSources}
          />
        ) : null}
        <Stack.Toolbar.Menu accessibilityLabel="More">
          <Stack.Toolbar.Icon sf="ellipsis" />
          {includeArchive ? (
            <Stack.Toolbar.MenuAction
              icon="archivebox"
              disabled={archiveDisabled}
              onPress={() => router.push('/archive')}
            >
              Archive
            </Stack.Toolbar.MenuAction>
          ) : null}
          <Stack.Toolbar.MenuAction
            icon="gearshape"
            onPress={() => router.push('/settings')}
          >
            Settings
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  )
}

function AndroidHeaderButton({
  name,
  label,
  onPress,
}: {
  name: ComponentProps<typeof AppIcon>['name']
  label: string
  onPress?: () => void
}) {
  const colors = useHomeTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.androidButton, pressed && styles.pressed]}
    >
      <AppIcon name={name} size={22} color={colors.accent} />
    </Pressable>
  )
}

export function AndroidSearchHeaderButton() {
  return (
    <AndroidHeaderButton
      name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
      label="Search"
    />
  )
}

export function AndroidMoreHeaderButton({
  includeArchive = false,
  archiveDisabled = false,
}: {
  includeArchive?: boolean
  archiveDisabled?: boolean
}) {
  function openMoreOptions() {
    const actions = []

    if (includeArchive) {
      actions.push({
        text: 'Archive',
        onPress: () => router.push('/archive'),
        disabled: archiveDisabled,
      })
    }

    actions.push({ text: 'Settings', onPress: () => router.push('/settings') })
    actions.push({ text: 'Cancel', style: 'cancel' as const })

    Alert.alert('More', undefined, actions)
  }

  return (
    <AndroidHeaderButton
      name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
      label="More"
      onPress={openMoreOptions}
    />
  )
}

const styles = StyleSheet.create({
  androidButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.72 },
})
