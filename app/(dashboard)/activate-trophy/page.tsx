// app/(dashboard)/activate-trophy/page.tsx
// NAV-04: explicit-activation UX for Trophy OS. Never auto-creates silently (D6 + NAV-04).
// Displayed when:
//   1. User clicks "Activate Trophy OS" from the sidebar (linked_trophy_org_id is null).
//   2. Linked but user lacks Trophy org membership (shows reason=missing_trophy_membership).
// When Trophy is already linked: redirects straight to the SSO bridge.

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { ActivateTrophyForm } from './activate-trophy-form'

interface PageProps {
  searchParams: Promise<{ reason?: string }>
}

export default async function ActivateTrophyPage({ searchParams }: PageProps) {
  const hdrs = await headers()
  // Header injected by middleware when the org already has linked_trophy_org_id set.
  const linkedTrophyOrgId = hdrs.get('x-linked-trophy-org-id')

  if (linkedTrophyOrgId) {
    // Already activated — bridge straight in without showing the activation UI.
    redirect('/api/sso/issue?target=trophy')
  }

  const params = await searchParams
  const reason = params.reason

  // Specific reason copy for missing membership (user linked to org but not in Trophy orgs)
  const reasonCopy =
    reason === 'missing_trophy_membership'
      ? 'Your DraggonnB organisation is linked to Trophy OS, but your user account does not have access yet. Ask your admin to invite you to the Trophy organisation.'
      : null

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-lg border border-[#3a3328] bg-[#1E1B16] p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#FDFCFA]">Activate Trophy OS</h1>
        <p className="mt-3 text-sm text-[#9b9080]">
          Trophy OS is the hunting-operations side of the DraggonnB platform — quota management, safari bookings,
          trophy logs (SCI/Rowland Ward), firearm registers (SAPS TIP), cold room tracking, and supplier coordination.
          Activating it creates a Trophy organisation and links it to your DraggonnB account for seamless
          cross-product navigation.
        </p>

        {reasonCopy && (
          <div className="mt-4 rounded-md border border-amber-700 bg-amber-950 p-4 text-sm text-amber-200">
            {reasonCopy}
          </div>
        )}

        <ul className="mt-6 space-y-2.5 text-sm text-[#9b9080]">
          <li className="flex items-start gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#B8941E]" />
            A Trophy organisation will be created with you as owner.
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#B8941E]" />
            Bookings and safaris share the same database — no data siloing.
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#B8941E]" />
            Trophy OS appears as a cross-product link in your sidebar.
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#B8941E]" />
            A 14-day trial is created — no payment required to start.
          </li>
        </ul>

        <div className="mt-8">
          <ActivateTrophyForm />
        </div>
      </div>
    </main>
  )
}
