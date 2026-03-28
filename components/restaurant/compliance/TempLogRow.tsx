import type { TempStatus, EquipmentType } from '@/lib/restaurant/types'

interface TempLogRowProps {
  log: {
    id: string
    equipment_name: string
    equipment_type: EquipmentType
    temperature: number
    status: TempStatus
    logged_at: string
    corrective_action?: string | null
    restaurant_staff?: { display_name: string } | null
  }
}

const STATUS_COLORS: Record<TempStatus, string> = {
  ok: 'bg-green-900/40 text-green-400',
  warning: 'bg-amber-900/40 text-amber-400',
  critical: 'bg-red-900/40 text-red-400',
}

const STATUS_LABELS: Record<TempStatus, string> = {
  ok: 'OK',
  warning: 'Warning',
  critical: 'Critical',
}

function formatLogTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function TempLogRow({ log }: TempLogRowProps) {
  const isCritical = log.status === 'critical'
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0 ${
        isCritical ? 'border-l-2 border-l-red-500' : ''
      }`}
    >
      <span className="text-sm font-mono text-gray-400 w-12 shrink-0 pt-0.5">
        {formatLogTime(log.logged_at)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{log.equipment_name}</p>
        <p className="text-xs text-gray-500 capitalize">{log.equipment_type.replace('_', ' ')}</p>
        {log.corrective_action && (
          <p className="text-xs text-amber-400 mt-1 truncate">{log.corrective_action}</p>
        )}
        {log.restaurant_staff && (
          <p className="text-xs text-gray-600 mt-0.5">{log.restaurant_staff.display_name}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-sm font-mono font-medium">
          {log.temperature > 0 ? '+' : ''}{log.temperature}&deg;C
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[log.status]}`}>
          {STATUS_LABELS[log.status]}
        </span>
      </div>
    </div>
  )
}
