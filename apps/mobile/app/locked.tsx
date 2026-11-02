import { useRef, useState } from 'react'
import { Redirect } from 'expo-router'
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppIcon, AppText } from '@/components/ui/primitives'
import { GlassSurface } from '@/components/glass-surface'
import { useHomeTheme, spacing } from '@/features/home/theme'
import { useAuth } from '@/lib/auth/AuthProvider'
import { hasOfferedBiometric, markBiometricOffered } from '@/lib/vault/biometric-vault'

type PendingAction = 'password' | 'biometric' | 'signout' | null

export default function LockedScreen() {
  const colors = useHomeTheme()
  const isDark = useColorScheme() === 'dark'
  const insets = useSafeAreaInsets()
  const { state, notice, clearNotice, signOut, signingOut, unlockVault, unlockWithBiometrics, enableBiometrics, biometricAvailable, biometricEnabled, vaultStatus, refreshVaultStatus } = useAuth()
  const [pending, setPending] = useState<PendingAction>(null)
  const pendingRef = useRef(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const user = state.status === 'authenticated-but-locked' ? state.user : null
  const busy = pending !== null

  if (signingOut) return <View style={[styles.screen, styles.signingOut, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.accent} /><AppText tone="secondary">Signing out…</AppText></View>
  if (vaultStatus === 'missing') return <Redirect href="/setup-vault" />

  function start(action: Exclude<PendingAction, null>) {
    if (pendingRef.current) return false
    pendingRef.current = true
    setPending(action)
    setError(null)
    clearNotice()
    return true
  }

  function finish() {
    pendingRef.current = false
    setPending(null)
  }

  function showError(message: string, haptic = false) {
    const displayMessage = message.replace(/vault password/gi, 'vault key')
    setError(displayMessage)
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(displayMessage)
    if (haptic) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
  }

  async function offerBiometrics(userId: string, vaultKey: string) {
    try {
      if (await hasOfferedBiometric(userId)) return
      await markBiometricOffered(userId)
    } catch {
      return
    }
    Alert.alert('Use Face ID?', 'Use Face ID to unlock your vault on this device. Your Vault Key remains available whenever you need it.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Use Face ID', onPress: () => {
        void enableBiometrics(vaultKey).then((result) => {
          if (!result.ok) Alert.alert('Could not enable Face ID', result.error)
        })
      } },
    ])
  }

  async function handleUnlock() {
    if (!password || vaultStatus !== 'ready' || !start('password')) return
    const vaultKey = password
    const result = await unlockVault(vaultKey)
    setPassword('')
    if (result.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      if (user && biometricAvailable && !biometricEnabled) void offerBiometrics(user.id, vaultKey)
      return
    }
    finish()
    showError(result.error, true)
  }

  async function handleBiometricUnlock() {
    if (!start('biometric')) return
    const result = await unlockWithBiometrics()
    if (result.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      return
    }
    finish()
    // A cancelled system prompt uses the same recoverable message as an incomplete prompt.
    showError(result.error)
  }

  async function handleSignOut() {
    if (!start('signout')) return
    const result = await signOut()
    if (!result.ok) {
      finish()
      showError(result.error, true)
    }
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, spacing.xxl), paddingBottom: Math.max(insets.bottom, spacing.xxl) }]}
    >
      <Animated.View entering={FadeInDown.duration(240).reduceMotion(ReduceMotion.System)} style={styles.body}>
        <View style={styles.intro}>
          <View accessibilityElementsHidden importantForAccessibility="no">
            <Image source={require('../assets/vault-mark.png')} style={[styles.mark, { tintColor: isDark ? '#FFFFFF' : '#000000' }]} resizeMode="contain" />
          </View>
          <View style={styles.introCopy}>
            <AppText accessibilityRole="header" style={styles.title}>Welcome back.</AppText>
            <AppText tone="secondary" style={styles.support}>Unlock your vault to access your private planner.</AppText>
          </View>
        </View>

        <View style={styles.form}>
          {vaultStatus === 'checking' ? (
            <View style={styles.statusMessage}>
              <ActivityIndicator color={colors.accent} />
              <AppText variant="footnote" tone="secondary">Checking your encrypted vault…</AppText>
            </View>
          ) : null}
          {vaultStatus === 'error' ? (
            <Pressable accessibilityRole="button" onPress={() => void refreshVaultStatus()} style={styles.statusMessage}>
              <AppIcon name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} size={17} color={colors.accent} />
              <AppText variant="footnote" tone="accent">Couldn’t check your vault. Tap to retry.</AppText>
            </Pressable>
          ) : null}
          <AppText variant="footnote" weight="600">Vault key</AppText>
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: error || notice ? colors.danger : colors.separator }]}>
            <AppIcon name={{ ios: 'lock', android: 'lock', web: 'lock' }} size={18} color={colors.muted} />
            <TextInput
              accessibilityLabel="Vault key"
              accessibilityHint="Enter your Planomy vault key."
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect={false}
              editable={!busy && vaultStatus === 'ready'}
              onChangeText={(value) => { setPassword(value); if (error) setError(null) }}
              onSubmitEditing={() => void handleUnlock()}
              placeholder="Enter your vault key"
              placeholderTextColor={colors.muted}
              returnKeyType="go"
              secureTextEntry={!showPassword}
              style={[styles.input, { color: colors.text }]}
              textContentType="password"
              value={password}
            />
            <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide vault key' : 'Show vault key'} accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => setShowPassword((visible) => !visible)} style={({ pressed }) => [styles.visibility, pressed && styles.pressed]}>
              <AppIcon name={showPassword ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' } : { ios: 'eye', android: 'visibility', web: 'visibility' }} size={20} color={colors.secondary} />
            </Pressable>
          </View>
          {error || notice ? <AppText accessibilityRole="alert" tone="danger" variant="footnote" style={styles.error}>{error ?? notice?.replace(/vault password/gi, 'vault key')}</AppText> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Unlock vault" accessibilityState={{ disabled: busy || !password || vaultStatus !== 'ready', busy: pending === 'password' }} disabled={busy || !password || vaultStatus !== 'ready'} onPress={() => void handleUnlock()} style={({ pressed }) => [(busy || !password || vaultStatus !== 'ready') && styles.disabled, pressed && styles.pressed]}>
            <GlassSurface interactive tintColor="#2044FD" style={styles.primary}>
              {pending === 'password' ? <ActivityIndicator color={colors.text} /> : <AppText weight="700">Unlock vault</AppText>}
            </GlassSurface>
          </Pressable>
          {biometricAvailable && biometricEnabled && vaultStatus === 'ready' ? (
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy: pending === 'biometric' }} disabled={busy} onPress={() => void handleBiometricUnlock()} style={({ pressed }) => [busy && styles.disabled, pressed && styles.pressed]}>
              <GlassSurface interactive style={styles.secondary}>
                {pending === 'biometric' ? <ActivityIndicator color={colors.text} /> : <><AppIcon name={{ ios: 'faceid', android: 'fingerprint', web: 'fingerprint' }} color={colors.text} /><AppText weight="600">Unlock with Face ID or Touch ID</AppText></>}
              </GlassSurface>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.reassurance}>
          <AppIcon name={{ ios: 'lock.shield', android: 'shield', web: 'shield' }} size={16} color={colors.muted} />
          <AppText variant="footnote" tone="muted">Protected with end-to-end encryption</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={user?.email ? `Sign out ${user.email}` : 'Sign out'} disabled={busy} onPress={() => void handleSignOut()} style={({ pressed }) => [styles.signOut, busy && styles.disabled, pressed && styles.pressed]}>
          {pending === 'signout' ? <ActivityIndicator color={colors.secondary} /> : <AppText variant="footnote" tone="muted" weight="600">Sign out and switch account</AppText>}
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  signingOut: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  content: { flexGrow: 1, paddingHorizontal: spacing.xxl, maxWidth: 560, width: '100%', alignSelf: 'center' },
  body: { flexGrow: 1, justifyContent: 'center', gap: 40 },
  intro: { alignItems: 'center', gap: spacing.xxxl },
  mark: { width: 76, height: 76 },
  introCopy: { alignItems: 'center', gap: spacing.md },
  title: { fontSize: 32, lineHeight: 39, fontWeight: '700', letterSpacing: -0.8, textAlign: 'center' },
  support: { textAlign: 'center', maxWidth: 350 },
  form: { gap: spacing.md },
  statusMessage: { minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  inputContainer: { minHeight: 56, borderRadius: 16, borderCurve: 'continuous', borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.lg, gap: spacing.md },
  input: { flex: 1, minHeight: 56, fontSize: 16, paddingVertical: spacing.md },
  visibility: { width: 48, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  error: { marginHorizontal: spacing.xs },
  primary: { minHeight: 56, borderRadius: 16, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  secondary: { minHeight: 56, borderRadius: 16, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  footer: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xxxl },
  reassurance: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, opacity: 0.8 },
  signOut: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
})
