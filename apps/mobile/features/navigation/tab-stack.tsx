import { Stack } from 'expo-router'
import { useHomeTheme } from '@/features/home/theme'

export function TabStackLayout() {
  const colors = useHomeTheme()

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        contentStyle: { backgroundColor: colors.background },
        headerTintColor: colors.accent,
        headerLargeTitleStyle: { color: colors.accent },
        headerTitleStyle: { color: colors.text },
      }}
    />
  )
}
