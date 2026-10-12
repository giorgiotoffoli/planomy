'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, ListFilter, ListX } from 'lucide-react'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  getHomeListState,
  getHomeSources,
  getHomeSourceState,
  isHomeCategoryEnabled,
  type HomeSource,
  type HomeSourcePreferences,
} from '@/lib/home'
import type { Category, List } from '@/types'

type HomeSourcesPickerProps = {
  lists: List[]
  categories: Category[]
  uncategorizedListIds: ReadonlySet<string>
  preferences: HomeSourcePreferences
  onSourceChange: (source: HomeSource, visible: boolean) => void
  onCategoryChange: (categoryId: string, visible: boolean) => void
  onShowAll: () => void
}

function sourceLabel(source: HomeSource, listsById: Map<string, List>) {
  if (source.type === 'unsorted') return 'Unsorted'
  return listsById.get(source.listId)?.title ?? 'List'
}

export default function HomeSourcesPicker({
  lists,
  categories,
  uncategorizedListIds,
  preferences,
  onSourceChange,
  onCategoryChange,
  onShowAll,
}: HomeSourcesPickerProps) {
  const [expandedListIds, setExpandedListIds] = useState<Set<string>>(
    () => new Set(),
  )
  const listsById = useMemo(
    () => new Map(lists.map((list) => [list.id, list])),
    [lists],
  )
  const categoriesByListId = useMemo(() => {
    const grouped = new Map<string, Category[]>()

    for (const category of categories) {
      const listCategories = grouped.get(category.list_id) ?? []
      listCategories.push(category)
      grouped.set(category.list_id, listCategories)
    }

    return grouped
  }, [categories])
  const sources = getHomeSources(lists)
  const sourceStates = sources.map((source) =>
    getHomeSourceState(
      source,
      categories,
      preferences,
      source.type === 'list' && uncategorizedListIds.has(source.listId),
    ),
  )
  const enabledCount = sourceStates.filter((state) => state !== 'disabled').length
  const allEnabled = sourceStates.every((state) => state === 'enabled')

  function setListExpanded(listId: string, expanded: boolean) {
    setExpandedListIds((current) => {
      const next = new Set(current)
      if (expanded) next.add(listId)
      else next.delete(listId)
      return next
    })
  }

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
            const label = sourceLabel(source, listsById)
            const inputId =
              source.type === 'unsorted'
                ? 'home-source-unsorted'
                : `home-source-${source.listId}`

            if (source.type === 'unsorted') {
              const checked = preferences.showUnsortedOnHome

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
                    <span className="flex min-w-0 items-center gap-x-2">
                      <span className="flex size-4 shrink-0 items-center justify-center">
                        <ListX
                          aria-hidden="true"
                          className="size-4 text-blue-600"
                        />
                      </span>
                      <span className="min-w-0 truncate text-sm font-medium leading-5 text-slate-800">
                        {label}
                      </span>
                      <span className="whitespace-nowrap text-xs leading-5 text-slate-400">
                        No list
                      </span>
                    </span>
                    <span className="mt-0.5 block pl-6 text-xs text-slate-500">
                      Tasks not assigned to a list
                    </span>
                  </label>
                </div>
              )
            }

            const listCategories = categoriesByListId.get(source.listId) ?? []
    const state = getHomeListState(
      source.listId,
      categories,
      preferences,
      uncategorizedListIds.has(source.listId),
    )
            const checked = state === 'enabled'
              ? true
              : state === 'partial'
                ? 'indeterminate'
                : false
            const expanded = expandedListIds.has(source.listId)
            const categoryGroupId = `home-source-categories-${source.listId}`
            const actionLabel =
              state === 'disabled'
                ? `Show ${label} on Home`
                : state === 'partial'
                  ? `Show all ${label} categories on Home`
                  : `Hide ${label} on Home`

            return (
              <Collapsible
                key={inputId}
                open={expanded}
                onOpenChange={(open) => setListExpanded(source.listId, open)}
                className="rounded-xl transition-colors hover:bg-slate-50"
              >
                <div className="flex items-start gap-2 px-2 py-2">
                  <Checkbox
                    id={inputId}
                    checked={checked}
                    onCheckedChange={(value) =>
                      onSourceChange(
                        source,
                        state === 'partial' ? false : value === true,
                      )
                    }
                    aria-label={actionLabel}
                    className="mt-0.5 border-slate-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white data-[state=indeterminate]:border-blue-600 data-[state=indeterminate]:bg-blue-600 data-[state=indeterminate]:text-white focus-visible:ring-blue-500/40"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {listCategories.length > 0 ? (
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label} categories`}
                            aria-controls={categoryGroupId}
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                          >
                            <span className="flex size-4 shrink-0 items-center justify-center">
                              <ListEmoji emoji={listsById.get(source.listId)?.emoji} />
                            </span>
                            <span className="min-w-0 truncate font-medium leading-5 text-slate-800">
                              {label}
                            </span>
                            <ChevronRight
                              aria-hidden="true"
                              className={`ml-auto size-4 shrink-0 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                            />
                          </button>
                        </CollapsibleTrigger>
                      ) : (
                        <label
                          htmlFor={inputId}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm"
                        >
                          <span className="flex size-4 shrink-0 items-center justify-center">
                            <ListEmoji emoji={listsById.get(source.listId)?.emoji} />
                          </span>
                          <span className="min-w-0 truncate font-medium leading-5 text-slate-800">
                            {label}
                          </span>
                        </label>
                      )}
                    </div>
                    <CollapsibleContent
                      id={categoryGroupId}
                      role="group"
                      aria-label={`${label} categories`}
                      className="mt-1.5 ml-2.5 space-y-0.5 border-l border-slate-200 pl-3"
                    >
                      {listCategories.map((category) => {
                        const categoryId = `home-category-${category.id}`
                        const categoryChecked = isHomeCategoryEnabled(
                          category,
                          categories,
                          preferences,
                        )

                        return (
                          <div
                            key={category.id}
                            className={`flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-slate-50 ${state === 'disabled' ? 'opacity-60' : ''}`}
                          >
                            <Checkbox
                              id={categoryId}
                              checked={categoryChecked}
                              onCheckedChange={(value) =>
                                onCategoryChange(category.id, value === true)
                              }
                              aria-label={`${categoryChecked ? 'Hide' : 'Show'} ${category.title} on Home`}
                              className="cursor-pointer border-slate-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white focus-visible:ring-blue-500/40"
                            />
                            <label
                              htmlFor={categoryId}
                              className="min-w-0 flex-1 cursor-pointer truncate text-xs leading-5 text-slate-600"
                            >
                              {category.title}
                            </label>
                          </div>
                        )
                      })}
                    </CollapsibleContent>
                  </div>
                </div>
              </Collapsible>
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
