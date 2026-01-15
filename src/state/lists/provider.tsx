'use client'

import { createContext, useContext, useEffect, useReducer } from 'react'
import { List } from './types'
import { listsReducer } from './reducer'
import { ListsAction } from './actions'

const LISTS_KEY = 'planomy_lists'

type ListsContextValue = {
  lists: List[]
  dispatch: React.Dispatch<ListsAction>
}

const ListsContext = createContext<ListsContextValue | null>(null)

export function useLists() {
  const ctx = useContext(ListsContext)
  if (!ctx) {
    throw new Error('List context error!')
  }
  return ctx
}

function listsInit() {
  try {
    const storedLists = localStorage.getItem(LISTS_KEY)
    return storedLists ? JSON.parse(storedLists) : []
  } catch {
    return []
  }
}

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const [lists, dispatch] = useReducer(listsReducer, [], listsInit)

  useEffect(() => {
    try {
      localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
    } catch {
      return
    }
  }, [lists])

  return (
    <ListsContext.Provider value={{ lists, dispatch }}>
      {children}
    </ListsContext.Provider>
  )
}
