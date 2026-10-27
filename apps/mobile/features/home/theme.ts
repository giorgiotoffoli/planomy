import { useColorScheme } from 'react-native'
import type { ListColor } from '@planomy/lib/list-colors'

export type AppColors = {
  background: string
  surface: string
  surfaceElevated: string
  text: string
  secondary: string
  muted: string
  separator: string
  accent: string
  onAccent: string
  accentSubtle: string
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
  background: '#F6F6F8',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#171719',
  secondary: '#66666E',
  muted: '#85858D',
  separator: '#E5E5EA',
  accent: '#2662D9',
  onAccent: '#FFFFFF',
  accentSubtle: '#EBF1FF',
  danger: '#C53732',
  dangerSubtle: '#FCEDEC',
  warning: '#986500',
  success: '#287346',
  deadlineOverdue: '#C53732',
  deadlineToday: '#2662D9',
  deadlineUpcoming: '#66666E',
  focus: '#EBF1FF',
  subtle: '#EEEEF2',
}

export const darkColors: AppColors = {
  background: '#141414',
  surface: '#1C1C1C',
  surfaceElevated: '#242426',
  text: '#F5F5F7',
  secondary: '#B1B1B8',
  muted: '#9999A2',
  separator: '#333336',
  accent: '#98B4FF',
  onAccent: '#141414',
  accentSubtle: '#1C2538',
  danger: '#FF8A80',
  dangerSubtle: '#392321',
  warning: '#EBC46D',
  success: '#8ED8A4',
  deadlineOverdue: '#FF8A80',
  deadlineToday: '#98B4FF',
  deadlineUpcoming: '#B1B1B8',
  focus: '#1C2538',
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
  title: { fontSize: 20, lineHeight: 26 },
  heading: { fontSize: 24, lineHeight: 30 },
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
  raised: {
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
} as const

export const listIdentityColors: Record<ListColor, string> = {
  blue: '#4779E6',
  indigo: '#6267D7',
  violet: '#9457D8',
  pink: '#D94B91',
  red: '#D64A4A',
  orange: '#D87932',
  amber: '#BB8C19',
  green: '#43875B',
  teal: '#318A83',
  cyan: '#318AAE',
}

export const surfaceVariants = {
  plain: { radius: radii.md, padding: spacing.lg },
  card: { radius: radii.lg, padding: spacing.lg },
  elevated: { radius: radii.xl, padding: spacing.xl },
  glass: { radius: radii.xl, padding: spacing.lg },
} as const

export const light = lightColors
export const dark = darkColors
export type HomeTheme = AppColors

export function useHomeTheme(): AppColors {
  return useColorScheme() === 'dark' ? darkColors : lightColors
}
