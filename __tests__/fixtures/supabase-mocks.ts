import { vi } from 'vitest'

/**
 * Mock Supabase client structure supporting chaining API
 */
export interface MockSupabaseClient {
  auth: {
    getUser: ReturnType<typeof vi.fn>
  }
  from: ReturnType<typeof vi.fn>
}

/**
 * Create a mock Supabase client with common query patterns
 */
export function createMockSupabaseClient(overrides: Partial<MockSupabaseClient> = {}): MockSupabaseClient {
  const defaultMock: MockSupabaseClient = {
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'test-id', organization_id: 'test-org-id' },
            error: null,
          })),
          order: vi.fn(() => ({
            range: vi.fn(() => ({
              data: [],
              error: null,
              count: 0,
            })),
          })),
        })),
        order: vi.fn(() => ({
          range: vi.fn(() => ({
            data: [],
            error: null,
            count: 0,
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'new-id' },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { id: 'updated-id' },
              error: null,
            })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
  }

  return {
    ...defaultMock,
    ...overrides,
  }
}

/**
 * Create a mock for an unauthenticated user
 */
export function mockUnauthenticatedUser() {
  return {
    auth: {
      getUser: vi.fn(() => ({
        data: { user: null },
        error: new Error('Not authenticated'),
      })),
    },
  }
}

/**
 * Create a mock for an authenticated user
 */
export function mockAuthenticatedUser(userId: string = 'test-user-id', email: string = 'test@example.com') {
  return {
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: userId, email } },
        error: null,
      })),
    },
  }
}

/**
 * Create a mock response for user with organization
 */
export function mockUserWithOrganization(userId: string = 'test-user-id', orgId: string = 'test-org-id') {
  return {
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: { id: userId, organization_id: orgId },
                error: null,
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => ({
                data: [],
                error: null,
                count: 0,
              })),
            })),
          })),
        })),
      }
    }),
  }
}

/**
 * Create a mock response for user without organization
 */
export function mockUserWithoutOrganization(userId: string = 'test-user-id') {
  return {
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: { message: 'User not found' },
              })),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => ({
                data: [],
                error: null,
                count: 0,
              })),
            })),
          })),
        })),
      }
    }),
  }
}
