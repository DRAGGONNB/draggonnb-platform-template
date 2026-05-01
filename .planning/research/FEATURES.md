# Feature Research — v3.1 Operational Spine

**Domain:** Cross-product federation between two SaaS products (DraggonnB OS + Trophy OS) on shared Supabase, with embedded approval workflow, automated damage billing, multi-hunter split billing, cross-product stay linking, per-booking PWA guest experience, and Trophy OS PayFast wiring.
**Researched:** 2026-04-30
**Confidence:** HIGH (industry patterns) / MEDIUM (Supabase cross-domain auth — verified limitation) / HIGH (PayFast tokenization, existing platform reuse)
**Milestone:** v3.1 "Operational Spine" — Phases 13-16

---

## Scope Boundary

This research covers ONLY the v3.1 federation/operational features. Existing capabilities (DraggonnB OS 11 modules, Trophy OS 24 routes, accommodation AI agents, brand voice, Campaign Studio, modular pricing, 3-day onboarding) are treated as PRE-EXISTING dependencies and explicitly NOT re-researched.

Phase mapping:
- **Phase 13** — SSO bridge + cross-product navigation
- **Phase 14** — Approval spine (`approval_requests` table + Telegram tap-to-approve + `/approvals` queue)
- **Phase 15** — Damage auto-billing, multi-hunter split-billing, cross-product stay link
- **Phase 16** — PWA guest experience + Trophy OS PayFast wiring

---

## Per-Feature Analysis

### 1. SSO Bridge (Phase 13)

**Goal:** User authenticated in DraggonnB clicks "Trophy OS" → lands inside Trophy OS already authenticated. Reverse direction also works.

**Existing context (NOT re-researched):**
- DraggonnB OS lives at `*.draggonnb.co.za` (wildcard subdomain per tenant, e.g. `swazulu.draggonnb.co.za`).
- Trophy OS lives in a separate codebase but same Supabase project. Likely subdomain pattern `trophy.draggonnb.co.za` or `*.trophy.draggonnb.co.za` (decision belongs to ARCHITECTURE.md, not features).
- Swazulu owns `swazulu.com` (custom domain post-launch) — cross-domain (different eTLD+1) is a real possibility, not just cross-subdomain.
- Both products use `@supabase/ssr` for cookie-based session.

#### Industry Patterns

| Player | Pattern | Notes |
|--------|---------|-------|
| **Atlassian (Jira/Confluence)** | Single auth at `*.atlassian.net`, cross-product via shared session cookie + product switcher in top-left grid icon. Sidebar redesigned in 2024-25 to be **same shape across products**, with product context indicator at top. | Predictability is the explicit design principle. ([Atlassian design blog](https://www.atlassian.com/blog/design/designing-atlassians-new-navigation)) |
| **Slack workspace switcher** | Vertical rail on left edge with workspace icons. One-click switch, no re-auth. Each workspace is logically a separate tenant; SSO via SAML for enterprise. | Rail visible only when ≥2 workspaces exist. Singleton workspace = no rail. |
| **Google Workspace product launcher** | 9-dot grid icon top-right opens grid of products (Gmail, Drive, Calendar, etc.). Click navigates to new product domain (mail.google.com → drive.google.com) with shared `accounts.google.com` session. | Cross-domain SSO via central auth domain + redirect dance. |
| **Notion** | No equivalent — single product with sidebar workspaces. SSO is enterprise SAML. | Not applicable here. |

**Design principles emerging:**
1. **Same shape sidebar in both products** (Atlassian). Reduces cognitive load.
2. **Workspace/product context indicator at top of sidebar** (Atlassian pattern).
3. **Switcher visible only when ≥2 products are accessible** for that user (Slack pattern). For Swazulu pilot: both visible. For DraggonnB-only tenant (e.g. Plett guesthouse with no Trophy OS): no Trophy OS link in sidebar.
4. **No re-auth interrupting the user** — that's the entire UX promise. If we redirect to a "click to continue" page, we've failed.

#### Supabase Cross-Domain Reality (CRITICAL)

Verified via [Supabase Discussion #5742](https://github.com/orgs/supabase/discussions/5742) and [Michele Ong's blog](https://micheleong.com/blog/share-sessions-subdomains-supabase):

- **Cross-subdomain (`*.draggonnb.co.za`):** Achievable by setting cookie `Domain=.draggonnb.co.za` (with leading dot). `@supabase/ssr` does NOT do this by default — requires custom cookie config. Default sets Domain to host-only, breaking `swazulu.draggonnb.co.za` ↔ `trophy.draggonnb.co.za` session sharing.
- **Cross-eTLD+1 (`swazulu.com` ↔ `trophy.draggonnb.co.za`):** Browsers refuse to share cookies across registrable domains. **Cookie-based SSO is impossible here.** Pattern requires either:
  - Token-handoff redirect (DraggonnB issues short-lived JWT → redirects to `trophy.draggonnb.co.za/auth/sso?token=...` → Trophy validates and sets its own cookie). Standard OAuth code flow.
  - Central auth domain (e.g. `auth.draggonnb.co.za`) hosting the session, with redirect-back from each product. Google Workspace pattern.

**Implication for Phase 13:** SSO bridge is NOT just "set cookie domain" — it has two distinct code paths depending on whether destination shares a registrable domain. This MUST be in ARCHITECTURE.md as a primary concern, but I flag it here because it materially changes feature scope.

#### Categorization

| Sub-feature | Category | Complexity | Dependency |
|-------------|----------|------------|------------|
| Same-eTLD+1 session sharing (cookie Domain=.draggonnb.co.za) | **Table-stakes** | M (4-6d) | Existing `@supabase/ssr` integration; both products must be on `*.draggonnb.co.za` initially |
| Cross-domain token handoff (for `swazulu.com` ↔ `trophy.draggonnb.co.za`) | **Table-stakes for custom-domain tenants** | M-L (5-8d) | JWT signing key shared across both codebases; signed redirect endpoint on each product |
| Sidebar product-context indicator (top of sidebar shows "DraggonnB OS" or "Trophy OS") | **Table-stakes** | S (1d) | Existing sidebar shell |
| Conditional product-switcher item ("Trophy OS" link visible only if `tenant_modules.config.trophy.linked_org_id` set) | **Table-stakes** | S (1-2d) | `tenant_modules` table; middleware tenant resolution (already exists) |
| Loading state during cross-product nav (skeleton or progress bar) | **Table-stakes** | S (0.5d) | Next.js loading.tsx convention |
| Same-shape sidebar across both products (Atlassian principle) | **Differentiator** | M (3-4d, Trophy OS side) | Trophy OS sidebar refactor to mirror DraggonnB shell |
| Mobile: product switcher in mobile drawer (not just bottom sheet) | **Table-stakes** | S (1d) | Existing mobile sidebar |
| Per-product theming/accent color on shared shell | **Differentiator** | S (1d) | CSS variables already used |

**Anti-features (deliberately NOT in v3.1):**

| Anti-feature | Why requested | Why not | Alternative |
|--------------|---------------|---------|-------------|
| **9-dot grid product launcher (Google Workspace)** | "Looks enterprise" | Two products. A grid for two icons is overkill and signals more products that don't exist. | Inline sidebar item is enough. Revisit when ≥4 products. |
| **Persistent product-switcher rail on far left (Slack pattern)** | "Slack does it" | Same: two products. The rail eats horizontal space and adds visual chrome with no payoff at this scale. | Inline sidebar item with product icon + name. |
| **Real SAML/OIDC SSO (third-party IdP)** | "Enterprise customers want SSO" | None of the v3.1 target tenants have IdPs. Adds compliance scope (SCIM, JIT provisioning, SAML metadata). | Internal-only token handoff between own products. SAML/OIDC IdP support deferred to post-v3.1. |
| **Multi-account switcher (user is in two unrelated orgs)** | Slack supports it | Single user is single org in DraggonnB today (`organization_users` 1-to-1 in practice for v3.1 cohort). | Defer until users complain. Use account-switching menu only if real demand. |
| **Re-auth on cross-product nav for "sensitive" actions** | "Banking-grade security" | Lodge owners do not want a password prompt to view their hunting bookings. Friction kills the federation UX. | Step-up auth only on truly sensitive actions (e.g. changing PayFast token). Not on nav. |

---

### 2. Cross-Product Navigation (Phase 13)

**Goal:** DraggonnB sidebar surfaces "Trophy OS" link conditionally on `tenant_modules.config.trophy.linked_org_id` being set. Trophy OS adds "DraggonnB OS" link if user has linked DraggonnB org.

#### Industry Patterns

- **Atlassian** places product switcher as a top-of-sidebar control (icon + product name), with the rest of the sidebar adapting to the active product. The trick: sidebar layout pattern is identical between products — only the items inside change.
- **HubSpot** has CRM/Marketing/Sales/Service Hubs. They're navigated via top nav tabs (not sidebar) because they're "modules of one product." Different mental model — would NOT apply here since Trophy OS is a separate product, not a module.
- **Linear + Notion** integration is via embed/share — no in-app product switching (each is its own browser tab). Not applicable; we want first-class federation.

**Decision driver:** Is Trophy OS conceptually a 12th module of DraggonnB OS, or a separate product? Per `<milestone_context>`, Option C (SSO bridge, NOT absorption) was explicitly chosen. Therefore Trophy OS is a separate product. Sidebar must reflect that.

#### Visual Treatment Decision

| Treatment | Pros | Cons | Verdict |
|-----------|------|------|---------|
| **Inline sidebar item** ("Trophy OS" mixed in with module items) | Simple. One CSS change. | Visually flattens a "go to other product" nav alongside intra-product nav. User clicks expecting a panel, gets a domain redirect. | NO — confuses mental model. |
| **Separate sidebar section** (own group with header "Other Products" or just a visual separator above) | Clear "this is different" signal. Familiar from VS Code's "Source Control / Run / Extensions" rail division. | Slight extra vertical real estate. | **YES — recommended.** |
| **Top-of-sidebar product chip** (Atlassian style — clickable chip showing current product, dropdown shows other products) | Most consistent with Atlassian/enterprise SaaS. Scales when 3rd product arrives. | Higher complexity to implement (dropdown UI). | Fallback if separate section feels wrong; future-proof. |

**Recommended: separate sidebar section** for v3.1 (two products). Migrate to top-of-sidebar chip when 3rd product appears.

#### Loading State

| Loading scenario | What user sees |
|------------------|----------------|
| Click "Trophy OS" → token handoff redirect | Full-page skeleton matching Trophy OS shell within ~300ms; if SSO handoff <500ms, no skeleton (hard nav feels native). |
| Slow network (token verify >2s) | Branded loading state ("Connecting you to Trophy OS…") with cancel option after 5s. |
| Token-handoff failure (e.g. shared JWT key rotated mid-session) | Land on Trophy OS login page with prefilled email + "Sign in to continue" — never a stack trace or 500. |

#### Categorization

| Sub-feature | Category | Complexity | Dependency |
|-------------|----------|------------|------------|
| Conditional sidebar item (gated by `tenant_modules.config.trophy.linked_org_id`) | **Table-stakes** | S (1d) | `tenant_modules` table + middleware injection of trophy module flag |
| Separate sidebar section with subtle separator + section label | **Table-stakes** | S (1d) | Existing sidebar shell + ModeToggle primitive |
| Skeleton/loading state during cross-product redirect | **Table-stakes** | S (0.5d) | Next.js `loading.tsx` |
| Reverse direction (Trophy OS → DraggonnB) | **Table-stakes** | S (1d, mostly Trophy OS sidebar work) | Trophy OS sidebar already exists; add link |
| Persistent "active product" indicator at top of sidebar | **Differentiator** | S (1d) | Sidebar shell |
| Mobile-friendly product switcher in collapsed drawer | **Table-stakes** | S (1d) | Existing mobile sidebar |
| Bidirectional deep-link memory ("you were viewing Booking X in DraggonnB; come back to it after Trophy OS trip") | **Differentiator** | M (3-4d) | New `last_visited_path` per-product on user record |

**Anti-features:**

| Anti-feature | Why not | Alternative |
|--------------|---------|-------------|
| **Top-bar product-switcher dropdown showing both products with health indicators** | Over-engineered for 2 products. Adds top-bar height. Most lodge owners use the sidebar primarily. | Sidebar section is sufficient. |
| **Cross-product unified search** ("find anything across DraggonnB AND Trophy OS") | Massive scope (search infrastructure). Two products with ~100 booking + ~50 safari rows in v3.1 don't need unified search. | Per-product search (already exists). Defer unified search to post-PMF. |
| **In-app cross-product notifications panel** ("Trophy OS: 3 trophies pending QC") | Notifications spine is Phase 17+ scope per existing roadmap conventions. Approval Telegram already covers urgent cross-product needs. | Use approval spine (Phase 14) + Telegram for cross-product alerts. Defer in-app notification center. |

---

### 3. Approval Spine (Phase 14)

**Goal:** Generic `approval_requests` table + Telegram tap-to-approve + `/approvals` queue page. Action types: damage_charge, rate_change, content_post, quota_change, safari_status_change, supplier_job_approval.

#### Industry Patterns

| Pattern | Source | Notes |
|---------|--------|-------|
| **Single-level approve/reject is the norm for SMB** | [Spendflo 2026 guide](https://www.spendflo.com/blog/approval-workflows), [Signavio](https://www.signavio.com/post/multi-level-approval-workflows/) | Multi-level is for enterprise with formal hierarchies (CFO → Finance → Manager). Lodge owner is the single approver. |
| **Tap-to-approve via Telegram inline keyboard** | [Telegram Bot API](https://core.telegram.org/api/bots/buttons), n8n templates | InlineKeyboardMarkup with `callback_data` is the standard primitive. Tap → callback query → bot updates message inline ("Approved by Chris at 14:32"). |
| **Web fallback queue page** | Power Automate, ServiceNow, Spendflo | Mobile-first approvals, but always a desktop queue for batch processing or when Telegram is missed. |
| **Approval expiry** | Spendflo, Power Automate | Standard auto-action on expiry: route to default approver, escalate, or auto-reject. **Auto-reject after expiry is the safest default** for damage charges — guest is not surprise-billed. |
| **Audit trail** | All workflow systems | Every approve/reject must record `who`, `when`, `from_what_device` (Telegram callback vs web click). |
| **Delegation** | Power Automate, NetSuite ZoneApprovals | "VP is on vacation, delegate Sarah for 2 weeks." Practical only if multiple approvers exist. |

#### Existing DraggonnB Capabilities to Reuse

- Telegram ops bot pattern (`lib/accommodation/telegram/ops-bot.ts`) — already sends inline-button messages and handles callback queries. Approval spine is a generalization, not a new technology.
- `tenant_modules.config` JSONB already stores per-tenant Telegram channel routing (used by accommodation ops bot). Approval bot can use the same routing.
- `getUserOrg()` pattern handles auth lookups for the `/approvals` queue page.

#### Categorization

| Sub-feature | Category | Complexity | Dependency |
|-------------|----------|------------|------------|
| `approval_requests` table with all listed columns + indexes on `(org_id, status, expires_at)` and `(approved_by, approved_at)` | **Table-stakes** | S (1d) | OPS-05 multi-step migration discipline |
| `proposeApproval(action_type, target_resource_id, payload)` library function returning request_id | **Table-stakes** | S (1-2d) | Generic enough to be called from any product |
| Telegram tap-to-approve via inline keyboard ("Approve" / "Reject" / "View details") | **Table-stakes** | M (3-4d) | Existing Telegram ops bot pattern |
| Telegram callback handler — verifies callback came from authorized user, checks `expires_at`, updates `approval_requests.status` + edits the original message inline | **Table-stakes** | M (2-3d) | Telegram callback signature verification |
| `/approvals` web queue page (list pending, sort by `proposed_at`, click to view detail + approve/reject) | **Table-stakes** | M (3-4d) | Existing UI shell, getUserOrg, RLS |
| Approval expiry auto-reject (cron or pg_cron job; default 24h for damage charges, 72h for content posts) | **Table-stakes** | S-M (2d) | Existing cron infrastructure |
| Per-action-type configurable expiry window (in `tenant_modules.config.approvals.expiry_hours_by_action`) | **Differentiator** | S (1d) | tenant_modules.config |
| Audit trail (who approved, when, via which surface — telegram vs web) | **Table-stakes** | S (built into table schema) | — |
| Visual signal for approvals waiting on the user across products (count badge in sidebar) | **Differentiator** | M (3-4d) | Cross-product header polling or shared cookie |
| Telegram message includes thumbnail/photo when relevant (damage photo, content draft preview) | **Differentiator** | S (1d) | Telegram sendPhoto vs sendMessage |
| Bulk-approve from web queue ("approve all 5 content posts") | **Differentiator** | S (1d) | Existing checkbox UX patterns |
| Action-type-specific approval payload renderers (damage shows photo + amount; content shows draft preview; rate change shows old vs new) | **Table-stakes** | M (3-5d) | Per-action-type renderer registry |

**Anti-features:**

| Anti-feature | Why requested | Why not in v3.1 | Alternative |
|--------------|---------------|------------------|-------------|
| **Multi-level approval chains** (e.g. damage > R5K → manager → owner) | "What if owner is hospitalized?" | Adds state machine complexity (parallel vs sequential, escalation). Lodge owners are owner-operators — they ARE the approver. Per existing CLAUDE.md "Multi-layered approval workflows (3-tier like Hootsuite)" already an anti-feature. | Single-level. If owner unavailable, web fallback `/approvals` lets staff escalate manually via Telegram. |
| **Approval delegation ("delegate to spouse while I'm flying")** | Reasonable for owner-operators who travel. | Requires delegation table + permission rules + audit shifts. Edge case in v3.1. | Add only if validated demand. Telegram approval is portable — owner can approve from anywhere with internet. |
| **Conditional auto-approve (e.g. damages under R500 auto-approve)** | "Reduce friction for small charges." | Risk of fraud and audit problems. Owner trust needs explicit approval per charge in v3.1. | Owner can build a "shortcut" UX once trust is established. Auto-approve thresholds = post-pilot iteration. |
| **Approval comments / threaded discussion** | Slack-style "let me ask the manager first." | Not how Telegram message threads work; not how owner-operators work. | Free-text "rejection reason" field is enough. Long discussions go to WhatsApp/phone. |
| **Approval analytics dashboard** ("what's your average approval time?") | "Looks insightful." | Won't be used in v3.1. Defer until volumes justify. | Just log audit trail. Build dashboard later if asked. |
| **Approver substitution on rejection** ("if A rejects, route to B") | Complex routing. | Not v3.1 scope. | Single-level reject = end of workflow. Rejection notifies proposer; they can revise and re-propose. |

#### Telegram Tap-to-Approve UX Specifics

```
[Telegram message body]
🛏️ Damage charge proposed
Booking: SAF-2026-001 (Mthembu — checkout 2026-04-29)
Item: Broken bedside lamp
Amount: R450
Photo: [thumbnail]
Proposed by: Sarah (housekeeping)

[Inline keyboard]
[ Approve R450 ]   [ Reject ]   [ View details ]
```

After tap:
- Message edited in-place to: `✅ Approved by Chris at 14:32 — R450 charged to Mthembu via PayFast.`
- Or: `❌ Rejected by Chris at 14:32. Reason: "Already discussed with guest, waive."`
- "View details" opens deep link to `/approvals/{id}` web page (mobile browser).

**Critical for damage charges:** Photo MUST appear inline in the Telegram message. Owner approving a damage charge they cannot see = recipe for fraud/disputes.

---

### 4. Damage Auto-Billing Flow (Phase 15)

**Goal:** Staff sees broken glass during turnover → tap Telegram bot → photo + description → triggers approval_request → owner approves → guest charged via PayFast stored token + WhatsApp confirmation. End-to-end in seconds.

#### Industry Patterns (Hospitality)

Sources: [Mews](https://www.mews.com/en/blog/hotel-chargebacks-how-to-handle), [Canary Technologies](https://www.canarytechnologies.com/post/best-practices-for-hotels-to-avoid-chargebacks), [Minut damage list](https://www.minut.com/blog/hotel-damage-charges-list), [chargebacks911](https://chargebacks911.com/hotel-chargebacks/).

**The hospitality damage-charge playbook:**

1. **Pre-authorize at check-in.** Hotel runs hold on guest card for incidentals. PayFast equivalent: pre-auth a token at booking, store as `payment_method_token` linked to booking.
2. **Itemized damage price list, NOT flat fees.** "Broken lamp R450, smashed wineglass R85" rather than "R500 cleaning fee." Reduces disputes substantially.
3. **Photo evidence is mandatory.** Charging without photos = guaranteed chargeback win for guest.
4. **Notify guest BEFORE charging.** Post-checkout damage charges without notice are the #1 chargeback trigger.
5. **48-72h dispute window** before card is charged. Guest sees photo + description + price; can contest by replying.
6. **Itemized receipt sent via email/WhatsApp** at the moment of charge.

#### Pricing UX Patterns

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Pre-loaded damage price list per property** (admin-set: "Lamp R450, glass R85, chair R1,200") | Fast staff entry; consistent pricing; reduces disputes per Minut | Property must maintain list | **YES** — required for table-stakes hospitality UX |
| **Free-text pricing entered by staff** | Flexible | Inconsistent pricing across staff; dispute risk; staff entering R5,000 by typo | NO as primary entry; allow as override with manager flag |
| **AI-suggested pricing from photo** | Cool demo | High error rate (Claude can't reliably price physical damage); legal risk if wrong | Defer to post-v3.1; not differentiator-worthy at this stage |

#### Refund / Dispute Flow

**Three failure modes for damage charges:**

1. **Guest disputes BEFORE charge (within window):** Guest replies to WhatsApp confirmation contesting the charge. Owner sees in `/approvals/{id}` page → can cancel or proceed. **No chargeback.** This is the value of the dispute window.
2. **Guest disputes AFTER charge:** Refund flow needed. PayFast supports refunds via API on the original transaction. Refund partial/full → email/WhatsApp confirmation.
3. **Guest charges back via card issuer:** PayFast notifies merchant of chargeback. Merchant has X days to respond with evidence (photo, signed registration, dispute window proof). Photo + audit trail (who proposed, who approved, when, dispute window honored) = winnable chargeback.

#### Categorization

| Sub-feature | Category | Complexity | Dependency |
|-------------|----------|------------|------------|
| Damage price list table per org (`damage_pricing` with item_name, price, category) | **Table-stakes** | S (1-2d) | OPS-05 migration |
| Telegram bot command `/damage` triggers photo+item entry flow (existing ops bot extension) | **Table-stakes** | M (3-4d) | Existing accommodation ops bot |
| Photo upload via Telegram → Supabase storage with signed URL | **Table-stakes** | S (1d) | Existing storage patterns |
| Damage proposes `approval_request` of `action_type=damage_charge` with photo + price + booking link | **Table-stakes** | S (1d) | Phase 14 approval spine |
| Owner approve → trigger PayFast charge via stored token | **Table-stakes** | M (3-4d) | Existing `lib/payments/payfast-adhoc.ts` (verify ad-hoc agreement supports stored-token charges) |
| WhatsApp confirmation to guest with itemized receipt PDF link + dispute window expiry timestamp | **Table-stakes** | M (2-3d) | Existing WhatsApp send infrastructure (accommodation ConciergeAgent) |
| 48-72h dispute window: charge held in `pending` state, auto-fires after window unless guest contests | **Table-stakes** | M (3-4d) | pg_cron + scheduled charge execution |
| Guest dispute reply (via WhatsApp) → owner sees in `/approvals` → can cancel charge before window expires | **Table-stakes** | M (3-4d) | WhatsApp inbound webhook handling (existing) |
| Refund flow for post-charge disputes (PayFast refund API) | **Table-stakes** | M (3-4d) | PayFast refund API |
| Itemized PDF receipt generation | **Table-stakes** | S-M (2-3d) | Existing receipt PDF generation patterns from accommodation |
| Chargeback evidence packet auto-assembly (photo + audit trail + dispute window proof) downloadable from `/admin/disputes` | **Differentiator** | M (4-5d) | All audit trail data already captured |
| Damage trends report ("most-damaged item this quarter: wine glasses, R5,400 total") | **Differentiator** | S (1d) | SQL aggregation |

**Anti-features:**

| Anti-feature | Why requested | Why not | Alternative |
|--------------|---------------|---------|-------------|
| **AI auto-pricing from photo** | "Cool demo." | Liability + accuracy + legal risk. Charging guest R3,400 because Claude misread a photo = lost guest + dispute + potential POPI complaint. | Pre-loaded price list. Deterministic. |
| **Auto-charge below threshold** ("auto-charge if <R500") | "Speed." | Removes the approval spine's whole point. Even small charges get disputed. | Fast Telegram approval is enough; <30s to approve. |
| **No-photo damage entry** | "Sometimes you can't photograph it." | Without photo, chargeback is automatic guest win. Photo MUST be required. | If no photo, staff must escalate to manager via different flow. |
| **Damage charges that bypass dispute window** | "Owner wants charge immediately." | Removes the entire chargeback-prevention benefit. | Owner gets confirmation that charge will happen at expiry; can override only with explicit "skip window" toggle (with audit log). Default is always have a window. |
| **Public damage shame list** ("guests who damaged most") | Funny but exists in some PMS gimmicks. | POPI violation + reputational risk. | None. |
| **Dynamic surge damage pricing** ("peak season +20%") | Hospitality revenue maximization mindset. | Dispute magnet. | Flat per-item pricing, transparent in receipt. |

---

### 5. Multi-Hunter Split Billing (Phase 15)

**Goal:** One safari, multiple hunters. Each pays independently. `safari_hunters` junction with per-hunter `daily_rate`, `species_taken`, `trophy_fees_owed`, `payment_status`.

#### Industry Patterns (Hunting + Group Adventure)

Sources: [BookYourHunt](https://www.bookyourhunt.com/en), [Africa Hunt Lodge packages](https://africahuntlodge.com/hunting-packages), [Big Game Hunting Adventures 2026 SA packages](https://biggamehuntingadventures.com/south-africa-hunting-packages/), Kaiwhai Safaris, Guidefitter SA outfitters listing.

**Hunting industry billing patterns:**

1. **Daily rate × days × hunters** — pre-paid, often non-refundable. ("$2,400/hunter for 6 days")
2. **Trophy fees billed separately at harvest.** ("$1,200 kudu trophy fee, paid only on actual kill.") This is the à la carte model.
3. **Ratio pricing:** 1×1 (one hunter, one PH) vs 2×1 (two hunters share PH) — PH cost is split when ratio shifts.
4. **Observer/non-hunter rate:** Spouse/photographer accompanies but doesn't hunt — separate (lower) daily rate.
5. **Independent payment is the norm** — if 4 hunters book a safari, the outfitter sends 4 separate invoices, often to 4 different cards (sometimes 4 different countries, currencies). Group leader may pay the deposit; trophy fees per-individual.

**Comparable group adventure patterns:**

- **Rafting (e.g. ARTA, OARS)**: One booking holds slots; each guest pays own balance via individual payment links. Trip leader is administrative, not financial.
- **Climbing expeditions (Alpine Ascents)**: Per-climber contract + per-climber payment plan. Group discount only on shared logistics (porter, vehicle).
- **Diving liveaboards**: Per-diver per-cabin pricing; group leader pays group fee, individuals pay per-person.

**Common feature:** Each participant has their own portal/login OR receives their own payment links. Group leader sees roll-up but never pays for everyone unless explicitly chosen.

#### `safari_hunters` Schema Implications

Per `<question>` Trophy OS already has the table designed. Validate fields against industry:

| Field in question | Industry validation |
|-------------------|---------------------|
| `daily_rate` | YES — must be per-hunter (ratio-based pricing). |
| `species_taken` | YES — array of trophy IDs harvested by this hunter. |
| `trophy_fees_owed` | YES — sum of trophy fees for harvested species. |
| `payment_status` | YES — independent per hunter. |

**Missing fields industry suggests adding:**

| Field | Why | Priority |
|-------|-----|----------|
| `hunter_role` | enum: `hunter` / `observer` (non-hunter spouse). Different rate, different liability. | **Must** |
| `passport_country` | Affects CITES export, currency preferences, tax handling. | **Must** for international safaris |
| `payment_method_token` (PayFast token) | Each hunter can have their own card on file. | **Must** for split billing |
| `deposit_paid_at` / `balance_due_date` | Hunting-industry deposits are 30-50% upfront, balance 30-60 days before arrival. | **Should** |
| `species_quota_per_hunter` | Some safaris allocate species per hunter (e.g. each hunter gets 1 kudu, 1 impala). Critical for Trophy OS quota auto-update. | **Must** |
| `consent_to_individual_billing_at` | Per POPI, each hunter must consent to their own card being charged. | **Must** for SA legal compliance |

#### Categorization

| Sub-feature | Category | Complexity | Dependency |
|-------------|----------|------------|------------|
| `safari_hunters` junction with required fields above | **Table-stakes** | S (1-2d) | OPS-05 migration |
| Per-hunter daily-rate calc (1×1 vs 2×1 ratio aware) | **Table-stakes** | M (3-4d) | Trophy OS pricing config |
| Per-hunter trophy fees auto-credited on harvest (ties to Trophy OS quota auto-update — already exists) | **Table-stakes** | M (2-3d) | Existing trophy-harvest event in Trophy OS |
| Independent PayFast payment links per hunter | **Table-stakes** | M (3-4d) | Existing PayFast lib |
| Per-hunter payment status dashboard (group leader sees roll-up; each hunter sees own balance) | **Table-stakes** | M (3-4d) | RLS on `safari_hunters` |
| Observer/non-hunter rate handling | **Table-stakes** | S (1d) | hunter_role enum |
| Per-hunter passport/CITES doc upload | **Differentiator** | M (3-4d) | Trophy OS doc storage |
| Per-hunter pre-arrival forms (rifle declarations, medical, dietary) | **Differentiator** | M (3-4d) | Form builder or new schema |
| Group leader sees consolidated billing report | **Table-stakes** | S (1d) | Aggregation query |
| Trophy fees pro-rated correctly when one hunter takes a trophy quota'd by group | **Table-stakes** | M (3-4d) | Quota allocation logic |
| Currency choice per hunter (US hunter pays USD, SA hunter pays ZAR) | **Differentiator** | L (8-10d) | PayFast does ZAR only; international hunters need separate processor or convert-at-checkout. **Likely defer to v3.2.** |
| Observer-to-hunter conversion mid-trip (spouse decides to hunt) | **Anti-feature for v3.1** | — | Manual rebook. |

**Anti-features:**

| Anti-feature | Why requested | Why not | Alternative |
|--------------|---------------|---------|-------------|
| **Auto-split deposit equally** ("Deposit divided 4 ways automatically") | "Convenience." | In practice, group leader almost always pays deposit and sorts out internally. Forcing equal split breaks how groups actually work. | Group leader pays deposit; per-hunter trophy fees + balance billed independently. |
| **Currency conversion in v3.1** | "International hunters." | PayFast is ZAR only. International multi-currency = separate processor (Stripe, Adyen) = full architecture change. | All v3.1 invoices in ZAR; international hunters convert at their bank. v3.2 explores Stripe for international currencies. |
| **Per-hunter sub-subdomains** ("hunter1.swazulu.com") | Over-personalization. | Massive infra; no payoff. | Single safari URL; per-hunter portal accessed via signed link. |
| **Real-time hunter chat channel** ("Slack for the safari group") | "Cool feature." | Not core to billing. WhatsApp group already exists for every hunting group. | WhatsApp link surfaced in Trophy OS UI; do not build chat. |
| **Refund logic for "I didn't shoot anything"** | Hunter expectation. | Industry norm: daily rate non-refundable; trophy fees only owed on harvest. Already correct in Trophy OS schema. | Document policy clearly in safari T&Cs surfaced at booking. |

---

### 6. Cross-Product Stay Link (Phase 15)

**Goal:** `safaris.accommodation_booking_id` → DraggonnB Accommodation booking. UX: DraggonnB shows "Linked hunt: SAF-2026-001"; Trophy OS shows "Linked stay: at Swazulu Lodge, 5 nights." Single billing root option.

#### Industry Patterns

Hospitality + activity-bundling industry patterns:

- **Booking.com Experiences + Booking.com Stays** — separate flows; `booking_reference` as cross-link; consolidated trip view but separate cancellation policies.
- **Expedia Bundles** — single PNR-style trip ID covers flight + hotel + activity; one cancellation = all cancelled (or hotel-only with penalty).
- **Hunting-specific:** Outfitter usually sells a complete safari package — accommodation IS part of the safari. Splitting into separate bookings is the EXCEPTION, used when:
  - Hunter wants to extend stay post-safari for tourism (non-hunting nights).
  - Lodge serves both hunters AND non-hunting guests (Swazulu's case — lodge + game farm under same owner, but accommodation-side also sells to non-hunting guests).

#### Linking Models

| Model | Description | Pros | Cons | Verdict |
|-------|-------------|------|------|---------|
| **One-to-one (safari ↔ booking)** | One safari has one accommodation booking; booking has at most one safari | Simple. Easy UI. | Doesn't handle hunters who arrive a night early or stay extra nights. | NO. |
| **One-to-many (safari ↔ multiple bookings)** | Safari spans multiple booking rows (e.g. one booking for safari nights, another for tourism extension) | Handles real cases. | More UI work. | **YES** — schema needs to support array. |
| **Many-to-many (multi-hunter, multi-stay)** | Each hunter on safari may have own booking | Flexible. | Over-engineered for v3.1 — hunters typically share lodge rooms. | NO for v3.1. |

Recommendation: `safaris.accommodation_booking_ids` as array (or `safari_bookings` junction). Allows multiple bookings linked to one safari.

#### Single Billing Root Option

The "one PayFast subscription token covers both" idea — let me think through this.

**Option A: Two separate billing roots, linked.** Each product's billing is independent. Cross-link is informational only. Hunter sees two PayFast charges (one for accommodation, one for safari).
- Pros: Clean separation; refunds/cancellations don't entangle.
- Cons: Two charges = "why am I being billed twice for one trip?" confusion.

**Option B: Single billing root (one PayFast token, one invoice covering both).** One product is "primary" (likely Trophy OS for hunters, since safari is the high-ticket item); accommodation invoiced as line item on the safari invoice.
- Pros: Single charge, single invoice, single cancellation flow. Matches the "trip" mental model.
- Cons: Tightly couples the two products; refund logic complex when only accommodation is cancelled but safari stays; complex revenue split between Swazulu's two business entities (if separate) for accounting purposes.

**Option C: Either, configurable per booking.** Default to A (separate); offer B at booking creation as "Bill all together?" toggle.
- Best of both. Most v3.1 bookings will use A (simple). Power users use B when clean.

Recommendation: **Option C (configurable, default A)** in v3.1. Don't force a single billing root; offer it.

For Swazulu specifically, this matters because Swazulu's accommodation accounting and trophy/safari accounting may be in different cost centres (lodge revenue vs hunting revenue). Forcing a single billing root creates accounting complications.

#### Categorization

| Sub-feature | Category | Complexity | Dependency |
|-------------|----------|------------|------------|
| `safari_bookings` junction (or array column) linking safari ↔ accommodation booking | **Table-stakes** | S (1d) | OPS-05 migration |
| DraggonnB booking detail page shows "Linked hunt: SAF-2026-001" badge | **Table-stakes** | S (1d) | Existing booking detail page |
| Trophy OS safari detail shows "Linked stay: Swazulu Lodge, 5 nights" with check-in/out dates | **Table-stakes** | S (1d) | Trophy OS safari page |
| Click-through link from DraggonnB → Trophy OS safari (uses Phase 13 SSO bridge) | **Table-stakes** | S (0.5d) | Phase 13 SSO bridge |
| Click-through link from Trophy OS → DraggonnB booking | **Table-stakes** | S (0.5d) | Phase 13 SSO bridge |
| Single-billing-root option (toggle at booking creation: "Bill safari + accommodation together") | **Differentiator** | M (5-7d) | PayFast variable-amount subscription pattern |
| Cross-product cancel cascade ("Cancelling safari — keep linked accommodation? cancel? extend as tourism?") | **Differentiator** | M (3-4d) | Cancel state machine in both products |
| Cross-product check-in coordination ("hunter arrives Friday — accommodation auto-checks in same time as safari starts") | **Differentiator** | M (3-4d) | Event sync between products |
| Cross-product modify ("guest wants to extend stay 2 nights post-safari") | **Differentiator** | M (3-4d) | Both products writable from one interface |

**Anti-features:**

| Anti-feature | Why requested | Why not | Alternative |
|--------------|---------------|---------|-------------|
| **Mandatory single billing root** | "Cleaner UX." | Breaks Swazulu's accounting separation. | Optional toggle, default off. |
| **Auto-create accommodation when safari is created** | "One-step booking." | Booking dates / room types / guest count vary independently of safari. Owner needs control. | Suggest accommodation creation in safari flow, but never auto-create. |
| **Real-time bidirectional sync** ("change date in one product, both update") | Sync risk; race conditions; partial-failure hell. | Owner does not change dates often; when they do, controlled wizard is safer than auto-sync. | Cross-product change wizard (Phase 17+ if needed). |
| **Per-hunter accommodation assignment in v3.1** ("hunter A in chalet 1, hunter B in chalet 2") | Real need but scope. | Multi-room safari logistics is its own product surface. | Single accommodation booking per safari for v3.1; per-hunter rooming defer to v3.2. |

---

### 7. PWA Guest Experience (Phase 16)

**Goal:** `stay.draggonnb.co.za/{booking-id}` per-booking PWA. Pre-arrival info, check-in details, concierge chat, payment links, post-stay review request, photo gallery. Mobile-first.

#### Industry Patterns

Sources: [INTELITY 2026 PWA vs apps](https://intelity.com/blog/pwa-vs-mobile-apps-hotel-industry-what-hotels-need-to-know-2026/), [QloApps PWA](https://qloapps.com/progressive-web-app/), [Lite16 2026 PWA blog](https://lite16.com/blog/2026/04/15/progressive-web-apps-pwa/), [Mobiloud PWA examples 2026](https://www.mobiloud.com/blog/progressive-web-app-examples), [Trivago PWA case study referenced in INTELITY].

**Hospitality PWA patterns 2026:**

1. **Per-booking URL with unguessable token** (not booking-id alone — that's enumerable). Pattern: `stay.draggonnb.co.za/{signed_token}`. Signed token includes booking_id + expiry.
2. **No login required** — token IS the auth. Guest receives URL via email/WhatsApp at booking confirmation. Clicks → in.
3. **Install prompt timing:** NEVER on first visit. Standard pattern: after 2nd visit OR after first meaningful interaction (paid deposit, completed pre-arrival form). Install prompt dismissed in past 30 days = don't show again. Trivago saw 150%+ engagement from installed PWA users — but only when install prompt was triggered well.
4. **Offline behavior:** Cache check-in details + property address + emergency contacts + concierge phone for offline read. Concierge chat = online-only with "queued, will send when online" UI. Payment links = online-only.
5. **Push notifications** require user grant — typically asked AFTER install prompt accepted, not before. Use cases: "Check-in is ready", "Payment processed", "Lodge owner replied to your concierge message".
6. **Service worker scope:** Per-booking PWA means each booking is a separate app context. Cache strategy: stale-while-revalidate for static info; network-first for live data (payment status, messages).

#### Per-Section UX

| Section | Content | Behavior |
|---------|---------|----------|
| **Pre-arrival** | Address with map link, check-in instructions, gate code (revealed 24h before arrival), Wi-Fi password (revealed at check-in time), house rules | Static; cacheable |
| **Check-in** | Self-check-in flow: arrival time, ID upload, signature on house rules, deposit token confirmation | Online-only |
| **Concierge** | Chat with ConciergeAgent (existing accommodation AI agent); fallback to staff WhatsApp link | Online-only with offline queue |
| **Payments** | Outstanding balance, deposit status, damage charges (if any), receipt PDFs | Online-only |
| **Photo gallery** | Property photos + (optional) shared experience photos uploaded by lodge during stay | Cacheable thumbnails; full-res online |
| **Post-stay review** | Triggered T+24h after checkout via ConciergeAgent or Reviewer agent (existing) | Online-only |

#### Categorization

| Sub-feature | Category | Complexity | Dependency |
|-------------|----------|------------|------------|
| `stay.draggonnb.co.za` subdomain + Vercel routing | **Table-stakes** | S (0.5d) | Existing wildcard domain |
| Signed-token URL per booking (booking_id + expiry, HMAC-signed) | **Table-stakes** | S (1-2d) | Existing HMAC pattern (CAMPAIGN_EXECUTE_HMAC_SECRET reference) |
| Pre-arrival info page (address, gate code with timed reveal, Wi-Fi, house rules) | **Table-stakes** | M (3-4d) | Booking + property data already exists |
| Check-in flow (ID upload, e-signature on house rules, gate code reveal) | **Table-stakes** | M (4-5d) | Storage + signature library |
| Concierge chat reusing existing ConciergeAgent | **Table-stakes** | M (3-4d) | Existing accommodation ConciergeAgent |
| Payment links + receipt PDFs (existing PayFast lib) | **Table-stakes** | S-M (2-3d) | Existing PayFast |
| Service worker for offline cache (static pre-arrival info) | **Table-stakes** | M (3-4d) | next-pwa or hand-rolled service worker |
| Web app manifest (icons, name, theme color, start_url) | **Table-stakes** | S (0.5d) | — |
| Install prompt timing logic (2nd visit OR post-deposit-pay) | **Differentiator** | S-M (1-2d) | localStorage tracking + beforeinstallprompt event |
| Push notifications for check-in ready / message arrived | **Differentiator** | M (3-4d) | Web Push + service worker |
| Photo gallery (property + shared trip photos) | **Differentiator** | M (3-4d) | Storage + image optimization |
| Post-stay review request (triggered T+24h after checkout) | **Table-stakes** | S (1d) | Existing accommodation review-request infrastructure |
| Multilingual support (English, Afrikaans, Zulu, Xhosa initial set) | **Differentiator** | M (3-5d) | i18n setup |
| Add-to-home-screen prompt only after meaningful interaction (deposit paid, etc.) | **Table-stakes** | S (1d) | Install logic |
| iOS 17+ support for installable PWAs | **Table-stakes** | S (1d) | Apple touch icons + manifest correctness |
| Per-booking branding (logo, colors per property) | **Differentiator** | M (2-3d) | Existing brand settings extended to PWA |

**Anti-features:**

| Anti-feature | Why requested | Why not | Alternative |
|--------------|---------------|---------|-------------|
| **Login required** ("more secure") | Misunderstanding. | Friction kills usage. Token-as-auth is standard for guest-facing booking apps (Mews, Cloudbeds, AirBNB). | Signed token in URL. |
| **Native iOS/Android app** | "More polish." | App store overhead, review delays, dual codebase. INTELITY 2026 explicitly says PWA for short-stay guests; native for loyalty members. | PWA only for v3.1. Native deferred indefinitely. |
| **Full social media integration** ("share your stay") | Marketing instinct. | Not what guests want during a stay. | Post-stay sharing is enough; in-stay is intrusive. |
| **In-app shopping (gift shop, F&B order)** | Hotel-app standard. | Scope creep. Existing accommodation module already has F&B order flow if applicable. | Link to existing F&B order flow if module enabled. |
| **Real-time room service chat with kitchen** | "Hotel-grade experience." | Service complexity; not Swazulu-relevant. | Concierge AI with WhatsApp staff fallback covers it. |
| **Geofenced features** ("only show check-in when you're <5km away") | Cool. | Scope. Privacy. Doesn't add real value for self-service rural lodge check-in. | Time-based reveal (24h before arrival) is enough. |
| **Loyalty points / rewards** | "Hilton Honors clone." | Single-property pilot. | Defer until multi-property tenants. |
| **In-PWA payment processing of full PayFast flow** | "Smoother UX." | PWA cannot host payment processor's iframe-of-trust. PayFast hosted page is required for PCI. | Open PayFast in browser tab for actual payment; return to PWA via deep link. |

---

### 8. Trophy OS PayFast Wiring (Phase 16)

**Goal:** Trophy OS has no billing today. Wire 14-day trial → R599/R1,499/R3,499 tiers → past_due → cancelled flow. Reuse DraggonnB PayFast lib.

#### Existing DraggonnB Capabilities to Reuse

- `lib/payments/payfast.ts` — base PayFast helpers
- `lib/payments/payfast-adhoc.ts` — ad-hoc charges via stored token
- `lib/payments/payfast-subscription-api.ts` — subscription create/cancel
- `lib/payments/payfast-prefix.ts` — prefix patterns for itemized billing
- DraggonnB billing tier patterns — referenced in `app/api/CLAUDE.md` and `lib/provisioning/CLAUDE.md`

**Recommendation: REUSE the DraggonnB PayFast lib via a shared package import — DO NOT FORK.** Forking creates two divergent paths to fix bugs in. Trophy OS lives in a separate codebase but same Supabase project; Trophy OS imports `@draggonnb/payfast-core` (npm or git submodule). Maintenance becomes one PR per fix.

#### Tier-Gated Features (Validation)

Per `<milestone_context>`, tier features are designed in CLAUDE.md but need industry validation. Industry (HuntDocs, LodgeRunner, generic outfitter SaaS) patterns:

| Tier | Typical features | DraggonnB-aligned bundle for Trophy OS |
|------|------------------|----------------------------------------|
| Starter (~R599) | Basic booking, single PH, single property, max ~50 safaris/year, email support | safari CRUD, single-property, trophy logging, basic quotas, email support |
| Pro (~R1,499) | Multi-PH, multi-area, AI features (e.g. quoter), client portal, integrations | Above + supplier_jobs, cold_room_entries, client portal, multi-area, basic CITES doc gen |
| Premium (~R3,499) | Multi-property, API access, white-label, advanced analytics, priority support | Above + meat_orders, full chain-of-custody, multi-property, API, white-label |

**Industry validation:**
- HuntDocs: free trial, then paid tiers (cancel anytime). Confirms 14-day trial as table-stakes.
- LodgeRunner: outfitter-specific SaaS, custom pricing, no published tiers — bespoke market.
- General SaaS feature flag pattern (designrevision.com 2026): server-side evaluation against subscription tier; entitlement check on each gated route.

**Trophy OS validation:** Tier structure aligns with the safari operations economy. Single-PH, single-property outfitters at R599 is realistic. Multi-property game farms (Swazulu likely Pro or Premium) at R1,499-R3,499. Advanced compliance features (CITES auto-export, chain-of-custody) belong in Premium per regulatory complexity.

#### Trial → Past-Due → Cancelled State Machine

| State | Trigger | What user sees | What system does |
|-------|---------|----------------|------------------|
| `trialing` | New tenant signs up | Full Pro features for 14 days. Banner: "X days left in trial" | Cron T-3, T-1, T-0 reminder emails. |
| `active` | Trial converted (PayFast token saved + first charge succeeded) | No banner, normal use | Monthly renewal cron creates next charge. |
| `past_due` | Charge failed | Banner: "Payment failed. Update card by [date]." Read-only-ish (logging restricted, billing operations gated). | Retry charge T+3, T+5, T+7. |
| `cancelled` | T+7 past_due no payment OR explicit user cancel | Read-only access for 30 days; no new safaris/trophies; export tools available | After 30d, archive tenant data per POPI. |
| `archived` | T+30 from cancelled | Login disabled; data export by support request only | Audit log retained for 7y per SARS. |

#### Categorization

| Sub-feature | Category | Complexity | Dependency |
|-------------|----------|------------|------------|
| Reuse DraggonnB PayFast lib via shared package | **Table-stakes** | S (1-2d setup, mostly tooling) | Existing lib |
| 14-day trial flow (no card upfront OR card-on-file required) | **Table-stakes** | S (1d) | Trial timestamp + cron |
| Tier registry in DB (`trophy_subscription_tiers` or shared table) | **Table-stakes** | S (1d) | OPS-05 migration |
| Per-route tier-gating middleware (server-side evaluation per industry pattern) | **Table-stakes** | M (3-4d) | Trophy OS middleware |
| Trial reminder emails (T-3, T-1, T-0) | **Table-stakes** | S (1-2d) | Existing Resend integration |
| Past-due retry logic (T+3, T+5, T+7) | **Table-stakes** | M (2-3d) | pg_cron + PayFast retry |
| Past-due banner + restricted UX | **Table-stakes** | S (1-2d) | Existing banner pattern |
| Cancellation flow (in-app cancel + retention prompts) | **Table-stakes** | M (2-3d) | DraggonnB pattern |
| 30-day grace read-only access post-cancel | **Table-stakes** | S (1d) | Tier check |
| POPI data export at cancellation | **Table-stakes** | S (1-2d) | Bulk export endpoint |
| Tier upgrade/downgrade flow with prorated charge | **Table-stakes** | M (3-4d) | PayFast variable-amount subscription |
| Annual billing toggle (10-15% discount) | **Differentiator** | S (1-2d) | Already noted in v3.0 FEATURES.md table-stakes |
| Card-on-file required for trial start | **Differentiator** | S (1d) | Reduces trial-to-paid drop-off, debated UX |
| Tier-feature comparison page on `/trophy/billing` | **Table-stakes** | S (1d) | Marketing page |
| Receipt PDF + invoice history | **Table-stakes** | S-M (2-3d) | Existing receipt patterns |
| VAT201-compliant invoicing | **Table-stakes** | S (1d) | Existing patterns |

**Anti-features:**

| Anti-feature | Why requested | Why not | Alternative |
|--------------|---------------|---------|-------------|
| **Forked PayFast lib for Trophy OS** | "Independence." | Two codebases drift. Bug fixes require two PRs. | Shared lib via package import. |
| **Freemium tier (free forever)** | "Reduce signup friction." | HubSpot Free model already an anti-feature in v3.0. Bleeds money on non-payers. SA outfitter market is small; freemium dilutes. | 14-day trial with card OR without (TBD); convert or churn. |
| **Usage-based billing (per-safari)** | "Pay only for what you use." | Adds metering complexity. Outfitters prefer predictable monthly. | Per-tier inclusive limits with overage; not pay-per-use. |
| **Custom enterprise tier with negotiated pricing** | "Big farms want quotes." | v3.1 cohort is 1 farm (Swazulu). Custom pricing = sales overhead. | Premium tier at R3,499; custom only via Chris ad-hoc until ≥3 paying Premium. |
| **In-app upsell prompts ("upgrade to Pro to enable X")** | "Standard SaaS." | Annoying. Owner sees feature once, then sees gated badge. Repeat prompts = churn. | Single banner per session if tier-gated route attempted; gated badge in sidebar (subtle). |
| **Pause subscription (vs cancel)** | "Snowbirds, seasonal hunting." | Adds state to state machine; rarely-used. | Cancel-and-resume is fine. Owner can re-subscribe in 30s. |
| **Multiple payment methods on file** | "Card backup." | PayFast doesn't support stacked tokens; complexity. | One token; replace with new card if expired. |
| **Native ZAR + USD support in Trophy OS** | "International outfitters." | PayFast is ZAR. International = different processor. | ZAR only in v3.1. International deferred. |

---

## Cross-Phase Feature Dependencies

```
Phase 13: SSO bridge + cross-product nav
    └──enables──> Phase 14: Approval spine (Telegram approval needs cross-product user identity)
                       └──enables──> Phase 15: Damage auto-billing (uses approval spine)
                       └──enables──> Phase 15: Multi-hunter split-billing (Trophy OS feature; needs SSO for hunter access to portal)
                       └──enables──> Phase 15: Cross-product stay link (uses Phase 13 nav)
                                         └──enables──> Phase 16: PWA guest experience
                                                            └──parallel──> Phase 16: Trophy OS PayFast wiring

EXISTING (PRE-EXISTING, NOT BUILT IN v3.1):
- DraggonnB Telegram ops bot (lib/accommodation/telegram/ops-bot.ts) — reused in Phase 14
- DraggonnB PayFast lib (lib/payments/*.ts) — reused in Phases 15, 16
- DraggonnB ConciergeAgent (existing accommodation AI agent) — reused in Phase 16 PWA
- DraggonnB ReviewerAgent — reused for post-stay review in Phase 16 PWA
- Trophy OS quota auto-update on harvest — reused for multi-hunter trophy fee calc in Phase 15
- DraggonnB sidebar shell + ModeToggle primitive (12-06) — reused in Phase 13 cross-product nav
- DraggonnB tenant_modules / module_registry tables — reused in Phase 13 trophy.linked_org_id flag
- DraggonnB getUserOrg() pattern — reused in /approvals queue page
- DraggonnB cron infrastructure (pg_cron) — reused in Phase 14 expiry, Phase 15 dispute-window, Phase 16 trial reminders
- DraggonnB HMAC pattern (CAMPAIGN_EXECUTE_HMAC_SECRET) — reused in Phase 16 PWA signed-token URLs
```

### Dependency Notes

- **Phase 13 must ship first** — every other phase assumes user can move between products without re-auth.
- **Phase 14 (approval spine) is foundational for Phase 15 damage auto-billing.** Cannot build damage flow without approval primitive.
- **Multi-hunter split billing (Phase 15) and cross-product stay link (Phase 15) are independent of each other** — can ship in parallel sub-plans.
- **PWA (Phase 16) and Trophy OS PayFast (Phase 16) are independent** — different teams or sequential.
- **PayFast tokenization is the single critical-path PayFast capability** for v3.1: damage charges (Phase 15), single billing root (Phase 15), Trophy OS subscriptions (Phase 16). All depend on the existing tokenization in `lib/payments/payfast-subscription-api.ts`. Audit this lib's coverage of all three patterns BEFORE Phase 15.

---

## MVP Definition (v3.1 minimum-viable scope)

### Launch With (v3.1 core)

- [ ] **SSO bridge: cross-subdomain (within `*.draggonnb.co.za`)** — gets Swazulu pre-custom-domain working. Cross-domain (`swazulu.com` ↔ `trophy.draggonnb.co.za`) deferred to post-launch unless custom domain is in v3.1 scope.
- [ ] **Conditional Trophy OS sidebar item + reverse direction** — minimum viable cross-product nav.
- [ ] **`approval_requests` table + propose/approve/reject API** — primitive for Phase 15.
- [ ] **Telegram tap-to-approve (damage_charge action_type only)** — covers the Phase 15 damage flow.
- [ ] **`/approvals` queue page (basic list + approve/reject)** — web fallback for missed Telegram.
- [ ] **Damage auto-billing E2E (broken glass → photo → approval → charge → WhatsApp confirmation)** — the headline demo for Swazulu.
- [ ] **Multi-hunter split billing schema + per-hunter PayFast links** — Trophy OS table-stakes for first paying customer.
- [ ] **Cross-product stay link (informational only — Option A: separate billing roots)** — schema + UI link.
- [ ] **Trophy OS PayFast wiring: trial + active + past_due + cancelled state machine + single tier (Starter R599)** — go-live for Trophy OS billing.
- [ ] **PWA: pre-arrival info + check-in details + concierge chat (existing ConciergeAgent) + payment links + service worker for offline pre-arrival cache + install prompt after deposit paid** — core guest portal.

### Add After Validation (v3.1.x)

- [ ] **Cross-domain SSO (token handoff for `swazulu.com`)** — add when Swazulu custom domain goes live.
- [ ] **Telegram approval for additional action_types (rate_change, content_post, quota_change, safari_status_change, supplier_job_approval)** — generalize as need arises.
- [ ] **Bulk-approve from web queue** — once approval volume justifies.
- [ ] **Approval expiry per-action-type configuration** — start with hardcoded defaults, configure once owner asks.
- [ ] **Single billing root option (Option C toggle)** — once owner asks for it.
- [ ] **Per-hunter passport upload + pre-arrival forms** — Trophy OS hunter UX polish.
- [ ] **PWA: photo gallery, post-stay review request, multilingual** — once first guest uses pre-arrival successfully.
- [ ] **Push notifications via Web Push** — once install rate shows ≥30% adoption.
- [ ] **Trophy OS Pro (R1,499) + Premium (R3,499) tier features unlocked** — once Starter is stable.
- [ ] **Annual billing toggle for Trophy OS** — standard SaaS conversion lever.

### Future Consideration (v3.2+)

- [ ] **International multi-currency (Stripe alongside PayFast)** — when international hunter volume justifies.
- [ ] **Native iOS/Android app instead of PWA** — only for loyalty/multi-stay guests (per INTELITY 2026 guidance).
- [ ] **Trophy OS — DraggonnB OS deeper federation (shared CRM contact records, unified marketing campaigns across both products)** — after stay-link is stable.
- [ ] **Multi-account user (single user in 2+ unrelated orgs)** — Slack-pattern; defer until real user demand.
- [ ] **Real SAML/OIDC SSO for enterprise customers** — when DraggonnB sells into chains.
- [ ] **AI-driven damage pricing from photo** — when Claude vision pricing accuracy becomes acceptable AND legal team blesses.
- [ ] **Trophy OS Enterprise tier with negotiated pricing** — when 3+ Premium customers exist.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| SSO bridge cross-subdomain | HIGH | M | **P1** |
| Conditional sidebar item + reverse | HIGH | S | **P1** |
| `approval_requests` core + Telegram tap-to-approve (damage only) | HIGH | M-L | **P1** |
| `/approvals` web queue | MEDIUM | M | **P1** |
| Damage auto-billing E2E | HIGH | L | **P1** |
| Multi-hunter split billing | HIGH | M-L | **P1** |
| Cross-product stay link (informational) | MEDIUM | S | **P1** |
| Trophy OS PayFast wiring (Starter only) | HIGH | L | **P1** |
| PWA core (pre-arrival + check-in + concierge + payment) | HIGH | L-XL | **P1** |
| Cross-domain SSO token handoff | HIGH (when custom domain) | M-L | **P2** |
| Single billing root option | MEDIUM | M | **P2** |
| Trophy OS Pro + Premium tiers | MEDIUM | M | **P2** |
| Approval expiry config + bulk-approve | LOW | S | **P2** |
| PWA push notifications | MEDIUM | M | **P2** |
| PWA multilingual | MEDIUM | M | **P3** |
| Annual billing toggle (Trophy OS) | MEDIUM | S | **P2** |
| Approval delegation | LOW | M | **P3** |
| AI damage pricing from photo | LOW | XL | **P3** (likely never) |
| International currency | LOW (in v3.1) | XL | **P3** |
| Native mobile apps | LOW | XL | **P3** |

**Priority key:**
- **P1**: Must have for v3.1 launch (Swazulu pilot needs it)
- **P2**: Should have, add post-launch when trigger met
- **P3**: Nice to have, deferred indefinitely or to v3.2+

---

## Competitor Feature Analysis

| Feature | Cloudbeds / Mews (PMS) | NightsBridge | HuntDocs / LodgeRunner (hunting SaaS) | Our v3.1 Approach |
|---------|------------------------|--------------|---------------------------------------|-------------------|
| Cross-product SSO | N/A (single product) | N/A | N/A | **Native federation between own products — unique differentiator** |
| Telegram approval | None (email-only approvals) | None | None | **Tap-to-approve via Telegram — unique** |
| Damage auto-billing | Manual incidental charge entry; no photo workflow; some support PayFast tokens | Manual | None | **End-to-end automated: photo → approval → charge → WhatsApp — unique** |
| Multi-hunter split billing | N/A | N/A | HuntDocs has client tracking but billing is invoice-export per outfitter; LodgeRunner per-hunter records | **Per-hunter PayFast tokens + auto-trophy-fee credit on harvest — competitive** |
| Cross-product stay link | N/A | N/A | N/A | **Schema link + cross-product nav — unique to DraggonnB ecosystem** |
| Per-booking PWA | Mews has guest portal; Cloudbeds has booking-engine; INTELITY hospitality PWA exists at high-end hotels | Owner portal only | None | **Per-booking PWA with concierge AI + offline pre-arrival — competitive at SMB tier (incumbents are at enterprise)** |
| Trial-to-paid SaaS billing flow | N/A (sold via direct sales typically) | NightsBridge has tiered SaaS | HuntDocs free trial | **Standard 14-day trial; tier-gated; PayFast (vs Stripe used by HuntDocs) — competitive** |

---

## Quality Gate Checklist

- [x] Categories are clear (table stakes / differentiator / anti-feature) — every feature row labeled
- [x] Complexity noted (S/M/L/XL) — every feature row sized
- [x] Dependencies on existing DraggonnB AND Trophy OS features identified explicitly — see "Existing context" sections in each feature + cross-phase dependency tree
- [x] Anti-features include rationale, not just exclusion — each anti-feature has Why requested / Why not / Alternative
- [x] Patterns referenced from real industry players — Slack, Notion, Atlassian, HubSpot, Mews, Cloudbeds, NightsBridge, HuntDocs, LodgeRunner, Trivago (PWA), INTELITY, Spendflo (approvals), Power Automate (delegation), Booking.com, Expedia, Alpine Ascents, BookYourHunt, Africa Hunt Lodge, Big Game Hunting Adventures

---

## Sources

### SSO / Cross-Product Navigation
- [Atlassian — Designing Atlassian's new navigation](https://www.atlassian.com/blog/design/designing-atlassians-new-navigation) (HIGH confidence; primary source for "same shape sidebar across products" principle)
- [Atlassian — How we built navigation that works for everyone](https://www.atlassian.com/blog/design/how-we-built-a-navigation-that-works-for-everyone) (HIGH)
- [Atlassian — Introducing new navigation announcement](https://www.atlassian.com/blog/announcements/introducing-new-navigation) (HIGH)
- [Slack SAML SSO documentation](https://slack.com/help/articles/203772216-SAML-single-sign-on) (HIGH)
- [Notion SAML SSO documentation](https://www.notion.com/help/saml-sso-configuration) (HIGH)
- [WorkOS — SCIM growth engine behind Slack and Figma](https://workos.com/blog/scim-the-hidden-growth-engine-behind-tools-like-slack-and-figma) (MEDIUM)
- [Webstacks — 7 Tips for Designing a SaaS Navigation Menu](https://www.webstacks.com/blog/saas-navigation-menu) (MEDIUM)
- [Lollypop — SaaS Navigation Menu Design](https://lollypop.design/blog/2025/december/saas-navigation-menu-design/) (MEDIUM)

### Supabase Cross-Domain Auth (CRITICAL — flagged for ARCHITECTURE.md too)
- [Supabase Discussion #5742 — Same session multiple subdomains](https://github.com/orgs/supabase/discussions/5742) (HIGH; verified ongoing limitation)
- [Michele Ong — Share sessions across subdomains with Supabase](https://micheleong.com/blog/share-sessions-subdomains-supabase) (MEDIUM; community workaround)
- [Supabase — Cross-subdomain auth issue forum thread](https://www.answeroverflow.com/m/1391909106838929498) (MEDIUM)
- [Supabase Discussion #3198 — Custom cookie options](https://github.com/orgs/supabase/discussions/3198) (HIGH)
- [Supabase Custom Domains documentation](https://supabase.com/docs/guides/platform/custom-domains) (HIGH)

### Telegram Approval Workflows
- [Telegram Bot API — Buttons / Inline Keyboard](https://core.telegram.org/api/bots/buttons) (HIGH)
- [Telegram Bot Features](https://core.telegram.org/bots/features) (HIGH)
- [n8n Workflow — Telegram inline keyboard with dynamic menus](https://n8n.io/workflows/7664-telegram-bot-inline-keyboard-with-dynamic-menus-and-rating-system/) (MEDIUM)
- [n8n Telegram node Message operations docs](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.telegram/message-operations/) (MEDIUM)

### Approval Workflow Patterns
- [Spendflo — Approval Workflows in 2026 step-by-step guide](https://www.spendflo.com/blog/approval-workflows) (MEDIUM)
- [SAP Signavio — Multi-level approval workflows](https://www.signavio.com/post/multi-level-approval-workflows/) (MEDIUM)
- [Cflow — Parallel pathways and multi-level approvals](https://www.cflowapps.com/parallel-pathways-multi-level-approvals-workflow/) (MEDIUM)
- [Microsoft Power Automate — Sequential modern approvals](https://learn.microsoft.com/en-us/power-automate/sequential-modern-approvals) (HIGH)
- [Kissflow — Approval Process Ultimate Guide 2026](https://kissflow.com/workflow/approval-process/) (MEDIUM)
- [ServiceNow — Flow Designer Approvals overview](https://www.servicenow.com/community/workflow-automation-articles/flow-designer-approvals-overview-workflow-automation-center-of/ta-p/2528202) (MEDIUM)

### Hospitality Damage / Incidentals / Chargebacks
- [Mews — Hotel chargebacks: how they work and how to handle](https://www.mews.com/en/blog/hotel-chargebacks-how-to-handle) (HIGH)
- [Canary Technologies — Best practices for hotels to avoid chargebacks](https://www.canarytechnologies.com/post/best-practices-for-hotels-to-avoid-chargebacks) (HIGH)
- [Minut — How to create a damage charge list](https://www.minut.com/blog/hotel-damage-charges-list) (HIGH; primary source for itemized damage pricing principle)
- [Chargebacks911 — Hotel Chargebacks](https://chargebacks911.com/hotel-chargebacks/) (MEDIUM)
- [Bankrate — Can a hotel charge for damages I didn't cause](https://www.bankrate.com/credit-cards/advice/can-hotels-charge-for-uncaused-damages/) (MEDIUM)
- [Roommaster — Best practices to avoid chargebacks](https://www.roommaster.com/blog/best-practices-for-hotels-to-avoid-chargebacks) (MEDIUM)
- [Hotelogix — How to prevent OTA chargebacks](https://blog.hotelogix.com/hotel-chargebacks/) (MEDIUM)
- [Engine business travel — Manage hotel incidentals](https://engine.com/business-travel-guide/hotel-incidentals) (MEDIUM)
- [Sertifi — Hotel fraud and chargebacks guide](https://corp.sertifi.com/resources/guides/fraud-and-chargeback-guide/) (MEDIUM)
- [Mews — Hotel deposit policies practical guide](https://www.mews.com/en/blog/hotel-deposit) (HIGH)
- [Prostay — Hotel incidentals complete guide](https://www.prostay.com/blog/hotel-incidentals-guide/) (MEDIUM)

### Hunting / Multi-Hunter Group Billing
- [BookYourHunt — Hunting trips marketplace](https://www.bookyourhunt.com/en) (MEDIUM)
- [Africa Hunt Lodge — Hunting Packages](https://africahuntlodge.com/hunting-packages) (MEDIUM)
- [Big Game Hunting Adventures — 2026-2027 SA packages](https://biggamehuntingadventures.com/south-africa-hunting-packages/) (MEDIUM)
- [Kaiwhai Safaris — All-inclusive 2-hunter pricing](https://kaiwhaisafaris.com/hunting-packages/) (MEDIUM)
- [Guidefitter — South Africa hunting outfitters](https://www.guidefitter.com/hunting/south-africa) (MEDIUM)
- [Global Hunting Safaris — about page on group dynamics](https://www.globalhuntingsafaris.com/about.html) (MEDIUM)
- [HuntDocs — Outfitter CRM & Booking Software](https://www.myhuntdocs.com/) (HIGH; direct competitor reference)
- [LodgeRunner — Hunting outfitter software](https://www.lodgerunner.com/hunting-outfitter-software.aspx) (MEDIUM; competitor)

### PWA / Hospitality Guest Portal
- [INTELITY — PWA vs Mobile Apps in Hotel Industry 2026](https://intelity.com/blog/pwa-vs-mobile-apps-hotel-industry-what-hotels-need-to-know-2026/) (HIGH; primary 2026 hospitality PWA reference)
- [QloApps — Advanced PWA hotel reservation system](https://qloapps.com/progressive-web-app/) (MEDIUM)
- [Lite16 — Progressive Web Apps 2026 blog](https://lite16.com/blog/2026/04/15/progressive-web-apps-pwa/) (MEDIUM)
- [Mobiloud — 30 PWAs worth studying in 2026](https://www.mobiloud.com/blog/progressive-web-app-examples) (MEDIUM)
- [Atechnocrat — PWA Development Guide 2026](https://atechnocrat.com/2026/01/31/progressive-web-apps-the-future-of-mobile-first-design-in-2026/) (MEDIUM)
- [TestmuAI — 15 Best PWA examples 2026](https://www.testmuai.com/learning-hub/pwa-examples/) (MEDIUM)
- [OneClick TravelTech — PWA for hotel booking](https://oneclicktraveltech.com/progressive-web-app-for-hotel-booking) (MEDIUM)
- [Netclubbed — Travel & Hospitality PWAs](https://netclubbed.com/blog/travel-hospitality-pwas-booking-experience/) (MEDIUM)

### PayFast / SaaS Tier Gating
- [PayFast — Subscriptions feature page](https://payfast.io/features/subscriptions/) (HIGH)
- [PayFast — Recurring Card Payments via Tokenization](https://payfast.io/features/tokenization/) (HIGH)
- [PayFast — Tokenization payments](https://www.payfast.co.za/ad-hoc-payments/) (HIGH)
- [PayFast — Launching Recurring Billing announcement](https://payfast.io/blog/launching-payfast-recurring-billing/) (HIGH)
- [PayFast — Fees](https://payfast.io/fees/) (HIGH)
- [PayFast — Merchant FAQs](https://payfast.io/faq/merchant-faqs/) (HIGH)
- [DesignRevision — SaaS Feature Flags Implementation Guide 2026](https://designrevision.com/blog/saas-feature-flags-guide) (MEDIUM)
- [Dodo Payments — SaaS Free Trial vs Freemium 2026](https://dodopayments.com/blogs/saas-free-trial-vs-freemium) (MEDIUM)
- [Zenskar — 10 Best SaaS Subscription Management Software 2026](https://www.zenskar.com/blog/saas-subscription-management-solutions) (MEDIUM)
- [Meteroid — SaaS Subscription Management 2026 Modern Guide](https://www.meteroid.com/blog/best-saas-subscription-management-software-in-2026-the-modern-guide) (MEDIUM)
- [The Good — Reduce cancellations during SaaS free trials](https://thegood.com/insights/trial-optimization/) (MEDIUM)

### Existing Codebase References (HIGH confidence — verified in repo)
- `lib/accommodation/telegram/ops-bot.ts` — Telegram inline-keyboard pattern reused for approval spine
- `lib/payments/payfast.ts`, `payfast-adhoc.ts`, `payfast-subscription-api.ts` — PayFast lib reused for damage charges + Trophy OS subscriptions
- `middleware.ts` + `lib/supabase/middleware.ts` — Tenant resolution + auth, basis for SSO bridge
- `app/api/CLAUDE.md`, `lib/agents/CLAUDE.md`, `lib/provisioning/CLAUDE.md` — Existing build specs for extending platform
- `.planning/research/v3.0-archive/FEATURES.md` — v3.0 anti-feature catalog (multi-layered approval workflows, custom AI agent builder explicitly excluded — re-affirmed for v3.1)

---

*Feature research for: DraggonnB OS + Trophy OS v3.1 Operational Spine federation*
*Researched: 2026-04-30*
*Confidence: HIGH (feature patterns); MEDIUM (Supabase cross-domain — verified limitation needing architecture decision)*
