# Feature Research

**Domain:** All-in-one vertical SaaS for SA SMEs (marketing + vertical ops) with AI-first UX
**Researched:** 2026-04-24
**Confidence:** HIGH (competitor patterns + platform existing state)
**Milestone:** v3.0 "Commercial Launch" — adds 10 new capabilities on existing DraggonnB OS

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels unfinished for a commercial-grade SA SaaS in this category.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Modular per-module pricing with clear line-item invoicing** | HubSpot/Xero norm; SMEs want "pay for what I use" and itemized invoices for SARS | MEDIUM (3-4d) | PayFast cannot add multiple subscriptions in one transaction — must create N subscription tokens or roll into single variable-amount subscription. See PITFALLS.md |
| **Transparent pricing page with all add-ons visible** | Xero/HubSpot criticized for hidden costs; SA buyers are price-sensitive and POPI-aware | LOW (1-2d) | Depends on new interactive module picker (capability #4) |
| **Setup fee / one-time charge alongside recurring** | Standard SA consulting model; signals "real service vs free trial trap" | LOW (1d) | PayFast: use ad-hoc + subscription token combo |
| **VAT-inclusive and VAT-exclusive displays on invoices** | SARS vendor registration requires VAT number + split on invoices | LOW (1d) | Already partially in place in PayFast flow; needs pricing page exposure |
| **Guided onboarding with measurable progress (checklist / % complete)** | Notion/Linear/Webflow set this as baseline for 2026 SaaS; 60%+ of new users abandon without guidance | MEDIUM (3-5d) | 3-day automated flow (capability #10). Checklist pattern, not modal tour |
| **First-value moment in <5 minutes (Activate phase)** | 2026 best practice: "Activate (1-5 min)" → first value; "Reinforce (1-7d)" → habits | MEDIUM (built into 3-day flow) | Linear teaches Cmd+K, Loom gets recording, Notion picks use case — ours should generate 1 post/email in under 3 min |
| **Role-based dashboards (owner vs staff vs admin)** | Multi-tenant, multi-user norm; staff shouldn't see owner financials | LOW (1-2d; partially done) | `organization_users.role` already exists; extend to module-level views |
| **Payment on file for recurring (tokenization)** | PayFast tokenization is standard for all SA SaaS subscriptions | DONE | Already implemented for R1,500/R3,500/R7,500 tiers — needs re-wiring for modular billing |
| **Invoice history + downloadable PDF** | SARS audit readiness; accountants require PDF invoices for filing | LOW (2d) | Likely partial — needs verification against existing billing tables |
| **Usage dashboard showing current-period consumption vs cap** | Usage-based SaaS norm; transparency reduces billing disputes | MEDIUM (3d) | Capability #7. Real-time spend/usage totals reduce dispute volume substantially |
| **Usage alerts (80% / 100% threshold emails)** | Standard SaaS UX; prevents bill-shock churn | LOW (1-2d) | Hook into existing email send infra (Resend) |
| **Owner payout statement (for lodges with off-site owners)** | NightsBridge and PMS norm for multi-owner lodges in SA | MEDIUM (4-5d) | Capability #8. Monthly PDF showing nights booked, gross, commission, levy, net-to-owner |
| **Tax-ready export (CSV/Excel for accountant hand-off)** | SA SME accountants work in Excel; Xero/Sage export is table stakes | LOW-MEDIUM (2-3d) | Per-module: bookings ledger, F&B sales, expense ledger, VAT breakdown |
| **VAT201 data export** | Every accounting-touching SA SaaS provides this (Xero, Sage, Zoho) | MEDIUM (3d) | Standard output rate / input rate / zero-rated split matching SARS VAT201 boxes |
| **Tips/gratuities segregation from revenue** | SA restaurant standard; SARS Interpretation Note 76 — tips held in trust, not employer revenue | LOW (1-2d) | Already partially modelled in restaurant POS; needs explicit tip-ledger + staff allocation |
| **TOMSA 1% levy line on accommodation invoices** | Tourism levy is voluntary but ~all pro lodges collect; monthly remittance by 15th | LOW (2d) | Calculate 1% of accommodation tariff excl VAT; append to invoice; monthly report |
| **Receipt upload via photo (mobile/Telegram)** | Dext/Hubdoc set expectation; SA SME bookkeeping reality | MEDIUM (4-5d) | Capability #9. Telegram entry point already exists (ops bot) — extend |
| **Brand settings (logo, colors) applied across outputs** | Every SaaS does this; emails, invoices, guest portal | LOW (2d) | Partially done; needs coverage audit |
| **Email deliverability basics (DKIM/SPF guidance)** | Resend handles most; UX must guide owner through DNS at provisioning | LOW (1d) | Likely partial; verify |
| **POPI-compliant data handling** | Legal requirement in SA; SaaS competitors all claim compliance | DONE-ISH | RLS + consent tracking exists; needs documented Privacy Policy surface |
| **ZAR-only pricing displayed (no "$" confusion)** | SA buyers want local; switching between currencies adds cognitive load | DONE | Platform is ZAR-first |
| **Monthly or annual billing option** | SaaS norm; annual = commitment discount | LOW (1-2d) | Currently monthly; add annual toggle with 10-15% discount (typical) |

### Differentiators (Competitive Advantage)

Features that set DraggonnB apart given existing architecture (already has: accommodation + restaurant + CRM + email + social + AI agents + multi-tenant).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Easy View as default, Advanced behind a link (per-page)** | Holo/Jasper give power without simplicity; Linear gives simplicity without verticals — we give both. Every module lands on AI-curated action cards, one-tap approve. Advanced is present but hidden. | HIGH (8-12d across modules) | Capability #2 + #3. Shared `<ModuleHome>` component. Persistence: `tenant_modules.config.{module}.preferred_view`. Role-based default (owner=Easy, staff=Advanced) |
| **Campaign Studio: intent → Haiku → 5 posts + 1 email + 1 landing page → approve → schedule** | Holo generates assets but doesn't orchestrate multi-channel scheduling; Buffer/Hootsuite schedule but don't generate. We do both in one flow. | HIGH (10-15d) | Capability #6. The Holo AI competitor. Reuses existing email sequencer + social publisher + new landing page builder. Haiku for speed, Sonnet for final polish if approved |
| **Brand voice captured once, injected into every AI call via prompt cache** | Jasper does brand voice but per-doc; we wire it into every agent (Quoter, Reviewer, Campaign, Email) transparently. 90% cost reduction via Anthropic prompt caching on the voice block. | MEDIUM (4-6d) | Capability #5. 3-step wizard (URL ingest + 5 questions + avoid-list). Stored in `tenant_modules.config.brand_voice`. Injected as cacheable system-prompt prefix |
| **Vertical-specific AI agents pre-wired to brand voice** | Jasper is horizontal; NightsBridge has no AI; Lightspeed POS has no marketing AI. We have Quoter (accom), Concierge (accom), Reviewer (accom), Pricer (accom) + new Campaign/Email AI — all voice-aware. | MEDIUM (4-6d integration) | Existing 6 agents + 1-2 new ones. Key: retrofit existing agents to consume brand voice block |
| **Embedded finance specifically tuned for SA tourism + F&B** | Xero/Sage are generic; NightsBridge is ops-only. We bundle VAT201 prep, TOMSA levy, tips segregation, SARS day-end, owner-payout — all without leaving the ops flow. | HIGH (10-15d) | Capability #8. VDJ accounting knowledge productized. Biggest lock-in moat vs generic competitors |
| **SARS-friendly "day-end" that generates VAT-ready summary + accountant email** | No SA vertical SaaS does auto-reconciliation + accountant hand-off in one click | MEDIUM (4-5d) | Day-end button → calculates sales/VAT/tips/TOMSA → emails PDF to accountant → files in "Accountant Pack" folder |
| **Telegram receipt OCR feeding expense ledger** | Dext/Hubdoc cost R200-400/user/mo extra; we bundle. Telegram is zero-friction for SA owners. | MEDIUM (5-7d) | Capability #9. Photo → Claude vision → extract vendor/amount/VAT/date → suggest SARS expense code → approve. Benchmark: 82-95% field accuracy (Dext level) achievable with Claude vision |
| **"Fills lodge in 3 days" outcome-led hero + interactive module picker** | SA SaaS sites list features; we lead with outcomes. Module picker recalculates price live. | LOW-MEDIUM (3-5d) | Capability #4. Conversion-focused redesign. Live price calculator with add-ons |
| **3-day automated onboarding (provision → voice → first campaign → live)** | SA SMEs abandon SaaS at 60%+ without human hand-holding; this automates it | MEDIUM (5-7d) | Capability #10. Day 0: email + account + Easy View. Day 1: brand voice wizard + kickoff call booking. Day 2: first campaign shipped. Day 3: go-live checklist |
| **Brand voice from URL ingest (no form fatigue)** | Holo's "Brand DNA" proves this works; Jasper requires upload text/files. URL + 5 strategic questions = less friction | MEDIUM (3-4d) | Fetch site, Claude extracts tone/positioning/audience/differentiators, confirms with owner. Add avoid-list + 5 samples |
| **Cost monitoring dashboard shows AI spend per capability** | Holo/Jasper opaque on AI cost; we expose "Email AI: R47 this month / R200 cap." Trust builder. | MEDIUM (3-4d) | Capability #7. Per-module + per-agent usage. Alerts at 80%/100%. |
| **One invoice covers all add-ons (not N PayFast charges)** | Stacked charges from Xero/Sage frustrate SMEs; our modular price = single monthly invoice | MEDIUM (4d) | Variable-amount subscription token, recalculated on module change. See PITFALLS.md |
| **White-label for agencies/resellers (add-on)** | Agencies struggle to resell AI tools as their own; white-label opens reseller channel | MEDIUM (5-7d) | R499 add-on. Custom domain, logo, "Powered by" removal. Leverages existing wildcard subdomain infra |
| **Events add-on for restaurants (R299)** | LightSpeed and Yoco don't orchestrate events; SA restaurants run events constantly | LOW-MEDIUM (3-5d) | Extends restaurant module: booking form, deposit via PayFast, guest list, event invoice |
| **Finance-AI add-on (R399): Telegram OCR + SARS categorization + export** | Standalone Dext equivalent is ~R300/user; bundled and vertical-aware is better value | MEDIUM (5-7d) | Capability #9. Wraps OCR + SARS expense codes + monthly ledger export |

### Anti-Features (Commonly Requested, Often Problematic)

Features we deliberately DO NOT build. Vertical focus means saying no.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full double-entry accounting** | "Replace Xero entirely" | 5+ years of work; competes with Xero where we can't win; Xero has 10K+ integrations we'd have to rebuild | Be the "pre-accounting operations layer"; export to Xero/Sage via CSV or API connector |
| **Generic AI content writer (blog posts, long-form)** | "Why not just add blog generation?" | Competes with Jasper/Copy.ai; long-form is Jasper's loss leader (they're moving to marketing agents); dilutes vertical focus | Brand voice + campaign-level generation is scoped to marketing assets (short-form). If users want blogs, they can prompt Claude directly |
| **Custom AI agent builder (user-defined agents)** | "HubSpot has agents, we should too" | Needs agent SDK, eval framework, safety rails, version control — massive undertaking; usage is low | Ship 6-8 pre-built vertical agents. Revisit when 20+ clients, per existing CLAUDE.md guidance |
| **Multi-layered approval workflows (3-tier like Hootsuite)** | "Enterprise wants governance" | Target is SME owner-operators, not agencies; adds state machine complexity | Single-level approve/reject is enough for owner-operator. White-label tier can defer proper workflows to Phase 4+ |
| **CRM enrichment (Clearbit/ZoomInfo style data append)** | HubSpot has this | Expensive data contracts, not vertical-relevant for lodges/restaurants | Use module-native enrichment: accommodation enriches via guest history, restaurant via POS history |
| **Unlimited contacts marketing (HubSpot-style)** | "Don't limit my list" | Creates "sticker shock" HubSpot failure mode; cost-to-serve scales with list size | Published overage pricing (e.g., "R0.05/email over 10K"). Transparent caps, clear overage. |
| **Full channel manager (compete with SiteMinder/NightsBridge)** | "One tool to rule them all" | Channel connectors are a multi-year integration battle; NightsBridge has 20-year lead | Existing accommodation module has channel-sync stubs; keep as outbound-only iCal + partner integrations. Don't try to be a distribution platform |
| **Real-time inventory sync with 100+ OTAs** | Hotels want Booking.com + Expedia + Airbnb live | NightsBridge sells this for R195-R800/mo; our buyer is Plett guesthouse owner who manages 2-3 channels manually | iCal two-way + Airbnb API + Booking.com via NightsBridge partnership is enough for SMB segment |
| **"Kitchen sink" free tier (HubSpot Free)** | "Give it away, upsell" | HubSpot Free has 8K marketing contacts; bleeds money; creates support load from non-payers | 14-day trial with payment-method-on-file. SA market is comfortable with this pattern (DStv, Netflix) |
| **Advanced reporting builder (drag-drop dashboards)** | "Tableau-like flexibility" | Enterprise feature, high effort, low SMB usage | Pre-built dashboards per vertical + CSV export. If they need Tableau, they can BI on exported data |
| **In-app chat support (Intercom widget)** | "Users want live help" | 24/7 staffing cost; SA SMEs prefer WhatsApp/phone; Intercom is R3-5K/mo itself | WhatsApp/Telegram support channel + in-app knowledge base + AI chatbot for tier 1 |
| **Fully customizable email template builder (Mailchimp-level)** | "My brand is unique" | Brand-voice + AI-generated templates replace the need; custom builder adds complexity | Voice-driven templates + 6-8 vertical layouts + brand colors/logo inserts. If they need full design, they use Canva |
| **Self-serve SQL / data warehouse access** | "We want to analyze our data" | Multi-tenant security nightmare; exposes other tenants' schema | CSV export + monthly scheduled reports. Enterprise tier much later may offer read-replica access |
| **Custom domain per subdomain (beyond white-label)** | "Put DraggonnB on our main domain" | DNS + SSL + middleware rewrite complexity; white-label add-on is enough | White-label add-on = `*.clientdomain.co.za`. Main-domain integration = "we're not a web host, use the integration" |
| **Mobile apps (iOS + Android native)** | "My staff want an app" | App store politics + 2-3x dev cost; PWA covers 95% | Mobile-responsive web + PWA install prompt. Telegram bot handles field ops (already built) |
| **Deep social listening / sentiment (Sprout Social style)** | "What are people saying about us?" | Expensive data licensing; SA SMEs with <1K followers don't need enterprise listening | Keep existing social publishing; add basic review monitoring (Google Business + TripAdvisor) as future capability |
| **Video generation** | "Everyone wants video" per Holo roadmap | Video AI is still immature (Holo's own weak spot); GPU costs are high | Partner with Descript/Synthesia if demand proves; image + copy is enough for launch |
| **"Unlimited" AI generation (Holo's claim)** | Unlimited = differentiator | Creates abuse risk; cost-to-serve spikes; forces loss-leader pricing | Published caps (e.g., 500 AI generations/mo Core tier) + transparent overage pricing. Honest beats "unlimited*" |

---

## Feature Dependencies

```
Modular Pricing (#1)
    ├──requires──> Module Registry (EXISTS)
    ├──requires──> Tenant Modules Table (EXISTS)
    └──requires──> PayFast variable-amount subscription rewrite (NEW)

Interactive Module Picker (#4)
    └──requires──> Modular Pricing (#1)

Brand Voice Capture (#5)
    ├──requires──> Onboarding Flow (#10)
    └──enhances──> Campaign Studio (#6)
    └──enhances──> All 6 existing AI agents (Quoter, Concierge, Reviewer, Pricer, LeadQualifier, ProposalGen)

Easy/Advanced Toggle (#2) + Shared ModuleHome (#3)
    ├──requires──> <ModuleHome> shared component
    └──enhances──> Every module page (Campaigns, Email, CRM, Accom, Restaurant, Finance)

Campaign Studio (#6)
    ├──requires──> Brand Voice (#5)
    ├──requires──> Existing Email Sequencer
    ├──requires──> Existing Social Publisher
    └──requires──> NEW: Landing Page Builder (minimum viable)

Usage Caps + Overage (#7)
    ├──requires──> Usage tracking table (may exist — verify)
    ├──requires──> Modular Pricing (#1) for cap-per-module
    └──requires──> Cost monitoring dashboard

Embedded Finance (#8)
    ├──requires──> Existing PayFast + invoice infra (EXISTS)
    ├──requires──> VAT201 mapping rules
    ├──requires──> TOMSA levy config (accom only)
    └──enhances──> Owner Payout Statement

Finance-AI Add-On (#9)
    ├──requires──> Existing Telegram bot integration (EXISTS)
    ├──requires──> Claude vision API integration (NEW)
    └──enhances──> Embedded Finance (#8)

3-Day Onboarding (#10)
    ├──requires──> Existing provisioning saga (EXISTS)
    ├──requires──> Brand Voice (#5)
    ├──requires──> Campaign Studio (#6)
    └──requires──> Email sequence (EXISTS — just configure)

White-Label Add-On
    └──requires──> Existing wildcard subdomain infra (EXISTS)
    └──requires──> Modular Pricing (#1)
```

### Dependency Notes

- **Modular Pricing blocks Interactive Module Picker:** Can't show live price calculator without the pricing model first
- **Brand Voice blocks Campaign Studio full value:** Campaign Studio can ship with generic voice, but differentiator evaporates. Sequence Voice → Campaign
- **Easy/Advanced + ModuleHome are siblings:** Build shared component once, apply across all 6 module pages
- **Usage Caps needs Modular Pricing:** Caps are per-module, so module abstraction must exist first
- **Onboarding integrates everything:** Do this last in the phase sequence — it ties the ribbon around Voice + Campaign + provisioning
- **Finance-AI enhances Embedded Finance:** Don't try to build OCR before the ledger/VAT infrastructure exists

---

## MVP Definition

### Launch With (v3.0 MVP)

Minimum to claim "Commercial Launch" and convert SA SMEs at the new R599 Core + R1,199 vertical price point.

- [ ] **Modular pricing on PayFast (variable-amount subscription + setup fee)** — without this, new pricing doesn't exist
- [ ] **Interactive module picker on pricing page with live ZAR calculation** — conversion is the whole point
- [ ] **Site redesign: outcome-led hero + "fills lodge in 3 days" messaging** — positioning
- [ ] **Brand voice capture wizard (URL ingest + 5 questions + avoid-list)** — foundation for voice moat
- [ ] **Brand voice injected into 6 existing AI agents via prompt cache** — immediate value
- [ ] **Campaign Studio v1: intent → 5 posts + 1 email → approve → schedule** — the Holo killer. Landing page generation can defer to v3.1
- [ ] **Shared `<ModuleHome>` + Easy View on Campaigns and one vertical (Accommodation or Restaurant)** — prove the pattern on the two highest-traffic modules
- [ ] **Usage caps enforcement + 80%/100% alerts + basic cost dashboard** — trust and cost control
- [ ] **Embedded Finance v1: VAT201 export + TOMSA levy calc + tips segregation on invoices** — vertical moat
- [ ] **SARS-friendly day-end button (restaurants) + owner payout PDF (accom)** — lock-in
- [ ] **3-day onboarding sequence (emails + checklist, manual fallback for kickoff call)** — activation
- [ ] **Updated pricing + billing migration for existing tenants (grandfather vs migrate)** — don't break existing customers

### Add After Validation (v3.1)

Add once v3.0 shows conversion lift and at least 3 new clients on new pricing.

- [ ] **Finance-AI add-on (Telegram OCR + SARS categorization)** — trigger: 5+ clients asking for it
- [ ] **Easy View on remaining modules (Email, CRM, Social, Content Studio)** — trigger: ModuleHome component is stable
- [ ] **Events add-on for restaurants** — trigger: restaurant module has 5+ clients running events
- [ ] **White-label add-on** — trigger: first agency/reseller conversation
- [ ] **Landing page builder inside Campaign Studio** — trigger: Campaign Studio validated, users asking
- [ ] **Annual billing option (10-15% discount)** — trigger: CAC > LTV signal, need cash-flow smoothing
- [ ] **Accountant email hand-off (monthly auto-send of tax pack)** — trigger: 3+ clients ask "can you email my bookkeeper?"

### Future Consideration (v4+)

Defer until product-market fit on v3.0 is clear.

- [ ] **Custom AI agent builder** — defer until 20+ clients per existing CLAUDE.md mandate
- [ ] **Full review monitoring (TripAdvisor/Google)** — defer; partner first via webhooks
- [ ] **Self-serve data warehouse / SQL export** — defer; CSV + scheduled reports covers SMB
- [ ] **Mobile native apps** — defer; PWA is enough
- [ ] **Integrated video generation** — defer until Sora/Runway API pricing makes sense
- [ ] **Advanced 3-tier approval workflows** — defer until white-label agencies demand it
- [ ] **Enterprise tier (multi-location, SSO, audit logs)** — defer until SMB segment saturated

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Modular pricing + PayFast rewrite | HIGH | MEDIUM | P1 |
| Interactive module picker + site redesign | HIGH | MEDIUM | P1 |
| Brand voice capture wizard | HIGH | MEDIUM | P1 |
| Brand voice injection (existing agents) | HIGH | LOW | P1 |
| Campaign Studio v1 (no landing page) | HIGH | HIGH | P1 |
| Shared ModuleHome + Easy View (2 modules) | HIGH | HIGH | P1 |
| Usage caps + alerts + cost dashboard | HIGH | MEDIUM | P1 |
| VAT201 + TOMSA + tips segregation | HIGH | MEDIUM | P1 |
| Day-end + owner payout PDF | HIGH | MEDIUM | P1 |
| 3-day onboarding sequence | HIGH | MEDIUM | P1 |
| Billing migration for existing tenants | HIGH | MEDIUM | P1 |
| Finance-AI (Telegram OCR) | MEDIUM | MEDIUM | P2 |
| Easy View rollout to remaining modules | MEDIUM | MEDIUM | P2 |
| Events add-on (restaurants) | MEDIUM | LOW | P2 |
| White-label add-on | MEDIUM | MEDIUM | P2 |
| Landing page builder | MEDIUM | HIGH | P2 |
| Annual billing | MEDIUM | LOW | P2 |
| Accountant email hand-off | MEDIUM | LOW | P2 |
| Custom AI agents | LOW (now) | HIGH | P3 |
| Review monitoring | LOW | MEDIUM | P3 |
| Video generation | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v3.0 launch
- P2: Should have, add post-launch based on signal
- P3: Nice to have, future consideration (often anti-feature territory)

---

## Competitor Feature Analysis

| Feature | Holo AI | HubSpot | Xero | NightsBridge | Lightspeed | Our Approach |
|---------|---------|---------|------|--------------|------------|--------------|
| **Brand voice** | Brand DNA from URL | Content Hub brand voice (per-asset) | N/A | N/A | N/A | URL ingest + 5 Qs + avoid-list, **injected into every AI call via prompt cache** |
| **Modular pricing** | Flat $19-39 | 7 Hubs × 3 tiers (confusing, expensive) | 3 plans + many add-ons | Monthly update fee per hotel | Tier-based | R599 Core + R1,199 vertical + named add-ons with single invoice |
| **Easy/Advanced mode** | Simple only | Hub-specific complexity | Full accounting (Advanced by default) | Full PMS (Advanced) | Full POS (Advanced) | **Easy first on every page, Advanced via link; role-based default** |
| **Campaign orchestration** | Generates, no schedule | Yes, workflows + approve | N/A | N/A | N/A | Intent → multi-channel draft → approve → auto-schedule |
| **Receipt OCR** | N/A | N/A (partner) | Hubdoc (65-90% accuracy) | N/A | N/A | Claude vision via Telegram (target: Dext-level 82-95%) |
| **VAT/Tax compliance** | N/A | Generic | VAT201-ready | N/A (ops only) | Generic POS tax | **SA-specific: VAT201 + TOMSA + tips + SARS day-end** |
| **Onboarding** | Self-serve | Requires $3K-$7K onboarding consultant | Self-serve | Self-serve + BridgeIT support | Self-serve | 3-day automated + kickoff call |
| **AI agent coverage** | Content gen only | HubSpot Breeze (horizontal) | Ask Xero (generic) | None | None | 6 vertical agents (Quoter, Concierge, Reviewer, Pricer, Lead, Proposal) + Campaign AI |
| **Multi-tenant architecture** | B2C/B2B | B2C | B2C | B2C | B2C | **B2C + multi-tenant white-label** |
| **SA market fit** | USD pricing | USD pricing, no PayFast | ZAR, generic | ZAR, lodge-only | ZAR, F&B-only | ZAR, PayFast, POPI, SA-specific compliance |
| **Usage transparency** | "Unlimited" (abuse risk) | Contact tiers cause sticker shock | Clear but complex | Per-hotel fee | Per-location | **Published caps + per-module usage dashboard + overage pricing** |
| **Approval workflows** | Draft only | Multi-tier (enterprise) | N/A | N/A | N/A | Single-level approve/reject (suits owner-operators) |

---

## Cross-Cutting Complexity Summary

Rough effort estimate for v3.0 P1 scope (day = 1 dev-day of focused work):

| Capability | Estimate |
|------------|----------|
| 1. Modular pricing + PayFast rewrite + setup fee + migration | 8-10d |
| 2. Easy/Advanced toggle + shared ModuleHome | 8-12d |
| 3. Shared ModuleHome applied to 2 modules | (bundled with #2) |
| 4. Site redesign + interactive module picker | 5-7d |
| 5. Brand voice capture + injection across 6 agents | 7-10d |
| 6. Campaign Studio v1 (no landing page) | 10-15d |
| 7. Usage caps + alerts + cost dashboard | 5-7d |
| 8. Embedded finance (VAT201 + TOMSA + tips + day-end + owner payout) | 10-15d |
| 9. Finance-AI (Telegram OCR) — P2, deferred | (5-7d when triggered) |
| 10. 3-day onboarding sequence | 5-7d |
| Testing + polish + error catalogue pattern fixes | 5-7d |
| **Total v3.0 P1** | **~63-90 dev-days (~12-18 weeks solo / ~6-9 weeks with 2 devs)** |

---

## Sources

### Competitor / Pattern Research
- [HubSpot Pricing 2026 - Engagebay](https://www.engagebay.com/blog/hubspot-pricing/) — modular stacking gotchas, contact-pricing sticker shock, onboarding fees
- [HubSpot Pricing Guide - Encharge](https://encharge.io/hubspot-pricing/) — seat-based changes, Enterprise feature lock-in
- [Xero Pricing 2026 - SaasWorthy](https://www.saasworthy.com/blog/xero-pricing-plans) — add-on pricing model (Payroll, Projects, Expenses)
- [Holo AI Review 2026 - Max Productive](https://max-productive.ai/ai-tools/holo/) — Brand DNA mechanics, unlimited generation, $19-39 pricing
- [Holo practical test - BloggerPilot](https://bloggerpilot.com/en/holo-im-praxistest/) — brand ingestion nuances
- [Jasper Brand Voice](https://www.jasper.ai/brand-voice) — upload-based voice capture pattern
- [Jasper Brand Voice Help](https://help.jasper.ai/hc/en-us/articles/18618693085339-Brand-Voice) — style guide + past content ingestion
- [Hootsuite vs Buffer 2026 - Planable](https://planable.io/blog/hootsuite-vs-buffer/) — approval workflow tiers, campaign grouping
- [OwlyWriter vs Buffer AI vs Sprout - GenesysGrowth](https://genesysgrowth.com/blog/hootsuite-owlywriter-vs-buffer-ai-vs-sprout-social-ai) — AI scheduling differentiation
- [SaaS UI Design Trends 2026 - SaaSUI](https://www.saasui.design/blog/7-saas-ui-design-trends-2026) — Linear's progressive disclosure as 2026 gold standard
- [Nielsen Norman Group on Modes](https://www.nngroup.com/articles/modes/) — when dual-mode UX helps vs hurts

### SA Compliance
- [TOMSA Levy FAQ](https://tomsa.co.za/levy-faq/) — 1% voluntary, monthly by 15th, 93%/7% split
- [TOMSA Fact Sheet](https://tomsa.co.za/wp-content/uploads/2020/11/TOMSA_Fact_Sheet.pdf) — collection mechanics for accommodation
- [SARS VAT201 Guide](https://www.sars.gov.za/guide-to-completing-the-value-added-tax-vat201-return/) — return box structure
- [SARS Tax Calendar 2026 - MC Accounting](https://www.mcaccountingandtax.co.za/accounting-tax-insights/south-africa-tax-compliance-calendar-2026) — VAT201 by 25th (last biz day via eFiling), R2.3m threshold change April 2026
- [SARS Interpretation Note 76 — Tax Treatment of Tips](https://www.sars.gov.za/wp-content/uploads/Legal/Notes/LAPD-IntR-IN-2014-01-IN76-Tax-Treatment-of-Tips-for-Recipients-Employers-Patrons.pdf) — employer NOT employer-for-PAYE on tips; trust relationship
- [RSM on Tips Taxation](https://www.rsm.global/southafrica/news/taxation-treatment-tips) — waitron declares on annual return

### Receipt OCR
- [OCR Accuracy Comparison 2026 - Zerentry](https://zerentry.com/blog/ocr-accuracy-comparison-2026) — Dext 82-95%, Hubdoc 65-90%
- [Dext vs Hubdoc - Plyo Bookkeeping](https://plyobookkeeping.com/dext-vs-hubdoc-an-ocr-software-review/) — UX comparison, categorization mechanics
- [Dext Review 2026 - FahimAI](https://www.fahimai.com/dext) — 80% auto-categorization after 2 weeks training

### Onboarding Patterns
- [SaaS Onboarding UX Guide - Themasterly](https://www.themasterly.com/blog/saas-onboarding-ux-guide) — 3-phase Activate/Reinforce framework
- [SaaS Onboarding 2026 Flows - SaaSUI](https://www.saasui.design/blog/saas-onboarding-flows-that-actually-convert-2026) — Linear/Loom/Notion teardowns, AI-contextual guidance
- [Webflow developer onboarding](https://www.saasui.design/blog/saas-onboarding-flows-that-actually-convert-2026) — complete workspace strategy

### Payments + Billing
- [PayFast Subscriptions](https://payfast.io/features/subscriptions/) — tokenization, scheduled charges
- [PayFast Tokenization](https://payfast.io/features/tokenization/) — recurring card payments
- [PayFast FAQs](https://payfast.io/faq/merchant-faqs/) — multi-subscription transaction limitation (critical gotcha)
- [SaaS Usage-Based Billing 2026 - SchematicHQ](https://schematichq.com/blog/metered-billing-software) — cap/alert patterns
- [Usage-Based Pricing - Stripe](https://stripe.com/resources/more/usage-based-pricing-for-saas-how-to-make-the-most-of-this-pricing-model) — transparency builds trust, reduces disputes
- [Anthropic Prompt Caching Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — 90% cost reduction on cache hits; 5-min/1-hour cache durations
- [Anthropic Automatic Prompt Caching - Medium](https://medium.com/ai-software-engineer/anthropic-just-fixed-the-biggest-hidden-cost-in-ai-agents-using-automatic-prompt-caching-9d47c95903c5) — system prompt caching patterns

### SA Hospitality SaaS
- [NightsBridge Pricing](https://site.nightsbridge.com/pricing/) — R45/mo per hotel ex VAT; no setup; no commission
- [NightsBridge Capterra 2025](https://www.capterra.co.za/software/191455/nightsbridge) — feature coverage of incumbent
- [Hotel Tech Report on NightsBridge](https://hoteltechreport.com/revenue-management/channel-managers/nightsbridge) — channel management depth

---
*Feature research for: DraggonnB OS v3.0 "Commercial Launch" — modular SME SaaS with AI-first UX, SA vertical focus*
*Researched: 2026-04-24*
