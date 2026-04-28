// Plan 11-09: entity_drafts autosave wiring. See lib/crm/entity-drafts/. Branch B from Task 0.
// RSC: fetches deal row + draft in parallel, passes merged data to client form island.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { loadEntityWithDraft } from '@/lib/crm/entity-drafts/load-with-draft'
import { DealEditForm } from './_components/DealEditForm'

interface Deal extends Record<string, unknown> {
  id: string
  name: string
  value: number
  stage: string
  probability: number
  expected_close_date: string | null
  company: string | null
  description: string | null
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    redirect('/login')
  }

  const supabase = await createClient()
  const result = await loadEntityWithDraft<Deal>(
    supabase,
    'deals',
    'deal',
    id,
    userOrg.userId
  )

  if (!result.data) {
    // Deal not found or RLS blocked — redirect to list
    redirect('/dashboard/crm/deals')
  }

  return (
    <DealEditForm
      deal={result.data}
      hasDraft={result.hasDraft}
      draftModifiedAt={result.draftModifiedAt}
      draftTabId={result.draftTabId}
    />
  )
}
