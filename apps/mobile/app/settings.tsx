import { useState } from 'react'
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

export default function FormSectionsExample() {
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [language, setLanguage] = useState(0)
  const languages = ['English', 'Spanish', 'French', 'German']

  return (
    <Host style={{ flex: 1 }}>
      <Form>
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
