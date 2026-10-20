'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  DEFAULT_CALENDAR_PREFERENCES,
  normalizeCalendarPreferences,
  type CalendarPreferences,
} from '@/lib/calendar-preferences'
import { getCalendarPreferences, saveCalendarPreferences } from './preferences-actions'

type CalendarPreferencesContextValue = {
  preferences: CalendarPreferences
  isLoading: boolean
  updatePreferences: (patch: Partial<CalendarPreferences>) => Promise<void>
}

const CalendarPreferencesContext = createContext<CalendarPreferencesContextValue | null>(null)

export function CalendarPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_CALENDAR_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)
  const preferencesRef = useRef(preferences)
  const requestRef = useRef(0)
  const saveQueueRef = useRef(Promise.resolve())

  useEffect(() => {
    let mounted = true
    const request = ++requestRef.current

    void getCalendarPreferences()
      .then((next) => {
        if (!mounted || request !== requestRef.current) return
        preferencesRef.current = next
        setPreferences(next)
      })
      .catch((error) => {
        console.error('Could not load calendar preferences.', error)
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const updatePreferences = useCallback(async (patch: Partial<CalendarPreferences>) => {
    const previous = preferencesRef.current
    const next = normalizeCalendarPreferences({ ...previous, ...patch })
    const request = ++requestRef.current

    preferencesRef.current = next
    setPreferences(next)

    const save = saveQueueRef.current.then(() => saveCalendarPreferences(next))
    saveQueueRef.current = save.then(() => undefined, () => undefined)

    try {
      await save
    } catch (error) {
      if (request === requestRef.current) {
        preferencesRef.current = previous
        setPreferences(previous)
      }
      throw error
    }
  }, [])

  return (
    <CalendarPreferencesContext.Provider value={{ preferences, isLoading, updatePreferences }}>
      {children}
    </CalendarPreferencesContext.Provider>
  )
}

export function useCalendarPreferences() {
  const value = useContext(CalendarPreferencesContext)
  if (!value) throw new Error('CalendarPreferencesProvider is required')
  return value
}
