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
  View,
} from 'react-native'
import { Stack } from 'expo-router'
import { AppIcon, AppText } from '@/components/ui/primitives'
import { useHomeTheme, radii, spacing } from '@/features/home/theme'
import { useAuth } from '@/lib/auth/AuthProvider'

export default function AccountPasswordScreen() {
  const colors = useHomeTheme()
  const { requiresAccountPassword, updateAccountPassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function submit() {
    if (busy) return
    setError(null)
    setMessage(null)
    if (!newPassword) return setError('Enter a new account password.')
    if (newPassword !== confirmPassword) return setError('New passwords do not match.')
    if (!requiresAccountPassword && !currentPassword) return setError('Enter your current account password.')

    Keyboard.dismiss()
    setBusy(true)
    try {
      const result = await updateAccountPassword(currentPassword, newPassword, confirmPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage(result.warning ?? 'Your account password is ready to use.')
    } finally {
      setBusy(false)
    }
  }

  const passwordField = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    placeholder: string,
    isNew = false,
  ) => (
    <View style={styles.fieldGroup}>
      <AppText variant="footnote" weight="600">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoComplete={isNew ? 'new-password' : 'current-password'}
        autoCorrect={false}
        editable={!busy}
        onChangeText={(value) => { onChangeText(value); setError(null); setMessage(null) }}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        returnKeyType="next"
        secureTextEntry={!showPasswords}
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.separator, color: colors.text }]}
        textContentType={isNew ? 'newPassword' : 'password'}
        value={value}
      />
    </View>
  )

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <Stack.Screen options={{ title: 'Account Password' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.intro}>
          <View style={[styles.icon, { backgroundColor: colors.subtle }]}>
            <AppIcon name="key.fill" color={colors.accent} size={24} />
          </View>
          <AppText accessibilityRole="header" variant="heading" weight="700">
            {requiresAccountPassword ? 'Create an account password' : 'Change your account password'}
          </AppText>
          <AppText tone="secondary">
            This password signs you in to Planomy and can confirm account deletion. It is separate from your Vault Key and does not change your encrypted data.
          </AppText>
        </View>

        {!requiresAccountPassword ? passwordField('Current account password', currentPassword, setCurrentPassword, 'Enter current password') : null}
        {passwordField('New account password', newPassword, setNewPassword, 'Enter new password', true)}
        {passwordField('Confirm new account password', confirmPassword, setConfirmPassword, 'Confirm new password', true)}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showPasswords ? 'Hide account passwords' : 'Show account passwords'}
          onPress={() => setShowPasswords((visible) => !visible)}
          style={styles.visibilityToggle}
        >
          <AppText variant="footnote" weight="600" style={{ color: colors.accent }}>
            {showPasswords ? 'Hide passwords' : 'Show passwords'}
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void submit()}
          style={({ pressed }) => [styles.pressable, { backgroundColor: colors.accent }, busy && styles.disabled, pressed && styles.pressed]}
        >
          <View style={styles.action}>
            {busy ? <ActivityIndicator color={colors.onAccent} /> : <AppText weight="700" style={{ color: colors.onAccent }}>{requiresAccountPassword ? 'Create account password' : 'Change account password'}</AppText>}
          </View>
        </Pressable>

        {error ? <AppText accessibilityRole="alert" tone="danger" variant="footnote">{error}</AppText> : null}
        {message ? <AppText accessibilityRole="alert" tone="success" variant="footnote">{message}</AppText> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, gap: spacing.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  intro: { alignItems: 'flex-start', gap: spacing.md },
  icon: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, width: 52, height: 52, marginBottom: spacing.xs },
  fieldGroup: { gap: spacing.sm },
  input: { minHeight: 54, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg, fontSize: 17 },
  visibilityToggle: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  pressable: { borderRadius: radii.xl },
  action: { alignItems: 'center', justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
})
