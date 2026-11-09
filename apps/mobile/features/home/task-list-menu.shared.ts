import type { Category, List } from '@planomy/types'

export type TaskListMenuProps = {
  lists: List[]
  categories: Category[]
  listId: string | null
  categoryId: string | null
  disabled?: boolean
  onSelect: (listId: string | null, categoryId: string | null) => void
}

export function getTaskListMenuLabel({
  lists,
  categories,
  listId,
  categoryId,
}: TaskListMenuProps) {
  const list = lists.find((item) => item.id === listId)
  const category = categories.find(
    (item) => item.id === categoryId && item.list_id === listId,
  )
  const listLabel = list
    ? `${list.emoji ? `${list.emoji} ` : ''}${list.title}`
    : 'Unsorted'

  return category ? `${listLabel} · ${category.title}` : listLabel
}

export function getCategoriesForList(
  categories: Category[],
  listId: string,
) {
  return categories
    .filter((category) => category.list_id === listId)
    .sort((left, right) => left.position - right.position)
}
