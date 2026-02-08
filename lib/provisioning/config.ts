export function validateProvisioningEnv(): { valid: boolean; missing: string[] } {
  const required = [
    'SUPABASE_MANAGEMENT_TOKEN',
    'SUPABASE_ORG_ID',
  ];
  const missing = required.filter(key => !process.env[key]);
  return { valid: missing.length === 0, missing };
}

export function getSupabaseManagementConfig() {
  const token = process.env.SUPABASE_MANAGEMENT_TOKEN;
  const orgId = process.env.SUPABASE_ORG_ID;

  if (!token || !orgId) {
    throw new Error('Missing Supabase Management API credentials');
  }

  return { token, orgId };
}
