# Codebase Structure

> Generated: 2026-02-02

## Directory Layout

```
DraggonnB_CRMM/
├── app/                          # Next.js 14 App Router
│   ├── page.tsx                  # Landing page (minimal)
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   ├── globals.css               # Global styles + Tailwind
│   ├── login/page.tsx            # Login form
│   ├── signup/page.tsx           # Signup form
│   ├── forgot-password/page.tsx  # Password recovery
│   ├── reset-password/page.tsx   # Password reset
│   ├── pricing/page.tsx          # 3-tier pricing with PayFast checkout
│   ├── checkout/page.tsx         # Checkout confirmation
│   ├── payment/success/page.tsx  # Post-payment success
│   ├── auth/callback/route.ts    # OAuth callback handler
│   │
│   ├── (dashboard)/              # Route group - protected pages with sidebar
│   │   ├── layout.tsx            # Dashboard layout (sidebar + main content)
│   │   ├── dashboard/page.tsx    # Main dashboard with charts
│   │   ├── content-generator/page.tsx  # AI content generation
│   │   ├── crm/
│   │   │   ├── page.tsx          # CRM overview
│   │   │   ├── contacts/page.tsx # Contact list + CRUD
│   │   │   ├── companies/page.tsx # Company list + CRUD
│   │   │   └── deals/page.tsx    # Deal pipeline
│   │   └── email/
│   │       ├── page.tsx          # Email hub overview
│   │       ├── analytics/page.tsx
│   │       ├── outreach/page.tsx
│   │       ├── campaigns/
│   │       │   ├── page.tsx      # Campaign list
│   │       │   └── new/page.tsx  # Create campaign
│   │       ├── sequences/
│   │       │   ├── page.tsx      # Sequence list
│   │       │   ├── builder/page.tsx
│   │       │   └── [id]/page.tsx # Edit sequence
│   │       └── templates/
│   │           ├── page.tsx      # Template list
│   │           └── editor/page.tsx
│   │
│   └── api/                      # API Routes (26 endpoints)
│       ├── setup/route.ts        # Database verification
│       ├── payments/checkout/route.ts  # PayFast checkout initiation
│       ├── webhooks/payfast/route.ts   # PayFast ITN handler (220 lines)
│       ├── content/
│       │   ├── generate/route.ts       # AI content via N8N
│       │   └── queue/route.ts          # Content queue
│       ├── crm/
│       │   ├── contacts/route.ts       # GET/POST contacts
│       │   ├── contacts/[id]/route.ts  # GET/PUT/DELETE contact
│       │   ├── companies/route.ts
│       │   ├── companies/[id]/route.ts
│       │   ├── deals/route.ts
│       │   └── deals/[id]/route.ts
│       └── email/
│           ├── send/route.ts
│           ├── track/route.ts
│           ├── analytics/route.ts
│           ├── webhooks/route.ts
│           ├── campaigns/route.ts
│           ├── campaigns/[id]/route.ts
│           ├── campaigns/[id]/send/route.ts
│           ├── templates/route.ts
│           ├── templates/[id]/route.ts
│           ├── sequences/route.ts
│           ├── sequences/[id]/route.ts
│           ├── sequences/[id]/steps/route.ts
│           ├── sequences/[id]/steps/[stepId]/route.ts
│           ├── outreach/route.ts
│           └── outreach/[id]/route.ts
│
├── components/
│   ├── ui/                       # shadcn/ui components (20 files)
│   │   ├── button.tsx, card.tsx, dialog.tsx, input.tsx, label.tsx
│   │   ├── select.tsx, table.tsx, tabs.tsx, toast.tsx, badge.tsx
│   │   ├── avatar.tsx, checkbox.tsx, dropdown-menu.tsx, form.tsx
│   │   ├── progress.tsx, radio-group.tsx, separator.tsx, switch.tsx
│   │   ├── textarea.tsx, toaster.tsx
│   │   └── use-toast.ts
│   ├── dashboard/                # Dashboard-specific components
│   │   ├── Sidebar.tsx           # Left nav sidebar
│   │   ├── DashboardHeader.tsx   # Top header bar
│   │   ├── StatCard.tsx          # KPI stat cards
│   │   ├── EngagementChart.tsx   # Recharts engagement viz
│   │   ├── RealtimeEngagementChart.tsx  # Supabase realtime chart
│   │   ├── TopPerformingPosts.tsx
│   │   ├── BestPostingTimes.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── QuickActions.tsx
│   │   └── index.ts
│   ├── email/
│   │   ├── TemplateEditor.tsx    # Drag-drop email editor
│   │   └── TemplatePreview.tsx
│   └── auth/
│       ├── user-nav.tsx          # User dropdown menu
│       └── logout-button.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client (createBrowserClient)
│   │   ├── server.ts             # Server client (createServerClient)
│   │   └── middleware.ts         # Auth session refresh middleware
│   ├── payments/
│   │   └── payfast.ts            # PayFast API (330 lines, signatures, verification)
│   ├── auth/
│   │   ├── actions.ts            # Server actions (login, signup, logout)
│   │   └── get-user-org.ts       # getUserOrg() helper with types
│   ├── email/
│   │   ├── resend.ts             # Resend email client
│   │   └── types.ts              # Email type definitions
│   ├── n8n/
│   │   └── webhooks.ts           # N8N webhook helpers (5 functions)
│   ├── styles/
│   │   ├── colors.ts             # Color utilities
│   │   └── variables.ts          # CSS variables
│   ├── utils.ts                  # General utilities
│   └── utils/
│       └── cn.ts                 # Tailwind class merger
│
├── hooks/
│   └── use-toast.ts              # Toast notification hook
│
├── scripts/                      # Database utilities (11 files)
│   ├── setup-database.sql        # Full schema SQL
│   ├── verify-database.js        # Connection verify
│   ├── check-schema.ts, check-tables.ts
│   ├── create-users-table.ts, execute-sql.ts
│   ├── run-setup.ts, setup-db-postgres.ts
│   ├── test-payfast-tiers.ts, test-webhook-handler.ts
│   └── README.md
│
├── supabase/
│   ├── migrations/               # 5 SQL migration files
│   │   ├── 00_initial_schema.sql
│   │   ├── 01_add_missing_tables.sql
│   │   ├── 01_rls_policies.sql
│   │   ├── 02_email_automation.sql
│   │   └── 03_crm_tables.sql
│   └── README.md                 # Deployment guide
│
├── Architecture/                 # Technical documentation (8 files)
├── docs/                         # Additional docs (5 files)
├── .vercel/project.json          # Vercel project binding
├── middleware.ts                 # Auth middleware entry
├── package.json                  # 46 dependencies
├── tsconfig.json                 # TypeScript strict
├── tailwind.config.ts            # Custom theme
├── next.config.js, .eslintrc.json, postcss.config.js
├── .env.example                  # Env template
├── CLAUDE.md                     # Master documentation (69KB)
└── [30+ documentation .md files]
```

## Key Files by Function

| Function | Key File | Lines |
|----------|----------|-------|
| Auth middleware | `middleware.ts` → `lib/supabase/middleware.ts` | ~20 + ~40 |
| User/Org resolution | `lib/auth/get-user-org.ts` | 95 |
| PayFast payments | `lib/payments/payfast.ts` | 330 |
| PayFast webhook | `app/api/webhooks/payfast/route.ts` | 250 |
| N8N integration | `lib/n8n/webhooks.ts` | 177 |
| Email service | `lib/email/resend.ts` | ~60 |
| Dashboard layout | `app/(dashboard)/layout.tsx` | ~30 |
| Sidebar nav | `components/dashboard/Sidebar.tsx` | ~100 |

## Route Group Pattern

The `(dashboard)` route group provides:
- Shared layout with sidebar navigation
- Protected routes (auth middleware applies)
- Consistent UI wrapper for all dashboard pages
- Public pages (login, signup, pricing) live outside the group
