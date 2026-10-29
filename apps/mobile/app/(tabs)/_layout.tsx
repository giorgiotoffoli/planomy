import { router, usePathname } from 'expo-router'
import { NativeTabs } from 'expo-router/native-tabs'
import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { useHomeTheme } from '@/features/home/theme'

export default function TabsLayout() {
  const colors = useHomeTheme()
  const pathname = usePathname()
  const addTaskIsOpening = useRef(false)
  const iosMajorVersion = Platform.OS === 'ios'
    ? Number.parseInt(String(Platform.Version), 10)
    : 0
  const useProminentAction = iosMajorVersion >= 27
  const useDetachedSearchAction = iosMajorVersion === 26

  useEffect(() => {
    addTaskIsOpening.current = pathname === '/add-task'
  }, [pathname])

  return (
    <NativeTabs
      tintColor={colors.accent}
      minimizeBehavior="onScrollDown"
      unstable_nativeProps={useProminentAction
        ? { ios: { prominentScreenKey: 'compose' } }
        : undefined}
      screenListeners={({ route }) => ({
        tabPress: (event) => {
          if (
            route.name === 'compose' &&
            event.data.isPrevented &&
            !addTaskIsOpening.current &&
            pathname !== '/add-task'
          ) {
            addTaskIsOpening.current = true
            router.push('/add-task')
          }
        },
      })}
    >
      <NativeTabs.Trigger name="home" accessibilityLabel="Home">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md={{ default: 'home', selected: 'home' }}
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar" accessibilityLabel="Calendar">
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="lists" accessibilityLabel="Lists">
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
        <NativeTabs.Trigger.Label>Lists</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="compose"
        role={useDetachedSearchAction ? 'search' : undefined}
        disabled
        accessibilityLabel="Create a task"
      >
        <NativeTabs.Trigger.Icon sf="plus" md="add" />
        <NativeTabs.Trigger.Label hidden />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
