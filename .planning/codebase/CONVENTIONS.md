# Codebase Conventions

> Generated: 2026-02-02

## Language & Type System

- **TypeScript** in strict mode (`tsconfig.json` → `"strict": true`)
- Interfaces preferred over types for API contracts (`PayFastITNData`, `UserOrg`, `N8NWebhookResponse`)
- Type assertions used sparingly (one in `colors.ts`)
- Generics used for webhook responses: `N8NWebhookResponse<T = unknown>`

## File Naming

- **Pages/Routes:** kebab-case directories (`forgot-password/`, `content-generator/`)
- **Components:** PascalCase files (`StatCard.tsx`, `DashboardHeader.tsx`, `EngagementChart.tsx`)
- **shadcn/ui components:** kebab-case (`dropdown-menu.tsx`, `radio-group.tsx`)
- **Lib modules:** kebab-case (`get-user-org.ts`, `webhooks.ts`)
- **Route files:** always `page.tsx` (pages) or `route.ts` (API)

## Import Patterns

- `@/` alias for project root (configured in tsconfig.json)
- All imports use `@/` prefix: `import { createClient } from '@/lib/supabase/server'`
- No relative imports observed in app/ or lib/ directories
- Component imports: `import { Button } from '@/components/ui/button'`

## React Component Patterns

- **Server Components** by default (Next.js App Router convention)
- **`'use client'`** directive added explicitly when needed (forms, interactivity)
- Pages are server components that may embed client components
- Dashboard components (`EngagementChart`, etc.) are client components for interactivity

## API Route Pattern

```typescript
// Standard pattern across all API routes:
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    // ... business logic with Supabase queries
    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error('Context:', error)
    return NextResponse.json({ error: 'Message' }, { status: 500 })
  }
}
```

- All API routes use try/catch with `NextResponse.json`
- Error responses include `{ error: string }` shape
- Success responses include `{ data: T }` or `{ success: true }`
- Supabase client created per-request: `const supabase = await createClient()`

## Supabase Query Pattern

```typescript
// All queries scope to organization:
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })
```

- `getUserOrg()` helper resolves current user + organization in one call
- Organization ID used for multi-tenant scoping
- Supabase joins via `select('*, organizations(*)')` syntax

## UI & Styling

- **TailwindCSS** for all styling (no CSS modules or styled-components)
- **`cn()`** utility for conditional class merging: `cn('base-class', condition && 'conditional-class')`
- **shadcn/ui** components used as base building blocks
- **Lucide React** icons throughout (`lucide-react`)
- **Recharts** for all chart/data visualization
- Custom color variables defined in `lib/styles/colors.ts` and `variables.ts`

## Error Handling

- API routes: try/catch → `console.error()` → `NextResponse.json({ error }, { status })`
- PayFast webhook: multi-step validation with early returns on each failure
- N8N webhooks: catch → return `{ success: false, error: message }`
- No global error boundary configured
- No Sentry or external error tracking

## Environment Variables

- Public vars prefixed with `NEXT_PUBLIC_` (Supabase URL, anon key)
- Server-only vars accessed directly: `process.env.PAYFAST_MERCHANT_ID`
- Default values used for N8N: `process.env.N8N_BASE_URL || 'https://draggonn-b.app.n8n.cloud'`
- `.env.example` documents all required vars with comments

## ESLint Configuration

- Extends `next/core-web-vitals` and `next/typescript`
- No custom rules added beyond Next.js defaults
- Console statements in webhooks accepted (logging)
- Build passes with warnings only (no errors)
