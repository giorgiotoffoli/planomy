import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { HomeProvider } from '@/features/home/provider'
import { useHomeTheme } from '@/features/home/theme'

export default function RootLayout() {
  const colors = useHomeTheme()
  const baseTheme = useColorScheme() === 'dark' ? DarkTheme : DefaultTheme
  const theme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      primary: colors.accent,
      border: colors.separator,
    },
  }
  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <HomeProvider>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: colors.background },
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.accent,
              headerTitleStyle: { color: colors.text },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="task" options={{ presentation: 'modal' }} />
            <Stack.Screen name="sources" options={{ presentation: 'modal' }} />
          </Stack>
        </HomeProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
