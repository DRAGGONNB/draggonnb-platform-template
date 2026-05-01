interface DetailSection {
  id: string
  title: string
  body: string
  outcomes: string[]
}

const DETAIL_SECTIONS: DetailSection[] = [
  {
    id: 'accommodation-detail',
    title: 'Accommodation — built for the lodge owner who runs the front desk',
    body:
      'Run inquiries, bookings, deposits, guest comms and reviews from one platform. Four AI agents — Quoter, Concierge, Reviewer and Pricer — pick up the load that a duty manager cannot. Twelve N8N workflows handle daily briefs, reminders, occupancy snapshots and the WhatsApp queue around the clock.',
    outcomes: [
      'Generate a brand-voice quote in under 60 seconds',
      'Send PayFast deposit links with auto reminders if unpaid',
      'See occupancy, costs and stock per unit per night',
    ],
  },
  {
    id: 'restaurant-detail',
    title: 'Restaurant — POS, floor plan and shift discipline in one app',
    body:
      'Konva-based visual floor plan, PIN-auth POS sessions, block-based SOPs and QR menus combine into a single shift platform. Bills handle splits, voids and PayFast payments. Compliance temperature logs and shift checklists keep the back of house auditable.',
    outcomes: [
      'Open table sessions with one PIN tap',
      'Build SOPs as drag-and-drop blocks staff can run today',
      'Take card and PayFast payments at the table',
    ],
  },
  {
    id: 'elijah-detail',
    title: 'Elijah Community Safety — daily roll call to fire dispatch',
    body:
      'Section-based household roster with daily WhatsApp roll call, configurable grace period, escalation engine to control room, full incident management, fire dispatch with PostGIS-routed nearest water points, and patrol tracking. Built for residential estates and community safety organisations.',
    outcomes: [
      'WhatsApp roll call with SAFE / HELP / AWAY replies',
      'Fire alerts route nearest water points and gate codes',
      'Section coordinators get escalations on non-response',
    ],
  },
  {
    id: 'crm-campaign-detail',
    title: 'CRM + Campaign Studio — pipeline that drafts its own follow-ups',
    body:
      'Easy view shows AI-curated follow-ups, stale deals and hot leads with one-click approve actions. Campaign Studio drafts multi-channel campaigns (email + SMS live, social wired and ready) with brand-safety review and an admin kill switch. Nightly engagement scoring runs at 02:00 SAST.',
    outcomes: [
      'AI follow-up drafts in your brand voice, ready to send',
      'Multi-channel campaigns with brand-safety guardrails',
      'Pipeline view, kanban deals and per-stage metrics',
    ],
  },
  {
    id: 'other-detail',
    title: 'Content Studio + AI Agents — the autopilot layer',
    body:
      'AI content generation across social, email and long-form — all written in your brand voice via the same Anthropic infrastructure. Autopilot mode schedules a week of content across activated channels. Cost-aware AI usage tracked per organisation, per agent, with per-tenant ceilings.',
    outcomes: [
      'Generate brand-voice content for any channel on demand',
      'Autopilot schedules a week of content in advance',
      'AI usage cost-tracked and capped per tenant tier',
    ],
  },
]

export function ModuleDetailSections() {
  return (
    <section className="bg-[#F5F5F6] px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-16">
        {DETAIL_SECTIONS.map((section) => (
          <div key={section.id} id={section.id} className="scroll-mt-24">
            <h3 className="mb-4 font-display text-2xl font-bold text-[#363940] lg:text-3xl">
              {section.title}
            </h3>
            <p className="mb-6 text-base leading-relaxed text-[#363940]/80">{section.body}</p>
            <ul className="space-y-2 text-sm text-[#363940]">
              {section.outcomes.map((outcome) => (
                <li key={outcome} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6B1420]" aria-hidden="true" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
