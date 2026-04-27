// Plan 11-09: Conflict detection helpers for entity_drafts.
// Extracted to keep the hook lean and enable isolated unit testing.

/**
 * Returns true if a draft was last modified within the given TTL window.
 * Used to decide whether to show the soft conflict banner.
 */
export function isDraftFresh(lastModifiedAt: string, ttlSeconds: number): boolean {
  const ageMs = Date.now() - new Date(lastModifiedAt).getTime()
  return ageMs < ttlSeconds * 1000
}

/**
 * Returns true when the draft was last written by a *different* tab within the TTL window.
 * Triggers the soft conflict banner (no hard-block per CONTEXT.md).
 *
 * @param currentTabId - sessionStorage UUID for this browser tab
 * @param draftTabId   - _tab_id stored inside the draft_data JSONB
 * @param draftModifiedAt - last_modified_at from entity_drafts row
 * @param ttlSeconds   - 60 by default (locked in CONTEXT.md)
 */
export function detectTabConflict(
  currentTabId: string,
  draftTabId: string | null,
  draftModifiedAt: string | null,
  ttlSeconds = 60
): boolean {
  if (!draftTabId || !draftModifiedAt) return false
  if (draftTabId === currentTabId) return false
  return isDraftFresh(draftModifiedAt, ttlSeconds)
}
