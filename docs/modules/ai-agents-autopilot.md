# AI Agents / Autopilot

> The cross-module intelligence layer — 8 AI agents built on a shared BaseAgent framework with cost ceilings, brand voice injection, session storage, and tier-based model selection.

---

## What it does (in 30 seconds)

Every AI feature on the platform runs through `BaseAgent` — a shared Claude API wrapper that enforces cost ceilings, injects brand voice, tracks tokens per session, logs every call to `ai_usage_ledger`, and applies tier-based model downgrading (Haiku for core/growth, Sonnet for scale/platform_admin). The Business Autopilot (`/autopilot`) is the primary user-facing AI surface — it generates weekly content calendars and email campaigns from a configured client profile.

---

## Built capabilities

| Capability | Type | What it does | Trigger / cadence |
|---|---|---|---|
| BaseAgent — cost ceiling check | Framework | `checkCostCeiling(orgId, projected)` runs before EVERY Anthropic API call; throws `CostCeilingExceededError` if MTD spend + projected cost exceeds ceiling; writes abort ledger row | Pre-call on every agent run |
| BaseAgent — brand voice injection | Framework | `loadBrandVoice(orgId)` lazily loads `client_profiles.brand_voice_prompt`; `buildSystemBlocks()` assembles system prompt blocks with cache_control (Anthropic prompt caching) | Per agent run |
| BaseAgent — tier model selection | Framework | `selectModel(requested, tier)` — Sonnet/Opus blocked for core/growth tiers, silently downgraded to Haiku | Per agent run |
| BaseAgent — session storage | Framework | Every run creates or resumes an `agent_sessions` row; multi-turn conversations accumulate in `messages` JSONB; cumulative tokens + cost tracked across turns | Per agent run |
| BaseAgent — usage ledger | Framework | `ai_usage_ledger` INSERT per call — records model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_zar_cents, error (null = success, 'aborted_ceiling:...' = blocked) | Per agent run |
| BusinessAutopilotAgent | AI Agent | Generates weekly social + email content calendar from client profile; supports generateCalendar(), refinePost(), chat() | User-triggered via `/autopilot` |
| LeadQualifierAgent | AI Agent | Scores leads on fit/urgency/size (1-10 each); recommends tier (core/growth/scale); identifies automatable processes; returns structured QualificationResult | User-triggered (sales workflow) |
| ProposalGeneratorAgent | AI Agent | Generates full proposal with pain points, automation solutions, pricing, timeline, savings estimates | User-triggered (sales workflow) |
| ClientOnboardingAgent | AI Agent | Generates onboarding plan: content calendar, email template specs, automation suggestions, quick wins, 30-day goals | User-triggered (provisioning / onboarding flow) |
| CampaignDrafterAgent | AI Agent | Multi-channel campaign copy: 5 social posts + 1 email + 1 SMS in brand voice | User-triggered via Campaign Studio |
| BrandSafetyAgent | AI Agent | SA-specific brand safety review; 20/day budget enforced; temperature=0 for deterministic rulings | User-triggered via Campaign Studio |
| QuoterAgent | AI Agent | Accommodation quote emails | User-triggered via Accommodation module |
| ConciergeAgent | AI Agent | Guest WhatsApp concierge | Event-driven via Accommodation dispatcher |
| ReviewerAgent | AI Agent | Review sentiment analysis + response drafting | User-triggered via Accommodation module |
| PricerAgent | AI Agent | Accommodation rate recommendations from occupancy data | User-triggered via Accommodation module |
| Autopilot UI | UI | `/autopilot` — generate calendar, view/edit entries, refine with feedback; `/autopilot/settings` — client profile config | User-triggered |
| Admin cost monitoring | UI | `/admin/cost-monitoring` — trend chart and table of `ai_usage_ledger` spend across orgs | Admin on-demand |
| Usage warning banner | UI | `_components/usage-warning-banner.tsx` — shown when org is approaching cost ceiling | On dashboard render |
| Usage cap modal | UI | `_components/usage-cap-modal.tsx` — blocks further agent actions when ceiling exceeded | On agent call rejection |

---

## AI Agents detail

### `BusinessAutopilotAgent` (`lib/agents/business-autopilot.ts`)
- **Type:** claude-haiku-4-5-20251001 (default), Sonnet for scale/platform_admin
- **What it does:** Generates structured `AutopilotCalendar` with social posts (per platform: LinkedIn, Facebook, Instagram) and email drafts (3 subject lines, short + long body, segment suggestion)
- **Input:** `ClientProfile` (fully populated from `/autopilot/settings`), target week string
- **Output:** `AutopilotCalendar { week, theme, notes, entries[] }` — maxTokens 8192
- **Trigger:** `generateCalendar(week, orgId)`, `refinePost(content, feedback, orgId, sessionId)`, `chat(message, orgId, sessionId)`

### `LeadQualifierAgent` (`lib/agents/lead-qualifier.ts`)
- **Type:** claude-haiku-4-5-20251001 (default)
- **What it does:** Scores leads (fit, urgency, size 1-10); recommends tier; flags automatable processes; returns `QualificationResult`
- **Trigger:** Sales qualification workflow

### `ProposalGeneratorAgent` (`lib/agents/proposal-generator.ts`)
- **Type:** claude-haiku-4-5-20251001 (default)
- **What it does:** Generates `Proposal` with executive summary, tier recommendation, monthly price, pain points + solutions, timeline, savings estimates
- **Trigger:** Post-qualification, sales workflow

### `ClientOnboardingAgent` (`lib/agents/client-onboarding-agent.ts`)
- **Type:** claude-haiku-4-5-20251001 (default)
- **What it does:** Creates `OnboardingPlan` with 4-week content calendar, email template specs, automation suggestions, quick wins, 30-day goals
- **Trigger:** New client provisioning / onboarding flow

### Campaign Studio, Accommodation agents — see `campaign-studio.md` and `accommodation.md`

---

## N8N workflows

N8N is not the execution layer for AI agents — agents run synchronously via API routes. N8N's role is orchestration: the CRM nightly engagement scoring, the accommodation reminders, the Elijah roll call. None of the N8N workflows call Claude directly in the current build (the content-gen workflow calls OpenAI GPT-4o, which is a legacy exception).

---

## Database (key tables)

- `agent_sessions`: session records per run (agent_type, organization_id, lead_id, messages[], tokens_used, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_zar_cents, status, model, result)
- `ai_usage_ledger`: per-call cost ledger (agent_type, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_zar_cents, error, request_id, was_retry, recorded_at)
- `client_profiles`: per-org autopilot profile and brand voice prompt
- `accommodation_ai_configs`: per-org, per-agent-type accommodation agent configuration

---

## User flows (the 3 most common)

1. **Business Autopilot weekly calendar:** User configures client profile at `/autopilot/settings` (industry, tone, platforms, SEO keywords, content pillars). Each Monday, user visits `/autopilot` → selects current week → clicks "Generate" → `BusinessAutopilotAgent.generateCalendar()` fires → BaseAgent: loads brand voice → checks cost ceiling → calls Anthropic → writes ledger → returns 7-10 content entries. User reviews, refines specific posts via the chat panel.

2. **Sales lead qualification + proposal:** Sales rep enters lead details → `LeadQualifierAgent.run()` → returns score + recommended tier + automatable processes. Rep reviews → runs `ProposalGeneratorAgent.run()` with qualification context → gets full proposal with pricing. Both agent calls create `agent_sessions` rows and write to `ai_usage_ledger`.

3. **Cost ceiling enforcement:** Org has hit its monthly AI spend ceiling → next agent call fires → `checkCostCeiling()` computes MTD spend from `ai_usage_ledger` → projected call would exceed ceiling → `CostCeilingExceededError` thrown → abort ledger row written (`error: 'aborted_ceiling: 450 cents over 10000'`) → session marked failed → UI shows usage cap modal.

---

## Integrations

- **External:** Anthropic Claude API (all agents) — key from `env.ANTHROPIC_API_KEY`
- **Internal:** `client_profiles` (brand voice), `organizations` (tier lookup for model selection), `ai_usage_ledger` (MTD cost tracking for ceiling enforcement), `agent_sessions` (session storage and resumption)

---

## Tier gating

Model selection is tier-gated:
- `core` and `growth` tiers: Haiku only
- `scale` and `platform_admin` tiers: Sonnet available (Opus blocked for all tiers currently)

Accommodation AI agents (QuoterAgent, ConciergeAgent, ReviewerAgent, PricerAgent) require `accommodation` module activation. BrandSafetyAgent has a separate daily budget (20/tenant/day) enforced at the agent level, not via `checkCostCeiling()`.

---

## What's NOT in this module yet

- Opus model in production — referenced in types and model registry but Opus is blocked for all current tiers
- Autonomous sub-agents or multi-agent chains — all agents are single-call or multi-turn conversational; no agent spawns another agent
- Agent scheduling — agents are user-invoked or event-invoked; none run on a cron schedule (N8N handles scheduling separately)
- Per-agent cost ceiling — the ceiling is per-org total, not per-agent-type

---

## Cross-module ties

- Every module's AI feature uses `BaseAgent` — CRM, Campaign Studio, Content Studio, Accommodation all share the same cost tracking, brand voice injection, and session storage
- `ai_usage_ledger` is the single source of truth for all AI spend across all modules for a tenant
- Admin cost monitoring at `/admin/cost-monitoring` shows cross-module spend in one view

---

*Source of truth (last verified): 2026-04-27*
*Phase 11 build status: green — BaseAgent framework complete with cost ceiling, brand voice, tier model selection, session storage, and ledger*
