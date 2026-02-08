interface StatCardProps {
  icon: string
  value: string | number
  label: string
  trend?: string
  trendDirection?: 'up' | 'down'
}

export function StatCard({ icon, value, label, trend, trendDirection = 'up' }: StatCardProps) {
  return (
    <div className="glass-card rounded-xl p-6 text-center hover-lift hover-glow animate-fade-scale">
      <div className="mb-3 text-3xl animate-bounce-subtle">{icon}</div>
      <div className="mb-1 text-4xl font-bold" style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}>
        {value}
      </div>
      <div className="text-xs opacity-90">{label}</div>
      {trend && (
        <div className={`mt-2 text-[11px] font-medium ${trendDirection === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          {trend} {trendDirection === 'up' ? '↑' : '↓'}
        </div>
      )}
    </div>
  )
}
