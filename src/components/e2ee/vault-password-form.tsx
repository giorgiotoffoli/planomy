'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createWrappedMasterKey, unwrapMasterKey } from '@/lib/crypto/e2ee'
import type { StoredKeychain } from './actions'
import { saveUserKeychain } from './actions'
import { useE2EE } from './e2ee-provider'

type VaultPasswordFormProps = {
  initialKeychain: StoredKeychain | null
  onSuccess?: () => Promise<void> | void
}

export default function VaultPasswordForm({
  initialKeychain,
  onSuccess,
}: VaultPasswordFormProps) {
  const hasKeychain = Boolean(initialKeychain)
  const [masterPassword, setMasterPassword] = useState('')
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const { setMasterKey } = useE2EE()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!masterPassword) {
      toast.error('Enter your master password.')
      return
    }

    if (!hasKeychain && masterPassword !== confirmMasterPassword) {
      toast.error('Master passwords do not match.')
      return
    }

    setIsBusy(true)

    try {
      let masterKey: Uint8Array

      if (initialKeychain) {
        masterKey = await unwrapMasterKey(masterPassword, initialKeychain)
      } else {
        const created = await createWrappedMasterKey(masterPassword)
        await saveUserKeychain(created.payload)
        masterKey = created.masterKey
      }

      await onSuccess?.()
      setMasterKey(masterKey)
      toast.success(hasKeychain ? 'Encryption unlocked.' : 'Encryption set up.')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Something went wrong with encryption.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="text-sm font-medium text-blue-600">
        End-to-end encryption
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">
        {hasKeychain ? 'Unlock your data' : 'Protect your plans'}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {hasKeychain
          ? 'Enter your master password to continue on this device.'
          : 'Create a separate master password that protects your encrypted tasks and lists.'}
      </p>

      {!hasKeychain && (
        <div className="mt-5 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-950">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Save this password somewhere safe.</p>
              <p className="mt-1 text-sm leading-6">
                Planomy cannot recover it. If you forget it, your encrypted data
                cannot be unlocked.
              </p>
            </div>
          </div>
        </div>
      )}

      <label
        className="mt-5 block text-sm font-medium text-slate-700"
        htmlFor="master-password"
      >
        Master password
      </label>
      <Input
        autoFocus
        id="master-password"
        type="password"
        value={masterPassword}
        onChange={(event) => setMasterPassword(event.target.value)}
        className="mt-1.5"
        autoComplete={hasKeychain ? 'current-password' : 'new-password'}
        required
      />

      {!hasKeychain && (
        <>
          <label
            className="mt-4 block text-sm font-medium text-slate-700"
            htmlFor="confirm-master-password"
          >
            Confirm master password
          </label>
          <Input
            id="confirm-master-password"
            type="password"
            value={confirmMasterPassword}
            onChange={(event) => setConfirmMasterPassword(event.target.value)}
            className="mt-1.5"
            autoComplete="new-password"
            required
          />
        </>
      )}

      <Button type="submit" disabled={isBusy} className="mt-6 w-full">
        {isBusy
          ? hasKeychain
            ? 'Unlocking…'
            : 'Creating encryption key…'
          : hasKeychain
            ? 'Unlock'
            : 'Create encryption key'}
      </Button>
    </form>
  )
}
