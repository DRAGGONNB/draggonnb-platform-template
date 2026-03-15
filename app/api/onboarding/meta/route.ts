import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserOrg } from '@/lib/auth/get-user-org'

export const dynamic = 'force-dynamic'

const metaOnboardingSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(255),
  tradingName: z.string().max(255).optional().default(''),
  registrationNumber: z.string().max(50).optional().default(''),
  whatsappNumber: z
    .string()
    .min(1, 'WhatsApp number is required')
    .regex(/^\+27\d{9}$/, 'Must be a valid South African number in +27 format'),
  businessEmail: z.string().email('Valid email is required'),
  businessAddress: z.string().max(500).optional().default(''),
  selectedModule: z.enum(['crm', 'email', 'social', 'content_studio', 'accommodation', 'ai_agents']),
  popiaAccepted: z.literal(true, {
    errorMap: () => ({ message: 'POPIA agreement must be accepted' }),
  }),
  popiaTimestamp: z.string().min(1, 'POPIA acceptance timestamp is required'),
  metaPath: z.enum(['A', 'B']),
  // Model B fields
  wabaId: z.string().optional(),
  // Model A fields from embedded signup callback
  embeddedSignupWabaId: z.string().optional(),
  embeddedSignupPhoneNumberId: z.string().optional(),
}).refine(
  (data) => {
    if (data.metaPath === 'B') {
      return data.wabaId && data.wabaId.length >= 10
    }
    return true
  },
  {
    message: 'WABA ID is required for existing WhatsApp accounts (min 10 digits)',
    path: ['wabaId'],
  }
)

export async function POST(request: Request) {
  try {
    const { data: userOrg, error: authError } = await getUserOrg()
    if (authError || !userOrg) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = metaOnboardingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Store onboarding data for future provisioning pipeline (Phase 08.5)
    // For now, validate and return success
    const onboardingRecord = {
      organization_id: userOrg.organizationId,
      user_id: userOrg.userId,
      business_name: data.businessName,
      trading_name: data.tradingName,
      registration_number: data.registrationNumber,
      whatsapp_number: data.whatsappNumber,
      business_email: data.businessEmail,
      business_address: data.businessAddress,
      selected_module: data.selectedModule,
      popia_accepted: data.popiaAccepted,
      popia_accepted_at: data.popiaTimestamp,
      meta_path: data.metaPath,
      waba_id: data.metaPath === 'B' ? data.wabaId : data.embeddedSignupWabaId || null,
      phone_number_id: data.embeddedSignupPhoneNumberId || null,
      status: 'pending_provisioning',
      created_at: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      message: 'Meta onboarding data validated successfully',
      onboarding: {
        organizationId: userOrg.organizationId,
        businessName: data.businessName,
        module: data.selectedModule,
        metaPath: data.metaPath,
        status: 'pending_provisioning',
      },
    })
  } catch (error) {
    console.error('Meta onboarding submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
