'use client'

import { useSyncExternalStore } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function ThemeSelector() {
  const { setTheme, theme } = useTheme()
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  )

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">Theme</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose light, dark, or follow your device.
        </p>
      </div>
      <Select
        value={mounted ? theme : 'system'}
        onValueChange={setTheme}
        disabled={!mounted}
      >
        <SelectTrigger className="w-full sm:w-44" aria-label="Theme">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="system">
            <span className="flex items-center gap-2">
              <Monitor className="size-4" /> System
            </span>
          </SelectItem>
          <SelectItem value="light">
            <span className="flex items-center gap-2">
              <Sun className="size-4" /> Light
            </span>
          </SelectItem>
          <SelectItem value="dark">
            <span className="flex items-center gap-2">
              <Moon className="size-4" /> Dark
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
