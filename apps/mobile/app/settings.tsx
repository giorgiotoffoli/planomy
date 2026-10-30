import { useState } from 'react'
import { Alert } from 'react-native'
import {
  Host,
  Form,
  Section,
  Toggle,
  Picker,
  Text,
  Button,
} from '@expo/ui/swift-ui'
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers'
import { useAuth } from '@/lib/auth/AuthProvider'

export default function FormSectionsExample() {
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [language, setLanguage] = useState(0)
  const { biometricAvailable, biometricEnabled, disableBiometrics, lockVault } = useAuth()
  const languages = ['English', 'Spanish', 'French', 'German']

  return (
    <Host style={{ flex: 1 }}>
      <Form>
        <Section title="Vault security">
          <Button label="Lock vault" onPress={lockVault} />
          {biometricEnabled ? (
            <Button label="Remove Face ID or Touch ID" onPress={() => {
              void disableBiometrics().then((result) => {
                if (!result.ok) Alert.alert('Could not remove biometrics', result.error)
              })
            }} />
          ) : biometricAvailable ? (
            <Text>Lock your vault to set up Face ID or Touch ID.</Text>
          ) : (
            <Text>Set up Face ID or Touch ID on your device and use a native Planomy build.</Text>
          )}
        </Section>
        <Section title="Appearance">
          <Toggle
            label="Dark Mode"
            isOn={darkMode}
            onIsOnChange={setDarkMode}
          />
          <Picker
            label="Language"
            selection={language}
            onSelectionChange={setLanguage}
            modifiers={[pickerStyle('menu')]}
          >
            {languages.map((lang, index) => (
              <Text key={index} modifiers={[tag(index)]}>
                {lang}
              </Text>
            ))}
          </Picker>
        </Section>
        <Section title="Notifications">
          <Toggle
            label="Push Notifications"
            isOn={notifications}
            onIsOnChange={setNotifications}
          />
        </Section>
        <Section title="Account">
          <Button
            label="Sign out"
            role="destructive"
            onPress={() => alert('Signed out')}
          />
        </Section>
      </Form>
    </Host>
  )
}
