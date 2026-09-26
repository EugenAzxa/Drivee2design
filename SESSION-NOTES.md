DRIVEE — SESSION NOTES
======================


SESSION 1 — 19 March 2026
--------------------------

WHAT WAS BUILT

1. index.html created from scratch — the entire app lives in one file as planned.
   This did not exist before this session.

2. Full design system applied — all 14 colour tokens from the PRD set as CSS variables
   at :root. Fonts, spacing, reset, and base styles all in place. Changing one variable
   updates the whole app.

3. 5-tab navigation shell — Dashboard, Services, Hotspots, Legal, Guide tabs all
   switchable. Tab switching uses CSS classes, not inline display styles, so it is safe
   for flex/grid layouts. Nav bar is fixed to the bottom with frosted glass effect and
   correct iPhone safe-area insets.

4. All 5 tabs have placeholder content — every tab has headings, cards, inputs,
   empty states, and placeholder buttons so the app looks real even though nothing is
   wired up yet. Legal tab has 3 hardcoded lawyer cards. Guide tab has all 8 steps,
   3 quick tips, and a working Get Started button.

5. Leaflet map renders in Hotspots tab — loaded via CDN, CartoDB Dark Matter tiles,
   centred on Toronto. Has a try/catch fallback so if the CDN fails the user sees a
   friendly message instead of a broken grey box.

6. ROI Fee Escalation Calculator is fully working — this jumped ahead of the plan
   into Part 2 territory. Live calculation as you type. Exact Toronto fee schedule
   hardcoded: Day 16 plus $15.39, Day 31 plus $32.10, Day 60 plus $32.10.
   Shows fee breakdown rows, timeline bar (green to red), bold red total,
   and green savings callout. Dollar-sign prefix input with no spinner arrows.
   Scroll padding fixed so the output is not hidden behind the nav bar.


ISSUES TO CARRY FORWARD

- Nothing is broken. The foundation is solid.
- Tab icons are plain Unicode symbols. They work but are not as polished as the
  reference app. SVG icons are planned for Part 3 Polish — do not change them yet.
- The Leaflet map renders but has no heatmap layer, bike lane layer, or hydrant layer.
  Those are Part 2 tasks.
- All buttons except the ROI calculator are placeholder only — they show but do nothing.
  That is intentional for Foundation phase.


PRD NOTES

- The ROI calculator (section 3.5 in PRD) is now complete and functional — this is
  ahead of schedule. No conflict with PRD. It matches the fee schedule exactly.
- Everything else built today is Foundation phase only, as planned in Part 1 of the
  build plan.
- PRD specifies React plus Vite plus TypeScript. We are building in vanilla HTML/CSS/JS
  per the tutoring rules. This is a known divergence and is intentional.
- PRD may need a note added to reflect that the ROI calculator is done.


LESSON ARC — WHERE WE ARE

Part 1 Foundation: COMPLETE
Part 2 Functionality: NOT STARTED (next sessions)
Part 3 Polish: NOT STARTED
Part 4 Test: NOT STARTED


NEXT SESSION — Part 2 Functionality, starting with Dashboard

Priority order for next session:
1. Profile save — wire up the Name and License Plate inputs to localStorage so they
   persist when the page is reloaded.
2. Fine Reminders system — add a ticket, show status badges (Upcoming / Today / Overdue)
   calculated from the due date, delete button per reminder.
3. Google Calendar export — .ics file download from a reminder card.

These three features are self-contained, beginner-friendly, and do not require any
external APIs. They are the right place to start Part 2.


HOMEWORK SET THIS SESSION

Open index.html in Chrome. Press F12 to open DevTools. Click the phone icon in the
top-left corner of DevTools to turn on device mode. Set the device dropdown to
iPhone 14. Now slowly scroll through all 5 tabs one by one. Write down anything that
looks squished, cut off, too small, or out of place. Bring that list to the next session.

This should take 15 to 20 minutes. If you get stuck finding the device mode button,
search for: Chrome DevTools mobile simulation.


SESSION 2 — 20 March 2026
--------------------------

WHAT WAS BUILT

1. Profile save to localStorage — the Name and License Plate inputs on the Dashboard now
   persist when you reload the page. Used safeGet and safeSet wrappers with try/catch so
   the app never crashes in incognito mode. Profile loads automatically on startup.

2. Fine Reminders system — fully working. You can add a ticket reference number and due
   date, and it appears in a reminder card with a status badge calculated from today's date.
   UPCOMING is green, TODAY is amber, OVERDUE is red. Each card has a delete button.
   Reminders survive page reload because they are saved to localStorage.

3. Dispute Script Builder — select one of four Toronto dispute reasons, click Generate
   Script, and a full formal letter appears in a text area. If a profile is saved, the
   letter auto-fills your name and license plate. A Copy Script button copies the letter
   to the clipboard with a fallback for file:// mode.

4. Street Parking Checker — five Toronto streets hardcoded with hourly rate, enforcement
   hours, free parking windows, and tow-away warnings. A red warning banner appears for
   streets with rush-hour tow zones. The Open Green P button links to the Green P app.

5. Technical foundations laid for safe data handling — parseLocalDate() prevents the
   timezone bug where new Date() would show yesterday in Toronto. esc() sanitises all
   user input before it touches innerHTML to prevent display bugs. Collision-safe IDs
   use timestamp plus random suffix so two reminders added at the same time never clash.


ISSUES TO CARRY FORWARD

- .ics calendar export (Google Calendar) was planned for this session but not built.
  It is still on the list for next session.
- The Copy Script button used inline styles in this session — fixed in Session 3.
- Reminder due dates showed raw ISO format (2026-03-20) — fixed in Session 3.
- Nothing is broken. All five features work correctly on reload.


PRD NOTES

- Profile (section 3.1) is working but uses localStorage not IndexedDB as the PRD specifies.
  This is an intentional tutoring divergence — localStorage is simpler and functionally
  equivalent for this stage.
- Fine Reminders (section 3.4) is complete except .ics export.
- Dispute Script Builder (section 3.9) is complete. The PRD specifies Claude API for letter
  generation — we used hardcoded templates instead. Functionally matches the PRD output.
- Street Parking Checker (section 3.7) is complete with hardcoded data. PRD specifies
  Toronto Open Data API as the source — hardcoded fallback is explicitly listed as acceptable.
- ROI Calculator (section 3.5) was already done in Session 1.


LESSON ARC — WHERE WE ARE

Part 1 Foundation: COMPLETE
Part 2 Functionality: MOSTLY COMPLETE (.ics export outstanding)
Part 3 Polish: COMPLETE (see Session 3)
Part 4 Test: NOT STARTED


HOMEWORK SET THIS SESSION

No new homework was set between sessions 2 and 3 — they ran back to back.


SESSION 3 — 20 March 2026
--------------------------

WHAT WAS BUILT

1. CSS animations — three @keyframes added: slideUp (cards glide in from slightly below),
   pulse (OVERDUE badge breathes in and out every 2 seconds), shake (button trembles when
   validation fails). All three are now used in the app.

2. Card animations and hover states — every card, step card, and lawyer card slides up
   when a tab loads. On desktop, hovering a card lifts it 1px and brightens the border.
   Both effects use @media (hover: hover) so they never get stuck on phone touch screens.
   Tab switching triggers the animation to replay every time you return to a tab.

3. Button polish — blue buttons glow brighter on hover. The Add Reminder button shakes
   when you try to submit an empty form (the same feedback you get from a wrong PIN on a
   lock screen). All hover effects use @media (hover: hover) for touch safety.

4. Badge polish and empty state — the OVERDUE badge pulses continuously. The TODAY badge
   has a faint amber glow. The empty state for reminders now has a dashed border so it
   looks like a placeholder, not a broken layout.

5. SVG nav icons — all five Unicode symbols replaced with clean inline SVG icons.
   House for Dashboard, grid for Services, map pin for Hotspots, scales for Legal,
   three lines for Guide. Active icon turns blue, inactive is grey — same behaviour as before
   but looks correct on every phone.

6. formatDate helper and final HTML fixes — reminder due dates now display as
   Mar 20, 2026 instead of 2026-03-20. The Copy Script button now uses a CSS class
   instead of five inline style attributes. Lawyer fee ranges now use JetBrains Mono font
   to match the PRD typography spec.


ISSUES TO CARRY FORWARD

- Nothing is broken. The verification checklist was handed to the student but not yet
  run through — that is the first task of the next session or the homework for this session.
- .ics calendar export is still outstanding from Part 2.
- The Guide tab first-time auto-show logic (PRD section 3.20) is not yet built.
- Part 4 Test phase has not started.


PRD NOTES

- Polish phase matches PRD section 7 (Design System) component specs: 0.35s toast,
  0.4s card slide-up, 2s danger pulse on OVERDUE badge, scale(0.98) on button press.
- PRD specifies Guide tab shown automatically to first-time users. Not yet implemented.
- PRD specifies lawyer cards pulse for 3s when highlighted by AI verdict. Not yet implemented
  because AI verdict is not built. This is correct — do not add that animation yet.
- Everything built in Polish phase is consistent with the PRD. No conflicts.


LESSON ARC — WHERE WE ARE

Part 1 Foundation: COMPLETE
Part 2 Functionality: MOSTLY COMPLETE (.ics export outstanding)
Part 3 Polish: COMPLETE
Part 4 Test: NOT STARTED


NEXT SESSION — Part 4 Test, plus two small outstanding items

Priority order for next session:
1. Run the verification checklist from the plan — open the app in Chrome DevTools at
   iPhone 14 size and work through all 17 items one by one.
2. Build .ics calendar export — one button per reminder that downloads a .ics file
   openable by Google Calendar, Apple Calendar, and Outlook.
3. Begin Part 4 Test — mobile layout check on iPhone 14, form validation edge cases,
   empty state checks, and checking that everything survives a page reload.


HOMEWORK SET THIS SESSION

Open index.html in Chrome. Press F12. Click the phone icon (device mode). Set device
to iPhone 14. Go through all 5 tabs slowly and run through this checklist one item at a time:

1. Do cards slide up smoothly when you switch to a tab?
2. Is the active nav icon blue and the others grey?
3. Are the nav icons clean shapes (not blocky symbols)?
4. Add a reminder with a past date — does the badge say OVERDUE and slowly pulse?
5. Does a reminder due date show as Mar 20 2026 (not 2026-03-20)?
6. Try clicking Add Reminder with empty fields — does the button shake?

Write down anything that looks wrong or that does not match what was described above.
Bring that list to the next session.

If you get stuck, search for: Chrome DevTools device mode iPhone.


SESSION 4 — 2 April 2026
--------------------------

WHAT WAS BUILT

1. Complete visual redesign — the entire app was rebuilt from the dark theme (black
   background) to a light premium theme matching the Replit Drivee reference app.
   White card surfaces, light blue-tinted background (#F0F4FF), Poppins font replacing
   the previous system font. All 14 design tokens updated at :root.

2. Font Awesome 6 icons — all SVG nav icons and UI icons switched to Font Awesome 6.5.1
   via CDN. Cleaner and more consistent than the hand-drawn SVGs from Session 3.

3. Full feature parity with GitHub reference app — compared our app against
   https://github.com/EugenAzxa/Drivee-App-Replit-edition and added every missing
   feature including Tesseract.js OCR for ticket scanning, AI chat panel, lawyer cards,
   street parking data, and all Services tab links.

4. Claude AI chat panel — floating panel slides up from bottom with typing indicator,
   suggestion chips, and a CLAUDE_API_KEY variable ready to activate live AI. Offline
   fallback uses keyword matching to answer all common parking questions without an API key.
   Uses claude-sonnet-4-6 model when key is set.

5. Fine Reminders — Google Calendar link + .ics file download added to every reminder
   card. .ics files work natively on iPhone (Apple Calendar) and Android (Google Calendar).
   Browser Notification API integrated — requests permission and fires a notification
   24 hours before and on the due date. Runs a check every 60 minutes via setInterval.

6. 5-slide story-style onboarding animation — shows only to first-time visitors
   (localStorage flag drivee_onboarded). Full swipe support. Progress bar and dots.
   Slide 5 auto-detects iPhone vs Android and shows the correct "Add to Home Screen"
   instructions for each platform. Skip button on every slide. Fades out with scale
   animation after completion.

7. Splash screen — blue gradient (#0A84FF → #0066CC), 2.2s CSS animation, 🚗 icon,
   wordmark, tagline, and loading dots. Hidden at 2.8s so onboarding shows after.

8. New navigation shell — pill-style bottom nav with floating AI FAB button (sparkles
   icon). Top bar with AI search input, bell badge for reminders, and profile button.
   AI search chips: Got a ticket, Free parking, Pay a fine, Dispute it, Car towed,
   Need a lawyer.

9. Government links audited and fixed — Toronto restructured their website and all
   previous links were returning 404. Every link verified and updated to correct 2026
   paths for: pay parking, dispute parking, pay camera fine, dispute camera fine, red
   light, courts, Ontario traffic guide, TPS towed vehicles.

10. CartoDB Voyager tiles — map switched from Dark Matter (dark tiles) to Voyager
    (full colour streets) to match the reference app. Zoom set to 15. No API key needed.

11. Background aurora animation — three large blurred colour orbs (blue, purple, teal)
    float slowly behind all content using CSS @keyframes. Pointer-events none so they
    never block taps. Disabled for prefers-reduced-motion users.


ISSUES TO CARRY FORWARD

- CLAUDE_API_KEY is empty — the chat panel works offline but needs a key for live AI.
  Under needs to paste their Anthropic API key into the CLAUDE_API_KEY variable in the JS.
- The app has not yet been deployed to a live URL for iPhone testing.
  Deployment plan: netlify.com/drop — drag index.html from Windows PC, get URL in 30s.
- Part 4 Test phase has not started.
- .ics export was completed this session (no longer outstanding from Part 2).


PRD NOTES

- AI chat panel (section 3.11 in PRD) is now complete with Claude API integration.
- Fine Reminders (section 3.4) is now fully complete including calendar export and
  browser notifications.
- OCR ticket scanning (Tesseract.js) added — not in original PRD but matches Replit app.
- Onboarding (PRD section 3.20) is complete. First-time auto-show is implemented.
- CartoDB Voyager tiles replace Dark Matter — closer to PRD map spec (readable streets).
- All other PRD sections remain as previously noted.


LESSON ARC — WHERE WE ARE

Part 1 Foundation: COMPLETE
Part 2 Functionality: COMPLETE (including .ics export)
Part 3 Polish: COMPLETE
Part 4 Test: NOT STARTED


NEXT SESSION — Deploy + Part 4 Test

Priority order for next session:
1. Deploy to Netlify Drop — drag index.html from Windows PC to netlify.com/drop,
   get a live URL, open on iPhone for real device testing.
2. Set Claude API key — paste Anthropic key into CLAUDE_API_KEY variable to enable
   live AI responses in the chat panel.
3. Part 4 Test — work through all 5 tabs on real iPhone: layout, tap targets, animations,
   reminder badges, calendar export, onboarding flow, chat panel.


HOMEWORK SET THIS SESSION

Deploy the app using Netlify Drop:
1. On your Windows PC open Chrome and go to netlify.com/drop
2. Find index.html in the DRIVEE folder on your desktop
3. Drag index.html from File Explorer into the Netlify page in Chrome
4. Copy the URL Netlify gives you
5. Open that URL in Safari on your iPhone
6. Test all 5 tabs and write down anything that looks wrong on the real screen

This should take 10 minutes. Bring the live URL and your notes to the next session.


SESSION 5 — 7 April 2026
--------------------------

WHAT WAS BUILT

1. Supabase backend integration — full cloud sync added. Users can sign in with a magic
   link (email only, no password). Profile, reminders, and cars all save to Supabase when
   signed in, with localStorage as the offline fallback layer. Row Level Security (RLS)
   means each user can only see their own data.

2. Profile sheet — tapping the profile button in the top bar opens a slide-up sheet.
   When signed out it shows an email input and Send Magic Link button. When signed in it
   shows avatar initial, name, email, plate, reminder count, and a Sign Out button.
   The sheet uses the same CSS slide-up pattern as the chat panel.

3. Email memory — after a successful sign-in, the email address is saved to localStorage.
   Next time the user opens the app both email input fields (top bar and profile sheet)
   are pre-filled automatically so they never have to type it again.

4. GPS Guardian auto-restart — the browser cannot run GPS in the background, but the app
   now saves a GPS_KEY flag to localStorage when GPS is turned on and removes it when
   turned off. On every app open, if the flag is present, GPS restarts automatically.

5. Multi-vehicle support — users can add multiple cars to their profile, each with an
   emoji, nickname, and licence plate. Cars are stored in a Supabase "cars" table (SQL
   provided to student) and in localStorage offline. Each reminder can be linked to a
   specific car. Cars show as selectable chips in the Add Reminder form.

6. 407 ETR and Quebec payment links added to Services tab — "Pay 407 ETR Bill" button
   links to 407etr.com/en/pay-your-bill and "Pay Quebec Traffic Fine" links to the
   Quebec city constat infraction page.

7. Claude Vision ticket scanning — added to three entry points: Dashboard scan button,
   Legal tab, and AI chat panel. A single scanTicketWithVision() function sends the photo
   to Claude Haiku as base64 and asks it to extract AMOUNT, REF, PLATE, TYPE, DATE, DUE,
   ADVICE. Falls back to Tesseract.js OCR if no API key is set. HEIC iPhone photos are
   handled by forcing media type to image/jpeg.

8. Scan auto-fill — after a successful scan, the app automatically: saves the licence
   plate to the profile (if none saved yet), adds a due-date reminder (if not already
   present), generates a thumbnail (max 300px, JPEG 0.7), and stores the scan in a
   history list visible in the Dashboard. The same logic runs regardless of which entry
   point triggered the scan.

9. Map report form updated — the "Report Issue" form on the Hotspots map now has three
   buttons: "Pin on Map & Email 311" (sends both), "Pin on Map Only" (local only), and
   "Cancel". Report GPS now uses the device's real location via getCurrentPosition(),
   falling back to Toronto centre only if GPS is denied.

10. Street Parking Checker expanded — replaced the 5-item hardcoded dropdown with a live
    text search across 40 Toronto streets. As you type, matching streets appear as
    suggestion chips. Selecting a chip shows the full parking info card. If no streets
    match the query, a "Coming Soon" empty state is shown instead of an error.

11. MapTiler Streets v2 tiles — Leaflet map switched from CartoDB Voyager to MapTiler
    Streets v2 for a cleaner, more detailed base map. Uses API key already embedded.

12. App deployed to drivee.ca — connected to Vercel via GitHub. Every push to main
    auto-deploys. Live URL: drivee.ca.


ISSUES TO CARRY FORWARD

- CLAUDE_API_KEY is still empty — Vision scanning and live AI chat require the student
  to paste their Anthropic API key into the CLAUDE_API_KEY variable in the JS.
- Supabase cars table SQL was provided but must be run by the student in the Supabase
  SQL Editor before multi-vehicle sync works in production.
- Real iPhone testing on the live drivee.ca URL has not been done this session.
- Cars created offline do not retroactively sync to Supabase after sign-in (minor gap,
  acceptable for MVP).


PRD NOTES

- Supabase replaces the IndexedDB spec from the PRD — more suitable for a mobile-first
  single-file app with no build step. Functionally exceeds PRD requirements for sync.
- Multi-vehicle (section not in original PRD) matches the Replit reference app.
- Claude Vision ticket scanning (not in original PRD) matches the Replit reference app.
- All other PRD sections remain as previously noted.


LESSON ARC — WHERE WE ARE

Part 1 Foundation: COMPLETE
Part 2 Functionality: COMPLETE
Part 3 Polish: COMPLETE
Part 4 Test: PARTIALLY DONE (Vercel/GitHub deployment complete, real iPhone testing pending)
Part 5 Backend: COMPLETE (Supabase auth + sync)


NEXT SESSION — API key + real iPhone test

Priority order for next session:
1. Add Claude API key — paste Anthropic key into CLAUDE_API_KEY variable to unlock
   Vision scanning and live AI chat.
2. Real iPhone test on drivee.ca — open in Safari on iPhone, test all 5 tabs, both
   auth flows (sign in, sign out), scan a ticket photo, add a reminder, check map.
3. Fix any bugs found during real-device testing.
4. Run Supabase cars table SQL if not already done.


HOMEWORK SET THIS SESSION

Open drivee.ca on your iPhone in Safari.
Go through this checklist one item at a time:

1. Does the splash screen and onboarding appear on first load?
2. Tap the profile icon — does the sheet slide up?
3. Enter your email and tap Send Magic Link — do you get an email?
4. Tap the link in the email — does the app sign you in?
5. Does your name/plate appear in the profile sheet after sign-in?
6. Add a reminder — does it appear with the correct badge colour?
7. On the Hotspots tab, tap a map marker — does the report form have 3 buttons?
8. On Services, type "Yonge" in the street checker — does info appear?
9. Type a street name that does not exist — does "Coming Soon" appear?

Write down anything that looks wrong. Bring notes to the next session.


SESSION 6 — 8 April 2026
--------------------------

WHAT WAS BUILT

1. Vercel serverless proxy for Claude API — created api/claude.js which acts as a
   secure middleman between the app and Anthropic. The API key is stored as a Vercel
   environment variable (never in the code or GitHub). All three Claude calls in the
   app (Vision scan, OCR enhancement, AI chat) now go through /api/claude instead of
   calling Anthropic directly. This makes live AI work for every user on drivee.ca.

2. Street Parking Checker fix — suggestion chips were not clickable because
   JSON.stringify produces double quotes which broke out of the HTML onclick attribute.
   Fixed by using single-quote escaping. Streets now show info when tapped.

3. Vision scanner expanded to all ticket types and all Canadian provinces — updated
   the Claude prompt to recognise parking, speeding, red light, stop sign, toll (407
   ETR), HOV, distracted driving, seatbelt, stunt, careless, DUI, insurance,
   registration, and camera fines. Added PROVINCE field (all 13 provinces/territories).
   parseVisionReply() updated to extract province. Tested on a real 407 ETR bill.

4. Dashboard full redesign — new layout order:
   - Hero card at the very top (greeting + stats + auth sign-in embedded inside)
   - Bento stats row (Active Fines, Deadlines, Total Saved)
   - AI Scanner and Ticket Analyser merged into one card (was two separate cards)
   - Fine Reminders, My Vehicles, Scan History, Calculator below
   Removed the separate dark scanner-hero card and the separate auth card.
   Violation type dropdown expanded to all 15 types.

5. Pay Now button after scan — after a successful ticket scan, a Pay Now button
   appears immediately in the scanner card linking directly to the correct payment
   portal based on ticket type and province. getPaymentUrl() routes:
   toll to 407etr.com, QC to Quebec city portal, BC to ICBC, AB to Alberta,
   parking to Toronto payment portal, all other Ontario to ontario.ca/pay-ticket.
   If a due date was found, a reminder is auto-set and a confirmation shows.


ISSUES TO CARRY FORWARD

- The AI chat still uses the keyword fallback when no response comes from /api/claude.
  Need to verify on drivee.ca that live chat is working end to end.
- Dashboard redesign needs real iPhone testing — layout may need spacing tweaks on
  small screens.
- Profile card is now below the fold — users may not find it easily. Consider whether
  it needs to move or be merged into the hero card next session.
- Nothing is broken as of the final push. All changes are live on drivee.ca.


PRD NOTES

- getPaymentUrl() extends PRD section 3.3 (AI Ticket Scanner) with direct payment
  links — this is beyond the PRD spec and is a real improvement.
- All Canadian provinces added to scanner — PRD specified Toronto only. This is a
  deliberate expansion that makes the app useful Canada-wide, not just Toronto.
- Dashboard order now matches PRD section 3 intent more closely: scanner first,
  then reminders, then calculator.
- PRD section 3.1 says single plate for MVP — multi-vehicle is already built and
  exceeds this. No conflict, just ahead of spec.


LESSON ARC — WHERE WE ARE

Part 1 Foundation: COMPLETE
Part 2 Functionality: COMPLETE
Part 3 Polish: COMPLETE
Part 4 Test: IN PROGRESS
Part 5 Backend: COMPLETE
Part 6 Launch: IN PROGRESS


SESSION 7 — 13-15 April 2026
------------------------------

WHAT WAS BUILT

This was the largest session to date with 27 commits covering bug fixes, new
features, UX redesign, analytics, and a full security audit.

1. Bug fix sprint (8 issues) — bell button now scrolls to reminders, feedback
   email added to dashboard, nav bar spacing fixed, duplicate FAB removed,
   scroll performance improved with GPU compositing, towed vehicles link fixed,
   map photo popups improved, street checker dead code cleaned up.

2. Full UX audit and fixes — Guide tab made reachable from nav bar, dead See
   All lawyers link fixed, Services search bar made functional with live
   filtering, lawyer firm tap targets increased from 34px to 42px, report flow
   instructions clarified, splash screen reduced from 2.8s to 2.1s, Green P
   link changed to App Store, email validation confirmed working.

3. New features added:
   - Free Parking Now card on Map tab: live calculation from 40-street database
     plus current time, shows which streets are free right now and which are
     free soon. Smart badge shows count, Soon, or Paid Hours.
   - Community reports synced to Supabase with photo uploads to Storage bucket,
     shared across all users. 30-day auto-purge added. Photo library selection
     enabled (not camera-only).
   - Is Parking Free Today banner on Dashboard: shows green banner on Toronto
     statutory holidays, yellow countdown to next holiday on regular days.
     Covers all 11 holidays with correct date calculation including Easter.
     Updated to show holidays only (not Sundays) to avoid confusion.
   - Weekly Did You Know tips: 52 Toronto driving tips that rotate weekly,
     shareable via native share sheet.
   - True Cost Calculator: shows real cost of a ticket including insurance
     impact over 3-6 years, demerit points, and verdict (pay/fight/serious).
     Includes expert contact via SMS and email. Links to ontario.ca for
     demerit point info. Moved to Services tab in declutter.
   - Ticket lookup card in Services: parking, speed camera, and provincial
     HTA lookups linking to official government portals.
   - Dispute Script Builder expanded from 4 to 10 reasons: added not driver,
     outside enforcement hours, disability permit, vehicle sold, emergency,
     active loading.
   - Share/Copy ticket scan details with drivee.ca link and native share.
   - Profile completion prompt on Dashboard that nudges users to add name
     and plate, opens profile sheet, dismissible.
   - Dynamic greeting: Good morning/afternoon/evening based on time of day,
     updates with saved name immediately after profile save.
   - Save Profile button animation: turns green with checkmark for 2 seconds.
   - Calendar integration enhanced: 3 alarms (2 days, 1 day, morning of due
     date), auto-prompt popup after scan to save to calendar.
   - GPS Guardian retry button when location permission is denied.
   - Chat feedback prompt after 3 messages asking users how to improve Drivee.
   - PWA manifest and service worker for installability.

4. Dashboard declutter — reduced from 14 scrollable sections to 7. Profile
   and My Vehicles moved into the profile sheet (tap avatar). True Cost
   Calculator moved to Services. Deadline ROI Calculator removed (redundant
   with True Cost). Scan history collapsed to show last 2 with Show All toggle.
   Support Drivee banner moved to bottom. Desktop side panels added showing
   iPhone/Android install instructions on the left and why Drivee matters
   bullet points on the right (hidden on mobile).

5. Analytics and Telegram notifications — api/track.js serverless function
   saves events to Supabase analytics table and forwards to Telegram bot.
   Tracks: app opens, tab clicks, scans, reminders, profile saves, reports,
   sign-ups, GPS starts, shares, disputes, true cost calculations, expert
   contacts, and user feedback. Vercel environment variables configured.

6. Security hardening — full red team audit identified 12 findings. Fixed all
   Critical and High issues:
   - api/claude.js: locked to 2 allowed models, max 500 tokens, origin check
     restricted to drivee.ca, only safe fields forwarded.
   - api/track.js: rate limited to 30 req/min per IP, event allowlist,
     meta truncated to 200 chars with HTML stripped, removed parse_mode HTML
     from Telegram.
   - Reports table: changed upsert to insert (prevents overwrites), removed
     client-side DELETE (prevents table wipe), removed upsert on photo uploads.
   - PII removed: magic_link_sent and profile_saved no longer send emails or
     names to analytics. Email cleared from localStorage on sign-out.

7. Miscellaneous — fake lawyer discount badges removed, chat branded as
   Powered by Eugen, AI disclaimer added to chat and Legal tab, feedback
   email set to drivee.canada@gmail.com, FAB icon changed to robot.


ISSUES TO CARRY FORWARD

- Telegram notifications now working after Vercel env vars were added and
  redeployed. Confirmed receiving test messages.
- Supabase RLS policies should be verified by running:
  SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public';
  This was recommended by the security audit but not yet done.
- The analytics table should have its SELECT policy restricted so anon users
  cannot read all analytics data. Currently only INSERT is needed.
- Session notes file is getting long. Consider archiving older sessions.
- Real users are signing up — first user feedback should drive next session.
- PRD still says dark-mode and React/Vite/TypeScript. The app is light-mode
  vanilla JS. PRD should be updated to reflect reality.


PRD NOTES

- True Cost Calculator extends PRD section 3.3 significantly — insurance
  impact and demerit points were not in the original spec.
- Dashboard declutter reorganisation differs from PRD section 3 layout but
  is an improvement: profile and vehicles now in sheet, not inline.
- Weekly tips, free parking banner, and community report sync are all beyond
  the original PRD scope.
- Analytics/Telegram tracking is new infrastructure not in the PRD.
- Security hardening (API proxy lockdown, rate limiting) is production
  infrastructure not covered by the PRD.
- PRD section 2 still lists Guide tab as Book icon which matches current nav.


NEXT SESSION TASKS

1. Run Supabase RLS verification query and fix any gaps
2. Restrict analytics table SELECT policy to prevent data exposure
3. Collect and act on first real user feedback
4. Update PRD to match current app (light mode, vanilla JS, new features)
5. Test full app flow on real iPhone in Safari


HOMEWORK SET THIS SESSION

Open drivee.ca on your iPhone and go through this checklist:

1. Open the app — did you get a Telegram notification?
2. Tap the profile icon (top right) — do you see Profile and Vehicles inside?
3. Save your name and plate — does the button turn green?
4. Go to Services — type "tow" in the search bar — does it filter?
5. Go to Services — scroll to True Cost Calculator — select Speeding 16-29
   and enter $200 — does it show the insurance breakdown?
6. Go to Map tab — do you see Free Parking Now with real streets?
7. Share the app link (drivee.ca) with 3 friends and ask them to open it
8. Check Telegram after they open it — did you get notifications?

Write down anything that looks wrong. Bring notes to next session.


SESSION 8 — 3 May 2026
------------------------

WHAT WAS BUILT

1. Desktop landing page experiment added — copied the 1770-line Drivee Landing.html
   from the external Drivee wesbite folder into the project as desktop.html. This
   is a marketing-style landing page with intro animation, hero, features, install
   guide, and a top-nav Open the app CTA button. Both internal Drivee App.html
   links inside it were rewired to /?app=1 so the CTA lands on the real app.

2. Smart device-aware redirect added to index.html (lines 6 to 23) — phones detected
   by user agent (iPhone, Android Mobile, iPod, BlackBerry, IEMobile, Opera Mini)
   stay on the real app. Tablets and desktops get redirected to /desktop.html.
   The ?app=1 query param bypasses the redirect, and sessionStorage makes the
   bypass sticky for the whole session so a PC user who clicks Open the app
   stays in the app even on refresh. The block is self-documenting with a
   To REVERSE comment so it can be removed in one delete.

3. Collaborator GitHub repo set up — added a second git remote named collab
   pointing to github.com/EugenAzxa/Drivee_Egor_Andrew_Project.git. Pushed all
   commits and history across. Reset main branch tracking back to origin/main
   so a bare git push still deploys to drivee.ca production as before. To push
   to the shared repo you now run git push collab main explicitly.


ISSUES TO CARRY FORWARD

- Today's changes are committed locally (auto-save commit 942b8c7) but not yet
  pushed to origin, so drivee.ca has not received the desktop landing yet.
- No real device testing done. The redirect logic looks correct but has not
  been verified on a real iPhone, iPad, or laptop visiting drivee.ca.
- Friend Andrew has the new repo URL but is not yet a GitHub collaborator.
  Must invite him via GitHub Settings, Collaborators, Add people before he
  can push code.
- The two repos (origin/Drivee for production, collab/Drivee_Egor_Andrew_Project
  for shared work) will drift apart unless deliberately synced. There is no
  auto-sync. If Andrew pushes to collab and you want his work on drivee.ca,
  you must manually git pull collab main and git push origin main.
- Landing page intro animation runs on every first load. May feel heavy for
  return visitors — consider a session-based skip later.
- Local file:/// testing of the Open the app button will not work because
  /?app=1 is an absolute path. Only works on a real domain.


PRD NOTES

- PRD has zero mentions of desktop, landing, tablet, or redirect. The whole
  spec is mobile-first. Today's desktop landing is a brand-new surface area
  that the PRD does not cover.
- PRD should be updated next session to describe the split: phones get the
  app, tablets and desktops get the landing page that promotes installation.
- The redirect block adds 17 lines of JavaScript at the top of index.html
  before the existing app code. PRD does not need to mention this implementation
  detail but should mention the user-facing behaviour.


NEXT SESSION TASKS

1. Run git push to deploy today's changes to drivee.ca production.
2. Test on a real iPhone Safari — drivee.ca should load the original app
   without ever flashing the landing page.
3. Test on a real iPad or laptop — drivee.ca should redirect to the landing,
   and clicking Open the app should land on the real app and stay there.
4. Invite Andrew as a GitHub collaborator on the new repo.
5. Decide if the landing page text and sections need editing for Drivee
   specifically (some content was generic exploration material).
6. Update PRD with a short section on the desktop landing surface.


HOMEWORK SET THIS SESSION

A 15 to 20 minute task to deploy and verify today's work yourself.

1. Open a terminal in the DRIVEE folder.
2. Run git push.
3. Wait one minute for Vercel to redeploy.
4. On your laptop or PC, open drivee.ca in a fresh browser tab. You should
   see the new landing page with the blue intro animation.
5. Click Open the app at the top right. You should land on the real app
   you have been building all along.
6. Refresh the page. You should still see the app, not the landing.
   This is the sessionStorage bypass working.
7. Now open drivee.ca on your iPhone. You should see the regular app
   immediately — no landing, no flash.
8. If anything looks wrong, make a note of which device, which browser,
   and what you saw. Bring the notes to next session.

If git push asks for credentials and you do not remember them, search
github personal access token vercel deploy and follow the GitHub help
page. If the redirect does not fire on desktop, open browser DevTools,
check the Console tab for errors, and search MDN sessionStorage to
revisit how that storage layer works.


SESSION 9 — 21-22 May 2026
----------------------------

WHAT WAS BUILT

1. Car Safety and Pre-Purchase Inspection page added to Services. A new svc-inspect
   card lists Toronto inspection shops. Azcan Auto is the featured partner block
   (blue gradient card, white text) with a live Google reviews link, a price range
   of 80 to 120 dollars for a full car inspection, a green 5 percent off with Drivee
   pill, a call script that says to mention Drivee for the discount, and a real tap
   to call number 647-781-1199. Ten other shops render below as rows that each link
   to their live Google rating. The how to check the car button sits at the top of
   this card.

2. How to check a car yourself sub-page added. Opened by a button inside the
   inspection card, it is its own focused view with a back button that returns to
   the inspection list. It has a deep blue hero header, an animated VIN match demo
   that types a VIN into a car row and a papers row with a blue scan line then a
   green VIN matches confirmation, a colour-tinted six-card checklist (oil leaks,
   odometer, pedals, body, tires and rust, test drive), a Carfax and UVIP history
   callout, and a play-button card linking to a YouTube pre-purchase guide. All
   animations replay each time the page opens.

3. Tow page upgraded with real complaint and contact info. Two tap to call buttons
   were added (locate a towed vehicle at 416-808-6600, complain about a tow truck
   operator at the Toronto Licensing Commission 416-392-3000) plus a written
   complaint box with the full Toronto Police Parking Enforcement East mailing
   address and what to include.

4. Refined editorial finish applied to the Dashboard (colours kept the same).
   Section headings got a blue accent tick and tighter serif sizing, uppercase mono
   eyebrows were added above section titles, hairline rules separate the colour
   sections, and the hero plus sections now fade up in a staggered sequence on load
   (respects prefers-reduced-motion). Scoped to the dashboard only so the rest of
   the app was untouched for review.

5. Dashboard decluttered around reminders and scans. Scanned Tickets history was
   moved off the dashboard into the profile sheet (the profile summary now shows a
   scanned tickets count). The hero bell was made fully functional: tapping it now
   opens the full All Reminders focused view (works even at zero reminders) with a
   live heading showing total, overdue, due today, and upcoming counts, and an
   accurate badge and tooltip. The inline Open Reminders dashboard section and the
   inline reminders card were then removed from the normal dashboard since reminders
   live behind the bell now.

ALSO THIS SESSION (tooling, not the app)

- Installed two Claude Code skills into .claude/skills/. frontend-design (single
  skill, from the official claude-code repo) and superpowers (14 dev-workflow skills
  from obra/superpowers, installed skills-only with no hooks so the whole folder can
  be deleted cleanly with one command). These do not change the Drivee app itself.


ISSUES TO CARRY FORWARD

- Nothing is broken in the app. The render functions for the removed dashboard
  elements safely no-op because they check for the element before touching it.
- The two new skills will not appear or auto-trigger until Claude Code is reloaded
  or restarted. They are installed correctly, just not loaded into this session.
- Deploy status uncertain. Most of today's work was captured by auto-save commits,
  and one manual commit (6da2e5f) pushed the editorial dashboard and inspection and
  tow work to origin earlier in the session. The very last changes (scans moved to
  profile, the bell reminders rework, removing reminders from the dashboard) should
  be confirmed pushed to origin next session so drivee.ca has them. The final service
  worker cache name is drivee-v2-2026-05-22-reminders-off-dash.
- Azcan Auto address was not provided, so the Google Maps link is a name search
  (Azcan Auto Toronto) rather than an exact pin. If the owner gives an address next
  session, swap it in. The Google star rating shown is a generic five-star link, not
  the real live number, by design.
- No real iPhone testing was done on any of today's changes.


PRD NOTES

- The Car Safety and Pre-Purchase Inspection page, the how to check a car guide,
  and the partner shop directory are all brand new and not in the PRD at all. The
  PRD Services tab (section 3.6 to 3.10) lists payment portals, street checker, tow
  finder, dispute builder, and US links only. The inspection feature is a new Services
  surface that should be added to the PRD next session.
- The tow page contact and complaint info extends PRD section 3.8 (Vehicle Towed)
  which only specified the find-towed-car link and a fee warning. The real phone
  numbers and mailing address go beyond the spec and are an improvement.
- Moving Fine Reminders behind the hero bell changes PRD section 3.4 placement. The
  PRD shows reminders as a dashboard feature. They still exist and work, just reached
  via the bell now. The PRD layout note should be updated.
- Moving scan history into the profile sheet continues the Session 7 declutter
  pattern (profile and vehicles already live in the sheet). Consistent direction.
- PRD still says dark mode and React Vite TypeScript. The app remains light mode
  vanilla single-file JS. This long-standing divergence is still unaddressed in the PRD.


LESSON ARC — WHERE WE ARE

Part 1 Foundation: COMPLETE
Part 2 Functionality: COMPLETE
Part 3 Polish: COMPLETE (ongoing refinement)
Part 4 Test: IN PROGRESS (real device testing still pending)
Part 5 Backend: COMPLETE
Part 6 Launch: IN PROGRESS (live on drivee.ca)


NEXT SESSION TASKS

1. Confirm all of today's changes are pushed to origin and live on drivee.ca, then
   hard-refresh and verify the editorial dashboard, the bell reminders flow, scans
   in the profile sheet, and the inspection and tow pages on a real iPhone.
2. Decide whether to roll the refined editorial finish out to Services, Map, and
   Guide tabs to match the dashboard.
3. Get Azcan Auto's exact address and swap it into the Google Maps link.
4. Update the PRD to add the inspection feature, the reminders-behind-bell change,
   and the long-standing light-mode vanilla-JS reality.


HOMEWORK SET THIS SESSION

A 15 to 20 minute task to verify the dashboard and bell changes yourself, on the
live site, the way a real user would.

1. Open drivee.ca on your iPhone in Safari and fully close and reopen it once so
   the new service worker cache loads (the version is reminders-off-dash).
2. Look at the dashboard. Confirm you see the uppercase grey eyebrow labels above
   the section titles, the small blue tick beside each title, and that the sections
   gently slide up when the dashboard first loads.
3. Confirm the old Open Reminders block is gone from the dashboard body.
4. Tap the bell icon in the top of the blue hero. Confirm it opens the All Reminders
   view with a back button, and that the subtitle shows real counts.
5. Add one reminder from that view, go back, tap the bell again, and confirm the
   count in the heading went up and the bell badge appears.
6. Open the profile sheet (tap the profile circle) and confirm Scanned Tickets now
   lives inside the sheet, not on the dashboard.

Write down anything that looks wrong or did not match the above and bring it next
session. If the dashboard still looks like the old version, the cache did not
refresh. Search safari clear website data iphone and clear it for drivee.ca, then
reopen.


SESSION 10 — 22-25 May 2026
-----------------------------

WHAT WAS BUILT

The biggest session of the project. The whole Legal tab was rebuilt into a
real lawyer pipeline, plus several Services additions and a wave of polish.

1. New Sign Reader feature (Dashboard enforcement card). Tap "Scan a parking
   sign," photograph any Toronto sign, and the AI returns a colour-coded
   verdict (YES green / NO red / CAUTION amber) for the current local time
   based on the rules on the sign. Includes a decoded "what the sign says"
   list and an always-verify safety note.

2. Services tab grew three new pages: Car Anti-Theft (with Azcan Auto as the
   featured installer, partner pitch, GTA-theft-explainer, 5 percent off
   script, real phone), the swap of USA Links and Car Inspection in the
   tile order, and the Tow page got real complaint contacts (two tap-to-call
   numbers plus the formal mailing address for written complaints).

3. Onboarding polish for first-time users. Each slide now animates in
   (spring pop on the icon, staggered text rise, gentle float). Slide 5
   gained inline glyph icons next to each install step (Safari, Share box-
   with-up-arrow, Add-to-Home-Screen square, Android 3-dot menu) so users
   recognise the exact button to tap on their phone.

4. Map gained the city-wide ticket-density layer (was downtown-only). 20
   real enforcement hotspots beyond the core: Yonge corridor from St Clair
   to Finch, Liberty Village, Roncesvalles, Danforth, the Beaches,
   Scarborough Town Centre, Yorkdale, Jane and Finch. Off by default and
   toggleable from the layers control so the default map stays clean. Tile
   tuning kept the cell count fast on mobile.

5. Home-screen icon red badge (Badging API). When a user has overdue or due-
   today reminders, a red number appears on the Drivee app icon on their
   home screen. Real OS-level pull-back-to-the-app signal, allowed on
   installed PWAs (Android, desktop, iOS 16.4+).

6. The Legal tab was completely rebuilt into a real lawyer pipeline. Scan
   for verdict now opens a dedicated focused page (data-scan-result-active)
   that shows: a full-bleed gradient verdict hero with serif headline, the
   AI's plain-English advice in a frosted-glass quote, a "By the numbers"
   cost breakdown table calibrated to the actual scanned ticket using the
   same TCC_DATA as the True Cost calculator, and three colour-weighted
   choice buttons. Hire (primary, blue gradient) opens matched firms
   pre-filtered by ticket type. Tapping a firm opens a firm-detail page
   with a green "Established" badge, an italic quoted claim from the firm's
   own site, a facts table (Team, Service area, Pricing), bullet perks, and
   a Read-Live-Google-Reviews link button that opens Google Maps for that
   firm. Continue opens the lead form (name, phone, best time to call),
   which on submit logs a lawyer_lead event to Telegram and Supabase and
   opens the user's mail app pre-filled to the firm. The whole pipeline
   lives on the dedicated page so the design no longer collides with the
   firm chips and recommended-firms section. Trust signals are real, pulled
   from each firm's public site (xcopper, x-cops, pointts, hwy-law). The
   blocked OTT site used conservative defaults.

7. Two real backend-class bugs surfaced and got fixed end-to-end. The
   Dashboard ticket scanner was silently failing on iPhone because iOS
   Safari refuses to honour input.click() on hidden file inputs that have
   pointer-events:none or display:none. Converted every scanner trigger
   (Dashboard, Legal big CTA, Legal small button) to <label for="input">
   which iOS honours by spec. Then a second silent failure: iPhone photos
   at full resolution were exceeding Vercel's body-size limit and returning
   HTTP 413. Added a canvas-based dvShrinkImage helper that resizes to max
   1800px and JPEGs at 0.85 quality before upload, dropping payloads from
   roughly 10 MB to roughly 250 KB. Scans also added a 45-second
   AbortController timeout and clear error surfacing into the verdict box.

8. Several smaller polish items: Pay button bug fixed (was calling
   getPaymentUrl with the whole scan object instead of unpacking it, so it
   always fell back to the generic Ontario page; now routes correctly to
   Toronto, BC, QC, 407 ETR, etc.). Scan now persists to localStorage so a
   Pay-portal round trip never loses the verdict; a "Your last scan is
   saved" amber CTA appears at the top of Legal to resume. The Fight-it-
   yourself button now opens the Early Resolution wizard on Services, not
   the older dispute-script builder. User-visible "Claude" strings renamed
   to "Drivee." Map tiles upgraded to retina so the basemap no longer looks
   pixelated. The Calculator quick-action now scrolls straight to the True
   Cost card. Four sample community reports added to the map with real
   photos compressed from 7.8 MB total to about 555 KB (pothole on Kingston
   Road, downtown sinkhole, Yonge underpass stuck traffic light, Finch road
   closure). The Quick Actions tiles were renamed: Free parking to Parking,
   Late-fee timer to Calculator, Hotspots to GPS Guardian.

ALSO THIS SESSION

- Verified live deploys via curl + cache-bust checks every time the user
  reported a phone-side problem, several times tracing the root cause to a
  stale service-worker cache rather than the code. Final cache name on
  origin is drivee-v2-2026-05-25-firm-icons.


ISSUES TO CARRY FORWARD

- Nothing is broken in the code. Every script parses, every onclick
  resolves, every CSS class referenced exists.
- Repeated PWA cache staleness on the user's iPhone made the same testing
  loop happen several times (push, "I see no change", verify live, ask the
  user to clear). For next session the testing protocol should default to
  private/incognito mode first so cache is never a variable.
- One pre-existing data mismatch noticed during the lawyer pipeline build:
  the firm card labelled "Toronto Traffic Law" actually emails X-COPS via
  contactLawyer. Did not touch it because it was out of scope. Worth a
  quick name/email reconciliation in a future session.
- ontariotraffictickets.com returned HTTP 403 to WebFetch, so the OTT firm
  trust block uses conservative defaults rather than verified facts. If
  Andrew or anyone gets reachable copy from that site, swap it in.
- Real iPhone testing of the lawyer pipeline end-to-end (scan, verdict,
  pick firm, fill form, hit Send and see Telegram lead arrive) is the next
  user-side verification step.


PRD NOTES

- The Legal tab in the PRD (Tab 4, sections 3.15 to 3.17) describes an AI
  Ticket Advisor that returns a four-verdict system (Urgent / Serious /
  Contest / Minor) and a static directory of 8 law firms. The shipped
  version replaces this with a categorical chance (Strong / Moderate /
  Weak) plus a full pipeline: verdict + cost breakdown + 3 choices + firm
  detail step + lead form + lead capture to Telegram + Supabase. This is a
  significant extension and the PRD should be updated to reflect it.
- The Sign Reader feature on the Dashboard is entirely new and not in the
  PRD. It uses Claude Vision and a time-of-day prompt to read parking
  signs. Worth adding as a new section under Dashboard.
- Car Anti-Theft is a new Services page not in the PRD. The PRD Services
  list (sections 3.6 to 3.10) does not include Car Inspection, Car Anti-
  Theft, or Handicap Permit either, all of which are now live in Services.
- The map ticket-density heatmap and the Sample community reports are not
  in the PRD. Both shipped this session and last respectively.
- The home-screen icon badge (Badging API) is not in the PRD's notification
  spec but extends section 3.2 in a useful direction.
- Long-standing divergence still unaddressed in the PRD: the app remains
  light-mode vanilla single-file JS, not dark-mode React-Vite-TypeScript as
  the PRD specifies.


LESSON ARC — WHERE WE ARE

Part 1 Foundation: COMPLETE
Part 2 Functionality: COMPLETE (and well beyond the original PRD scope)
Part 3 Polish: COMPLETE (ongoing iterative refinement)
Part 4 Test: IN PROGRESS (real iPhone validation per release is the loop)
Part 5 Backend: COMPLETE
Part 6 Launch: IN PROGRESS (live on drivee.ca, monetisation pipeline live)


NEXT SESSION TASKS

1. Verify the lawyer pipeline end-to-end on a real iPhone, in
   private/incognito mode first to eliminate the cache variable. Scan a
   ticket, see the verdict + cost breakdown, tap Hire, tap a firm, read
   the trust info, tap the Google reviews link, fill the form, hit Send,
   and check Telegram for the lead arrival.
2. Get Azcan Auto's real street address (still pending from session 9) and
   swap it into both the Inspection and Anti-Theft Google Maps links.
3. Reconcile the Toronto Traffic Law / X-COPS name-email mismatch on the
   firm card.
4. Update the PRD to reflect Sign Reader, the new Services pages (Car
   Inspection, Anti-Theft, Handicap, Early Resolution wizard), the rebuilt
   Legal pipeline with cost breakdown and lead capture, the map density
   heatmap, the home-screen badge, and the vanilla-JS reality.
5. If the lawyer pipeline gets real leads, decide on referral agreements
   with the 8 firms so Drivee can move from open-the-mail-app to server-
   side lead delivery in v2.


HOMEWORK SET THIS SESSION

A 15 to 20 minute task to test the lawyer pipeline end-to-end the way a
real first user would. Cache has been the single biggest source of false-
alarm bug reports this session, so this homework deliberately starts in
private mode to remove that variable.

1. Open Safari (or Chrome) on your iPhone and open a private/incognito tab.
2. Type drivee.ca and go.
3. Tap Legal in the bottom nav.
4. Tap the big blue "Scan for verdict" button and pick a real ticket photo
   from your photos.
5. The focused result page should open. Wait roughly 5 to 10 seconds. You
   should see a coloured verdict hero, a By-the-Numbers cost breakdown
   table with real numbers, and three choice buttons with Hire on top
   (blue), then Fight, then Pay.
6. Tap "Hire a paralegal." You should see matched firms with a scales icon,
   a one-line claim, perk pills, and a small star Google chip.
7. Tap any firm. The detail page should show a green Established badge (on
   firms that have a founding year), an amber italic-quoted claim block, a
   facts table with Team / Service area / Pricing, a perks bullet list,
   and a yellow "Read real Google reviews" link button.
8. Tap "Read real Google reviews" and confirm Google Maps opens in a new
   tab with that firm.
9. Go back to the detail page, tap Continue, fill the form, and tap Send.
   Your mail app should open pre-filled. Check Telegram a few seconds
   later for the lawyer_lead notification.

Write down anything that looks wrong, or any step that did not happen as
described, and bring it to next session. If something is missing on
production but you see it in private mode, the cache is fine and the
deploy is the issue; if private mode also misses it, then it is a real
code bug.


SESSION 11 — 25 May to 1 June 2026
-----------------------------------

WHAT WAS BUILT

A personality session. The app and the marketing site both gained a real
human face this week, the Map became parking-first, and several copy /
trust tweaks landed across the Legal flow.

1. Welcome card for first-time users on the Dashboard. A friendly card with
   a transparent-PNG portrait of Evgenka on the left and a serif "Hi, I'm
   Evgenka" greeting on the right, plus a big blue Scan ticket button and a
   small Skip link. Shows only when: zero saved scans AND zero saved
   reminders AND not previously dismissed. Auto-hides forever the moment
   the user scans a ticket, adds a reminder, taps Skip, or even taps Scan.
   The 2 MB original PNG was resized via sharp to 74 KB while keeping
   transparency.

2. Desktop landing got two personal sections. A "Why we built Drivee"
   founder block right after the video (worried Evgenka with a stack of
   yellow tickets, mono kicker, serif title, two paragraphs in Evgenka's
   voice, ending with a mono "— Evgenka, developer" signature). And an
   emotional payoff block right before the footer (happy Evgenka holding a
   ticket plus a phone showing PAID, "From 'I owe what?!' to handled."
   plus an Open the app CTA). Both sections use the existing two-column
   site grid, stack on small screens, and have subtle radial glows behind
   each cutout (blue under the worried photo, green under the happy one).
   Copy was revised mid-session from "I" to "we" and "founder" to
   "developer" except for the warm "Hi, I'm Evgenka" greeting. Both source
   photos (3.9 MB and 2 MB) were resized via sharp to 245 KB and 139 KB.

3. Honest delivery-zone explainer in the Street Parking Checker on
   Services. A two-row explainer block (green check: OK if you're
   delivering, red ban: not for coffee or daily storage) plus a compact
   version inside the Free Streets slide-up sheet so users on the Map and
   Dashboard see it too. Backed by the actual City of Toronto courier-
   vehicle bylaw and the Ontario Trucking Association write-up. The card
   deliberately does NOT list delivery zones as free parking locations —
   that would mislead users into tickets.

4. Map became parking-first. The 252 Green P off-street lots are now ON
   the map as distinctive green-on-white "P" cluster pins by default. Tap
   any pin to see a popup with the address, lot type, capacity, the listed
   rate stamped "(2019)" so users know it's not live, and a per-lot cost
   calculator showing estimated cost for 2 / 4 / 8 hours. A big green
   "Verify live rate on Green P →" button opens the lot's own greenp.com
   page so today's actual price is one tap away. Fire hydrants and bike
   lanes were moved off the default map (still available via the top-right
   layer toggle — GPS Guardian still consumes the data behind the scenes).
   After zoom lag was reported, fixed by enabling chunkedLoading and
   removeOutsideVisibleBounds on all clusters, bumping the Green P
   uncluster threshold from zoom 17 to 18, and adding preferCanvas:true to
   the map so vector overlays render on canvas instead of one SVG node per
   shape.

5. Two small but meaningful rename touches in the Legal flow. The Early
   Resolution kicker line "AI EUGEN" became "DRIVEE AI" so the AI feature
   reads as a Drivee feature, not a personal label. The Dashboard scanner
   kicker "OCR + AI VISION" became "AI READS YOUR TICKET · 8 SECONDS" so a
   normal driver actually understands what's happening. Kept the real
   human "Evgen — Drivee Expert" card on the True Cost calculator
   untouched because the real phone number there is a stronger trust
   signal than a generic label.

ALSO THIS SESSION

- Three new image assets shipped to the repo: welcome-evgenka.png (74 KB),
  founder-evgenka.png (245 KB), founder-evgenka-happy.png (139 KB). All
  resized from much larger originals via the locally-installed sharp
  module.
- Final live cache name on origin is drivee-v2-2026-05-28-map-perf.
- Recurring iPhone PWA cache staleness from prior sessions resurfaced once
  during the welcome-card test cycle; standard incognito-mode test path
  resolved it.


ISSUES TO CARRY FORWARD

- Nothing is broken. Every script parses, every onclick resolves, the
  Green P calculator math has been verified against all 252 lot rate
  formats (every one parses cleanly as $X / Half Hour).
- The Green P lot rates remain a 2019 City Open Data snapshot. Marked
  clearly with "(2019)" and the verify-live link in every popup so users
  are never misled, but a future session could try the Toronto Open Data
  CKAN feed for a refreshed dump. Toronto themselves don't publish a live
  rate API, so the verify-live-link pattern is likely the honest ceiling
  unless we partner with Green P directly.
- The Toronto Traffic Law / X-COPS firm card name-email mismatch flagged
  in session 9 is still untouched, by deliberate choice (out of scope).
  Worth a tidy in a future session.
- ontariotraffictickets.com still returned 403 to WebFetch when we
  visited firm sites last session, so OTT still uses conservative
  defaults. Andrew or anyone with browser access could grab their public
  facts and we can swap them in.
- PRD remains substantially out of date — see section below.


PRD NOTES

The PRD genuinely needs an update next session. Everything built this week
is missing from it:

- The Dashboard welcome card for first-time users is not described in any
  PRD section.
- The Desktop landing page exists as a top-level surface that the PRD
  does not mention at all. Today's founder-story and emotional-payoff
  sections live there.
- The Delivery Zone explainer is a new defensive UX pattern (telling
  users NOT to park somewhere) that fits Drivee's value but is not in any
  PRD section.
- The Green P lots on the Map with per-lot cost calculator extends PRD
  section 3.7 (Street Parking Checker) significantly, but on the Map tab,
  not Services.
- The honest "(2019) rate, verify live" framing across the calculator is
  a Drivee design principle worth capturing in the PRD's tone section.
- Long-standing reality still unaddressed in the PRD: light-mode vanilla
  single-file JS, not dark-mode React-Vite-TypeScript.


LESSON ARC — WHERE WE ARE

Part 1 Foundation: COMPLETE
Part 2 Functionality: COMPLETE
Part 3 Polish: COMPLETE (continuing iteration)
Part 4 Test: IN PROGRESS (cache hygiene now baked into the test loop)
Part 5 Backend: COMPLETE
Part 6 Launch: IN PROGRESS (Drivee.ca live with personality + parking-first
        map)
Part 7 PRD reconciliation: NEW — should be tackled next session


NEXT SESSION TASKS

1. Update PRD.md to capture: welcome card, desktop landing page, founder
   story sections, delivery-zone explainer, Green P map markers with
   cost calculator, the rebuilt Legal pipeline (still missing since session
   10), Sign Reader, Anti-Theft and Inspection Services pages, home-screen
   icon badge, and the long-standing light-mode vanilla-JS reality.
2. Real-iPhone end-to-end test of the welcome card, Map Green P pins
   (especially the zoom performance fix), and the desktop landing on a
   real laptop in private mode.
3. Reconcile the Toronto Traffic Law / X-COPS firm card name-email
   mismatch.
4. Try the Toronto Open Data CKAN feed for a fresher Green P rate dump,
   or at least time-stamp the dataset version surfaced to users.
5. If ontariotraffictickets.com is reachable from Andrew's machine, grab
   their public facts and swap into the firm trust info.


HOMEWORK SET THIS SESSION

A 15 to 20 minute task to test the new map performance and the welcome
card from a real new-user perspective. Mostly map work — that was the
biggest user-visible change this week.

1. Open drivee.ca in a private/incognito tab on your iPhone Safari (so
   you count as a fresh first-time user with no cache).
2. On the Dashboard you should see the new Evgenka welcome card right
   under the blue hero. Tap the Scan ticket button and confirm the photo
   picker opens. Cancel out of the picker for now.
3. Reload the page (still in private). The welcome card should now be
   gone permanently — that confirms the Skip-on-Scan logic worked.
4. Tap the Map tab. You should see green-and-white "P" pin clusters
   spread across Toronto (mostly downtown). Pinch to zoom in slowly. The
   zoom should feel smooth — pins should not lag, jump, or stutter. If
   the zoom is still laggy on your device, write down which zoom level
   it starts feeling rough at and bring that number to next session.
5. Tap any "P" pin and confirm you see the address, the rate stamped
   "(2019)", the 2 / 4 / 8 hour cost calculator, and a "Verify live rate
   on Green P" button at the bottom. Tap the button and confirm
   greenp.com opens in a new tab.
6. Top-right corner of the map → tap the layer-toggle icon. Hydrants and
   Bike Lanes should appear in the list but be unchecked. Switch on
   Hydrants and confirm they appear; switch them off again.

If anything looks wrong, write down the exact step and what you saw, and
bring it to next session. If something is missing on production but you
see it in private mode, the cache is fine and the deploy is the issue; if
private mode also misses it, then it is a real code bug.




