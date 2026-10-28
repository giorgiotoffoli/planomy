import type { ComponentProps, ReactNode } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { SymbolView } from 'expo-symbols'
import { GlassSurface } from '@/components/glass-surface'
import { useHomeTheme, spacing, radii, iconSizes, borders, elevation, hitTargets, surfaceVariants, typeScale, type AppColors } from '@/features/home/theme'

type SymbolName = ComponentProps<typeof SymbolView>['name']

export function AppText({
  variant = 'body',
  tone = 'primary',
  weight,
  style,
  ...props
}: ComponentProps<typeof Text> & {
  variant?: 'caption' | 'footnote' | 'body' | 'title' | 'heading'
  tone?: 'primary' | 'secondary' | 'muted' | 'accent' | 'danger' | 'success'
  weight?: TextStyle['fontWeight']
}) {
  const colors = useHomeTheme()
  const { fontScale } = useWindowDimensions()
  const toneColors = {
    primary: colors.text,
    secondary: colors.secondary,
    muted: colors.muted,
    accent: colors.accent,
    danger: colors.danger,
    success: colors.success,
  }
  const scale = typeScale[variant]
  return (
    <Text
      allowFontScaling
      {...props}
      style={[{ ...scale, lineHeight: scale.lineHeight * fontScale }, { color: toneColors[tone], fontWeight: weight }, style]}
    />
  )
}

export function AppIcon({
  name,
  size = iconSizes.md,
  color,
  style,
}: {
  name: SymbolName
  size?: number
  color?: string
  style?: ComponentProps<typeof SymbolView>['style']
}) {
  const colors = useHomeTheme()
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color ?? colors.secondary}
      style={style}
    />
  )
}

export function AppSurface({
  children,
  variant = 'card',
  style,
  accessibilityLabel,
  interactive = false,
}: {
  children: ReactNode
  variant?: 'plain' | 'card' | 'elevated' | 'glass'
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
  interactive?: boolean
}) {
  const colors = useHomeTheme()
  const metrics = surfaceVariants[variant]
  const surfaceStyle = [
    styles.surface,
    { borderRadius: metrics.radius, padding: metrics.padding },
    variant === 'elevated' && elevation.raised,
    { backgroundColor: variant === 'elevated' ? colors.surfaceElevated : colors.surface },
    style,
  ]
  if (variant === 'glass')
    return (
      <GlassSurface accessibilityLabel={accessibilityLabel} interactive={interactive} style={[{ borderRadius: metrics.radius, padding: metrics.padding }, style]}>
        {children}
      </GlassSurface>
    )
  return (
    <View accessibilityLabel={accessibilityLabel} style={surfaceStyle}>
      {children}
    </View>
  )
}

export function AppDivider({ inset = 0 }: { inset?: number }) {
  const colors = useHomeTheme()
  return <View style={[styles.divider, { backgroundColor: colors.separator, marginLeft: inset }]} />
}

export function AppBadge({
  children,
  tone = 'neutral',
  style,
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'danger' | 'success' | 'warning'
  style?: StyleProp<ViewStyle>
}) {
  const colors = useHomeTheme()
  const palette = badgePalette(colors)[tone]
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }, style]}>
      <Text allowFontScaling style={[styles.badgeText, { color: palette.text }]}>
        {children}
      </Text>
    </View>
  )
}

export function AppButton({
  title,
  children,
  variant = 'primary',
  icon,
  disabled,
  onPress,
  accessibilityLabel,
  style,
}: {
  title?: string
  children?: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  icon?: SymbolName
  disabled?: boolean
  onPress?: () => void
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}) {
  const colors = useHomeTheme()
  const isPrimary = variant === 'primary'
  const isDestructive = variant === 'destructive'
  const color = isPrimary ? colors.onAccent : isDestructive ? colors.danger : colors.accent
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary && { backgroundColor: colors.accent },
        variant === 'secondary' && { backgroundColor: colors.subtle },
        isDestructive && { backgroundColor: colors.dangerSubtle },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <AppIcon name={icon} size={18} color={color} /> : null}
      {children ?? (title ? <Text allowFontScaling style={[styles.buttonText, { color }]}>{title}</Text> : null)}
    </Pressable>
  )
}

export function IconButton({
  name,
  label,
  onPress,
  disabled,
  color,
  style,
}: {
  name: SymbolName
  label: string
  onPress?: () => void
  disabled?: boolean
  color?: string
  style?: StyleProp<ViewStyle>
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={4}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, style]}
    >
      <AppIcon name={name} size={20} color={color} />
    </Pressable>
  )
}

export function AppCheckbox({
  checked,
  label,
  disabled,
  onPress,
}: {
  checked: boolean
  label: string
  disabled?: boolean
  onPress?: () => void
}) {
  const colors = useHomeTheme()
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.checkboxTarget, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.checkbox,
          { borderColor: checked ? colors.accent : colors.muted },
          checked && { backgroundColor: colors.accent },
        ]}
      >
        {checked ? <AppIcon name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={14} color={colors.onAccent} /> : null}
      </View>
    </Pressable>
  )
}

export function SectionHeader({
  title,
  subtitle,
  count,
  action,
  icon,
}: {
  title: string
  subtitle?: string
  count?: string | number
  action?: ReactNode
  icon?: SymbolName
}) {
  const colors = useHomeTheme()
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <View style={styles.sectionTitleRow}>
          {icon ? <AppIcon name={icon} size={18} color={colors.accent} /> : null}
          <AppText variant="title" weight="700" accessibilityRole="header" style={styles.tightTitle}>{title}</AppText>
          {count !== undefined ? <AppBadge>{count}</AppBadge> : null}
        </View>
        {subtitle ? <AppText variant="footnote" tone="secondary">{subtitle}</AppText> : null}
      </View>
      {action}
    </View>
  )
}

export function ScreenHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string
  subtitle?: string
  trailing?: ReactNode
}) {
  return (
    <View style={styles.screenHeader}>
      <View style={styles.screenCopy}>
        <AppText variant="heading" weight="700" accessibilityRole="header">{title}</AppText>
        {subtitle ? <AppText variant="footnote" tone="secondary">{subtitle}</AppText> : null}
      </View>
      {trailing}
    </View>
  )
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string
  description?: string
  icon?: SymbolName
  action?: ReactNode
}) {
  const colors = useHomeTheme()
  return (
    <View style={styles.emptyState}>
      {icon ? <View style={[styles.emptyIcon, { backgroundColor: colors.accentSubtle }]}><AppIcon name={icon} size={24} color={colors.accent} /></View> : null}
      <AppText variant="body" weight="600" style={styles.center}>{title}</AppText>
      {description ? <AppText variant="footnote" tone="secondary" style={styles.center}>{description}</AppText> : null}
      {action}
    </View>
  )
}

function badgePalette(colors: AppColors) {
  return {
    neutral: { background: colors.subtle, text: colors.secondary },
    accent: { background: colors.accentSubtle, text: colors.accent },
    danger: { background: colors.dangerSubtle, text: colors.danger },
    success: { background: colors.subtle, text: colors.success },
    warning: { background: colors.subtle, text: colors.warning },
  }
}

const styles = StyleSheet.create({
  surface: { overflow: 'hidden', borderCurve: 'continuous' },
  divider: { height: borders.hairline },
  badge: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  button: { minHeight: hitTargets.minimum, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radii.pill, paddingHorizontal: spacing.lg },
  buttonText: { fontSize: 15, fontWeight: '600' },
  iconButton: { minWidth: hitTargets.minimum, minHeight: hitTargets.minimum, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  checkboxTarget: { width: 48, minHeight: hitTargets.row, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionCopy: { flex: 1, gap: spacing.xs },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  tightTitle: { letterSpacing: -0.35 },
  screenHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  screenCopy: { flex: 1, gap: spacing.xs },
  emptyState: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon: { width: 54, height: 54, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
})
