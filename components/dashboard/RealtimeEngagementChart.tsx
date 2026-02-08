'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EngagementChart } from './EngagementChart'

interface EngagementData {
  date: string
  linkedin: number
  facebook: number
  instagram: number
}

interface RealtimeEngagementChartProps {
  initialChartData: EngagementData[]
}

export function RealtimeEngagementChart({ initialChartData }: RealtimeEngagementChartProps) {
  const [chartData, setChartData] = useState(initialChartData)
  const supabase = createClient()

  useEffect(() => {
    setChartData(initialChartData)
  }, [initialChartData])

  useEffect(() => {
    const channel = supabase
      .channel('analytics_snapshots')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'analytics_snapshots' },
        (payload) => {
          console.log('Change received!', payload)
          // Naive implementation: refetch all data on any change.
          // A more advanced implementation would be to update the specific point.
          supabase
            .from('analytics_snapshots')
            .select('*')
            .order('snapshot_date', { ascending: true })
            .limit(7)
            .then(({ data }) => {
              if (data) {
                const newChartData = data.map((snapshot) => ({
                  date: new Date(snapshot.snapshot_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                  }),
                  linkedin: snapshot.linkedin_engagements || 0,
                  facebook: snapshot.facebook_engagements || 0,
                  instagram: snapshot.instagram_engagements || 0,
                }))
                setChartData(newChartData)
              }
            })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return <EngagementChart data={chartData} />
}
