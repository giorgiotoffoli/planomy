import { useState } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { Redirect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppIcon, AppText } from '@/components/ui/primitives'
import { GlassSurface } from '@/components/glass-surface'
import { useHomeTheme, spacing } from '@/features/home/theme'
import { useAuth } from '@/lib/auth/AuthProvider'

const PRIMARY_BLUE = '#2044FD'

export default function SetupVaultScreen() {
  const colors = useHomeTheme()
  const insets = useSafeAreaInsets()
  const { fontScale } = useWindowDimensions()
  const auth = useAuth()
  const [accountPassword, setAccountPassword] = useState('')
  const [confirmAccountPassword, setConfirmAccountPassword] = useState('')
  const [masterPassword, setMasterPassword] = useState('')
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('')
  const [step, setStep] = useState<'account' | 'vault'>('account')
  const [showKeys, setShowKeys] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const accountStep = auth.requiresAccountPassword && step === 'account'

  function continueToVault() {
    setError(null)
    if (!accountPassword) return setError('Choose an account password for password sign-in.')
    if (accountPassword !== confirmAccountPassword) return setError('Account passwords do not match.')
    Keyboard.dismiss()
    setShowKeys(false)
    setStep('vault')
  }

  async function submit() {
    if (busy) return
    setError(null)
    if (auth.requiresAccountPassword) {
      if (!accountPassword) return setError('Choose an account password for password sign-in.')
      if (accountPassword !== confirmAccountPassword) return setError('Account passwords do not match.')
    }
    if (masterPassword.length < 12) return setError('Your Vault Key must be at least 12 characters.')
    if (masterPassword !== confirmMasterPassword) return setError('Vault Keys do not match.')

    setBusy(true)
    const result = await auth.createVault(auth.requiresAccountPassword ? accountPassword : '', masterPassword)
    setAccountPassword('')
    setConfirmAccountPassword('')
    setMasterPassword('')
    setConfirmMasterPassword('')
    setBusy(false)
    if (result.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    } else {
      setError(result.error)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    }
  }

  async function signOut() {
    if (busy) return
    setBusy(true)
    const result = await auth.signOut()
    setBusy(false)
    if (!result.ok) setError(result.error)
  }

  if (auth.vaultStatus === 'ready') return <Redirect href="/locked" />

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, spacing.xxl), paddingBottom: Math.max(insets.bottom, spacing.xl) },
        ]}
      >
        {auth.vaultStatus === 'checking' ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.accent} />
            <AppText tone="secondary">Checking your encrypted vault…</AppText>
          </View>
        ) : auth.vaultStatus === 'error' ? (
          <View style={styles.status}>
            <AppText accessibilityRole="alert" tone="danger" style={styles.centerText}>We couldn’t check your encrypted vault.</AppText>
            <Pressable accessibilityRole="button" onPress={() => void auth.refreshVaultStatus()} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
              <AppIcon name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} size={17} color={colors.accent} />
              <AppText tone="accent" weight="600">Try again</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void signOut()} style={styles.switchAccount}>
              <AppText variant="footnote" tone="muted">Sign out and switch account</AppText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.body}>
            {!accountStep && auth.requiresAccountPassword ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Back to account password" disabled={busy} onPress={() => { Keyboard.dismiss(); setShowKeys(false); setError(null); setStep('account') }} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
                <GlassSurface interactive style={styles.backGlass}>
                  <AppIcon name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={18} color={colors.text} />
                </GlassSurface>
              </Pressable>
            ) : null}
            <View style={styles.intro}>
              {auth.requiresAccountPassword ? <AppText variant="footnote" tone="secondary" weight="600">{accountStep ? 'STEP 1 OF 2' : 'STEP 2 OF 2'}</AppText> : null}
              <AppText accessibilityRole="header" style={[styles.title, { lineHeight: 39 * fontScale }]}>{accountStep ? 'Create your account password.' : 'Create your Vault Key.'}</AppText>
              <AppText tone="secondary" style={[styles.subtitle, { lineHeight: 24 * fontScale }]}>
                {accountStep
                  ? 'Your account password signs you into Planomy. It is separate from the Vault Key that protects your plans.'
                  : 'Your Vault Key encrypts and unlocks your plans. It is separate from your account password, and Planomy cannot recover it if you forget it.'}
              </AppText>
            </View>

            <View style={styles.form}>
              {accountStep ? (
                <View style={styles.section}>
                  <SecureField
                    label="Account password"
                    placeholder="Create an account password"
                    value={accountPassword}
                    onChangeText={(value) => { setAccountPassword(value); if (error) setError(null) }}
                    visible={showKeys}
                    onToggleVisibility={() => setShowKeys((value) => !value)}
                    colors={colors}
                    autoComplete="new-password"
                  />
                  <SecureField
                    label="Confirm account password"
                    placeholder="Confirm account password"
                    value={confirmAccountPassword}
                    onChangeText={(value) => { setConfirmAccountPassword(value); if (error) setError(null) }}
                    visible={showKeys}
                    colors={colors}
                    autoComplete="new-password"
                    returnKeyType="go"
                    onSubmitEditing={continueToVault}
                  />
                </View>
              ) : (
              <View style={styles.section}>
                <SecureField
                  label="Vault Key"
                  placeholder="Create a Vault Key (12+ characters)"
                  value={masterPassword}
                  onChangeText={(value) => { setMasterPassword(value); if (error) setError(null) }}
                  visible={showKeys}
                  onToggleVisibility={() => setShowKeys((value) => !value)}
                  colors={colors}
                  autoComplete="new-password"
                />
                <SecureField
                  label="Confirm Vault Key"
                  placeholder="Confirm your Vault Key"
                  value={confirmMasterPassword}
                  onChangeText={(value) => { setConfirmMasterPassword(value); if (error) setError(null) }}
                  visible={showKeys}
                  colors={colors}
                  autoComplete="new-password"
                  returnKeyType="go"
                  onSubmitEditing={() => void submit()}
                />
                <AppText variant="caption" tone="muted">At least 12 characters</AppText>
              </View>
              )}

              {error ? <AppText accessibilityRole="alert" tone="danger">{error}</AppText> : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={accountStep ? 'Continue' : 'Create encrypted vault'}
                accessibilityState={{ disabled: busy, busy }}
                disabled={busy}
                onPress={accountStep ? continueToVault : () => void submit()}
                style={({ pressed }) => [styles.primaryButton, pressed && !busy && styles.primaryPressed, busy && styles.disabled]}
              >
                <GlassSurface interactive tintColor={PRIMARY_BLUE} style={styles.primaryGlass}>
                  {busy ? <ActivityIndicator color={colors.text} /> : <AppText weight="700" style={styles.primaryLabel}>{accountStep ? 'Continue' : 'Create encrypted vault'}</AppText>}
                </GlassSurface>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void signOut()} style={({ pressed }) => [styles.switchAccount, pressed && styles.pressed]}>
                <AppText variant="footnote" tone="muted">Sign out and switch account</AppText>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function SecureField({
  label,
  placeholder,
  value,
  onChangeText,
  visible,
  onToggleVisibility,
  colors,
  autoComplete,
  returnKeyType = 'next',
  onSubmitEditing,
}: {
  label: string
  placeholder: string
  value: string
  onChangeText: (value: string) => void
  visible: boolean
  onToggleVisibility?: () => void
  colors: ReturnType<typeof useHomeTheme>
  autoComplete: 'new-password'
  returnKeyType?: 'next' | 'go'
  onSubmitEditing?: () => void
}) {
  return (
    <View style={styles.field}>
      <AppText variant="footnote" weight="600">{label}</AppText>
      <GlassSurface style={styles.inputGlass}>
        <AppIcon name={{ ios: 'lock', android: 'lock', web: 'lock' }} size={18} color={colors.secondary} />
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="none"
          autoComplete={autoComplete}
          autoCorrect={false}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          returnKeyType={returnKeyType}
          secureTextEntry={!visible}
          style={[styles.input, { color: colors.text }]}
          textContentType="newPassword"
          value={value}
        />
        {onToggleVisibility ? (
          <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide passwords' : 'Show passwords'} onPress={onToggleVisibility} style={styles.visibilityButton}>
            <AppIcon name={visible ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' } : { ios: 'eye', android: 'visibility', web: 'visibility' }} size={20} color={colors.secondary} />
          </Pressable>
        ) : null}
      </GlassSurface>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: spacing.xl, justifyContent: 'center' },
  body: { gap: spacing.xxxl },
  backButton: { width: 46, height: 46, alignSelf: 'flex-start' },
  backGlass: { width: 46, height: 46, borderRadius: 23, padding: 0, alignItems: 'center', justifyContent: 'center' },
  intro: { gap: spacing.md },
  title: { fontSize: 32, lineHeight: 39, fontWeight: '700', letterSpacing: -0.75 },
  subtitle: { fontSize: 16, lineHeight: 24 },
  form: { gap: spacing.xl },
  section: { gap: spacing.md },
  field: { gap: spacing.sm },
  inputGlass: { minHeight: 56, borderRadius: 16, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 0 },
  input: { flex: 1, minHeight: 54, fontSize: 16, paddingVertical: spacing.md },
  visibilityButton: { width: 40, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { borderRadius: 16, borderCurve: 'continuous', marginTop: spacing.xs },
  primaryGlass: { minHeight: 56, borderRadius: 16, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  primaryLabel: { fontSize: 16, lineHeight: 22 },
  primaryPressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  switchAccount: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  status: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  retryButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  centerText: { textAlign: 'center' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.65 },
})
