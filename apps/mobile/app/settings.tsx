import { useState } from 'react'
import { Alert, Linking, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Host, FieldGroup, ListItem, Switch, Text } from '@expo/ui'
import { AppIcon } from '@/components/ui/primitives'
import { useHomeTheme } from '@/features/home/theme'
import { useAuth } from '@/lib/auth/AuthProvider'
import { markBiometricOffered } from '@/lib/vault/biometric-vault'

const PRIVACY_URL = 'https://planomy.com/privacy'
const TERMS_URL = 'https://planomy.com/terms'

function openLegalPage(url: string) {
  void Linking.openURL(url).catch(() => {
    Alert.alert('Couldn’t open link', 'Check your connection and try again.')
  })
}

export default function SettingsScreen() {
  const router = useRouter()
  const colors = useHomeTheme()
  const [biometricBusy, setBiometricBusy] = useState(false)
  const {
    state,
    biometricAvailable,
    biometricEnabled,
    enableBiometrics,
    disableBiometrics,
    lockVault,
    signOut,
  } = useAuth()
  const email = state.status === 'unlocked' || state.status === 'authenticated-but-locked'
    ? state.user.email
    : null

  function toggleBiometrics(enabled: boolean) {
    if (biometricBusy) return
    if (state.status === 'unlocked') void markBiometricOffered(state.user.id).catch(() => {})
    if (!enabled) {
      setBiometricBusy(true)
      void disableBiometrics().then((result) => {
        if (!result.ok) Alert.alert('Could not turn off Face ID', result.error)
      }).finally(() => setBiometricBusy(false))
      return
    }
    Alert.prompt(
      'Use Face ID',
      'Enter your Vault Key to securely enable Face ID for this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Enable', onPress: (password) => {
          if (!password) return
          setBiometricBusy(true)
          void enableBiometrics(password).then((result) => {
            if (!result.ok) Alert.alert('Could not enable Face ID', result.error)
          }).finally(() => setBiometricBusy(false))
        } },
      ],
      'secure-text',
    )
  }

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You’ll need to sign in and unlock your vault again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut().then((result) => {
            if (!result.ok) Alert.alert('Could not sign out', result.error)
          })
        },
      },
    ])
  }

  return (
    <Host style={{ flex: 1 }}>
      <FieldGroup>
        <FieldGroup.Section title="Vault security">
          <ListItem
            leading={<AppIcon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} />}
            onPress={lockVault}
          >
            <Text>Lock vault</Text>
          </ListItem>
          {Platform.OS === 'ios' ? <Switch label="Use Face ID" value={biometricEnabled} onValueChange={toggleBiometrics} disabled={!biometricAvailable || biometricBusy} /> : null}
          {!biometricAvailable && Platform.OS === 'ios' ? (
            <FieldGroup.SectionFooter>
              <Text>Set up Face ID on your device to use it to unlock your vault.</Text>
            </FieldGroup.SectionFooter>
          ) : null}
        </FieldGroup.Section>

        <FieldGroup.Section title="Legal">
          <ListItem
            leading={<AppIcon name={{ ios: 'hand.raised.fill', android: 'security', web: 'security' }} />}
            trailing={<AppIcon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} color={colors.muted} />}
            onPress={() => openLegalPage(PRIVACY_URL)}
          >
            <Text>Privacy Policy</Text>
          </ListItem>
          <ListItem
            leading={<AppIcon name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }} />}
            trailing={<AppIcon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} color={colors.muted} />}
            onPress={() => openLegalPage(TERMS_URL)}
          >
            <Text>Terms of Service</Text>
          </ListItem>
        </FieldGroup.Section>

        <FieldGroup.Section title="Account">
          {email ? <Text>{email}</Text> : null}
          <ListItem
            leading={<AppIcon name={{ ios: 'key.fill', android: 'key', web: 'key' }} />}
            trailing={<AppIcon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} color={colors.muted} />}
            onPress={() => router.push('/account-password')}
          >
            <Text>Account password</Text>
          </ListItem>
          <ListItem
            leading={<AppIcon name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }} color={colors.danger} />}
            onPress={handleSignOut}
          >
            <Text textStyle={{ color: colors.danger }}>Sign out</Text>
          </ListItem>
          <ListItem
            leading={<AppIcon name={{ ios: 'trash', android: 'delete', web: 'delete' }} color={colors.danger} />}
            trailing={<AppIcon name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} color={colors.muted} />}
            onPress={() => router.push('/delete-account')}
          >
            <Text textStyle={{ color: colors.danger }}>Delete Account</Text>
          </ListItem>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  )
}
