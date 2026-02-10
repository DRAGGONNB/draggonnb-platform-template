interface StatCardProps {
  icon: string
  value: string | number
  label: string
  trend?: string
  trendDirection?: 'up' | 'down' | 'neutral'
}

export function StatCard({ icon, value, label, trend, trendDirection = 'up' }: StatCardProps) {
  const trendColor = trendDirection === 'up' ? 'text-green-400' : trendDirection === 'down' ? 'text-red-400' : 'text-gray-400'
  const trendIcon = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : ''

  return (
    <div className="glass-card rounded-xl p-6 text-center hover-lift hover-glow animate-fade-scale">
      <div className="mb-3 text-3xl animate-bounce-subtle">{icon}</div>
      <div className="mb-1 text-4xl font-bold" style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}>
        {value}
      </div>
      <div className="text-xs opacity-90">{label}</div>
      {trend && (
        <div className={`mt-2 text-[11px] font-medium ${trendColor}`}>
          {trend} {trendIcon}
        </div>
      )}
    </div>
  )
}
