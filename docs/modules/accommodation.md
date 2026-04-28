# Accommodation

> Full-stack lodge, B&B, and guesthouse management — bookings, guest comms, payments, AI agents, staff operations, and cost tracking in one system.

---

## What it does (in 30 seconds)

The Accommodation module manages the full guest lifecycle: inquiry intake, booking creation, multi-channel guest messaging, PayFast payment links, check-in/check-out, stock and costing, and review management. Four AI agents handle quoting, guest concierge queries, review analysis, and pricing recommendations. Nine N8N workflows run in the background handling reminders, daily briefs, occupancy snapshots, and stock alerts.

---

## Built capabilities

| Capability | Type | What it does | Trigger / cadence |
|---|---|---|---|
| QuoterAgent | AI Agent | Generates personalised quote email from inquiry details (dates, party size, unit preferences, rates) | User-triggered on inquiry |
| ConciergeAgent | AI Agent | Answers guest WhatsApp questions about the property, local area, activities — escalates to human if confidence < threshold | Triggered by incoming WhatsApp message on inquiry/booking |
| ReviewerAgent | AI Agent | Analyses guest reviews, extracts sentiment and key themes, drafts a professional response | User-triggered on review receipt |
| PricerAgent | AI Agent | Analyses occupancy patterns across units, suggests rate adjustments with reasoning and revenue impact estimate | User-triggered on-demand |
| Event dispatcher (`emitBookingEvent()`) | DB Process | Central integration point — booking status changes trigger automation rules, guest message sends, staff Telegram notifications, and auto-cost entries | On booking status change |
| Message queue + sender | DB Process | Multi-channel send (WhatsApp, email, SMS) via `lib/accommodation/events/sender.ts` | Event-driven via dispatcher |
| PayFast payment link generation | API Route | `lib/accommodation/payments/payfast-link.ts` — generates PayFast payment URL for deposit or balance | User-triggered on booking |
| Telegram ops bot | DB Process | `lib/accommodation/telegram/ops-bot.ts` — sends structured Telegram alerts to ops team (new booking, high-value guest, escalation) | Event-driven via dispatcher |
| Daily brief (Telegram) | N8N Workflow | Sends occupancy summary (arrivals, departures, turnovers, occupancy%) to Telegram ops chat via `POST /api/accommodation/telegram/daily-brief` | Daily 06:00 SAST |
| Check-in reminder | N8N Workflow | Sends check-in reminder to guest X hours before arrival | Cron / event |
| Check-out reminder | N8N Workflow | Sends check-out reminder to guest before departure | Cron / event |
| Deposit reminder | N8N Workflow | Reminds guest to pay deposit if unpaid | Cron / event |
| Payment expiry | N8N Workflow | Handles payment link expiry; may release held unit | Cron / event |
| Review request | N8N Workflow | Sends review request after checkout | Cron post-checkout |
| Escalation checker | N8N Workflow | Checks for unresolved guest escalations and notifies ops | Cron / event |
| Occupancy snapshot | N8N Workflow | Captures daily occupancy metrics for analytics | Nightly cron |
| Stock alert | N8N Workflow | Alerts ops when stock items fall below threshold | Cron / event |
| WhatsApp booking confirm | N8N Workflow | Sends WhatsApp booking confirmation to guest | Webhook on booking confirmed |
| WhatsApp reminder | N8N Workflow | General WhatsApp reminder workflow | Cron |
| Queue processor | N8N Workflow | Processes the message queue for multi-channel sends | Webhook / cron |
| Per-unit cost tracking | DB Process | Auto-cost entries created via dispatcher on booking events; tracks cost per unit per night | On booking status change |
| AI agent config management | API Route | `GET/POST /api/accommodation/ai-configs` — per-org, per-agent-type configuration stored in `accommodation_ai_configs` | User-triggered |
| Booking CRUD | UI + API | `/accommodation/bookings` — full booking management UI | User-triggered |
| Property and unit management | UI + API | `/accommodation/properties`, `/accommodation/properties/[id]` — manage properties and units | User-triggered |
| Inquiry management | UI + API | `/accommodation/inquiries` — intake and track inquiries | User-triggered |
| Guest management | UI + API | `/accommodation/guests` — guest profiles and history | User-triggered |
| Calendar view | UI | `/accommodation/calendar` — booking calendar | User-triggered |
| Channel management | UI | `/accommodation/channels` — channel/source tracking | User-triggered |
| Automation dashboard | UI | `/accommodation/automation` — view automation rules and trigger history | User-triggered |
| Operations dashboard | UI | `/accommodation/operations` — ops view with tasks and alerts | User-triggered |
| Stock management | UI | `/accommodation/stock` — stock inventory per unit | User-triggered |
| Costs view | UI | `/accommodation/costs` — profitability per unit, cost breakdown | User-triggered |

---

## AI Agents

### `QuoterAgent`
- **Type:** claude-haiku-4-5-20251001 (default; tier-gated)
- **What it does:** Drafts a guest accommodation quote in brand voice using check-in/check-out dates, party size, unit type, and current rate
- **Input:** Inquiry details (dates, guests, unit preferences), property info, rate data
- **Output:** `QuoteResult { available, property_name, unit_type, nights, rate_per_night, total_amount, inclusions, quote_email_subject, quote_email_body }`
- **Trigger:** User-invoked on inquiry page or via API `POST /api/accommodation/ai/quote`
- **Cost guardrail:** `checkCostCeiling()` pre-call; `ai_usage_ledger` insert per call

### `ConciergeAgent`
- **Type:** claude-haiku-4-5-20251001 (default; tier-gated)
- **What it does:** Answers guest questions via WhatsApp — property info, local activities, area info, booking help. Sets `escalate_to_human: true` when confidence is low
- **Input:** Guest question text, property details, activities, local info
- **Output:** `ConciergeResponse { reply_text, category, confidence, suggested_actions, escalate_to_human }`
- **Trigger:** Incoming WhatsApp message on a booking or inquiry; event-driven via dispatcher
- **Cost guardrail:** Standard ceiling check; if escalate_to_human is true, no further agent calls until human responds

### `ReviewerAgent`
- **Type:** claude-haiku-4-5-20251001 (default; tier-gated)
- **What it does:** Analyses guest reviews, extracts sentiment score (-1 to 1), key themes, action items for ops, and drafts a professional response
- **Input:** Raw review text, property context
- **Output:** `ReviewAnalysis { sentiment, sentiment_score, key_themes, action_items, response_draft, priority }`
- **Trigger:** User-invoked on review management page
- **Cost guardrail:** Standard ceiling check

### `PricerAgent`
- **Type:** claude-haiku-4-5-20251001 (default; tier-gated)
- **What it does:** Analyses occupancy data and competitor rate signals; recommends rate adjustments per unit per period with confidence score and revenue impact estimate
- **Input:** Occupancy data, current rates, competitor rates (if available), date range
- **Output:** `PricingAnalysisResult { overall_occupancy, recommendations[], market_insights[], revenue_impact_estimate, summary }`
- **Trigger:** User-invoked via automation dashboard or ops view
- **Cost guardrail:** Standard ceiling check; marked as on-demand (not scheduled)

---

## N8N workflows

| Workflow file | Purpose | Schedule | Status |
|---|---|---|---|
| `wf-accom-daily-brief.json` | Posts Telegram daily brief (arrivals, departures, occupancy%) via `/api/accommodation/telegram/daily-brief` | Daily 06:00 SAST | active |
| `wf-accom-checkin-reminder.json` | Guest check-in reminder | Cron / event | active |
| `wf-accom-checkout-reminder.json` | Guest check-out reminder | Cron / event | active |
| `wf-accom-deposit-reminder.json` | Deposit payment reminder | Cron / event | active |
| `wf-accom-payment-expiry.json` | Handles expired PayFast payment links | Cron / event | active |
| `wf-accom-review-request.json` | Sends review request after checkout | Cron post-checkout | active |
| `wf-accom-escalation-checker.json` | Checks unresolved escalations, notifies ops via Telegram | Cron | active |
| `wf-accom-occupancy-snapshot.json` | Captures daily occupancy metrics | Nightly cron | active |
| `wf-accom-stock-alert.json` | Alerts when stock items fall below threshold | Cron / event | active |
| `wf-accom-queue-processor.json` | Processes outbound message queue (multi-channel) | Webhook / cron | active |
| `wf-whatsapp-booking-confirm.json` | WhatsApp booking confirmation to guest | Webhook on booking.confirmed | active |
| `wf-whatsapp-reminder.json` | General WhatsApp reminder | Cron | active |

---

## Database (key tables)

The accommodation module has 84 tables. Key ones:

- `accommodation_bookings`: booking records (unit_id, guest_id, check_in, check_out, status, total_amount)
- `accommodation_units`: units within properties (name, capacity, base_rate)
- `accommodation_properties`: property definitions (name, address, amenities)
- `accommodation_guests`: guest profiles and history
- `accommodation_inquiries`: pre-booking inquiries
- `accommodation_payments`: PayFast payment tracking per booking
- `accommodation_events`: event log for dispatcher (event_type, booking_id, payload)
- `accommodation_messages`: sent message log (channel, recipient, status)
- `accommodation_costs`: per-unit cost entries (item, amount, booking_id)
- `accommodation_stock`: stock inventory (item, unit, quantity, threshold)
- `accommodation_ai_configs`: per-org, per-agent-type AI configuration
- `accommodation_reviews`: guest review records with AI analysis results

---

## User flows (the 3 most common)

1. **Inquiry to booking:** Guest inquiry arrives → property manager creates inquiry in `/accommodation/inquiries` → clicks "Generate quote" → QuoterAgent drafts quote email → manager reviews and sends. Guest accepts → manager creates booking → `booking.created` event emitted → WhatsApp confirmation sent via `wf-whatsapp-booking-confirm.json` + Telegram ops alert via ops bot.

2. **Deposit and payment:** Manager generates PayFast deposit link via `lib/accommodation/payments/payfast-link.ts` → link sent to guest → guest pays → `wf-accom-deposit-reminder.json` handles reminders if payment is overdue → PayFast ITN webhook updates booking payment status.

3. **Post-stay review handling:** After checkout, `wf-accom-review-request.json` sends review request to guest. When review arrives, manager opens review in dashboard → clicks "Analyse" → ReviewerAgent returns sentiment, themes, action items, and a response draft. Manager edits and publishes response.

---

## Integrations

- **External:** PayFast (payment link generation and ITN webhook), WhatsApp Cloud API (guest messaging), Telegram Bot API (ops notifications), Resend (email fallback)
- **Internal:** Event dispatcher is the central integration point — all booking status changes flow through `emitBookingEvent()` in `lib/accommodation/events/dispatcher.ts`

---

## Tier gating

Accommodation module requires the `accommodation` module to be activated in `tenant_modules`. AI agent calls are additionally gated by the cost ceiling per tenant. PricerAgent is positioned as a premium feature but is not separately gated in the current build.

---

## What's NOT in this module yet

- Online booking widget (guest self-service booking from a public URL — current flow is manager-created bookings only)
- Channel manager integration (no Airbnb/Booking.com/Expedia sync)
- Revenue management dashboard with forward-looking demand calendar
- Mobile staff app (web-responsive only; no native app)

---

## Cross-module ties

- Accommodation guests can be surfaced as CRM contacts in the same org
- Trophy OS can link lodge bookings to safari bookings via shared `org_id` (future goal when both products share a client)
- Brand voice from `client_profiles.brand_voice_prompt` is injected into all four AI agents via `buildSystemBlocks()`

---

*Source of truth (last verified): 2026-04-27*
*Module registry: accommodation, min_tier = starter*
*Phase 11 build status: green — all 5 phases of automation layer complete; 4 agents, 12 N8N workflows, 84 DB tables*
