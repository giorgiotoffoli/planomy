import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
  isAvailableAsync,
} from 'expo-apple-authentication'

export function AppleSignInButton({
  onPress,
  disabled,
}: {
  onPress: () => void
  disabled?: boolean
}) {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    let mounted = true
    void isAvailableAsync().then((value) => {
      if (mounted) setAvailable(value)
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  if (!available) return <View />

  return (
    <View style={[styles.wrapper, disabled && styles.disabled]}>
      <AppleAuthenticationButton
        accessibilityLabel="Continue with Apple"
        buttonStyle={AppleAuthenticationButtonStyle.WHITE}
        buttonType={AppleAuthenticationButtonType.CONTINUE}
        cornerRadius={16}
        onPress={onPress}
        style={styles.button}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { height: 54 },
  button: { width: '100%', height: 54 },
  disabled: { opacity: 0.55 },
})
