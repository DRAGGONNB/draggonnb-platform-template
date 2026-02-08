'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface EngagementData {
  date: string
  linkedin: number
  facebook: number
  instagram: number
}

interface EngagementChartProps {
  data?: EngagementData[]
}

const defaultData: EngagementData[] = [
  { date: 'Mon', linkedin: 45, facebook: 32, instagram: 28 },
  { date: 'Tue', linkedin: 52, facebook: 38, instagram: 35 },
  { date: 'Wed', linkedin: 48, facebook: 42, instagram: 40 },
  { date: 'Thu', linkedin: 65, facebook: 45, instagram: 38 },
  { date: 'Fri', linkedin: 58, facebook: 50, instagram: 45 },
  { date: 'Sat', linkedin: 42, facebook: 55, instagram: 52 },
  { date: 'Sun', linkedin: 38, facebook: 48, instagram: 48 },
]

export function EngagementChart({ data = defaultData }: EngagementChartProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'audience'>('overview')

  return (
    <div className="card-elevated p-6 animate-fade-scale">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-semibold gradient-text">Engagement Over Time</h3>
        <select className="input-futuristic cursor-pointer px-3 py-1.5 text-xs">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      </div>

      {/* Enhanced Futuristic Tabs */}
      <div className="mb-6 flex gap-8 border-b border-gray-200 dark:border-gray-futuristic-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`tab-futuristic ${activeTab === 'overview' ? 'active' : ''}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`tab-futuristic ${activeTab === 'performance' ? 'active' : ''}`}
        >
          Performance
        </button>
        <button
          onClick={() => setActiveTab('audience')}
          className={`tab-futuristic ${activeTab === 'audience' ? 'active' : ''}`}
        >
          Audience
        </button>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="date" stroke="#6B7280" style={{ fontSize: '12px' }} />
          <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line
            type="monotone"
            dataKey="linkedin"
            stroke="#0077B5"
            strokeWidth={2}
            dot={{ fill: '#0077B5', r: 4 }}
            activeDot={{ r: 6 }}
            name="LinkedIn"
          />
          <Line
            type="monotone"
            dataKey="facebook"
            stroke="#1877F2"
            strokeWidth={2}
            dot={{ fill: '#1877F2', r: 4 }}
            activeDot={{ r: 6 }}
            name="Facebook"
          />
          <Line
            type="monotone"
            dataKey="instagram"
            stroke="#E4405F"
            strokeWidth={2}
            dot={{ fill: '#E4405F', r: 4 }}
            activeDot={{ r: 6 }}
            name="Instagram"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
