import {
  Inbox,
  Calendar,
  Check,
  SidebarCloseIcon,
  SidebarOpenIcon,
  ArchiveIcon,
  SunIcon,
  PlusIcon,
} from 'lucide-react'
import {} from './ui/sidebar'
import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import type { List } from '../types/task'

type NativeSidebarProps = {
  changeFilter: (newFilter: string) => void
}

export default function AppSidebar({ changeFilter }: NativeSidebarProps) {
  const LISTS_KEY = 'plaonmy_lists'

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [listName, setListName] = useState('')
  const [lists, setLists] = useState<List[]>(() => {
    const stored = localStorage.getItem(LISTS_KEY)
    return stored ? JSON.parse(stored) : []
  })

  useEffect(() => {
    localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
  }, [lists])

  const items = [
    {
      title: 'Inbox',
      url: '#',
      icon: Inbox,
      filter: 'Inbox',
    },
    {
      title: 'Scheduled',
      url: '#',
      icon: Calendar,
      filter: 'Scheduled',
    },
    {
      title: 'Today',
      url: '#',
      icon: SunIcon,
      filter: 'Today',
    },
  ]

  const createList = () => {
    if (listName) {
      const newList: List = {
        id: crypto.randomUUID(),
        title: listName,
      }
      setLists((prev) => [...prev, newList])
      setListName('')
    }
  }

  return (
    <>
      {sidebarOpen ? (
        // Top part
        <aside className="w-46 h-screen bg-blue-500 text-white flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col">
            <header className="flex items-center justify-between pl-3">
              <h1 className="font-stretch-125% text-2xl">Planomy</h1>
              <SidebarCloseIcon
                onClick={() => setSidebarOpen(false)}
                className="cursor-w-resize m-3 rounded-2xl"
              />
            </header>
            <section className="px-3">
              {items.map((item) => (
                <a
                  key={item.title}
                  className="flex items-center hover:bg-blue-700 rounded-xl p-2"
                  href={item.url}
                  onClick={() => changeFilter(item.filter)}
                >
                  {<item.icon />}
                  <p className="ml-3">{item.title}</p>
                </a>
              ))}
            </section>

            {/* Lists */}
            <section className="px-3 flex flex-col flex-1 min-h-0">
              <p className="text-xs pt-3 opacity-75">Lists</p>
              {/* List Dialog */}
              <Dialog>
                <DialogTrigger>
                  <a
                    className="flex items-center hover:bg-blue-700 rounded-xl p-2"
                    href="#"
                  >
                    {<PlusIcon />}
                    <p>Create List</p>
                  </a>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Create List</DialogTitle>
                  <DialogDescription>
                    Create a custom list to organize your tasks.
                  </DialogDescription>
                  <div>
                    <label htmlFor="list-title">List name</label>
                    <Input
                      id="list-title"
                      type="text"
                      onChange={(e) => setListName(e.target.value)}
                      value={listName}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button variant="outline" className="cursor-pointer">
                        Cancel
                      </Button>
                    </DialogClose>
                    <DialogClose>
                      <Button className="cursor-pointer" onClick={createList}>
                        Create
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Custom Lists */}
              <div className="relative mt-1 flex-1 min-h-0">
                {/* top fade */}
                <div className="pointer-events-none absolute top-0 left-0 right-0 h-5 bg-linear-to-b from-blue-500 via-blue-500/70 to-transparent" />

                {/* the scroll container */}
                <div className="h-full overflow-y-auto pt-2 pb-2 mask-[linear-gradient(to_bottom,transparent,black_10px,black_calc(100%-10px),transparent)]">
                  {lists.map((item) => (
                    <a
                      key={item.id}
                      className="flex items-center hover:bg-blue-700 rounded-xl p-2 cursor-pointer"
                      onClick={() => changeFilter(item.title)}
                    >
                      <p className="ml-3 truncate">{item.title}</p>
                    </a>
                  ))}
                </div>

                {/* bottom fade */}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-5 bg-linear-to-t from-blue-500 via-blue-500/70 to-transparent" />
              </div>
            </section>
          </div>

          {/* Bottom part */}
          <div className="pb-3 pl-3">
            <section>
              <a
                className="flex items-center hover:bg-blue-700 rounded-xl p-2"
                href="#"
                onClick={() => changeFilter('Completed')}
              >
                <Check />
                <p className="ml-3">Completed</p>
              </a>
              <a
                className="flex items-center hover:bg-blue-700 rounded-xl p-2"
                href="#"
                onClick={() => changeFilter('All')}
              >
                <ArchiveIcon />
                <p className="ml-3">All Tasks</p>
              </a>
            </section>
          </div>
        </aside>
      ) : (
        <SidebarOpenIcon
          className="cursor-e-resize m-3 rounded-2xl"
          onClick={() => setSidebarOpen(true)}
        />
      )}
    </>
  )
}
