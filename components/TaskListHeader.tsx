'use client'

import { useMemo } from 'react'
import { useLists } from '@/context/lists/ListsProvider'
import useCurrentListId from './useCurrentListId'

type TaskListHeaderProps = {
  title?: string
  listId?: string
}

export default function TaskListHeader({ title, listId }: TaskListHeaderProps) {
  const { lists } = useLists()
  const routeListId = useCurrentListId()
  const resolvedListId = title ? undefined : listId ?? routeListId

  const resolvedTitle = useMemo(() => {
    if (title) return title
    if (!resolvedListId) return 'List'
    return lists.find((list) => list.id === resolvedListId)?.title ?? 'List'
  }, [lists, resolvedListId, title])

  return (
    <header>
      <h1 className="text-3xl font-bold px-5 pt-3">{resolvedTitle}</h1>
    </header>
  )
}
