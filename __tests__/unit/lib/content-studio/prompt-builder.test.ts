/** @vitest-environment node */
import { describe, expect, it } from 'vitest'
import { buildEmailPrompt, buildSocialPrompt } from '@/lib/content-studio/prompt-builder'

describe('Content Studio Prompt Builder', () => {
  describe('buildEmailPrompt', () => {
    it('builds a basic email prompt with required fields', () => {
      const prompt = buildEmailPrompt({
        goal: 'promotion',
        tone: 'professional',
        audience: 'SA SME owners',
      })

      expect(prompt).toContain('promotional email')
      expect(prompt).toContain('professional')
      expect(prompt).toContain('SA SME owners')
      expect(prompt).toContain('subjectLines')
      expect(prompt).toContain('shortBody')
      expect(prompt).toContain('longBody')
    })

    it('includes optional fields when provided', () => {
      const prompt = buildEmailPrompt({
        goal: 'welcome',
        tone: 'friendly',
        audience: 'New subscribers',
        product: 'DraggonnB CRM',
        offerDetails: '30% off first month',
        bulletPoints: ['Save time', 'Increase revenue'],
        ctaUrl: 'https://draggonnb.online/signup',
      })

      expect(prompt).toContain('DraggonnB CRM')
      expect(prompt).toContain('30% off')
      expect(prompt).toContain('Save time')
      expect(prompt).toContain('https://draggonnb.online/signup')
    })

    it('includes brand guidelines when provided', () => {
      const prompt = buildEmailPrompt({
        goal: 'newsletter',
        tone: 'casual',
        audience: 'Existing customers',
        brandDo: ['Use active voice', 'Be concise'],
        brandDont: ['Use jargon', 'Be pushy'],
      })

      expect(prompt).toContain('Use active voice')
      expect(prompt).toContain('Use jargon')
    })
  })

  describe('buildSocialPrompt', () => {
    it('builds a basic social prompt with required fields', () => {
      const prompt = buildSocialPrompt({
        platforms: ['linkedin'],
        goal: 'awareness',
        tone: 'professional',
        audience: 'B2B decision makers',
        topic: 'AI in marketing',
      })

      expect(prompt).toContain('linkedin')
      expect(prompt).toContain('AI in marketing')
      expect(prompt).toContain('B2B decision makers')
      expect(prompt).toContain('variants')
      expect(prompt).toContain('LinkedIn Guidelines')
    })

    it('includes multiple platform guidelines', () => {
      const prompt = buildSocialPrompt({
        platforms: ['linkedin', 'instagram', 'twitter'],
        goal: 'engagement',
        tone: 'casual',
        audience: 'Young professionals',
        topic: 'Work-life balance',
      })

      expect(prompt).toContain('LinkedIn Guidelines')
      expect(prompt).toContain('Instagram Guidelines')
      expect(prompt).toContain('Twitter/X Guidelines')
    })

    it('includes optional event details', () => {
      const prompt = buildSocialPrompt({
        platforms: ['facebook'],
        goal: 'traffic',
        tone: 'friendly',
        audience: 'Local business owners',
        topic: 'Networking event',
        eventDate: '2025-03-15',
        location: 'Cape Town',
        link: 'https://example.com/event',
        hashtagPreferences: ['#SABusiness', '#Networking'],
      })

      expect(prompt).toContain('2025-03-15')
      expect(prompt).toContain('Cape Town')
      expect(prompt).toContain('https://example.com/event')
      expect(prompt).toContain('#SABusiness')
    })
  })
})
