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

export function normalizeItemColor(value: unknown): ListColor | null {
  if (value === null || value === undefined || value === '') return null
  if (!isListColor(value)) throw new Error('Choose a color from the approved palette.')
  return value
}

export function resolveItemColor(
  itemColor: ListColor | null | undefined,
  listColor: ListColor | null | undefined,
) {
  return itemColor ?? listColor ?? null
}

/** Resolve an item color from its optional Category override and parent List. */
export function resolveInheritedColor(
  categoryColor: ListColor | null | undefined,
  listColor: ListColor | null | undefined,
) {
  return categoryColor ?? listColor ?? null
}

/** Resolve an Event's explicit override before its shared Category/List color. */
export function resolveEventColor(
  eventColor: ListColor | null | undefined,
  categoryColor: ListColor | null | undefined,
  listColor: ListColor | null | undefined,
) {
  return eventColor ?? resolveInheritedColor(categoryColor, listColor)
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

export function itemColorStyle(
  itemColor: ListColor | null | undefined,
  listColor: ListColor | null | undefined,
) {
  return listColorStyle(resolveItemColor(itemColor, listColor))
}

export function inheritedColorStyle(
  categoryColor: ListColor | null | undefined,
  listColor: ListColor | null | undefined,
) {
  return listColorStyle(resolveInheritedColor(categoryColor, listColor))
}

export function eventColorStyle(
  eventColor: ListColor | null | undefined,
  categoryColor: ListColor | null | undefined,
  listColor: ListColor | null | undefined,
) {
  return listColorStyle(resolveEventColor(eventColor, categoryColor, listColor))
}
