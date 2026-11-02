import { useEffect, useState } from 'react'
import { useFonts } from 'expo-font'
import dmSansFont from '../assets/fonts/DM-Sans-Latin.woff2'
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppIcon, AppText } from '@/components/ui/primitives'
import { GlassSurface } from '@/components/glass-surface'
import { useHomeTheme, spacing } from '@/features/home/theme'
import { useAuth, type EmailCodeIntent } from '@/lib/auth/AuthProvider'
import { OTP_LENGTH } from '@/lib/auth/errors'

type AuthScreen = 'welcome' | 'methods' | 'email' | 'code' | 'password'

const PLANOMY_BLUE = '#2044FD'
const RESEND_SECONDS = 30
const AUTH_BUTTON_HEIGHT = 54
const AUTH_BUTTON_RADIUS = 999

export default function SignInScreen() {
  const colors = useHomeTheme()
  const insets = useSafeAreaInsets()
  const { fontScale } = useWindowDimensions()
  const auth = useAuth()
  const [fontsLoaded] = useFonts(
    Platform.OS === 'ios'
      ? { PlanomyDMSans: dmSansFont }
      : {},
  )
  const clearAuthNotice = auth.clearNotice
  const [screen, setScreen] = useState<AuthScreen>('welcome')
  const [email, setEmail] = useState('')
  const [emailIntent, setEmailIntent] = useState<EmailCodeIntent>('sign-in')
  const [passwordReturn, setPasswordReturn] = useState<AuthScreen>('code')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = setTimeout(() => setResendCountdown((value) => Math.max(0, value - 1)), 1000)
    return () => clearTimeout(timer)
  }, [resendCountdown])

  useEffect(() => {
    if (Platform.OS !== 'android' || screen === 'welcome') return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true
      setError(null)
      clearAuthNotice()
      if (screen === 'password') {
        setScreen(passwordReturn)
      } else if (screen === 'code') {
        setCode('')
        setScreen('email')
      } else if (screen === 'email') {
        setScreen('methods')
      } else if (screen === 'methods') {
        setScreen('welcome')
      } else {
        setScreen('welcome')
      }
      return true
    })
    return () => subscription.remove()
  }, [busy, clearAuthNotice, passwordReturn, screen])

  function clearError() {
    setError(null)
    auth.clearNotice()
  }

  function showResultError(message: string) {
    if (message === 'Sign-in was canceled.') return
    setError(message)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
  }

  async function withBusy(action: () => Promise<{ ok: boolean; error?: string }>) {
    if (busy) return
    setBusy(true)
    clearError()
    try {
      const result = await action()
      if (!result.ok && result.error) showResultError(result.error)
    } catch {
      showResultError('Something went wrong. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function requestCode(intent: EmailCodeIntent = emailIntent) {
    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address to continue.')
      return
    }
    await withBusy(async () => {
      const result = await auth.requestEmailCode(normalizedEmail, intent)
      if (result.ok) {
        setEmail(normalizedEmail)
        setEmailIntent(intent)
        setCode('')
        setResendCountdown(RESEND_SECONDS)
        setScreen('code')
      }
      return result
    })
  }

  async function resendCode() {
    if (resendCountdown > 0 || busy) return
    await withBusy(async () => {
      const result = await auth.requestEmailCode(email, emailIntent)
      if (result.ok) setResendCountdown(RESEND_SECONDS)
      return result
    })
  }

  async function verifyCode() {
    if (code.length !== OTP_LENGTH) {
      setError('Enter the full 8-digit code.')
      return
    }
    await withBusy(() => auth.verifyEmailCode(email, code))
  }

  async function signInWithAccountPassword() {
    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail) || !password) {
      setError('Enter your account password to continue.')
      return
    }
    await withBusy(() => auth.signInWithPassword(normalizedEmail, password))
  }

  function continueFromEmail() {
    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address to continue.')
      return
    }
    clearError()
    setEmail(normalizedEmail)
    setPassword('')
    if (emailIntent === 'sign-up') {
      void requestCode('sign-up')
      return
    }
    setPasswordReturn('email')
    setScreen('password')
  }

  function goBack() {
    clearError()
    if (screen === 'password') {
      setScreen(passwordReturn)
      return
    }
    if (screen === 'code') {
      setCode('')
      setScreen('email')
      return
    }
    if (screen === 'email') {
      setScreen('methods')
      return
    }
    setScreen('welcome')
  }

  function chooseIntent(intent: EmailCodeIntent) {
    clearError()
    setEmailIntent(intent)
    setScreen('methods')
  }

  function openEmail() {
    clearError()
    setScreen('email')
  }

  function openTerms(url: string) {
    void Linking.openURL(url).catch(() => setError('Could not open that page. Try again later.'))
  }

  const visibleError = error ?? auth.notice ?? (auth.state.status === 'unauthenticated' ? auth.state.message : null)
  const title = screen === 'methods'
      ? emailIntent === 'sign-up' ? 'Create your account.' : 'Welcome back.'
    : screen === 'email'
      ? "What's your email?"
      : screen === 'code'
        ? 'Check your inbox.'
        : 'Enter your password.'
  const subtitle = screen === 'methods'
      ? emailIntent === 'sign-up' ? 'Choose how you’d like to get started.' : 'Choose how you’d like to log in.'
    : screen === 'email'
      ? emailIntent === 'sign-up'
        ? 'We’ll verify your email before setting up your account.'
        : 'Sign in with your password, or request a one-time code.'
      : screen === 'code'
        ? emailIntent === 'sign-up'
          ? `We sent an 8-digit code to ${email}. Verify it to create your account.`
          : `If this address has an account, we sent an 8-digit code to ${email}.`
        : `Use the account password for ${email}. Your Vault Key is separate.`

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
          {
            paddingTop: Math.max(insets.top + spacing.lg, spacing.xxxl),
            paddingBottom: Math.max(insets.bottom, spacing.xl),
          },
        ]}
      >
        <View style={[styles.main, screen === 'welcome' && styles.welcomeMain]}>
          {screen !== 'welcome' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              disabled={busy}
              onPress={goBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <GlassSurface interactive style={styles.backGlass}>
                <AppIcon name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={18} color={colors.text} />
              </GlassSurface>
            </Pressable>
          ) : null}

          {screen === 'welcome' ? (
            <Animated.View key={screen} entering={FadeInDown.duration(240).reduceMotion(ReduceMotion.System)} style={styles.welcomeContent}>
              <View style={styles.welcomeHero}>
                <View style={styles.brandLockup}>
                  <Image
                    accessibilityIgnoresInvertColors
                    source={require('../assets/vault-mark.png')}
                    style={styles.brandMark}
                    tintColor="#FFFFFF"
                    resizeMode="contain"
                  />
                  <AppText
                    accessibilityRole="header"
                    style={[
                      styles.wordmark,
                      { lineHeight: 33 * fontScale },
                      Platform.OS === 'ios' && fontsLoaded && styles.dmSansWordmark,
                    ]}
                  >
                    Planomy
                  </AppText>
                </View>
              </View>
              <View style={styles.actions}>
                <PrimaryButton
                  title="Create account"
                  busy={busy}
                  onPress={() => chooseIntent('sign-up')}
                />
                <GlassButton
                  title="Log in"
                  busy={busy}
                  colors={colors}
                  onPress={() => chooseIntent('sign-in')}
                />
              </View>
            </Animated.View>
          ) : null}

          {screen !== 'welcome' ? (
            <Animated.View key={`intro-${screen}`} entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)} style={styles.intro}>
              <AppText accessibilityRole="header" style={[styles.title, { lineHeight: 41 * fontScale }]}>{title}</AppText>
              <AppText tone="secondary" style={[styles.subtitle, { lineHeight: 26 * fontScale }]}>{subtitle}</AppText>
            </Animated.View>
          ) : null}

          {screen === 'methods' ? (
            <View style={styles.actions}>
              <PrimaryButton
                title={emailIntent === 'sign-up' ? 'Sign up with email' : 'Continue with email'}
                busy={busy}
                icon="email"
                onPress={openEmail}
              />
              <GlassButton
                title={emailIntent === 'sign-up' ? 'Sign up with Google' : 'Continue with Google'}
                busy={busy}
                colors={colors}
                icon="google"
                onPress={() => void withBusy(() => auth.signInWithGoogle())}
              />
            </View>
          ) : null}

          {screen === 'email' ? (
            <View style={styles.form}>
              <View style={styles.field}>
                <AppText variant="footnote" weight="600">Email address</AppText>
                <GlassSurface style={styles.inputGlass}>
                  <AppIcon name={{ ios: 'envelope', android: 'mail', web: 'mail' }} size={18} color={colors.secondary} />
                  <TextInput
                    accessibilityLabel="Email address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    autoFocus
                    keyboardType="email-address"
                    onChangeText={(value) => { setEmail(value); if (error) setError(null) }}
                    onSubmitEditing={continueFromEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.muted}
                    returnKeyType="go"
                    style={[styles.input, { color: colors.text }]}
                    textContentType="emailAddress"
                    value={email}
                  />
                </GlassSurface>
              </View>
              <PrimaryButton title="Continue" busy={busy} onPress={continueFromEmail} />
            </View>
          ) : null}

          {screen === 'code' ? (
            <View style={styles.form}>
              <View style={styles.otpWrap}>
                <View style={styles.otpCells} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {Array.from({ length: OTP_LENGTH }, (_, index) => {
                    const active = index === Math.min(code.length, OTP_LENGTH - 1)
                    return (
                      <View
                        key={index}
                        style={[
                          styles.otpCell,
                          { backgroundColor: colors.surface, borderColor: active ? PLANOMY_BLUE : colors.separator },
                          active && styles.otpCellActive,
                        ]}
                      >
                        <AppText style={[styles.otpDigit, { lineHeight: 28 * fontScale }]} weight="600">{code[index] ?? ''}</AppText>
                      </View>
                    )
                  })}
                </View>
                <TextInput
                  accessibilityLabel="8-digit email code"
                  accessibilityHint="Paste or type the code from your email."
                  autoCapitalize="none"
                  autoComplete="one-time-code"
                  autoCorrect={false}
                  autoFocus
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  onChangeText={(value) => { setCode(value.replace(/\D/g, '').slice(0, OTP_LENGTH)); if (error) setError(null) }}
                  onSubmitEditing={() => void verifyCode()}
                  returnKeyType="go"
                  selectionColor="transparent"
                  style={styles.otpInput}
                  textContentType="oneTimeCode"
                  value={code}
                />
              </View>
              <PrimaryButton title="Continue" busy={busy} onPress={() => void verifyCode()} />
              <View style={styles.codeActions}>
                <Pressable accessibilityRole="button" disabled={busy} onPress={goBack} style={({ pressed }) => [styles.textAction, pressed && styles.linkPressed]}>
                  <AppText tone="accent" weight="600">Change email</AppText>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={busy || resendCountdown > 0} onPress={() => void resendCode()} style={({ pressed }) => [styles.textAction, (busy || resendCountdown > 0) && styles.disabled, pressed && styles.linkPressed]}>
                  <AppText tone={resendCountdown > 0 ? 'muted' : 'accent'} weight="600">
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
                  </AppText>
                </Pressable>
              </View>
              {emailIntent === 'sign-in' ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => { setPassword(''); setPasswordReturn('code'); setScreen('password'); clearError() }}
                  style={({ pressed }) => [styles.textAction, pressed && styles.linkPressed]}
                >
                  <AppText tone="accent" weight="600">Use your password instead</AppText>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {screen === 'password' ? (
            <View style={styles.form}>
              <View style={styles.accountIdentity}>
                <AppIcon name={{ ios: 'envelope', android: 'mail', web: 'mail' }} size={16} color={colors.secondary} />
                <AppText numberOfLines={1} selectable style={styles.accountEmail}>{email}</AppText>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setScreen('email'); clearError() }} style={({ pressed }) => [styles.changeEmailButton, pressed && styles.linkPressed]}>
                  <AppText tone="accent" weight="600">Change</AppText>
                </Pressable>
              </View>
              <View style={styles.field}>
                <AppText variant="footnote" weight="600">Account password</AppText>
                <GlassSurface style={styles.inputGlass}>
                  <AppIcon name={{ ios: 'lock', android: 'lock', web: 'lock' }} size={18} color={colors.secondary} />
                  <TextInput
                    accessibilityLabel="Account password"
                    autoCapitalize="none"
                    autoComplete="current-password"
                    autoCorrect={false}
                    onChangeText={(value) => { setPassword(value); if (error) setError(null) }}
                    onSubmitEditing={() => void signInWithAccountPassword()}
                    placeholder="Password"
                    placeholderTextColor={colors.muted}
                    returnKeyType="go"
                    secureTextEntry={!showPassword}
                    style={[styles.input, { color: colors.text }]}
                    textContentType="password"
                    value={password}
                  />
                  <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((value) => !value)} style={styles.visibilityButton}>
                    <AppIcon name={showPassword ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' } : { ios: 'eye', android: 'visibility', web: 'visibility' }} size={20} color={colors.secondary} />
                  </Pressable>
                </GlassSurface>
              </View>
              <PrimaryButton title="Continue" busy={busy} onPress={() => void signInWithAccountPassword()} />
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={() => void requestCode('sign-in')} style={({ pressed }) => [styles.textAction, pressed && styles.linkPressed, busy && styles.disabled]}>
                <AppText tone="accent" weight="600">Send me an email code instead</AppText>
              </Pressable>
            </View>
          ) : null}

          {visibleError ? <AppText accessibilityRole="alert" tone="danger" style={styles.error}>{visibleError}</AppText> : null}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.legal, { color: colors.muted, lineHeight: 18 * fontScale }]}>
            By continuing, you agree to Planomy’s{' '}
            <Text accessibilityRole="link" onPress={() => openTerms('https://planomy.com/terms')} style={[styles.legalLink, { color: colors.secondary }]}>Terms of Service</Text>
            {' '}and{' '}
            <Text accessibilityRole="link" onPress={() => openTerms('https://planomy.com/privacy')} style={[styles.legalLink, { color: colors.secondary }]}>Privacy Policy</Text>
            .
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function PrimaryButton({
  title,
  busy,
  onPress,
  icon,
}: {
  title: string
  busy: boolean
  onPress: () => void
  icon?: 'email' | 'google'
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, pressed && !busy && styles.primaryPressed, busy && styles.disabled]}
    >
      <GlassSurface interactive tintColor={PLANOMY_BLUE} style={styles.primarySurface}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : (
          <View style={styles.primaryContent}>
            {icon === 'email' ? <AppIcon name={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }} size={19} color="#FFFFFF" /> : null}
            {icon === 'google' ? <Image source={require('../assets/google-g.png')} style={styles.googleMark} resizeMode="contain" /> : null}
            <AppText weight="700" style={styles.primaryLabel}>{title}</AppText>
          </View>
        )}
      </GlassSurface>
    </Pressable>
  )
}

function GlassButton({
  title,
  busy,
  colors,
  onPress,
  icon,
}: {
  title: string
  busy: boolean
  colors: ReturnType<typeof useHomeTheme>
  onPress: () => void
  icon?: 'google'
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.glassButton, pressed && !busy && styles.primaryPressed, busy && styles.disabled]}
    >
      <GlassSurface interactive style={styles.glassButtonSurface}>
        {busy ? <ActivityIndicator color={colors.text} /> : (
          <>
            {icon === 'google' ? <Image source={require('../assets/google-g.png')} style={styles.googleMark} resizeMode="contain" /> : null}
            <AppText weight="600" style={styles.glassButtonLabel}>{title}</AppText>
          </>
        )}
      </GlassSurface>
    </Pressable>
  )
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    gap: spacing.xxxl,
  },
  main: { flexGrow: 1, justifyContent: 'flex-start', gap: spacing.xxxl + spacing.xxl },
  welcomeMain: { justifyContent: 'space-between', paddingTop: spacing.sm, gap: spacing.xl },
  welcomeContent: { flexGrow: 1, justifyContent: 'space-between', gap: spacing.xxxl },
  welcomeHero: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', minHeight: 280 },
  brandLockup: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.sm },
  brandMark: { width: 28, height: 28, transform: [{ translateY: 4 }] },
  wordmark: { fontSize: 27, lineHeight: 33, fontWeight: '600', letterSpacing: -0.6 },
  dmSansWordmark: { fontFamily: 'PlanomyDMSans' },
  backButton: { width: AUTH_BUTTON_HEIGHT, minHeight: AUTH_BUTTON_HEIGHT, borderRadius: AUTH_BUTTON_RADIUS, alignSelf: 'flex-start' },
  backGlass: { width: AUTH_BUTTON_HEIGHT, minHeight: AUTH_BUTTON_HEIGHT, borderRadius: AUTH_BUTTON_RADIUS, padding: 0, justifyContent: 'center', alignItems: 'center' },
  intro: { gap: spacing.md },
  title: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.9 },
  subtitle: { fontSize: 18, lineHeight: 26, maxWidth: 410 },
  actions: { gap: spacing.md },
  glassButton: { minHeight: AUTH_BUTTON_HEIGHT, borderRadius: AUTH_BUTTON_RADIUS, borderCurve: 'continuous' },
  glassButtonSurface: { minHeight: AUTH_BUTTON_HEIGHT, borderRadius: AUTH_BUTTON_RADIUS, borderCurve: 'continuous', paddingVertical: 0, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  glassButtonLabel: { fontSize: 17, lineHeight: 23 },
  googleMark: { width: 21, height: 21 },
  primaryButton: { minHeight: AUTH_BUTTON_HEIGHT, borderRadius: AUTH_BUTTON_RADIUS, borderCurve: 'continuous' },
  primarySurface: { minHeight: AUTH_BUTTON_HEIGHT, borderRadius: AUTH_BUTTON_RADIUS, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingVertical: 0, paddingHorizontal: spacing.lg },
  primaryContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  primaryLabel: { color: '#FFFFFF', fontSize: 16, lineHeight: 21 },
  primaryPressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  form: { gap: spacing.lg },
  field: { gap: spacing.sm },
  inputGlass: { minHeight: 64, borderRadius: 32, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 0, paddingHorizontal: spacing.lg },
  input: { flex: 1, minHeight: 62, fontSize: 17, paddingVertical: spacing.md },
  accountIdentity: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  accountEmail: { flex: 1, fontSize: 15 },
  changeEmailButton: { minHeight: AUTH_BUTTON_HEIGHT, borderRadius: AUTH_BUTTON_RADIUS, justifyContent: 'center', paddingHorizontal: spacing.xs },
  visibilityButton: { width: AUTH_BUTTON_HEIGHT, minHeight: AUTH_BUTTON_HEIGHT, borderRadius: AUTH_BUTTON_RADIUS, alignItems: 'center', justifyContent: 'center' },
  textAction: { minHeight: AUTH_BUTTON_HEIGHT, borderRadius: AUTH_BUTTON_RADIUS, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  linkPressed: { opacity: 0.55 },
  codeActions: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  otpWrap: { minHeight: 66, justifyContent: 'center' },
  otpCells: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  otpCell: { flex: 1, height: 62, minWidth: 0, borderWidth: 1, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  otpCellActive: { borderWidth: 1.5 },
  otpDigit: { fontSize: 22, lineHeight: 28, fontVariant: ['tabular-nums'] },
  otpInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.015, color: 'transparent' },
  error: { marginTop: -spacing.md },
  footer: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg },
  legal: { fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 380 },
  legalLink: { textDecorationLine: 'underline', fontWeight: '600' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.65 },
})
