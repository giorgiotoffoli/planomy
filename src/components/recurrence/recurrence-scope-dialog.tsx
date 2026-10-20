'use client'

import { useState } from 'react'
import { Repeat } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { RECURRENCE_SCOPES, type RecurrenceScope } from '@/lib/recurrence-scope'

export function RecurrenceScopeDialog({
  open,
  action,
  itemLabel,
  availableScopes = RECURRENCE_SCOPES.map((scope) => scope.value),
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean
  action: 'edit' | 'delete'
  itemLabel: string
  availableScopes?: RecurrenceScope[]
  busy?: boolean
  onCancel: () => void
  onConfirm: (scope: RecurrenceScope) => void
}) {
  const scopes = RECURRENCE_SCOPES.filter((scope) => availableScopes.includes(scope.value))
  const [scope, setScope] = useState<RecurrenceScope>(availableScopes[0] ?? 'this')
  const selectedScope = scopes.some((option) => option.value === scope)
    ? scope
    : scopes[0]?.value ?? 'this'

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !busy) onCancel() }}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-primary/10 text-primary">
            <Repeat />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {action === 'delete' ? `Delete recurring ${itemLabel}?` : `Edit recurring ${itemLabel}`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Choose which occurrences this change should affect.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          {scopes.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={selectedScope === option.value}
              disabled={busy}
              onClick={() => setScope(option.value)}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedScope === option.value ? 'border-primary bg-primary/8 ring-2 ring-primary/20' : 'border-border hover:bg-muted/60'}`}
            >
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
            </button>
          ))}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel type="button" disabled={busy}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant={action === 'delete' ? 'destructive' : 'default'}
            disabled={busy}
            onClick={() => onConfirm(selectedScope)}
          >
            {busy ? 'Saving…' : action === 'delete' ? 'Delete' : 'Continue'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
