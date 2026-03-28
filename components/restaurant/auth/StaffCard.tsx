'use client'

interface StaffCardProps {
  staff: {
    id: string
    display_name: string
    role: string
  }
  selected: boolean
  onClick: () => void
}

const ROLE_LABELS: Record<string, string> = {
  manager: 'Manager',
  waiter: 'Waiter',
  bartender: 'Bartender',
  host: 'Host',
  kitchen: 'Kitchen',
  cashier: 'Cashier',
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1)
}

export function StaffCard({ staff, selected, onClick }: StaffCardProps) {
  const initial = staff.display_name.charAt(0).toUpperCase()

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all active:scale-95 ${
        selected
          ? 'border-[#6B1420] bg-[#6B1420]/15 shadow-[0_0_0_2px_rgba(107,20,32,0.5)]'
          : 'border-white/10 bg-[#3A3C40] hover:border-white/20 hover:bg-[#454749]'
      }`}
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-[#6B1420] flex items-center justify-center">
        <span className="text-white text-lg font-bold">{initial}</span>
      </div>

      {/* Name */}
      <p className="text-white text-sm font-semibold leading-tight text-center max-w-[80px] truncate">
        {staff.display_name}
      </p>

      {/* Role badge */}
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#2D2F33] text-gray-400 uppercase tracking-wide">
        {roleLabel(staff.role)}
      </span>
    </button>
  )
}
