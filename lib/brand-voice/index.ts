/**
 * Brand Voice Library — Public Surface
 * Re-exports all public APIs from the brand-voice module.
 */

export { scrapeWebsiteContext } from './scraper'
export type { ScrapedBrandContext } from './scraper'

export { scrubPII } from './pii-scrubber'

export { padToCacheFloor, CACHE_FLOOR_TOKENS, CHARS_PER_TOKEN, FLOOR_CHARS } from './pad-to-cache'

export { assembleBrandVoicePrompt } from './assemble-prompt'

export { buildSystemBlocks, extractOrgIdFromBlocks } from './build-system-blocks'
export type { SystemBlock } from './build-system-blocks'

export { BrandVoiceInputSchema, ScrapedBrandContextSchema, WIZARD_QUESTIONS } from './wizard-questions'
export type { BrandVoiceInput } from './wizard-questions'
