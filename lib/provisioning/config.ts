export function validateProvisioningEnv(): { valid: boolean; missing: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const missing = required.filter(key => !process.env[key]);
  return { valid: missing.length === 0, missing };
}

export function validateFullProvisioningEnv(): { valid: boolean; missing: string[]; optional: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const optional = [
    'N8N_API_KEY',
    'N8N_HOST',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
  ];

  const missing = required.filter(key => !process.env[key]);
  const missingOptional = optional.filter(key => !process.env[key]);

  return { valid: missing.length === 0, missing, optional: missingOptional };
}
