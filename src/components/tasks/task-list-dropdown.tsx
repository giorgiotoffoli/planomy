import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { List, Task } from '@/types'
import { InboxIcon } from 'lucide-react'
import { ListEmoji } from '@/components/lists/list-emoji'

interface TaskListDropdownProps {
  lists: List[]
  currentListId: string | null
  task?: Task
}

export default function TaskListDropdown({
  lists,
  task,
  currentListId,
}: TaskListDropdownProps) {
  const defaultListId = task?.list_id ?? currentListId ?? 'inbox'

  return (
    <Select name="list_id" defaultValue={defaultListId}>
      <SelectTrigger>
        <SelectValue placeholder="Choose list" />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="inbox">
          <InboxIcon className="size-4" />
          Inbox
        </SelectItem>

        {lists.map((list) => (
          <SelectItem key={list.id} value={list.id}>
            <ListEmoji emoji={list.emoji} />
            {list.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
