'use client'

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'

export type CalendarNavigation = 'previous' | 'next' | 'today'
export type CalendarViewMode = 'day' | 'week' | 'month'

const calendarViews: { label: string; value: CalendarViewMode }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
]

export default function CalendarHeader({
  rangeLabel,
  viewMode,
  onNavigate,
  onViewChange,
  onCreate,
}: {
  rangeLabel: string
  viewMode: CalendarViewMode
  onNavigate: (direction: CalendarNavigation) => void
  onViewChange: (view: CalendarViewMode) => void
  onCreate: () => void
}) {
  return (
    <header className="calendar-page-header relative z-20 shrink-0 border-b border-border-subtle bg-background/95 px-3 py-3 backdrop-blur-sm sm:px-5 lg:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-3">
        <div className="flex min-w-0 items-center md:hidden">
          <SidebarTrigger className="md:hidden" />
        </div>

        <div className="order-3 flex min-w-0 basis-full items-center gap-1 sm:order-none sm:basis-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg px-3.5 text-sm"
            onClick={() => onNavigate('today')}
          >
            Today
          </Button>
          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Previous ${viewMode}`}
              className="rounded-lg"
              onClick={() => onNavigate('previous')}
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Next ${viewMode}`}
              className="rounded-lg"
              onClick={() => onNavigate('next')}
            >
              <ChevronRight />
            </Button>
          </div>
          <p
            className="ml-1 min-w-0 truncate font-heading text-base font-semibold tracking-[-0.015em] text-foreground sm:text-[1.05rem]"
            aria-live="polite"
          >
            {rangeLabel}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div
            className="flex h-10 items-center rounded-lg border border-border-subtle bg-surface p-0.5"
            aria-label="Calendar view"
          >
            {calendarViews.map((view) => {
              const active = view.value === viewMode
              return (
                <button
                  key={view.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onViewChange(view.value)}
                  className={`h-9 rounded-md px-3 text-sm sm:px-3.5 ${
                    active
                      ? 'bg-surface-active font-semibold text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.05)]'
                      : 'font-medium text-text-muted hover:text-foreground'
                  }`}
                >
                  {view.label}
                </button>
              )
            })}
          </div>

          <Button
            type="button"
            size="sm"
            className="rounded-lg px-3"
            onClick={onCreate}
          >
            <Plus />
            <span className="hidden sm:inline">Create</span>
            <span className="sr-only sm:hidden">Create</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
