# Technology Stack

**Analysis Date:** 2026-02-01

## Languages

**Primary:**
- TypeScript 5.5+ (`tsconfig.json` - strict mode enabled, ES2020 target, bundler module resolution)

**Secondary:**
- JavaScript - Config files only (`next.config.js`, `postcss.config.js`)

## Runtime

**Environment:**
- Node.js >= 18.0.0 (specified in `package.json` engines field)

**Package Manager:**
- npm >= 9.0.0 (specified in `package.json` engines field)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js ^14.2.0 - Full-stack React framework (App Router, NOT Pages Router)
- React ^18.3.0 - UI library
- React DOM ^18.3.0 - DOM rendering

**Testing:**
- None configured - no test runner, no test dependencies

**Build/Dev:**
- TypeScript ^5.5.0 - Type checking (strict mode)
- ESLint ^8.57.0 + eslint-config-next ^14.2.0 - Linting
- PostCSS ^8.4.47 + Autoprefixer ^10.4.20 - CSS processing
- TailwindCSS ^3.4.13 - Utility-first CSS

## Key Dependencies

**Critical (Runtime):**
- `next` ^14.2.0 - Application framework, routing, API routes, SSR
- `@supabase/ssr` ^0.5.0 - Supabase auth with cookie-based sessions (SSR-compatible)
- `@supabase/supabase-js` ^2.45.0 - Supabase client for database queries
- `resend` ^6.7.0 - Email sending API client
- `zod` ^3.25.76 - Runtime schema validation

**UI Component Library (shadcn/ui pattern):**
- `@radix-ui/react-avatar` ^1.1.11
- `@radix-ui/react-checkbox` ^1.3.3
- `@radix-ui/react-dialog` ^1.1.15
- `@radix-ui/react-dropdown-menu` ^2.1.16
- `@radix-ui/react-icons` ^1.3.2
- `@radix-ui/react-label` ^2.1.8
- `@radix-ui/react-progress` ^1.1.8
- `@radix-ui/react-radio-group` ^1.3.8
- `@radix-ui/react-select` ^2.2.6
- `@radix-ui/react-separator` ^1.1.8
- `@radix-ui/react-slot` ^1.2.4
- `@radix-ui/react-switch` ^1.2.6
- `@radix-ui/react-tabs` ^1.1.13
- `@radix-ui/react-toast` ^1.2.15

**Styling Utilities:**
- `class-variance-authority` ^0.7.0 - Component variant management (used in shadcn/ui)
- `clsx` ^2.0.0 - Conditional class merging
- `tailwind-merge` ^3.4.0 - Tailwind class deduplication
- `tailwindcss-animate` ^1.0.7 - Animation plugin for Tailwind

**Feature Libraries:**
- `recharts` ^2.10.3 - Dashboard analytics charts
- `react-big-calendar` ^1.8.5 - Content calendar view
- `react-email-editor` ^1.7.11 - WYSIWYG email template editor
- `cmdk` ^0.2.0 - Command palette (Cmd+K)
- `react-hook-form` ^7.67.0 - Form state management
- `@hookform/resolvers` ^3.10.0 - Zod resolver for react-hook-form
- `lucide-react` ^0.294.0 - Icon library

**State Management:**
- `zustand` ^4.4.1 - Lightweight global state (installed, usage unclear)

**Infrastructure:**
- `@radix-ui/react-icons` ^1.3.2 - Icon set

## Dev Dependencies

- `@types/node` ^22.0.0 - Node.js type definitions
- `@types/pg` ^8.16.0 - PostgreSQL type definitions (for scripts)
- `@types/react` ^18.3.0 - React type definitions
- `@types/react-dom` ^18.3.0 - React DOM type definitions
- `dotenv` ^16.6.1 - Environment variable loading (for scripts)
- `pg` ^8.17.1 - PostgreSQL client (for database scripts only, not runtime)

## Styling Approach

**Framework:** TailwindCSS 3.4 with CSS custom properties (HSL color system)
**Component Library:** shadcn/ui pattern - components in `components/ui/` using Radix primitives
**Utility Function:** `cn()` helper at `lib/utils/cn.ts` combining `clsx` + `tailwind-merge`
**Dark Mode:** Configured via `class` strategy in `tailwind.config.ts` (not fully implemented)

**Color System (HSL CSS variables):**
- Semantic tokens: `primary`, `secondary`, `success`, `warning`, `error`, `info`
- Each with 50-900 shade scales
- shadcn/ui tokens: `background`, `foreground`, `muted`, `accent`, `destructive`, `card`, `popover`
- Defined in `tailwind.config.ts` referencing CSS custom properties

**Key Config Files:**
- `tailwind.config.ts` - Extended theme with HSL color system, animations
- `postcss.config.js` - TailwindCSS + Autoprefixer plugins
- `app/globals.css` - CSS variable definitions (assumed)

## TypeScript Configuration

**File:** `tsconfig.json`
- `strict: true` - Full strict mode
- `target: "ES2020"` - Modern JavaScript output
- `moduleResolution: "bundler"` - Next.js bundler resolution
- `jsx: "preserve"` - Next.js handles JSX compilation
- `incremental: true` - Faster rebuilds

**Path Aliases:**
- `@/*` -> `./*` (project root)
- `@/components/*` -> `./components/*`
- `@/lib/*` -> `./lib/*`
- `@/app/*` -> `./app/*`

## Build Configuration

**Next.js Config (`next.config.js`):**
- `reactStrictMode: true`
- Image domains: `supabase.co`, `your-project.supabase.co`, `draggonnb.app`
- CORS headers on `/api/*` routes (restricted to `NEXT_PUBLIC_APP_URL`)
- Webpack: excludes `canvas` from bundle

**ESLint Config (`.eslintrc.json`):**
- Extends: `next/core-web-vitals`, `next/typescript`
- `no-console`: warn (allows `console.warn` and `console.error`)
- `@typescript-eslint/no-unused-vars`: off
- `react/no-unescaped-entities`: off

**Build Commands:**
```bash
npm run dev        # Start development server (next dev)
npm run build      # Production build (next build)
npm run start      # Start production server (next start)
npm run lint       # Run ESLint (next lint)
npm run db:verify  # Verify database connection (node scripts/verify-database.js)
```

## Platform Requirements

**Development:**
- Node.js >= 18.0.0
- npm >= 9.0.0
- `.env.local` with Supabase credentials (minimum for dev)

**Production:**
- Vercel hosting (auto-deploy from GitHub)
- Vercel Project ID: `prj_U6tKRVq7GVPHQBfwO1Op59VoZHPH`
- Vercel Org: `team_363fHJl8ftRxVR5GUDzmcLqd`
- Project Name: `draggonnb-mvp`
- Live URL: https://draggonnb-app.vercel.app

**External Services Required:**
- Supabase (PostgreSQL database + auth)
- PayFast (payment processing - South Africa)
- Resend (transactional email)
- N8N Cloud (workflow automation)
- Anthropic Claude API (AI content generation via N8N)

---

*Stack analysis: 2026-02-01*
