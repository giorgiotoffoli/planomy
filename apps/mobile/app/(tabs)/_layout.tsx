import { NativeTabs } from 'expo-router/native-tabs'
import { useHomeTheme } from '@/features/home/theme'

export default function TabsLayout() {
  const colors = useHomeTheme()
  return (
    <NativeTabs disableTransparentOnScrollEdge tintColor={colors.accent}>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
