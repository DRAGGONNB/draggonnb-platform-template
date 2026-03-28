interface Props {
  label: string
  value: string | number
  sublabel?: string
  accent?: boolean
}

export function DashboardStatCard({ label, value, sublabel, accent }: Props) {
  return (
    <div className="bg-[#1E2023] rounded-2xl p-4">
      <p className={`text-3xl font-bold ${accent ? 'text-[#6B1420]' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{label}</p>
      {sublabel && (
        <p className="text-xs text-gray-600 mt-0.5">{sublabel}</p>
      )}
    </div>
  )
}
