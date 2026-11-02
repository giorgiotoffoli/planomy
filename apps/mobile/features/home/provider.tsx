import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { AccessibilityInfo, AppState, LayoutAnimation } from 'react-native'
import * as Haptics from 'expo-haptics'
import { localDateKey } from '@planomy/lib/today'
import {
  createPreviewSource,
  projectHomeCommand,
  type HomeCommand,
  type HomeDataSource,
  type HomeSourcePreferenceCommand,
  type HomeSnapshot,
} from './model'

export type HomeStatus = 'blocked' | 'loading' | 'ready' | 'error'
type Notice = { text: string; undo?: HomeCommand }
type HomeContextValue = {
  status: HomeStatus
  data: HomeSnapshot | null
  busy: boolean
  day: string
  now: number
  mode: 'vault' | 'preview' | null
  notice: Notice | null
  refreshing: boolean
  refresh: () => Promise<void>
  animateLayout: () => void
  run: (
    command: HomeCommand,
    text: string,
    undo?: HomeCommand,
  ) => Promise<boolean>
  applySourcePreferences: (
    commands: HomeSourcePreferenceCommand[],
  ) => Promise<boolean>
  startPreview: () => void
  endPreview: () => void
  dismissNotice: () => void
}
const HomeContext = createContext<HomeContextValue | null>(null)

type PendingSourcePreference = {
  source: HomeDataSource
  generation: number
  command: HomeSourcePreferenceCommand
}

function isSourcePreferenceCommand(
  command: HomeCommand,
): command is HomeSourcePreferenceCommand {
  return (
    command.type === 'source' ||
    command.type === 'category' ||
    command.type === 'showAll'
  )
}

function sameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id) => right.includes(id))
}

function sameSourcePreferences(
  left: HomeSnapshot['preferences'],
  right: HomeSnapshot['preferences'],
) {
  return (
    sameIds(left.excludedHomeListIds, right.excludedHomeListIds) &&
    sameIds(left.excludedHomeCategoryIds, right.excludedHomeCategoryIds) &&
    sameIds(left.includedHomeCategoryIds, right.includedHomeCategoryIds) &&
    left.showUnsortedOnHome === right.showUnsortedOnHome
  )
}

export function HomeProvider({
  children,
  source: vaultSource,
}: PropsWithChildren<{ source?: HomeDataSource }>) {
  const [preview, setPreview] = useState<HomeDataSource | null>(null)
  return (
    <HomeSession
      key={preview ? 'preview' : 'vault'}
      source={vaultSource ?? preview}
      startPreview={() => {
        if (__DEV__) setPreview(createPreviewSource(localDateKey()))
      }}
      endPreview={() => {
        preview?.dispose()
        setPreview(null)
      }}
    >
      {children}
    </HomeSession>
  )
}

function HomeSession({
  children,
  source,
  startPreview,
  endPreview,
}: PropsWithChildren<{
  source: HomeDataSource | null | undefined
  startPreview: () => void
  endPreview: () => void
}>) {
  const [data, setData] = useState<HomeSnapshot | null>(null)
  const dataRef = useRef<HomeSnapshot | null>(null)
  const [status, setStatus] = useState<HomeStatus>(
    source ? 'loading' : 'blocked',
  )
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const lock = useRef(false)
  const epoch = useRef(0)
  const sourceGeneration = useRef(0)
  const sourcePreferenceQueue = useRef<PendingSourcePreference[]>([])
  const sourcePreferenceSyncing = useRef<number | null>(null)
  const reducedMotion = useRef(true)
  const [now, setNow] = useState(Date.now)
  const day = localDateKey(new Date(now))
  const replace = useCallback((next: HomeSnapshot | null) => {
    dataRef.current = next
    setData(next)
  }, [])
  const animate = useCallback(() => {
    if (!reducedMotion.current)
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
  }, [])

  useEffect(() => {
    sourceGeneration.current += 1
    return () => {
      sourceGeneration.current += 1
      sourcePreferenceQueue.current = []
    }
  }, [source])

  const flushSourcePreferences = useCallback(async () => {
    const drainGeneration = sourceGeneration.current
    if (sourcePreferenceSyncing.current === drainGeneration) return
    sourcePreferenceSyncing.current = drainGeneration
    let failure: { job: PendingSourcePreference } | null = null

    try {
      while (true) {
        if (drainGeneration !== sourceGeneration.current) return
        while (sourcePreferenceQueue.current.length > 0) {
          if (drainGeneration !== sourceGeneration.current) return
          const job = sourcePreferenceQueue.current.shift()!
          if (job.generation !== drainGeneration) continue

          try {
            await job.source.persistSourcePreference(job.command)
          } catch {
            if (job.generation === sourceGeneration.current) failure = { job }
          }
        }

        if (!failure) break
        if (drainGeneration !== sourceGeneration.current) return
        if (failure.job.generation !== drainGeneration) {
          failure = null
          continue
        }

        let authoritative: HomeSnapshot
        try {
          authoritative = await failure.job.source.read(localDateKey())
        } catch {
          if (drainGeneration !== sourceGeneration.current) return
          if (sourcePreferenceQueue.current.length > 0) continue
          setNotice({ text: 'Some source changes weren’t saved. Try again.' })
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          ).catch(() => {})
          failure = null
          break
        }

        if (drainGeneration !== sourceGeneration.current) return
        if (sourcePreferenceQueue.current.length > 0) continue
        const current = dataRef.current
        if (
          current &&
          !sameSourcePreferences(current.preferences, authoritative.preferences)
        ) {
          animate()
          replace({ ...current, preferences: authoritative.preferences })
          setNotice({ text: 'Some source changes weren’t saved. Try again.' })
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          ).catch(() => {})
        }
        failure = null
        break
      }
    } finally {
      if (sourcePreferenceSyncing.current === drainGeneration)
        sourcePreferenceSyncing.current = null
    }
  }, [animate, replace])

  const refresh = useCallback(async () => {
    if (!source || lock.current) return
    lock.current = true
    const requestEpoch = epoch.current
    setRefreshing(true)
    try {
      const next = await source.read(localDateKey())
      if (epoch.current !== requestEpoch) return
      replace(next)
      setStatus('ready')
    } catch {
      if (epoch.current !== requestEpoch) return
      if (!dataRef.current) setStatus('error')
      setNotice({
        text: 'Couldn’t refresh. Check your connection and try again.',
      })
    } finally {
      if (epoch.current === requestEpoch) {
        lock.current = false
        setRefreshing(false)
      }
    }
  }, [source, replace])

  useEffect(() => {
    if (!source || lock.current) return
    const requestEpoch = ++epoch.current
    lock.current = true
    void source
      .read(day)
      .then((next) => {
        if (epoch.current === requestEpoch) {
          replace(next)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (epoch.current === requestEpoch) {
          if (!dataRef.current) setStatus('error')
          setNotice({
            text: 'Couldn’t refresh. Check your connection and try again.',
          })
        }
      })
      .finally(() => {
        if (epoch.current === requestEpoch) lock.current = false
      })
    return () => {
      epoch.current += 1
      lock.current = false
    }
  }, [source, day, replace])
  useEffect(() => {
    let active = true
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) reducedMotion.current = value
    })
    const accessibility = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (value) => {
        reducedMotion.current = value
      },
    )
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    const state = AppState.addEventListener('change', (value) => {
      if (value === 'active') {
        setNow(Date.now())
        void refresh()
      }
    })
    return () => {
      active = false
      accessibility.remove()
      clearInterval(timer)
      state.remove()
    }
  }, [refresh])
  useEffect(() => {
    if (!notice) return
    AccessibilityInfo.announceForAccessibility(notice.text)
    const timer = setTimeout(() => setNotice(null), notice.undo ? 8000 : 5000)
    return () => clearTimeout(timer)
  }, [notice])

  async function applySourcePreferences(
    commands: HomeSourcePreferenceCommand[],
    text = 'Sources updated',
    undo?: HomeCommand,
  ) {
    if (!source || !dataRef.current || commands.length === 0) return false

    let optimistic = dataRef.current
    for (const command of commands)
      optimistic = projectHomeCommand(optimistic, command)
    animate()
    replace(optimistic)
    setNotice({ text, undo })
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {})
    sourcePreferenceQueue.current.push(
      ...commands.map((command) => ({
        source,
        generation: sourceGeneration.current,
        command,
      })),
    )
    void flushSourcePreferences()
    return true
  }

  async function run(command: HomeCommand, text: string, undo?: HomeCommand) {
    if (!source || !dataRef.current) return false

    if (isSourcePreferenceCommand(command)) {
      return applySourcePreferences([command], text, undo)
    }

    if (lock.current) return false
    const previous = dataRef.current
    const requestEpoch = epoch.current
    try {
      const optimistic = projectHomeCommand(previous, command)
      lock.current = true
      setBusy(true)
      animate()
      replace(optimistic)
      const next = await source.execute(command)
      if (epoch.current !== requestEpoch) return false
      replace(next)
      setNotice({ text, undo })
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {})
      return true
    } catch (error) {
      if (epoch.current !== requestEpoch) return false
      animate()
      replace(previous)
      setNotice({
        text:
          error instanceof Error
            ? error.message
            : 'Change wasn’t saved. Try again.',
      })
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {})
      return false
    } finally {
      if (epoch.current === requestEpoch) {
        lock.current = false
        setBusy(false)
      }
    }
  }
  return (
    <HomeContext.Provider
      value={{
        status,
        data,
        busy,
        refreshing,
        day,
        now,
        notice,
        mode: source?.mode ?? null,
        refresh,
        animateLayout: animate,
        run,
        applySourcePreferences: (commands) =>
          applySourcePreferences(commands),
        startPreview,
        endPreview,
        dismissNotice: () => setNotice(null),
      }}
    >
      {children}
    </HomeContext.Provider>
  )
}
export function useHome() {
  const value = useContext(HomeContext)
  if (!value) throw new Error('Home requires HomeProvider.')
  return value
}
