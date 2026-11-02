import { useColorScheme } from 'react-native'
import { resolveEventColor, type ListColor } from '@planomy/lib/list-colors'
import type { CalendarEventWithList } from '@planomy/types'

export type AppColors = {
  background: string
  surface: string
  surfaceElevated: string
  text: string
  secondary: string
  muted: string
  separator: string
  accent: string
  accentText: string
  onAccent: string
  accentSubtle: string
  homeFocusTint: string
  homeUpcomingTint: string
  homeUpcomingIcon: string
  homeTasksTint: string
  homeStashedTint: string
  danger: string
  dangerSubtle: string
  warning: string
  success: string
  deadlineOverdue: string
  deadlineToday: string
  deadlineUpcoming: string
  focus: string
  subtle: string
}

export const lightColors: AppColors = {
  background: '#FFFFFF',
  surface: '#F7F7F7',
  surfaceElevated: '#FFFFFF',
  text: '#1F1F1F',
  secondary: '#59595C',
  muted: '#666669',
  separator: '#C9C9CD',
  accent: '#007AFF',
  accentText: '#0055D9',
  onAccent: '#000000',
  accentSubtle: '#E4EFFF',
  homeFocusTint: '#F7F7F7',
  homeUpcomingTint: '#F7F7F7',
  homeUpcomingIcon: '#B85B00',
  homeTasksTint: '#F7F7F7',
  homeStashedTint: '#F1F1F1',
  danger: '#C82020',
  dangerSubtle: '#FCEDEC',
  warning: '#A65700',
  success: '#08783A',
  deadlineOverdue: '#C82020',
  deadlineToday: '#0055D9',
  deadlineUpcoming: '#717173',
  focus: '#F1F1F1',
  subtle: '#F1F1F1',
}

export const darkColors: AppColors = {
  background: '#000000',
  surface: '#2B2B2B',
  surfaceElevated: '#303030',
  text: '#F7F7F7',
  secondary: '#DEDEE0',
  muted: '#C1C1C4',
  separator: '#515153',
  accent: '#0A84FF',
  accentText: '#F7F7F7',
  onAccent: '#000000',
  accentSubtle: '#10274A',
  homeFocusTint: '#1C1C1E',
  homeUpcomingTint: '#2B2B2B',
  homeUpcomingIcon: '#FFC107',
  homeTasksTint: '#242426',
  homeStashedTint: '#2B2B2F',
  danger: '#FF756E',
  dangerSubtle: '#421719',
  warning: '#FFC107',
  success: '#32DF7B',
  deadlineOverdue: '#FF756E',
  deadlineToday: '#F7F7F7',
  deadlineUpcoming: '#DEDEE0',
  focus: '#383838',
  subtle: '#272729',
}

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const

export const iconSizes = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 30,
} as const

export const typeScale = {
  caption: { fontSize: 12, lineHeight: 17 },
  footnote: { fontSize: 13, lineHeight: 19 },
  body: { fontSize: 16, lineHeight: 23 },
  title: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  heading: { fontSize: 24, lineHeight: 29, letterSpacing: -0.24 },
} as const

export const borders = {
  hairline: 0.5,
  standard: 1,
} as const

export const hitTargets = {
  minimum: 44,
  row: 52,
} as const

export const elevation = {
  flat: { elevation: 0 },
  raised: { elevation: 0 },
} as const

export const listIdentityColors: Record<ListColor, string> = {
  blue: '#00A8FF',
  indigo: '#9C8CFF',
  violet: '#C882FF',
  pink: '#FF70B9',
  red: '#FF756E',
  orange: '#FF9D32',
  amber: '#FFC107',
  green: '#32DF7B',
  teal: '#00DBB8',
  cyan: '#00CCFA',
}

export function eventDisplayColor(event: CalendarEventWithList, fallback: string) {
  const color = resolveEventColor(event.color, event.category?.color, event.list?.color)
  return color ? listIdentityColors[color] : fallback
}

export const surfaceVariants = {
  plain: { radius: radii.md, padding: spacing.lg },
  card: { radius: radii.xl, padding: spacing.lg },
  elevated: { radius: radii.xl, padding: spacing.xl },
  glass: { radius: radii.xl, padding: spacing.lg },
} as const

export const light = lightColors
export const dark = darkColors
export type HomeTheme = AppColors

export function useHomeTheme(): AppColors {
  return useColorScheme() === 'dark' ? darkColors : lightColors
}
