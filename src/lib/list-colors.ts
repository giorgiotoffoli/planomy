export const PLANOMY_LIST_COLORS = [
  { id: 'blue', label: 'Blue', cssVariable: '--list-color-blue' },
  { id: 'indigo', label: 'Indigo', cssVariable: '--list-color-indigo' },
  { id: 'violet', label: 'Violet', cssVariable: '--list-color-violet' },
  { id: 'pink', label: 'Pink', cssVariable: '--list-color-pink' },
  { id: 'red', label: 'Red', cssVariable: '--list-color-red' },
  { id: 'orange', label: 'Orange', cssVariable: '--list-color-orange' },
  { id: 'amber', label: 'Amber', cssVariable: '--list-color-amber' },
  { id: 'green', label: 'Green', cssVariable: '--list-color-green' },
  { id: 'teal', label: 'Teal', cssVariable: '--list-color-teal' },
  { id: 'cyan', label: 'Cyan', cssVariable: '--list-color-cyan' },
] as const

export type ListColor = (typeof PLANOMY_LIST_COLORS)[number]['id']

const listColorIds = new Set<string>(
  PLANOMY_LIST_COLORS.map(({ id }) => id),
)

export function isListColor(value: unknown): value is ListColor {
  return typeof value === 'string' && listColorIds.has(value)
}

export function listColorCssValue(color: ListColor | null | undefined) {
  const definition = PLANOMY_LIST_COLORS.find((item) => item.id === color)
  return definition
    ? `var(${definition.cssVariable})`
    : 'var(--list-color-neutral)'
}

export function listColorStyle(color: ListColor | null | undefined) {
  return { '--list-color': listColorCssValue(color) } as Record<string, string>
}
