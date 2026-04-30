'use client'
import { AlignStartHorizontal, ListTodo } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'
import { useRouter } from 'next/navigation'
import { updateListDefaultView } from './actions'
import { Dispatch, SetStateAction } from 'react'

interface ListBoardToggleProps {
  listId: string
  currentView: 'list' | 'board'
  localView: 'list' | 'board'
  setLocalView: Dispatch<SetStateAction<'list' | 'board'>>
}

export default function ListBoardToggle({
  listId,
  currentView,
  localView,
  setLocalView,
}: ListBoardToggleProps) {
  const router = useRouter()

  return (
    <ToggleGroup variant="outline" type="single" defaultValue={currentView}>
      <ToggleGroupItem
        value="list"
        aria-label="Toggle List View"
        onClick={() => {
          setLocalView('list')
          router.push(`/lists/${listId}?view=list`)
          updateListDefaultView(listId, 'list')
        }}
        disabled={localView === 'list'}
      >
        <ListTodo />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="board"
        aria-label="Toggle Board View"
        onClick={() => {
          setLocalView('board')
          router.push(`/lists/${listId}?view=board`)
          updateListDefaultView(listId, 'board')
        }}
        disabled={localView === 'board'}
      >
        <AlignStartHorizontal />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
