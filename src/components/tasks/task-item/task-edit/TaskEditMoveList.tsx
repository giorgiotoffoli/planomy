import { getUserLists } from '@/components/lists/queries'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { Circle } from 'lucide-react'

export async function TaskEditMoveList() {
  const lists = await getUserLists()

  return (
    <DropdownMenuSubContent>
      <DropdownMenuLabel>Coming soon lol</DropdownMenuLabel>
      {lists.map((list) => (
        <DropdownMenuItem key={list.id}>
          <Circle />
          {list.title}
        </DropdownMenuItem>
      ))}
    </DropdownMenuSubContent>
  )
}
