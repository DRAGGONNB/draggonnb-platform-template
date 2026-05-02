// __tests__/unit/modules/registry.test.ts
import { describe, it, expect } from 'vitest'
import { MODULE_REGISTRY, getManifestsForOrg, getAllApprovalActions, getAllTelegramCallbacks, getAllBillingLineTypes } from '@/lib/modules/registry'
import { ApprovalActionRegistry, buildQualifiedKey } from '@/lib/approvals/registry'
import { buildCallbackData, buildCallbackPattern, parseCallbackData, listCallbacksForOrg } from '@/lib/telegram/callback-registry'
import { validateBillingLineType, lookupLineType } from '@/lib/billing/line-type-registry'

describe('MODULE_REGISTRY', () => {
  it('contains 6 manifests', () => {
    expect(MODULE_REGISTRY).toHaveLength(6)
  })
  it('every manifest has required fields', () => {
    for (const m of MODULE_REGISTRY) {
      expect(m.id).toBeTruthy()
      expect(m.name).toBeTruthy()
      expect(m.version).toBeTruthy()
      expect(m.product).toMatch(/^(draggonnb|trophy)$/)
      expect(Array.isArray(m.required_tenant_inputs)).toBe(true)
      expect(Array.isArray(m.emitted_events)).toBe(true)
      expect(Array.isArray(m.approval_actions)).toBe(true)
      expect(Array.isArray(m.telegram_callbacks)).toBe(true)
      expect(Array.isArray(m.billing_line_types)).toBe(true)
    }
  })
  it('getManifestsForOrg filters correctly', () => {
    const result = getManifestsForOrg(['accommodation', 'crm'])
    expect(result).toHaveLength(2)
    expect(result.map(m => m.id).sort()).toEqual(['accommodation', 'crm'])
  })
})

describe('ApprovalActionRegistry', () => {
  it('builds qualified keys with product prefix', () => {
    expect(buildQualifiedKey('draggonnb', 'damage_charge')).toBe('draggonnb.damage_charge')
  })
  it('registers actions from active modules with product prefix', () => {
    const reg = new ApprovalActionRegistry(['accommodation'])
    const handler = reg.getHandler('draggonnb.damage_charge')
    expect(handler).toBeDefined()
    expect(handler?.product).toBe('draggonnb')
    expect(handler?.required_roles).toContain('admin')
  })
  it('returns undefined for unknown qualified key', () => {
    const reg = new ApprovalActionRegistry(['accommodation'])
    expect(reg.getHandler('trophy.quota_change')).toBeUndefined()
  })
  it('listAll returns qualifiedKey-tagged entries', () => {
    const reg = new ApprovalActionRegistry(['accommodation'])
    const all = reg.listAll()
    expect(all.every(a => a.qualifiedKey.includes('.'))).toBe(true)
  })
})

describe('Telegram callback registry', () => {
  it('builds canonical callback_data', () => {
    expect(buildCallbackData('approve', 'draggonnb', 'damage_charge', 'abc')).toBe('approve:draggonnb:damage_charge:abc')
  })
  it('builds regex pattern matching that callback_data', () => {
    const pat = buildCallbackPattern('approve', 'draggonnb', 'damage_charge')
    expect(pat.test('approve:draggonnb:damage_charge:abc-123')).toBe(true)
    expect(pat.test('approve:trophy:damage_charge:abc-123')).toBe(false)
  })
  it('parses callback_data back to structured form', () => {
    expect(parseCallbackData('approve:draggonnb:damage_charge:abc')).toEqual({
      verb: 'approve', product: 'draggonnb', action_key: 'damage_charge', resource_id: 'abc'
    })
    expect(parseCallbackData('malformed')).toBeNull()
    expect(parseCallbackData('foo:draggonnb:bar:baz')).toBeNull()  // invalid verb
  })
  it('listCallbacksForOrg returns accommodation callbacks for accommodation org', () => {
    const cbs = listCallbacksForOrg(['accommodation'])
    expect(cbs.some(c => c.spec.action_key === 'damage_charge' && c.product === 'draggonnb')).toBe(true)
  })
})

describe('Billing line-type registry', () => {
  it('validates known accommodation line types', () => {
    expect(validateBillingLineType('draggonnb', 'accommodation_night', ['accommodation'])).toBe(true)
    expect(validateBillingLineType('draggonnb', 'damage_charge', ['accommodation'])).toBe(true)
  })
  it('rejects unknown source_type', () => {
    expect(validateBillingLineType('draggonnb', 'fictional_line', ['accommodation'])).toBe(false)
  })
  it('rejects line type from inactive module', () => {
    expect(validateBillingLineType('draggonnb', 'accommodation_night', ['crm'])).toBe(false)
  })
  it('lookupLineType returns the spec on hit', () => {
    const lt = lookupLineType('draggonnb', 'accommodation_night', ['accommodation'])
    expect(lt?.display_label).toBeTruthy()
    expect(lt?.unit).toBeTruthy()
  })
})
