import { SelectItem } from '@/components/ui/select'
import { List } from '@/types'
import { Inbox } from 'lucide-react'

interface TaskListDropdownProps {
  lists: List[]
}

export default function TaskListDropdown({ lists }: TaskListDropdownProps) {
  return (
    <>
      <SelectItem value="inbox">
        <Inbox className="size-4" />
        Inbox
      </SelectItem>

      {lists.map((list) => (
        <SelectItem key={list.id} value={list.id}>
          {list.title}
        </SelectItem>
      ))}
    </>
  )
}
