export type AuthUser = {
  id: string
  email: string | null
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated'; message?: string }
  | { status: 'authenticated-but-locked'; user: AuthUser }
  | { status: 'unlocked'; user: AuthUser }

export type AuthStateEvent =
  | { type: 'restored'; user: AuthUser | null }
  | { type: 'signed-in'; user: AuthUser }
  | { type: 'session-updated'; user: AuthUser }
  | { type: 'signed-out'; message?: string }
  | { type: 'vault-unlocked' }
  | { type: 'vault-locked' }

export const initialAuthState: AuthState = { status: 'loading' }

export function reduceAuthState(state: AuthState, event: AuthStateEvent): AuthState {
  switch (event.type) {
    case 'restored':
      return event.user
        ? { status: 'authenticated-but-locked', user: event.user }
        : { status: 'unauthenticated' }
    case 'signed-in':
      return { status: 'authenticated-but-locked', user: event.user }
    case 'session-updated':
      if (
        (state.status === 'authenticated-but-locked' || state.status === 'unlocked') &&
        state.user.id === event.user.id
      ) {
        return { ...state, user: event.user }
      }
      return { status: 'authenticated-but-locked', user: event.user }
    case 'signed-out':
      return event.message
        ? { status: 'unauthenticated', message: event.message }
        : { status: 'unauthenticated' }
    case 'vault-unlocked':
      return state.status === 'authenticated-but-locked'
        ? { status: 'unlocked', user: state.user }
        : state
    case 'vault-locked':
      return state.status === 'unlocked'
        ? { status: 'authenticated-but-locked', user: state.user }
        : state
  }
}
