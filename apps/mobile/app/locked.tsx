import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppButton, AppSurface, AppText } from '@/components/ui/primitives'
import { useHomeTheme, spacing } from '@/features/home/theme'
import { useAuth } from '@/lib/auth/AuthProvider'

export default function LockedScreen() {
  const colors = useHomeTheme()
  const insets = useSafeAreaInsets()
  const { state, notice, signOut, unlockVault } = useAuth()
  const [busy, setBusy] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const user = state.status === 'authenticated-but-locked' || state.status === 'unlocked'
    ? state.user
    : null

  async function handleSignOut() {
    setBusy(true)
    setError(null)
    const result = await signOut()
    if (!result.ok) {
      setBusy(false)
      setError(result.error)
    }
  }

  async function handleUnlock() {
    if (busy || !password) return
    setBusy(true)
    setError(null)
    const result = await unlockVault(password)
    setPassword('')
    setBusy(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, spacing.xxl), paddingBottom: Math.max(insets.bottom, spacing.xxl) },
      ]}
    >
      <View style={styles.intro}>
        <AppText variant="caption" tone="accent" weight="700">ACCOUNT CONNECTED</AppText>
        <AppText variant="heading">Your vault is locked</AppText>
        <AppText tone="secondary">
          You’re signed in{user?.email ? ` as ${user.email}` : ''}. Enter the vault password you already use on Planomy web to unlock your encrypted data.
        </AppText>
      </View>

      <AppSurface variant="card" style={styles.card}>
        <AppText variant="title" weight="700">Unlock your vault</AppText>
        <TextInput
          accessibilityLabel="Vault password"
          autoCapitalize="none"
          autoComplete="password"
          autoCorrect={false}
          editable={!busy}
          onChangeText={setPassword}
          onSubmitEditing={() => void handleUnlock()}
          placeholder="Vault password"
          placeholderTextColor={colors.muted}
          returnKeyType="go"
          secureTextEntry
          style={[styles.password, { color: colors.text, borderColor: colors.separator, backgroundColor: colors.background }]}
          textContentType="password"
          value={password}
        />
        {error || notice ? <AppText accessibilityRole="alert" tone="danger">{error ?? notice}</AppText> : null}
        <AppButton disabled={busy || !password} onPress={() => void handleUnlock()}>
          {busy ? <ActivityIndicator color={colors.accent} /> : <AppText tone="accent" weight="700">Unlock</AppText>}
        </AppButton>
        <AppButton variant="destructive" disabled={busy} onPress={() => void handleSignOut()}>
          {busy ? <ActivityIndicator color={colors.danger} /> : <AppText tone="danger" weight="700">Sign out and switch account</AppText>}
        </AppButton>
      </AppSurface>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', gap: spacing.xl, paddingHorizontal: spacing.xl },
  intro: { gap: spacing.md },
  card: { gap: spacing.md },
  password: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
})
