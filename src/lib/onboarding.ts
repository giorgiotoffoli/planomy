export const ONBOARDING_VERSION = 1

export type OnboardingStep =
  | 'welcome'
  | 'account-password'
  | 'security'
  | 'first-task'

type UserMetadata = Record<string, unknown>

export type OnboardingState = {
  complete: boolean
  step: OnboardingStep
  pendingTaskId: string | null
}

export function resolveOnboardingState(
  metadata: UserMetadata,
  hasKeychain: boolean,
  hasAccountPassword = true,
): OnboardingState {
  const status = metadata.onboarding_status
  const version = metadata.onboarding_version
  const pendingTaskId =
    typeof metadata.onboarding_task_id === 'string'
      ? metadata.onboarding_task_id
      : null

  if (!hasKeychain) {
    return {
      complete: false,
      step:
        status === 'started'
          ? hasAccountPassword
            ? 'security'
            : 'account-password'
          : 'welcome',
      pendingTaskId,
    }
  }

  if (!hasAccountPassword) {
    return { complete: false, step: 'account-password', pendingTaskId }
  }

  if (status === 'started' && version === ONBOARDING_VERSION) {
    return { complete: false, step: 'first-task', pendingTaskId }
  }

  // A keychain without onboarding metadata belongs to an account created
  // before onboarding existed, so it must not be forced through first-run UI.
  return { complete: true, step: 'first-task', pendingTaskId }
}

export function isUuid(value: string | null): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  )
}
