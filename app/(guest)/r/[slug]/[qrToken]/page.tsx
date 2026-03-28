import { createAdminClient } from '@/lib/supabase/admin'
import { LiveBillView } from '@/components/restaurant/livetab/LiveBillView'
import { WaitingScreen } from '@/components/restaurant/livetab/WaitingScreen'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface Props {
  params: { slug: string; qrToken: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: 'Your Live Bill',
    description: 'View your live bill and pay securely',
    other: { 'theme-color': '#2D2F33' },
  }
}

export default async function GuestTablePage({ params }: Props) {
  const admin = createAdminClient()

  // Validate QR token
  const { data: table } = await admin
    .from('restaurant_tables')
    .select('id, label, section, restaurant_id, qr_token')
    .eq('qr_token', params.qrToken)
    .eq('is_active', true)
    .single()

  if (!table) return notFound()

  // Get restaurant info
  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id, name, slug, service_charge_pct')
    .eq('id', table.restaurant_id)
    .single()

  if (!restaurant || restaurant.slug !== params.slug) return notFound()

  // Check for open session on this table
  const { data: session } = await admin
    .from('table_sessions')
    .select('id, status, party_size, split_mode, opened_at')
    .eq('table_id', table.id)
    .eq('status', 'open')
    .single()

  return (
    <div className="min-h-screen bg-[#2D2F33] text-white">
      {session ? (
        <LiveBillView
          sessionId={session.id}
          table={table}
          restaurant={restaurant}
          initialSplitMode={session.split_mode}
        />
      ) : (
        <WaitingScreen restaurantName={restaurant.name} tableLabel={table.label} />
      )}
    </div>
  )
}
