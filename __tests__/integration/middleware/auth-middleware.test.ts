/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('protected routes without auth', () => {
    it('redirects to login when accessing /dashboard without auth', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/dashboard')
      const response = await updateSession(request)

      expect(response.status).toBe(307) // Redirect status
      expect(response.headers.get('location')).toContain('/login')
      expect(response.headers.get('location')).toContain('redirect=%2Fdashboard')
    })

    it('redirects to login when accessing /crm without auth', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/crm/contacts')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('redirects to login when accessing /email without auth', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/email/campaigns')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('redirects to login when accessing /content-generator without auth', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/content-generator')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })
  })

  describe('protected routes with auth', () => {
    it('allows access to /dashboard when authenticated', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/dashboard')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    })

    it('allows access to /crm when authenticated', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/crm/contacts')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })

    it('allows access to /email when authenticated', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/email/campaigns')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })

    it('allows access to /content-generator when authenticated', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/content-generator')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })
  })

  describe('auth routes', () => {
    it('redirects authenticated users away from /login to /dashboard', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/login')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard')
    })

    it('redirects authenticated users away from /signup to /dashboard', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/signup')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard')
    })

    it('allows unauthenticated access to /login', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/login')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })

    it('allows unauthenticated access to /signup', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/signup')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })
  })

  describe('public routes', () => {
    it('allows unauthenticated access to public routes', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    })

    it('allows unauthenticated access to /pricing', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/pricing')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })
  })

  describe('redirect parameter handling', () => {
    it('includes redirect parameter when redirecting from protected route', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated'),
          }),
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/dashboard/analytics')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('redirect=%2Fdashboard%2Fanalytics')
    })
  })
})
