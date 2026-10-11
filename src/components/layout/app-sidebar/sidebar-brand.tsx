'use client'

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { PlanomyIcon } from '@/icons/planomy-icon'
import { useSidebar } from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function SidebarBrand() {
  const { isMobile, state, toggleSidebar } = useSidebar()
  const isCollapsed = !isMobile && state === 'collapsed'

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Expand sidebar"
            className="group/logo relative mx-auto flex size-9 items-center justify-center rounded-lg text-sidebar-primary outline-hidden transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            onClick={toggleSidebar}
          >
            <PlanomyIcon
              size={22}
              aria-hidden="true"
              className="transition-opacity duration-150 ease-out group-hover/logo:opacity-0 group-focus-visible/logo:opacity-0"
            />
            <PanelLeftOpen
              aria-hidden="true"
              className="absolute size-4 opacity-0 transition-opacity duration-150 ease-out group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Expand sidebar</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <PlanomyIcon
          size={24}
          aria-hidden="true"
          className="shrink-0 text-sidebar-primary"
        />
        <span className="truncate font-heading text-xl font-semibold tracking-tight text-sidebar-foreground">
          planomy
        </span>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={isMobile ? 'Close sidebar' : 'Collapse sidebar'}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/60 outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            onClick={toggleSidebar}
          >
            <PanelLeftClose aria-hidden="true" className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {isMobile ? 'Close sidebar' : 'Collapse sidebar'}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
