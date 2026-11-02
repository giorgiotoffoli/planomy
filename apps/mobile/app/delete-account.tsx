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
  const { state, requestEmailCode, deleteAccount } = useAuth()
  const email = state.status === 'unlocked' || state.status === 'authenticated-but-locked'
    ? state.user.email
    : null
  const [code, setCode] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState<'code' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const operationInProgress = useRef(false)
  const canDelete = /^\d{8}$/.test(code) && confirmation === 'DELETE' && busy === null

  const sendCode = async () => {
    if (!email || operationInProgress.current) return
    operationInProgress.current = true
    setBusy('code')
    setError(null)
    setMessage(null)
    Keyboard.dismiss()
    try {
      const result = await requestEmailCode(email)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setCodeSent(true)
      setCode('')
      setConfirmation('')
      setMessage(`An 8-digit confirmation code was sent to ${email}.`)
    } finally {
      operationInProgress.current = false
      setBusy(null)
    }
  }

  const performDeletion = async () => {
    if (!canDelete || operationInProgress.current) return
    operationInProgress.current = true
    setBusy('delete')
    setError(null)
    setMessage(null)
    try {
      const result = await deleteAccount(code, confirmation)
      if (!result.ok) {
        setCode('')
        setError(result.error)
        return
      }
      setMessage(result.warning ?? 'Your account was deleted.')
      // AuthProvider clears the local session after server confirmation. The
      // protected navigator then takes the user directly to sign-in.
    } finally {
      operationInProgress.current = false
      setBusy(null)
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
      <Stack.Screen options={{ title: 'Delete Account', headerBackTitle: 'Settings' }} />
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
            Permanently remove your Planomy account. We’ll verify your email before anything is deleted.
          </AppText>
        </View>

        <View style={[styles.notice, { borderColor: colors.separator }]}>
          <AppText variant="footnote" weight="700">Before you continue</AppText>
          <AppText variant="footnote" tone="secondary">
            Account deletion cannot be undone. Your encrypted planner data is tied to this account; make sure you have anything you need before deleting it.
          </AppText>
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="footnote" weight="600">Account email</AppText>
          <View style={[styles.valueField, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
            <AppText numberOfLines={1} style={styles.valueText}>{email ?? 'No signed-in email found'}</AppText>
          </View>
        </View>

        {!codeSent ? (
          <Pressable
            accessibilityRole="button"
            disabled={!email || busy !== null}
            onPress={() => void sendCode()}
            style={({ pressed }) => [styles.pressable, !email && styles.disabled, pressed && styles.pressed]}
          >
            <View style={styles.action}>
              {busy === 'code' ? <ActivityIndicator color={colors.accent} /> : <AppText weight="600" style={{ color: colors.accent }}>Send confirmation code</AppText>}
            </View>
          </Pressable>
        ) : (
          <>
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeading}>
                <AppText variant="footnote" weight="600">8-digit email code</AppText>
                <Pressable accessibilityRole="button" disabled={busy !== null} onPress={() => void sendCode()} hitSlop={8}>
                  <AppText variant="footnote" weight="600" style={{ color: colors.accent }}>{busy === 'code' ? 'Sending…' : 'Send again'}</AppText>
                </Pressable>
              </View>
              <TextInput
                accessibilityLabel="8-digit email confirmation code"
                autoComplete="one-time-code"
                editable={busy === null}
                keyboardType="number-pad"
                maxLength={8}
                onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Enter code"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.separator, color: colors.text }]}
                textContentType="oneTimeCode"
                value={code}
              />
            </View>
            <View style={styles.fieldGroup}>
              <AppText variant="footnote" weight="600">Type DELETE to confirm</AppText>
              <TextInput
                accessibilityLabel="Type DELETE to confirm account removal"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={busy === null}
                onChangeText={setConfirmation}
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
                {busy === 'delete' ? <ActivityIndicator color={colors.danger} /> : <AppText tone="danger" weight="700">Delete Account</AppText>}
              </View>
            </Pressable>
          </>
        )}

        {error ? <AppText accessibilityRole="alert" tone="danger" variant="footnote">{error}</AppText> : null}
        {message ? <AppText accessibilityRole="alert" tone={error ? 'danger' : 'secondary'} variant="footnote">{message}</AppText> : null}
        <Pressable accessibilityRole="button" disabled={busy !== null} onPress={() => router.back()} style={styles.cancel}>
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
  pressable: { borderRadius: radii.xl },
  action: { alignItems: 'center', justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  cancel: { alignSelf: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
})
