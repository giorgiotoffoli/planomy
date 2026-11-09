import { Host, Switch as ExpoSwitch } from '@expo/ui'
import { StyleSheet, View } from 'react-native'
import { AppIcon } from '@/components/ui/primitives'
import type { TaskFocusToggleProps } from './task-focus-toggle.shared'

export function TaskFocusToggle({
  value,
  disabled,
  accentColor,
  onValueChange,
}: TaskFocusToggleProps) {
  return (
    <View style={styles.row}>
      <AppIcon
        name={{ ios: 'star.fill', android: 'star', web: 'star' }}
        size={18}
        color={accentColor}
      />
      <Host seedColor={accentColor} style={styles.switchHost}>
        <ExpoSwitch
          label="Add to Focus"
          value={value}
          disabled={disabled}
          onValueChange={onValueChange}
        />
      </Host>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchHost: { flex: 1, minHeight: 44, alignSelf: 'stretch' },
})
