'use client'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@/components/ui/sidebar'
import { ChevronRight } from 'lucide-react'
import { NavLists } from './NavLists'
import { useState } from 'react'
import { List } from '@/types'

export default function ListGroup({ lists }: { lists: List[] }) {
  const [open, setOpen] = useState(true)
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <Collapsible
          className="group/collapsible"
          open={open}
          onOpenChange={setOpen}
        >
          <CollapsibleTrigger>
            <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide">
              Lists
              <ChevronRight className="ml-2 mt-0.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <NavLists lists={lists} />
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
