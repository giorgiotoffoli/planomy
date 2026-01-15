'use client'

import {
  SidebarCloseIcon,
  SidebarOpenIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { defaultLists } from '@/data/appLists'
import { Label } from '@/components/ui/label'
import { useLists } from '@/state/lists/provider'
import { LIST_ACTIONS } from '@/state/lists/actions'
import { TASK_ACTIONS } from '@/state/tasks/actions'
import { useTasks } from '@/state/tasks/provider'
import { useRouter } from 'next/navigation'

export default function AppSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [listTitle, setListTitle] = useState('')
  const [newListTitle, setNewListTitle] = useState('')

  const { lists, dispatch: listsDispatch } = useLists()
  const { dispatch: tasksDispatch } = useTasks()

  const router = useRouter()

  useEffect(() => {
    const media = window.matchMedia('(min-width: 640px)') // sm breakpoint

    const syncSidebar = () => {
      setSidebarOpen(media.matches) // open on desktop, closed on mobile
    }

    syncSidebar()
    media.addEventListener('change', syncSidebar)

    return () => media.removeEventListener('change', syncSidebar)
  }, [])

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 640) {
      setSidebarOpen(false)
    }
  }

  return (
    <>
      {sidebarOpen ? (
        // Top part
        <aside
          className={`
          bg-blue-500 text-white
          fixed inset-0 z-40        /* mobile fullscreen */
          sm:static sm:h-screen    /* desktop normal */
          sm:flex sm:w-46
          ${sidebarOpen ? 'flex flex-col' : 'hidden sm:flex'}
        `}
        >
          <div className="flex-1 min-h-0 flex flex-col">
            <header className="flex items-center justify-between pl-3">
              <h1 className="font-stretch-125% text-2xl">Planomy</h1>
              <SidebarCloseIcon
                onClick={() => setSidebarOpen(false)}
                className="cursor-pointer m-3 "
              />
            </header>
            <section className="px-3">
              {defaultLists.map((list) => (
                <button
                  key={list.title}
                  className="flex items-center hover:bg-blue-700 rounded-xl p-2 w-full cursor-pointer"
                  onClick={() => {
                    closeSidebarOnMobile()
                    router.push(list.url)
                  }}
                >
                  {list.icon && <list.icon />}
                  <p className="ml-3">{list.title}</p>
                </button>
              ))}
            </section>

            {/* Lists */}
            <section className="px-3 flex flex-col flex-1 min-h-0">
              <p className="text-xs pt-3 opacity-75">Lists</p>
              {/* List Dialog */}
              <Dialog>
                <DialogTrigger>
                  <Button
                    variant="ghost"
                    className="flex items-center hover:bg-blue-700 rounded-xl p-2 w-full"
                  >
                    {<PlusIcon />}
                    <p>Create List</p>
                  </Button>
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
                      onChange={(e) => setListTitle(e.target.value)}
                      value={listTitle}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button variant="outline" className="cursor-pointer">
                        Cancel
                      </Button>
                    </DialogClose>

                    <DialogClose>
                      <Button
                        className="cursor-pointer"
                        onClick={() => {
                          listsDispatch({
                            type: LIST_ACTIONS.ADD,
                            title: listTitle,
                          })
                          setListTitle('')
                        }}
                      >
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
                  {lists.map((list) => (
                    <div
                      key={list.id}
                      className="flex items-center justify-between h-10 px-2 hover:bg-blue-700 rounded-xl cursor-pointer group"
                    >
                      <button
                        className="flex items-center min-w-0 flex-1"
                        onClick={() => {
                          closeSidebarOnMobile()
                          router.push(`/lists/${list.id}`)
                        }}
                      >
                        <p className="ml-3 truncate">{list.title}</p>
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="shrink-0 h-8 w-8 p-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all hover:bg-transparent hover:text-white cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            ⋯
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Dialog modal={true}>
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                              >
                                <PencilIcon />
                                Rename
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogTitle>
                                Editing &quot;{list.title}&quot;
                              </DialogTitle>

                              <Label>Choose a new List name</Label>
                              <Input
                                onChange={(e) =>
                                  setNewListTitle(e.target.value)
                                }
                                value={newListTitle}
                              />
                              <DialogFooter>
                                <DialogClose>
                                  <Button
                                    variant={'outline'}
                                    onClick={() => setNewListTitle('')}
                                  >
                                    Cancel
                                  </Button>
                                </DialogClose>
                                <DialogClose>
                                  <Button
                                    variant={'default'}
                                    onClick={() => {
                                      if (newListTitle) {
                                        listsDispatch({
                                          type: LIST_ACTIONS.RENAME,
                                          listId: list.id,
                                          newTitle: newListTitle,
                                        })
                                        setNewListTitle('')
                                      }
                                    }}
                                  >
                                    Rename
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Dialog modal={true}>
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-red-500"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <TrashIcon />
                                Delete
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogTitle>
                                Are you sure you want to delete &quot;
                                {list.title}?&quot;
                              </DialogTitle>
                              <DialogDescription>
                                This will delete all tasks within the list.
                              </DialogDescription>
                              <DialogFooter>
                                <DialogClose>
                                  <Button
                                    variant={'outline'}
                                    className="cursor-pointer"
                                  >
                                    Cancel
                                  </Button>
                                </DialogClose>
                                <Button
                                  variant={'destructive'}
                                  onClick={() => {
                                    listsDispatch({
                                      type: LIST_ACTIONS.DELETE,
                                      listId: list.id,
                                    })

                                    tasksDispatch({
                                      type: TASK_ACTIONS.DELETE,
                                      currentListId: list.id,
                                    })
                                  }}
                                  className="cursor-pointer text-white"
                                >
                                  Delete
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>

                {/* bottom fade */}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-5 bg-linear-to-t from-blue-500 via-blue-500/70 to-transparent" />
              </div>
            </section>
          </div>
        </aside>
      ) : (
        <SidebarOpenIcon
          className="cursor-e-resize mt-6 left-3 rounded-2xl sm:relative fixed"
          onClick={() => setSidebarOpen(true)}
        />
      )}
    </>
  )
}
