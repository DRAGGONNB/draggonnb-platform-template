// Elijah Module - Constants

export const ELIJAH_MODULE_ID = 'security_ops'

// Severity colors for UI badges
export const SEVERITY_COLORS = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
} as const

// Incident status colors
export const INCIDENT_STATUS_COLORS = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
} as const

// Fire status colors
export const FIRE_STATUS_COLORS = {
  reported: 'bg-red-600 text-white',
  active: 'bg-red-500 text-white',
  contained: 'bg-orange-500 text-white',
  extinguished: 'bg-green-500 text-white',
  monitoring: 'bg-blue-500 text-white',
} as const

// Water point status colors (for map markers)
export const WATER_POINT_STATUS_COLORS = {
  operational: '#22c55e', // green
  low: '#f59e0b',        // amber
  empty: '#ef4444',      // red
  maintenance: '#6b7280', // grey
  unknown: '#9ca3af',    // light grey
} as const

// Checkin status colors
export const CHECKIN_STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-600',
  safe: 'bg-green-100 text-green-700',
  help: 'bg-red-100 text-red-700',
  away: 'bg-blue-100 text-blue-700',
  missed: 'bg-orange-100 text-orange-700',
} as const

// Patrol status colors
export const PATROL_STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
} as const

// Escalation tiers (roll call)
export const ESCALATION_TIERS = {
  1: { delay_minutes: 0, action: 'reminder_to_household' },
  2: { delay_minutes: 5, action: 'notify_buddy_household' },
  3: { delay_minutes: 10, action: 'alert_dispatcher' },
  4: { delay_minutes: 15, action: 'create_welfare_check_incident' },
} as const

// Incident type labels
export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  break_in: 'Break-in',
  fire: 'Fire',
  medical: 'Medical Emergency',
  suspicious_activity: 'Suspicious Activity',
  noise: 'Noise Complaint',
  infrastructure: 'Infrastructure Issue',
  other: 'Other',
}

// Water point type labels
export const WATER_POINT_TYPE_LABELS: Record<string, string> = {
  dam: 'Dam',
  hydrant: 'Hydrant',
  tank: 'Water Tank',
  borehole: 'Borehole',
  pool: 'Swimming Pool',
  river: 'River',
}

// Fire type labels
export const FIRE_TYPE_LABELS: Record<string, string> = {
  veld: 'Veld Fire',
  structural: 'Structural Fire',
  vehicle: 'Vehicle Fire',
  electrical: 'Electrical Fire',
  other: 'Other',
}

// Equipment type labels
export const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  tanker: 'Water Tanker',
  bakkie_skid: 'Bakkie Skid Unit',
  pump: 'Pump',
  trailer: 'Trailer',
  beaters: 'Fire Beaters',
  hose_reel: 'Hose Reel',
  extinguisher: 'Fire Extinguisher',
}

// Responder group type labels
export const GROUP_TYPE_LABELS: Record<string, string> = {
  community_team: 'Community Team',
  volunteer_brigade: 'Volunteer Brigade',
  municipal_fd: 'Municipal Fire Dept',
  private_contractor: 'Private Contractor',
}

// Elijah sidebar navigation (used by Elijah-specific sub-sidebar)
export const ELIJAH_NAV = [
  { name: 'Dashboard', href: '/elijah', icon: 'LayoutDashboard' },
  { name: 'Incidents', href: '/elijah/incidents', icon: 'AlertTriangle' },
  { name: 'Roll Call', href: '/elijah/rollcall', icon: 'ClipboardCheck' },
  { name: 'Fire Ops', href: '/elijah/fire', icon: 'Flame' },
  { name: 'Fire Map', href: '/elijah/fire/map', icon: 'Map' },
  { name: 'Water Points', href: '/elijah/fire/water-points', icon: 'Droplets' },
  { name: 'Farms', href: '/elijah/fire/farms', icon: 'Wheat' },
  { name: 'Groups', href: '/elijah/fire/groups', icon: 'Users' },
  { name: 'Equipment', href: '/elijah/fire/equipment', icon: 'Wrench' },
  { name: 'Patrols', href: '/elijah/patrols', icon: 'Shield' },
  { name: 'Members', href: '/elijah/members', icon: 'UserCheck' },
  { name: 'SOPs', href: '/elijah/sops', icon: 'FileText' },
  { name: 'Settings', href: '/elijah/settings', icon: 'Settings' },
] as const
