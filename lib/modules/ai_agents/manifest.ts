// lib/modules/ai_agents/manifest.ts
// MANIFEST-02: descriptive only. No executable code, no side effects, no imports beyond the type.
// Describes what the AI Agents module ALREADY does as of v3.0.
// Agents covered: LeadQualifier, ProposalGenerator, Quoter, Concierge, Reviewer, Pricer,
//                 CampaignDrafter, BrandSafety (all extend BaseAgent in lib/agents/).

import type { ModuleManifest } from '../types'

export const aiAgentsManifest: ModuleManifest = {
  id: 'ai_agents',
  name: 'AI Agents',
  version: '1.0.0',
  product: 'draggonnb',

  required_tenant_inputs: [
    {
      key: 'ai_agents.brand_voice_overrides',
      type: 'json',
      label: 'Brand Voice Overrides',
      placeholder: '{"tone": "professional", "avoid_words": ["cheap", "discount"]}',
      required: false,
      // injected into BaseAgent.buildSystemBlocks() via loadBrandVoice()
    },
    {
      key: 'ai_agents.cost_ceiling_zar_cents_per_day',
      type: 'number',
      label: 'Daily AI Cost Ceiling (ZAR cents)',
      placeholder: '5000',
      required: false,
      // enforced by guardUsage() in lib/usage/guard.ts; default from billing_plans.limits
    },
  ],

  emitted_events: [
    { event_type: 'agent.session_completed', description: 'Agent run completed successfully; tokens and cost recorded in agent_sessions' },
    { event_type: 'agent.cost_ceiling_breached', description: 'Org hit daily AI cost ceiling; subsequent agent calls rejected with CostCeilingExceededError' },
    { event_type: 'agent.aborted', description: 'Agent run aborted mid-stream (rate limit, credit exhaustion, or abort signal)' },
  ],

  // AI agents are not approval-gated themselves; approvals attach to actions agents propose,
  // owned by the module that handles the resulting action (e.g. damage_charge owned by accommodation)
  approval_actions: [],

  telegram_callbacks: [],

  // AI usage is metered via usage_events and ai_usage_ledger, not invoice lines
  billing_line_types: [],
}
