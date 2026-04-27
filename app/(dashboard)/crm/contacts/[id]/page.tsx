// Plan 11-09: entity_drafts autosave wiring. See lib/crm/entity-drafts/. Branch B from Task 0.
// RSC: fetches contact row + draft in parallel, passes merged data to client form island.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { loadEntityWithDraft } from '@/lib/crm/entity-drafts/load-with-draft'
import { ContactEditForm } from './_components/ContactEditForm'

interface Contact extends Record<string, unknown> {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  company: string | null
  job_title: string | null
  status: string
  notes: string | null
  tags: string[] | null
}

export default async function ContactDetailPage({
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
  const result = await loadEntityWithDraft<Contact>(
    supabase,
    'contacts',
    'contact',
    id,
    userOrg.userId
  )

  if (!result.data) {
    // Contact not found or RLS blocked — redirect to list
    redirect('/dashboard/crm/contacts')
  }

  return (
    <ContactEditForm
      contact={result.data}
      hasDraft={result.hasDraft}
      draftModifiedAt={result.draftModifiedAt}
      draftTabId={result.draftTabId}
    />
  )
}
