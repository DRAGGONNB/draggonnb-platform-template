# Agent Build Spec

## Adding a New Agent

1. Create agent file in `lib/agents/` (e.g., `content-writer.ts`)
2. Add the agent type to the `AgentType` union in `lib/agents/types.ts`
3. Extend `BaseAgent` from `lib/agents/base-agent.ts`
4. Implement `parseResponse(response: string): unknown` for structured output

## Architecture

- **BaseAgent** (`base-agent.ts`): Handles Anthropic API calls, session persistence, token tracking, error handling
- **Types** (`types.ts`): All agent interfaces -- `AgentType`, `AgentConfig`, `AgentRunOptions`, `AgentRunResult`
- **Sessions**: Stored in `agent_sessions` table (Supabase). Each run creates or resumes a session.
- **Token tracking**: `tokens_used` accumulated per session (input + output tokens)

## Agent Pattern

```typescript
import { BaseAgent } from './base-agent'
import type { AgentConfig } from './types'

const CONFIG: AgentConfig = {
  agentType: 'your_agent_type',  // must match AgentType union
  systemPrompt: `Your system prompt here`,
  // model defaults to claude-sonnet-4-5-20250929
  // maxTokens defaults to 4096
  // temperature defaults to 0.7
}

export class YourAgent extends BaseAgent {
  constructor() {
    super(CONFIG)
  }

  protected parseResponse(response: string): YourResultType {
    // Parse Claude's text response into structured data
    // Throw if parsing fails -- BaseAgent catches and stores raw response
    return JSON.parse(response)
  }
}
```

## Calling an Agent

```typescript
const agent = new YourAgent()
const result = await agent.run({
  organizationId: 'org-uuid',    // optional, links session to org
  leadId: 'lead-uuid',           // optional, links session to lead
  sessionId: 'existing-id',      // optional, resumes session
  input: 'User message',
  context: { key: 'value' },     // optional, prepended to input
})
// result: { sessionId, response, tokensUsed, result, status }
```

## Existing Agents

- `LeadQualifierAgent` (`lead-qualifier.ts`): Scores leads on fit/urgency/size, recommends tier, identifies automatable processes
- `ProposalGeneratorAgent` (`proposal-generator.ts`): Generates proposals with pain points, solutions, pricing, timeline

### Campaign Studio Agents (lib/campaigns/agent/)

Two agents support the Campaign Studio (Phase 11):

- `CampaignDrafterAgent` (`campaign-drafter.ts`): Receives a campaign intent and the tenant's brand voice
  (auto-injected via BaseAgent.loadBrandVoice), generates 5 social posts + 1 email + 1 SMS as structured JSON.
  Model: Sonnet (default). Closes CAMP-01.
- `BrandSafetyAgent` (`brand-safety-checker.ts`): Haiku-based safety reviewer. Returns
  `{ safe, flags[], recommendation }`. Hard-pinned to `claude-haiku-4-5-20251001`, temperature 0,
  maxTokens 512. Daily budget 20/tenant tracked in `ai_usage_ledger`. Closes CAMP-07.

Both register `agentType` values `'campaign_drafter'` and `'campaign_brand_safety'` in
`lib/agents/types.ts` `AgentType` union.

### Accommodation AI Agents (lib/accommodation/agents/)

Four specialized agents for accommodation operations, all extending `BaseAgent`:

- `QuoterAgent` (`quoter-agent.ts`): Receives inquiry details, checks availability + rates, generates personalized quote email. Tools: `checkAvailability`, `calculateRate`, `getPropertyInfo`, `generateQuoteEmail`
- `ConciergeAgent` (`concierge-agent.ts`): Answers guest questions about property, area, activities via WhatsApp. Tools: `getPropertyDetails`, `getActivities`, `getLocalInfo`, `composeResponse`
- `ReviewerAgent` (`reviewer-agent.ts`): Analyzes guest reviews, generates response drafts, extracts sentiment/action items. Tools: `analyzeReview`, `generateResponse`, `extractActionItems`
- `PricerAgent` (`pricer-agent.ts`): Analyzes occupancy patterns, suggests rate adjustments. Tools: `getOccupancyData`, `getCompetitorRates`, `suggestPricing`, `generateReport`

Agent configs stored in `accommodation_ai_configs` table (per-org, per-agent-type). API routes at `app/api/accommodation/ai-configs/` and `app/api/accommodation/ai/`.

## Requirements

- `ANTHROPIC_API_KEY` env var must be set
- Agent type must be registered in `AgentType` union before use
- Admin Supabase client used for session storage (service role, bypasses RLS)

## Failure-mode triage — check Anthropic billing FIRST

**Symptom:** An AI feature (Autopilot generate, Campaign Studio draft, Brand Voice wizard)
surfaces a generic "failed to generate" error or returns HTTP 500/503 from an agent route.

**Step 1 — Check Anthropic billing console FIRST**
Visit https://console.anthropic.com → Billing → Usage. If credits are $0 or near-zero, all
agent calls will fail with HTTP 401 from the Anthropic SDK. This is the most common cause
during early-access / low-activity periods.

**Step 2 — Read the error class from Vercel runtime logs**
`vercel logs --follow` or Vercel dashboard → Runtime Logs. Look for:
- `AgentCreditError` → billing confirmed depleted. Fund Anthropic account.
- `AgentRateLimitError` → too many requests per minute. Retry after a brief wait; consider
  adding a queue if this recurs under normal load.
- `CostCeilingExceededError` → org has hit its per-period cost ceiling. Either raise the
  ceiling in `billing_plans.limits.ai_cost_ceiling_zar_cents` or inform the tenant they
  have exhausted their AI budget for the period.
- Any other error → actual code bug. Investigate further.

**Step 3 — Code diagnosis only after billing confirmed funded**
If credits are present and the error class is not one of the above, inspect:
- The agent's `parseResponse()` — Claude may be returning well-formed text that fails the JSON parser.
- The `buildSystemBlocks()` call — brand voice prompt may be malformed.
- The DB session insert — `agent_sessions` table schema drift.

**Typed errors (exported from `lib/agents/base-agent.ts` since Phase 12):**
```typescript
import { AgentCreditError, AgentRateLimitError } from '@/lib/agents/base-agent'

try {
  const result = await agent.run({ ... })
} catch (err) {
  if (err instanceof AgentCreditError) {
    // err.userMessage is safe to show in UI toast
    return NextResponse.json({ error: err.userMessage }, { status: 503 })
  }
  if (err instanceof AgentRateLimitError) {
    return NextResponse.json({ error: err.userMessage }, { status: 429 })
  }
  // ... generic fallback
}
```
