import { redirect } from 'next/navigation'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { createAdminClient } from '@/lib/supabase/admin'
import { BrandVoiceWizard } from './_components/wizard-step-url'

export const dynamic = 'force-dynamic'

/**
 * /settings/brand-voice — auth-gated wizard surface (VOICE-01 UI, VOICE-08 UI).
 *
 * Pre-fetches the org's existing brand_voice row directly via the admin client.
 * The page is already auth-gated (getUserOrg), so the admin read is safe and
 * avoids the round-trip + auth-cookie-forwarding tax of calling the API.
 *
 * If a brand_voice_prompt exists, the header swaps to a "Last updated"
 * label — this is the VOICE-08 re-run signal.
 */
export default async function BrandVoicePage() {
  const { data: userOrg, error } = await getUserOrg()
  if (error || !userOrg) {
    redirect('/login')
  }

  const supabaseAdmin = createAdminClient()
  const { data: existing } = await supabaseAdmin
    .from('client_profiles')
    .select(
      'brand_voice_prompt, example_phrases, forbidden_topics, brand_voice_updated_at',
    )
    .eq('organization_id', userOrg.organizationId)
    .maybeSingle()

  const hasExisting = Boolean(existing?.brand_voice_prompt)
  const updatedAt = existing?.brand_voice_updated_at
    ? new Date(existing.brand_voice_updated_at).toLocaleDateString('en-ZA')
    : null

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-[#363940]">Brand Voice</h1>
      <p className="mt-1 text-sm text-gray-600">
        {hasExisting && updatedAt
          ? `Last updated ${updatedAt}. Re-run the wizard to update it.`
          : 'Capture how your brand sounds. Used by every AI agent on the platform.'}
      </p>
      <BrandVoiceWizard initialExistingVoice={existing} />
    </div>
  )
}
