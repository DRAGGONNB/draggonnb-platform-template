---
phase: 12
plan_id: 12-10
title: Site Concierge chatbot (public-facing prospect Q&A + lead qualification)
wave: 4
depends_on: [12-08, 12-09]
files_modified:
  - components/site-concierge/SiteConcierge.tsx
  - components/site-concierge/ConciergeButton.tsx
  - components/site-concierge/ConciergeSheet.tsx
  - app/api/site-concierge/chat/route.ts
  - app/api/leads/capture/route.ts
  - lib/agents/site-concierge-agent.ts
  - lib/site-concierge/intent-classifier.ts
  - app/page.tsx
  - app/pricing/page.tsx
  - __tests__/lib/agents/site-concierge-agent.test.ts
  - __tests__/api/leads/capture.test.ts
autonomous: false
estimated_loc: 600
estimated_dev_minutes: 240
---

## Objective

Replace the multi-step `/qualify` form with a public-facing AI concierge chatbot embedded on the landing + pricing pages. Prospect asks natural-language questions ("how does brand voice work?", "is there a lodge module?", "what's the price for a small cafe?"), the agent answers using docs/modules + REQUIREMENTS.md as grounding, and offers to capture lead details when intent shifts to "I want to talk to someone". Captured leads route through `/api/leads/capture` (existing — extend if needed) which writes to the leads table + sends Telegram alert to Chris.

This is the public-facing twin to Wave 4's logged-in helper. Different agent, different grounding, different surface.

Includes human-verify checkpoint.

## must_haves

**Truths:**
- A logged-out visitor on `/` or `/pricing` sees a concierge button bottom-right (visually distinct from any logged-in helper to avoid confusion).
- Clicking opens a sheet with a chat input. First message from concierge: warm greeting + "I can answer questions about modules, pricing, and onboarding".
- Visitor asks a product question → agent answers using grounded sources (docs/modules/*.md content + pricing data + REQUIREMENTS.md "shipped" reqs only — never claims unshipped features).
- Visitor signals interest ("how do I sign up?", "I want a demo", "contact me") → agent transitions to lead capture: asks for name + email + business type + module of interest. Collects in 4 turns max.
- On completion, POST to `/api/leads/capture` writes a row to the existing `leads` (or `qualification_leads`) table + sends Telegram alert to Chris.
- Concierge is rate-limited per IP to prevent abuse (10 messages / hour / IP).
- Anthropic credit-error wrapping (12-01) flows through — if credits depleted, concierge fails gracefully with "service temporarily unavailable; please email hello@draggonnb.online".

**Artifacts:**
- 3 components in `components/site-concierge/`.
- 2 API routes (`/api/site-concierge/chat` + `/api/leads/capture` — extend existing if it exists).
- `lib/agents/site-concierge-agent.ts` — BaseAgent subclass.
- `lib/site-concierge/intent-classifier.ts` — small helper to detect "lead capture intent" from message history.

**Key links:**
- Site concierge cannot read tenant data — it's public. The agent has NO supabase access in its tool set; only static grounding from docs/modules + pricing constants.
- Lead-capture route writes to existing leads/qualification table (grep `app/api/leads` or `app/qualify` to find the destination).
- Concierge button + helper button must NOT both appear on the same page. Logged-in users on a page wrapped by both contexts only see the in-app helper.
- The agent's grounding prompt must include the 12-02 audit's "Removed" list as anti-claims (e.g. "do NOT mention X feature; it's not shipped").

## Tasks

<task id="1">
  <title>Build site-concierge agent + intent classifier + chat API</title>
  <files>
    lib/agents/site-concierge-agent.ts
    lib/site-concierge/intent-classifier.ts
    app/api/site-concierge/chat/route.ts
    __tests__/lib/agents/site-concierge-agent.test.ts
  </files>
  <actions>
    1. `lib/agents/site-concierge-agent.ts`:
       ```typescript
       export class SiteConciergeAgent extends BaseAgent {
         constructor() {
           super({ orgId: null, agentType: 'site_concierge', model: 'haiku-4-5' })
         }
         buildSystemPrompt() {
           return [
             // System persona
             { type: 'text', text: 'You are the DraggonnB Concierge...', cache_control: { type: 'ephemeral' } },
             // Grounding: docs/modules/*.md content (mirrored to a TS constant — no fs reads at runtime)
             { type: 'text', text: GROUNDING_MODULES_CONTENT, cache_control: { type: 'ephemeral' } },
             // Pricing data
             { type: 'text', text: GROUNDING_PRICING_CONTENT, cache_control: { type: 'ephemeral' } },
             // Anti-claims: things NOT to say (sourced from 12-02 audit)
             { type: 'text', text: ANTI_CLAIMS, cache_control: { type: 'ephemeral' } },
           ]
         }
         async run(input: { messages: AgentMessage[] }) { ... }
       }
       ```
       The agent has a `captureLead` tool and a `clarify` tool. Otherwise free-form Q&A.

       Grounding constants live in `lib/site-concierge/grounding.ts` — hand-mirrored from docs/modules at plan time, with a comment "regenerate if docs/modules changes".

    2. `lib/site-concierge/intent-classifier.ts`:
       ```typescript
       export function detectLeadCaptureIntent(messages: AgentMessage[]): boolean
       export function detectAnswerableQuestion(message: string): { answerable: boolean; topic: string }
       ```
       Lightweight heuristic — no separate Anthropic call; just regex/keyword match. Lead-capture triggers: "sign up", "demo", "contact", "talk to", "pricing for X", "interested".

    3. `app/api/site-concierge/chat/route.ts` (POST):
       - Body: `{ messages: AgentMessage[] }`. No auth.
       - Rate limit: 10 messages / hour / IP. Use a simple in-memory map (acceptable for launch — not multi-instance-safe but ok at single-server scale; replace with Redis at scale).
       - Calls `SiteConciergeAgent.run({ messages })`.
       - If agent returns a `captureLead` toolCall, the response payload includes a `pendingLeadCapture: true` flag for the UI to show the lead-capture form.
       - Catches `AgentCreditError` from BaseAgent → returns `{ error: 'temporarily_unavailable', userMessage: 'Service is temporarily unavailable; please email hello@draggonnb.online' }`.

    4. Tests in `__tests__/lib/agents/site-concierge-agent.test.ts`:
       - case: "what is brand voice" → answer mentions wizard + 5 questions + URL ingest (matches docs/modules/ai-agents-autopilot.md).
       - case: "I want a demo" → response includes `captureLead` toolCall.
       - case: "how do I deploy whatsapp incident intake" → response defers (anti-claim — not shipped).
       - case: rate-limit kicks in after 10 calls from same IP.
       - case: AgentCreditError surfaces user-friendly fallback.
  </actions>
  <verification>
    - `npm test -- site-concierge` passes ≥5 tests.
    - Grounding constants exist and reflect docs/modules content (manually spot-check 2 modules).
    - Intent classifier never throws on edge inputs (empty string, very long string, unicode).
  </verification>
</task>

<task id="2">
  <title>Build SiteConcierge UI components + extend leads/capture API + place on landing/pricing</title>
  <files>
    components/site-concierge/SiteConcierge.tsx
    components/site-concierge/ConciergeButton.tsx
    components/site-concierge/ConciergeSheet.tsx
    app/api/leads/capture/route.ts
    app/page.tsx
    app/pricing/page.tsx
    __tests__/api/leads/capture.test.ts
  </files>
  <actions>
    1. `components/site-concierge/SiteConcierge.tsx`:
       ```typescript
       'use client'
       export function SiteConcierge() {
         const [open, setOpen] = useState(false)
         // Hide if logged in AND a HelperContextProvider is present (avoid double-helper)
         const helperCtx = useContext(HelperContext)
         if (helperCtx) return null
         return (
           <>
             <ConciergeButton onClick={() => setOpen(true)} />
             {open && <ConciergeSheet onClose={() => setOpen(false)} />}
           </>
         )
       }
       ```

    2. `ConciergeButton.tsx` — bottom-right button. Visually distinct from the in-app helper (different icon + brand-charcoal color, vs the helper's brand-crimson).

    3. `ConciergeSheet.tsx` — chat surface:
       - Greeting message hardcoded as first system message.
       - User input + agent response loop hitting `/api/site-concierge/chat`.
       - When response has `pendingLeadCapture: true`, transition to a 4-field form (name, email, business_type, module_of_interest). Submit POSTs to `/api/leads/capture`.
       - On successful capture, agent says "Got it — Chris will be in touch shortly. Anything else I can answer?".

    4. `app/api/leads/capture/route.ts` — extend if exists, create if not:
       - Body: `{ name, email, businessType, moduleOfInterest, source: 'site-concierge', conversationId? }`.
       - Validate via Zod.
       - Insert into `qualification_leads` (or `leads` — find via grep). Add `source = 'site-concierge'` to differentiate from the existing form-based `/qualify` leads.
       - Send Telegram alert to Chris with name + email + business type + module of interest + a 1-sentence summary of the conversation if available.
       - Return `{ ok: true, leadId }`.

    5. Place `<SiteConcierge />` on:
       - `app/page.tsx` (landing) — at the top level, outside other layout chrome.
       - `app/pricing/page.tsx` — same.
       - NOT on `/qualify` — the existing form coexists as a fallback for users who don't want the chatbot.
       - NOT on `/login`, `/signup`, `/checkout` — too late in the funnel; these have their own flow.

    6. Tests in `__tests__/api/leads/capture.test.ts`:
       - case: valid payload → row inserted, Telegram alert mocked-called.
       - case: invalid email → 400.
       - case: missing required field → 400.
       - case: source defaults to 'site-concierge' if not provided (or rejected — pick whichever is chosen).
  </actions>
  <verification>
    - `npm run build` clean.
    - Manual: open `/` in incognito → see concierge button. Open it. Have a brief conversation. Express interest. Get the lead-capture form. Submit. Confirm Telegram alert received + row in DB.
    - Log in as `tester-pro@draggonnb.test` → on `/dashboard` (which has no concierge wrapper but the helper IS there — separate flow): no concierge button.
    - On `/pricing` while logged out → concierge button visible.
  </verification>
</task>

<task id="3" type="checkpoint:human-verify" gate="blocking">
  <what-built>Site concierge chatbot on landing + pricing for logged-out prospects. Answers product questions using grounded sources, captures leads when intent shifts, posts to existing leads pipeline.</what-built>
  <how-to-verify>
    1. Open `/` in incognito (logged out). See concierge button bottom-right.
    2. Click it. See greeting message.
    3. Ask: "what modules do you have for restaurants?". Confirm answer references restaurant module + features from docs/modules/restaurant.md.
    4. Ask: "how much does it cost for a small lodge?". Confirm answer references Core + Accommodation pricing.
    5. Ask: "I want a demo". Confirm agent transitions to lead-capture (form appears OR concierge asks for name/email).
    6. Submit name + email + business type + module. Confirm:
       - Telegram alert arrives at Chris's chat.
       - Row created in qualification_leads (or leads) with source='site-concierge'.
    7. Visit `/pricing` (still logged out). Concierge button still visible.
    8. Log in. Navigate to `/dashboard/crm`. Confirm NO concierge button (logged-in users only see in-app helpers where enabled).
    Type "approved" if all 8 pass.
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

## Verification

- `npm run build` clean.
- `npm test` clean.
- Manual concierge round-trip (Q&A + lead capture) works in staging.
- Cost ceiling: a 10-message session at Haiku rates costs ~R0.5; verify via `ai_usage_ledger` after a test session.

## Out of scope

- Replacing the existing `/qualify` page. Concierge supplements, doesn't replace. `/qualify` stays for users who prefer forms.
- Voice input. Text only.
- Multi-language. English only.
- Persistent conversation history across visits. Each visit starts fresh.
- A/B testing concierge vs no-concierge. Launch with concierge on; measure with Vercel Analytics.

## REQ-IDs closed

None directly. Site concierge was a Wave 4 backlog candidate captured in CONTEXT.md `<domain>` section D — net-new scope.
