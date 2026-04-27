# Phase 11: CRM Easy/Advanced UX — Research Part A (Researcher A)

**Researched:** 2026-04-27
**Domain:** Next.js RSC + Supabase + shadcn/ui — CRM UX pattern
**Scope:** UX-01..07 only (Campaign Studio / SMS in Researcher B)

---

## 1. `<ModuleHome>` Architecture

### File Location
```
components/module-home/ModuleHome.tsx          -- RSC wrapper (no 'use client')
components/module-home/ActionCard.tsx          -- Client island ('use client')
components/module-home/ActionCardItem.tsx      -- Client island
components/module-home/ToggleViewButton.tsx    -- Client island (floating pill)
```

### Manifest Shape (TypeScript interface)

```typescript
// components/module-home/types.ts

export type CardSourceKind =
  | 'sql_page_load'           // Pure SQL on every RSC render
  | 'cached_suggestions'      // Reads crm_action_suggestions (nightly cache)
  | 'combined'                // SQL on load + cached overlay

export interface ActionCardManifest {
  id: string                  // e.g. 'followups', 'stale_deals', 'hot_leads'
  title: string
  description: string
  emptyStateCTA: string       // "Add your first deal" etc.
  maxItems: 5
  sourceKind: CardSourceKind
  // RSC passes server-fetched items; client island owns approve/dismiss mutations
}

export interface ModuleHomeProps {
  module: string              // 'crm' | 'email' | etc.
  cards: ActionCardManifest[]
  initialData: ModuleHomeData // pre-fetched server-side; typed per module
  userRole: 'admin' | 'manager' | 'user'
  uiMode: 'easy' | 'advanced'
  organizationId: string
  hasBrandVoice: boolean      // drives fallback banner
}

// CRM-specific initial data shape
export interface CRMModuleHomeData {
  followups: FollowupItem[]
  staleDeals: StaleDealItem[]
  hotLeads: HotLeadItem[]
  dismissals: DismissalMap   // { [suggestionId]: expires_at }
}
```

### RSC vs Client Island Split

The RSC (`ModuleHome.tsx`) fetches all data server-side at render time (SQL queries + crm_action_suggestions reads). It passes serialized data down to client islands via props. Client islands own:
- Approve button state + 5s undo countdown timer
- Dismiss mutation (POST to API route)
- View-switch navigation (router.push)

**Pattern already used in codebase:** `app/(dashboard)/layout.tsx` shows the RSC-fetches-data, passes to `UsageWarningBanner` (client) pattern. Use the same approach.

### Prop Contract for Action Cards

```typescript
// Client island receives:
interface ActionCardProps {
  cardId: string
  title: string
  items: ActionCardItem[]       // max 5, already filtered
  totalCount: number            // for "View all in Advanced" link
  hasBrandVoice: boolean
  onApprove: (itemId: string, action: ApproveAction) => Promise<void>
  onDismiss: (itemId: string) => Promise<void>
}

type ApproveAction =
  | { type: 'send_email' }
  | { type: 'snooze_1d' }
  | { type: 'decide'; choice: 'engage' | 'archive' | 'snooze' }
  | { type: 'engage_hot_lead' }
```

### Route Structure (UX-02)

```
app/(dashboard)/crm/page.tsx              -- BECOMES Easy view (ModuleHome RSC)
app/(dashboard)/crm/advanced/page.tsx     -- NEW Advanced view (existing kanban+filters)
```

The current `app/(dashboard)/crm/page.tsx` is a stats overview, NOT a kanban. Its content should move to `advanced/page.tsx`. The Easy view replaces the root `/crm` page.

**Redirect logic:** `page.tsx` reads `user_profiles.ui_mode`; if `advanced`, redirects to `/crm/advanced`. This keeps URLs stable and honors user preference without client-side flickering.

---

## 2. `crm_action_suggestions` Table

### Full CREATE TABLE

```sql
-- Migration 36: crm_action_suggestions
-- Purpose: Cache for nightly N8N engagement-score + hot-lead scoring
-- Written by N8N; read by Easy view RSC on page load

CREATE TABLE IF NOT EXISTS crm_action_suggestions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Which card this suggestion feeds
  card_type       TEXT        NOT NULL
                  CHECK (card_type IN ('followup', 'hot_lead')),
                  -- 'stale_deals' is computed pure SQL; not cached here
  
  -- Target entity
  entity_type     TEXT        NOT NULL CHECK (entity_type IN ('contact', 'deal')),
  entity_id       UUID        NOT NULL,   -- contacts.id or deals.id
  
  -- Scoring payload (flexible JSONB for N8N to evolve without migration)
  score           INTEGER     NOT NULL DEFAULT 0,   -- engagement score (pts)
  score_breakdown JSONB       NOT NULL DEFAULT '{}',
  -- e.g. {"opens_7d": 2, "clicks_7d": 1, "replies_7d": 0}
  
  -- Freshness gate: Easy view only renders if refreshed_at > NOW() - INTERVAL '25h'
  refreshed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- N8N run metadata
  n8n_run_id      TEXT,       -- workflow execution ID for traceability
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One row per org+card+entity; N8N does UPSERT
  UNIQUE (organization_id, card_type, entity_id)
);

CREATE INDEX idx_crm_action_suggestions_org_card
  ON crm_action_suggestions (organization_id, card_type)
  WHERE refreshed_at > NOW() - INTERVAL '25 hours'; -- partial index for freshness

CREATE INDEX idx_crm_action_suggestions_score
  ON crm_action_suggestions (organization_id, card_type, score DESC);

-- Trigger
CREATE TRIGGER update_crm_action_suggestions_updated_at
  BEFORE UPDATE ON crm_action_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### RLS Policies

```sql
ALTER TABLE crm_action_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_action_suggestions FORCE ROW LEVEL SECURITY;

CREATE POLICY "crm_action_suggestions_org_read" ON crm_action_suggestions
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));

-- N8N uses service role for writes (no user-facing write policy needed)
CREATE POLICY "crm_action_suggestions_service_role" ON crm_action_suggestions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

### Justification per Column

- `card_type`: Discriminates which Easy view card reads this row. Stale deals excluded — computed pure SQL.
- `entity_type + entity_id`: Allows the page RSC to JOIN back to contacts/deals for display name.
- `score`: Composite engagement point total. Used to ORDER within card (DESC).
- `score_breakdown`: JSONB for N8N to store `opens_7d`, `clicks_7d`, `replies_7d` without future migrations.
- `refreshed_at`: Staleness gate. Page renders card only if `refreshed_at > NOW() - INTERVAL '25h'` (nightly runs at 02:00 + 1hr buffer). Falls back to empty card with "Syncing..." message if stale.
- `n8n_run_id`: Traceability — link Easy view display back to a specific N8N execution in logs.

### Refresh Strategy

N8N writes via `UPSERT` (Supabase PostgREST `POST + Prefer: resolution=merge-duplicates`). Page-load SQL filters `WHERE refreshed_at > NOW() - INTERVAL '25 hours'` to avoid showing yesterday's stale data if N8N failed overnight.

---

## 3. `entity_drafts` Table

### Full CREATE TABLE

```sql
-- Migration 37: entity_drafts
-- Purpose: Store unsaved form state across view switches (UX-06, UX-07)

CREATE TABLE IF NOT EXISTS entity_drafts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What entity this draft belongs to
  entity_type     TEXT        NOT NULL,   -- 'contact', 'deal', 'company'
  entity_id       UUID,                   -- NULL = new-entity draft (unsaved record)
  
  -- Draft content
  draft_data      JSONB       NOT NULL DEFAULT '{}',
  
  -- Conflict detection: last writer's timestamp
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- TTL cleanup hook: nightly cron deletes WHERE expires_at < NOW()
  expires_at      TIMESTAMPTZ NOT NULL
                  DEFAULT (NOW() + INTERVAL '7 days'),
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One draft per user per entity
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX idx_entity_drafts_org_user
  ON entity_drafts (organization_id, user_id);

CREATE INDEX idx_entity_drafts_entity
  ON entity_drafts (entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

CREATE INDEX idx_entity_drafts_expires
  ON entity_drafts (expires_at)
  WHERE expires_at < NOW() + INTERVAL '8 days'; -- cleanup cron target

CREATE TRIGGER update_entity_drafts_updated_at
  BEFORE UPDATE ON entity_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### RLS Policies

```sql
ALTER TABLE entity_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_drafts FORCE ROW LEVEL SECURITY;

-- Users can only see their own drafts
CREATE POLICY "entity_drafts_owner_read" ON entity_drafts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "entity_drafts_owner_write" ON entity_drafts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "entity_drafts_service_role" ON entity_drafts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

### Nightly Cleanup

**Recommendation: N8N cron (not pg_cron).** Reason: pg_cron is a Supabase extension that requires manual enablement; the project already has 22 N8N workflows (including nightly jobs like `wf-analytics.json` which runs daily at 06:00). Adding cleanup to an existing nightly N8N job avoids adding Supabase extension dependencies.

```json
// Add to nightly N8N workflow (or new wf-crm-nightly.json):
// DELETE FROM entity_drafts WHERE expires_at < NOW()
// Trigger: Schedule 03:00 SAST (after engagement-score run at 02:00)
```

N8N cleanup SQL via Supabase REST:
```
DELETE /rest/v1/entity_drafts?expires_at=lt.{{ $now.toISOString() }}
```

---

## 4. `user_profiles.ui_mode` Column

### Migration Plan (OPS-05 multi-step)

**Step 1 — Migration 38: Add column NULLABLE**
```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS ui_mode TEXT; -- NULL = not yet set

COMMENT ON COLUMN user_profiles.ui_mode IS
  'User view preference: easy | advanced. NULL = role default applies.
   Set by toggle button click; read by getUserOrg() and CRM page RSC.';

CREATE INDEX IF NOT EXISTS user_profiles_ui_mode_idx
  ON user_profiles (id, ui_mode);
```

**Step 2 — Code ships (reads NULL as role-default)**

The page RSC resolves effective mode as:
```typescript
function resolveUiMode(uiMode: string | null, role: string): 'easy' | 'advanced' {
  if (uiMode === 'easy' || uiMode === 'advanced') return uiMode
  // Role defaults (locked decisions)
  if (role === 'manager') return 'advanced'
  return 'easy' // admin, user
}
```

**Step 3 — No backfill needed.** NULL = "use role default" is the correct permanent semantic. NOT NULL constraint is not needed; NULL carries meaning (unset preference).

**No Migration 39 (NOT NULL) needed** — NULL is load-bearing semantics, not a data quality gap. This is an exception to OPS-05 step 4 that the planner should document.

### Where Role-Default Logic Lives

NOT in a DB trigger (triggers on `user_profiles` fire on writes, not reads). NOT in `getUserOrg()` (it doesn't read `user_profiles.ui_mode` today; adding it would increase latency on every authenticated request).

**Recommended: CRM page RSC only.** The RSC reads `user_profiles.ui_mode` directly via admin client at CRM page render time. The `resolveUiMode()` helper above lives in `lib/crm/ui-mode.ts`. The toggle API route writes the column.

API route: `app/api/crm/ui-mode/route.ts` — `POST { mode: 'easy' | 'advanced' }` — updates `user_profiles.ui_mode` for the authenticated user. Called by the toggle button's click handler (client island).

**`getUserOrg()` is NOT modified** — it's called on every dashboard page and adding an extra query would hurt all module load times for one module's feature.

---

## 5. Engagement-Score Formula

### Proposed Weights

| Signal | Points | Justification |
|--------|--------|---------------|
| Email open (7d window) | 1 pt each | Low-intent signal; many opens are automated (mail client preload). Mailchimp industry research shows open-rate is 40% lower accuracy post-iOS 15. |
| Email click (7d window) | 3 pts each | High-intent: requires deliberate action. HubSpot's lead scoring framework weights click 3-4x vs open. |
| Email reply (7d window) | 10 pts each | Highest-intent: indicates active buyer. Outreach.io and HubSpot both classify reply as primary buying signal. |
| Manual "follow up" flag | 15 pts (one-time) | User override: always surfaces above algorithmic signals. |
| Inbound form submit / call request | 8 pts | Active inbound intent (for hot_lead card). |

**Minimum score to appear in card:** 3 pts (open-only). This ensures a contact who opened email once appears but ranks low. A contact with 1 click (3 pts) appears at same rank — acceptable.

**Confidence: MEDIUM** — weights sourced from HubSpot and Mailchimp industry documentation (training data, not live-verified). Planner should note these as initial values to tune after first 2 tenants.

### Computation Flow

```
N8N Workflow: wf-crm-engagement-score.json (new file)
Trigger: Schedule — 02:00 SAST (Africa/Johannesburg)

Node sequence:
1. Fetch email_events (last 7d) per org from Resend webhook data
   (stored in crm_activities or separate email_tracking table — TBD, see Risk #2)
2. For each contact: compute score from opens/clicks/replies
3. For deals: inherit contact score + deal value threshold check (hot_lead)
4. UPSERT to crm_action_suggestions via Supabase REST
5. Telegram ops alert if >0 errors (TELEGRAM_OPS_CHAT_ID)
```

**Recommended trigger time: 02:00 SAST** — chosen because:
- VPS analytics workflow runs at 06:00 SAST (`wf-analytics.json`)
- N8N onboarding workflows run during business hours
- 02:00 SAST = 00:00 UTC — low DB load, Vercel crons typically at 00:xx UTC
- 25h freshness window means a 02:00 SAST run is valid until 03:00 SAST next day

---

## 6. Stale-Threshold Seed Defaults

### Proposed Values

The `deals` table has stages: `lead`, `qualified`, `proposal`, `negotiation`, `won`, `lost`.
Context.md used `discovery/qualification/negotiation/closing` — this diverges from actual DB enum. Planner must align.

**Mapping to DB enum:**

```json
{
  "crm": {
    "stale_thresholds_days": {
      "lead": 7,
      "qualified": 14,
      "proposal": 10,
      "negotiation": 21
    }
  }
}
```

**Reasoning:**
- `lead` → 7 days: Early stage, high attrition if ignored. SA SME sales cycles shorter than enterprise.
- `qualified` → 14 days: Prospect is identified; 2 weeks without contact signals stall.
- `proposal` → 10 days: Shorter than qualification — proposal sent, decision expected sooner. Missing this is highest revenue risk.
- `negotiation` → 21 days: Longer cycles expected; 3 weeks gives room for multi-party decisions.
- `won` / `lost` stages excluded from stale logic (terminal states).

### Seeding Migration

```sql
-- In provisioning step OR as a one-time backfill in migration 38 (with ui_mode):
-- For existing orgs that have tenant_modules.module_id = 'crm':

UPDATE tenant_modules
SET config = jsonb_set(
  COALESCE(config, '{}'),
  '{crm}',
  jsonb_set(
    COALESCE(config->'crm', '{}'),
    '{stale_thresholds_days}',
    '{"lead": 7, "qualified": 14, "proposal": 10, "negotiation": 21}'::jsonb
  )
)
WHERE module_id = 'crm'
  AND (config->'crm'->'stale_thresholds_days') IS NULL;
```

This is safe on existing rows — JSONB update with IS NULL guard, no data loss.

---

## 7. `crm_activities` Extension

### New Columns Needed

`crm_activities` does NOT currently exist as a named table in migrations (only referenced in CONTEXT.md as an intended target). There is no `03_crm_tables.sql` entry for it, and no API routes reference it. This means the planner must **create it**, not extend it.

However, the CONTEXT.md locks `source='easy_view'` as a field on `crm_activities`. Treat this as "create the table with these columns from the start" — simpler than a two-step add.

### Full CREATE TABLE (new table, not an extension)

```sql
-- Migration 36 (same as crm_action_suggestions — or 37, planner decides):
CREATE TABLE IF NOT EXISTS crm_activities (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Who did the action
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Target entity
  entity_type     TEXT        NOT NULL CHECK (entity_type IN ('contact', 'deal', 'company')),
  entity_id       UUID        NOT NULL,
  
  -- What happened
  action_type     TEXT        NOT NULL
                  CHECK (action_type IN (
                    'email_sent',
                    'stage_moved',
                    'task_created',
                    'note_added',
                    'deal_archived',
                    'snoozed',
                    'dismissed'
                  )),
  
  -- Which surface triggered it
  source          TEXT        NOT NULL DEFAULT 'advanced'
                  CHECK (source IN ('easy_view', 'advanced', 'automation', 'api')),
  
  -- Flexible payload (email subject, stage_from/to, snooze_until, etc.)
  metadata        JSONB       NOT NULL DEFAULT '{}',
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crm_activities_org_entity
  ON crm_activities (organization_id, entity_type, entity_id, created_at DESC);

CREATE INDEX idx_crm_activities_source
  ON crm_activities (organization_id, source)
  WHERE source = 'easy_view'; -- for Easy view audit reports
```

**RLS:** Same org pattern as all CRM tables.

### OPS-05 Note

Since `crm_activities` is a NEW table (not altering an existing one), OPS-05 multi-step discipline does not apply. Create with all columns in migration 36.

---

## 8. 5-Second Undo Toast Pattern

### Library Decision

**Use the existing `@radix-ui/react-toast` implementation** — already in `package.json` (`@radix-ui/react-toast@^1.1.5`), already used via `components/ui/toast.tsx` + `hooks/use-toast.ts` + `components/ui/toaster.tsx`.

**Do NOT add `sonner`** — it would be a second toast library. The existing Radix toast is functional and project-consistent.

**Do NOT add `react-hot-toast`** — same reason.

### 5-Second Undo Architecture (in-memory)

The action queue is **in-memory only** (no Redis, no DB row). Process:

```typescript
// In ActionCardItem.tsx (client island)
const [pendingActions, setPendingActions] = useState<Map<string, PendingAction>>(new Map())

async function handleApprove(itemId: string, action: ApproveAction) {
  // 1. Show undo toast immediately
  const toastId = toast({
    title: "Sending email...",
    description: "Tap Undo to cancel",
    action: <ToastAction onClick={() => cancelAction(itemId)}>Undo</ToastAction>,
    duration: 5000,  // 5s auto-dismiss
  })
  
  // 2. Register pending action
  const timer = setTimeout(async () => {
    // 3. After 5s, commit action via API
    await fetch('/api/crm/easy-view/approve', {
      method: 'POST',
      body: JSON.stringify({ itemId, action, organizationId })
    })
    setPendingActions(prev => { prev.delete(itemId); return new Map(prev) })
  }, 5000)
  
  setPendingActions(prev => new Map(prev).set(itemId, { timer, toastId }))
}

function cancelAction(itemId: string) {
  const pending = pendingActions.get(itemId)
  if (pending) {
    clearTimeout(pending.timer)
    dismiss(pending.toastId)
    setPendingActions(prev => { prev.delete(itemId); return new Map(prev) })
  }
}
```

**Why in-memory (not DB row)?** The 5s window is too short for pessimistic DB locking (race with network latency). In-memory is correct: if the user closes the tab, the action is lost — acceptable because they navigated away. The alternative (DB "pending" row) adds a migration and cleanup cron for marginal UX improvement.

### Test Strategy

```typescript
// __tests__/components/crm/ActionCardItem.test.tsx
// 1. Render card with items
// 2. Click "Send email" on first item
// 3. Assert toast appears with "Undo" action
// 4. vi.advanceTimersByTime(4999) → assert API NOT called
// 5. vi.advanceTimersByTime(5001) → assert POST /api/crm/easy-view/approve called
// 6. Separate test: click Undo within 5s → assert timer cleared, API NOT called
```

Use `vi.useFakeTimers()` from Vitest (already used in project). No extra test libraries needed.

### Toast Position

The existing `ToastViewport` in `components/ui/toast.tsx` uses:
```
"fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
```

This is top-center mobile, bottom-right desktop — NOT the locked decision (bottom-center mobile-safe). The planner must override `ToastViewport` className for the Easy view toast specifically, or add a new `UndoToastViewport` component:

```typescript
// Override viewport position for Easy view undo toast
className="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-[100] w-auto max-w-[360px]"
// 80px from bottom clears iOS Safari toolbar (matches toggle button 80px offset)
// left-1/2 + -translate-x-1/2 = centered
```

---

## 9. Toggle Button Responsive Component

### Desktop Float (bottom-right, 16px from edges, 56x40px)

```typescript
// components/module-home/ToggleViewButton.tsx ('use client')
export function ToggleViewButton({ 
  currentMode, 
  onToggle 
}: { currentMode: 'easy' | 'advanced'; onToggle: () => void }) {
  const isEasy = currentMode === 'easy'
  const label = isEasy ? 'Advanced view →' : 'Easy view →'
  // Defensive: if destination === current (should not happen), show grayed label
  
  return (
    <button
      onClick={onToggle}
      className={cn(
        // Fixed position, z-index above page content but below modals
        "fixed z-40",
        // Desktop: bottom-right, 56x40px pill
        "bottom-4 right-4 h-10 w-auto min-w-[56px] px-3",
        // Mobile (360px breakpoint): 80px from bottom, 16px from right
        // 80px clears iOS Safari bottom toolbar + Android nav bar
        "sm:bottom-4 sm:right-4",
        "bottom-20 right-4",   // 80px = bottom-20 (20 * 4px = 80px)
        // safe-area-inset for iPhone notch/home-indicator
        "pb-safe",  // requires tailwind-safe-area-inset plugin OR inline style
        // Visual style
        "rounded-full bg-white border border-gray-200 shadow-md",
        "text-sm font-medium text-gray-700",
        "hover:bg-gray-50 hover:shadow-lg transition-all",
        "flex items-center gap-1.5"
      )}
      aria-label={label}
    >
      {label}
    </button>
  )
}
```

### Safe-Area Inset Handling

The project uses `tailwindcss@^3.4.1` without a safe-area plugin. For the 80px mobile offset, use an inline style:

```typescript
style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
```

This covers iOS Safari home indicator (34px on iPhone X+) without a plugin. The `bottom-20` (80px) already provides headroom for standard Android nav bars.

**Note on `pb-safe`:** This class does NOT exist in the current project's Tailwind config. Do not use it without adding the `tailwindcss-safe-area` plugin. Use `env(safe-area-inset-bottom)` inline style instead.

### Defensive micro-copy when destination = current view

If somehow the button renders with `currentMode` matching destination (bug state), show:
```
"You are here →"  // grayed, pointer-events-none
```

This should never happen in normal flow since the button is only shown on the CRM page and reads `currentMode` from server-rendered prop. Add a runtime guard:

```typescript
if (currentMode === targetMode) {
  return null // don't render a broken toggle
}
```

---

## 10. Easy/Advanced View-Desync Prevention

### Concrete Merge Strategy

On view-load, the RSC fetches both the DB record AND the user's draft (if one exists):

```typescript
// In CRM Easy page RSC:
async function loadDealWithDraft(dealId: string, userId: string, orgId: string) {
  const [dbRecord, draft] = await Promise.all([
    supabase.from('deals').select('*').eq('id', dealId).single(),
    supabase.from('entity_drafts')
      .select('draft_data, last_modified_at')
      .eq('user_id', userId)
      .eq('entity_type', 'deal')
      .eq('entity_id', dealId)
      .maybeSingle()
  ])
  
  if (!draft.data) return dbRecord.data  // no draft, render DB state
  
  // Overlay draft on DB state (draft wins field-by-field)
  return {
    ...dbRecord.data,
    ...draft.data.draft_data,
    _hasDraft: true,
    _draftModifiedAt: draft.data.last_modified_at
  }
}
```

### Conflict Detection (60-second last-write-wins)

The client island checks `last_modified_at` on load:

```typescript
// If draft.last_modified_at > NOW() - 60s AND draft was written from a different tab
// (detected by sessionStorage tab ID), show conflict banner:
"This draft was edited from another tab"  [Reload]
```

Tab identity: store a random UUID in `sessionStorage` at mount. Include `tab_id` in `entity_drafts.draft_data` JSONB. On load, if stored `tab_id !== current tab_id` AND `last_modified_at > 60s ago`, show banner.

### Integration Test Outline (UX-06)

```typescript
// __tests__/integration/crm/view-desync.test.ts

it('edits in Easy view are visible in Advanced view after switch', async () => {
  // 1. Render Easy view with a deal
  // 2. Simulate user editing deal name (keystroke + 1s debounce)
  // 3. Verify POST to /api/crm/drafts with draft_data.name = new value
  // 4. Render Advanced view (simulate route change)
  // 5. Verify Advanced view query includes draft overlay
  // 6. Assert displayed deal name = edited value
})

it('switching back to Easy view does not lose unsaved draft', async () => {
  // 1. Render Easy view, edit field (draft saved)
  // 2. Click "Advanced view →" (navigate away)
  // 3. Click "Easy view →" (return)
  // 4. Verify draft_data loaded from entity_drafts
  // 5. Assert field shows drafted value, not DB value
})
```

---

## 11. Brand-Voice Template Fallback

### Detection

Read `client_profiles.brand_voice_updated_at` on Easy view RSC load:

```typescript
// In CRM Easy page RSC (alongside other data fetches):
const { data: voiceProfile } = await supabase
  .from('client_profiles')
  .select('brand_voice_updated_at')
  .eq('organization_id', organizationId)
  .maybeSingle()

const hasBrandVoice = Boolean(voiceProfile?.brand_voice_updated_at)
```

`brand_voice_updated_at` is NULL if wizard never run (per migration 31 schema). `brand_voice_prompt` being NULL is the primary signal, but `brand_voice_updated_at` is more efficient to SELECT (single column vs TEXT blob).

Pass `hasBrandVoice: boolean` as a prop to `<ModuleHome>` and down to each `<ActionCard>`.

### Banner UX

When `!hasBrandVoice` AND user is about to trigger an email send action:
- Show inline banner ABOVE the action card (not as a toast — toasts are transient, this needs to be persistent until wizard complete).
- Text: `Complete your brand voice in 30 seconds for personalised outreach →`
- The `→` is a `<Link href="/settings/brand-voice">` 
- Email STILL sends (with generic professional template) — the banner is informational, NOT a blocker.

Generic fallback template (hardcoded in `lib/crm/email-templates.ts`):
```
Subject: Following up with you
Body: "Hi [First Name], I wanted to follow up on our previous conversation..."
```

---

## 12. Risks, Unknowns, and Escape Hatches

### Risk 1: `crm_activities` does not exist in live DB (HIGH PRIORITY)

No migration in `supabase/migrations/` creates `crm_activities`. CONTEXT.md assumes it exists. The planner MUST include a CREATE TABLE migration for `crm_activities` as one of the first migration steps in Plan 11-01.

### Risk 2: Email tracking data source for engagement score

The engagement-score N8N workflow needs email open/click/reply events. Resend provides webhooks for these events, but the current codebase has NO email tracking table. Migration 02 (`email_automation`) has email sending tables but no tracking events table. The planner must either:
- (a) Create `email_tracking_events` table in Plan 11-01 migrations, OR
- (b) Scope engagement score to "manual follow-up flag only" for v3.0, with opens/clicks as v3.1

**Recommendation (b):** Ships faster. N8N `wf-crm-engagement-score.json` scores contacts by `contacts.last_contacted_at` age + manual flag only. The JSONB `score_breakdown` schema is pre-designed to add opens/clicks later without migration.

### Risk 3: `user_profiles` schema not in migrations

`user_profiles` table is referenced in `lib/auth/get-user-org.ts` and provisioning scripts, but there is NO migration file that creates it. It exists in the live DB (provisioning step 01 inserts into it), but the planner has no definitive column list. The `ui_mode` migration must include a `CREATE TABLE IF NOT EXISTS user_profiles` guard:

```sql
-- Guard in migration 38:
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Then:
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ui_mode TEXT;
```

### Risk 4: `deals` table stage enum does NOT match CONTEXT.md

CONTEXT.md phase boundary mentions `discovery/qualification/negotiation/closing` stages.  
Actual DB (`03_crm_tables.sql`): `lead, qualified, proposal, negotiation, won, lost`.  
The stale-threshold defaults MUST use the actual DB enum values (see Section 6 above).

### Risk 5: Floating toggle button z-index conflicts with existing modal z-indices

Current modals use Radix UI Dialog (default `z-50`). The toggle button should be `z-40` so modals render above it. The existing `ToastViewport` uses `z-[100]`. Undo toast must remain above toggle button.

### Risk 6: `deals.assigned_to` for task assignment in Hot Lead "Engage" action

The hot lead "Engage" action creates a "call within 24h" task assigned to `deals.assigned_to`. But there is no `crm_tasks` table in the schema. Planner must create it in Plan 11-01 migrations OR reassign the "task created" to just a `crm_activities` row with `action_type='task_created'` and metadata `{ due_at, assignee_id }`. The latter avoids a new table and uses the existing audit trail pattern.

**Recommendation:** Use `crm_activities` with `action_type='task_created'` and a future `crm_tasks` table when full task management is needed (v3.1).

### Risk 7: Migration index numbering

STATE.md says "next migration index = 36+". Current highest committed migration is `35_drop_legacy_usage.sql`. Plan 11 migrations should start at 36. Confirm against live Supabase DB at plan-execution time.

---

## RESEARCH COMPLETE

`.planning/phases/11-easy-advanced-crm-campaign-decision/11-RESEARCH-PART-A-crm.md`
