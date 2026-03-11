/**
 * External CRM Companies — List & Create
 *
 * M2M endpoints for vertical clients (e.g., FIGARIE) to read and create
 * companies in DraggonnB. Uses API key auth via middleware-injected headers
 * (x-organization-id, x-api-key-scopes). No session auth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScopes, getOrganizationId } from '@/lib/security/scope-guard'

// Allowed fields for company creation
const ALLOWED_INSERT_FIELDS = [
  'name',
  'industry',
  'website',
  'phone',
  'address',
  'city',
  'state',
  'country',
  'postal_code',
  'employee_count',
  'annual_revenue',
  'notes',
  'tags',
] as const

/**
 * GET /api/external/crm/companies
 *
 * List companies scoped to the authenticated organization.
 * Supports: ?search= (name, industry), ?limit= (default 50, max 200), ?offset=
 */
export async function GET(request: NextRequest) {
  try {
    // Scope check
    const scopeCheck = requireScopes(request, 'contacts:read')
    if (!scopeCheck.authorized) return scopeCheck.response!

    // Organization context
    const organizationId = getOrganizationId(request)
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organization context' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10)
    const limit = Math.min(Math.max(1, rawLimit), 200) // Clamp 1..200
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))

    const supabase = createAdminClient()

    // Build query
    let query = supabase
      .from('companies')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Search across name and industry
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,industry.ilike.%${search}%`
      )
    }

    const { data: companies, error, count } = await query

    if (error) {
      console.error('[External CRM] Error fetching companies:', error)
      return NextResponse.json(
        { error: 'Failed to fetch companies' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: companies || [],
      count: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[External CRM] Companies GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/external/crm/companies
 *
 * Create a company in the authenticated organization.
 * Requires: name
 */
export async function POST(request: NextRequest) {
  try {
    // Scope check
    const scopeCheck = requireScopes(request, 'contacts:write')
    if (!scopeCheck.authorized) return scopeCheck.response!

    // Organization context
    const organizationId = getOrganizationId(request)
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing organization context' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    // Pick only allowed fields from body (prevent injection of organization_id, id, etc.)
    const insertData: Record<string, unknown> = {
      organization_id: organizationId,
    }

    for (const field of ALLOWED_INSERT_FIELDS) {
      if (body[field] !== undefined) {
        insertData[field] = body[field]
      }
    }

    const supabase = createAdminClient()

    const { data: company, error } = await supabase
      .from('companies')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[External CRM] Error creating company:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Company with this name already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create company' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: company }, { status: 201 })
  } catch (error) {
    console.error('[External CRM] Companies POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
