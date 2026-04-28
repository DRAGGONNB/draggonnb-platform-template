# Email Marketing

> Send campaigns, build automated sequences, manage templates, and track open/click rates — all from one Email Hub.

---

## What it does (in 30 seconds)

The Email Marketing module is the outbound email engine. It covers three distinct surfaces: one-time campaigns (send to a list now or scheduled), automated sequences (multi-step drip flows), and a template editor (drag-and-drop or HTML). Sent emails are tracked at the individual send level — delivered, opened, clicked, bounced. Outreach rules let you configure tier-based email behaviour per audience segment.

---

## Built capabilities

| Capability | Type | What it does | Trigger / cadence |
|---|---|---|---|
| Email dashboard stats | DB Process | Counts total sent, opened, clicked from `email_sends` table; computes open rate and click rate | On page render (`/email`) |
| Template editor | UI | Visual template builder at `/email/templates/editor` — creates rows in `email_templates` table | User-triggered |
| Campaign creation | UI + API | `/email/campaigns/new` → writes to `email_campaigns` table; send dispatched via Resend API | User-triggered |
| Email sequence builder | UI + API | `/email/sequences/builder` — multi-step drip flow; each step is a `email_sequence_steps` row with delay + template | User-triggered |
| Sequence enrollment | API | Enrolls a contact in an email sequence; tracks progress in `email_sequence_enrollments` | User-triggered (or automation hook) |
| Outreach rules | UI | `/email/outreach` — configures tier-based outreach rules (e.g. only email contacts with specific tags or subscription tier) | User-triggered config |
| Send history / analytics | UI + DB | `/email/analytics` — shows `email_sends` rows with per-send status (sent, delivered, opened, clicked, bounced, failed) | On page render |
| Recent sends widget | DB Process | Dashboard widget reads last 5 `email_sends` rows ordered by created_at | On page render |

---

## AI Agents (if any)

No AI agents in the standalone Email Marketing module. AI-assisted email drafting exists in Campaign Studio (`CampaignDrafterAgent`) and in CRM Easy view (brand-voice one-click emails). The Email Hub is the send and tracking layer, not the content generation layer.

---

## N8N workflows

No Email-module-specific N8N workflows in `n8n/`. The Billing Monitor workflow (`wf-billing-monitor.json`) sends payment reminder emails via Resend as a side effect, but that is an ops workflow, not part of the Email Marketing module.

The 3-day onboarding sequence (`onboarding-day1.json`, `onboarding-day2.json`, `onboarding-day3.json`) sends emails to new clients but is driven by the provisioning system, not the Email Hub.

---

## Database (key tables)

- `email_templates`: reusable email templates (name, HTML, text, category)
- `email_campaigns`: campaign headers (subject, template_id, status, sent_at)
- `email_sends`: individual send records (recipient_email, subject, status, sent_at, opened_at, clicked_at)
- `email_sequences`: drip sequence definitions (name, description, is_active)
- `email_sequence_steps`: steps within a sequence (sequence_id, step_number, delay_days, template_id)
- `email_sequence_enrollments`: tracks which contacts are in which sequences and at which step

---

## User flows (the 3 most common)

1. **Send a one-time campaign:** User goes to `/email/campaigns/new` → selects or creates a template → picks recipient list → clicks Send. Campaign row is created and the send is dispatched via Resend. Each recipient gets an `email_sends` row; status updates to 'sent', 'delivered', 'opened', or 'clicked' as events arrive.

2. **Build a drip sequence:** User goes to `/email/sequences/builder` → names the sequence → adds steps (Step 1: Welcome email, day 0; Step 2: Feature highlight, day 3; Step 3: Upgrade offer, day 7) → activates the sequence. Contacts are enrolled via the enrollment API; the sequence engine advances each contact through steps based on delay_days.

3. **Track campaign performance:** User goes to `/email/analytics` → sees total sent, open rate, click rate pulled live from `email_sends`. Drills into a specific campaign to see per-recipient status.

---

## Integrations

- **External:** Resend (all outbound email delivery, including transactional and campaign sends)
- **Internal:** Campaign Studio generates email copy that can be manually transferred to Email Hub templates; CRM contacts are the source for recipient lists

---

## Tier gating

Email Marketing module is available to tenants with the `email` module activated in `tenant_modules`. Outreach rule tier filtering (restricting sends to specific subscription tiers) is configured per tenant in `tenant_modules.config`.

---

## What's NOT in this module yet

- Automated real-time open/click webhook processing from Resend (open rate and click rate in the dashboard depend on Resend webhook integration being configured; not confirmed as fully wired)
- List management / subscriber import — recipient lists are not a managed concept today; campaigns are sent to manually specified recipients
- Unsubscribe list management and automatic suppression — SMS has "Reply STOP" in Campaign Studio, but email unsubscribe list enforcement is not built
- A/B subject line testing
- Email deliverability reputation monitoring (SPF/DKIM/DMARC setup is environment-level, not surfaced in the UI)

---

## Cross-module ties

- Resend is the shared email provider across Email Hub, CRM Easy view one-click emails, Campaign Studio, and platform transactional emails (billing reminders, onboarding)
- Campaign Studio (`campaign-studio.md`) is the AI drafting layer; Email Hub is the managed sending layer — they are separate but share the same Resend integration

---

*Source of truth (last verified): 2026-04-27*
*Phase 11 build status: partial — Email Hub UI, sequences, templates, and analytics are built; Resend webhook integration for real-time open/click tracking may need verification*
