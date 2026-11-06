import { Host } from '@expo/ui'
import { Label, Toggle } from '@expo/ui/swift-ui'
import { disabled as disabledModifier } from '@expo/ui/swift-ui/modifiers'
import type { TaskFocusToggleProps } from './task-focus-toggle.shared'

export function TaskFocusToggle({
  value,
  disabled,
  accentColor,
  onValueChange,
}: TaskFocusToggleProps) {
  return (
    <Host seedColor={accentColor} style={{ flex: 1, minHeight: 44 }}>
      <Toggle
        isOn={value}
        onIsOnChange={onValueChange}
        modifiers={disabled ? [disabledModifier(true)] : []}
      >
        <Label
          title="Add to Focus"
          systemImage="star.fill"
          color={accentColor}
        />
      </Toggle>
    </Host>
  )
}
