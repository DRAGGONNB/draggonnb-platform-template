'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, Users, ClipboardList, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Stats {
  properties: number
  inquiries: Record<string, number>
  guests: number
}

export default function AccommodationOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [propsRes, inqRes, guestsRes] = await Promise.all([
          fetch('/api/accommodation/properties'),
          fetch('/api/accommodation/inquiries'),
          fetch('/api/accommodation/guests'),
        ])

        if (propsRes.status === 403) {
          setError('Accommodation module requires Growth tier or above. Upgrade to access.')
          return
        }

        const [propsData, inqData, guestsData] = await Promise.all([
          propsRes.json(),
          inqRes.json(),
          guestsRes.json(),
        ])

        // Count inquiries by stage
        const stageCounts: Record<string, number> = {}
        for (const inq of inqData.inquiries || []) {
          stageCounts[inq.stage] = (stageCounts[inq.stage] || 0) + 1
        }

        setStats({
          properties: propsData.total || 0,
          inquiries: stageCounts,
          guests: guestsData.total || 0,
        })
      } catch {
        setError('Failed to load accommodation data')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="p-6 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  const totalInquiries = Object.values(stats?.inquiries || {}).reduce((a, b) => a + b, 0)
  const activeInquiries = (stats?.inquiries?.new || 0) + (stats?.inquiries?.contacted || 0) + (stats?.inquiries?.quoted || 0) + (stats?.inquiries?.confirmed || 0)

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          Accommodation
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage properties, units, inquiries, and guests
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/accommodation/properties">
          <Card className="hover:border-primary/50 transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.properties || 0}</div>
              <p className="text-xs text-muted-foreground">Active properties</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/accommodation/inquiries">
          <Card className="hover:border-primary/50 transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inquiries</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeInquiries}</div>
              <p className="text-xs text-muted-foreground">{totalInquiries} total, {activeInquiries} active</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/accommodation/guests">
          <Card className="hover:border-primary/50 transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Guests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.guests || 0}</div>
              <p className="text-xs text-muted-foreground">Guest directory</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Inquiry Pipeline Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Inquiry Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {['new', 'contacted', 'quoted', 'confirmed', 'checked_in', 'checked_out', 'closed', 'cancelled'].map((stage) => (
              <div key={stage} className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold">{stats?.inquiries?.[stage] || 0}</div>
                <div className="text-xs text-muted-foreground capitalize">{stage.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
