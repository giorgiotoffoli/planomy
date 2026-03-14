import { getUserLists } from '@/components/lists/queries'
import {
  DropdownMenuItem,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { Circle } from 'lucide-react'

export async function TaskEditMoveList() {
  const lists = await getUserLists()

  return (
    <DropdownMenuSubContent>
      {lists.map((list) => (
        <DropdownMenuItem key={list.id}>{list.title}</DropdownMenuItem>
      ))}
    </DropdownMenuSubContent>
  )
}
