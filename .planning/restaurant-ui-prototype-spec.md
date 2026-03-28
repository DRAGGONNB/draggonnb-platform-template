# Restaurant Module — UI Prototype Spec

> Design reference for all restaurant-facing screens. Each section describes the artifact, its data sources, key interactions, and open questions for the designer.

---

## 1. Staff Login / PIN Screen

**Route:** `/restaurant/login` (or PIN gate overlay)

**Purpose:** Staff authenticate via 4-digit PIN before accessing any restaurant UI. No email/password — staff are not Supabase auth users.

**Layout:**
```
┌─────────────────────────────────┐
│  [DraggonnB Logo]               │
│  Sunset Grill                   │  ← restaurant name
│                                 │
│  Select your name:              │
│  ┌────────┐ ┌────────┐          │
│  │ Chris  │ │ Thandi │  ...     │  ← staff cards (display_name)
│  └────────┘ └────────┘          │
│                                 │
│  ● ● ● ●                        │  ← PIN dots
│  ┌───┬───┬───┐                  │
│  │ 1 │ 2 │ 3 │                  │
│  ├───┼───┼───┤                  │
│  │ 4 │ 5 │ 6 │                  │
│  ├───┼───┼───┤                  │
│  │ 7 │ 8 │ 9 │                  │
│  ├───┼───┼───┤                  │
│  │ ⌫ │ 0 │ ✓ │                  │
│  └───┴───┴───┘                  │
└─────────────────────────────────┘
```

**Data:** `GET /api/restaurant/staff?restaurant_id=xxx` → staff list
**Auth:** POST PIN → SHA-256 hash → compare `pin_hash` in DB → store `{ staffId, role }` in sessionStorage
**States:** idle → name selected → PIN entry → success / shake+clear on fail
**Open questions:**
- PIN timeout duration? (suggest 8h shift)
- Manager override screen for void auth? Same PIN pad, different label

---

## 2. Floor Plan (Table Grid)

**Route:** `/restaurant/tables`

**Purpose:** Live overview of all tables. Color shows status. Tap available → open session. Tap occupied → go to POS.

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Sunset Grill           [●Open ●Bill ○Free]  │
│ ─────────────────────────────────────────── │
│ INDOOR                                      │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │  T1  │ │  T2  │ │  T3  │ │  T4  │        │
│ │Open  │ │Bill  │ │Free  │ │Free  │        │
│ │2 pax │ │Req'd │ │      │ │      │        │
│ │Chris │ │Thandi│ │      │ │      │        │
│ └──────┘ └──────┘ └──────┘ └──────┘        │
│                                             │
│ OUTDOOR                                     │
│ ┌──────┐ ┌──────┐                           │
│ │  T5  │ │  T6  │                           │
│ │Free  │ │Free  │                           │
│ └──────┘ └──────┘                           │
└─────────────────────────────────────────────┘
```

**Colors:**
- Free: `#3A3C40` dark grey
- Open: `#6B1420` burgundy glow
- Bill requested: amber
- Partially paid: blue

**Open Table modal (bottom sheet):**
```
┌────────────────────────────────┐
│ Open Table 3                   │
│                                │
│ Waiter     [Select ▾]          │
│ Party size [  2  ] ▲▼          │
│ Split bill [No][Equal][By item]│
│                                │
│ [Cancel]         [Open Table]  │
└────────────────────────────────┘
```

**Refresh:** 30s polling (badge shows "live" pulse)
**Open questions:**
- Drag-to-reorder tables or fixed grid?
- Show section as swimlane vs tabs at top?

---

## 3. POS — Order Screen

**Route:** `/restaurant/pos/[sessionId]`

**Purpose:** Waiter adds items to the live bill. Real-time bill sidebar updates for all devices on same session.

**Layout (landscape/tablet):**
```
┌─────────────────────────┬──────────────────┐
│ MENU                    │ CURRENT BILL      │
│                         │ Party of 3        │
│ [All][Starters][Mains]  │ ─────────────────│
│    [Cocktails][Desserts]│ 2× Ribs   R259   │
│                         │ 1× Sauvignon R89  │
│ 🔍 Search menu...       │ 1× Cheesecake R59 │
│                         │ ─────────────────│
│ ┌───────┐ ┌───────┐     │ Subtotal    R466  │
│ │Ribs   │ │Wings  │     │ Service (0%)  R0  │
│ │R129.50│ │R89.00 │     │ Total       R466  │
│ └───────┘ └───────┘     │                  │
│ ┌───────┐ ┌───────┐     │ [Request Bill]   │
│ │Salad  │ │Steak  │     │ [Back to Floor]  │
│ │R69.00 │ │R185.00│     │                  │
│ └───────┘ └───────┘     │                  │
└─────────────────────────┴──────────────────┘
```

**Interactions:**
- Tap item → instant POST, bill sidebar updates via Realtime
- Long-press item in bill → void sheet (reason + PIN if >R50)
- `Request Bill` disabled until items exist and session is `open`

**Void item sheet:**
```
┌─────────────────────────────┐
│ Void: Ribs × 1 (R129.50)   │
│                             │
│ Reason: [________________]  │
│                             │
│ Manager PIN required        │
│ ● ● ● ●                     │
│                             │
│ [Cancel]         [Void Item]│
└─────────────────────────────┘
```

**Open questions:**
- Modifiers (e.g. "no onion")? Freetext note on item or structured?
- Kitchen printer integration — out of scope for MVP?
- Course/fire timing? (deferred)

---

## 4. Bill & Payment Screen

**Route:** `/restaurant/pos/[sessionId]` → bill tab, or manager view

**Purpose:** After `Request Bill`, manager finalises: add tip, choose split, send payment links.

**Layout:**
```
┌──────────────────────────────────────┐
│ Table 3 — Bill                       │
│                                      │
│ Items:                               │
│   2× Ribs                    R259.00 │
│   1× Sauvignon Blanc          R89.00 │
│   1× Cheesecake               R59.00 │
│ ─────────────────────────────────── │
│ Subtotal                     R407.00 │
│ Service charge (0%)            R0.00 │
│                                      │
│ Tip:  [10%][12.5%][15%][Custom][Skip]│
│                               R40.70 │
│ ─────────────────────────────────── │
│ TOTAL                        R447.70 │
│                                      │
│ Split: [No split] [Equal 3] [By item]│
│                                      │
│ ── SPLIT BY EQUAL ──                 │
│ Slot 1  R149.23  [Send PayFast link] │
│ Slot 2  R149.23  [Send PayFast link] │
│ Slot 3  R149.24  ✓ PAID              │
│                                      │
│ [Close Table]   [Print Receipt]      │
└──────────────────────────────────────┘
```

**Payment link flow:**
- Tap "Send PayFast link" → copy to clipboard OR WhatsApp deep link
- ITN webhook auto-marks slot paid → badge updates in real-time
- All slots paid → session auto-closes

**Open questions:**
- Print receipt: thermal printer API or just PDF download?
- Cash payment shortcut (bypass PayFast, mark paid manually)?
- Split by item: drag items to payer slots?

---

## 5. LiveTab — Guest Bill View (QR Scan)

**Route:** `/r/[slug]/[qrToken]` (public, no login)

**Purpose:** Guest scans table QR code, sees their live bill update in real-time. Can pay directly.

**Layout (mobile):**
```
┌─────────────────────┐
│ 🍽 Sunset Grill     │
│ Table 3             │
│ ─────────────────── │
│ YOUR BILL           │
│                     │
│ 2× Baby Back Ribs  │
│              R259   │
│ 1× Sauvignon Blanc  │
│               R89   │
│ 1× Cheesecake       │
│               R59   │
│ ─────────────────── │
│ Subtotal      R407  │
│ Tip (10%)      R41  │
│ TOTAL         R448  │
│                     │
│ Split: Slot 2 of 3  │
│ Your share    R149  │
│                     │
│ ╔═══════════════╗   │
│ ║  PAY R149.23  ║   │  ← PayFast button
│ ╚═══════════════╝   │
│                     │
│ ● live updating     │
│ ─────────────────── │
│ 🔒 Secured by       │
│ DraggonnB · POPIA   │
└─────────────────────┘
```

**States:**
- No session open → waiting screen ("Your table is being prepared...")
- Session open, no bill requested → view-only bill (no pay button)
- Bill requested → pay button active
- Paid → green confirmation screen

**Realtime:** Supabase channel `livetab:{sessionId}` updates bill live
**Open questions:**
- Guest name entry for split slot claim?
- WhatsApp receipt option after payment?
- Show other payers' status? ("2 of 3 paid")

---

## 6. Reservations

**Route:** `/restaurant/reservations`

**Purpose:** View and manage upcoming reservations. Add walk-ins. Quick seat action opens a session.

**Layout:**
```
┌──────────────────────────────────────────┐
│ Reservations          [+ Add] [Today ▾]  │
│ ──────────────────────────────────────── │
│ TODAY — Saturday 28 March                │
│                                          │
│ 12:00  Smith × 4     T2  confirmed  [▶]  │
│ 13:30  Dlamini × 6   T5  confirmed  [▶]  │
│ 15:00  Jones × 2     —   pending    [▶]  │
│ 19:00  VIP × 8       Pvt seated    [▶]  │
│                                          │
│ TOMORROW                                 │
│ 18:30  Nkosi × 3     T1  confirmed  [▶]  │
└──────────────────────────────────────────┘
```

**Add reservation sheet:**
```
┌────────────────────────────────────┐
│ New Reservation                    │
│                                    │
│ Name / Contact  [Search CRM...]    │
│ Date            [28 Mar 2026  ▾]   │
│ Time            [19:00        ▾]   │
│ Party size      [     4      ▲▼]   │
│ Table           [Select...    ▾]   │
│ WhatsApp        [+27 ...         ] │
│ Special req.    [________________] │
│ Source          [Phone][WA][Walk-in│
│                                    │
│ [Cancel]              [Save]       │
└────────────────────────────────────┘
```

**Tap [▶] on reservation:** options → Seat Now (open session on assigned table) / Confirm / No-show / Cancel
**Open questions:**
- CRM contact search — link to existing contacts table?
- Deposit collection flow (out of scope MVP)?
- WhatsApp confirmation auto-sent on save?

---

## 7. Temperature Log (R638 HACCP)

**Route:** `/restaurant/compliance/temp-log`

**Purpose:** Staff log equipment temperatures. System auto-flags R638 violations. Critical = Telegram alert.

**Layout:**
```
┌──────────────────────────────────────────┐
│ Temp Log          [+ Log Reading] [Today]│
│ ──────────────────────────────────────── │
│ 08:00  Walk-in Fridge  3.2°C   ✓ OK     │
│ 08:05  Chest Freezer  -18°C   ✓ OK     │
│ 08:10  Hot Hold        58°C   ⚠ WARN   │
│ 14:00  Walk-in Fridge  8.5°C   🔴 CRIT │
│ ──────────────────────────────────────── │
│ SUMMARY: 1 critical, 1 warning today    │
└──────────────────────────────────────────┘
```

**Log reading sheet:**
```
┌───────────────────────────────┐
│ Log Temperature Reading       │
│                               │
│ Equipment  [Walk-in Fridge ▾] │
│ Type       [Fridge ▾]         │
│ Temp (°C)  [        ]         │
│                               │
│ Corrective action             │
│ [Only required if warning/crit│
│                               │
│ [Cancel]         [Log Reading]│
└───────────────────────────────┘
```

**Thresholds shown inline:** fridge ≤5°C ok, 5-8°C warn, >8°C critical
**Open questions:**
- Photo evidence requirement (configurable per equipment)?
- Weekly/monthly compliance export (PDF)?
- Checklist integration — daily temp check as a checklist item?

---

## 8. Daily Briefing / Dashboard

**Route:** `/restaurant` (landing page for restaurant staff)

**Purpose:** At-a-glance shift overview. Loaded on login.

**Layout:**
```
┌────────────────────────────────────────┐
│ Good morning, Chris           Sat 28/3 │
│ Sunset Grill                           │
│ ──────────────────────────────────── │
│ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│ │ 4 Tables │ │ 6 Resvns │ │ R4,280  │ │
│ │   Open   │ │  Today   │ │ Revenue │ │
│ └──────────┘ └──────────┘ └─────────┘ │
│                                        │
│ NEXT RESERVATIONS                      │
│ 13:30  Dlamini × 6   T5               │
│ 15:00  Jones × 2     unassigned       │
│                                        │
│ COMPLIANCE                             │
│ ⚠ Hot hold logged at 58°C — warning  │
│ ✓ Opening checklist complete           │
│                                        │
│ QUICK ACTIONS                          │
│ [Floor Plan] [New Reservation] [Temp]  │
└────────────────────────────────────────┘
```

**Open questions:**
- Revenue shown to all staff or managers only?
- Shift clock-in/out button here?
- N8N daily briefing pushes this data to Telegram at 08:30 (already wired)

---

## Screen Map / Navigation Flow

```
Login (PIN)
    │
    ▼
Dashboard ──────────────────────────────────────────┐
    │                                               │
    ├── Floor Plan ──► [tap occupied] ──► POS       │
    │       │                              │         │
    │       └── [tap free] ──► Open modal ┘         │
    │                                               │
    ├── Reservations ──► [seat] ──► Floor Plan      │
    │                                               │
    ├── Temp Log                                    │
    │                                               │
    └── Checklists                                  │
                                                    │
Guest (QR scan, no login)                           │
    └── /r/[slug]/[qrToken] ──► LiveTab ──► PayFast │
                                              │      │
                                              └──────┘
                                         (ITN webhook closes session)
```

---

## Design Decisions to Make

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | Mobile-first or tablet-first POS? | Both | Tablet for POS, mobile for LiveTab |
| 2 | Staff auth per-shift or persistent? | Per-shift PIN | PIN with 8h expiry in sessionStorage |
| 3 | Cash payment flow | Skip PayFast | "Mark as Cash Paid" button on bill |
| 4 | Kitchen display / printer | Out of scope | Flag for v2 |
| 5 | Tip default | None / 10% | Pre-select 10%, guest can change |
| 6 | Split by item drag UI | Drag or checkbox assign | Checkbox per item per slot (simpler) |
| 7 | WhatsApp receipt | Auto or manual | Manual "Send receipt" button |
| 8 | Compliance report export | PDF / CSV | PDF monthly summary, CSV raw data |

---

## Component Inventory (to build)

| Component | Used in | Status |
|---|---|---|
| `PINPad` | Staff login, void auth | Design needed |
| `StaffCard` | Login screen | Design needed |
| `TableCard` | Floor plan | Built (basic) |
| `OpenSessionModal` | Floor plan | Built (basic) |
| `MenuItemCard` | POS | Built (basic) |
| `CategoryTabBar` | POS | Built (basic) |
| `BillSidebar` | POS | Built (basic) |
| `VoidItemSheet` | POS | Design needed |
| `BillSummaryCard` | Payment screen | Design needed |
| `TipSelector` | Payment screen | Design needed |
| `SplitSlotRow` | Payment screen | Design needed |
| `LiveBillView` | LiveTab (guest) | Built (basic) |
| `WaitingScreen` | LiveTab (guest) | Design needed |
| `ReservationRow` | Reservations | Design needed |
| `AddReservationSheet` | Reservations | Design needed |
| `TempLogRow` | Compliance | Design needed |
| `TempLogSheet` | Compliance | Design needed |
| `DashboardStatCard` | Dashboard | Design needed |
