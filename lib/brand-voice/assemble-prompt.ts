/**
 * Brand Voice Prompt Assembler (VOICE-01, VOICE-02)
 * Composes wizard inputs into a structured brand voice document.
 *
 * OUTPUT: Unpadded, unscrubbed string. The save route applies sequencing:
 *   scrubPII(assembleBrandVoicePrompt(input, name)) → padToCacheFloor(scrubbed)
 *
 * Padding happens AFTER scrubbing so the stable padding text is never contaminated
 * with PII from the assembled doc.
 */

import type { BrandVoiceInput } from './wizard-questions'

/**
 * Assemble a structured brand voice prompt from wizard inputs.
 *
 * @param input   Validated wizard input (BrandVoiceInputSchema)
 * @param businessName  The org's business name from client_profiles or user org
 * @returns Unpadded, unscrubbed brand voice document
 */
export function assembleBrandVoicePrompt(
  input: BrandVoiceInput,
  businessName: string,
): string {
  const ctx = input.scrapedContext

  const lines: string[] = [
    `BRAND VOICE — ${businessName}`,
    '',
  ]

  // Website context (if scraped)
  if (ctx) {
    const websiteCtx: string[] = []
    if (ctx.title) websiteCtx.push(`Title: ${ctx.title}`)
    if (ctx.h1) websiteCtx.push(`H1: ${ctx.h1}`)
    if (ctx.description) websiteCtx.push(`Description: ${ctx.description}`)
    if (ctx.aboutText) websiteCtx.push(`About: ${ctx.aboutText}`)
    if (websiteCtx.length > 0) {
      lines.push('WEBSITE CONTEXT:')
      lines.push(...websiteCtx)
      lines.push('')
    }
  }

  // Core brand voice content
  lines.push(`TONE: ${input.tone.join(', ')}`)
  lines.push('')
  lines.push('AUDIENCE:')
  lines.push(input.audience)
  lines.push('')
  lines.push('DIFFERENTIATOR:')
  lines.push(input.differentiator)
  lines.push('')

  if (input.example_phrases.length > 0) {
    lines.push('PHRASES THAT SOUND LIKE US:')
    for (const phrase of input.example_phrases) {
      lines.push(`- ${phrase}`)
    }
    lines.push('')
  }

  if (input.forbidden_topics.length > 0) {
    lines.push('NEVER USE OR MENTION:')
    for (const topic of input.forbidden_topics) {
      lines.push(`- ${topic}`)
    }
    lines.push('')
  }

  lines.push('BRAND VALUES:')
  lines.push(
    `This brand communicates with a ${input.tone.join(' and ')} voice. ` +
    `Target audience: ${input.audience} ` +
    `Differentiator: ${input.differentiator}`,
  )

  return lines.join('\n')
}
