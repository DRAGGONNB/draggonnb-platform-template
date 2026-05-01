export interface ModuleCardContent {
  id: string
  title: string
  valueProp: string
  bullets: [string, string, string]
  learnMoreHref: string
  icon: string
  tone: 'crimson' | 'charcoal' | 'amber' | 'blue' | 'pink' | 'emerald'
  external?: boolean
}

export const MODULE_CARDS: ModuleCardContent[] = [
  {
    id: 'accommodation',
    title: 'Accommodation',
    valueProp: 'Run your lodge, B&B or guesthouse on autopilot.',
    bullets: [
      'AI quoting + concierge across email and WhatsApp',
      'PayFast deposits with automatic reminders',
      'Per-unit costs, occupancy and stock tracked nightly',
    ],
    learnMoreHref: '#accommodation-detail',
    icon: 'Hotel',
    tone: 'crimson',
  },
  {
    id: 'restaurant',
    title: 'Restaurant',
    valueProp: 'POS, floor plan, SOPs and QR menus in one shift-ready system.',
    bullets: [
      'Konva visual floor plan with PIN-auth POS sessions',
      'Block-based SOPs and shift checklists for staff',
      'PayFast bill payments + temperature compliance logs',
    ],
    learnMoreHref: '#restaurant-detail',
    icon: 'UtensilsCrossed',
    tone: 'amber',
  },
  {
    id: 'trophy-os',
    title: 'Trophy OS',
    valueProp: 'The operating system for Southern African hunting operations.',
    bullets: [
      'Quota and DEA permit tracking per species and area',
      'Safari pipeline with deposits, trophy log and firearm register',
      'Supplier coordination — taxidermist, butcher, logistics',
    ],
    learnMoreHref: 'https://trophyos.co.za',
    icon: 'Crosshair',
    tone: 'charcoal',
    external: true,
  },
  {
    id: 'elijah',
    title: 'Elijah Community Safety',
    valueProp: 'Daily roll call, incidents and fire response for residential estates.',
    bullets: [
      'WhatsApp roll call with grace-period escalation',
      'Fire dispatch routes nearest water points and gate codes',
      'Section-based households with control-room oversight',
    ],
    learnMoreHref: '#elijah-detail',
    icon: 'Shield',
    tone: 'blue',
  },
  {
    id: 'crm-campaign',
    title: 'CRM + Campaign Studio',
    valueProp: 'Pipeline, AI follow-ups and multi-channel campaigns in one CRM.',
    bullets: [
      'Easy view: AI-curated follow-ups, stale deals and hot leads',
      'AI-drafted email + SMS campaigns with brand-safety review',
      'Nightly engagement scoring and one-click approve actions',
    ],
    learnMoreHref: '#crm-campaign-detail',
    icon: 'Users',
    tone: 'pink',
  },
  {
    id: 'other',
    title: 'Content Studio + AI Agents',
    valueProp: 'Brand-voice content, autopilot scheduling and on-demand AI agents.',
    bullets: [
      'AI content for social, email and long-form in your brand voice',
      'Autopilot weekly content scheduler across activated channels',
      'Cost-aware AI usage tracked per organisation, per agent',
    ],
    learnMoreHref: '#other-detail',
    icon: 'Sparkles',
    tone: 'emerald',
  },
]
