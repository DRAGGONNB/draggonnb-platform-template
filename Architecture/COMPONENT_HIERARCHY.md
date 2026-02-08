# DraggonnB CRMM - Component Hierarchy Diagram

**Created:** 2025-11-30
**Purpose:** Visual component structure and data flow

---

## Application Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Root Layout (layout.tsx)                    │
│  - Global styles (globals.css)                                      │
│  - Font configuration                                               │
│  - Toast provider                                                   │
│  - Zustand store providers                                          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                 ┌────────────────┴────────────────┐
                 │                                 │
        ┌────────▼────────┐              ┌────────▼────────┐
        │   (auth) Group  │              │ (dashboard)     │
        │   Route Group   │              │   Route Group   │
        └────────┬────────┘              └────────┬────────┘
                 │                                │
    ┌────────────┴────────────┐      ┌───────────┴──────────────────┐
    │                         │      │                              │
┌───▼───┐  ┌────▼─────┐  ┌──▼──┐  ┌─▼────────┐  ┌──────▼──────┐  │
│/login │  │ /signup  │  │/reset│  │/dashboard│  │ /contacts   │  ...
│       │  │          │  │      │  │          │  │             │
└───────┘  └──────────┘  └──────┘  └──────────┘  └─────────────┘
```

---

## Auth Layout Hierarchy

```
app/(auth)/layout.tsx
│
└── AuthLayout Component
    │
    ├── Centered Container (max-w-md)
    │   │
    │   └── Gradient Background (#667EEA → #764BA2)
    │
    └── Page Content (children)
        │
        ├── /login/page.tsx
        │   └── LoginForm
        │       ├── Logo
        │       ├── Input (email)
        │       ├── Input (password)
        │       ├── Checkbox (remember me)
        │       ├── Button (primary)
        │       └── Links (signup, forgot password)
        │
        ├── /signup/page.tsx
        │   └── SignupForm
        │       ├── Logo
        │       ├── Input (company name)
        │       ├── Input (full name)
        │       ├── Input (email)
        │       ├── Input (password)
        │       ├── Input (confirm password)
        │       ├── Progress (password strength)
        │       ├── Checkbox (terms)
        │       ├── Button (primary)
        │       └── Link (login)
        │
        └── /forgot-password/page.tsx
            └── PasswordResetForm
                ├── Logo
                ├── Input (email)
                ├── Button (primary)
                └── Link (back to login)
```

---

## Dashboard Layout Hierarchy

```
app/(dashboard)/layout.tsx
│
└── AppShell Component
    │
    ├── Sidebar (Fixed Left, 256px)
    │   ├── Logo/Branding
    │   ├── Navigation
    │   │   ├── SidebarSection ("Main")
    │   │   │   ├── SidebarItem (Dashboard) [active]
    │   │   │   ├── SidebarItem (Contacts) [badge: 23]
    │   │   │   ├── SidebarItem (Content Calendar)
    │   │   │   └── SidebarItem (Analytics) [badge: NEW]
    │   │   │
    │   │   ├── SidebarSection ("Automation")
    │   │   │   ├── SidebarItem (AI Content Generator)
    │   │   │   ├── SidebarItem (Scheduled Posts)
    │   │   │   └── SidebarItem (Workflows) [badge: 3]
    │   │   │
    │   │   ├── SidebarSection ("Social Platforms")
    │   │   │   ├── SidebarItem (LinkedIn)
    │   │   │   ├── SidebarItem (Facebook)
    │   │   │   └── SidebarItem (Instagram)
    │   │   │
    │   │   └── SidebarSection ("Management")
    │   │       ├── SidebarItem (Settings)
    │   │       ├── SidebarItem (Team Members)
    │   │       └── SidebarItem (Billing)
    │   │
    │   └── UsageTracker (Fixed Bottom)
    │       ├── UsageMeter (Posts This Month: 23/30)
    │       ├── UsageMeter (AI Generations: 45/50)
    │       └── Button (Upgrade Plan)
    │
    ├── Header (Fixed Top)
    │   ├── Header Top Row
    │   │   ├── SearchBox (max-w-400px)
    │   │   ├── Button (+ New)
    │   │   ├── IconButton (Notifications) [badge: count]
    │   │   ├── IconButton (Help)
    │   │   └── DropdownMenu (User Avatar)
    │   │       ├── MenuItem (Profile)
    │   │       ├── MenuItem (Settings)
    │   │       ├── Separator
    │   │       └── MenuItem (Logout)
    │   │
    │   └── Header Bottom Row
    │       └── Breadcrumbs
    │           ├── BreadcrumbItem (Dashboard)
    │           ├── Separator (→)
    │           └── BreadcrumbItem (Analytics)
    │
    └── Main Content Area
        │
        └── Page Content (children)
            ├── /dashboard/page.tsx (see below)
            ├── /contacts/page.tsx
            ├── /content-calendar/page.tsx
            ├── /analytics/page.tsx
            └── ... (other pages)
```

---

## Dashboard Page Component Tree

```
/dashboard/page.tsx
│
├── HeroSection
│   ├── Welcome Title ("Welcome back, Chris! 👋")
│   ├── Subtitle ("Last 30 Days Performance Overview")
│   └── Stats Grid (4 columns → 2 cols tablet → 1 col mobile)
│       ├── StatCard (Posts Published)
│       │   ├── Icon (📝)
│       │   ├── Value (87)
│       │   ├── Label ("Posts Published")
│       │   └── Trend ("+12 from last month ↑")
│       ├── StatCard (Engagement Rate)
│       ├── StatCard (New Contacts)
│       └── StatCard (Revenue Impact)
│
└── Main Grid (2/3 + 1/3 layout)
    │
    ├── Left Column (Main Content - 2/3 width)
    │   │
    │   ├── Card (Engagement Chart)
    │   │   ├── CardHeader
    │   │   │   ├── Title ("Engagement Over Time")
    │   │   │   └── Select (Filter: "Last 7 days")
    │   │   ├── Tabs
    │   │   │   ├── TabsList
    │   │   │   │   ├── TabsTrigger (Overview) [active]
    │   │   │   │   ├── TabsTrigger (Performance)
    │   │   │   │   └── TabsTrigger (Audience)
    │   │   │   └── TabsContent
    │   │   │       └── EngagementChart (recharts LineChart)
    │   │   │           ├── Line (LinkedIn - #0A66C2)
    │   │   │           ├── Line (Facebook - #1877F2)
    │   │   │           ├── Line (Instagram - #E4405F)
    │   │   │           ├── XAxis (dates)
    │   │   │           ├── YAxis (engagement)
    │   │   │           ├── Tooltip
    │   │   │           └── Legend
    │   │   │
    │   │   └── CardContent
    │   │
    │   └── Bottom Cards Grid (2 columns)
    │       ├── TopPostsCard
    │       │   ├── CardHeader ("📊 Top Performing Posts")
    │       │   └── CardContent
    │       │       ├── PostItem (Product Launch - 234 engagements)
    │       │       ├── PostItem (Team Achievement - 189)
    │       │       └── PostItem (Blog Post Share - 156)
    │       │
    │       └── BestTimesCard
    │           ├── CardHeader ("🕐 Best Posting Times")
    │           └── CardContent
    │               ├── TimeItem (Tuesday 2 PM - Highest engagement)
    │               ├── TimeItem (Thursday 10 AM - High reach)
    │               └── TimeItem (Monday 6 PM - Good engagement)
    │
    └── Right Column (Widgets - 1/3 width)
        │
        ├── QuickActionsWidget
        │   ├── WidgetTitle ("Quick Actions")
        │   └── Actions
        │       ├── Button (+ Generate Post)
        │       ├── Button (+ Add Contact)
        │       └── Button (+ Schedule Content)
        │
        ├── UpcomingPostsWidget
        │   ├── WidgetTitle ("Upcoming Posts")
        │   └── Content
        │       ├── Section (Today - 3 posts scheduled)
        │       └── Section (This Week - 12 posts total)
        │
        ├── UsageLimitsWidget
        │   ├── WidgetTitle ("Usage & Limits")
        │   └── Metrics
        │       └── UsageMeter (Storage: 2.3GB / 5GB)
        │           ├── Label
        │           └── ProgressBar (46% filled)
        │
        ├── TeamActivityWidget
        │   ├── WidgetTitle ("Team Activity")
        │   └── Activities
        │       ├── ActivityItem
        │       │   ├── Avatar (SA)
        │       │   ├── Text ("Sarah posted to LinkedIn")
        │       │   └── Time ("10 min ago")
        │       └── ActivityItem
        │           ├── Avatar (MJ)
        │           ├── Text ("Mike added 3 contacts")
        │           └── Time ("1 hour ago")
        │
        └── TipsInsightsWidget
            ├── WidgetTitle ("💡 Tips & Insights")
            └── Content
                └── Tip ("Your best posting time is Tuesday 2 PM")
```

---

## Contacts Page Component Tree

```
/contacts/page.tsx
│
├── PageHeader
│   ├── Title ("Contacts")
│   ├── Subtitle ("Manage your CRM contacts and leads")
│   └── Actions
│       ├── Button (+ Add Contact)
│       └── Button (Import)
│
├── FiltersPanel
│   ├── SearchInput ("Search contacts...")
│   ├── Select (Filter by status)
│   ├── Select (Filter by tag)
│   └── Button (Clear filters)
│
├── ContactList
│   ├── Tabs (View switcher)
│   │   ├── TabsTrigger (Grid View) [active]
│   │   └── TabsTrigger (List View)
│   │
│   └── TabsContent
│       ├── Grid View (ContactCard components)
│       │   └── ContactCard (repeated)
│       │       ├── Avatar
│       │       ├── Name
│       │       ├── Company
│       │       ├── Email
│       │       ├── Phone
│       │       ├── Tags (Badge components)
│       │       └── Actions (Dropdown)
│       │
│       └── List View (Table component)
│           └── Table
│               ├── TableHeader
│               └── TableBody
│                   └── TableRow (repeated)
│                       ├── Cell (Avatar + Name)
│                       ├── Cell (Company)
│                       ├── Cell (Email)
│                       ├── Cell (Phone)
│                       ├── Cell (Tags)
│                       └── Cell (Actions)
│
└── Pagination
    ├── Page Info ("Showing 1-20 of 234")
    └── Page Controls
        ├── Button (Previous)
        └── Button (Next)
```

---

## AI Content Generator Page Tree

```
/ai-generator/page.tsx
│
├── PageHeader
│   ├── Title ("AI Content Generator")
│   └── Subtitle ("Generate engaging social media content with AI")
│
└── Two-Column Layout
    │
    ├── Left Panel (Form)
    │   └── ContentGenerator Form
    │       ├── Section (Platform Selection)
    │       │   ├── Label ("Select Platforms")
    │       │   └── Checkbox Group
    │       │       ├── Checkbox (LinkedIn)
    │       │       ├── Checkbox (Facebook)
    │       │       └── Checkbox (Instagram)
    │       │
    │       ├── Section (Topic/Prompt)
    │       │   ├── Label ("What do you want to post about?")
    │       │   └── Textarea (rows: 4)
    │       │
    │       ├── Section (Tone & Style)
    │       │   ├── Label ("Tone")
    │       │   ├── Select
    │       │   │   ├── Option (Professional)
    │       │   │   ├── Option (Casual)
    │       │   │   ├── Option (Inspiring)
    │       │   │   └── Option (Humorous)
    │       │   │
    │       │   ├── Label ("Include")
    │       │   └── Checkbox Group
    │       │       ├── Checkbox (Emojis)
    │       │       ├── Checkbox (Hashtags)
    │       │       └── Checkbox (Call-to-action)
    │       │
    │       └── Actions
    │           ├── Button (Generate Content) [primary, full width]
    │           └── Progress (AI Generation in progress...)
    │
    └── Right Panel (Preview)
        └── ContentPreview
            ├── Tabs (Platform tabs)
            │   ├── TabsTrigger (LinkedIn)
            │   ├── TabsTrigger (Facebook)
            │   └── TabsTrigger (Instagram)
            │
            └── TabsContent
                ├── Card (Post preview)
                │   ├── Header (Platform logo + Character count)
                │   ├── Body (Generated content)
                │   └── Footer
                │       ├── Button (Edit)
                │       ├── Button (Regenerate)
                │       └── Button (Schedule Post) [primary]
                │
                └── Suggestions
                    ├── Label ("Alternative versions")
                    └── List
                        ├── SuggestionCard (Version 1)
                        ├── SuggestionCard (Version 2)
                        └── SuggestionCard (Version 3)
```

---

## Content Calendar Page Tree

```
/content-calendar/page.tsx
│
├── PageHeader
│   ├── Title ("Content Calendar")
│   ├── Subtitle ("Plan and schedule your social media posts")
│   └── Actions
│       ├── Button (+ New Post)
│       └── Select (View: Month/Week/Day)
│
├── Calendar Toolbar
│   ├── Button (Today)
│   ├── Navigation
│   │   ├── Button (Previous)
│   │   ├── DateDisplay ("November 2025")
│   │   └── Button (Next)
│   └── Filters
│       ├── Select (All Platforms / LinkedIn / Facebook / Instagram)
│       └── Select (All Status / Draft / Scheduled / Published)
│
├── ContentCalendar (react-big-calendar)
│   ├── Calendar Grid
│   │   └── Event (repeated)
│   │       ├── Time
│   │       ├── Platform Icon
│   │       ├── Content Preview (truncated)
│   │       └── Status Badge
│   │
│   └── onClick → PostDetailDialog
│       └── Dialog
│           ├── DialogHeader (Post details)
│           ├── DialogContent
│           │   ├── Platform (Badge)
│           │   ├── Schedule Date/Time
│           │   ├── Content (full text)
│           │   ├── Media Preview (if applicable)
│           │   └── Status (Draft/Scheduled/Published)
│           └── DialogFooter
│               ├── Button (Cancel)
│               ├── Button (Edit)
│               ├── Button (Reschedule)
│               └── Button (Delete) [destructive]
│
└── Legend
    ├── Badge (LinkedIn - Blue)
    ├── Badge (Facebook - Blue)
    ├── Badge (Instagram - Pink)
    ├── Badge (Draft - Gray)
    ├── Badge (Scheduled - Orange)
    └── Badge (Published - Green)
```

---

## Analytics Page Tree

```
/analytics/page.tsx
│
├── PageHeader
│   ├── Title ("Analytics Dashboard")
│   ├── Subtitle ("Track your social media performance")
│   └── Actions
│       ├── DateRangePicker (Last 30 days)
│       └── Button (Export Report)
│
├── KPI Overview Grid (4 columns)
│   ├── MetricCard (Total Reach)
│   │   ├── Icon
│   │   ├── Value (12.4K)
│   │   ├── Change (+8.2%)
│   │   └── Sparkline (mini chart)
│   ├── MetricCard (Engagement Rate)
│   ├── MetricCard (Total Likes)
│   └── MetricCard (Total Shares)
│
├── Platform Performance
│   ├── CardHeader ("Platform Breakdown")
│   └── Tabs
│       ├── TabsList
│       │   ├── TabsTrigger (All Platforms)
│       │   ├── TabsTrigger (LinkedIn)
│       │   ├── TabsTrigger (Facebook)
│       │   └── TabsTrigger (Instagram)
│       └── TabsContent
│           ├── PlatformChart (recharts BarChart)
│           │   ├── Bar (Reach)
│           │   ├── Bar (Engagement)
│           │   ├── Bar (Clicks)
│           │   └── Tooltip
│           └── InsightsTable
│
├── Top Performing Content
│   ├── CardHeader ("Top Posts This Month")
│   └── Table
│       ├── TableHeader
│       │   ├── Column (Post)
│       │   ├── Column (Platform)
│       │   ├── Column (Reach)
│       │   ├── Column (Engagement)
│       │   └── Column (Date)
│       └── TableBody
│           └── TableRow (repeated)
│
├── Audience Insights
│   ├── CardHeader ("Audience Demographics")
│   └── Two-Column Layout
│       ├── PieChart (Age Distribution)
│       └── PieChart (Location Distribution)
│
└── Engagement Timeline
    ├── CardHeader ("Engagement Over Time")
    └── EngagementChart (recharts LineChart)
        ├── Line (Likes)
        ├── Line (Comments)
        ├── Line (Shares)
        └── Area (Reach - background)
```

---

## Reusable Component Library

### shadcn/ui Base Components

```
components/ui/
├── button.tsx                # Primary, secondary, outline, ghost variants
├── input.tsx                 # Text input with icon support
├── card.tsx                  # Card, CardHeader, CardTitle, CardContent, CardFooter
├── badge.tsx                 # Status badges, notification counts
├── avatar.tsx                # User/team avatars with fallback
├── dropdown-menu.tsx         # User menu, context menus
├── dialog.tsx                # Modals, confirmations
├── tabs.tsx                  # Tab navigation
├── select.tsx                # Dropdown selections
├── calendar.tsx              # Date picker
├── command.tsx               # Command palette (Cmd+K)
├── popover.tsx               # Tooltips, popovers
├── progress.tsx              # Usage meters, loading bars
├── separator.tsx             # Horizontal/vertical dividers
├── toast.tsx                 # Notifications
├── form.tsx                  # Form wrapper (react-hook-form)
├── label.tsx                 # Form labels
├── textarea.tsx              # Multi-line text input
├── checkbox.tsx              # Checkboxes
├── radio-group.tsx           # Radio buttons
├── switch.tsx                # Toggle switches
├── table.tsx                 # Data tables
├── scroll-area.tsx           # Scrollable containers
├── skeleton.tsx              # Loading placeholders
└── tooltip.tsx               # Hover tooltips
```

### Custom Components

```
components/
├── layout/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── AppShell.tsx
│   └── RightSidebar.tsx
│
├── navigation/
│   ├── SidebarItem.tsx
│   ├── SidebarSection.tsx
│   ├── Breadcrumbs.tsx
│   └── UsageTracker.tsx
│
├── dashboard/
│   ├── HeroSection.tsx
│   ├── StatCard.tsx
│   ├── EngagementChart.tsx
│   ├── TopPostsCard.tsx
│   ├── BestTimesCard.tsx
│   └── TabNavigation.tsx
│
├── widgets/
│   ├── QuickActionsWidget.tsx
│   ├── UpcomingPostsWidget.tsx
│   ├── UsageLimitsWidget.tsx
│   ├── TeamActivityWidget.tsx
│   └── TipsInsightsWidget.tsx
│
├── content/
│   ├── ContentGenerator.tsx
│   ├── ContentPreview.tsx
│   ├── ContentCalendar.tsx
│   ├── PostCard.tsx
│   └── ApprovalWorkflow.tsx
│
├── contacts/
│   ├── ContactList.tsx
│   ├── ContactCard.tsx
│   ├── ContactForm.tsx
│   └── ContactFilters.tsx
│
├── analytics/
│   ├── AnalyticsDashboard.tsx
│   ├── MetricCard.tsx
│   ├── PlatformChart.tsx
│   └── ExportButton.tsx
│
└── auth/
    ├── LoginForm.tsx
    ├── SignupForm.tsx
    ├── PasswordResetForm.tsx
    └── AuthLayout.tsx
```

---

## Data Flow Diagram

```
User Action (Browser)
    ↓
React Component
    ↓
┌───────────────────┐
│   Event Handler   │
│  (onClick, etc.)  │
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
[Client]  [Server]
Zustand   Supabase
Store     Database
    │         │
    └────┬────┘
         ↓
   Update UI
    (re-render)
```

### Example: Generate AI Content Flow

```
1. User fills form (ContentGenerator component)
   ↓
2. onClick → generateContent() handler
   ↓
3. POST /api/content/generate
   ↓
4. API route forwards to N8N webhook
   ↓
5. N8N calls Claude API
   ↓
6. N8N stores result in Supabase
   ↓
7. Supabase real-time event fires
   ↓
8. React component receives update
   ↓
9. ContentPreview shows generated content
   ↓
10. User clicks "Schedule Post"
    ↓
11. Insert into content_queue table
    ↓
12. Calendar view updates (real-time)
```

---

## State Management Flow

### Zustand Store Updates

```typescript
// User login
authStore.setUser(user)
  → triggers re-render of Header (user avatar)
  → triggers re-render of Sidebar (organization data)
  → triggers re-render of Dashboard (usage metrics)

// Open modal
uiStore.openModal('create-contact')
  → Dialog component renders
  → Backdrop overlay appears

// Save draft content
contentStore.saveDraft(post)
  → Persists to localStorage
  → Shows "Draft saved" toast
  → Updates draft indicator in UI
```

### Supabase Real-time Subscriptions

```typescript
// Dashboard page subscribes to:
- New posts (social_posts table)
- Team activity (audit_log table)
- Usage updates (client_usage_metrics table)

// Calendar page subscribes to:
- Content queue changes (content_queue table)

// Analytics page subscribes to:
- Metric snapshots (analytics_snapshots table)
```

---

## Props & Interfaces

### Common Component Props

```typescript
// StatCard
interface StatCardProps {
  icon: React.ReactNode | string
  value: number | string
  label: string
  trend?: string
  trendDirection?: 'up' | 'down'
  className?: string
}

// SidebarItem
interface SidebarItemProps {
  icon: React.ReactNode | string
  label: string
  href: string
  badge?: number | string
  badgeColor?: 'primary' | 'success' | 'warning' | 'danger'
  active?: boolean
  onClick?: () => void
}

// UsageMeter
interface UsageMeterProps {
  label: string
  current: number
  limit: number
  unit?: string
  showWarning?: boolean // Show warning color at 80%+
}

// Widget wrapper
interface WidgetProps {
  title: string
  className?: string
  children: React.ReactNode
}
```

---

## Naming Conventions

### Files
- Components: PascalCase (e.g., `Sidebar.tsx`, `StatCard.tsx`)
- Pages: lowercase (e.g., `page.tsx`, `layout.tsx`)
- Utilities: camelCase (e.g., `formatters.ts`, `validators.ts`)
- Types: PascalCase (e.g., `User.ts`, `Post.ts`)

### Variables
- React components: PascalCase (e.g., `const StatCard = () => {}`)
- Functions: camelCase (e.g., `const formatDate = () => {}`)
- Constants: UPPER_SNAKE_CASE (e.g., `const API_BASE_URL = ...`)
- Props interfaces: PascalCase + Props (e.g., `interface StatCardProps {}`)

### CSS Classes (Tailwind)
- Utility-first approach
- Use `cn()` helper for conditional classes
- Component-specific classes via props

---

**END OF COMPONENT HIERARCHY DIAGRAM**

**Last Updated:** 2025-11-30
**Status:** Reference document for development
