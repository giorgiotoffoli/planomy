'use client'

import { useEffect } from 'react'
import type { ComponentProps } from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'

const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

function SystemThemeSync() {
  const { theme } = useTheme()

  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY)

    function applySystemTheme() {
      const root = document.documentElement
      const isDark = mediaQuery.matches

      root.classList.toggle('dark', isDark)
      root.classList.toggle('light', !isDark)
      root.style.colorScheme = isDark ? 'dark' : 'light'
    }

    applySystemTheme()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', applySystemTheme)

      return () => mediaQuery.removeEventListener('change', applySystemTheme)
    }

    mediaQuery.addListener(applySystemTheme)
    return () => mediaQuery.removeListener(applySystemTheme)
  }, [theme])

  return null
}

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <SystemThemeSync />
      {children}
    </NextThemesProvider>
  )
}
