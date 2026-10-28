import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { Category, ListSummary } from '@planomy/types'
import { AppBadge, AppIcon, AppText } from '@/components/ui/primitives'
import { useHomeTheme, spacing, radii, listIdentityColors } from '@/features/home/theme'

export function ListIndicator({
  list,
  compact = false,
}: {
  list: Pick<ListSummary, 'title' | 'emoji' | 'color'>
  compact?: boolean
}) {
  return (
    <View style={styles.indicator}>
      <View style={[styles.dot, { backgroundColor: listIdentityColors[list.color] }]} />
      {!compact && list.emoji ? <AppText variant="caption">{list.emoji}</AppText> : null}
      <AppText variant="caption" tone="secondary" numberOfLines={1}>
        {list.title}
      </AppText>
    </View>
  )
}

export function CategoryIndicator({
  category,
  color,
}: {
  category: Pick<Category, 'title' | 'color'>
  color?: string
}) {
  const colors = useHomeTheme()
  const dot = category.color ? listIdentityColors[category.color] : color ?? colors.muted
  return (
    <View style={styles.indicator}>
      <View style={[styles.smallDot, { backgroundColor: dot }]} />
      <AppText variant="caption" tone="secondary" numberOfLines={1}>{category.title}</AppText>
    </View>
  )
}

export function ListBadge({ list }: { list: Pick<ListSummary, 'title' | 'emoji' | 'color'> }) {
  return <AppBadge><>{list.emoji ? `${list.emoji} ` : ''}{list.title}</></AppBadge>
}

export function CategoryBadge({ category }: { category: Pick<Category, 'title' | 'color'> }) {
  const colors = useHomeTheme()
  return (
    <View style={[styles.categoryBadge, { backgroundColor: colors.subtle }]}>
      {category.color ? <View style={[styles.smallDot, { backgroundColor: listIdentityColors[category.color] }]} /> : null}
      <AppText variant="caption" tone="secondary">{category.title}</AppText>
    </View>
  )
}

export function ListRow({
  list,
  subtitle,
  trailing,
  onPress,
}: {
  list: Pick<ListSummary, 'title' | 'emoji' | 'color'>
  subtitle?: string
  trailing?: ReactNode
  onPress?: () => void
}) {
  const colors = useHomeTheme()
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${list.title}${subtitle ? `, ${subtitle}` : ''}` : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.separator }, pressed && { opacity: 0.7 }]}
    >
      <AppText variant="title">{list.emoji ?? '📋'}</AppText>
      <View style={styles.copy}>
        <AppText weight="600">{list.title}</AppText>
        {subtitle ? <AppText variant="caption" tone="secondary">{subtitle}</AppText> : null}
      </View>
      {trailing}
    </Pressable>
  )
}

export function CategoryPickerRow({
  category,
  selected,
  onPress,
}: {
  category: Pick<Category, 'id' | 'title' | 'color'>
  selected?: boolean
  onPress?: () => void
}) {
  const colors = useHomeTheme()
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.pickerRow, { borderBottomColor: colors.separator }, pressed && { opacity: 0.65 }]}>
      <CategoryIndicator category={category} />
      <View style={{ flex: 1 }} />
      {selected ? <AppIcon name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} color={colors.accent} /> : null}
    </Pressable>
  )
}

export function SourceIndicator({ label, color }: { label: string; color?: string }) {
  const colors = useHomeTheme()
  return (
    <View style={styles.indicator}>
      <View style={[styles.smallDot, { backgroundColor: color ?? colors.accent }]} />
      <AppText variant="caption" tone="secondary">{label}</AppText>
    </View>
  )
}

export function FilterChip({
  label,
  selected = false,
  onPress,
}: {
  label: string
  selected?: boolean
  onPress?: () => void
}) {
  const colors = useHomeTheme()
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.filterChip, { backgroundColor: selected ? colors.accentSubtle : colors.subtle }, pressed && { opacity: 0.7 }]}>
      <AppText variant="footnote" weight={selected ? '600' : '500'} tone={selected ? 'accent' : 'secondary'}>{label}</AppText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  indicator: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' },
  dot: { width: 9, height: 9, borderRadius: radii.pill },
  smallDot: { width: 7, height: 7, borderRadius: radii.pill },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  copy: { flex: 1, gap: spacing.xxs },
  pickerRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md },
  filterChip: { minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.pill },
})
