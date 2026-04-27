export type UiMode = 'easy' | 'advanced'

export function resolveUiMode(stored: string | null, role: 'admin' | 'manager' | 'user'): UiMode {
  if (stored === 'easy' || stored === 'advanced') return stored
  // Role defaults (CONTEXT.md locked): admin→easy, manager→advanced, user→easy
  if (role === 'manager') return 'advanced'
  return 'easy'
}
