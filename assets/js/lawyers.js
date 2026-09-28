/* ==========================================================================
   Drivee — Ontario defence firm directory
   Carried over from the old app (DV_FIRM_INFO + the #tab-legal firm cards)
   and extended for province-wide matching and pricing.

   IMPORTANT — scope of practice. In Ontario, licensed PARALEGALS may represent
   on Provincial Offences Act matters (speeding, careless, stunt, red light,
   parking) but may NOT represent on Criminal Code charges. Impaired driving /
   over 80 is a Criminal Code charge, so it requires a LAWYER. `licence` below
   records what each firm actually has, and the matcher refuses to put a
   criminal charge in front of a paralegal-only firm.

   Every `claim` is the firm's own public marketing copy, shown in quotes and
   attributed. Drivee does not verify or endorse it. Keep it that way.
   ========================================================================== */

window.DRIVEE_FIRMS = [
  {
    id: 'xcopper',
    name: 'X-Copper Professional Corp',
    email: 'info@xcopper.com',
    from: 350,
    licence: 'lawyers+paralegals',      // can take Criminal Code matters
    tags: ['dui', 'speeding', 'stunt', 'careless', 'criminal', 'redlight'],
    coverage: 'Ontario-wide (also AB, QC, NY)',
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
    licence: 'paralegals',
    tags: ['speeding', 'parking', 'careless', 'redlight'],
    coverage: 'Toronto & the GTA',
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
    licence: 'paralegals',
    tags: ['speeding', 'parking', 'stunt', 'redlight', 'all'],
    coverage: 'Ontario-wide — 17 offices',
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
    licence: 'paralegals',
    tags: ['parking', 'speeding', 'redlight'],
    coverage: 'Ontario-wide',
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
    licence: 'paralegals',
    tags: ['stunt', 'careless', 'speeding'],
    coverage: 'Toronto · Vaughan · Ontario',
    foundedLabel: 'Established 1998',
    claim: '"80% of our clients are repeat or referrals · thousands of motorists defended"',
    team: 'Paralegal firm, members of the Law Society of Ontario',
    area: 'Toronto · Vaughan · Ontario',
    perks: ['Free consultation', 'Est. 1998', 'Repeat-client focused']
  }
];

/* Map a scanned doc_type onto a firm tag. */
window.DRIVEE_TYPE_TAG = {
  parking: 'parking', meter: 'parking', toll: 'parking',
  speeding: 'speeding', hov: 'speeding',
  redlight: 'redlight', camera: 'redlight', stopsign: 'redlight',
  stunt: 'stunt',
  careless: 'careless', distracted: 'careless', seatbelt: 'careless',
  suspended: 'careless',
  dui: 'dui',
  insurance: 'all', registration: 'all', other: 'all'
};

/* Charges that are Criminal Code matters — paralegals cannot represent. */
window.DRIVEE_CRIMINAL = ['dui'];

/**
 * Firms that can actually take this charge, cheapest first.
 * Never returns an empty list; never returns a paralegal-only firm for a
 * Criminal Code charge.
 */
window.driveeMatchFirms = function (docType) {
  var type = String(docType || '').toLowerCase();
  var tag = window.DRIVEE_TYPE_TAG[type] || 'all';
  var needsLawyer = window.DRIVEE_CRIMINAL.indexOf(type) !== -1;

  var hit = window.DRIVEE_FIRMS.filter(function (f) {
    if (needsLawyer && f.licence.indexOf('lawyers') === -1) return false;
    return tag === 'all' || f.tags.indexOf(tag) !== -1 || f.tags.indexOf('all') !== -1;
  });

  // Fall back progressively rather than showing nothing.
  if (!hit.length) {
    hit = window.DRIVEE_FIRMS.filter(function (f) {
      return !needsLawyer || f.licence.indexOf('lawyers') !== -1;
    });
  }
  if (!hit.length) hit = window.DRIVEE_FIRMS.slice();

  return hit.sort(function (a, b) { return a.from - b.from; });
};
