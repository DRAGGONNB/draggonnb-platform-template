'use client'
// Plan 11-09: useEntityDraft hook — debounced autosave to entity_drafts every 1s.
// tab_id stored in sessionStorage to detect multi-tab conflicts (CONTEXT.md locked).
import { useEffect, useRef, useState, useCallback } from 'react'
import { detectTabConflict } from './conflict-detection'

export interface UseDraftOpts<T> {
  entityType: 'contact' | 'deal' | 'company'
  entityId: string | null      // null for new-entity draft
  initialTabId: string | null  // draftTabId from server-render (loadEntityWithDraft)
  initialModifiedAt: string | null
  currentValues: T             // controlled form state — hook watches this
}

export interface UseDraftResult {
  conflictDetected: boolean
  dismissConflict: () => void
  clear: () => Promise<void>
}

export function useEntityDraft<T extends Record<string, unknown>>(
  opts: UseDraftOpts<T>
): UseDraftResult {
  const tabIdRef = useRef<string | null>(null)
  const [conflictDetected, setConflictDetected] = useState(false)

  // ── Tab ID bootstrap + conflict check on mount ──────────────────────────
  useEffect(() => {
    let stored = sessionStorage.getItem('draggonnb_tab_id')
    if (!stored) {
      stored = crypto.randomUUID()
      sessionStorage.setItem('draggonnb_tab_id', stored)
    }
    tabIdRef.current = stored

    // Conflict: was another tab the last writer within 60s?
    if (
      detectTabConflict(stored, opts.initialTabId, opts.initialModifiedAt)
    ) {
      setConflictDetected(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount-only — intentional: opts checked once against server-rendered snapshot

  // ── Debounced autosave on every keystroke (1s — CONTEXT.md locked) ──────
  useEffect(() => {
    if (!tabIdRef.current) return
    const tabId = tabIdRef.current

    const timer = setTimeout(() => {
      fetch('/api/crm/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: opts.entityType,
          entityId: opts.entityId,
          draftData: { ...opts.currentValues, _tab_id: tabId },
        }),
      }).catch(() => {
        // Draft autosave is best-effort — silent failure, never blocks the user
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [opts.currentValues, opts.entityType, opts.entityId])

  // ── Clear draft on successful save ──────────────────────────────────────
  const clear = useCallback(async () => {
    try {
      await fetch('/api/crm/drafts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: opts.entityType,
          entityId: opts.entityId,
        }),
      })
    } catch {
      // Best-effort — if delete fails the 7-day TTL cleanup handles it
    }
  }, [opts.entityType, opts.entityId])

  return {
    conflictDetected,
    dismissConflict: () => setConflictDetected(false),
    clear,
  }
}
