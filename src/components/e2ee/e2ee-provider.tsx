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

const SESSION_MASTER_KEY_STORAGE_KEY = 'planomy:e2ee:master-key:v1'

type E2EEContextValue = {
  masterKey: Uint8Array | null
  isUnlocked: boolean
  isRestoring: boolean
  setMasterKey: (masterKey: Uint8Array) => void
  lock: () => void
}

const E2EEContext = createContext<E2EEContextValue | null>(null)

export function E2EEProvider({ children }: { children: ReactNode }) {
  const [masterKey, setMasterKeyState] = useState<Uint8Array | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)

  useEffect(() => {
    try {
      const storedMasterKey = sessionStorage.getItem(
        SESSION_MASTER_KEY_STORAGE_KEY,
      )
      if (storedMasterKey) {
        setMasterKeyState(base64ToBytes(storedMasterKey))
      }
    } catch (error) {
      console.error('Failed to restores encrypted session', error)
    } finally {
      setIsRestoring(false)
    }
  }, [])

  const value = useMemo<E2EEContextValue>(
    () => ({
      masterKey,
      isUnlocked: Boolean(masterKey),
      isRestoring,
      setMasterKey: (newMasteryKey) => {
        setMasterKeyState(newMasteryKey)

        sessionStorage.setItem(
          SESSION_MASTER_KEY_STORAGE_KEY,
          bytesToBase64(newMasteryKey),
        )
      },
      lock: () => {
        setMasterKeyState(null)
        sessionStorage.removeItem(SESSION_MASTER_KEY_STORAGE_KEY)
      },
    }),
    [masterKey, isRestoring],
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
