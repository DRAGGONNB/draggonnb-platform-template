import { getUserOrg } from '@/lib/auth/get-user-org'
import { IntentForm } from '@/app/(dashboard)/campaigns/studio/[id]/_components/IntentForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewCampaignPage() {
  const { error } = await getUserOrg()

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500">Authentication error: {error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </Link>
        <h1 className="text-2xl font-bold">New campaign</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Describe what you want to promote — we will draft content for all your active channels.
        </p>
      </div>

      <IntentForm />
    </div>
  )
}
