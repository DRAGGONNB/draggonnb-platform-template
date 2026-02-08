# DraggonnB CRMM - Complete Technical Architecture

---

## 🏗️ SYSTEM ARCHITECTURE OVERVIEW

```
                    ┌──────────────────────────────────┐
                    │   CLAUDE CODE API (VPS)          │
                    │   Central Orchestration Layer    │
                    │   - Lead Processing              │
                    │   - Business Analysis            │
                    │   - Client Provisioning          │
                    │   - Deployment Management        │
                    └───────────┬──────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
        │   SUPABASE   │ │    N8N    │ │   VERCEL    │
        │  (Database)  │ │(Workflows)│ │  (Hosting)  │
        └──────────────┘ └───────────┘ └─────────────┘
             │                  │              │
   Per-Client Projects   Shared Automation  Per-Client Apps
```

---

## 📊 DATA ARCHITECTURE

### **Multi-Tenant Strategy: Isolated Databases**

**Why Separate Supabase Projects per Client:**
- ✅ Complete data isolation
- ✅ No RLS complexity
- ✅ Independent scaling
- ✅ Client-specific backups
- ✅ Easier to manage/migrate
- ✅ Simpler security model

### **Template Database Schema**

**Core Tables (Standard for All Clients):**

```sql
-- Organizations & Users
organizations (id, name, subscription_tier, limits, created_at)
users (id, email, role, organization_id)
user_permissions (user_id, permission, resource)

-- CRM & Leads
leads (id, source, status, assigned_to, qualification_data)
contacts (id, name, email, company, lead_id)
deals (id, contact_id, value, stage, probability)
activities (id, type, contact_id, notes, completed_at)

-- Social Media
social_platforms (id, name, api_config)
social_accounts (id, platform_id, org_id, credentials)
social_posts (id, content, platform_ids, status, scheduled_for)
content_queue (id, post_id, platform_id, publish_at, status)
content_templates (id, name, prompt_template, platform_config)

-- Analytics
analytics_snapshots (id, org_id, metrics, period, created_at)
platform_metrics (id, platform_id, post_id, engagement_data)

-- Automation
n8n_webhooks (id, org_id, webhook_type, webhook_url)
ai_generation_log (id, prompt, output, model, tokens_used)

-- Billing & Usage
client_usage_metrics (id, org_id, metric_name, value, date)
subscription_history (id, org_id, plan, status, billing_date)
invoices (id, org_id, amount, paid_at, payfast_payment_id)

-- System
onboarding_checklist (id, org_id, step, completed, completed_at)
notifications (id, user_id, type, message, read_at)
audit_log (id, user_id, action, resource, metadata)
```

**Client-Specific Extensions:**
- `client_custom_fields` - JSONB for flexible data
- `service_specific_tables` - Added based on quick wins
- `industry_modules` - E-commerce, real estate, etc.

---

## 🔄 WORKFLOW ARCHITECTURE

### **N8n Workflow Strategy: Shared Workflows with Client Context**

**Why Shared N8n:**
- ✅ Centralized automation management
- ✅ Single point for updates
- ✅ Cost efficient (one N8n instance)
- ✅ Easier monitoring
- ✅ Consistent behavior across clients

**How Client Isolation Works:**
1. Every webhook includes `organization_id`
2. Workflows fetch client-specific DB connection
3. Process data in client's Supabase project
4. Return results to client's app

### **Core Workflows**

#### **1. Lead Qualification & Business Analysis**
```
Trigger: Social Media/Web Form
    ↓
Extract Contact Info
    ↓
Store in Leads Table
    ↓
Trigger Claude Analysis
    ↓
Web Scrape Company Info
    ↓
Competitor Analysis
    ↓
Identify 3 Quick Wins
    ↓
Generate Solution Proposal
    ↓
Store Analysis Results
    ↓
Notify Sales Team
```

#### **2. Client Provisioning Automation**
```
Trigger: Client Approval + Payment Confirmed
    ↓
Create Supabase Project
    ↓
Clone Database Template
    ↓
Generate API Keys
    ↓
Clone GitHub Template Repo
    ↓
Configure Environment Variables
    ↓
Deploy to Vercel
    ↓
Configure N8n Webhooks
    ↓
Send Onboarding Email
    ↓
Create Training Materials
    ↓
Schedule Kickoff Call
```

#### **3. Social Content AI Generator**
```
Trigger: User Request (webhook)
    ↓
Validate Organization & Limits
    ↓
Get Client's Content Templates
    ↓
Claude Content Generation
    ↓
Platform-Specific Formatting
    ↓
Store in Content Queue
    ↓
Require Approval? → Yes/No
    ↓
Schedule for Publishing
    ↓
Update Usage Metrics
```

#### **4. Content Publishing**
```
Trigger: Cron (every 15 mins)
    ↓
Query Due Posts (content_queue)
    ↓
For Each Post:
    ├→ Get Social Account Credentials
    ├→ Get Platform API Config
    ├→ Publish to Platform
    ├→ Store platform_post_id
    └→ Update Status
    ↓
Log Results
    ↓
Increment Usage Counters
```

#### **5. Analytics Collection**
```
Trigger: Cron (daily 6 AM UTC)
    ↓
Get All Active Organizations
    ↓
For Each Organization:
    ├→ Fetch Published Posts (24h)
    ├→ Collect Platform Metrics
    ├→ Calculate Engagement Stats
    ├→ Store Snapshot
    └→ If Monday: Weekly Report
    ↓
Send Summary Notifications
```

---

## 🚀 DEPLOYMENT ARCHITECTURE

### **Per-Client Deployment Stack**

```
Client: "Example Business Ltd"
    │
    ├─ Supabase Project: example-business-db
    │  ├─ Template schema cloned
    │  ├─ Client data isolated
    │  └─ API keys generated
    │
    ├─ GitHub Repo: draggonnb-example-business
    │  ├─ Cloned from template
    │  ├─ Client-specific config
    │  └─ Environment variables
    │
    ├─ Vercel Deployment: example-business.draggonnb.app
    │  ├─ Connected to GitHub repo
    │  ├─ Auto-deploy on push
    │  └─ Environment secrets configured
    │
    └─ N8n Webhooks: Organization-specific URLs
       ├─ /webhook/example-business/generate-content
       ├─ /webhook/example-business/analytics
       └─ /webhook/example-business/notifications
```

### **Claude Code Orchestration Layer**

**Hosted on:** Hostinger VPS (Ubuntu 22.04+)

**Responsibilities:**
1. **Lead Processing**
   - Receive lead from social/web
   - Trigger business analysis
   - Web scraping & research
   - Generate proposal
   
2. **Client Provisioning**
   - Supabase project creation
   - Database template cloning
   - GitHub repo generation
   - Vercel deployment
   - N8n webhook configuration

3. **Ongoing Management**
   - Monitor usage metrics
   - Trigger billing events
   - Handle escalations
   - System health checks

**MCP Connectors Required:**
- `@modelcontextprotocol/server-supabase`
- Custom N8n MCP server
- `@modelcontextprotocol/server-github`
- Custom Vercel MCP server
- `@modelcontextprotocol/server-filesystem`

---

## 🔐 SECURITY ARCHITECTURE

### **Multi-Layer Security Model**

```
┌─────────────────────────────────────────┐
│  Client App (Vercel)                    │
│  - Row Level Security (RLS)             │
│  - JWT Authentication                   │
│  - Role-Based Access Control            │
└─────────────────────────────────────────┘
                  │
┌─────────────────────────────────────────┐
│  API Layer (Supabase)                   │
│  - API Key Authentication               │
│  - Request Rate Limiting                │
│  - Encrypted Connections (HTTPS)        │
└─────────────────────────────────────────┘
                  │
┌─────────────────────────────────────────┐
│  Database (Supabase Projects)           │
│  - Per-Client Isolation                 │
│  - Encrypted at Rest                    │
│  - Automated Backups                    │
└─────────────────────────────────────────┘
```

### **Credential Management**

**Social Platform Tokens:**
- Stored encrypted in `social_accounts` table
- Refreshed automatically (OAuth flow)
- Never exposed to client apps
- Used only in N8n workflows

**API Keys:**
- Supabase: Environment variables per client
- N8n: Webhook URLs with validation tokens
- Claude API: Centralized in orchestrator
- PayFast: Encrypted in master database

---

## 💳 BILLING ARCHITECTURE

### **PayFast Integration Flow**

```
Client Approves Subscription
    ↓
Generate PayFast Payment Request
    ↓
Redirect to PayFast Payment Page
    ↓
Client Completes Payment
    ↓
PayFast Webhook → Claude Code API
    ↓
Verify Payment Signature
    ↓
Update Subscription Status
    ↓
Trigger Client Provisioning
    ↓
Send Welcome Email
```

### **Usage Tracking & Enforcement**

**Metrics Tracked:**
- `posts_monthly` - Social media posts published
- `ai_generations` - Claude API calls
- `social_accounts` - Connected platforms
- `users` - Active team members
- `api_calls` - External API usage

**Enforcement Logic:**
```javascript
async function checkUsageLimits(orgId, metric) {
  const usage = await getUsageMetrics(orgId, metric, 'current_month');
  const limits = await getSubscriptionLimits(orgId);
  
  if (usage >= limits[metric]) {
    throw new Error(`Monthly ${metric} limit reached`);
  }
  
  return { allowed: true, remaining: limits[metric] - usage };
}
```

---

## 🔌 API ARCHITECTURE

### **External API Integrations**

#### **Social Platforms**

**Facebook/Instagram Graph API:**
```javascript
POST https://graph.facebook.com/v18.0/${PAGE_ID}/feed
{
  "message": "Post content",
  "access_token": "..."
}
```

**LinkedIn REST API:**
```javascript
POST https://api.linkedin.com/v2/ugcPosts
Headers: Authorization: Bearer {token}
{
  "author": "urn:li:person:...",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": { "text": "..." }
    }
  }
}
```

**Twitter/X API:**
```javascript
POST https://api.twitter.com/2/tweets
Headers: Authorization: Bearer {token}
{
  "text": "Post content"
}
```

#### **Payment Platform**

**PayFast API:**
```javascript
// Create Subscription
POST https://api.payfast.co.za/subscriptions
{
  "merchant_id": "...",
  "merchant_key": "...",
  "amount": 1500,
  "item_name": "DraggonnB Starter Plan",
  "recurring": "monthly"
}

// Webhook Verification
function verifyPayFastSignature(data, signature) {
  const hash = crypto
    .createHash('md5')
    .update(generateParamString(data))
    .digest('hex');
  return hash === signature;
}
```

---

## 📡 COMMUNICATION ARCHITECTURE

### **Multi-Channel Notifications**

**WhatsApp Business API:**
```javascript
POST https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages
{
  "messaging_product": "whatsapp",
  "to": "27821234567",
  "type": "template",
  "template": {
    "name": "weekly_analytics_report",
    "language": { "code": "en" },
    "components": [...]
  }
}
```

**Email (via Supabase):**
```javascript
await supabase.auth.admin.sendEmail({
  to: 'client@example.com',
  subject: 'Your Weekly Analytics Report',
  html: emailTemplate
});
```

**In-App Notifications:**
```sql
INSERT INTO notifications (user_id, type, message, metadata)
VALUES ($1, 'usage_alert', 'You have used 80% of your monthly posts', $2);
```

---

## 🎨 FRONTEND ARCHITECTURE

### **Client Dashboard (Next.js App)**

```
/app
├── (auth)
│   ├── login/
│   └── register/
├── (dashboard)
│   ├── dashboard/          # Overview & stats
│   ├── generate/           # AI Content Generator
│   ├── calendar/           # Content Calendar
│   ├── approvals/          # Pending approvals
│   ├── analytics/          # Performance metrics
│   ├── accounts/           # Social account management
│   └── settings/           # Organization settings
└── api/
    ├── generate-content/   # Proxy to N8n
    ├── approve-post/
    └── usage-metrics/
```

**Key Components:**
- `<ContentGenerator />` - AI-powered content creation
- `<CalendarView />` - Drag-drop scheduling
- `<ApprovalQueue />` - Post review workflow
- `<AnalyticsDashboard />` - Charts & metrics
- `<UsageIndicator />` - Real-time limit tracking

---

## 🔍 MONITORING & OBSERVABILITY

### **Health Checks**

```javascript
// System Health Endpoint
GET /api/health

Response:
{
  "status": "healthy",
  "services": {
    "supabase": "connected",
    "n8n": "active",
    "vercel": "deployed",
    "payfast": "available"
  },
  "metrics": {
    "active_clients": 47,
    "monthly_posts": 1234,
    "system_uptime": "99.8%"
  }
}
```

### **Logging Strategy**

**Application Logs:** Vercel/Next.js logs  
**Workflow Logs:** N8n execution history  
**Database Logs:** Supabase dashboard  
**System Logs:** VPS systemd journals  

**Centralized via:** Audit log table per client

---

## 📦 TEMPLATE REPOSITORY STRUCTURE

```
DraggonnB-CRMM-Template/
├── .github/
│   └── workflows/
│       └── deploy.yml              # Auto-deploy on push
├── app/
│   └── (dashboard)/                # All dashboard routes
├── components/
│   ├── ui/                         # shadcn components
│   └── dashboard/                  # Custom components
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── n8n/
│   │   └── webhooks.ts
│   └── utils/
├── supabase/
│   ├── migrations/
│   │   └── 00_initial_schema.sql
│   └── seed.sql
├── scripts/
│   ├── provision-client.sh
│   └── setup-env.sh
├── .env.example
├── README.md
└── CUSTOMIZATION.md
```

---

**Status:** Architecture complete. Ready for implementation phase.
