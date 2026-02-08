// Content Studio Types — Email & Social content generation

export interface EmailGenerationInput {
  goal: 'welcome' | 'promotion' | 'newsletter' | 'follow_up' | 're_engagement' | 'announcement' | 'event_invite'
  tone: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'inspirational' | 'urgent'
  audience: string
  product?: string
  offerDetails?: string
  bulletPoints?: string[]
  objections?: string[]
  ctaUrl?: string
  brandDo?: string[]
  brandDont?: string[]
}

export interface EmailGenerationOutput {
  subjectLines: string[]
  shortBody: string
  longBody: string
  followUpSuggestion: string
}

export interface SocialGenerationInput {
  platforms: ('linkedin' | 'facebook' | 'instagram' | 'twitter')[]
  goal: 'awareness' | 'engagement' | 'traffic' | 'leads' | 'sales' | 'community'
  tone: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'inspirational' | 'humorous'
  audience: string
  topic: string
  eventDate?: string
  location?: string
  price?: string
  link?: string
  hashtagPreferences?: string[]
}

export interface SocialPlatformOutput {
  platform: string
  variants: string[]
  hashtags: string[]
  imagePrompt: string
  ctaSuggestion: string
  bestPostTime: string
}

export interface SocialGenerationOutput {
  platforms: SocialPlatformOutput[]
}
