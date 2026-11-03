import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { AppIcon, AppText } from '@/components/ui/primitives'
import { useHomeTheme, radii, spacing } from '@/features/home/theme'
import { useAuth } from '@/lib/auth/AuthProvider'

export default function DeleteAccountScreen() {
  const router = useRouter()
  const colors = useHomeTheme()
  const { state, requiresAccountPassword, deleteAccount } = useAuth()
  const email = state.status === 'unlocked' || state.status === 'authenticated-but-locked'
    ? state.user.email
    : null
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const operationInProgress = useRef(false)
  const canDelete = password.length > 0 && confirmation === 'DELETE' && !busy

  const performDeletion = async () => {
    if (!canDelete || operationInProgress.current) return
    operationInProgress.current = true
    setBusy(true)
    setError(null)
    setMessage(null)
    Keyboard.dismiss()
    try {
      const result = await deleteAccount(password, confirmation)
      setPassword('')
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage(result.warning ?? 'Your account was deleted.')
      // AuthProvider clears the local session after server confirmation.
    } finally {
      operationInProgress.current = false
      setBusy(false)
    }
  }

  const confirmDeletion = () => {
    Keyboard.dismiss()
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your Planomy account and account data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: () => void performDeletion() },
      ],
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <Stack.Screen options={{ title: 'Delete Account' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.intro}>
          <View style={[styles.icon, { backgroundColor: colors.dangerSubtle }]}>
            <AppIcon name="trash" color={colors.danger} size={26} />
          </View>
          <AppText accessibilityRole="header" variant="heading" weight="700">Delete your account</AppText>
          <AppText tone="secondary">
            Confirm with your Planomy account password before anything is deleted.
          </AppText>
        </View>

        <View style={[styles.notice, { borderColor: colors.separator }]}>
          <AppText variant="footnote" weight="700">Before you continue</AppText>
          <AppText variant="footnote" tone="secondary">
            Account deletion is permanent and cannot be undone. Your encrypted planner data and encryption key will also be removed.
          </AppText>
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="footnote" weight="600">Account email</AppText>
          <View style={[styles.valueField, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
            <AppText numberOfLines={1} style={styles.valueText}>{email ?? 'No signed-in email found'}</AppText>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeading}>
            <AppText variant="footnote" weight="600">Account password</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide account password' : 'Show account password'}
              onPress={() => setShowPassword((visible) => !visible)}
              hitSlop={8}
            >
              <AppText variant="footnote" weight="600" style={{ color: colors.accent }}>
                {showPassword ? 'Hide' : 'Show'}
              </AppText>
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel="Account password"
            autoCapitalize="none"
            autoComplete="current-password"
            autoCorrect={false}
            editable={!busy}
            onChangeText={(value) => { setPassword(value); setError(null) }}
            placeholder="Enter your account password"
            placeholderTextColor={colors.muted}
            returnKeyType="next"
            secureTextEntry={!showPassword}
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.separator, color: colors.text }]}
            textContentType="password"
            value={password}
          />
          {requiresAccountPassword ? (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => router.push('/account-password')}
              style={({ pressed }) => [styles.createPassword, pressed && styles.pressed]}
            >
              <AppText variant="footnote" weight="600" style={{ color: colors.accent }}>
                Create account password
              </AppText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="footnote" weight="600">Type DELETE to confirm</AppText>
          <TextInput
            accessibilityLabel="Type DELETE to confirm account removal"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy}
            onChangeText={(value) => { setConfirmation(value); setError(null) }}
            placeholder="DELETE"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.separator, color: colors.text }]}
            value={confirmation}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityHint="Permanently deletes your account after one more confirmation."
          disabled={!canDelete}
          onPress={confirmDeletion}
          style={({ pressed }) => [styles.pressable, !canDelete && styles.disabled, pressed && styles.pressed]}
        >
          <View style={styles.action}>
            {busy ? <ActivityIndicator color={colors.danger} /> : <AppText tone="danger" weight="700">Delete Account</AppText>}
          </View>
        </Pressable>

        {error ? <AppText accessibilityRole="alert" tone="danger" variant="footnote">{error}</AppText> : null}
        {message ? <AppText accessibilityRole="alert" tone={error ? 'danger' : 'secondary'} variant="footnote">{message}</AppText> : null}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => router.back()} style={styles.cancel}>
          <AppText variant="footnote" tone="secondary" weight="600">Cancel</AppText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, gap: spacing.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  intro: { alignItems: 'flex-start', gap: spacing.md },
  icon: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, width: 52, height: 52, marginBottom: spacing.xs },
  notice: { gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.lg },
  fieldGroup: { gap: spacing.sm },
  fieldHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  valueField: { minHeight: 52, justifyContent: 'center', borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg },
  valueText: { flexShrink: 1 },
  input: { minHeight: 54, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.lg, fontSize: 17 },
  createPassword: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  pressable: { borderRadius: radii.xl },
  action: { alignItems: 'center', justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  cancel: { alignSelf: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
})
