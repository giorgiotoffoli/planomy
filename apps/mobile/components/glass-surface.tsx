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
  tintColor?: string
}>

function mixHexColors(baseColor: string, tintColor: string, amount: number) {
  const base = /^#([\da-f]{6})$/i.exec(baseColor)?.[1]
  const tint = /^#([\da-f]{6})$/i.exec(tintColor)?.[1]
  if (!base || !tint) return baseColor

  const channels = [0, 2, 4].map((index) => {
    const baseChannel = Number.parseInt(base.slice(index, index + 2), 16)
    const tintChannel = Number.parseInt(tint.slice(index, index + 2), 16)
    return Math.round(baseChannel + (tintChannel - baseChannel) * amount)
      .toString(16)
      .padStart(2, '0')
  })

  return `#${channels.join('')}`
}

export function GlassSurface({
  children,
  style,
  accessibilityLabel,
  interactive = false,
  tintColor,
}: GlassSurfaceProps) {
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
      <GlassView
        accessibilityLabel={accessibilityLabel}
        isInteractive={interactive}
        glassEffectStyle="regular"
        tintColor={tintColor}
        style={[styles.surface, style]}
      >
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
        {
          backgroundColor: tintColor
            ? mixHexColors(colors.surfaceElevated, tintColor, 0.1)
            : colors.surfaceElevated,
          borderColor: tintColor
            ? mixHexColors(colors.separator, tintColor, 0.14)
            : colors.separator,
        },
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
