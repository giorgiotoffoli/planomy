'use client'

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { base64ToBytes, bytesToBase64 } from '@/lib/crypto/e2ee'

const LEGACY_SESSION_MASTER_KEY_STORAGE_KEY = 'planomy:e2ee:master-key:v1'

function storageKey(userId: string) {
  return `${LEGACY_SESSION_MASTER_KEY_STORAGE_KEY}:${userId}`
}

type E2EEContextValue = {
  masterKey: Uint8Array | null
  isUnlocked: boolean
  isRestoring: boolean
  setMasterKey: (masterKey: Uint8Array) => void
  lock: () => void
}

const E2EEContext = createContext<E2EEContextValue | null>(null)

export function E2EEProvider({
  children,
  userId,
}: {
  children: ReactNode
  userId: string
}) {
  const [masterKey, setMasterKeyState] = useState<Uint8Array | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(LEGACY_SESSION_MASTER_KEY_STORAGE_KEY)
        const storedMasterKey = sessionStorage.getItem(storageKey(userId))
        setMasterKeyState(
          storedMasterKey ? base64ToBytes(storedMasterKey) : null,
        )
      } catch (error) {
        console.error('Failed to restore encrypted session', error)
        setMasterKeyState(null)
      } finally {
        setIsRestoring(false)
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [userId])

  const value = useMemo<E2EEContextValue>(
    () => ({
      masterKey,
      isUnlocked: Boolean(masterKey),
      isRestoring,
      setMasterKey: (newMasteryKey) => {
        setMasterKeyState(newMasteryKey)

        try {
          sessionStorage.setItem(
            storageKey(userId),
            bytesToBase64(newMasteryKey),
          )
        } catch (error) {
          console.error('Failed to persist encrypted session', error)
        }
      },
      lock: () => {
        setMasterKeyState(null)
        try {
          sessionStorage.removeItem(storageKey(userId))
          sessionStorage.removeItem(LEGACY_SESSION_MASTER_KEY_STORAGE_KEY)
        } catch (error) {
          console.error('Failed to clear encrypted session', error)
        }
      },
    }),
    [masterKey, isRestoring, userId],
  )

  return <E2EEContext.Provider value={value}>{children}</E2EEContext.Provider>
}

export function useE2EE() {
  const context = useContext(E2EEContext)

  if (!context) {
    throw new Error('useE2EE must be used inside E2EEProvider.')
  }

  return context
}
