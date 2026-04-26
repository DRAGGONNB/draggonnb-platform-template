import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),

  PAYFAST_MERCHANT_ID: z.string().min(5),
  PAYFAST_MERCHANT_KEY: z.string().min(5),
  PAYFAST_PASSPHRASE: z.string().optional(),
  PAYFAST_MODE: z.enum(['sandbox', 'production']).default('sandbox'),
  PAYFAST_RETURN_URL: z.string().url().optional(),
  PAYFAST_CANCEL_URL: z.string().url().optional(),
  PAYFAST_NOTIFY_URL: z.string().url().optional(),

  RESEND_API_KEY: z.string().startsWith('re_').optional(),

  CRON_SECRET: z.string().min(20).optional(),
  SETUP_SECRET: z.string().min(20).optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_OPS_CHAT_ID: z.string().optional(),

  N8N_API_URL: z.string().url().optional(),
  N8N_API_KEY: z.string().optional(),
})
.superRefine((data, ctx) => {
  if (data.PAYFAST_MODE === 'production' && !data.PAYFAST_PASSPHRASE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['PAYFAST_PASSPHRASE'],
      message: 'PAYFAST_PASSPHRASE is required when PAYFAST_MODE=production',
    })
  }
  if (data.VERCEL_ENV === 'production' && data.PAYFAST_MODE !== 'production') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['PAYFAST_MODE'],
      message: 'PAYFAST_MODE must be production when VERCEL_ENV=production',
    })
  }
  if (data.VERCEL_ENV === 'production' && !data.CRON_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CRON_SECRET'],
      message: 'CRON_SECRET is required in production for cron authentication',
    })
  }
})

export type Env = z.infer<typeof envSchema>
