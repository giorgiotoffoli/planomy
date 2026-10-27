import { Redirect } from 'expo-router'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/ui/primitives'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useHomeTheme } from '@/features/home/theme'

export default function Index() {
  const { state } = useAuth()
  const colors = useHomeTheme()

  if (state.status === 'loading') {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
        <AppText tone="secondary">Checking your saved session…</AppText>
      </View>
    )
  }

  if (state.status === 'unauthenticated') return <Redirect href="/sign-in" />
  if (state.status === 'authenticated-but-locked') return <Redirect href="/locked" />
  return <Redirect href="/home" />
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
})
