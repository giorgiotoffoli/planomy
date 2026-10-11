'use client'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
} from '@/components/ui/sidebar'
import { ChevronRight, Plus } from 'lucide-react'
import { NavLists } from './nav-lists'
import { useState } from 'react'
import { List } from '@/types'
import CreateListDialog from '@/components/lists/create-list/create-list-dialog'

export default function ListGroup({ lists }: { lists: List[] }) {
  const [open, setOpen] = useState(true)
  return (
    <SidebarGroup className="mt-4 p-0">
      <SidebarGroupContent>
        <Collapsible
          className="group/collapsible"
          open={open}
          onOpenChange={setOpen}
        >
          <div className="relative">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-label={`${open ? 'Collapse' : 'Expand'} lists`}
                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs font-medium tracking-wide text-sidebar-foreground/70 outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0"
              >
                <span>Lists</span>
                <ChevronRight className="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </button>
            </CollapsibleTrigger>
            <CreateListDialog>
              <SidebarGroupAction
                asChild
                aria-label="Create new list"
                title="Create new list"
                className="top-1 right-1"
              >
                <button type="button">
                  <Plus />
                </button>
              </SidebarGroupAction>
            </CreateListDialog>
          </div>
          <CollapsibleContent>
            <NavLists lists={lists} />
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
