#!/usr/bin/env python3
"""
Generates the /signs/<slug>/ deep pages.

Each one targets a single query cluster that /parking-signs/ only covers in
passing. The sign illustrations are read out of parking-signs/index.html at
build time, so that page stays the single source of truth for the artwork.

Run from the repo root:  python3 build-signs.py
"""

import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
HUB = os.path.join(ROOT, 'parking-signs', 'index.html')
SITE = 'https://www.drivee.ca'

# Facts below are quoted from the City of Toronto's own pages:
#   toronto.ca .../parking-by-laws-regulations/parking-regulations/
#   toronto.ca .../parking-violations/dispute-your-parking-violation/
CITY_REGS = ('https://www.toronto.ca/services-payments/streets-parking-transportation/'
             'applying-for-a-parking-permit/parking-by-laws-regulations/parking-regulations/')


def sign_svg(name):
    """Pull one sign illustration out of the hub page by its <h3> title."""
    html = open(HUB, encoding='utf-8').read()
    for card in re.findall(r'<div class="sign-card">(.*?)\n    </div>', html, re.S):
        h3 = re.search(r'<h3>(.*?)</h3>', card, re.S)
        if h3 and h3.group(1).strip() == name:
            return re.search(r'<svg.*?</svg>', card, re.S).group(0)
    raise SystemExit('sign illustration not found in hub page: %r' % name)


# ──────────────────────────────────────────────────────────────────────────
# Page content
# ──────────────────────────────────────────────────────────────────────────

PAGES = [
{
 'slug': 'no-standing',
 'sign': 'No Standing',
 'title': 'What Does a No Standing Sign Mean in Toronto? — Drivee',
 'h1': 'What a No Standing sign actually means in Toronto',
 'crumb': 'No Standing',
 'desc': ('A No Standing sign lets you drop off and pick up people - nothing else. Not merchandise, '
          'not waiting in the car. The City of Toronto wording, the ticket it usually causes, and '
          'how it differs from No Parking and No Stopping.'),
 'lead': ('No Standing is the middle rung of Toronto\'s three-step ladder, and it is the one drivers '
          'misread most often. The word "standing" sounds like it means the car is stopped and '
          'empty. It means almost the opposite.'),
 'sections': [
   ('the-rule', 'The rule, in the City\'s own words',
    '<p>Toronto\'s parking regulations define the three restrictions as a ladder, each one tighter '
    'than the last:</p>'
    '<ul>'
    '<li><strong>No Parking</strong> - "Motorists are only permitted to load or unload passengers '
    'or merchandise."</li>'
    '<li><strong>No Standing</strong> - "Motorists are only permitted to receive and discharge '
    'passengers."</li>'
    '<li><strong>No Stopping</strong> - "Motorists are generally not permitted to stop for any '
    'reason except to avoid conflict with other traffic or in compliance with the directions of a '
    'constable or other police officer or of a traffic control sign or signal."</li>'
    '</ul>'
    '<p>So the single difference between No Parking and No Standing is <em>merchandise</em>. Under '
    'No Parking you may load boxes. Under No Standing you may not - people only, and only while '
    'they are actually getting in or out.</p>'),
   ('the-ticket', 'The mistake that earns the ticket',
    '<div class="callout warn">'
    '<strong>Waiting is the violation</strong>'
    '<p>Sitting in the driver\'s seat with the engine running while someone runs inside is exactly '
    'what No Standing prohibits. The engine, the hazards and your presence behind the wheel change '
    'nothing. The door opening and closing should be the only event.</p>'
    '</div>'
    '<p>This is why the sign trips up so many drivers. "Standing" in traffic law describes a '
    'stopped vehicle that is waiting, occupied or not. It is not a description of a person standing '
    'outside the car, and it does not mean "parked and empty".</p>'),
   ('where', 'Where Toronto posts them',
    '<p>No Standing zones show up where the curb has to keep turning over but the city still wants '
    'passenger drop-off to work: busy commercial blocks, hotel and theatre frontages, and school '
    'drop-off zones during posted hours. They are common on stretches where a full No Stopping ban '
    'would strand taxis and rideshare pickups.</p>'
    '<p>Read the time window on the sign. Outside the posted hours the restriction is not in force, '
    'and whatever the block\'s default rule is takes over - which in most of Toronto is the '
    'three-hour maximum.</p>'),
 ],
 'faq': [
   ('What does No Standing mean in Toronto?',
    'It means you may only receive and discharge passengers. The City\'s parking regulations put it '
    'as "Motorists are only permitted to receive and discharge passengers." You may not load or '
    'unload merchandise, and you may not wait at the curb for someone.'),
   ('Can I wait in the car in a No Standing zone?',
    'No. Waiting is the specific thing the sign prohibits, and staying in the driver\'s seat with '
    'the engine running does not change that. Someone getting in or out is the only permitted use '
    'of the curb.'),
   ('What is the difference between No Standing and No Parking?',
    'Merchandise. Under No Parking you may load or unload passengers or merchandise. Under No '
    'Standing you may only receive and discharge passengers - people, not goods. No Standing is the '
    'stricter of the two.'),
   ('Is No Standing worse than No Stopping?',
    'No, No Stopping is the strictest of the three. Under No Stopping you may not stop at all '
    'except to avoid conflict with other traffic or when directed by a police officer or a traffic '
    'control sign or signal. No Standing still lets passengers get in and out.'),
   ('Does No Standing apply 24 hours a day?',
    'Only if the sign says so. Most No Standing signs carry a time window, and the restriction '
    'applies during those hours only. Outside the window, the block reverts to whatever other rule '
    'is posted, or to Toronto\'s unsigned three-hour maximum.'),
 ],
},
{
 'slug': 'permit-parking',
 'sign': 'Permit Parking Only',
 'title': 'Permit Parking Signs in Toronto - What "Except by Permit" Means — Drivee',
 'h1': 'Permit parking signs in Toronto, and what "except by permit" lets you do',
 'crumb': 'Permit parking',
 'desc': ('"No parking except by permit" means the block is reserved for residents holding a permit '
          'for that area during the posted hours. Who qualifies, what the permit exempts you from, '
          'and how visitors park legally.'),
 'lead': ('A permit parking sign is not a ban. It is a block reserved for the people who live on it '
          'during the hours shown - and the permit does more than most drivers realise, including '
          'lifting the time limits that apply to everyone else.'),
 'sections': [
   ('what-it-means', 'What the sign actually reserves',
    '<p>During the hours posted on the sign, only vehicles displaying a valid permit for that '
    'specific area may park on the block. Toronto divides permit parking into lettered and numbered '
    'areas, and the permit is tied to the area code printed on it - a permit for one area is no '
    'help one street over.</p>'
    '<p>Outside the posted hours the restriction lifts, and the block falls back to whatever other '
    'sign applies, or to the citywide three-hour maximum if nothing else is posted.</p>'),
   ('what-it-lets-you-do', 'What a permit exempts you from',
    '<div class="callout">'
    '<strong>The part people miss</strong>'
    '<p>A permit holder may park overnight and is exempt from the 1, 2 and 3 hour parking '
    'restrictions. That exemption, not the overnight right alone, is what makes the permit worth '
    'having on a busy residential street.</p>'
    '</div>'
    '<p>The permit still has to be used properly: park in a legal space, during the licensed '
    'parking hours shown on the street\'s signs. A permit does not override a No Stopping window, a '
    'street cleaning ban, a fire route, or any other posted prohibition.</p>'),
   ('eligibility', 'Who can get one, and what vehicles qualify',
    '<p>Only residents of roads inside a permit parking area, and their guests, may request a '
    'permit. Permits are issued for passenger motor vehicles, motorcycles and scooters, and the '
    'vehicle must carry an up-to-date licence plate. Recreational vehicles and trailers are not '
    'eligible.</p>'),
   ('visitors', 'Parking there without a permit',
    '<p>Guests are not stuck. Toronto issues temporary resident and visitor permits in 24-hour, '
    '48-hour and weekly blocks, valid within the limits of the permit parking street or area, '
    'provided space is available. If you are visiting someone on a permit block for more than an '
    'evening, a temporary permit is the legal route - and considerably cheaper than the ticket.</p>'),
 ],
 'faq': [
   ('What does "no parking except by permit" mean in Toronto?',
    'During the hours shown on the sign, only vehicles displaying a valid permit for that specific '
    'permit parking area may park on the block. Outside those hours the restriction lifts and the '
    'block reverts to whatever else is posted, or to the citywide three-hour maximum.'),
   ('Does a parking permit let me park overnight?',
    'Yes. A permit holder may park overnight on an authorised street, and is also exempt from the '
    '1, 2 and 3 hour parking restrictions that apply to everyone else.'),
   ('Who is eligible for a Toronto on-street parking permit?',
    'Only residents of roads within a permit parking area and their guests may request one. Permits '
    'are issued for passenger motor vehicles, motorcycles and scooters, and the vehicle must have an '
    'up-to-date licence plate. Recreational vehicles and trailers are not eligible.'),
   ('How do visitors park on a permit parking street?',
    'Toronto issues temporary resident and visitor permits for 24 hours, 48 hours or a week, valid '
    'within the permit parking street or area where space is available.'),
   ('Does my permit work on any permit street?',
    'No. The permit is tied to the permit parking area printed on it. It does not cover a different '
    'area, even one a block away.'),
   ('Does a permit override other parking signs?',
    'No. A permit exempts you from the time limits and lets you park overnight, but it does not '
    'override a No Stopping window, a street cleaning ban, a fire route or any other posted '
    'prohibition. You still have to park in a legal space.'),
 ],
},
{
 'slug': 'time-limit',
 'sign': '3-Hour Parking (default citywide)',
 'title': 'Time Limit Parking Signs in Toronto - The 3-Hour Rule Explained — Drivee',
 'h1': 'Time limit parking signs in Toronto, and the 3-hour rule behind them',
 'crumb': 'Time limits',
 'desc': ('Toronto has an unsigned three-hour maximum on public roads. Posted signs override it in '
          'both directions. How time limit signs work, what the default is when there is no sign, '
          'and who is exempt.'),
 'lead': ('Most Toronto blocks have a time limit even when nothing is posted. The signs you do see - '
          '15 minute, 1 hour, 2 hour - are overrides of a citywide default that catches out drivers '
          'who assume no sign means no rule.'),
 'sections': [
   ('the-default', 'The rule when there is no sign at all',
    '<div class="callout">'
    '<strong>Three hours, citywide</strong>'
    '<p>"Within the City of Toronto, an unsigned maximum three-hour parking limit exists on public '
    'roads unless there is signage posted indicating otherwise."</p>'
    '</div>'
    '<p>That is the whole trap. An empty stretch of residential street with no sign on it is not '
    'unrestricted parking - it is three-hour parking. Leave the car there through a working day and '
    'the ticket is legitimate even though you never passed a sign.</p>'),
   ('posted', 'When a sign is posted',
    '<p>A posted limit replaces the default, and it can go either way: shorter, as with the 15 '
    'minute and 1 hour signs outside shops and clinics, or structured around a time window that '
    'only applies on certain days or hours. Read the whole sign - the limit and the window are two '
    'separate pieces of information, and a limit that only runs 8 a.m. to 6 p.m. says nothing about '
    'the overnight rules on that block.</p>'
    '<p>Where several signs stack on one pole, each panel applies to the hours written on it. The '
    'strictest one in force at the moment you park is the one that matters.</p>'),
   ('exempt', 'Who the time limits do not apply to',
    '<p>Permit holders are exempt from the 1, 2 and 3 hour restrictions on streets they hold a '
    'permit for, and may park overnight there. Everyone else is subject to the posted limit, or to '
    'the three-hour default where nothing is posted.</p>'
    '<p>A time limit also does not protect you from anything else on the block. A three-hour '
    'allowance means nothing during a rush-hour No Stopping window or a street cleaning ban - those '
    'restrictions sit on top of it.</p>'),
 ],
 'faq': [
   ('How long can you park on a Toronto street with no sign?',
    'Three hours. Within the City of Toronto an unsigned maximum three-hour parking limit exists on '
    'public roads unless there is signage posted indicating otherwise.'),
   ('Does a posted time limit replace the three-hour default?',
    'Yes. A posted sign overrides the unsigned default, whether it is shorter, such as a 15 minute '
    'or 1 hour limit, or restricted to particular hours and days.'),
   ('Is anyone exempt from Toronto parking time limits?',
    'Permit holders are. A valid permit for that area exempts the vehicle from the 1, 2 and 3 hour '
    'restrictions and allows overnight parking on authorised streets.'),
   ('Does a time limit sign mean I can park there overnight?',
    'Not necessarily. The limit and the hours it applies are separate pieces of information on the '
    'sign. A limit that runs during the day tells you nothing about overnight rules, which may be '
    'set by a permit parking or other posted restriction.'),
   ('Can I be ticketed under the three-hour rule if there is no sign on the street?',
    'Yes. The three-hour maximum applies on public roads across Toronto without needing to be '
    'posted. No sign does not mean no limit.'),
 ],
},
]

RELATED = {
  'no-standing':    [('permit-parking', 'Permit parking', 'What "except by permit" actually reserves'),
                     ('time-limit', 'Time limits', 'The 3-hour rule that applies with no sign posted')],
  'permit-parking': [('time-limit', 'Time limits', 'The 3-hour rule that applies with no sign posted'),
                     ('no-standing', 'No Standing', 'Why waiting in the car is the violation')],
  'time-limit':     [('no-standing', 'No Standing', 'Why waiting in the car is the violation'),
                     ('permit-parking', 'Permit parking', 'What "except by permit" actually reserves')],
}

CSS = """
  .sg-hero { max-width: 920px; margin: 0 auto; padding: 72px 24px 24px; text-align: center; }
  .sg-hero .eyebrow {
    font-family: var(--mono); font-size: 11px; font-weight: 800;
    letter-spacing: 2px; text-transform: uppercase; color: var(--blue); margin-bottom: 18px;
  }
  .sg-hero h1 {
    font-family: var(--serif); font-size: 52px; font-weight: 700;
    letter-spacing: -1.5px; line-height: 1.08; color: var(--ink); margin-bottom: 18px;
  }
  .sg-hero .lead { font-size: 18px; color: var(--ink2); line-height: 1.6; max-width: 680px; margin: 0 auto; }

  .sg-crumbs { max-width: 920px; margin: 0 auto; padding: 18px 24px 0; font-size: 13px; color: var(--ink3); }
  .sg-crumbs a { color: var(--ink2); font-weight: 600; }
  .sg-crumbs .sep { margin: 0 8px; opacity: 0.5; }

  .sg-figure {
    max-width: 920px; margin: 8px auto 0; padding: 0 24px;
    display: flex; justify-content: center;
  }
  .sg-figure svg { width: 190px; height: 276px; }

  .sg-body { max-width: 760px; margin: 0 auto; padding: 8px 24px 24px; }
  .sg-body h2 {
    font-family: var(--serif); font-size: 28px; font-weight: 700;
    letter-spacing: -0.5px; color: var(--ink); margin: 38px 0 12px;
  }
  .sg-body p { font-size: 16.5px; line-height: 1.7; color: var(--ink2); margin-bottom: 14px; }
  .sg-body ul { margin: 0 0 16px 20px; }
  .sg-body li { font-size: 16.5px; line-height: 1.7; color: var(--ink2); margin-bottom: 8px; }
  .sg-body strong { color: var(--ink); }

  .sg-faq { margin-top: 10px; }
  .sg-faq details {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 12px; margin-bottom: 10px; overflow: hidden;
  }
  .sg-faq summary {
    list-style: none; cursor: pointer; padding: 16px 20px;
    font-size: 16px; font-weight: 600; color: var(--ink);
    display: flex; justify-content: space-between; align-items: center; gap: 16px;
  }
  .sg-faq summary::-webkit-details-marker { display: none; }
  .sg-faq summary::after {
    content: "+"; font-size: 20px; font-weight: 400; color: var(--ink3);
    flex-shrink: 0; transition: transform 0.2s ease;
  }
  .sg-faq details[open] summary::after { transform: rotate(45deg); }
  .sg-faq .faq-body { padding: 0 20px 16px; font-size: 15px; color: var(--ink2); line-height: 1.6; }

  .sg-source { font-size: 13px; color: var(--ink3); line-height: 1.6; margin-top: 26px; }
  .sg-source a { color: var(--ink2); font-weight: 600; }

  .sg-cta {
    max-width: 760px; margin: 32px auto 0; padding: 28px 24px;
    background: var(--ink); border-radius: 18px; text-align: center;
  }
  .sg-cta h3 { font-family: var(--serif); font-size: 26px; font-weight: 700; color: #fff; margin-bottom: 8px; }
  .sg-cta p { font-size: 15px; color: rgba(255,255,255,0.75); line-height: 1.6; margin-bottom: 18px; }
  .sg-cta a {
    display: inline-block; background: var(--blue); color: #fff;
    padding: 13px 26px; border-radius: 999px; font-weight: 700; font-size: 15px;
  }
  .sg-cta a:hover { background: #4b7bf5; text-decoration: none; }

  .sg-more { max-width: 760px; margin: 36px auto 0; padding: 0 24px 60px; }
  .sg-more h3 {
    font-family: var(--mono); font-size: 11px; font-weight: 800; letter-spacing: 2px;
    text-transform: uppercase; color: var(--ink3); margin-bottom: 14px;
  }
  .sg-more-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .sg-card {
    display: block; background: var(--paper); border: 1px solid var(--line);
    border-radius: 14px; padding: 18px 20px;
  }
  .sg-card:hover { border-color: var(--blue-s); text-decoration: none; }
  .sg-card .kicker {
    font-family: var(--mono); font-size: 10px; font-weight: 800; letter-spacing: 1.5px;
    text-transform: uppercase; color: var(--blue); margin-bottom: 6px;
  }
  .sg-card h4 { font-size: 15.5px; font-weight: 700; color: var(--ink); line-height: 1.35; margin-bottom: 4px; }
  .sg-card p { font-size: 13.5px; color: var(--ink3); line-height: 1.45; }

  @media (max-width: 640px) {
    .sg-hero { padding: 40px 20px 18px; }
    .sg-hero h1 { font-size: 32px; letter-spacing: -1px; }
    .sg-hero .lead { font-size: 16px; }
    .sg-body { padding: 8px 20px 20px; }
    .sg-body h2 { font-size: 22px; }
    .sg-body p, .sg-body li { font-size: 16px; }
    .sg-figure svg { width: 150px; height: 218px; }
    .sg-more-grid { grid-template-columns: 1fr; }
    .sg-cta { margin-left: 20px; margin-right: 20px; }
  }
"""


def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def build(page):
    url = '%s/signs/%s/' % (SITE, page['slug'])

    faq_html = '\n'.join(
        '      <details>\n'
        '        <summary>%s</summary>\n'
        '        <div class="faq-body">%s</div>\n'
        '      </details>' % (esc(q), esc(a)) for q, a in page['faq'])

    sections = '\n'.join(
        '    <h2 id="%s">%s</h2>\n    %s' % (sid, esc(title), body)
        for sid, title, body in page['sections'])

    related = '\n'.join(
        '      <a class="sg-card" href="/signs/%s/">\n'
        '        <div class="kicker">%s</div>\n'
        '        <h4>%s</h4>\n'
        '      </a>' % (slug, esc(kicker), esc(blurb))
        for slug, kicker, blurb in RELATED[page['slug']])

    graph = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          'name': page['h1'],
          'description': page['desc'],
          'url': url,
          'isPartOf': {'@type': 'WebSite', 'name': 'Drivee', 'url': SITE + '/'},
          'publisher': {'@type': 'Organization', 'name': 'Drivee', 'url': SITE + '/'},
        },
        {
          '@type': 'BreadcrumbList',
          'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Drivee', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Toronto parking signs',
             'item': SITE + '/parking-signs/'},
            {'@type': 'ListItem', 'position': 3, 'name': page['crumb'], 'item': url},
          ],
        },
        {
          '@type': 'FAQPage',
          'mainEntity': [
            {'@type': 'Question', 'name': q,
             'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in page['faq']
          ],
        },
      ],
    }

    return """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>%(title)s</title>
<meta name="description" content="%(desc)s"/>
<link rel="canonical" href="%(url)s"/>

<meta property="og:type" content="article"/>
<meta property="og:site_name" content="Drivee"/>
<meta property="og:title" content="%(h1)s"/>
<meta property="og:description" content="%(desc)s"/>
<meta property="og:url" content="%(url)s"/>
<meta property="og:image" content="%(site)s/og-image.png"/>
<meta property="og:locale" content="en_CA"/>

<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Serif:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="/blog/blog.css"/>

<script type="application/ld+json">
%(schema)s
</script>

<style>%(css)s</style>
</head>
<body>

<nav class="top">
  <a href="/" class="brand" style="text-decoration:none">Drivee<span class="dot">.</span></a>
  <div class="links">
    <a href="/">Home</a>
    <a href="/blog/">Blog</a>
    <a href="/parking-signs/">Signs</a>
    <a href="/?app=1">Open app</a>
  </div>
  <a href="/?app=1" class="cta">Open the app &rarr;</a>
</nav>

<div class="sg-crumbs">
  <a href="/">Drivee</a><span class="sep">/</span><a href="/parking-signs/">Parking signs</a><span class="sep">/</span>%(crumb)s
</div>

<section class="sg-hero">
  <div class="eyebrow">Toronto parking signs</div>
  <h1>%(h1)s</h1>
  <p class="lead">%(lead)s</p>
</section>

<div class="sg-figure">
%(svg)s
</div>

<div class="sg-body">
%(sections)s

    <h2 id="faq">Common questions</h2>
    <div class="sg-faq">
%(faq)s
    </div>

    <p class="sg-source">
      Rules on this page follow the City of Toronto's published
      <a href="%(regs)s" rel="noopener">parking regulations</a>.
      Signage varies block by block - always read the sign in front of you.
      See every sign in one place on the <a href="/parking-signs/">Toronto parking signs guide</a>.
    </p>
</div>

<section class="sg-cta">
  <h3>Not sure what the sign in front of you says?</h3>
  <p>Drivee reads any Toronto parking sign through your camera and tells you in plain English what is allowed right now. Free, no ads, works offline.</p>
  <a href="/?app=1">Open Drivee &rarr;</a>
</section>

<div class="sg-more">
  <h3>Read next</h3>
  <div class="sg-more-grid">
%(related)s
  </div>
</div>

<footer class="foot">
  <p style="margin-bottom: 8px;">Drivee Editorial is independent. Sign illustrations are stylised representations matching Ontario MUTCD design conventions for educational reference - they are not official City of Toronto signage. Real-world signage may vary in exact wording, hours and zone codes. Always read the actual sign at your location.</p>
  <p><a href="/">Home</a><a href="/blog/">Blog</a><a href="/parking-signs/">Signs</a><a href="/privacy.html">Privacy</a><a href="mailto:drivee.canada@gmail.com">Contact</a></p>
</footer>

</body>
</html>
""" % {
      'title': esc(page['title']), 'desc': esc(page['desc']), 'url': url,
      'h1': esc(page['h1']), 'lead': esc(page['lead']), 'crumb': esc(page['crumb']),
      'site': SITE, 'regs': CITY_REGS,
      'schema': json.dumps(graph, indent=2, ensure_ascii=False),
      'css': CSS, 'svg': sign_svg(page['sign']),
      'sections': sections, 'faq': faq_html, 'related': related,
    }


def main():
    for page in PAGES:
        d = os.path.join(ROOT, 'signs', page['slug'])
        os.makedirs(d, exist_ok=True)
        out = os.path.join(d, 'index.html')
        open(out, 'w', encoding='utf-8').write(build(page))
        print('wrote signs/%s/index.html  (%d questions)' % (page['slug'], len(page['faq'])))


if __name__ == '__main__':
    main()
