'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Bill, BillItem, BillPayer, TableSession } from '@/lib/restaurant/types'

interface LiveBillState {
  session: TableSession | null
  bill: Bill | null
  items: BillItem[]
  payers: BillPayer[]
  loading: boolean
  error: string | null
}

export function useLiveBill(sessionId: string | null) {
  const [state, setState] = useState<LiveBillState>({
    session: null, bill: null, items: [], payers: [], loading: true, error: null,
  })

  const load = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    if (!sessionId) return

    const { data: session, error: sErr } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sErr || !session) {
      setState(s => ({ ...s, loading: false, error: 'Session not found' }))
      return
    }

    const { data: bill } = await supabase
      .from('bills')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (!bill) {
      setState(s => ({ ...s, session, loading: false }))
      return
    }

    const [{ data: items }, { data: payers }] = await Promise.all([
      supabase.from('bill_items').select('*').eq('bill_id', bill.id).eq('voided', false).order('created_at'),
      supabase.from('bill_payers').select('*').eq('bill_id', bill.id).order('slot_number'),
    ])

    setState({
      session,
      bill,
      items: items ?? [],
      payers: payers ?? [],
      loading: false,
      error: null,
    })
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return
    const supabase = createClient()
    load(supabase)

    // Subscribe to Realtime updates for all four tables
    const channel = supabase.channel(`livetab:${sessionId}`)

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions', filter: `id=eq.${sessionId}` },
        () => load(supabase))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' },
        () => load(supabase))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_items' },
        () => load(supabase))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_payers' },
        () => load(supabase))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId, load])

  return state
}
