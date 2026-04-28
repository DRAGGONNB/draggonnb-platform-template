/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkFeatureAccess,
  normalizeTier,
  TIER_LIMITS,
  type Feature,
  type UsageMetric,
} from '@/lib/tier/feature-gate'

// Mock the admin client for async functions
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('Feature Gate System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('normalizeTier()', () => {
    it('maps starter to core', () => {
      expect(normalizeTier('starter')).toBe('core')
    })

    it('maps professional to growth', () => {
      expect(normalizeTier('professional')).toBe('growth')
    })

    it('maps enterprise to scale', () => {
      expect(normalizeTier('enterprise')).toBe('scale')
    })

    it('returns tier unchanged when no alias exists', () => {
      expect(normalizeTier('core')).toBe('core')
      expect(normalizeTier('growth')).toBe('growth')
      expect(normalizeTier('scale')).toBe('scale')
    })
  })

  describe('TIER_LIMITS', () => {
    it('core tier has correct limits', () => {
      expect(TIER_LIMITS.core.social_posts).toBe(30)
      expect(TIER_LIMITS.core.ai_generations).toBe(50)
      expect(TIER_LIMITS.core.email_sends).toBe(1000)
      expect(TIER_LIMITS.core.agent_invocations).toBe(10)
      expect(TIER_LIMITS.core.autopilot_runs).toBe(2)
    })

    it('growth tier has higher limits', () => {
      expect(TIER_LIMITS.growth.social_posts).toBe(100)
      expect(TIER_LIMITS.growth.ai_generations).toBe(200)
      expect(TIER_LIMITS.growth.email_sends).toBe(10000)
      expect(TIER_LIMITS.growth.agent_invocations).toBe(50)
      expect(TIER_LIMITS.growth.autopilot_runs).toBe(4)
    })

    it('scale tier has unlimited or very high limits', () => {
      expect(TIER_LIMITS.scale.social_posts).toBe(Infinity)
      expect(TIER_LIMITS.scale.ai_generations).toBe(Infinity)
      expect(TIER_LIMITS.scale.email_sends).toBe(Infinity)
      expect(TIER_LIMITS.scale.agent_invocations).toBe(1000)
      expect(TIER_LIMITS.scale.autopilot_runs).toBe(Infinity)
    })
  })

  describe('checkFeatureAccess()', () => {
    // Core tier features
    const coreFeatures: Feature[] = [
      'social_posts', 'ai_generations', 'email_sends',
      'social_accounts', 'team_users', 'custom_automations',
      'ai_agents', 'business_autopilot',
    ]

    // Growth tier features (minimum)
    const growthFeatures: Feature[] = [
      'ab_testing', 'smart_segmentation', 'lead_pipeline',
      'advanced_analytics', 'accommodation_module',
    ]

    // Scale tier features (minimum)
    const scaleFeatures: Feature[] = [
      'white_label', 'api_access', 'custom_integrations',
    ]

    it('allows core features for core tier', () => {
      for (const feature of coreFeatures) {
        const result = checkFeatureAccess('core', feature)
        expect(result.allowed).toBe(true)
      }
    })

    it('blocks growth features for core tier', () => {
      for (const feature of growthFeatures) {
        const result = checkFeatureAccess('core', feature)
        expect(result.allowed).toBe(false)
        expect(result.upgradeRequired).toBe('growth')
        expect(result.reason).toContain('growth tier or above')
      }
    })

    it('blocks scale features for core tier', () => {
      for (const feature of scaleFeatures) {
        const result = checkFeatureAccess('core', feature)
        expect(result.allowed).toBe(false)
        expect(result.upgradeRequired).toBe('scale')
      }
    })

    it('allows core + growth features for growth tier', () => {
      for (const feature of [...coreFeatures, ...growthFeatures]) {
        const result = checkFeatureAccess('growth', feature)
        expect(result.allowed).toBe(true)
      }
    })

    it('blocks scale features for growth tier', () => {
      for (const feature of scaleFeatures) {
        const result = checkFeatureAccess('growth', feature)
        expect(result.allowed).toBe(false)
        expect(result.upgradeRequired).toBe('scale')
      }
    })

    it('allows all features for scale tier', () => {
      for (const feature of [...coreFeatures, ...growthFeatures, ...scaleFeatures]) {
        const result = checkFeatureAccess('scale', feature)
        expect(result.allowed).toBe(true)
      }
    })

    it('handles tier aliases correctly', () => {
      // starter = core
      expect(checkFeatureAccess('starter', 'social_posts').allowed).toBe(true)
      expect(checkFeatureAccess('starter', 'accommodation_module').allowed).toBe(false)

      // professional = growth
      expect(checkFeatureAccess('professional', 'accommodation_module').allowed).toBe(true)
      expect(checkFeatureAccess('professional', 'white_label').allowed).toBe(false)

      // enterprise = scale
      expect(checkFeatureAccess('enterprise', 'white_label').allowed).toBe(true)
    })

    it('blocks unknown tier for all features', () => {
      const result = checkFeatureAccess('unknown', 'social_posts')
      expect(result.allowed).toBe(false)
    })

    it('accommodation_module requires growth tier', () => {
      expect(checkFeatureAccess('core', 'accommodation_module').allowed).toBe(false)
      expect(checkFeatureAccess('core', 'accommodation_module').upgradeRequired).toBe('growth')
      expect(checkFeatureAccess('growth', 'accommodation_module').allowed).toBe(true)
      expect(checkFeatureAccess('scale', 'accommodation_module').allowed).toBe(true)
    })
  })

  // checkUsage() and incrementUsage() removed in USAGE-13 (plan 10-02).
  // client_usage_metrics table dropped in migration 35.
  // All metered routes now use guardUsage() from lib/usage/guard.ts.

  describe('getGenerationLimit()', () => {
    it('returns correct limit for each tier', async () => {
      const { getGenerationLimit } = await import('@/lib/tier/feature-gate')
      expect(getGenerationLimit('core')).toBe(50)
      expect(getGenerationLimit('growth')).toBe(200)
      expect(getGenerationLimit('scale')).toBe(Infinity)
    })

    it('handles aliases', async () => {
      const { getGenerationLimit } = await import('@/lib/tier/feature-gate')
      expect(getGenerationLimit('starter')).toBe(50)
      expect(getGenerationLimit('professional')).toBe(200)
      expect(getGenerationLimit('enterprise')).toBe(Infinity)
    })

    it('returns default 50 for unknown tier', async () => {
      const { getGenerationLimit } = await import('@/lib/tier/feature-gate')
      expect(getGenerationLimit('unknown')).toBe(50)
    })
  })
})
