---
phase: 12
plan_id: 12-09
title: Floating AI helper + approval_requests table + Telegram inline-keyboard webhook
wave: 4
depends_on: [12-06, 12-07]
files_modified:
  - components/ai-helper/FloatingHelper.tsx
  - components/ai-helper/HelperContextProvider.tsx
  - components/ai-helper/HelperConversation.tsx
  - components/ai-helper/HelperApprovalCard.tsx
  - app/api/ai-helper/conversation/route.ts
  - app/api/ai-helper/propose/route.ts
  - app/api/webhooks/telegram-callback/route.ts
  - lib/agents/helper-agent.ts
  - lib/approvals/approval-service.ts
  - lib/approvals/telegram-approval.ts
  - supabase/migrations/55_approval_requests_table.sql
  - app/(dashboard)/layout.tsx
  - __tests__/lib/approvals/approval-service.test.ts
  - __tests__/api/webhooks/telegram-callback.test.ts
autonomous: false
estimated_loc: 900
estimated_dev_minutes: 360
---

## Objective

Ship the locked CONTEXT.md decision: floating AI helper component on context-aware pages + Telegram inline-keyboard approval flow for owner-mode mobile use. The helper is a small button bottom-right that opens a slide-up sheet; inside, a BaseAgent-backed conversation thread translates the user's natural-language intent into structured proposals, then surfaces them as in-page approval cards. When the user clicks "Send for approval", the proposal goes to the org owner via Telegram with inline Approve/Decline buttons; tapping commits the change via webhook.

This is the architectural keystone for "mobile = Telegram" — the platform stays web/desktop, but owner-operator decisions still ship in real-time to a phone.

Includes human-verify checkpoint at the end.

## must_haves

**Truths:**
- A logged-in user on `/accommodation/rates` (or any page with the helper enabled) sees a small floating button bottom-right.
- Clicking the button opens a sheet with a chat-style input and conversation history.
- User types "drop weekend rate by 15% for next 3 months". Helper agent (BaseAgent subclass) interprets and surfaces a structured proposal card showing the change as a diff (current rate vs proposed) + impact estimate.
- User clicks "Send for approval". Backend creates an `approval_requests` row + sends Telegram message to the org owner with Approve/Decline inline buttons.
- Owner taps Approve in Telegram → webhook fires, proposal committed (the actual rate update happens via existing accommodation API), audit row written, Telegram replies "Approved + committed".
- Owner taps Decline → row marked declined, Telegram replies "Declined; no change made".
- The helper is enabled per-page via `<HelperContextProvider>` wrapping the page. Pages without the provider don't show the helper.
- Per CONTEXT.md, helper is enabled on: brand voice wizard, campaign studio composer, accommodation rates, cost monitoring, empty states. NOT enabled on CRM Easy view (already self-explaining), pure tables/lists, Campaign Studio Autopilot.

**Artifacts:**
- Migration 55 creates `approval_requests` table.
- 4 helper components.
- 2 helper API routes + 1 Telegram webhook route.
- Helper agent extending BaseAgent.
- `approval-service.ts` library (create + commit + decline).
- `telegram-approval.ts` library (send message with inline keyboard).
- Helper enabled on the 5 named pages via wrapping with `<HelperContextProvider>`.

**Key links:**
- BaseAgent reuse — helper agent extends BaseAgent. Brand voice + cost ceiling + Anthropic credit-error wrapping (12-01) all flow through automatically.
- Telegram inline keyboard webhook — must validate Telegram secret per existing pattern in `lib/accommodation/telegram/ops-bot.ts`.
- Approval commit step is per-domain. Don't bake "rate change" into the helper; the proposal carries `{ domain: 'accommodation.rates', payload: {...} }` and `lib/approvals/approval-service.ts` dispatches to the correct handler. New domains add a new handler later.
- Helper context provider injects current entity (e.g. `{ propertyId, page: 'rates' }`) so the agent can ground its proposals.
- The `approval_requests` table has `telegram_message_id` so the webhook can match the button tap back to the row.

## Tasks

<task id="1">
  <title>Migration 55 + approval-service + telegram-approval lib + helper-agent</title>
  <files>
    supabase/migrations/55_approval_requests_table.sql
    lib/approvals/approval-service.ts
    lib/approvals/telegram-approval.ts
    lib/agents/helper-agent.ts
    __tests__/lib/approvals/approval-service.test.ts
  </files>
  <actions>
    1. Migration `55_approval_requests_table.sql`:
       ```sql
       CREATE TABLE IF NOT EXISTS approval_requests (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
         requested_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
         approver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
         domain TEXT NOT NULL,                  -- e.g. 'accommodation.rates', 'campaign.publish'
         proposed_changes JSONB NOT NULL,
         status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined','expired','committed','commit_failed')),
         telegram_message_id TEXT,
         decided_at TIMESTAMPTZ,
         committed_at TIMESTAMPTZ,
         expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         metadata JSONB NOT NULL DEFAULT '{}'
       );
       ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
       ALTER TABLE approval_requests FORCE ROW LEVEL SECURITY;
       CREATE POLICY "org_read" ON approval_requests FOR SELECT TO authenticated USING (organization_id = get_user_org_id());
       CREATE POLICY "service_role_full" ON approval_requests FOR ALL TO service_role USING (true);
       CREATE INDEX idx_approvals_org_status ON approval_requests(organization_id, status, created_at DESC);
       CREATE INDEX idx_approvals_telegram_msg ON approval_requests(telegram_message_id) WHERE telegram_message_id IS NOT NULL;
       ```

    2. `lib/approvals/approval-service.ts`:
       ```typescript
       export async function createApproval(input: { orgId, requestedBy, domain, proposedChanges, approverUserId }): Promise<ApprovalRow>
       export async function commitApproval(approvalId: string): Promise<{ ok: boolean; error?: string }>
       export async function declineApproval(approvalId: string, reason?: string): Promise<void>
       export async function expireOldApprovals(): Promise<number>  // for a periodic sweep cron
       ```
       Domain-dispatch table:
       ```typescript
       const HANDLERS: Record<string, (changes: any) => Promise<void>> = {
         'accommodation.rates': async changes => { /* call existing rates-update API */ },
         'campaign.publish':    async changes => { /* call existing campaign-publish handler */ },
       }
       ```
       For domains without a handler, `commitApproval` returns `{ ok: false, error: 'no_handler' }` and the row stays `commit_failed`.

    3. `lib/approvals/telegram-approval.ts`:
       ```typescript
       export async function sendApprovalToTelegram(approval: ApprovalRow, ownerChatId: string): Promise<{ messageId: string }>
       ```
       Sends a message with inline keyboard:
       - Approve callback_data: `approve:${approval.id}`
       - Decline callback_data: `decline:${approval.id}`
       - "See impact" callback_data: `impact:${approval.id}` (optional)
       Reuses the existing `lib/accommodation/telegram/ops-bot.ts` send primitive but with `reply_markup`.

    4. `lib/agents/helper-agent.ts`:
       ```typescript
       export class HelperAgent extends BaseAgent {
         constructor(orgId: string) { super({ orgId, agentType: 'helper', model: 'haiku-4-5' }) }
         async run(input: { userMessage: string; pageContext: PageContext }) {
           // System prompt: explain helper purpose + page context + brand voice (already injected by base) + tool definitions
           // Tools: { proposeChange(domain, payload), askClarification(question), explainConcept(topic) }
           // Returns structured AgentMessage[] with optional toolCall
         }
       }
       ```
       The agent uses Anthropic tool-use to surface a structured `proposeChange` with domain+payload; the route handler creates the approval_request from that.

    5. Tests in `__tests__/lib/approvals/approval-service.test.ts`:
       - createApproval inserts a row with status='pending'.
       - commitApproval with no handler returns { ok: false, error: 'no_handler' }.
       - commitApproval with stub handler updates status to 'committed' + sets committed_at.
       - declineApproval updates status + decided_at.
       - expireOldApprovals updates rows older than expires_at to status='expired'.
  </actions>
  <verification>
    - Migration 55 applies cleanly.
    - `npm test -- approval-service` passes ≥5 tests.
    - All 3 lib files type-clean.
  </verification>
</task>

<task id="2">
  <title>Build FloatingHelper + HelperContextProvider + HelperConversation + HelperApprovalCard + 2 API routes</title>
  <files>
    components/ai-helper/FloatingHelper.tsx
    components/ai-helper/HelperContextProvider.tsx
    components/ai-helper/HelperConversation.tsx
    components/ai-helper/HelperApprovalCard.tsx
    app/api/ai-helper/conversation/route.ts
    app/api/ai-helper/propose/route.ts
    app/(dashboard)/layout.tsx
  </files>
  <actions>
    1. `components/ai-helper/HelperContextProvider.tsx`:
       ```typescript
       'use client'
       const HelperContext = createContext<PageContext | null>(null)
       export function HelperContextProvider({ context, children }: { context: PageContext; children: React.ReactNode }) {
         return <HelperContext.Provider value={context}>{children}<FloatingHelper /></HelperContext.Provider>
       }
       export const useHelperContext = () => useContext(HelperContext)
       ```
       `PageContext` type: `{ page: string; entity?: { type: string; id: string }; metadata?: Record<string, unknown> }`.

    2. `components/ai-helper/FloatingHelper.tsx`:
       ```typescript
       'use client'
       export function FloatingHelper() {
         const ctx = useHelperContext()
         const [open, setOpen] = useState(false)
         if (!ctx) return null  // helper only renders inside provider
         return (
           <>
             <button className="fixed bottom-6 right-6 ..." onClick={() => setOpen(true)} aria-label="Open AI helper">
               <Sparkles />
             </button>
             {open && <Sheet onClose={() => setOpen(false)}><HelperConversation context={ctx} /></Sheet>}
           </>
         )
       }
       ```

    3. `components/ai-helper/HelperConversation.tsx` — manages message list, sends user input to `/api/ai-helper/conversation`, renders agent responses, surfaces `<HelperApprovalCard />` when the agent returns a proposal.

    4. `components/ai-helper/HelperApprovalCard.tsx`:
       - Renders the proposal as a diff (current vs proposed values) + impact summary.
       - "Send for approval" button → POST `/api/ai-helper/propose` → returns approval row + telegram message status.
       - "Edit" button → returns to conversation with proposal pre-filled for refinement.
       - "Cancel" button → closes the card.

    5. `app/api/ai-helper/conversation/route.ts` (POST):
       - auth via `getUserOrg`.
       - Body: `{ messages: AgentMessage[], pageContext: PageContext }`.
       - Calls `HelperAgent.run({ userMessage, pageContext })`. Returns the agent's structured response.
       - Wraps with cost-ceiling guard via `guardUsage(orgId, 'ai_helper')` (ensure metric exists in usage_events catalog or add it).

    6. `app/api/ai-helper/propose/route.ts` (POST):
       - auth via `getUserOrg`.
       - Body: `{ domain, proposedChanges, approverUserId? }`. If approver not specified, default to org owner (`organization_users.role='admin'` first).
       - Calls `createApproval(...)` then `sendApprovalToTelegram(approval, ownerChatId)`. Stores returned messageId on the row.
       - Returns approval row.

    7. Wrap the 5 helper-enabled pages with `<HelperContextProvider>`:
       - `/settings/brand-voice` — context `{ page: 'brand-voice' }`
       - `/campaigns/new` — context `{ page: 'campaign-composer', entity: { type: 'campaign_draft', id: ... } }`
       - `/accommodation/rates/[propertyId]` — context `{ page: 'accommodation-rates', entity: { type: 'property', id: propertyId } }`
       - `/admin/cost-monitoring` — context `{ page: 'cost-monitoring' }`
       - Empty-state CRM (when contacts.length === 0) — context `{ page: 'crm-empty' }`
       Pages WITHOUT the provider don't show the floating helper.

    8. Do NOT add the provider to `app/(dashboard)/layout.tsx` globally — selective per-page only.

    9. The ONLY edit to `app/(dashboard)/layout.tsx` is adding a portal mount-point div for the FloatingHelper's slide-up sheet so it renders above all page content (z-index above modals/dropdowns). Add inside the layout's root return, just before the closing tag:
       ```tsx
       <div id="ai-helper-portal" />
       ```
       `HelperConversation`/`Sheet` use `createPortal(...)` targeting `document.getElementById('ai-helper-portal')` so the sheet escapes any per-page `overflow:hidden` / stacking-context constraints. No provider, no helper logic — just the portal root. Pages without the provider still render the empty div (harmless — no children, no bytes).
  </actions>
  <verification>
    - `npm run typecheck` clean.
    - Manual: navigate to brand-voice wizard → see floating helper button bottom-right. Open it, type a question, get a response.
    - Manual: navigate to `/dashboard/crm` (Easy view, NOT empty) → no floating helper button (provider not present).
    - `guardUsage(orgId, 'ai_helper')` blocks if cost ceiling hit.
  </verification>
</task>

<task id="3">
  <title>Telegram inline-keyboard webhook handler + tests</title>
  <files>
    app/api/webhooks/telegram-callback/route.ts
    __tests__/api/webhooks/telegram-callback.test.ts
  </files>
  <actions>
    1. `app/api/webhooks/telegram-callback/route.ts` (POST):
       - Validate Telegram secret token header (Telegram bots can be configured to send a `X-Telegram-Bot-Api-Secret-Token` header; verify against env `TELEGRAM_WEBHOOK_SECRET`).
       - Parse update body. Look for `callback_query.data`. Pattern: `{action}:{approvalId}` where action ∈ {approve, decline, impact}.
       - For `approve:{id}`:
         - Fetch the approval row. Check status='pending'. If not, respond "already decided".
         - Set `status='approved'`, `decided_at=NOW()`.
         - Call `commitApproval(id)`.
         - Reply to Telegram chat: "Approved + committed: {summary}" (or commit_failed message).
       - For `decline:{id}`:
         - Set `status='declined'`, `decided_at=NOW()`.
         - Reply: "Declined; no change made".
       - For `impact:{id}`:
         - Run a Haiku call (small) generating a 2-3 sentence impact estimate from the proposed_changes.
         - Reply with the estimate (does NOT change status — the user can still approve/decline).
       - Always answer the callback query (`answerCallbackQuery`) so Telegram clears the loading spinner.

    2. Configure the Telegram bot's webhook URL via the `setWebhook` API (one-shot setup script in `scripts/setup-telegram-webhook.mjs`). Document in plan summary which env vars + URL must be configured.

    3. Tests in `__tests__/api/webhooks/telegram-callback.test.ts`:
       - case: approve callback on pending row → row becomes 'committed' + Telegram reply sent.
       - case: approve on already-approved row → no double-commit; reply "already decided".
       - case: decline callback → row becomes 'declined' + reply.
       - case: invalid secret token → 401.
       - case: unknown approval id → graceful error, no crash.

    Mock telegram fetch + supabase admin in tests.
  </actions>
  <verification>
    - `npm test -- telegram-callback` passes ≥5 tests.
    - Manual: in staging, trigger a real proposal flow, tap Approve in Telegram, confirm row commits + reply received.
  </verification>
</task>

<task id="4" type="checkpoint:human-verify" gate="blocking">
  <what-built>Floating AI helper on 5 named pages + approval flow with Telegram inline-keyboard approval. End-to-end: user types intent on web → helper proposes change → user sends for approval → owner taps Approve in Telegram → change commits.</what-built>
  <how-to-verify>
    1. Log in as `tester-pro@draggonnb.test` (must have accommodation module + Telegram chat_id configured for the owner).
    2. Navigate to /accommodation/rates/[propertyId]. See floating helper button bottom-right.
    3. Open helper, type "drop weekend rate 15% for next 3 months". See agent response with structured proposal card.
    4. Click "Send for approval". Confirm Telegram message arrives at the owner's chat.
    5. From Telegram, tap "Approve". Confirm:
       - Telegram receives a reply ("Approved + committed: weekend rate -15% for 3 months").
       - The actual rates table is updated.
       - approval_requests row is status='committed'.
    6. Navigate to /settings/brand-voice. Confirm helper appears.
    7. Navigate to /dashboard/crm (Easy view, with data). Confirm helper does NOT appear.
    Type "approved" if all 7 pass.
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

## Verification

- All migrations applied.
- All tests pass (`npm test`).
- Helper works on the 5 designated pages.
- Telegram approval round-trip works in staging.
- `lib/agents/CLAUDE.md` updated with HelperAgent documented in the agent registry.

## Out of scope

- Multi-tier approvals (anti-feature per REQUIREMENTS.md OOS list).
- Helper on every page. Selective per CONTEXT.md.
- Voice input for the helper (text only at launch).
- Helper history persistence beyond the current session. Each session starts fresh; conversation is stored in component state only (not in DB).
- N8N workflow for `expireOldApprovals` periodic sweep. Add when first row expires; not blocking launch.

## REQ-IDs closed

None directly. This is the Wave 4 architectural extension captured in CONTEXT.md `<decisions>` block — net-new scope.
