'use client'

import { updateListDefaultView } from '@/components/lists/actions'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AlignStartHorizontal, ListTodo } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Dispatch, SetStateAction } from 'react'

interface HeaderViewToggleProps {
  listId: string | null
  currentView: 'list' | 'board'
  localView: 'list' | 'board'
  setLocalView: Dispatch<SetStateAction<'list' | 'board'>>
}

export default function HeaderViewToggle({
  listId,
  currentView,
  localView,
  setLocalView,
}: HeaderViewToggleProps) {
  const router = useRouter()

  function handleViewChange(view: 'list' | 'board') {
    setLocalView(view)
    router.push(`/lists/${listId}?view=${view}`)
    updateListDefaultView(listId, view)
  }

  return (
    <ToggleGroup variant="outline" type="single" value={currentView}>
      <ToggleGroupItem
        value="list"
        aria-label="Toggle List View"
        onClick={() => handleViewChange('list')}
        disabled={localView === 'list'}
      >
        <ListTodo />
      </ToggleGroupItem>

      <ToggleGroupItem
        value="board"
        aria-label="Toggle Board View"
        onClick={() => handleViewChange('board')}
        disabled={localView === 'board'}
      >
        <AlignStartHorizontal />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
