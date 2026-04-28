'use client'
import { AlignStartHorizontal, ListTodo } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'
import { useRouter } from 'next/navigation'
import { updateListDefaultView } from './actions'
import { Dispatch, SetStateAction } from 'react'

interface ListBoardToggleProps {
  listId: string
  currentView: 'list' | 'board'
  view: 'list' | 'board'
  setView: Dispatch<SetStateAction<'list' | 'board'>>
}

export default function ListBoardToggle({
  listId,
  currentView,
  view,
  setView,
}: ListBoardToggleProps) {
  const router = useRouter()

  return (
    <ToggleGroup variant="outline" type="single" defaultValue={currentView}>
      <ToggleGroupItem
        value="list"
        aria-label="Toggle List View"
        onClick={() => {
          setView('list')
          router.push(`/lists/${listId}?view=list`)
          updateListDefaultView(listId, 'list')
        }}
        disabled={view === 'list'}
      >
        <ListTodo />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="board"
        aria-label="Toggle Board View"
        onClick={() => {
          setView('board')
          router.push(`/lists/${listId}?view=board`)
          updateListDefaultView(listId, 'board')
        }}
        disabled={view === 'board'}
      >
        <AlignStartHorizontal />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
