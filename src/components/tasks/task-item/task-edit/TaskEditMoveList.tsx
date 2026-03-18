import { getUserLists } from '@/components/lists/queries'
import {
  DropdownMenuItem,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'

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
