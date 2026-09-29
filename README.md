# Drivee — 2nd design

Ontario's driver app, rebuilt around one job: somebody searches *"fight a
ticket"*, lands here, drops in a photo of it, and walks away knowing what it
really costs and who can take it.

The visual language is a dark "cosmic" one — a Three.js particle planet behind
the hero, Drivee blue and amber over a near-black violet void. The 3D technique
is adapted from [builder.io's 3D planet write-up](https://www.builder.io/blog/3d-planet)
(`PointsMaterial` + `onBeforeCompile` shader injection), recoloured to the brand
and tuned so it never costs the page its interactivity.

Every feature of the original Drivee is carried over.

---

## The conversion path

```
Google  →  /  →  drop ticket photo  →  /api/scan-ticket
                        ↓
     charge · deadline · demerit points, read by claude-opus-5
     into a guaranteed JSON schema (low-confidence reads say so)
                        ↓
     what it ACTUALLY costs: fine + insurance over 3 years
     vs what representation runs for that charge
                        ↓
     firms LICENSED for that charge, cheapest first
     (a Criminal Code charge never reaches a paralegal)
                        ↓
        firm detail  →  free case review form  →  /api/lead
                        ↓
             emailed to the firm, driver copied
```

Nothing in that path needs an account, and the dropzone accepts a drag, a file
picker, a phone camera, or a pasted screenshot.

## Layout

```
index.html              the landing page — hero dropzone, funnel, SEO
app.html                the full PWA (5 tabs) — carried over from the old repo
report.html             free VIN check + vehicle history report
mechanic.html           mobile pre-purchase inspection (book + apply)
contact.html  privacy.html  game.html
blog/                   5 guides targeting dispute/late-fee/towing queries
parking-signs/  signs/  sign explainer pages

assets/css/drivee.css       design system (tokens, buttons, cards, nav, footer)
assets/css/home.css         landing-page components
assets/css/theme-bridge.css re-points the content pages' light tokens to dark
assets/css/app-theme.css    the same idea for app.html's own token sets
assets/js/ontario.js        Ontario rules: APS vs POA, demerit points, costs
assets/js/planet.js         the Three.js particle planet (ES module)
assets/js/scanner.js        scan → verdict → firm match → lead
assets/js/lawyers.js        firm directory + licence-aware matching
tools/test-tickets.js       run real ticket photos through the live scanner
assets/js/main.js           nav, scroll reveal, count-ups, PWA registration

api/                    Vercel serverless functions
```

### API

| Endpoint | Purpose |
|---|---|
| `POST /api/scan-ticket` | Reads a ticket photo → schema-valid JSON (claude-opus-5) |
| `POST /api/claude`  | Generic Claude proxy, still used by the app |
| `POST /api/lead`    | Case-review request → chosen firm, driver copied |
| `POST /api/contact` | Contact form |
| `POST /api/mechanic`| Inspection booking / mechanic application |
| `POST /api/track`   | First-party analytics |
| `GET  /api/stats`, `/api/leaderboard` | Dashboards, arcade scores |
| `GET  /api/notify-reminders`, `/api/notify-daily-tip`, `/api/keepalive` | Cron (see `vercel.json`) |

`/api/lead` never trusts a firm address from the client — it resolves the
recipient against a server-side allowlist, so it cannot be driven as an open
relay. `/api/scan-ticket` owns its prompt and schema server-side and accepts
only an image, so unlike `/api/claude` it cannot be used as a free LLM.

## Running it

```bash
cp .env.example .env.local     # add CLAUDE_API_KEY
npm install
npm run dev                    # http://localhost:8765
```

The dev server runs the `/api/*` functions in-process, so the scanner and the
lead flow work on localhost exactly as they do on Vercel. It prints whether
each key was found at startup.

**Testing the scanner on real tickets:**

```bash
# drop photos in tools/tickets/ then
npm run test:tickets
```

Prints what was read off each one, with timing and confidence. Add a JSON file
beside an image to assert on specific fields. Ticket photos are gitignored.

### Environment

| Variable | Used by |
|---|---|
| `CLAUDE_API_KEY`   | `/api/scan-ticket`, `/api/claude` |
| `RESEND_API_KEY`   | `/api/lead`, `/api/contact`, `/api/mechanic`, reminders |
| `VAPID_*`          | web push |

## Ontario only — and it enforces that

Drivee serves Ontario. The scanner returns `is_ontario`, and anything else
(another province, a US state) gets a distinct screen: it still shows what was
read off the ticket, because that is useful anywhere, but it suppresses the
Ontario fee ladder, the demerit points, the cost model and the firm matching,
and says plainly that we cannot advise on it. Guessing with Ontario rules on a
Quebec ticket would be worse than declining.

Within Ontario there are two separate systems, and conflating them gives wrong
advice:

* **Parking is municipal.** Toronto and ~24 other municipalities run an
  Administrative Penalty System — you request a *screening review*, not a court
  date. Elsewhere parking still goes through Provincial Offences Court. Only
  Toronto's day-16/31/60 fee ladder is quoted as exact, because only it is
  published; other municipalities get the response window off the ticket.
* **Moving violations are provincial.** Speeding, careless, stunt, red light,
  distracted and HOV are Highway Traffic Act offences prosecuted identically
  province-wide, and demerit points come from the MTO.
* **Licence scope is enforced.** An Ontario paralegal may represent on HTA
  matters but *not* on Criminal Code charges, so impaired driving only ever
  matches firms that actually employ lawyers.
* **Camera ≠ officer.** A red light *camera* ticket carries no demerit points
  and never reaches your record; an officer-issued one carries three. The
  scanner is told to distinguish them.

## Numbers and honesty

Fines, demerit points and Toronto's fee ladder are exact, and carry an
`exact` tag. Insurance impact and representation cost are ranges, and carry an
`estimate` tag — they genuinely vary by insurer, driving record and firm. The
UI never renders the two in the same style, because a driver deciding whether
to hire someone needs to know which numbers are facts.

When the photo is poor the scanner returns `confidence: "low"` and names the
fields it could not read, rather than guessing a plate or an amount. A wrong
plate quietly transcribed is worse than an admitted gap.

## Design notes

* **The hero is a form, not a poster.** The canvas is `pointer-events: none`,
  the planet is pushed right so the copy sits on clean void, and a directional
  scrim keeps the headline above the particle field. Once a verdict renders,
  the big dropzone collapses to a compact "scan another" bar.
* **The 3D degrades quietly.** Reduced-motion and no-WebGL get a static CSS
  nebula; phones get roughly a third of the particle budget; the loop pauses
  when the hero scrolls away or the tab is hidden.
* **Re-theming over rewriting.** The content pages and the 971 KB app were
  tokenised already, so the dark theme is applied by re-pointing those tokens.
  Where a token did double duty — `--ink` as both body text and a dark button
  fill — it was split into a text tone and a `*-fill` companion rather than
  fudged with `!important`.
* **Contrast was measured, not eyeballed.** Every re-themed page was swept for
  WCAG AA text contrast. The content pages are clean; four secondary links
  inside the app still sit at 3.6–4.0:1 against a 4.5:1 target.

## Independence

Drivee is not a law firm and takes no commission from the firms it lists. Firm
"claims" shown in the funnel are each firm's own public marketing copy, quoted
and attributed, not Drivee's assessment. Not affiliated with the City of
Toronto, MTO, ServiceOntario, CARFAX or NHTSA.
