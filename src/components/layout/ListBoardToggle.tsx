'use client'
import { AlignStartHorizontal, ListTodo } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'
import { useRouter } from 'next/navigation'
import { updateListDefaultView } from '../lists/actions'

interface ListBoardToggleProps {
  listId: string
  currentView: 'list' | 'board'
}

export default function ListBoardToggle({
  listId,
  currentView,
}: ListBoardToggleProps) {
  const router = useRouter()

  return (
    <ToggleGroup variant="outline" type="single" defaultValue={currentView}>
      <ToggleGroupItem
        value="list"
        aria-label="Toggle List View"
        onClick={() => {
          router.push(`/lists/${listId}?view=list`)
          updateListDefaultView(listId, 'list')
        }}
        disabled={currentView === 'list'}
      >
        <ListTodo />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="board"
        aria-label="Toggle Board View"
        onClick={() => {
          router.push(`/lists/${listId}?view=board`)
          updateListDefaultView(listId, 'board')
        }}
        disabled={currentView === 'board'}
      >
        <AlignStartHorizontal />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
