import { Keyboard, StyleSheet, TextInput, View } from 'react-native'
import { AppIcon } from '@/components/ui/primitives'
import { spacing, useHomeTheme } from '@/features/home/theme'
import { GlassSurface } from '@/components/glass-surface'

export function SearchInput({
  query,
  onChangeText,
  topPadding,
  autoFocus = false,
}: {
  query: string
  onChangeText: (query: string) => void
  topPadding: number
  autoFocus?: boolean
}) {
  const colors = useHomeTheme()
  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <GlassSurface style={styles.field}>
        <AppIcon
          name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
          size={18}
          color={colors.secondary}
        />
        <TextInput
          accessibilityLabel="Search tasks and events"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          clearButtonMode="while-editing"
          onChangeText={onChangeText}
          onSubmitEditing={Keyboard.dismiss}
          placeholder="Search tasks and events"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          selectionColor={colors.accent}
          style={[styles.input, { color: colors.text }]}
          value={query}
        />
      </GlassSurface>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { width: '100%', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  field: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 28,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.lg,
    paddingVertical: 0,
  },
  input: { flex: 1, minHeight: 54, fontSize: 16, paddingVertical: 0 },
})
