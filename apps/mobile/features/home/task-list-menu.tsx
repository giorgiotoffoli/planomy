import { Alert, Pressable, StyleSheet, Text } from 'react-native'
import { AppIcon } from '@/components/ui/primitives'
import { useHomeTheme } from './theme'
import {
  getCategoriesForList,
  getTaskListMenuLabel,
  type TaskListMenuProps,
} from './task-list-menu.shared'

export function TaskListMenu(props: TaskListMenuProps) {
  const colors = useHomeTheme()
  const selectedLabel = getTaskListMenuLabel(props)

  function chooseList(listId: string | null) {
    if (!listId) {
      props.onSelect(null, null)
      return
    }

    const categories = getCategoriesForList(props.categories, listId)
    if (categories.length === 0) {
      props.onSelect(listId, null)
      return
    }

    const list = props.lists.find((item) => item.id === listId)
    Alert.alert(list ? `Choose a category in ${list.title}` : 'Choose a category', undefined, [
      { text: 'No category', onPress: () => props.onSelect(listId, null) },
      ...categories.map((category) => ({
        text: category.title,
        onPress: () => props.onSelect(listId, category.id),
      })),
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`List, ${selectedLabel}`}
      accessibilityHint="Choose a list or a category within a list"
      accessibilityState={{ disabled: Boolean(props.disabled) }}
      disabled={props.disabled}
      onPress={() =>
        Alert.alert('Choose a list', undefined, [
          { text: 'Unsorted', onPress: () => chooseList(null) },
          ...props.lists.map((list) => ({
            text: `${list.emoji ? `${list.emoji} ` : ''}${list.title}`,
            onPress: () => chooseList(list.id),
          })),
          { text: 'Cancel', style: 'cancel' },
        ])
      }
      style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
    >
      <Text numberOfLines={1} style={{ color: colors.secondary, flexShrink: 1 }}>
        {selectedLabel}
      </Text>
      <AppIcon
        name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
        size={16}
        color={colors.muted}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 44,
    maxWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  pressed: { opacity: 0.65 },
})
