import { Host } from '@expo/ui'
import {
  Icon,
  Row,
  Switch as ComposeSwitch,
  Text as ComposeText,
} from '@expo/ui/jetpack-compose'
import {
  defaultMinSize,
  fillMaxWidth,
  toggleable,
  weight,
} from '@expo/ui/jetpack-compose/modifiers'
import focusStar from '../../assets/icons/focus-star.xml'
import type { TaskFocusToggleProps } from './task-focus-toggle.shared'

export function TaskFocusToggle({
  value,
  disabled,
  accentColor,
  textColor,
  onValueChange,
}: TaskFocusToggleProps) {
  return (
    <Host seedColor={accentColor} style={{ flex: 1, minHeight: 48 }}>
      <Row
        verticalAlignment="center"
        horizontalArrangement={{ spacedBy: 8 }}
        modifiers={[
          fillMaxWidth(),
          toggleable(
            value,
            () => onValueChange(!value),
            { role: 'switch', enabled: !disabled },
          ),
        ]}
      >
        <Icon
          source={focusStar}
          tint={accentColor}
          size={18}
        />
        <ComposeText color={textColor} modifiers={[weight(1)]}>
          Add to Focus
        </ComposeText>
        <ComposeSwitch
          value={value}
          enabled={!disabled}
          modifiers={[defaultMinSize({ minWidth: 48, minHeight: 48 })]}
        />
      </Row>
    </Host>
  )
}
