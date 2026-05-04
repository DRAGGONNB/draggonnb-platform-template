/** @vitest-environment node */
/**
 * verifyApprover() unit tests — D2 Telegram → org membership enforcement.
 *
 * Checks:
 *   1. Unknown telegram_user_id → isAuthorized: false, userId: ''
 *   2. Known telegram ID but non-admin role → isAuthorized: false
 *   3. Admin user in correct org → isAuthorized: true
 *   4. When product provided and tenant_modules missing → isAuthorized: false
 *   5. When product provided and tenant_modules present + admin role → isAuthorized: true
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase chain builder helper ────────────────────────────────────────────
function makeChain(rows: Record<string, any>) {
  const build = (result: any) => {
    const obj: any = {}
    for (const m of ['select', 'eq', 'in', 'ilike', 'not', 'limit', 'single', 'maybeSingle']) {
      obj[m] = vi.fn().mockReturnValue(obj)
    }
    obj.single = vi.fn().mockResolvedValue(result)
    obj.maybeSingle = vi.fn().mockResolvedValue(result)
    return obj
  }

  const fromFn = vi.fn((table: string) => build(rows[table] ?? { data: null }))
  return fromFn
}

// ── Shared mutable mock state ────────────────────────────────────────────────
let mockFromImpl: ReturnType<typeof makeChain>

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: (...a: any[]) => mockFromImpl(...a) }),
}))

// Import AFTER mock is set up
import { verifyApprover } from '@/lib/approvals/spine'

const ORG_ID = 'org-test-123'
const TG_ID = 9_001_001
const USER_ID = 'user-uuid-abc'

describe('verifyApprover()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns isAuthorized=false when telegram_user_id not found in user_profiles', async () => {
    mockFromImpl = makeChain({
      user_profiles: { data: null, error: null },
    })
    const result = await verifyApprover(TG_ID, ORG_ID)
    expect(result.isAuthorized).toBe(false)
    expect(result.userId).toBe('')
  })

  it('returns isAuthorized=false when user exists but is not admin/manager', async () => {
    // user_profiles returns the user, organization_users returns null (not admin/manager)
    let callCount = 0
    mockFromImpl = vi.fn((table: string) => {
      const obj: any = {}
      for (const m of ['select', 'eq', 'in', 'ilike', 'not', 'limit']) {
        obj[m] = vi.fn().mockReturnValue(obj)
      }
      if (table === 'user_profiles') {
        obj.single = vi.fn().mockResolvedValue({ data: { user_id: USER_ID }, error: null })
        obj.maybeSingle = vi.fn().mockResolvedValue({ data: { user_id: USER_ID }, error: null })
      } else {
        // organization_users — not admin
        obj.single = vi.fn().mockResolvedValue({ data: null, error: null })
        obj.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      }
      return obj
    })

    const result = await verifyApprover(TG_ID, ORG_ID)
    expect(result.isAuthorized).toBe(false)
    expect(result.userId).toBe(USER_ID)
  })

  it('returns isAuthorized=true when user is admin in org with no product filter', async () => {
    mockFromImpl = vi.fn((table: string) => {
      const obj: any = {}
      for (const m of ['select', 'eq', 'in', 'ilike', 'not', 'limit']) {
        obj[m] = vi.fn().mockReturnValue(obj)
      }
      if (table === 'user_profiles') {
        obj.single = vi.fn().mockResolvedValue({ data: { user_id: USER_ID }, error: null })
        obj.maybeSingle = vi.fn().mockResolvedValue({ data: { user_id: USER_ID }, error: null })
      } else {
        obj.single = vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
        obj.maybeSingle = vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
      }
      return obj
    })

    const result = await verifyApprover(TG_ID, ORG_ID)
    expect(result.isAuthorized).toBe(true)
    expect(result.userId).toBe(USER_ID)
  })

  it('returns isAuthorized=false when product=trophy and tenant_modules not found', async () => {
    // Calls: user_profiles → profile found; organization_users → admin; tenant_modules → null
    const tables: Record<string, any> = {
      user_profiles: { data: { user_id: USER_ID } },
      organization_users: { data: { role: 'admin' } },
      tenant_modules: { data: null },
    }

    mockFromImpl = vi.fn((table: string) => {
      const obj: any = {}
      for (const m of ['select', 'eq', 'in', 'ilike', 'not', 'limit']) {
        obj[m] = vi.fn().mockReturnValue(obj)
      }
      const result = tables[table] ?? { data: null }
      obj.single = vi.fn().mockResolvedValue(result)
      obj.maybeSingle = vi.fn().mockResolvedValue(result)
      return obj
    })

    const result = await verifyApprover(TG_ID, ORG_ID, 'trophy')
    expect(result.isAuthorized).toBe(false)
  })

  it('returns isAuthorized=true when product=draggonnb and user is manager in org', async () => {
    mockFromImpl = vi.fn((table: string) => {
      const obj: any = {}
      for (const m of ['select', 'eq', 'in', 'ilike', 'not', 'limit']) {
        obj[m] = vi.fn().mockReturnValue(obj)
      }
      if (table === 'user_profiles') {
        obj.single = vi.fn().mockResolvedValue({ data: { user_id: USER_ID } })
        obj.maybeSingle = vi.fn().mockResolvedValue({ data: { user_id: USER_ID } })
      } else {
        obj.single = vi.fn().mockResolvedValue({ data: { role: 'manager' } })
        obj.maybeSingle = vi.fn().mockResolvedValue({ data: { role: 'manager' } })
      }
      return obj
    })

    const result = await verifyApprover(TG_ID, ORG_ID, 'draggonnb')
    expect(result.isAuthorized).toBe(true)
  })
})
