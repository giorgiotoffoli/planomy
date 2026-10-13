'use client'

import { useState } from 'react'
import { KeyRound, LockKeyhole, ShieldAlert, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  replaceUserKeychain,
  type StoredKeychain,
} from '@/components/e2ee/actions'
import { useE2EE } from '@/components/e2ee/e2ee-provider'
import { unwrapMasterKey, wrapMasterKey } from '@/lib/crypto/e2ee'
import { changeAccountPassword, deleteAccount } from './actions'
import { ThemeSelector } from './theme-selector'

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  minLength?: number
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
}: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required
      />
    </div>
  )
}

function AccountPasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)

    try {
      const result = await changeAccountPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      if (result.warning) {
        toast.warning(result.warning)
      } else {
        toast.success('Account password changed.')
      }
    } catch {
      toast.error('The account password could not be changed.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-primary/10 dark:text-primary">
          <KeyRound className="size-5" />
        </div>
        <CardTitle>Account password</CardTitle>
        <CardDescription>
          Change the password used to sign in. Other devices will be signed out.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <PasswordField
            id="current-account-password"
            label="Current account password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <PasswordField
            id="new-account-password"
            label="New account password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm-account-password"
            label="Confirm new account password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
          <Button type="submit" disabled={isBusy}>
            {isBusy ? 'Changing…' : 'Change account password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function MasterPasswordCard({
  initialKeychain,
}: {
  initialKeychain: StoredKeychain | null
}) {
  const [keychain, setKeychain] = useState(initialKeychain)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const { setMasterKey } = useE2EE()

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!keychain) {
      toast.error('Finish encryption setup before changing this password.')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New master passwords do not match.')
      return
    }

    if (currentPassword === newPassword) {
      toast.error('Choose a new master password.')
      return
    }

    setIsBusy(true)
    try {
      const masterKey = await unwrapMasterKey(currentPassword, keychain)
      const replacement = await wrapMasterKey(masterKey, newPassword)
      const result = await replaceUserKeychain(
        replacement,
        keychain.wrappedMasterKey,
      )

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      setKeychain(replacement)
      setMasterKey(masterKey)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Master password changed.')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'The master password could not be changed.',
      )
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
          <LockKeyhole className="size-5" />
        </div>
        <CardTitle>Master password</CardTitle>
        <CardDescription>
          Re-wrap your encryption key without re-encrypting tasks or lists.
          Planomy cannot recover this password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {keychain ? (
          <form onSubmit={submit} className="space-y-4">
            <PasswordField
              id="current-master-password"
              label="Current master password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
            <PasswordField
              id="new-master-password"
              label="New master password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              minLength={12}
            />
            <PasswordField
              id="confirm-master-password-change"
              label="Confirm new master password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              minLength={12}
            />
            <Button type="submit" disabled={isBusy}>
              {isBusy ? 'Changing…' : 'Change master password'}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Finish onboarding and create an encryption key before changing your
            master password.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function DeleteAccountCard() {
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const { lock } = useE2EE()

  function changeOpen(nextOpen: boolean) {
    if (isBusy) return
    setOpen(nextOpen)
    if (!nextOpen) {
      setCurrentPassword('')
      setConfirmation('')
      setError(null)
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)
    setError(null)

    try {
      const result = await deleteAccount({ currentPassword, confirmation })
      if (!result.ok) {
        setError(result.message)
        return
      }

      lock()
      window.location.assign('/auth?deleted=true')
    } catch {
      setError('The account could not be deleted.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-red-50 text-destructive dark:bg-destructive/10">
          <ShieldAlert className="size-5" />
        </div>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>
          Permanently delete your account, encryption key, lists, tasks, daily
          selections, and scheduled time blocks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog open={open} onOpenChange={changeOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form onSubmit={submit} className="contents">
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-destructive/10 text-destructive">
                  <Trash2 />
                </AlertDialogMedia>
                <AlertDialogTitle>
                  Delete your account permanently?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. Your encrypted planner data and
                  encryption key will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4 py-2">
                <PasswordField
                  id="delete-account-password"
                  label="Current account password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  autoComplete="current-password"
                />
                <div className="space-y-2">
                  <Label htmlFor="delete-account-confirmation">
                    Type DELETE to confirm
                  </Label>
                  <Input
                    id="delete-account-confirmation"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="off"
                    required
                  />
                </div>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel type="button" disabled={isBusy}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={
                    isBusy ||
                    !currentPassword ||
                    confirmation !== 'DELETE'
                  }
                >
                  {isBusy ? 'Deleting…' : 'Permanently delete account'}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

export default function SettingsClient({
  initialKeychain,
}: {
  initialKeychain: StoredKeychain | null
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Planomy follows your preference across every workspace surface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>
      <AccountPasswordCard />
      <MasterPasswordCard initialKeychain={initialKeychain} />
      <DeleteAccountCard />
    </div>
  )
}
