import * as SecureStore from 'expo-secure-store'

export type HomeSectionKey = 'focus' | 'upcoming' | 'tasks' | 'stashed'

export type HomeViewPreferences = {
  expanded: Record<HomeSectionKey, boolean>
  showAllUpcoming: boolean
}

const sections: HomeSectionKey[] = ['focus', 'upcoming', 'tasks', 'stashed']
const storageKey = (userId: string) =>
  `planomy.home-view.v1.${encodeURIComponent(userId)}`

export function defaultHomeViewPreferences(): HomeViewPreferences {
  return {
    expanded: {
      focus: true,
      upcoming: true,
      tasks: true,
      stashed: false,
    },
    showAllUpcoming: false,
  }
}

function parsePreferences(value: unknown): HomeViewPreferences | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const expanded = record.expanded
  if (!expanded || typeof expanded !== 'object') return null
  const sectionValues = expanded as Record<string, unknown>
  if (
    typeof record.showAllUpcoming !== 'boolean' ||
    sections.some((section) => typeof sectionValues[section] !== 'boolean')
  ) {
    return null
  }

  return {
    expanded: {
      focus: sectionValues.focus as boolean,
      upcoming: sectionValues.upcoming as boolean,
      tasks: sectionValues.tasks as boolean,
      stashed: sectionValues.stashed as boolean,
    },
    showAllUpcoming: record.showAllUpcoming,
  }
}

export async function loadHomeViewPreferences(
  userId: string,
): Promise<HomeViewPreferences | null> {
  try {
    const value = await SecureStore.getItemAsync(storageKey(userId))
    return value ? parsePreferences(JSON.parse(value)) : null
  } catch {
    return null
  }
}

export async function saveHomeViewPreferences(
  userId: string,
  preferences: HomeViewPreferences,
): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      storageKey(userId),
      JSON.stringify(preferences),
    )
  } catch {
    // Keep section controls usable if local preference storage is unavailable.
  }
}
