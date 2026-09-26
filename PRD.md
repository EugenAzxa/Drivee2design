# Drivee — Product Requirements Document
**Version 3.0 | March 2026**
*Fully aligned with toticket.replit.app — rebuilt from scratch in React + Vite + TypeScript*

---

## 1. Objective

**What is Drivee and why does it exist?**

Drivee is a mobile-first progressive web app (PWA) for Toronto drivers that turns the stressful, confusing experience of receiving a parking or traffic fine into a fast, guided resolution. Most drivers either overpay fines they could dispute, or miss deadlines and face escalating penalties — simply because they don't know their options or can't navigate the fragmented city systems.

Drivee solves this by combining AI ticket scanning, deadline management, legal guidance, enforcement avoidance, and direct city service links into one clean, dark-mode app — installable on any phone, no app store required.

**Target User:** Toronto drivers aged 18–50 who park regularly in the city and occasionally receive fines. They are time-poor, not legally trained, and frustrated by the complexity of dealing with tickets alone.

**Core Value Proposition:** From ticket in hand to clear action in under 60 seconds.

**Why Drivee wins over googling it:**
- One place for everything Toronto-parking related
- AI reads your ticket and writes your dispute letter
- Proactive — warns you before you get a ticket, not just after
- Human — not a government website

---

## 2. App Structure — The 5 Tabs

Fixed bottom navigation bar. Every feature lives in exactly one tab. Navigation height: 90px, blur backdrop, 0.5px separator line.

| # | Tab | Icon | Purpose |
|---|---|---|---|
| 1 | **Dashboard** | Home | Ticket manager, AI scanner, deadlines, ROI calculator, profile |
| 2 | **Services** | Grid | City portals, dispute scripts, street checker, tow finder, US links |
| 3 | **Hotspots** | Map pin | Live enforcement map, GPS Guardian, community reports |
| 4 | **Legal** | Scale | AI ticket analyser, 4-verdict system, lawyer directory |
| 5 | **Guide** | Book | 8-step onboarding, quick tips, get started CTA |

---

## 3. Must-Have Features

---

### TAB 1 — Dashboard

#### 3.1 Profile Management
- Text inputs: **Full Name**, **License Plate**
- Save button: persists to IndexedDB, shows confirmation toast on save
- Plate number used to auto-populate OCR results and reminder forms
- Single plate for MVP (multi-plate in V2)

#### 3.2 24-Hour Deadline Alerts
- Browser Notification API — requires explicit permission grant
- Toggle button with `Active` state indicator when enabled
- Triggers at 24 hours before any fee escalation threshold
- Alert copy example: *"Your $65 parking fine on King St is due tomorrow. Pay now or it becomes $100."*
- **Fallback if permission denied:** in-app countdown timer shown on ticket card instead

#### 3.3 AI Ticket Scanner
- Camera capture or file upload of physical ticket photo
- **OCR engine:** Tesseract.js (client-side — no data leaves the device)
- Pattern matching tuned for Ontario plates: format `ABCD 123` (4 letters + 3 digits)
- Date extraction: `YYYY-MM-DD` format
- After scan completes: **"Auto-fill Reminder Form"** button appears — one tap populates ticket number and due date into the reminder form below
- UI states:
  - Loading: spinner animation (1.5s pulse)
  - Success: green checkmark
  - Error: red message with manual entry fallback
- **Lawyer banner:** if OCR detects stunt driving, DUI, plate denial, or fine ≥ $200 — a prominent banner auto-appears linking to the Legal tab
- **Error state:** if OCR confidence is low, show manual entry form pre-populated with best guesses; user corrects and saves

#### 3.4 Fine Reminders System
- **Inputs:** Ticket/Reference Number, Due Date (date picker)
- Status badge per reminder (auto-calculated from due date):
  - `UPCOMING` — green
  - `TODAY` — amber
  - `OVERDUE` — red
- Delete button per reminder
- Google Calendar / .ics export per reminder
- **Empty state:** *"No reminders yet — scan a ticket to get started"*

#### 3.5 Fee Escalation (ROI) Calculator
- **Input:** Base ticket amount (currency field with `$` prefix)
- **Auto-calculated output — exact Toronto fee schedule:**

| Milestone | Fee Added | Label |
|---|---|---|
| Day 1–15 | $0 | Standard fine |
| Day 16 | +$15.39 | Address Search Fee |
| Day 31 | +$32.10 | Late Payment Fee |
| Day 60 | +$32.10 | Plate Denial Fee |

- Visual: horizontal timeline bar with red zone clearly marked after Day 15
- Savings callout: *"Paying today saves you $X vs waiting until Day 60"*
- Plate Denial explained: licence plate sticker renewal blocked until fine paid

---

### TAB 2 — Services

#### 3.6 City Payment Portals

**Parking Violations (toronto.ca)**
- Pay Parking Ticket →
- Dispute Ticket →
- About Parking Violations →

**Speed & Red Light Cameras (toronto.ca)**
- Pay Camera Fine →
- Dispute Camera Fine →
- About Camera Penalties →

**Court Services**
- Court Services & Provincial Offences (ontario.ca) →
- Speed Violation — Pay or Dispute →
- Pay a Fine at Court →

#### 3.7 Street Parking Checker
- Dropdown of Toronto streets (expandable list):
  - Queen St W (Spadina to Bathurst)
  - Bloor St W (Yorkville Area)
  - Kensington Market
  - Front St (Near Scotiabank Arena)
  - King St W *(add more streets in V2)*
- Per street display:
  - Hourly rate (e.g. `$3.00/hr`)
  - Enforcement hours (e.g. `Mon–Sat 8am–9pm`)
  - Free parking windows (e.g. `Sun 1pm–9pm`, `Free after 9pm`)
  - Rush hour towing warning (e.g. `Tow-away: 3:30–6:30 PM`)
- **"OPEN GREEN P"** button → links to Green P parking app
- Data source: Toronto Open Data API (CKAN); hardcoded fallback for offline/API failure

#### 3.8 Vehicle Towed?
- **"FIND TOWED CAR"** button → links to `tps.ca/services/towing/`
- Warning copy: *"Storage fees start at $75/day. Act fast."*
- Step-by-step instructions: what to do when your car is gone
- Links to major tow lots with phone numbers

#### 3.9 Dispute Script Builder
- **Dropdown — 4 Toronto-specific dispute grounds:**
  1. Sign was hidden or missing
  2. Officer wrote wrong plate/date
  3. Parking meter was broken
  4. I had a valid residential permit
- User enters: location, date, brief description
- Generates a fully formatted dispute letter for Toronto Parking Authority including:
  - Formal opening
  - Grounds for dispute (matched to selected reason)
  - Request for dismissal or reduced fine
  - Signature block placeholder
- **"Copy Script"** button (Clipboard API with textarea fallback)

#### 3.10 USA Parking & Toll Links
*(This is a V1 feature — Canadian plates are tracked on US systems)*

Six quick-access buttons:
- Pay US Parking Ticket (All States) → dmv.org
- USA.gov — Find Your State Portal
- E-ZPass Toll Violations (18 States)
- PlatePass — Rental Car Toll Bills
- SunPass — Florida Toll Roads
- TxTag — Texas Toll Roads

Warning copy: *"Canadian plates are tracked on US toll systems. Unpaid tolls can block cross-border vehicle registration renewal."*

---

### TAB 3 — Hotspots

#### 3.11 Interactive Enforcement Map
- **Library:** Leaflet.js v1.x
- **Tile layer:** CartoDB Dark Matter
- **Default centre:** Toronto `[43.6532, -79.3832]`, zoom level 13
- **Heatmap:** Leaflet Heat plugin — enforcement density
  - Blue = low enforcement
  - Amber = medium enforcement
  - Red = high enforcement
- **Three toggleable layers:**
  1. **Bike Lanes** — Protected (green), Regular (blue), Trails (purple) — data from Toronto Open Data cycling GeoJSON; hardcoded 14-route fallback
  2. **Fire Hydrants** — Yellow dots with 3-metre clearance radius shown
  3. **Heatmap** — on/off toggle
- **Legend:** High / Medium / Low labels

#### 3.12 GPS Guardian (Live Proximity Scanner)
- **"Start Live GPS Guardian"** button — requests location permission
- Uses `geolocation.watchPosition` — continuous real-time tracking (10-second timeout, high accuracy mode)
- GPS accuracy displayed in metres below the button
- Alert thresholds and copy:

| Zone | Radius | Alert Copy |
|---|---|---|
| Fire Hydrant | 20m | *"PULL FORWARD! You are too close to a Fire Hydrant ($100 Fine)"* |
| Bike Lane | 25m | *"DO NOT STOP! You are in a Protected Bike Lane ($200 Fine)"* |
| Tow-away zone | 30m | *"WARNING — Tow Zone. Your car could be towed ($250+)"* |

- Alert style: full-width banner with 2s danger pulse animation
- **Permission denied state:** banner with instructions to enable location in browser settings; manual postcode entry as fallback

#### 3.13 Community Reports Overlay
- Up to 3 live pinned reports visible on map simultaneously (V1 limit)
- Pin style: coloured circle avatar with user initials (not generic markers)
- Popup on tap: name, issue type, status badge `Pending 311`, time submitted
- Report count badge shown above map: *"X community reports on the map"*
- Pins expire after 24 hours

#### 3.14 Report Issue Panel
Five issue type buttons:
1. Broken Meter
2. Hidden Sign
3. Pothole
4. Bike Lane Block
5. Other

**AI Email Draft System:**
- Claude API generates a complaint email containing:
  - Incident location (GPS coordinates or "Toronto" if GPS unavailable)
  - Date of observation
  - Issue-specific description
  - Clear action request
- Output shown in editable textarea labelled: *"AI-drafted — edit freely before sending"*
- Name field (auto-filled from profile)

**Send buttons (context-sensitive by issue type):**

| Issue | Send To |
|---|---|
| All issues | 311@toronto.ca |
| Broken meter | Green P + Police Enforcement |
| Bike lane block | cycling@toronto.ca |

**"Pin on Community Map" button:** captures GPS coordinates, user name, issue type — drops avatar marker on map

---

### TAB 4 — Legal

#### 3.15 AI Ticket Advisor (Text Input)
- Textarea: *"Describe your ticket and get an instant severity assessment"*
- **"Analyse My Ticket"** button
- Claude API returns severity assessment; result card animates in (0.5s slide-up)
- Result includes:
  - Severity label (see 4-tier system below)
  - Recommended action
  - Plain-English explanation (130+ characters)
  - Relevant law firm cards highlighted with 3-second pulse animation

#### 3.16 AI Ticket Scan Verdict (Photo Input)
- Upload/camera field for ticket photo
- UI states: *"AI is reading your ticket…"* (loading) → *"Ticket analysed!"* (success)
- Extracts: fine amount ($X.XX), offence type
- Outputs a colour-coded verdict card with CTA:

| Verdict | Colour | Copy | CTA |
|---|---|---|---|
| **Urgent** | Red | *"Do NOT pay this ticket"* | → Lawyer firm links |
| **Serious** | Amber | *"This ticket is worth contesting"* | → Paralegal links |
| **Contest** | Blue | *"You can fight this without a lawyer"* | → DIY dispute script |
| **Minor** | Green | *"Pay It — Not Worth Fighting"* | → Pay portal |

#### 3.17 Toronto Traffic Defence Directory

8 firms — all display **"Free consultation"** badge. Tapping contact opens a pre-filled email with DRIVEE discount code in the email body.

| # | Firm | Type | Fee Range | Specialties | Email | Code |
|---|---|---|---|---|---|---|
| 1 | X-Copper Professional Corporation | Lawyer | $350–$900 | Stunt, Speeding, DUI, Careless, Criminal | info@xcopper.com | DRIVEE |
| 2 | X-COPS Traffic Ticket Fighters | Paralegal | $200–$600 | Speeding, Red Light, Parking, Careless | info@x-cops.ca | DRIVEE |
| 3 | POINTTS Advisory Services | Lawyer & Paralegal | $250–$700 | Speeding, School Zone, Careless, Insurance | toronto@pointts.com | DRIVEE |
| 4 | OTT Legal | Paralegal | $200–$550 | Red Light, Speeding, Parking, HOV Lane | info@ontariotraffictickets.com | DRIVEE |
| 5 | X-Police / Fight Your Ticket | Lawyer | $300–$800 | Stunt, DUI, Criminal, HTA, Careless | help@xpolice.ca | DRIVEE |
| 6 | Street Legal Paralegal Services | Paralegal | $150–$500 | Speeding, Bike Lane, Parking, Cell Phone | info@street-legal.ca | DRIVEE |
| 7 | Traffic Ticket Experts | Lawyer & Paralegal | $200–$650 | All HTA, Speeding, Stunt, Red Light | info@trafficticket.legal | DRIVEE |
| 8 | HWY-LAW Criminal Defence | Lawyer | $400–$1,200 | DUI, Criminal, HTA, Dangerous, Stunt | info@hwy-law.com | DRIVEE |

- Filter by: violation type, price range, paralegal vs lawyer
- **Monetisation note:** featured placement is a paid tier for law firms (V1 revenue)

---

### TAB 5 — Guide

#### 3.18 8-Step Onboarding Walkthrough

Each step has: title, 2–3 sentence description, tab reference badge.

| Step | Title | Tab |
|---|---|---|
| 1 | Save Your Profile | Dashboard |
| 2 | Scan a Ticket with AI | Dashboard |
| 3 | Add Fine Reminders | Dashboard |
| 4 | Check Late Fee Costs | Dashboard |
| 5 | Pay or Dispute Your Fine | Services |
| 6 | Check Parking Rates | Services |
| 7 | View Enforcement Hotspots | Hotspots |
| 8 | Get Legal Help | Legal |

#### 3.19 Quick Tips Section
Three persistent tips displayed below the steps:
1. *"Enable 24h notifications to avoid fee increases"*
2. *"Add Drivee to your iPhone home screen via Safari Share button"*
3. *"Use the 'Vehicle Towed?' link to find your car fast"*

#### 3.20 Get Started CTA
- Large blue button at bottom of guide: **"Get Started →"**
- Links directly to Dashboard tab
- Guide shown automatically to first-time users; skippable

---

## 4. User Flows

### Flow A — First Time User
```
Opens app
  → Guide tab shown automatically (skip button visible)
    → Reads 8 steps → taps "Get Started →"
      → Dashboard opens
        → Taps "Scan Ticket" → camera opens
          → Photo taken → OCR runs (Tesseract.js)
            → "Auto-fill Reminder Form" appears
              → Taps it → form populated
                → Saves reminder → ticket appears on dashboard
                  → AI recommendation card shown (Urgent/Serious/Contest/Minor)
                    → User takes action
```

### Flow B — Deadline Alert (Returning User)
```
Push notification: "Your $65 King St fine is due tomorrow — becomes $100 today"
  → User taps notification → app opens to that ticket's detail view
    → Sees ROI calculator: "Paying today saves $47.49"
      → Taps "Pay Now" → toronto.ca payment portal opens
        → Returns to app → deletes reminder → dashboard clears
```

### Flow C — Disputing a Ticket
```
Dashboard → ticket card → AI verdict: "CONTEST — fight this without a lawyer"
  → Taps "Generate Dispute Letter"
    → Services tab → Dispute Script Builder
      → Selects reason: "Sign was hidden or missing"
        → Enters location + date
          → Claude generates full letter in <10 seconds
            → Taps "Copy Script" → pastes into email → sends
              → Marks ticket "Disputed" on dashboard
```

### Flow D — Avoiding a Fine
```
Driving → opens Hotspots tab
  → Taps "Start Live GPS Guardian"
    → Grants location permission
      → Drives near bike lane
        → Alert fires: "DO NOT STOP! Protected Bike Lane ($200 Fine)"
          → Finds alternative spot → no ticket
```

### Flow E — Serious Charge, Needs a Lawyer
```
Dashboard → scans ticket → OCR detects stunt driving charge
  → Lawyer banner auto-appears: "This charge requires legal help"
    → Taps banner → Legal tab
      → AI Ticket Advisor analyses photo
        → Verdict: URGENT (red) — "Do NOT pay this ticket"
          → Taps "X-Copper" firm card
            → Pre-filled email opens with DRIVEE code in body
              → Sends email → awaits free consultation
```

### Flow F — Reporting a Broken Meter
```
Services tab → Community Issue Reporter
  → Taps "Broken Meter"
    → Types location + brief description
      → Claude drafts complaint email to Green P + Police Enforcement
        → User edits freely in textarea
          → Taps send button → mail app opens pre-filled
            → Taps "Pin on Community Map"
              → GPS captured → avatar pin appears on Hotspots map
                → Pin expires in 24h
```

---

## 5. Technical Specification

### Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | React 18 + Vite | Component-based, fast HMR |
| Language | TypeScript | Type safety throughout |
| Styling | Tailwind CSS | Utility-first, mobile-first |
| OCR | Tesseract.js | Client-side, no data upload |
| AI/LLM | Claude API (`claude-sonnet-4-6`) | Ticket analysis, letters, emails, severity |
| Maps | Leaflet.js v1.x + Leaflet Heat | Dark tile support |
| Map tiles | CartoDB Dark Matter | Free, dark theme |
| Geolocation | Browser Geolocation API | `watchPosition` for GPS Guardian |
| Push Notifications | Web Push API + Service Worker | Deadline alerts |
| Storage | IndexedDB (primary) + localStorage (fallback) | No backend cost |
| Backend (V2) | Supabase | Community pins persistence + auth |
| Hosting | Vercel | Free tier, GitHub auto-deploy |
| PWA | Vite PWA plugin | Home screen install, offline support |

### Data Model (IndexedDB)

```typescript
// Ticket / Reminder record
interface Ticket {
  id: string             // uuid
  plate: string
  violationType: string
  fineAmount: number
  issueDate: string      // ISO date
  dueDate: string        // ISO date
  location: string
  status: 'upcoming' | 'today' | 'overdue' | 'paid' | 'disputed'
  aiVerdict: 'urgent' | 'serious' | 'contest' | 'minor' | null
  photoBase64?: string   // optional, client-side only
  referenceNumber?: string
  createdAt: string
}

// User profile
interface Profile {
  name: string
  plate: string
  notificationsEnabled: boolean
  onboardingComplete: boolean
}
```

### External APIs & Services

| Service | Purpose | Cost |
|---|---|---|
| Claude API (claude-sonnet-4-6) | Ticket analysis, dispute letters, community emails, severity scoring | ~$0.003 per ticket |
| Toronto Open Data (CKAN API) | Street parking rates, cycling network GeoJSON | Free |
| Browser Geolocation API | GPS Guardian, community pin capture | Free |
| Leaflet + CartoDB Dark Matter | Map tiles | Free |
| Leaflet Heat | Heatmap visualisation | Free (open source) |
| Google Calendar / .ics export | Deadline export | Free |

### Claude API Prompt Specs

**Ticket Severity Analyser**
- Input: `{ violationType, location, fineAmount, rawOCRText }`
- Output: `{ severity: 'urgent'|'serious'|'contest'|'minor', recommendation: string, reasoning: string, successLikelihood: 'low'|'medium'|'high' }`
- Tone: confident, plain English, no legal jargon

**Dispute Letter Generator**
- Input: `{ disputeReason, location, date, userDescription, plate, name }`
- Output: Formal letter — Toronto Parking Authority format; signature block placeholder included
- Grounds mapped to: procedural errors, signage issues, equipment failure, permit validity

**Community Complaint Email**
- Input: `{ issueType, location, gpsCoords, date, userDescription, name }`
- Output: Short professional complaint email addressed to the correct Toronto authority
- Routes by issue type: broken meter → Green P; hidden sign/pothole → 311; bike lane → cycling@toronto.ca

---

## 6. Error States

| Scenario | Handling |
|---|---|
| OCR confidence low | Show manual entry form pre-filled with partial data; user corrects |
| Claude API unavailable | Show static dispute template with "AI unavailable" notice |
| GPS permission denied | Banner with enable instructions; manual postcode entry fallback |
| No internet | Service Worker serves cached UI; scanner still works; AI shows offline notice |
| Notification permission denied | In-app countdown timer on ticket card instead |
| Toronto Open Data API down | Fall back to hardcoded street parking data |
| Bike lane GeoJSON fails | Fall back to hardcoded 14-route network |

---

## 7. Design System

### Colours (iOS-style dark tokens)

| Token | Hex | Use |
|---|---|---|
| Background root | `#000000` | Page background |
| Surface | `#1C1C1E` | Cards |
| Elevated surface | `#2C2C2E` | Inputs, elevated cards |
| Text primary | `#FFFFFF` | Headings, labels |
| Text secondary | `#8E8E93` | Descriptions |
| Text tertiary | `#636366` | Placeholders |
| Blue (primary) | `#0A84FF` | Buttons, links, active states |
| Purple | `#BF5AF2` | AI features, Legal tab |
| Teal | `#64D2FF` | Map accents |
| Red (danger) | `#FF453A` | Urgent verdict, overdue badge |
| Amber (warning) | `#FFD60A` | Serious verdict, today badge |
| Green (success) | `#30D158` | Minor verdict, upcoming badge |
| Orange | `#FF9F0A` | Heatmap mid-range |
| Border default | `rgba(255,255,255,0.08)` | Card borders |
| Border focused | `rgba(255,255,255,0.18)` | Input focus |

### Typography

| Use | Font | Size | Weight |
|---|---|---|---|
| Body/UI | System stack (SF Pro / Roboto) | 14px | 400–600 |
| Headings | System stack | 28px (h1), 18px (h2) | 700 |
| Ticket numbers, amounts | JetBrains Mono | 14px | 500 |
| Badge pills | System stack | 11px uppercase | 600 |

### Components

| Component | Spec |
|---|---|
| Cards | 16px border radius, 20px padding, 0.5s slide-up on mount |
| Buttons | 12px radius (standard), 20px radius (pill), `scale(0.98)` on press |
| Inputs | 12px radius, 12px padding, 2px blue glow on focus |
| Badge pills | 6px radius, uppercase, 0.5px letter-spacing |
| Bottom nav | Fixed, 90px height, blur backdrop, 0.5px separator |
| Toasts | 0.35s cubic-bezier, 3s auto-dismiss |
| Modals | Bottom sheet (slide up), backdrop blur |
| Loading | 1.5s pulse animation |
| Danger alerts | 2s pulse animation |
| Lawyer highlight | 3s pulse animation |

### Layout
- Max content width: **460px**, centred
- Mobile padding: 20px (≥380px), 14px (<380px)
- Landscape: `env(safe-area-inset-top/bottom)` respected
- Mobile-first — designed for iPhone 14 (390px) first

### Accessibility
- `@media (prefers-color-scheme: dark)` — dark mode native
- `@media (prefers-reduced-motion)` — animations disabled
- WCAG AA contrast compliance on all text
- 2px blue focus shadow on all interactive elements
- All icon buttons have `title` attributes
- Form labels explicitly linked to inputs

---

## 8. Constraints

| Constraint | Detail |
|---|---|
| No backend at launch | IndexedDB only — zero hosting cost |
| Mobile-first | 390px (iPhone 14) primary design target |
| No user accounts at launch | Reduces friction; Supabase auth in V2 |
| Toronto only | One city done well beats five done poorly |
| AI cost awareness | Cache Claude responses where possible; batch where feasible |
| PWA not native app | Ship installable PWA; native is V3 |
| All OCR client-side | Ticket photos never leave the device |

---

## 9. Out of Scope (V1)

| Feature | Reason |
|---|---|
| Native iOS / Android app | PWA covers MVP at zero store overhead |
| In-app payments | Link to city portals; in-app adds PCI burden |
| Real-time parking availability | Requires live sensor data not yet accessible |
| User accounts / cloud sync | localStorage/IndexedDB sufficient for V1 |
| Multi-city support | Toronto quality over geographic breadth |
| In-app lawyer communication | Link-out model avoids legal liability |
| Insurance / demerit tracking | Different regulatory domain |
| Multi-plate household profiles | V2 addition |

---

## 10. Monetisation (V1)

The lawyer referral model is already proven in the Replit prototype. Do not defer this.

| Stream | Mechanism | Phase |
|---|---|---|
| **Lawyer featured placement** | Law firms pay for top-of-directory listing | V1 |
| **Per-referral commission** | Fee when user contacts firm from app | V1 |
| **Premium features** | Cloud sync, multi-plate, PDF export | V2 |
| **White-label** | Sell Drivee to insurance companies / fleet managers | V3 |

---

## 11. Success Metrics

| Metric | Target |
|---|---|
| Ticket scanned → recommendation shown | < 60 seconds |
| Dispute letter generated | < 10 seconds |
| App first load | < 2 seconds |
| Lighthouse PWA score | > 90 |
| Deadline missed by active user | 0 |
| Lawyer referral click-through | > 15% of Urgent verdicts |
| Guide completion (new users) | > 60% complete all 8 steps |

---

## 12. Build Plan — Four-Part Framework

> Based on the Foundation → Functionality → Polish → Test framework.
> Each part maps directly to the features defined in Section 3.
> Pick tasks in order — don't skip ahead to Polish before Functionality works.

---

### Part 1 — Foundation
*Get the basic structure in place. Don't worry about making it pretty.*

- [ ] React + Vite + TypeScript + Tailwind project setup
- [ ] PWA manifest + Service Worker registered
- [ ] Apply design tokens (colours, fonts, spacing) as Tailwind config
- [ ] 5-tab navigation shell — tabs visible and switchable, no logic yet
- [ ] Placeholder content in every tab (headings, dummy cards, lorem text)
- [ ] Profile form visible on Dashboard (inputs render, no save logic yet)
- [ ] Static lawyer cards visible in Legal tab (hardcoded, no interaction)
- [ ] Map renders in Hotspots tab (Leaflet loads, centred on Toronto)
- [ ] App loads and you can see something on every tab

**Goal: every tab is visible and navigable. Nothing needs to work yet.**

---

### Part 2 — Functionality
*Make it work. Core features operational end to end.*

**Dashboard**
- [ ] Profile saves to IndexedDB (name + plate persists on reload)
- [ ] Ticket scanner: camera opens, Tesseract.js OCR runs, Ontario plate pattern detected
- [ ] "Auto-fill Reminder Form" button appears after scan and populates fields
- [ ] Reminder system: add ticket, status badges auto-calculate (Upcoming/Today/Overdue)
- [ ] Fee escalation calculator: inputs base amount, outputs exact Toronto fee schedule ($15.39 / $32.10 / $32.10)
- [ ] Google Calendar / .ics export works from reminder card
- [ ] Push notification permission request + 24h deadline alerts fire correctly
- [ ] Lawyer banner auto-appears when serious charge detected by OCR

**Services**
- [ ] All 9 city portal links open correct URLs
- [ ] Street parking checker: dropdown selects street, correct data displays
- [ ] Tow finder: "FIND TOWED CAR" links to tps.ca, $75/day warning shown
- [ ] Dispute Script Builder: selects reason, Claude API generates letter, Copy button works
- [ ] Community issue reporter: selects type, Claude drafts email, correct authority pre-filled
- [ ] All 6 US parking/toll links open correct URLs

**Hotspots**
- [ ] Leaflet heatmap layer loads with Toronto enforcement data
- [ ] Bike lane + hydrant + tow zone layers toggle on/off correctly
- [ ] GPS Guardian: watchPosition starts, zone alerts fire at correct radii (20m / 25m / 30m) with exact copy
- [ ] Community pins: drop a pin, avatar appears on map, expires after 24h
- [ ] Report count badge updates correctly

**Legal**
- [ ] AI Ticket Advisor: text input → Claude returns 4-verdict result with reasoning
- [ ] AI Ticket Scan Verdict: photo upload → OCR + Claude → colour-coded verdict card shown
- [ ] All 8 law firm contact buttons open pre-filled email with DRIVEE code in body
- [ ] Filter by violation type + price range works

**Guide**
- [ ] All 8 steps render with correct tab reference badges
- [ ] Quick Tips section visible
- [ ] "Get Started →" button navigates to Dashboard
- [ ] Guide shown automatically to first-time users; skip button works

**Goal: every feature listed in Section 3 works end to end.**

---

### Part 3 — Polish
*It works — now make it feel professional.*

- [ ] Card slide-up animations (0.5s) on mount throughout app
- [ ] Toast notifications with 0.35s cubic-bezier, 3s auto-dismiss
- [ ] Button active states: `scale(0.98)` on press across all buttons
- [ ] Hover states on all interactive elements
- [ ] Lawyer cards pulse for 3s when highlighted by AI verdict
- [ ] Danger alerts pulse for 2s (GPS Guardian, overdue badges)
- [ ] Loading states: 1.5s pulse spinner on all async actions (OCR, Claude API, map load)
- [ ] Bottom sheet modals slide up correctly with backdrop blur
- [ ] Consistent spacing — nothing feels squished on 390px
- [ ] JetBrains Mono applied to all ticket numbers and fine amounts
- [ ] Lawyer banner animation + dismiss button styled
- [ ] iOS safe area insets applied (`env(safe-area-inset-top/bottom)`)
- [ ] All colour tokens consistent — no rogue colours anywhere
- [ ] Empty states designed for: no reminders, no pins, no search results

**Goal: the app feels as polished as the Replit prototype.**

---

### Part 4 — Test
*Make sure nothing is broken. Check the stuff that's easy to miss.*

- [ ] Mobile layout on iPhone 14 (Safari) — check every tab
- [ ] Mobile layout on Android Pixel (Chrome) — check every tab
- [ ] Every button and link tapped — confirm correct behaviour
- [ ] Form validation: empty fields, invalid plate format, past due dates
- [ ] OCR failure: low-confidence scan shows manual entry fallback correctly
- [ ] GPS denied: fallback banner + manual postcode entry appears
- [ ] Notification denied: in-app countdown timer shows on ticket card
- [ ] Claude API unavailable: static template shown with "AI unavailable" notice
- [ ] Toronto Open Data API down: hardcoded street data loads as fallback
- [ ] No internet: Service Worker serves cached UI, scanner still works
- [ ] All 8 Guide steps readable and complete on small screens
- [ ] All loading indicators visible during async actions
- [ ] Lighthouse audit run — target score >90 PWA, >90 Performance
- [ ] First load <2s tested on simulated 4G in Chrome DevTools
- [ ] Deploy to Vercel + GitHub auto-deploy confirmed working
- [ ] PWA install prompt tested on iOS Safari and Android Chrome

**Goal: ship with confidence. Nothing broken, nothing missing.**

---

*PRD v4.0 — Build plan restructured to Foundation → Functionality → Polish → Test framework. Fully reconciled against toticket.replit.app.*
