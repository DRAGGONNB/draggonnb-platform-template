// Platform-aware social media prompt structures

export const PLATFORM_GUIDELINES: Record<string, string> = {
  linkedin: `LinkedIn Guidelines:
- Professional tone, thought leadership focus
- Optimal length: 1300-2000 characters
- Use line breaks for readability
- Start with a hook (question or bold statement)
- End with a question to drive engagement
- 3-5 relevant hashtags at the end
- Best times: Tue-Thu 7-8am, 12pm, 5-6pm`,

  facebook: `Facebook Guidelines:
- Conversational, community-focused tone
- Optimal length: 100-250 characters for engagement
- Use emojis sparingly but effectively
- Ask questions to drive comments
- Include a clear CTA
- 1-3 hashtags maximum
- Best times: Wed 11am-1pm, weekends 12-1pm`,

  instagram: `Instagram Guidelines:
- Visual-first, caption supports the image
- Optimal length: 138-150 characters for feed
- Front-load the important message
- Use relevant emojis
- 10-20 hashtags (mix of popular and niche)
- Include image prompt for visual content
- Best times: Mon-Fri 11am-1pm, 7-9pm`,

  twitter: `Twitter/X Guidelines:
- Concise, punchy, shareable
- Maximum 280 characters
- Use threading for longer content
- 1-2 hashtags maximum
- Include a hook that stops the scroll
- Best times: Mon-Fri 8am-10am, 6-9pm`,
}

export const SOCIAL_GOAL_CONTEXT: Record<string, string> = {
  awareness: 'Focus on reach and brand visibility. Use shareable, educational content.',
  engagement: 'Focus on driving comments, likes, and shares. Ask questions, create polls, start discussions.',
  traffic: 'Focus on driving clicks to a URL. Use compelling hooks and clear CTAs.',
  leads: 'Focus on capturing contact information. Offer value in exchange for engagement.',
  sales: 'Focus on driving purchases. Highlight benefits, social proof, and urgency.',
  community: 'Focus on building belonging. Share behind-the-scenes, celebrate milestones, spotlight members.',
}
