import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppButton, AppSurface, AppText } from '@/components/ui/primitives'
import { useHomeTheme, spacing } from '@/features/home/theme'
import { useAuth } from '@/lib/auth/AuthProvider'
import { OTP_LENGTH } from '@/lib/auth/errors'

type SignInMode = 'password' | 'code'
type CodeStep = 'email' | 'verify'

export default function SignInScreen() {
  const colors = useHomeTheme()
  const insets = useSafeAreaInsets()
  const auth = useAuth()
  const [mode, setMode] = useState<SignInMode>('password')
  const [codeStep, setCodeStep] = useState<CodeStep>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signInWithPassword() {
    setBusy(true)
    setError(null)
    const result = await auth.signInWithPassword(email, password)
    if (!result.ok) {
      setError(result.error)
      setBusy(false)
    }
  }

  async function requestCode() {
    setBusy(true)
    setError(null)
    const result = await auth.requestEmailCode(email)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setEmail(email.trim())
    setCode('')
    setCodeStep('verify')
  }

  async function verifyCode() {
    setBusy(true)
    setError(null)
    const result = await auth.verifyEmailCode(email, code)
    if (!result.ok) {
      setError(result.error)
      setBusy(false)
    }
  }

  async function openSignUp() {
    setError(null)
    try {
      await Linking.openURL('https://www.planomy.com/auth')
    } catch {
      setError('Could not open Planomy on the web. Try planomy.com/auth in your browser.')
    }
  }

  function changeMode(nextMode: SignInMode) {
    setMode(nextMode)
    setCodeStep('email')
    setCode('')
    setError(null)
    auth.clearNotice()
  }

  function inputStyle() {
    return [
      styles.input,
      {
        backgroundColor: colors.background,
        borderColor: colors.separator,
        color: colors.text,
      },
    ]
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, spacing.xxl), paddingBottom: Math.max(insets.bottom, spacing.xxl) },
        ]}
      >
        <View style={styles.intro}>
          <AppText variant="caption" tone="accent" weight="700">PLANOMY</AppText>
          <AppText variant="heading">Welcome back</AppText>
          <AppText tone="secondary">Sign in with the same account you use on the web.</AppText>
        </View>

        <AppSurface variant="card" style={styles.section}>
          <AppText variant="title" weight="700">Sign in</AppText>
          <AppText tone="secondary">Choose email and password or an 8-digit email code.</AppText>
          <View style={styles.modeRow}>
            <AppButton
              title="Password"
              variant={mode === 'password' ? 'secondary' : 'ghost'}
              disabled={busy}
              onPress={() => changeMode('password')}
              style={styles.modeButton}
            />
            <AppButton
              title="Email code"
              variant={mode === 'code' ? 'secondary' : 'ghost'}
              disabled={busy}
              onPress={() => changeMode('code')}
              style={styles.modeButton}
            />
          </View>

          {mode === 'password' ? (
            <>
              <View style={styles.field}>
                <AppText variant="footnote" weight="600">Email</AppText>
                <TextInput
                  accessibilityLabel="Email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  onSubmitEditing={() => undefined}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                  returnKeyType="next"
                  style={inputStyle()}
                  textContentType="emailAddress"
                  value={email}
                />
              </View>
              <View style={styles.field}>
                <AppText variant="footnote" weight="600">Password</AppText>
                <TextInput
                  accessibilityLabel="Password"
                  autoCapitalize="none"
                  autoComplete="current-password"
                  onChangeText={setPassword}
                  onSubmitEditing={() => void signInWithPassword()}
                  placeholder="Password"
                  placeholderTextColor={colors.muted}
                  returnKeyType="go"
                  secureTextEntry
                  style={inputStyle()}
                  textContentType="password"
                  value={password}
                />
              </View>
              <AppButton disabled={busy} onPress={() => void signInWithPassword()}>
                {busy ? <ActivityIndicator color={colors.onAccent} /> : <AppText tone="primary" weight="700" style={{ color: colors.onAccent }}>Sign in</AppText>}
              </AppButton>
            </>
          ) : codeStep === 'email' ? (
            <>
              <View style={styles.field}>
                <AppText variant="footnote" weight="600">Email</AppText>
                <TextInput
                  accessibilityLabel="Email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  onSubmitEditing={() => void requestCode()}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                  returnKeyType="go"
                  style={inputStyle()}
                  textContentType="emailAddress"
                  value={email}
                />
              </View>
              <AppButton disabled={busy} onPress={() => void requestCode()}>
                {busy ? <ActivityIndicator color={colors.onAccent} /> : <AppText weight="700" style={{ color: colors.onAccent }}>Send code</AppText>}
              </AppButton>
            </>
          ) : (
            <>
              <AppText tone="secondary">If {email} has an account, we sent an 8-digit code.</AppText>
              <View style={styles.field}>
                <AppText variant="footnote" weight="600">8-digit code</AppText>
                <TextInput
                  accessibilityLabel="8-digit email code"
                  autoComplete="one-time-code"
                  keyboardType="number-pad"
                  maxLength={8}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                  onSubmitEditing={() => void verifyCode()}
                  placeholder="00000000"
                  placeholderTextColor={colors.muted}
                  returnKeyType="go"
                  style={[inputStyle(), styles.codeInput]}
                  textContentType="oneTimeCode"
                  value={code}
                />
              </View>
              <AppButton disabled={busy || code.length !== OTP_LENGTH} onPress={() => void verifyCode()}>
                {busy ? <ActivityIndicator color={colors.onAccent} /> : <AppText weight="700" style={{ color: colors.onAccent }}>Verify code</AppText>}
              </AppButton>
              <View style={styles.secondaryActions}>
                <AppButton title="Change email" variant="ghost" disabled={busy} onPress={() => { setCodeStep('email'); setCode(''); setError(null) }} />
                <AppButton title="Resend code" variant="ghost" disabled={busy} onPress={() => void requestCode()} />
              </View>
            </>
          )}

          {error || auth.notice || (auth.state.status === 'unauthenticated' ? auth.state.message : null) ? (
            <AppText accessibilityRole="alert" tone="danger">{error ?? auth.notice ?? (auth.state.status === 'unauthenticated' ? auth.state.message : '')}</AppText>
          ) : null}
        </AppSurface>

        <AppSurface variant="card" style={styles.section}>
          <AppText variant="title" weight="700">Sign up</AppText>
          <AppText tone="secondary">
            New accounts still need web onboarding to create an encrypted vault. Finish sign up on Planomy web for now.
          </AppText>
          <AppButton title="Create an account on the web" variant="secondary" onPress={() => void openSignUp()} />
        </AppSurface>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  intro: { gap: spacing.sm },
  section: { gap: spacing.md },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeButton: { flex: 1 },
  field: { gap: spacing.xs },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  codeInput: { letterSpacing: 5, textAlign: 'center', fontVariant: ['tabular-nums'] },
  secondaryActions: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
})
