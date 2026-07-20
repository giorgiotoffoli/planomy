import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { List } from '@/types'
import { InboxIcon } from 'lucide-react'

interface TaskListDropdownProps {
  lists: List[]
  currentListId: string | null
}

export default function TaskListDropdown({
  lists,
  currentListId,
}: TaskListDropdownProps) {
  return (
    <Select name="list_id" defaultValue={currentListId ?? 'inbox'}>
      <SelectTrigger>
        <SelectValue placeholder="Choose list" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="inbox">
          <InboxIcon />
          Inbox
        </SelectItem>

        {lists.map((list) => (
          <SelectItem key={list.id} value={list.id}>
            {list.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
