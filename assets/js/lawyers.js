/* ==========================================================================
   Drivee — vetted defence firm directory
   Carried over verbatim from the old app (DV_FIRM_INFO + the #tab-legal
   firm cards), merged into one source of truth the landing page and the
   app can both read.

   Every "claim" below is the firm's own public marketing claim, shown in
   quotes — Drivee does not verify or endorse it. Keep it that way.
   ========================================================================== */

window.DRIVEE_FIRMS = [
  {
    id: 'xcopper',
    name: 'X-Copper Professional Corp',
    email: 'info@xcopper.com',
    from: 350,
    tags: ['dui', 'speeding', 'stunt', 'careless', 'criminal'],
    foundedLabel: 'Authorized by the Law Society of Ontario',
    claim: '300,000+ tickets and criminal charges handled',
    team: 'Former police officers, criminal defence lawyers and licensed paralegals',
    area: 'ON · AB · QC · NY',
    perks: ['Free quote', 'Attends court for you', 'Lawyers + paralegals']
  },
  {
    id: 'x-cops',
    name: 'Toronto Traffic Law',
    email: 'info@x-cops.ca',
    from: 199,
    tags: ['speeding', 'parking', 'careless', 'redlight'],
    foundedLabel: '20+ years fighting traffic & DUI charges',
    claim: '"98% success rate in court"',
    team: 'Former police officers (12+ yrs service) + seasoned prosecutors',
    area: 'Toronto · GTA',
    perks: ['Free consultation', 'Open until 9pm', 'Weekend / after-hours meetings']
  },
  {
    id: 'pointts',
    name: 'POINTTS Advisory Services',
    email: 'toronto@pointts.com',
    from: 250,
    tags: ['speeding', 'parking', 'stunt', 'redlight', 'all'],
    foundedLabel: 'Canadian-owned since 1984',
    claim: '25+ licensed paralegals with 30+ years courtroom experience',
    team: 'Former police officers, prosecutors and traffic court Justices',
    area: '17 offices across ON, AB & MB',
    perks: ['Free consultation', 'Founded 1984', 'National coverage']
  },
  {
    id: 'ott',
    name: 'OTT Legal',
    email: 'info@ontariotraffictickets.com',
    from: 200,
    tags: ['parking', 'speeding', 'redlight'],
    foundedLabel: 'Licensed Ontario paralegals',
    claim: 'Toronto-based ticket-defence specialists',
    team: 'Licensed paralegals',
    area: 'Ontario · Toronto-based',
    perks: ['Free consultation', 'Licensed paralegals', 'Speeding / red light / parking / HOV']
  },
  {
    id: 'hwy-law',
    name: 'HWY-LAW Criminal Defence',
    email: 'info@hwy-law.com',
    from: 400,
    tags: ['dui', 'stunt', 'criminal', 'careless'],
    foundedLabel: 'Established 1998',
    claim: '"80% of our clients are repeat or referrals · thousands of motorists defended"',
    team: 'Paralegal firm, members of the Law Society of Ontario',
    area: 'Toronto · Vaughan · Ontario',
    perks: ['Free consultation', 'Est. 1998', 'Repeat-client focused']
  }
];

/* Map a scanned ticket TYPE (from the vision model) onto a firm tag. */
window.DRIVEE_TYPE_TAG = {
  parking:      'parking',
  meter:        'parking',
  speeding:     'speeding',
  speeding_low: 'speeding',
  speeding_mid: 'speeding',
  speeding_high:'speeding',
  redlight:     'redlight',
  redlight_camera:  'redlight',
  redlight_officer: 'redlight',
  camera:       'redlight',
  stopsign:     'redlight',
  stop_sign:    'redlight',
  stunt:        'stunt',
  careless:     'careless',
  dui:          'dui',
  distracted:   'careless',
  seatbelt:     'careless',
  hov:          'speeding',
  toll:         'parking',
  insurance:    'all',
  registration: 'all',
  other:        'all'
};

/* Return firms matching a ticket type, best-priced first. Never returns []. */
window.driveeMatchFirms = function (type) {
  var tag = window.DRIVEE_TYPE_TAG[String(type || '').toLowerCase()] || 'all';
  var hit = window.DRIVEE_FIRMS.filter(function (f) {
    return tag === 'all' || f.tags.indexOf(tag) !== -1 || f.tags.indexOf('all') !== -1;
  });
  if (!hit.length) hit = window.DRIVEE_FIRMS.slice();
  return hit.sort(function (a, b) { return a.from - b.from; });
};
