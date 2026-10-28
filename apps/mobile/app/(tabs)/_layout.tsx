import { NativeTabs } from 'expo-router/native-tabs'
import { usePathname } from 'expo-router'
import { Platform } from 'react-native'
import { useHomeTheme } from '@/features/home/theme'
import { rememberAddTaskReturnPath } from '@/features/navigation/add-task-navigation'

export default function TabsLayout() {
  const pathname = usePathname()
  const colors = useHomeTheme()
  const iosMajorVersion = Platform.OS === 'ios'
    ? Number.parseInt(String(Platform.Version), 10)
    : 0
  const useProminentAction = iosMajorVersion >= 27
  const useDetachedSearchAction = iosMajorVersion === 26

  return (
    <NativeTabs
      tintColor={colors.accent}
      unstable_nativeProps={useProminentAction
        ? { ios: { prominentScreenKey: 'compose' } }
        : undefined}
      screenListeners={({ route }) => ({
        tabPress: () => {
          if (route.name === 'compose') rememberAddTaskReturnPath(pathname)
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
        accessibilityLabel="Create a task"
      >
        <NativeTabs.Trigger.Icon sf="plus" md="add" />
        <NativeTabs.Trigger.Label hidden />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
