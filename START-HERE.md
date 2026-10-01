# START HERE

> Для новой сессии: это рабочая копия проекта. Открывай эту папку и продолжай отсюда.
> Временная папка в `AppData\Local\Temp` больше не нужна.

Handoff note for whoever picks this up next — a new Claude session, or you in
two weeks. Read this first, then `README.md` for the architecture.

---

## What this is

A redesign of Drivee, Ontario's driver app, built around one job: somebody
searches *"fight a ticket"*, lands on the page, drops in a photo of it, and
gets a verdict plus a matched paralegal — without an account.

| | |
|---|---|
| **Live** | https://drivee2design.vercel.app |
| **Repo** | https://github.com/EugenAzxa/Drivee2design |
| **Local** | `npm install && npm run dev` → http://localhost:8765 |
| **Old site** | https://github.com/EugenAzxa/Drivee (source of carried-over features) |
| **Design ref** | https://www.builder.io/blog/3d-planet |

`drivee.ca` is **not** this project — it still serves the old site, from a
different Vercel account. Nothing live was touched.

---

## State: what works, what doesn't

**Works, verified in a browser**
- The landing page, the 3D particle hero, and the full funnel:
  verdict → cost breakdown → matched firms → firm detail → lead form.
- Ontario rules engine: screening review vs Provincial Offences Court,
  demerit points, Toronto's exact fee ladder, insurance estimates.
- Out-of-province tickets get their own screen instead of wrong advice.
- Home-screen install (real `beforeinstallprompt`, iOS Safari sheet).
- Every carried-over page: the app, VIN check, mechanic, blog, sign guides.
- Mobile: 11 pages × 6 widths (320–768px), zero horizontal overflow.

**Does not work yet — needs a key, not code**
- The scanner. `/api/scan-ticket` returns *"Scanner is not configured"*
  until `CLAUDE_API_KEY` is set. Same for `/api/lead` and `RESEND_API_KEY`.

---

## The three open items

### 1. No real ticket has ever been scanned ⚠️

Everything *around* the model call is verified — the wire format, the schema,
the parsing, the verdict logic, the firm matching. But no actual photo of an
actual ticket has been through it, because there was never an API key on the
machine. **Do not claim the OCR works until it has read real paper.**

```bash
cp .env.example .env.local        # add CLAUDE_API_KEY=sk-ant-...
# drop ticket photos into tools/tickets/
npm run test:tickets              # prints what was read, with confidence + timing
```

Add a `my-ticket.json` beside an image to assert on fields. Ticket photos are
gitignored — they contain plates, names, addresses.

For production: Vercel → Settings → Environment Variables → then redeploy
(`vercel deploy --prod`), because env vars only apply to new builds.

### 2. The hero stats are unverified

"14,283 enforcement pins", "74% disputes won", "$142 saved" are carried over
from the old marketing copy. Nobody has checked them, and they now sit next to
legal-adjacent advice where being wrong matters more. Either substantiate or
soften before this gets real traffic.

### 3. Four low-contrast links inside the app

Secondary links in `app.html` sit at 3.6–4.0:1 against a 4.5:1 target
(a `mailto:`, a "See all", a "SAMPLE" tag, a "live rate" link). Readable, not
invisible. Everything else passes.

---

## Decisions worth not undoing

Each of these looks like it could be "simplified". Each was deliberate.

**There is no App Store / Play listing.** Drivee is a PWA. The store URLs in
`app.html` are Green P's (`id429679356`) — a third-party app we link out to.
The hero badges run the real install flow instead of pointing at nothing. If a
listing ever ships, swap the handlers in `assets/js/install.js`.

**Ontario only, enforced in code.** The scanner returns `is_ontario`, and
anything else gets a screen that shows the read but suppresses the fee ladder,
demerit points, cost model and firm matching. Applying Ontario rules to a
Quebec ticket would be worse than declining.

**A paralegal may not take a Criminal Code charge.** Impaired driving matches
only firms that employ lawyers. The old tags offered paralegal-only firms for
DUI — that was a real defect, not a styling choice.

**Exact vs estimate are styled differently on purpose.** Fines, demerit points
and Toronto's ladder carry an `exact` tag; insurance and representation costs
carry `estimate`. Somebody deciding whether to spend $400 needs to know which
numbers are facts.

**`/api/scan-ticket` exists because `/api/claude` is an open LLM proxy.** The
latter forwards whatever `messages` a caller sends — anyone who can set an
`Origin` header gets free inference on your key. The scanner endpoint accepts
only an image and owns its prompt server-side.

**`/api/lead` resolves the firm address from a server-side allowlist**, never
from the client, or it becomes an open mail relay.

**Camera ≠ officer.** A red light *camera* ticket carries 0 demerit points; an
officer-issued one carries 3. The old code gave both 3.

---

## Layout

```
index.html              the landing page — hero dropzone, funnel, SEO
app.html                the full PWA, carried over from the old repo
api/scan-ticket.js      ticket photo → schema-valid JSON (claude-opus-5-5)
api/lead.js             case-review request → the chosen firm
assets/js/ontario.js    Ontario rules: APS vs POA, points, costs
assets/js/lawyers.js    firm directory + licence-aware matching
assets/js/scanner.js    scan → verdict → firms → lead
assets/js/install.js    home-screen install
tools/test-tickets.js   run real photos through the live scanner
```

Full architecture, the Ontario model, and the design notes are in `README.md`.

---

## Deploying

```bash
vercel deploy --prod
```

Push-to-deploy is **not** connected: the Vercel account lacks write access to
the GitHub repo (different identity). Connect it from the Vercel dashboard
under the GitHub account that owns the repo, or keep deploying from the CLI.
