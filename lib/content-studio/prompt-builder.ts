import type { EmailGenerationInput, SocialGenerationInput } from './types'
import { EMAIL_GOAL_PROMPTS } from './email-templates'
import { PLATFORM_GUIDELINES, SOCIAL_GOAL_CONTEXT } from './social-templates'

export function buildEmailPrompt(input: EmailGenerationInput): string {
  const goalPrompt = EMAIL_GOAL_PROMPTS[input.goal] || EMAIL_GOAL_PROMPTS.promotion

  const sections = [
    goalPrompt,
    '',
    `Tone: ${input.tone}`,
    `Target Audience: ${input.audience}`,
  ]

  if (input.product) sections.push(`Product/Service: ${input.product}`)
  if (input.offerDetails) sections.push(`Offer Details: ${input.offerDetails}`)
  if (input.bulletPoints?.length) sections.push(`Key Points:\n${input.bulletPoints.map(b => `- ${b}`).join('\n')}`)
  if (input.objections?.length) sections.push(`Common Objections to Address:\n${input.objections.map(o => `- ${o}`).join('\n')}`)
  if (input.ctaUrl) sections.push(`CTA URL: ${input.ctaUrl}`)
  if (input.brandDo?.length) sections.push(`Brand Voice DO: ${input.brandDo.join(', ')}`)
  if (input.brandDont?.length) sections.push(`Brand Voice DON'T: ${input.brandDont.join(', ')}`)

  sections.push('')
  sections.push(`IMPORTANT: Respond with a JSON object in this exact format (no markdown, no code fences):
{
  "subjectLines": ["subject1", "subject2", "subject3", "subject4", "subject5"],
  "shortBody": "short email body (2-3 paragraphs)",
  "longBody": "longer email body (4-6 paragraphs with more detail)",
  "followUpSuggestion": "suggested follow-up email topic and timing"
}`)

  return sections.join('\n')
}

export function buildSocialPrompt(input: SocialGenerationInput): string {
  const goalContext = SOCIAL_GOAL_CONTEXT[input.goal] || SOCIAL_GOAL_CONTEXT.awareness

  const platformGuidelines = input.platforms
    .map(p => PLATFORM_GUIDELINES[p])
    .filter(Boolean)
    .join('\n\n')

  const sections = [
    `Create social media content for the following platforms: ${input.platforms.join(', ')}`,
    '',
    `Topic: ${input.topic}`,
    `Goal: ${input.goal} - ${goalContext}`,
    `Tone: ${input.tone}`,
    `Target Audience: ${input.audience}`,
  ]

  if (input.eventDate) sections.push(`Event Date: ${input.eventDate}`)
  if (input.location) sections.push(`Location: ${input.location}`)
  if (input.price) sections.push(`Price: ${input.price}`)
  if (input.link) sections.push(`Link: ${input.link}`)
  if (input.hashtagPreferences?.length) sections.push(`Preferred Hashtags: ${input.hashtagPreferences.join(', ')}`)

  sections.push('')
  sections.push('Platform-specific guidelines:')
  sections.push(platformGuidelines)

  sections.push('')
  sections.push(`IMPORTANT: Respond with a JSON object in this exact format (no markdown, no code fences):
{
  "platforms": [
    {
      "platform": "platform_name",
      "variants": ["variant1", "variant2", "variant3"],
      "hashtags": ["hashtag1", "hashtag2"],
      "imagePrompt": "description of ideal image to accompany this post",
      "ctaSuggestion": "suggested call to action",
      "bestPostTime": "recommended posting time"
    }
  ]
}

Generate 3 variants per platform. Each variant should be a complete, ready-to-post piece of content.`)

  return sections.join('\n')
}
