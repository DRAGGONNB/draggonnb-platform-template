export function genericFollowupTemplate(contact: { firstName: string | null }): { subject: string; html: string; text: string } {
  const subject = 'Following up with you'
  const text = `Hi ${contact.firstName ?? 'there'},\n\nI wanted to follow up on our previous conversation. Do you have a few minutes this week to chat?\n\nBest,\n[Sender]`
  return { subject, html: text.replace(/\n/g, '<br>'), text }
}

export async function composeFollowupEmail(opts: {
  orgName: string
  contact: { firstName: string | null; lastName: string | null }
  brandVoicePrompt: string | null
}): Promise<{ subject: string; html: string; text: string }> {
  // v3.0 generic + tone-prefix path. Real per-org Sonnet composition deferred to v3.1.
  const firstName = opts.contact.firstName ?? 'there'
  const subject = `Following up — ${firstName}`
  const text = opts.brandVoicePrompt
    ? `Hi ${firstName},\n\nWanted to check in on our last conversation. Here's a quick recap and a couple of next steps we can take when you're ready.\n\n[Generic body in tenant brand voice tone — single tone-prefix line; full personalization deferred to v3.1.]\n\nLet me know if you'd like to revisit.\n\nBest,\n${opts.orgName}`
    : `Hi ${firstName},\n\nWanted to check in on our last conversation. Let me know if you'd like to revisit when you have a moment.\n\nBest,\n${opts.orgName}`
  const html = text.replace(/\n/g, '<br>')
  return { subject, html, text }
}

export async function composeHotLeadPitchEmail(opts: {
  orgName: string
  contact: { firstName: string | null; lastName: string | null }
  dealName: string
  brandVoicePrompt: string | null
}): Promise<{ subject: string; html: string; text: string }> {
  // v3.0 high-value pitch template. Brand-voice path uses org name as sign-off.
  const firstName = opts.contact.firstName ?? 'there'
  const subject = `Ready to move forward — ${opts.dealName}`
  const text = opts.brandVoicePrompt
    ? `Hi ${firstName},\n\nYou've shown strong interest in ${opts.dealName} and we'd love to keep momentum going. Our team is ready to walk you through the next steps whenever you are.\n\n[High-value pitch in tenant brand voice — full personalization deferred to v3.1.]\n\nLet's connect this week.\n\nBest,\n${opts.orgName}`
    : `Hi ${firstName},\n\nThank you for your interest in ${opts.dealName}. We believe this is a great fit for your needs and would love to discuss next steps.\n\nCould we schedule a call this week?\n\nBest,\n${opts.orgName}`
  const html = text.replace(/\n/g, '<br>')
  return { subject, html, text }
}
