export type RecurrenceScope = 'this' | 'following' | 'all'

export const RECURRENCE_SCOPES: Array<{
  value: RecurrenceScope
  label: string
  description: string
}> = [
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
