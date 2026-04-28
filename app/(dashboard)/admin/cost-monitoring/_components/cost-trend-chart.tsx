'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface TrendPoint {
  date: string
  costZarCents: number
}

interface CostTrendChartProps {
  trend: TrendPoint[]
  orgName?: string
}

export function CostTrendChart({ trend, orgName }: CostTrendChartProps) {
  if (trend.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-500">
        No daily cost data yet for {orgName ?? 'this org'}.
        Data will appear after the nightly rollup cron runs (02:00 SAST).
      </div>
    )
  }

  const data = trend.map((t) => ({
    // Show MM-DD for compactness
    date: t.date.slice(5),
    costRand: t.costZarCents / 100,
  }))

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `R${v.toFixed(0)}`}
            width={56}
          />
          <Tooltip
            formatter={(v: number) => [`R${v.toFixed(2)}`, 'Cost']}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <Line
            type="monotone"
            dataKey="costRand"
            stroke="#6B1420"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#6B1420' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
