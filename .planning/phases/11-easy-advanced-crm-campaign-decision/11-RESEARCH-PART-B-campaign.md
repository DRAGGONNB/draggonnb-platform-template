# Phase 11 Research Part B — Campaign Studio (CAMP-01..08)

**Researcher:** Claude Code (Researcher B)
**Date:** 2026-04-27
**Scope:** CAMP-01..08 only. CRM Easy/Advanced UX-01..07 is Researcher A's domain.

---

## 1. SMS Gateway Recommendation

### Ranked Comparison (SA Market)

| Provider | ZAR per SMS (est.) | API Style | Free Sandbox | Delivery Receipts | Opt-Out / RICA/POPIA |
|---|---|---|---|---|---|
| **BulkSMS** | R0.18–R0.25 (local SA) | REST + SMPP | Yes (test credits) | Yes (webhook DLR) | Built-in STOP/OPTOUT handling; POPIA-aware opt-out list |
| **SMS Portal** | R0.19–R0.28 | REST | Yes (10 free credits) | Yes (push DLR + pull) | Manual opt-out management; POPIA guidance docs |
| **Clickatell** | R0.22–R0.35 | REST (One API) | Yes (sandbox env) | Yes (webhook DLR) | Channel-level opt-out; global routing may exit SA SMSC |
| **Twilio** | R0.45–R0.80 (USD billed) | REST | Yes | Yes | Global opt-out, POPIA gap — US company, DPA not SA-native |

### Recommendation: BulkSMS

**Rationale:** BulkSMS is SA-headquartered (Cape Town), routes via direct SA SMSC (Vodacom, MTN, Cell C, Telkom), charges in ZAR, has a clean REST API with JSON payloads, returns synchronous delivery receipts, and provides a POPIA-compliant opt-out list per sender ID. Cheapest per-message at scale. Clickatell is viable fallback if BulkSMS is unavailable; Twilio adds FX risk.

**BulkSMS API basics:**
- `POST https://api.bulksms.com/v1/messages`
- Auth: Basic auth with API token ID + secret (env: `BULKSMS_TOKEN_ID`, `BULKSMS_TOKEN_SECRET`)
- Body: `{ "to": "+2782xxxxxxx", "body": "text", "from": "DraggonnB" }`
- Delivery receipt webhook: configure in BulkSMS console → POST to `/api/campaigns/sms-dlr`

---

## 2. Campaign Data Model

### Multi-Step Migration Plan (OPS-05)

Migration index starts at 36. Split into 4 migrations, each single-purpose.

**Migration 36 — `campaigns` table (nullable, no FK constraints yet):**

```sql
-- 36_campaigns_table.sql
CREATE TYPE campaign_status AS ENUM ('draft', 'pending_review', 'scheduled', 'running', 'completed', 'failed', 'killed');
CREATE TYPE campaign_channel AS ENUM ('email', 'sms', 'facebook', 'instagram', 'linkedin');

CREATE TABLE campaigns (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                TEXT         NOT NULL,
  intent              TEXT         NOT NULL,  -- user's raw input ("promote Sunday brunch")
  status              campaign_status NOT NULL DEFAULT 'draft',
  -- scheduling
  scheduled_at        TIMESTAMPTZ,
  channels            campaign_channel[] NOT NULL DEFAULT '{}',
  -- 30-day enforcement (CAMP-08)
  force_review        BOOLEAN      NOT NULL DEFAULT false,
  -- audit
  created_by          UUID,        -- auth.users(id), nullable initially (OPS-05 step 1)
  approved_by         UUID,
  approved_at         TIMESTAMPTZ,
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;

CREATE INDEX idx_campaigns_org ON campaigns(organization_id);
CREATE INDEX idx_campaigns_org_status ON campaigns(organization_id, status);
CREATE INDEX idx_campaigns_scheduled ON campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;
```

**Migration 37 — `campaign_drafts` (per-channel draft content):**

```sql
-- 37_campaign_drafts_table.sql
CREATE TABLE campaign_drafts (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID          NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id  UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel          campaign_channel NOT NULL,
  -- content
  subject          TEXT,         -- email subject
  body_html        TEXT,         -- email HTML or post caption
  body_text        TEXT,         -- plain text / SMS body
  media_urls       TEXT[]        DEFAULT '{}',
  -- safety
  brand_safe       BOOLEAN,      -- null = not yet checked; true/false = Haiku result
  safety_flags     TEXT[]        DEFAULT '{}',  -- list of flag reasons from CAMP-07
  -- state
  is_approved      BOOLEAN       NOT NULL DEFAULT false,
  approved_at      TIMESTAMPTZ,
  regeneration_count INTEGER     NOT NULL DEFAULT 0,
  -- AI generation metadata
  agent_session_id UUID,         -- references agent_sessions(id)
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE campaign_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_drafts FORCE ROW LEVEL SECURITY;

CREATE INDEX idx_campaign_drafts_campaign ON campaign_drafts(campaign_id);
CREATE INDEX idx_campaign_drafts_org ON campaign_drafts(organization_id);
CREATE UNIQUE INDEX idx_campaign_drafts_unique_channel ON campaign_drafts(campaign_id, channel);
```

**Migration 38 — `campaign_runs` + `campaign_run_items`:**

```sql
-- 38_campaign_runs_tables.sql
CREATE TYPE run_status AS ENUM ('pending', 'executing', 'completed', 'failed', 'killed');
CREATE TYPE run_item_status AS ENUM ('pending', 'sent', 'failed', 'skipped', 'verified');

CREATE TABLE campaign_runs (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id   UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status            run_status   NOT NULL DEFAULT 'pending',
  -- pg_cron job reference
  cron_job_name     TEXT UNIQUE, -- format: 'campaign_run_{id}' used for cron.unschedule()
  -- timing
  scheduled_at      TIMESTAMPTZ,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  -- summary
  items_total       INTEGER      DEFAULT 0,
  items_sent        INTEGER      DEFAULT 0,
  items_failed      INTEGER      DEFAULT 0,
  error_message     TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE campaign_run_items (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id           UUID          NOT NULL REFERENCES campaign_runs(id) ON DELETE CASCADE,
  campaign_draft_id UUID         NOT NULL REFERENCES campaign_drafts(id),
  channel          campaign_channel NOT NULL,
  status           run_item_status NOT NULL DEFAULT 'pending',
  -- delivery details
  recipient_ref    TEXT,         -- email address, phone number, page_id
  provider_message_id TEXT,      -- Resend email ID, BulkSMS batch ID, FB post ID, etc.
  published_url    TEXT,         -- CAMP-05: URL of published post (social) or null (email/sms)
  -- timing
  sent_at          TIMESTAMPTZ,
  verified_at      TIMESTAMPTZ,
  -- errors
  error_code       TEXT,
  error_message    TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE campaign_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE campaign_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_run_items FORCE ROW LEVEL SECURITY;

CREATE INDEX idx_campaign_runs_org ON campaign_runs(organization_id);
CREATE INDEX idx_campaign_runs_campaign ON campaign_runs(campaign_id);
CREATE INDEX idx_campaign_run_items_run ON campaign_run_items(run_id);
```

**Migration 39 — RLS policies (separate from DDL, OPS-05):**

```sql
-- 39_campaign_rls_policies.sql
-- campaigns
CREATE POLICY campaigns_org_read ON campaigns
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY campaigns_org_write ON campaigns
  FOR ALL USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY campaigns_service_role ON campaigns
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- campaign_drafts
CREATE POLICY campaign_drafts_org_read ON campaign_drafts
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY campaign_drafts_org_write ON campaign_drafts
  FOR ALL USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY campaign_drafts_service_role ON campaign_drafts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- campaign_runs
CREATE POLICY campaign_runs_org_read ON campaign_runs
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY campaign_runs_service_role ON campaign_runs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- campaign_run_items (service_role only — users read via run join)
CREATE POLICY campaign_run_items_service_role ON campaign_run_items
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

**Kill switch storage:** Store in `tenant_modules.config` JSONB for the `campaigns` module row. Key: `campaigns.kill_switch_active` (boolean). No new table needed — it's the right location since kill switch is per-module per-tenant. Admin RPC updates it. Details in section 7.

---

## 3. Channel Adapter Pattern

### Base interface — `lib/campaigns/adapters/types.ts`

```typescript
export type ChannelId = 'email' | 'sms' | 'facebook' | 'instagram' | 'linkedin'

export interface SendResult {
  success: boolean
  providerMessageId?: string
  publishedUrl?: string   // social channels return post URL after publish
  error?: string
  errorCode?: string
}

export interface VerifyResult {
  found: boolean
  publishedUrl?: string
  error?: string
}

export interface ChannelAdapter {
  channelId: ChannelId
  /** Returns true when this channel can actually send (not just draft) */
  enabled(): boolean
  /** Send a single draft to the channel. Returns providerMessageId. */
  send(draft: CampaignDraftPayload): Promise<SendResult>
  /** Post-publish verify: fetch the posted item and confirm it exists. */
  verify(providerMessageId: string, orgId: string): Promise<VerifyResult>
}

export interface CampaignDraftPayload {
  bodyText: string
  bodyHtml?: string    // email only
  subject?: string     // email only
  mediaUrls?: string[]
  recipientRef?: string  // email address or phone number
  organizationId: string
}
```

### File structure

```
lib/campaigns/
  adapters/
    types.ts          -- ChannelAdapter interface, CampaignDraftPayload, SendResult
    email.ts          -- EmailAdapter (Resend)
    sms.ts            -- SmsAdapter (BulkSMS)
    facebook.ts       -- FacebookAdapter (credential-gated)
    instagram.ts      -- InstagramAdapter (credential-gated)
    linkedin.ts       -- LinkedInAdapter (credential-gated)
    index.ts          -- getAdapter(channelId, orgId) factory
  agent/
    campaign-drafter.ts      -- CampaignDrafterAgent extends BaseAgent
    brand-safety-checker.ts  -- BrandSafetyAgent extends BaseAgent
  scheduler.ts        -- pg_cron scheduling helpers
  kill-switch.ts      -- per-tenant kill switch read/write
```

### EmailAdapter (Resend)

```typescript
// lib/campaigns/adapters/email.ts
import { sendEmail } from '@/lib/email/resend'
import type { ChannelAdapter, CampaignDraftPayload, SendResult, VerifyResult } from './types'

export class EmailAdapter implements ChannelAdapter {
  channelId = 'email' as const

  enabled(): boolean {
    return !!process.env.RESEND_API_KEY
  }

  async send(draft: CampaignDraftPayload): Promise<SendResult> {
    const result = await sendEmail({
      to: draft.recipientRef!,
      subject: draft.subject ?? '(No subject)',
      html: draft.bodyHtml ?? draft.bodyText,
      text: draft.bodyText,
    })
    return {
      success: result.success,
      providerMessageId: result.messageId,
      error: result.error,
    }
  }

  async verify(providerMessageId: string): Promise<VerifyResult> {
    // Resend: GET /emails/{id} returns delivery status
    // Treat "delivered" or "opened" as verified; "bounced"/"failed" as not found
    const resp = await fetch(`https://api.resend.com/emails/${providerMessageId}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    })
    if (!resp.ok) return { found: false, error: `Resend API ${resp.status}` }
    const data = await resp.json() as { last_event: string }
    const verified = ['delivered', 'opened', 'clicked'].includes(data.last_event)
    return { found: verified }
  }
}
```

### SmsAdapter (BulkSMS)

```typescript
// lib/campaigns/adapters/sms.ts
import type { ChannelAdapter, CampaignDraftPayload, SendResult, VerifyResult } from './types'

export class SmsAdapter implements ChannelAdapter {
  channelId = 'sms' as const

  enabled(): boolean {
    return !!(process.env.BULKSMS_TOKEN_ID && process.env.BULKSMS_TOKEN_SECRET)
  }

  async send(draft: CampaignDraftPayload): Promise<SendResult> {
    const credentials = Buffer.from(
      `${process.env.BULKSMS_TOKEN_ID}:${process.env.BULKSMS_TOKEN_SECRET}`
    ).toString('base64')

    const resp = await fetch('https://api.bulksms.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: draft.recipientRef,
        body: draft.bodyText,
        from: process.env.BULKSMS_SENDER_ID ?? 'DraggonnB',
      }),
    })
    const data = await resp.json() as Array<{ id: string; status: { type: string } }>
    const msg = data[0]
    if (!resp.ok || !msg) return { success: false, error: `BulkSMS ${resp.status}` }
    return { success: true, providerMessageId: msg.id }
  }

  async verify(providerMessageId: string): Promise<VerifyResult> {
    // BulkSMS: GET /v1/messages/{id}
    const credentials = Buffer.from(
      `${process.env.BULKSMS_TOKEN_ID}:${process.env.BULKSMS_TOKEN_SECRET}`
    ).toString('base64')
    const resp = await fetch(`https://api.bulksms.com/v1/messages/${providerMessageId}`, {
      headers: { Authorization: `Basic ${credentials}` },
    })
    if (!resp.ok) return { found: false }
    const data = await resp.json() as { status: { type: string } }
    return { found: data.status?.type === 'DELIVERED' }
  }
}
```

### Social adapters (credential-gated, mocked)

```typescript
// lib/campaigns/adapters/facebook.ts
import type { ChannelAdapter, CampaignDraftPayload, SendResult, VerifyResult } from './types'

export class FacebookAdapter implements ChannelAdapter {
  channelId = 'facebook' as const

  enabled(): boolean {
    return !!process.env.META_APP_ID
  }

  async send(draft: CampaignDraftPayload): Promise<SendResult> {
    if (!this.enabled()) {
      return { success: false, error: 'Facebook not connected. Set META_APP_ID to enable.' }
    }
    // Real implementation: POST /{page_id}/feed with page_access_token from social_accounts
    // For now: throw; gating in API route prevents reaching here when disabled
    throw new Error('FacebookAdapter.send: not yet implemented (credential-gated)')
  }

  async verify(providerMessageId: string, orgId: string): Promise<VerifyResult> {
    if (!this.enabled()) return { found: false, error: 'Facebook not connected' }
    // GET /{post_id}?fields=id,permalink_url&access_token=...
    throw new Error('FacebookAdapter.verify: not yet implemented')
  }
}
// InstagramAdapter and LinkedInAdapter follow identical structure
// LinkedIn: enabled() = !!process.env.LINKEDIN_CLIENT_ID
```

### Adapter factory

```typescript
// lib/campaigns/adapters/index.ts
import { EmailAdapter } from './email'
import { SmsAdapter } from './sms'
import { FacebookAdapter } from './facebook'
import { InstagramAdapter } from './instagram'
import { LinkedInAdapter } from './linkedin'
import type { ChannelAdapter, ChannelId } from './types'

const ADAPTERS: Record<ChannelId, ChannelAdapter> = {
  email: new EmailAdapter(),
  sms: new SmsAdapter(),
  facebook: new FacebookAdapter(),
  instagram: new InstagramAdapter(),
  linkedin: new LinkedInAdapter(),
}

export function getAdapter(channelId: ChannelId): ChannelAdapter {
  return ADAPTERS[channelId]
}

export function getEnabledChannels(): ChannelId[] {
  return (Object.keys(ADAPTERS) as ChannelId[]).filter(id => ADAPTERS[id].enabled())
}
```

### Mock/test pattern

For tests, replace the factory with jest `vi.mock()`:

```typescript
vi.mock('@/lib/campaigns/adapters', () => ({
  getAdapter: (channelId: string) => ({
    channelId,
    enabled: () => true,
    send: vi.fn().mockResolvedValue({ success: true, providerMessageId: 'mock-id-123' }),
    verify: vi.fn().mockResolvedValue({ found: true, publishedUrl: 'https://mock.url/post/123' }),
  }),
}))
```

---

## 4. Credential Gating Runtime Check

### API route guard pattern

In `app/api/campaigns/[id]/publish/route.ts`:

```typescript
import { getAdapter } from '@/lib/campaigns/adapters'

const adapter = getAdapter(channel)
if (!adapter.enabled()) {
  return Response.json(
    { error: `Channel '${channel}' is not connected. Configure credentials to enable.` },
    { status: 422 }
  )
}
```

### UI greyed-out channel pattern (RSC-safe)

In the campaign studio channel selector component:

```typescript
// app/(dashboard)/campaigns/studio/[id]/_components/ChannelSelector.tsx
// Pass enabled state from server via props (RSC fetches env presence server-side)
interface ChannelOption {
  id: ChannelId
  label: string
  enabled: boolean
  ctaText?: string  // shown when disabled
}

// Server component (page.tsx) builds the list:
const channels: ChannelOption[] = [
  { id: 'email', label: 'Email', enabled: !!process.env.RESEND_API_KEY },
  { id: 'sms', label: 'SMS', enabled: !!(process.env.BULKSMS_TOKEN_ID) },
  { id: 'facebook', label: 'Facebook', enabled: !!process.env.META_APP_ID,
    ctaText: 'Connect Facebook to enable' },
  { id: 'instagram', label: 'Instagram', enabled: !!process.env.META_APP_ID,
    ctaText: 'Connect Instagram to enable' },
  { id: 'linkedin', label: 'LinkedIn', enabled: !!process.env.LINKEDIN_CLIENT_ID,
    ctaText: 'Connect LinkedIn to enable' },
]
```

Disabled channel tiles render with `opacity-40 cursor-not-allowed` and the `ctaText` as an inline badge. Clicking a disabled tile opens an inline drawer (shadcn `Sheet`) with "The studio is there, social channels activate when Meta approves your account."

---

## 5. pg_cron + pg_net Scheduling

### CAMP-03: schedule a campaign run

```sql
-- Called from /api/campaigns/[runId]/schedule after user approves
-- HMAC-signed payload to prevent unauthorized execution
SELECT cron.schedule(
  'campaign_run_' || run_id::text,                    -- job name (also stored in campaign_runs.cron_job_name)
  'at ' || to_char(scheduled_at AT TIME ZONE 'UTC', 'MI HH24 DD MM') || ' *',  -- one-time cron expression
  format(
    $$ SELECT net.http_post(
      url := %L,
      headers := '{"Content-Type":"application/json","x-internal-hmac":"%s"}'::jsonb,
      body := ('{"run_id":"%s"}')::jsonb
    ) $$,
    current_setting('app.base_url') || '/api/campaigns/execute',
    encode(hmac(run_id::text, current_setting('app.internal_secret'), 'sha256'), 'hex'),
    run_id
  )
);
```

**Notes:**
- `app.base_url` and `app.internal_secret` are Supabase DB secrets set via `ALTER DATABASE SET`.
- The HMAC check in `app/api/campaigns/execute/route.ts` verifies `x-internal-hmac` before processing.
- pg_net returns the call to Vercel asynchronously; the cron job itself exits immediately.
- Store `cron_job_name = 'campaign_run_' || run_id::text` in `campaign_runs` at schedule time.

### One-time vs recurring

v3.0 campaigns are **one-time only** (send once at scheduled_at). Recurring is deferred to v3.1. One-time cron expressions use a specific minute/hour/day/month.

### Kill switch cancellation

```sql
-- RPC: cancel_org_campaign_runs(org_id UUID)
CREATE OR REPLACE FUNCTION cancel_org_campaign_runs(p_org_id UUID)
RETURNS INTEGER  -- count of jobs cancelled
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  job_name TEXT;
  cancelled INTEGER := 0;
BEGIN
  FOR job_name IN
    SELECT cron_job_name FROM campaign_runs
     WHERE organization_id = p_org_id
       AND status IN ('pending', 'executing')
       AND cron_job_name IS NOT NULL
  LOOP
    PERFORM cron.unschedule(job_name);
    cancelled := cancelled + 1;
  END LOOP;

  UPDATE campaign_runs
     SET status = 'killed', completed_at = now()
   WHERE organization_id = p_org_id
     AND status IN ('pending', 'executing');

  RETURN cancelled;
END;
$$;
```

---

## 6. Post-Publish Verification (CAMP-05)

### Per-channel strategy

| Channel | Verification approach | Data stored |
|---|---|---|
| Email | Resend `GET /emails/{id}` — check `last_event` in `['delivered','opened','clicked']` | `provider_message_id` = Resend email ID |
| SMS | BulkSMS `GET /v1/messages/{id}` — check `status.type == 'DELIVERED'` | `provider_message_id` = BulkSMS message ID |
| Facebook | Graph API `GET /{post_id}?fields=id,permalink_url` with page_access_token | `published_url` = permalink_url |
| Instagram | Graph API `GET /{media_id}?fields=id,permalink` | `published_url` = permalink |
| LinkedIn | LinkedIn API `GET /ugcPosts/{id}` — check `lifecycleState = PUBLISHED` | `published_url` = constructed from id |

### Timing

Verification runs as a **follow-up step** 5 minutes after `campaign_run_items.sent_at` via a separate pg_cron job scheduled at send time:

```sql
SELECT cron.schedule(
  'verify_run_' || run_id::text,
  'at ' || to_char((now() + INTERVAL '5 minutes') AT TIME ZONE 'UTC', 'MI HH24 DD MM') || ' *',
  format($$ SELECT net.http_post(url := %L, body := ('{"run_id":"%s"}')::jsonb) $$,
    current_setting('app.base_url') || '/api/campaigns/verify', run_id)
);
```

`/api/campaigns/verify` iterates `campaign_run_items` for the run, calls `adapter.verify()` per item, updates `verified_at`, `published_url`, and sets `status = 'verified'` or `'failed'`.

### Where URLs land

`campaign_run_items.published_url TEXT` — nullable, set only after verify succeeds. The Campaign Run Detail page queries this column and renders channel-specific "View live post" links.

---

## 7. Per-Tenant Kill Switch (CAMP-06)

### DB storage

Store in `tenant_modules.config` JSONB for the `campaigns` module row:

```json
{ "kill_switch_active": true, "kill_switch_activated_at": "2026-04-27T10:00:00Z", "kill_switch_reason": "Client request" }
```

**Why not a new table:** tenant_modules already has one row per org per module with a config JSONB. Adding a column here avoids a new table and a new migration for what is logically module configuration.

**Read pattern in API routes:**

```typescript
const { data: mod } = await supabase
  .from('tenant_modules')
  .select('config')
  .eq('organization_id', orgId)
  .eq('module_id', 'campaigns')
  .single()

const killSwitchActive = (mod?.config as { kill_switch_active?: boolean })?.kill_switch_active ?? false
if (killSwitchActive) {
  return Response.json({ error: 'Campaign sends are paused for this account.' }, { status: 423 })
}
```

### Admin UI route

`/admin/clients/[id]/campaigns/kill-switch` — protected by `platform_admin` role check.

Page content:
- Current status badge (Active / Paused)
- "Emergency Stop All Campaigns" red button
- Confirmation dialog: "This will cancel all scheduled sends for [org name] immediately. Continue?"
- On confirm: calls `/api/admin/campaigns/kill-switch` (POST) with `{ orgId, active: true, reason }`
- Re-enable: same page, green "Resume Campaigns" button

### Kill switch API route

`app/api/admin/campaigns/kill-switch/route.ts` (POST):

```typescript
// 1. Verify caller is platform_admin
// 2. UPDATE tenant_modules SET config = config || '{"kill_switch_active": true, ...}' WHERE org + module = campaigns
// 3. Call cancel_org_campaign_runs(orgId) RPC
// 4. Send Telegram alert (section 12c)
// 5. Return { cancelled: N }
```

---

## 8. Brand-Safety Haiku Check (CAMP-07)

### Agent class — `lib/campaigns/agent/brand-safety-checker.ts`

```typescript
import { BaseAgent } from '@/lib/agents/base-agent'
import type { AgentConfig } from '@/lib/agents/types'

export interface SafetyFlagResult {
  safe: boolean
  flags: Array<{
    type: 'off_brand' | 'insensitive' | 'time_inappropriate' | 'forbidden_topic'
    reason: string
    excerpt: string
  }>
  recommendation: 'approve' | 'revise' | 'reject'
}

const BRAND_SAFETY_CONFIG: AgentConfig = {
  agentType: 'campaign_brand_safety',  // add to AgentType union in types.ts
  model: 'claude-haiku-4-5-20251001',  // always Haiku — cost-controlled
  maxTokens: 512,
  temperature: 0,  // deterministic safety decisions
  systemPrompt: `You are a brand safety reviewer for an SME marketing platform operating in South Africa.
Your job: evaluate marketing copy for BRAND SAFETY violations only.

Check for:
1. OFF_BRAND: Copy contradicts the brand's stated values, tone, or forbidden topics
2. INSENSITIVE: References events, groups, or situations likely to cause offence in SA context
3. TIME_INAPPROPRIATE: Festive/celebratory content during active public mourning or national tragedy
4. FORBIDDEN_TOPIC: Explicitly listed forbidden topics appear in the draft

Output ONLY valid JSON matching this schema:
{
  "safe": boolean,
  "flags": [{ "type": "off_brand|insensitive|time_inappropriate|forbidden_topic", "reason": "...", "excerpt": "..." }],
  "recommendation": "approve|revise|reject"
}

"approve" = safe=true and no flags
"revise" = 1-2 minor flags, fixable
"reject" = content fundamentally inappropriate`
}

export class BrandSafetyAgent extends BaseAgent {
  constructor() {
    super(BRAND_SAFETY_CONFIG)
  }

  protected parseResponse(response: string): SafetyFlagResult {
    // Strip markdown fences if present
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(cleaned) as SafetyFlagResult
  }
}
```

### Rate budget

- Budget: **20 safety checks per tenant per day** (stored in `ai_usage_ledger`; query `agent_type = 'campaign_brand_safety'` for today's count before calling).
- Cost at Haiku pricing (~R0.002 per 1K input tokens, R0.01 per 1K output): ~R0.01 per check. 20/day = R0.20/day per tenant.
- Implementation: check count in API route before instantiating agent; return `{ error: 'Brand safety check limit reached for today' }` with status 429.

### Trigger

Called from `POST /api/campaigns/[id]/drafts/[draftId]/check-safety` after user saves draft content. Not called on every keystroke — triggered explicitly or before approval.

### UI surface

`campaign_drafts.brand_safe` column:
- `null` = not yet checked → show "Check brand safety" button
- `true` = passes → green badge "Brand safe"
- `false` = flagged → amber/red badge "Review flags" → click to expand `safety_flags[]` in the approval screen

---

## 9. First-30-Days Draft-Then-Review Enforcement (CAMP-08)

### Computation

```typescript
// lib/campaigns/enforcement.ts
export async function isInNewTenantPeriod(orgId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('organizations')
    .select('activated_at')
    .eq('id', orgId)
    .single()

  if (!data?.activated_at) return true  // no activation date = treat as new

  const activatedAt = new Date(data.activated_at as string)
  const daysSince = (Date.now() - activatedAt.getTime()) / (1000 * 60 * 60 * 24)
  return daysSince < 30
}
```

### Enforcement points

**API route guard** (primary enforcement — `app/api/campaigns/[id]/schedule/route.ts`):

```typescript
const inNewTenantPeriod = await isInNewTenantPeriod(orgId)
if (inNewTenantPeriod && !campaign.force_review) {
  // Coerce to draft-then-review mode regardless of request body
  scheduleMode = 'pending_review'
}
```

**UI hint** (secondary): when `inNewTenantPeriod = true`, the campaign publish button reads "Submit for Review" instead of "Schedule". A persistent amber banner appears in the Campaign Studio header: "Your account is in the guided period (first 30 days). All campaigns require review before sending."

**Override path for trusted tenants:** `platform_admin` can set `campaigns.force_review = true` on the tenant row (via admin UI at `/admin/clients/[id]/campaigns`), which signals "bypass 30-day restriction for this tenant." The `campaigns` table has `force_review BOOLEAN DEFAULT false` — when set to true by admin, the 30-day gate is skipped for that org.

The column name is admittedly counter-intuitive: `force_review = true` means admin has explicitly overridden the restriction. Consider naming it `skip_new_tenant_gate` in planning for clarity.

---

## 10. Brand Voice Integration

### How Campaign Studio invokes brand-voice-aware BaseAgent

Phase 10 already wired brand voice into BaseAgent. The `CampaignDrafterAgent` (extending BaseAgent) gets brand voice **automatically** — no additional code required.

**Call site confirmation:** `BaseAgent.run()` at line 263 in `lib/agents/base-agent.ts`:

```typescript
const brandVoice = orgId ? await this.loadBrandVoice(orgId) : null
const systemBlocks = buildSystemBlocks(orgId ?? 'unknown', agentInstructions, brandVoice)
```

`loadBrandVoice()` fetches `client_profiles.brand_voice_prompt` for the org. If the wizard has not been run (NULL), brand voice block is omitted silently. The `CampaignDrafterAgent` only needs to pass `organizationId` in `AgentRunOptions` — the rest is automatic.

**CampaignDrafterAgent system prompt** should be campaign-drafting specific instructions only (channels, format, tone guidelines). It does NOT need to duplicate brand voice — that arrives via Block 2 automatically.

**Fallback when brand_voice_prompt is NULL:** Draft generation still runs using agent instructions only. UI shows banner: "Complete your brand voice setup for more personalised campaigns."

---

## 11. Campaign Studio UI Shape

### Pages and file structure

```
app/(dashboard)/campaigns/
  page.tsx                      -- Campaign list (RSC) — shadcn Table, status badges
  new/page.tsx                  -- Intent entry (RSC shell + client island)
  studio/[id]/
    page.tsx                    -- Studio composer (RSC fetches campaign + drafts)
    _components/
      IntentForm.tsx            -- Client island: intent text input + "Generate drafts" button
      ChannelSelector.tsx       -- Client island: channel pill selector (disabled = greyed)
      DraftCard.tsx             -- Client island: per-channel draft card + inline edit + regenerate
      BrandSafetyBadge.tsx      -- Client: shows null/true/false safety state
    approval/page.tsx           -- Approval screen (RSC shell + client island)
    _components/
      ApprovalList.tsx          -- Client: list of drafts with approve/edit/regenerate per item
      PublishConfirmModal.tsx   -- Client: shadcn Dialog with channel icons + account name preview
  runs/
    page.tsx                    -- Campaign runs list (RSC)
    [runId]/page.tsx            -- Run detail (RSC): per-item status, verified URLs, errors
  admin/
    kill-switch/page.tsx        -- Platform admin only: kill switch toggle (RSC + server action)
```

### RSC vs client islands

- **RSC:** all data-fetching pages (list, run detail). Fetch from Supabase directly.
- **Client islands:** anything with user interaction (intent form, inline draft editing, approval actions, channel selector). Use `'use client'` directive.
- **Server Actions:** approve campaign (`/app/actions/campaigns.ts`), regenerate draft, toggle kill switch.

### shadcn components used

- `Card`, `CardHeader`, `CardContent` — draft cards
- `Badge` — status badges, safety badges, channel indicators
- `Dialog` — publish confirm modal (CAMP-04)
- `Textarea` — inline draft editing
- `Button` — approve, regenerate, submit for review, kill switch
- `Alert` — 30-day enforcement banner, brand voice missing banner
- `Tabs` — channel tabs in studio composer
- `Sheet` — social channel "Connect to enable" drawer
- `Separator`, `Skeleton` — loading states

---

## 12. Telegram Operator Alerts

Reuse `sendTelegramMessage()` pattern from `lib/accommodation/telegram/ops-bot.ts`. Campaign alerts go to the global `TELEGRAM_OPS_CHAT_ID` environment variable (not per-department channels — campaign ops is platform-level).

Create `lib/campaigns/telegram-alerts.ts`:

### (a) Campaign run failure

```
[Campaign Run Failed]

Org: {org_name} ({org_id})
Campaign: {campaign_name}
Run ID: {run_id}
Channel: {channel}
Error: {error_message}

{N}/{total} items failed. Check /admin/clients/{org_id}/campaigns/runs/{run_id}
```

### (b) Brand-safety flag tripped

```
[Brand Safety Flag]

Org: {org_name}
Campaign: {campaign_name}
Channel: {channel}
Flag type: {off_brand | insensitive | time_inappropriate | forbidden_topic}
Reason: {flag.reason}
Excerpt: "{flag.excerpt}"

Draft is blocked from publishing. Tenant notified in-app.
```

### (c) Kill switch activated by platform admin

```
[Kill Switch Activated]

Org: {org_name} ({org_id})
Activated by: {admin_user_email}
Reason: {reason}
Scheduled runs cancelled: {count}

To re-enable: /admin/clients/{org_id}/campaigns/kill-switch
```

All three alert functions accept a `supabase` client (not used for DB — only for consistency with existing pattern) and `TELEGRAM_OPS_CHAT_ID` from `process.env`.

---

## 13. Risks / Unknowns / Escape Hatches

### pg_cron one-time scheduling reliability

pg_cron does not natively support "run once at exact datetime" — it uses cron syntax which has minute-level resolution. Workaround: schedule for the nearest minute, accept up to 59s drift. For v3.0 this is acceptable. Escape hatch: if exact timing matters in v3.1, switch to a Vercel Cron job (1-minute resolution from Next.js config) that polls `campaign_runs WHERE scheduled_at <= now() AND status = 'pending'`.

### pg_net + Vercel cold starts

`pg_net.http_post` fires the HTTP request from the Supabase DB network. Vercel serverless functions may cold-start. Set a 30s timeout on the pg_net call. If cold start exceeds timeout, the campaign_run stays `pending` — a cleanup cron (`*/15 * * * *`) should detect stale `pending` runs older than 30 minutes and mark them `failed`.

### BulkSMS sender ID registration

SA carriers require pre-registered alphanumeric sender IDs (DraggonnB). Registration can take 1-5 business days. Planner must schedule this as a pre-launch dependency. Fallback: use a short numeric sender code while registration is in progress.

### POPIA / opt-out for SMS campaigns

Clients must maintain opt-out lists. BulkSMS tracks STOP responses per sender. Platform must surface a UI for clients to manage subscriber opt-outs (not in CAMP scope — flag as a v3.1 requirement). For v3.0, platform relies on BulkSMS's built-in STOP handling and instructs clients to only send to opted-in lists.

### Brand-safety check quota exhaustion

If a tenant hits the 20/day Haiku quota, drafts become unchecked. Decision: allow publishing unchecked drafts after quota exhaustion WITH a warning banner ("Brand safety check quota reached — proceed at your own discretion?"). Admin can raise the limit in `tenant_modules.config.campaigns.safety_check_daily_limit`.

### social_accounts table FK reference

`social_accounts` table (migration 04) references the legacy `users` table (`created_by UUID REFERENCES users(id)`). When reading `page_access_token` for FB/IG publishing, query via `organization_id` only — do not join through `created_by`. The table exists and has `page_id`, `page_access_token` columns ready for use by adapters once credentialed.

### `AgentType` union must be updated

Before shipping `CampaignDrafterAgent` and `BrandSafetyAgent`, add `'campaign_drafter'` and `'campaign_brand_safety'` to the `AgentType` union in `lib/agents/types.ts`. Failure to do this causes TypeScript build errors.

### Kill switch and pg_cron job names

If a tenant has hundreds of scheduled campaigns, `cancel_org_campaign_runs` iterates them all. For v3.0 tenant counts this is fine. At 100+ concurrent campaigns per tenant (v3.1+), replace the loop with `DELETE FROM cron.job WHERE jobname LIKE 'campaign_run_%'` filtered by org_id lookup — requires joining against `campaign_runs`. Pre-note for planner.

---

## RESEARCH COMPLETE

Output file: `.planning/phases/11-easy-advanced-crm-campaign-decision/11-RESEARCH-PART-B-campaign.md`
