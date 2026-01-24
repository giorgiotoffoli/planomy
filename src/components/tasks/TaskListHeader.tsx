'use client'

import { useMemo } from 'react'
import { useLists } from '@/state/lists/provider'
import useCurrentListId from '@/hooks/useCurrentListId'

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
      <h1 className="text-3xl font-bold sm:mx-auto sm:px-5 sm:pt-3 mx-12 pt-4">{resolvedTitle}</h1>
    </header>
  )
}
