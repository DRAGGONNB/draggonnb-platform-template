/**
 * Brand Voice Wizard Questions and Schema (VOICE-01)
 * Defines the 5-question wizard structure and the Zod validation schema
 * consumed by the save route.
 */

import { z } from 'zod'
import type { ScrapedBrandContext } from './scraper'

// ============================================================================
// SCRAPED CONTEXT SCHEMA
// ============================================================================

export const ScrapedBrandContextSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  h1: z.string().nullable(),
  aboutText: z.string().nullable(),
  logoAlt: z.string().nullable(),
})

// ============================================================================
// WIZARD QUESTIONS
// ============================================================================

export const WIZARD_QUESTIONS = [
  {
    id: 'tone' as const,
    label: 'How would you describe your brand tone?',
    input: 'multiselect_or_custom' as const,
    options: [
      'Professional',
      'Friendly',
      'Bold',
      'Inspiring',
      'Empathetic',
      'Authoritative',
      'Playful',
      'Warm',
      'Direct',
      'Educational',
    ],
  },
  {
    id: 'audience' as const,
    label: 'Describe your ideal target audience',
    input: 'textarea' as const,
    maxLength: 500,
    placeholder:
      'E.g., South African small business owners aged 30–50 who need to automate their marketing without hiring a full team.',
  },
  {
    id: 'differentiator' as const,
    label: 'What makes your business different from competitors?',
    input: 'textarea' as const,
    maxLength: 500,
    placeholder:
      'E.g., We combine hands-on local expertise with AI automation — our clients get a full marketing team at the cost of one part-time employee.',
  },
  {
    id: 'example_phrases' as const,
    label: 'Phrases that sound like your brand (up to 5)',
    input: 'textarea_list' as const,
    maxItems: 5,
    placeholder:
      'E.g., "Let\'s build something great together", "Built for South African business", "Simple, powerful, local"',
  },
  {
    id: 'forbidden_topics' as const,
    label: 'Topics or words your brand should NEVER use (up to 10)',
    input: 'textarea_list' as const,
    maxItems: 10,
    placeholder:
      'E.g., "cheap", "basic", competitor brand names, religious or political content',
  },
] as const

// ============================================================================
// INPUT SCHEMA
// ============================================================================

export const BrandVoiceInputSchema = z.object({
  scrapedContext: ScrapedBrandContextSchema.optional(),
  tone: z.array(z.string()).min(1, 'Select at least one tone'),
  audience: z.string().min(20, 'Audience must be at least 20 characters').max(500),
  differentiator: z.string().min(20, 'Differentiator must be at least 20 characters').max(500),
  example_phrases: z.array(z.string()).max(5),
  forbidden_topics: z.array(z.string()).max(10),
})

export type BrandVoiceInput = z.infer<typeof BrandVoiceInputSchema>
