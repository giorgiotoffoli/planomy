import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '@/lib/auth/AuthProvider'
import { HomeProvider } from '@/features/home/provider'
import { useHomeTheme } from '@/features/home/theme'
import { getAddTaskReturnHref } from '@/features/navigation/add-task-navigation'

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
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

function RootNavigator() {
  const colors = useHomeTheme()
  const { state, homeSource } = useAuth()
  const routes = (
    <>
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
        <Stack.Protected guard={state.status === 'unauthenticated'} redirectTo="/">
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={state.status === 'authenticated-but-locked'} redirectTo="/">
          <Stack.Screen name="locked" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={state.status === 'unlocked'} redirectTo="/">
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-task"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.85, 1],
              sheetInitialDetentIndex: 0,
              sheetGrabberVisible: true,
            }}
            listeners={{
              transitionEnd: (event) => {
                if (event.data.closing) {
                  requestAnimationFrame(() =>
                    router.navigate(getAddTaskReturnHref()),
                  )
                }
              },
            }}
          />
          <Stack.Screen name="task" options={{ presentation: 'modal' }} />
          <Stack.Screen name="archive" options={{ presentation: 'modal', title: 'Archive' }} />
          <Stack.Screen name="sources" options={{ presentation: 'modal' }} />
          <Stack.Screen name="deadlines" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  )

  // Keep decrypted Home state mounted only for an explicitly unlocked vault;
  // AuthProvider disposes the key and source on lock, sign-out, or account change.
  return state.status === 'unlocked' && homeSource
    ? <HomeProvider source={homeSource}>{routes}</HomeProvider>
    : routes
}
