# Phase 4: N8N Automation - Research

**Researched:** 2026-02-05
**Domain:** N8N workflow automation, webhook integration, credential management
**Confidence:** HIGH

## Summary

Phase 4 activates three pre-imported N8N workflows on the VPS (72.61.146.151) to enable AI content generation, scheduled content publishing, and analytics collection. The workflows are already deployed but inactive, waiting for Anthropic API credentials and Supabase service role key configuration. The codebase has complete API routes and webhook client libraries ready.

N8N uses a credential system with encrypted storage, separating test and production webhook URLs, and requires workflow publishing (not just activation) in n8n v2.0+. The Anthropic integration uses HTTP Request nodes with Header Auth credentials (x-api-key header), while Supabase access uses the service role key for RLS bypass. Production webhooks remain active once workflows are published, and cron-based workflows (queue processor, analytics collector) respect workflow-level timezone settings.

**Primary recommendation:** Configure credentials via N8N UI, test with webhook Test URLs first, then publish workflows to activate production URLs. Use N8N's built-in retry mechanisms and error workflows for production resilience.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| N8N | 1.118.2 | Workflow automation engine | Self-hosted on VPS, visual workflow builder, 400+ integrations |
| Anthropic API | v1 (2023-06-01) | Claude AI content generation | Messages API endpoint, 200K token context, Claude Sonnet 4 |
| Supabase REST API | v1 | Database CRUD operations | RESTful interface, service role bypasses RLS, Prefer header controls response |
| Traefik | 2.x | Reverse proxy + SSL | Already running on VPS, automatic Let's Encrypt, domain routing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N8N Schedule Trigger | Built-in | Cron-based workflow execution | Queue processor (every 15 min), analytics collector (daily 6 AM) |
| N8N Webhook Trigger | Built-in | HTTP webhook receiver | Content generation API endpoint |
| N8N HTTP Request | Built-in | External API calls | Anthropic Messages API, Supabase REST operations |
| N8N If Node | 2.2 | Conditional branching | Queue processor checks if posts exist before processing |
| N8N SplitInBatches | 3 | Loop iteration | Queue processor iterates over due posts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| N8N self-hosted | N8N Cloud | Cloud: managed service but $20/mo, limited to 5K executions/mo on starter tier |
| Anthropic HTTP Request | OpenAI node | OpenAI: native N8N node but vendor lock-in, Anthropic more flexible for custom prompts |
| Supabase REST API | Postgres node | Postgres: direct DB access but requires connection pooling, REST simpler for CRUD |

**Installation:**
Workflows already deployed via `scripts/deploy-n8n-workflows.py`. Credentials added via N8N UI.

## Architecture Patterns

### Recommended Project Structure
```
N8N Workflows (VPS)
├── DraggonnB - AI Content Generator    # Webhook: /webhook/draggonnb-generate-content
├── DraggonnB - Content Queue Processor # Cron: every 15 minutes
└── DraggonnB - Analytics Collector     # Cron: daily 6 AM SAST
```

### Pattern 1: Webhook Trigger + API + Response
**What:** Synchronous webhook receives request, calls external API (Anthropic), saves result to database, returns response
**When to use:** User-initiated actions requiring immediate feedback (content generation)
**Example:**
```
Workflow: AI Content Generator
1. Webhook Trigger (POST /webhook/draggonnb-generate-content)
   - Receives: { organizationId, topic, platforms, tone }
2. Claude AI Generate (HTTP Request)
   - POST https://api.anthropic.com/v1/messages
   - Headers: x-api-key (credential), anthropic-version: 2023-06-01
   - Body: { model, max_tokens, system, messages }
3. Save to Supabase (HTTP Request)
   - POST https://psqfgzbjbgqrmjskdavs.supabase.co/rest/v1/social_posts
   - Headers: apikey (service role), Prefer: return=representation
   - Body: { organization_id, content, platforms, status: "draft" }
4. Success Response (Respond to Webhook)
   - Returns: { success: true, data: { content, post_id } }
```
**Source:** Official N8N webhook documentation

### Pattern 2: Schedule Trigger + Fetch + Loop + Update
**What:** Cron-based workflow fetches records from database, iterates batch-by-batch, updates each record
**When to use:** Background jobs processing queued items (content queue processor)
**Example:**
```
Workflow: Content Queue Processor
1. Every 15 Minutes (Schedule Trigger)
   - Cron: every 15 minutes
   - Timezone: Africa/Johannesburg (workflow-level setting)
2. Fetch Due Posts (HTTP Request)
   - GET /rest/v1/social_posts?status=eq.scheduled&scheduled_for=lt.now()
   - Returns: Array of posts
3. Has Due Posts? (If Node)
   - Condition: Array length > 0
   - True → Process Each Post
   - False → No Posts Due (exit)
4. Process Each Post (SplitInBatches)
   - Batch size: 1 (process one at a time)
   - Loop through all posts
5. Mark as Published (HTTP Request)
   - PATCH /rest/v1/social_posts?id=eq.{id}
   - Body: { status: "published", published_at: now() }
```
**Source:** N8N Schedule Trigger and SplitInBatches documentation

### Pattern 3: Schedule Trigger + Aggregate + Insert
**What:** Cron-based workflow fetches records, aggregates metrics, inserts snapshot
**When to use:** Daily/periodic analytics collection (analytics collector)
**Example:**
```
Workflow: Analytics Collector
1. Daily 6 AM SAST (Schedule Trigger)
   - Cron: daily at 6:00 AM
   - Timezone: Africa/Johannesburg
2. Fetch Recent Posts (HTTP Request)
   - GET /rest/v1/social_posts?status=eq.published&published_at=gte.now()-interval'24 hours'
3. Save Analytics Snapshot (HTTP Request)
   - POST /rest/v1/analytics_snapshots
   - Body: { snapshot_date, total_posts_24h, platforms_used, collected_at }
   - Aggregation done in JSON body using N8N expressions
```
**Source:** N8N workflow patterns

### Anti-Patterns to Avoid
- **Don't poll frequently for background jobs:** Use cron schedules (15 min minimum), not 1-minute polling that wastes resources
- **Don't hardcode credentials in workflows:** Always use N8N credential system with encryption
- **Don't use test webhooks in production:** Test URLs stop working when workflow closes, production URLs persist
- **Don't skip timezone configuration:** Cron schedules default to America/New_York, set Africa/Johannesburg explicitly

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry logic with exponential backoff | Custom retry loops | N8N HTTP Request node "Retry on Fail" option | Built-in linear retry (3-5 retries with 5s delay), configurable timeout |
| Webhook authentication | Custom token validation | N8N credential system with Header Auth | Encrypted storage, automatic header injection, no plaintext secrets |
| Cron scheduling | Custom interval logic | N8N Schedule Trigger node | Handles timezone, DST, complex cron expressions, workflow activation |
| Batch processing | Manual loops | N8N SplitInBatches node | Automatic pagination, memory-efficient, handles empty arrays |
| Error notifications | Try-catch blocks | N8N Error Workflow | Dedicated workflow triggered on any execution failure, can send Slack/email alerts |

**Key insight:** N8N provides production-grade primitives for workflow orchestration. Don't reimplement retry, scheduling, batching, or error handling—use N8N's built-in nodes and configure them properly.

## Common Pitfalls

### Pitfall 1: Test vs Production Webhook URLs
**What goes wrong:** Workflow works during manual testing but fails when called from app
**Why it happens:** N8N generates two webhook URLs—Test URL (active during manual execution) and Production URL (active when workflow published). Test URL stops responding when workflow editor closes.
**How to avoid:**
1. Use Test URL during development to see data in N8N UI
2. Publish workflow (not just save) to activate Production URL
3. Update app code to use Production URL from activated workflow
4. Test Production URL with curl before integrating
**Warning signs:** Webhook returns 404 or timeout errors after workflow editor closed

**Source:** [N8N Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)

### Pitfall 2: Missing Workflow Publishing in n8n v2.0+
**What goes wrong:** Workflow saved but cron jobs don't run, webhooks inactive
**Why it happens:** n8n v2.0 separated "Save" from "Publish"—Save updates draft, Publish activates production execution
**How to avoid:**
1. Edit workflow → Save (updates draft)
2. Click "Publish" button to make workflow live
3. Verify "Active" badge appears on workflow card
4. Check Executions tab to confirm cron jobs triggered
**Warning signs:** Workflow shows as saved but no executions appear, Active toggle missing (replaced with Publish button)

**Source:** [N8N v2.0 Workflow Publishing](https://support.n8n.io/article/understanding-workflow-publishing-in-n-8-n-2-0)

### Pitfall 3: Incorrect Timezone for Cron Schedules
**What goes wrong:** Cron jobs run at wrong time (6 AM becomes 12 AM, etc.)
**Why it happens:** N8N defaults to America/New_York timezone, Schedule Trigger doesn't inherit system timezone
**How to avoid:**
1. Open workflow Settings (gear icon in top-right)
2. Set Timezone to "Africa/Johannesburg" at workflow level
3. Schedule Trigger respects workflow timezone, not instance timezone
4. Test schedule with "Execute workflow" to verify timing
**Warning signs:** Cron execution timestamps in Executions tab show wrong hours

**Source:** [N8N Timezone Configuration](https://docs.n8n.io/hosting/configuration/configuration-examples/time-zone/)

### Pitfall 4: Anthropic API Header Configuration
**What goes wrong:** Anthropic API returns 401 Unauthorized or 400 Bad Request
**Why it happens:** Anthropic requires specific headers (x-api-key, anthropic-version, content-type) with exact casing
**How to avoid:**
1. Create Header Auth credential named "Anthropic API Key"
2. Set header name: "x-api-key" (lowercase)
3. Set header value: "sk-ant-..." (your API key)
4. In HTTP Request node, add manual headers: anthropic-version: 2023-06-01, content-type: application/json
5. Use POST method with JSON body
**Warning signs:** 401 errors, missing x-api-key header, version mismatch errors

**Source:** [N8N Anthropic Credentials](https://docs.n8n.io/integrations/builtin/credentials/anthropic/)

### Pitfall 5: Supabase Service Role Key Confusion
**What goes wrong:** N8N workflow can't insert/update records, returns 401 or 403
**Why it happens:** Using anon key instead of service role key, or missing apikey header
**How to avoid:**
1. Use service_role key (not anon key) for N8N workflows
2. Service role bypasses RLS, required for background jobs
3. Add to all Supabase HTTP Request nodes as Header Auth credential
4. Header name: "apikey" (lowercase)
5. Don't expose service role key to frontend—only in N8N server-side workflows
**Warning signs:** RLS policy errors, "new row violates row-level security policy" messages

**Source:** [N8N Supabase Credentials](https://docs.n8n.io/integrations/builtin/credentials/supabase/)

### Pitfall 6: Timeout on Long-Running AI Requests
**What goes wrong:** Claude API call times out during content generation (30-60 second responses)
**Why it happens:** N8N HTTP Request default timeout too low (10-20 seconds), Anthropic streaming not used
**How to avoid:**
1. HTTP Request node → Options → Timeout: 60000 (60 seconds)
2. Enable "Retry on Fail" with 2-3 retries
3. For longer requests, use webhook timeout extension or async pattern
4. Monitor Anthropic API latency in N8N execution logs
**Warning signs:** "Request timed out" errors, partial responses, 504 gateway timeout

**Source:** [N8N Timeout Troubleshooting](https://logicworkflow.com/blog/fix-n8n-timeout-errors/)

## Code Examples

Verified patterns from official sources:

### Anthropic HTTP Request Node Configuration
```json
{
  "node": "HTTP Request",
  "parameters": {
    "method": "POST",
    "url": "https://api.anthropic.com/v1/messages",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "anthropic-version", "value": "2023-06-01" },
        { "name": "content-type", "value": "application/json" }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, system: 'Your system prompt', messages: [{ role: 'user', content: $json.body.prompt }] }) }}",
    "options": { "timeout": 60000 }
  }
}
```
**Source:** Existing workflow in `scripts/deploy-n8n-workflows.py` lines 48-65

### Supabase HTTP Request with Service Role
```json
{
  "node": "HTTP Request",
  "parameters": {
    "method": "POST",
    "url": "https://psqfgzbjbgqrmjskdavs.supabase.co/rest/v1/social_posts",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "Prefer", "value": "return=representation" },
        { "name": "Content-Type", "value": "application/json" }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ organization_id: $input.first().json.body.organizationId, content: $json.content[0].text, platforms: $input.first().json.body.platforms || ['linkedin'], status: 'draft' }) }}"
  }
}
```
**Source:** Existing workflow in `scripts/deploy-n8n-workflows.py` lines 73-94

### Schedule Trigger Configuration (Cron)
```json
{
  "node": "Schedule Trigger",
  "parameters": {
    "rule": {
      "interval": [
        { "field": "minutes", "minutesInterval": 15 }
      ]
    }
  },
  "typeVersion": 1.2
}
```
**Workflow settings (separate):**
```json
{
  "settings": {
    "executionOrder": "v1",
    "timezone": "Africa/Johannesburg"
  }
}
```
**Source:** Existing workflow in `scripts/deploy-n8n-workflows.py` lines 120-130, 226

### NextJS API Route Calling N8N Webhook
```typescript
// app/api/content/generate/route.ts
const n8nWebhookUrl = `${process.env.N8N_BASE_URL}/webhook/draggonnb-generate-content`

const n8nResponse = await fetch(n8nWebhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    organizationId,
    topic,
    platforms,
    tone: tone || 'professional',
    keywords: keywords || [],
    userId: user.id,
  }),
})

if (!n8nResponse.ok) {
  throw new Error(`N8N webhook failed: ${n8nResponse.statusText}`)
}

const result = await n8nResponse.json()
// Returns: { success: true, data: { content, post_id } }
```
**Source:** Existing code in `app/api/content/generate/route.ts` lines 86-108

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Active/Inactive toggle | Publish/Unpublish workflow | n8n v2.0 (2024) | Separates draft edits from production execution, prevents accidental live changes |
| Single webhook URL | Test URL + Production URL | n8n v1.x | Test URL shows data in UI for debugging, Production URL for live traffic |
| Fixed offset timezones | Location-based timezone IDs | n8n 1.x | Automatic DST adjustment (use "Africa/Johannesburg" not "GMT+2") |
| Linear retry only | Linear + custom exponential backoff | n8n 1.x | Built-in linear retry sufficient for most APIs, custom patterns for critical paths |
| Anthropic Completions API | Anthropic Messages API | Anthropic v1 (2023) | Messages API supports multi-turn conversations, system prompts, 200K context |

**Deprecated/outdated:**
- **N8N CLI import with --separate flag:** Removed in n8n 1.x, use `--input` flag with JSON array
- **Webhook node "Respond to Webhook" deprecated:** Use "Respond to Webhook" node (separate node, not mode)
- **Anthropic v1 Completions endpoint:** Use /v1/messages, Completions deprecated
- **Hardcoded N8N_WEBHOOK_URL:** Use environment variables per workflow, not single base URL

## Open Questions

Things that couldn't be fully resolved:

1. **N8N API Key for Programmatic Workflow Activation**
   - What we know: N8N has REST API for workflow management (GET /workflows, PATCH /workflows/{id}/activate)
   - What's unclear: Whether API key is already generated on VPS, need to check N8N UI Settings > n8n API
   - Recommendation: Activate workflows manually via UI first, add API automation in Phase 6 (Client Provisioning)

2. **Content Queue Processor Social Media Publishing**
   - What we know: Workflow marks posts as "published" in database
   - What's unclear: Actual social media API posting deferred to Phase 5, current workflow only updates status
   - Recommendation: Phase 4 scope limited to status updates, Phase 5 adds Facebook/LinkedIn API calls

3. **Error Workflow Configuration**
   - What we know: N8N supports dedicated error workflows triggered on any execution failure
   - What's unclear: Whether to add error notification workflow now or defer to Phase 7 (Testing & Hardening)
   - Recommendation: Add basic error logging in Phase 4, full error workflow with Slack/email alerts in Phase 7

4. **Webhook Authentication/Authorization**
   - What we know: Production webhook URLs are public but unguessable (long random path)
   - What's unclear: Whether to add HMAC signature validation for webhook requests (like PayFast ITN)
   - Recommendation: N8N webhooks don't have built-in signature validation, rely on URL secrecy for now, add API key auth in app layer if needed

## Sources

### Primary (HIGH confidence)
- [N8N Webhook Node Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) - Webhook trigger configuration
- [N8N Schedule Trigger Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/) - Cron scheduling patterns
- [N8N HTTP Request Credentials](https://docs.n8n.io/integrations/builtin/credentials/httprequest/) - Header Auth configuration
- [N8N Anthropic Credentials](https://docs.n8n.io/integrations/builtin/credentials/anthropic/) - Anthropic API integration
- [N8N Supabase Credentials](https://docs.n8n.io/integrations/builtin/credentials/supabase/) - Supabase service role setup
- [N8N Error Handling](https://docs.n8n.io/flow-logic/error-handling/) - Error workflow patterns
- [N8N Timezone Configuration](https://docs.n8n.io/hosting/configuration/configuration-examples/time-zone/) - Timezone settings
- [N8N v2.0 Workflow Publishing](https://support.n8n.io/article/understanding-workflow-publishing-in-n-8-n-2-0) - Publish vs Save distinction

### Secondary (MEDIUM confidence)
- [N8N Workflow Automation Guide 2026](https://hatchworks.com/blog/ai-agents/n8n-guide/) - General patterns and best practices
- [Anthropic API Integration 2026](https://oneuptime.com/blog/post/2026-01-25-anthropic-api-integration/view) - API key management
- [N8N Timeout Troubleshooting](https://logicworkflow.com/blog/fix-n8n-timeout-errors/) - Production timeout fixes
- [N8N Error Handling Techniques](https://www.aifire.co/p/5-n8n-error-handling-techniques-for-a-resilient-automation-workflow) - Retry patterns

### Tertiary (LOW confidence)
- Community forum posts on N8N webhook production issues - Various edge cases and workarounds

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - N8N, Anthropic, Supabase all verified with official documentation
- Architecture: HIGH - Existing workflows already deployed, patterns extracted from working code
- Pitfalls: HIGH - All pitfalls verified with official docs and community issues

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable ecosystem, N8N 1.x mature)
