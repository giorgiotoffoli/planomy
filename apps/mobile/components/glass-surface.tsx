import { useEffect, useState, type PropsWithChildren } from 'react'
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect'
import { useHomeTheme, spacing, radii } from '@/features/home/theme'

type GlassSurfaceProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
  interactive?: boolean
}>

export function GlassSurface({ children, style, accessibilityLabel, interactive = false }: GlassSurfaceProps) {
  const colors = useHomeTheme()
  const [reduceTransparency, setReduceTransparency] = useState(true)

  useEffect(() => {
    let mounted = true

    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((enabled) => {
        if (mounted) setReduceTransparency(enabled)
      })
      .catch(() => {
        /* Prefer the readable fallback when availability is unknown. */
      })

    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency,
    )

    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])

  const canUseLiquidGlass =
    Platform.OS === 'ios' &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable() &&
    !reduceTransparency

  if (canUseLiquidGlass) {
    return (
      <GlassView accessibilityLabel={accessibilityLabel} isInteractive={interactive} glassEffectStyle="regular" style={[styles.surface, style]}>
        {children}
      </GlassView>
    )
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.surface,
        styles.fallback,
      { backgroundColor: colors.surfaceElevated, borderColor: colors.separator },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: radii.xl,
    borderCurve: 'continuous',
    gap: spacing.md,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  fallback: {
    borderWidth: StyleSheet.hairlineWidth,
  },
})
