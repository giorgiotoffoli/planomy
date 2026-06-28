'use client'

import { createContext, ReactNode, useContext, useMemo, useState } from 'react'

type E2EEContextValue = {
  masterKey: Uint8Array | null
  isUnlocked: boolean
  setMasterKey: (masterKey: Uint8Array) => void
  lock: () => void
}

const E2EEContext = createContext<E2EEContextValue | null>(null)

export function E2EEProvider({ children }: { children: ReactNode }) {
  const [masterKey, setMasterKeyState] = useState<Uint8Array | null>(null)

  const value = useMemo<E2EEContextValue>(
    () => ({
      masterKey,
      isUnlocked: Boolean(masterKey),
      setMasterKey: setMasterKeyState,
      lock: () => setMasterKeyState(null),
    }),
    [masterKey],
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
