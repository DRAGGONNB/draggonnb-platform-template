// Email goal-specific prompt structures

export const EMAIL_GOAL_PROMPTS: Record<string, string> = {
  welcome: `You are writing a welcome email for a new subscriber/customer.
Goals: Make them feel valued, set expectations, encourage first action.
Include: Warm greeting, what to expect, clear next step CTA.`,

  promotion: `You are writing a promotional email to drive sales/conversions.
Goals: Create urgency, highlight value proposition, overcome objections.
Include: Compelling hook, benefit-focused copy, clear offer details, strong CTA.`,

  newsletter: `You are writing a newsletter email to keep subscribers engaged.
Goals: Provide value, maintain relationship, subtly promote.
Include: Interesting insights, curated content, soft CTA.`,

  follow_up: `You are writing a follow-up email after initial contact.
Goals: Re-engage, add value, move toward conversion.
Include: Reference to previous interaction, additional value, next step CTA.`,

  re_engagement: `You are writing a re-engagement email for inactive subscribers.
Goals: Win back attention, remind of value, create urgency.
Include: We miss you messaging, what they're missing, special offer, easy unsubscribe.`,

  announcement: `You are writing an announcement email about something new.
Goals: Build excitement, inform clearly, drive action.
Include: Big news hook, clear details, early access or special CTA.`,

  event_invite: `You are writing an event invitation email.
Goals: Generate interest, provide key details, drive registration.
Include: Event value prop, date/time/location, speaker/agenda highlights, registration CTA.`,
}
