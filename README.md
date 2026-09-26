# Drivee — 2nd design

Toronto's driver app, rebuilt around one job: somebody searches *"fight parking
ticket Toronto"*, lands here, drops in a photo of their ticket, and walks away
with a verdict and a paralegal.

The visual language is a dark "cosmic" one — a Three.js particle planet behind
the hero, Drivee blue and amber over a near-black violet void. The 3D technique
is adapted from [builder.io's 3D planet write-up](https://www.builder.io/blog/3d-planet)
(`PointsMaterial` + `onBeforeCompile` shader injection), recoloured to the brand
and tuned so it never costs the page its interactivity.

Every feature of the original Drivee is carried over.

---

## The conversion path

```
Google  →  /  →  drop ticket photo  →  /api/claude (vision)
                        ↓
        verdict + charge + deadline + cost-of-waiting ladder
                        ↓
        firms matched to THAT charge, cheapest first
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
assets/js/planet.js         the Three.js particle planet (ES module)
assets/js/scanner.js        scan → verdict → firm match → lead
assets/js/lawyers.js        the vetted firm directory (single source of truth)
assets/js/main.js           nav, scroll reveal, count-ups, PWA registration

api/                    Vercel serverless functions
```

### API

| Endpoint | Purpose |
|---|---|
| `POST /api/claude`  | Vision read of a ticket photo (proxied, key server-side) |
| `POST /api/lead`    | Case-review request → chosen firm, driver copied |
| `POST /api/contact` | Contact form |
| `POST /api/mechanic`| Inspection booking / mechanic application |
| `POST /api/track`   | First-party analytics |
| `GET  /api/stats`, `/api/leaderboard` | Dashboards, arcade scores |
| `GET  /api/notify-reminders`, `/api/notify-daily-tip`, `/api/keepalive` | Cron (see `vercel.json`) |

`/api/lead` never trusts a firm address from the client — it resolves the
recipient against a server-side allowlist, so it cannot be driven as an open
relay.

## Running it

```bash
node _dev-server.js     # http://localhost:8765
```

Static files only; the `/api/*` functions need `vercel dev` or a deploy.

### Environment

| Variable | Used by |
|---|---|
| `CLAUDE_API_KEY`   | `/api/claude` |
| `RESEND_API_KEY`   | `/api/lead`, `/api/contact`, `/api/mechanic`, reminders |
| `VAPID_*`          | web push |

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
