import { SymbolView } from 'expo-symbols'
import { Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type AddTaskButtonProps = {
  onPress?: () => void
}

export function AddTaskButton({ onPress }: AddTaskButtonProps) {
  const insets = useSafeAreaInsets()

  return (
    <Pressable
      accessibilityLabel="Add task"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { bottom: insets.bottom + 72 },
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={{ ios: 'plus', android: 'add', web: 'add' }}
        tintColor="#FFFFFF"
        size={25}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 30,
    bottom: 0,
    elevation: 5,
    height: 58,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    shadowColor: '#001A3D',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 9,
    width: 58,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.94 }],
  },
})
