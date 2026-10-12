'use client'

import { ListFilter, ListX } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ListEmoji } from '@/components/lists/list-emoji'
import {
  getHomeSources,
  isHomeSourceEnabled,
  type HomeSource,
  type HomeSourcePreferences,
} from '@/lib/home'
import type { List } from '@/types'

type HomeSourcesPickerProps = {
  lists: List[]
  preferences: HomeSourcePreferences
  onSourceChange: (source: HomeSource, visible: boolean) => void
  onShowAll: () => void
}

function sourceLabel(source: HomeSource, lists: List[]) {
  if (source.type === 'unsorted') return 'Unsorted'
  return lists.find((list) => list.id === source.listId)?.title ?? 'List'
}

export default function HomeSourcesPicker({
  lists,
  preferences,
  onSourceChange,
  onShowAll,
}: HomeSourcesPickerProps) {
  const sources = getHomeSources(lists)
  const enabledCount = sources.filter((source) =>
    isHomeSourceEnabled(source, preferences),
  ).length
  const allEnabled = enabledCount === sources.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          title={
            allEnabled
              ? 'All sources are shown on Home'
              : `${enabledCount} of ${sources.length} sources are shown on Home`
          }
          className={`h-8 shrink-0 rounded-xl px-3 shadow-[0_6px_20px_rgba(62,84,120,0.05)] ${
            allEnabled
              ? 'border-slate-200/90 bg-white/80'
              : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800'
          }`}
        >
          <ListFilter aria-hidden="true" />
          <span>Sources: {allEnabled ? 'All' : `${enabledCount}/${sources.length}`}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-2.5">
        <PopoverHeader className="px-1.5 pb-2">
          <PopoverTitle className="text-sm font-semibold">Show in Home</PopoverTitle>
          <PopoverDescription className="text-xs">
            Choose which sources appear in your Home feed.
          </PopoverDescription>
        </PopoverHeader>

        <div className="space-y-0.5" role="group" aria-label="Home sources">
          {sources.map((source) => {
            const label = sourceLabel(source, lists)
            const checked = isHomeSourceEnabled(source, preferences)
            const inputId =
              source.type === 'unsorted'
                ? 'home-source-unsorted'
                : `home-source-${source.listId}`

            return (
              <div
                key={inputId}
                className="flex items-start gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50"
              >
                <Checkbox
                  id={inputId}
                  checked={checked}
                  onCheckedChange={(value) =>
                    onSourceChange(source, value === true)
                  }
                  aria-label={`${checked ? 'Hide' : 'Show'} ${label} on Home`}
                  className="mt-0.5 border-slate-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white focus-visible:ring-blue-500/40"
                />
                <label
                  htmlFor={inputId}
                  className="min-w-0 flex-1 cursor-pointer text-sm"
                >
                  <span className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-x-2">
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      {source.type === 'unsorted' ? (
                        <ListX aria-hidden="true" className="size-4 text-blue-600" />
                      ) : (
                        <ListEmoji
                          emoji={lists.find((list) => list.id === source.listId)?.emoji}
                        />
                      )}
                    </span>
                    <span className="min-w-0 truncate text-sm font-medium leading-5 text-slate-800">
                      {label}
                    </span>
                    {source.type === 'unsorted' && (
                      <span className="whitespace-nowrap text-xs leading-5 text-slate-400">
                        No list
                      </span>
                    )}
                  </span>
                  {source.type === 'unsorted' && (
                    <span className="mt-0.5 block pl-6 text-xs text-slate-500">
                      Tasks not assigned to a list
                    </span>
                  )}
                </label>
              </div>
            )
          })}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200/80 px-1.5 pt-2">
          <span className="text-xs text-slate-500">
            {enabledCount} of {sources.length} sources shown
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onShowAll}
            disabled={allEnabled}
            className="h-7 px-2 text-xs"
          >
            Show all
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
