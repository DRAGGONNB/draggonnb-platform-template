# Trophy OS

> The operating system for the Southern African hunting industry — quota management, safari booking, trophy chain-of-custody, firearm register, CITES compliance, and AI-assisted operations.

**IMPORTANT:** Trophy OS is a SEPARATE product from DraggonnB OS. It lives at `trophyos.co.za` / `app.trophyos.co.za`, has its own Supabase project (`trophyos-prod`), its own GitHub repo (`DRAGGONNB/trophyos`), and its own PayFast subscription plans. It shares DraggonnB's design system and Claude API infrastructure but is NOT the same codebase. Tables are prefixed with no shared-namespace convention — key tables are `orgs`, `org_members`, `safaris`, `trophies`, `quotas`, `firearms`, `permits`.

---

## What it does (in 30 seconds)

Trophy OS manages the complete lifecycle of a Southern African hunting operation: quota allocation per species per area (with DEA permit tracking), safari booking pipeline (enquiry → deposit → in-progress → completed), trophy log with measurements (Rowland Ward / SCI scores), firearm register (TIP tracking for international clients, SAPS declarations), supplier job coordination (taxidermist, butcher, logistics), and a client portal for guests to track their trophy status. An AI assistant ("TrophyAI") is woven through each workflow.

---

## Built capabilities

| Capability | Type | What it does | Trigger / cadence |
|---|---|---|---|
| Quota grid | UI | Per-species, per-area, per-year quota tracking with warn-at-80% visual; auto-increments `taken` on trophy creation | User-triggered; auto on trophy save |
| Safari booking pipeline | UI | Kanban view (enquiry → quoted → deposit_paid → confirmed → in_progress → completed → cancelled); wizard for new safari creation | User-triggered |
| Trophy log | UI + DB | Harvest form with GPS, species-specific measurements (horn length, spread, tusk weight etc.), method, caliber; auto-links to quota row; CITES flag on CITES species | User-triggered per harvest |
| Chain-of-custody timeline | UI | Per-trophy status progression (harvested → skinned → salted → cold_room → taxidermist_assigned → in_progress → dip_and_ship → shipped → delivered) | Auto on status change |
| Firearm register | UI + DB | CRUD for org/client/PH firearms (make, model, caliber, serial, license_type, TIP number, tip_expiry, SAPS Form 520 reference) | User-triggered |
| TIP expiry tracking | UI | Visual list of TIPs expiring within 30 days; alert at 30 days via N8N | On page load; N8N cron |
| Client CRM | UI + DB | Client records (nationality, passport, hunting experience, SCI/PHASA member, emergency contact, lead status, lifetime spend) | User-triggered |
| Digital waiver | UI | Client signs digital waiver via portal; waiver_signed + waiver_signed_at written to clients table | Client-triggered via portal |
| PayFast deposit | Integration | Deposit PayFast payment on safari booking; balance payment; subscription billing (3 tiers) | User/client-triggered |
| Invoicing | UI + DB | Invoice generation with line items (daily rate, trophy fees, extras, VAT); dual ZAR/USD pricing; PDF via Edge Function | User-triggered |
| Supplier job board | UI + DB | Job cards for taxidermist/butcher/logistics suppliers; progress photos; status tracking; client notifications | User-triggered |
| Cold room log | UI + DB | Entry/exit log (entry_type, temperature_zone, weight, condition, exited_to) | User-triggered |
| Meat orders | UI + DB | Meat processing orders (fresh_cuts, biltong, droewors, boerewors) linked to trophy and client | User-triggered |
| Permit tracker | UI + DB | CITES, hunting, export, DEA quota, TOPS, SAPS 520 permit records; expiry alerts | User-triggered |
| Area management | UI + DB | GPS boundary polygons per area (farm/camp/section); linked to quotas and trophy harvest | User-triggered |
| Dashboard | UI | KPIs: upcoming safaris, quota alerts (near-limit species), TIP expiries, supplier jobs overdue | On login |
| WhatsApp notifications (Phase 1) | N8N | Booking confirmation, pre-arrival brief (7 days before), trophy status updates, completion thank you | Safari status change events |
| Daily quota digest | N8N | 06:00 cron: sends Telegram quota summary to org owner | Daily 06:00 SAST |
| Client portal | UI | Separate portal at `/(portal)`: waiver signing, trophy gallery with mount progress, invoice download, safari documents | Client login |
| TrophyAI assistant | AI | Claude Haiku (triage/classification) and Sonnet (analysis/generation); context-aware per page; designed into every workflow; 5 calls/day (Personal), 20/day (Starter), unlimited (Pro+) | User-invoked + n8n proactive |
| Org switcher | UI | Multi-org: user can belong to game_farm + taxidermist + outfitter orgs simultaneously; header dropdown switches between them | User-triggered |
| Role-based nav | UI | Sidebar changes per role — farm_owner sees full nav; taxidermist sees only supplier job views | On login |

---

## AI Agents (TrophyAI)

TrophyAI is planned/designed but is a **future goal** as a fully integrated layer. The AI stack design is documented in `TROPHYOS_FULL_SCOPE.md Part 4` and `CLAUDE.md`. The architecture uses Claude Haiku (fast triage), Sonnet (analysis/generation), and Opus (Outfitter-tier premium insights). Key planned agent capabilities per module:

| Module | AI Capability | Model | Status |
|---|---|---|---|
| Dashboard | Daily brief, action suggestions, anomaly detection | Sonnet | Future goal (Phase 6) |
| Quota Manager | Season planning recommendations, quota conflict detection | Haiku/Sonnet | Future goal (Phase 6) |
| Safari Booking | Package builder suggestions, PH match, pre-arrival checklist generation | Haiku/Sonnet | Future goal (Phase 6) |
| Trophy Log | Species ID from photo, score estimation, trophy story generator | Haiku/Sonnet | Future goal (Phase 6) |
| Game Management | Census analysis, breeding recommendations, valuation estimates | Sonnet | Future goal (Phase 7) |
| Firearm Register | TIP pre-check, SAPS Form 520 auto-fill | Haiku/Sonnet | Future goal (Phase 6) |
| Client CRM | Lead scoring, re-engagement drafting, upsell suggestions | Haiku/Sonnet | Future goal (Phase 6) |
| Compliance | CITES auto-check, DEA annual return generation | Sonnet | Future goal (Phase 12) |

---

## N8N workflows (designed)

Phase 1 and 2 automations are designed in `CLAUDE.md Section 7` but are planned builds (Phase 14 in the build sequence):

| Trigger | Workflow | Channel | Status |
|---|---|---|---|
| Safari → deposit_paid | Booking confirmation + pre-arrival checklist | WhatsApp | Planned (Phase 14) |
| Safari → confirmed | Notify PH + create calendar event | Telegram + Google Calendar | Planned |
| Trophy created | Update quota, warn if >80% | WhatsApp to owner | Planned |
| Quota → 100% | Block species bookings, alert owner | WhatsApp + Email | Planned |
| TIP expiry < 30 days | Reminder to client + PH | WhatsApp | Planned |
| Safari arrival - 7 days | Pre-arrival brief | WhatsApp | Planned |
| Safari → completed | Thank you + review request | WhatsApp | Planned |
| Daily 06:00 | Quota digest | Telegram | Planned |
| Trophy → taxidermist_assigned | Create supplier job, notify taxidermist | WhatsApp | Planned (Phase 14) |

---

## Database (key tables)

- `orgs`: organisation records (type: game_farm/outfitter/taxidermist/processor/logistics, subscription_tier, dea_registration)
- `org_members`: role assignments (role: farm_owner/outfitter/ph/ops_manager/taxidermist/processor/logistics/staff/client)
- `species`: ~80 Southern African hunting species with CITES appendix, TOPS category, measurement_fields per species
- `areas`: farm areas/camps with GPS boundary polygons
- `quotas`: per-org, per-area, per-species, per-year quota (allocated, taken, warning_threshold, dea_permit_number)
- `clients`: hunter/client records (nationality, passport, hunting experience, waiver_signed, lead_status, lifetime_spend)
- `safaris`: safari bookings (status, safari_type, assigned_ph_id, species_wishlist, deposit_paid, balance_due)
- `trophies`: harvest records with full chain-of-custody fields (status, measurements JSONB, RW/SCI scores, CITES permit, quota_id)
- `firearms`: firearm register (owner_type, license_type, TIP fields, saps_declaration_number)
- `supplier_jobs`: taxidermist/butcher/logistics job cards (status, progress_photos, tracking_ref)
- `cold_room_entries`: cold room log (entry_type, temperature_zone, weight, condition)
- `meat_orders`: meat processing orders per trophy (order_type, status, items JSONB)
- `permits`: CITES, hunting, export, DEA, TOPS, SAPS 520 permits (permit_type, permit_number, expiry_date, status)
- `invoices`: invoices (line_items JSONB, subtotal, VAT, total_zar, usd_total, exchange_rate, payfast_payment_id)
- `audit_log`: immutable audit trail for all resource changes
- `notification_log`: outbound message log (channel, status, whatsapp_message_id)

---

## User flows (the 3 most common)

1. **New safari booking:** Client enquiry arrives → ops_manager creates client record → creates safari (enquiry status) → adds species wishlist → TrophyAI flags CITES species requiring pre-approval → generates quote → client confirms → generates PayFast deposit link → deposit paid → safari moves to `confirmed` → N8N sends WhatsApp confirmation to client and Telegram to assigned PH.

2. **Trophy harvest and compliance:** PH logs trophy in the field: species, measurements, GPS, caliber, harvest date → `trophies.taken` increments `quotas.taken` → if CITES species, permit requirement flagged → chain-of-custody begins: skinned → salted → cold_room → taxidermist_assigned → supplier job created → taxidermist uploads progress photos → client sees updates in portal.

3. **Firearm TIP management:** International client (USA) is confirmed for a safari → PH registers client's firearm with TIP fields (TIP number, port of entry, expiry date) → N8N monitors TIP expiry → 30 days before expiry, WhatsApp reminder to client and PH. SAPS Form 520 auto-fill (TrophyAI, Phase 6 goal) pre-populates declaration from client and firearm data.

---

## Integrations

- **External:** PayFast (deposit payments, balance payments, 3-tier subscriptions), WhatsApp Cloud API via DraggonnB shared WABA, Telegram Bot API, Mapbox (area GPS boundary editor), Supabase Realtime (live quota counters, trophy status in client portal), Supabase Storage (trophy photos, permit documents, progress photos, waivers)
- **External (future):** Google Calendar (PH calendar events), Anthropic Claude API (TrophyAI — Phase 6)
- **Internal:** Shares DraggonnB's Anthropic API key and Claude SDK patterns but runs on a separate Supabase project

---

## Tier gating

| Feature | Personal (Free) | Starter (R599/mo) | Pro (R1,499/mo) | Outfitter (R3,499/mo) |
|---|---|---|---|---|
| PHs | Own log only | 1 | Unlimited | Unlimited |
| Safaris/year | — | 20 | Unlimited | Unlimited |
| Client portal | — | Basic | Branded | White-label |
| Supplier network | — | — | CRUD | CRUD |
| WhatsApp automations | — | Basic | Full | Full + custom |
| CITES tracking | — | Basic | Full | Full |
| DEA export | — | — | — | Full |
| Multi-farm | — | — | — | CRUD |
| AI assistant calls/day | 5 | 20 | Unlimited | Unlimited + priority |

---

## What's NOT in this module yet (honest gaps)

- TrophyAI (Phase 6) — AI assistant is designed and documented but not yet built; Phases 0-5 cover the core data management; Phase 6 is the next build sprint
- WhatsApp automations (Phase 14) — N8N workflows are designed but not yet imported/activated
- Compliance suite (Phase 12) — CITES auto-check and DEA return generator are future goals
- Offline mode (Phase 15) — Service worker + IndexedDB sync is designed for bush use but not yet built
- Game management module (Phase 7) — census, breeding, herd valuation is a future build
- Mobile app (Phase 20) — web-responsive today; native-feel PWA is a Phase 20 goal
- Real-time quota counters via Supabase Realtime — designed in schema but not yet wired in UI

---

## Role-specific views (current build status + future goal)

Trophy OS supports 11 roles via multi-org architecture; the **3 most commercially distinct sub-products** are:

### Farm Owner (`farm_owner`)
- **Status:** partial — Phases 0-5 complete (foundation, quota, safari, trophy, firearm, dashboard); Phases 6-20 are future goals
- **What they see:** quota grid per species/area, safari pipeline kanban, trophy log with chain-of-custody, firearm register (SAPS TIP tracking), dashboard KPIs (today's safaris, quota alerts, TIP expiries), invoicing, area management, team management
- **Key features built:**
  - Quota allocation and tracking with 80% warning threshold
  - Safari booking wizard with species wishlist and deposit PayFast link
  - Trophy log with Rowland Ward / SCI measurement fields per species
  - Firearm register with TIP fields for international client firearms
  - Invoice generation with dual ZAR/USD line items and VAT
- **AI agents on their dashboard:** TrophyAI daily brief + quota advisor (future goal — Phase 6); currently no AI on dashboard
- **Tier:** Starter (R599/mo) for single-farm up to 20 safaris/year; Pro (R1,499/mo) for unlimited
- **What's coming (future goal):**
  - TrophyAI: daily brief ("You have 2 safaris this week, 3 quotas near limit...")
  - DEA annual quota return auto-generation from trophy log data
  - Multi-farm consolidated view (Outfitter tier, Phase 18)

### Butcher / Processor (`processor`)
- **Status:** partial — database tables built (Phases 10-11: `supplier_jobs`, `cold_room_entries`, `meat_orders`); supplier-facing UI dashboard is a future goal (currently job cards are managed by the originating org, not the supplier's own view)
- **What they see (today):** Processor org logs in → sees their org's assigned supplier jobs (via `supplier_jobs.supplier_org_id`); updates job status and uploads progress photos
- **What they see (future goal):** Dedicated processor dashboard with incoming job queue, cold room inventory management, meat order processing (fresh cuts, biltong, droewors, boerewors), dispatch tracking — a self-contained butchery management view
- **Key features built (data layer):**
  - `supplier_jobs` table with `job_type = 'butchery'` rows
  - `cold_room_entries` with temperature zones (chiller, freezer, salt_room, drying_room)
  - `meat_orders` with line items JSONB (cut, weight_kg, quantity, price_per_kg)
  - `cold_room_entry > 48hrs without exit` alert via N8N (Phase 14 plan)
- **AI agents:** None planned for processor role
- **Tier:** Starter (R599/mo) as a standalone processor org, or included in Multi-Org bundle (R2,499/mo for 2 orgs)
- **What's coming (future goal):**
  - Dedicated processor-view UI (Phase 10 build sprint)
  - WhatsApp notification when a new job is assigned (Phase 14)
  - Meat order status → `ready` → client collection WhatsApp (Phase 14)

### Taxidermist (`taxidermist`)
- **Status:** partial — data layer built (Phases 10-11); taxidermist-facing dashboard UI is a future goal
- **What they see (today):** Taxidermist org logs in → sees supplier jobs assigned to them (`supplier_jobs.supplier_org_id` = their org, `job_type = 'taxidermy'`); can update status, upload progress photos, set tracking ref
- **What they see (future goal):** Trophy intake from cold room (receives from farm), mount progress tracker (status: accepted → in_progress → quality_check → ready_for_collection), photo upload with auto-notification to client portal, dispatch tracking back to client
- **Key features built (data layer):**
  - `supplier_jobs` with mount_type, estimated_completion, progress_photos JSONB
  - `trophies.taxidermist_org_id` foreign key links trophy to taxidermist org
  - `trophies.taxidermist_job_ref`, `taxidermist_handover_at`, `mount_type`, `mount_completed_at`
  - Client portal shows trophy progress including mount photos uploaded by taxidermist
- **AI agents:** None planned for taxidermist role
- **Tier:** Starter (R599/mo) as a standalone taxidermist org, or Multi-Org bundle
- **What's coming (future goal):**
  - Dedicated taxidermist dashboard (Phase 10 build sprint)
  - WhatsApp notification when a job is assigned (Phase 14 — `trophy → taxidermist_assigned` trigger)
  - Progress photo → automatic client notification (Phase 14)
  - Mount completion → dispatch notification to farm + client (Phase 14)

---

## Cross-module ties

- Trophy OS shares DraggonnB's Claude API infrastructure and design system but runs on a separate Supabase project — there is no shared RLS or shared tables with DraggonnB OS
- Future integration goal: Accommodation lodge bookings (DraggonnB) and safari bookings (Trophy OS) can be linked via shared `org_id` for outfitters that run both a lodge and a hunting operation (e.g. Swa-Zulu Safaris)

---

*Source of truth (last verified): 2026-04-27*
*Separate product: trophyos.co.za | GitHub: DRAGGONNB/trophyos | Supabase: trophyos-prod*
*Build status: Phases 0-5 complete (foundation + data management); Phases 6-20 are future goals*
*PayFast plans: TOS-S (R599/mo), TOS-P (R1,499/mo), TOS-O (R3,499/mo)*
