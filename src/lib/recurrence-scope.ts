export type RecurrenceScope = 'this' | 'following' | 'all'

export type RecurrenceScopeOption = {
  value: RecurrenceScope
  label: string
  description: string
}

export const RECURRENCE_SCOPES: RecurrenceScopeOption[] = [
  {
    value: 'this',
    label: 'This occurrence',
    description: 'Change only the selected occurrence.',
  },
  {
    value: 'following',
    label: 'This and following',
    description: 'Change this occurrence and every future occurrence.',
  },
  {
    value: 'all',
    label: 'All occurrences',
    description: 'Change the entire recurring series.',
  },
]

export function recurrenceScopeOptionsForWeekday(weekdayName: string): RecurrenceScopeOption[] {
  return [
    {
      value: 'this',
      label: 'Only this occurrence',
      description: 'Changes only the selected occurrence.',
    },
    {
      value: 'following',
      label: `This and following ${weekdayName}s`,
      description: `Changes the scheduled time for future ${weekdayName}s, without affecting other weekdays.`,
    },
    {
      value: 'all',
      label: `All ${weekdayName}s`,
      description: `Changes the ${weekdayName} schedule throughout the series, without changing other weekdays.`,
    },
  ]
}
