/* ==========================================================================
   Drivee — Ontario rules engine
   Province-wide, not Toronto-only. Two separate systems matter:

   1. PARKING — municipal. Toronto and a growing list of municipalities run an
      Administrative Penalty System (APS/AMPS): you request a SCREENING REVIEW,
      not a court date. Municipalities that have not adopted AMPS still run
      parking tickets through Provincial Offences Court under the POA.

   2. MOVING VIOLATIONS — provincial. Speeding, careless, stunt, red light,
      distracted, seatbelt, HOV are Highway Traffic Act offences prosecuted
      under the Provincial Offences Act in Provincial Offences Court, the same
      way in every Ontario municipality. Demerit points are set by the MTO and
      are province-wide.

   Numbers below that are exact (Toronto's fee ladder, HTA demerit points, set
   fines) are marked `exact: true`. Everything else — insurance impact above
   all — is an ESTIMATE and is labelled as one in the UI. Do not present an
   estimate as a quoted figure.
   ========================================================================== */

(function (root) {
  'use strict';

  /* ── 1. Municipal parking regimes ──────────────────────────────── */
  // Municipalities confirmed to run an administrative penalty / screening
  // system for parking. Anything not listed falls back to the POA path.
  var APS_MUNICIPALITIES = [
    'toronto', 'mississauga', 'brampton', 'ottawa', 'hamilton', 'london',
    'vaughan', 'markham', 'oakville', 'burlington', 'oshawa', 'barrie',
    'kitchener', 'waterloo', 'guelph', 'windsor', 'richmond hill', 'ajax',
    'pickering', 'whitby', 'milton', 'newmarket', 'aurora', 'st. catharines'
  ];

  function normalizeCity(name) {
    return String(name || '').toLowerCase().replace(/[^a-z .]/g, '').trim();
  }

  function parkingRegime(municipality) {
    var city = normalizeCity(municipality);
    if (!city) {
      return {
        key: 'unknown',
        label: 'Ontario municipality',
        body: 'your municipality',
        route: 'Most Ontario municipalities now handle parking tickets through a screening review rather than a court date. Check the back of your ticket — it names the process that applies.',
        deadlineDays: 15,
        deadlineNote: 'Most Ontario parking tickets give you about 15 days to respond. The exact window is printed on the ticket.'
      };
    }
    if (APS_MUNICIPALITIES.indexOf(city) !== -1) {
      var isToronto = city === 'toronto';
      return {
        key: 'aps',
        label: titleCase(city),
        body: titleCase(city),
        route: 'This is an administrative penalty, so there is no court date. You request a SCREENING REVIEW, present your evidence, and a screening officer can cancel, reduce, or uphold the penalty. If you disagree with the screening result you can ask for a hearing review.',
        deadlineDays: 15,
        deadlineNote: 'You generally have 15 days from the issue date to request a screening review.',
        hasFeeLadder: isToronto
      };
    }
    return {
      key: 'poa',
      label: titleCase(city),
      body: titleCase(city),
      route: 'This municipality runs parking tickets through Provincial Offences Court under the Provincial Offences Act. Your options are printed on the ticket: pay it, request an early resolution meeting with a prosecutor, or request a trial.',
      deadlineDays: 15,
      deadlineNote: 'You generally have 15 days from the issue date to choose an option before the ticket can be convicted in your absence.'
    };
  }

  function titleCase(s) {
    return String(s || '').replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
  }

  /* ── 2. Toronto's parking fee ladder (exact, published) ────────── */
  function torontoFeeLadder(baseFine) {
    var base = parseFloat(baseFine || 0) || 0;
    if (!base) return null;
    return {
      exact: true,
      source: 'City of Toronto published fee schedule',
      rows: [
        { when: 'Day 1–15',  note: 'Pay now, or request a screening review',  total: base },
        { when: 'Day 16',    note: 'Address search fee (+$15.39)',            total: base + 15.39 },
        { when: 'Day 31',    note: 'Late payment fee (+$32.10)',              total: base + 47.49 },
        { when: 'Day 60',    note: 'Plate denial — renewal blocked (+$32.10)', total: base + 79.59 }
      ]
    };
  }

  /* ── 3. HTA offence reference (province-wide) ──────────────────── */
  // demerit: MTO demerit points on conviction (exact).
  // insuranceYears: how long Ontario insurers typically rate for a conviction.
  // premiumImpact: ESTIMATE of the premium increase over that period.
  // worthFighting: whether representation usually pays for itself.
  var OFFENCES = {
    parking: {
      repCost: [150, 350],
      label: 'Parking violation', demerit: 0, insuranceYears: 0,
      premiumImpact: null, worthFighting: 'sometimes', tag: 'parking',
      note: 'Parking tickets carry no demerit points and are not reported to your insurer.'
    },
    meter: {
      repCost: [150, 300],
      label: 'Expired meter', demerit: 0, insuranceYears: 0,
      premiumImpact: null, worthFighting: 'rarely', tag: 'parking',
      note: 'No demerit points, no insurance consequence.'
    },
    toll: {
      repCost: [0, 0],
      label: 'Toll bill (407 ETR / 412 / 418)', demerit: 0, insuranceYears: 0,
      premiumImpact: null, worthFighting: 'rarely', tag: 'parking',
      note: 'A toll bill is a civil debt, not an offence. Unpaid 407 debt can block plate renewal.'
    },
    speeding: {
      repCost: [200, 600],
      label: 'Speeding', demerit: 3, insuranceYears: 3,
      premiumImpact: [300, 900], worthFighting: 'usually', tag: 'speeding',
      note: 'Demerit points depend on how far over: 1–15 km/h is 0 points, 16–29 is 3, 30–49 is 4, 50+ is stunt driving.'
    },
    redlight: {
      repCost: [250, 700],
      label: 'Red light', demerit: 3, insuranceYears: 3,
      premiumImpact: [300, 900], worthFighting: 'usually', tag: 'redlight',
      note: 'An officer-issued red light ticket carries 3 points. A red light CAMERA ticket carries none — it goes to the plate owner, not the driver.'
    },
    camera: {
      repCost: [0, 0],
      label: 'Camera enforcement', demerit: 0, insuranceYears: 0,
      premiumImpact: null, worthFighting: 'rarely', tag: 'redlight',
      note: 'Automated camera tickets (red light and speed cameras) are issued to the plate holder. No demerit points, and they are not on your driving record.'
    },
    stopsign: {
      repCost: [250, 600],
      label: 'Fail to stop (stop sign)', demerit: 3, insuranceYears: 3,
      premiumImpact: [300, 900], worthFighting: 'usually', tag: 'redlight'
    },
    distracted: {
      repCost: [300, 800],
      label: 'Distracted / handheld device', demerit: 3, insuranceYears: 3,
      premiumImpact: [500, 1500], worthFighting: 'usually', tag: 'careless',
      note: 'A first distracted-driving conviction also carries a 3-day licence suspension.'
    },
    seatbelt: {
      repCost: [200, 500],
      label: 'Seatbelt violation', demerit: 2, insuranceYears: 3,
      premiumImpact: [200, 600], worthFighting: 'sometimes', tag: 'careless'
    },
    hov: {
      repCost: [250, 600],
      label: 'HOV lane violation', demerit: 3, insuranceYears: 3,
      premiumImpact: [300, 900], worthFighting: 'usually', tag: 'speeding'
    },
    careless: {
      repCost: [700, 2500],
      label: 'Careless driving', demerit: 6, insuranceYears: 3,
      premiumImpact: [1500, 5000], worthFighting: 'strongly', tag: 'careless',
      note: 'Six points and a major conviction. Many insurers re-rate or decline to renew. Representation almost always costs less than the premium increase.'
    },
    stunt: {
      repCost: [1500, 5000],
      label: 'Stunt driving / racing', demerit: 6, insuranceYears: 3,
      premiumImpact: [3000, 10000], worthFighting: 'strongly', tag: 'stunt',
      note: 'Roadside: immediate 30-day licence suspension and 14-day vehicle impound, before any trial. On conviction: fines from $2,000, possible jail, and a minimum 1-year licence suspension.'
    },
    dui: {
      repCost: [2500, 10000],
      label: 'Impaired driving / over 80', demerit: 0, insuranceYears: 6,
      premiumImpact: [5000, 20000], worthFighting: 'strongly', tag: 'dui',
      note: 'This is a CRIMINAL charge under the Criminal Code, not a Highway Traffic Act ticket. It carries a criminal record on conviction. Speak to a lawyer — not a paralegal — as soon as possible.'
    },
    suspended: {
      repCost: [900, 3000],
      label: 'Driving while suspended', demerit: 6, insuranceYears: 3,
      premiumImpact: [2000, 6000], worthFighting: 'strongly', tag: 'careless'
    },
    insurance: {
      repCost: [700, 2500],
      label: 'No insurance', demerit: 0, insuranceYears: 3,
      premiumImpact: [1000, 4000], worthFighting: 'strongly', tag: 'careless',
      note: 'Minimum fine is $5,000 plus a 25% victim surcharge. Worth fighting on cost alone.'
    },
    registration: {
      repCost: [200, 600],
      label: 'Registration / plate offence', demerit: 0, insuranceYears: 0,
      premiumImpact: null, worthFighting: 'sometimes', tag: 'all'
    },
    other: {
      repCost: [200, 600],
      label: 'Traffic violation', demerit: 0, insuranceYears: 0,
      premiumImpact: null, worthFighting: 'sometimes', tag: 'all'
    }
  };

  function offence(type) {
    var key = String(type || '').toLowerCase().replace(/[\s-]/g, '_');
    // tolerate the granular variants the model may return
    if (/^speeding/.test(key)) key = 'speeding';
    if (/^redlight_camera|^speed_camera/.test(key)) key = 'camera';
    if (/^redlight/.test(key)) key = 'redlight';
    if (/^stop/.test(key)) key = 'stopsign';
    return OFFENCES[key] || OFFENCES.other;
  }

  /* ── 4. Is this a parking matter or a moving violation? ────────── */
  function isParking(type) {
    return ['parking', 'meter', 'toll'].indexOf(String(type || '').toLowerCase()) !== -1;
  }

  /* ── 5. Cost comparison — the "help me with pricing" piece ─────── */
  // Compares doing nothing (pay the fine + wear the insurance hit) against
  // hiring representation. Insurance figures are ESTIMATES.
  function costPicture(parsed, cheapestFirmFrom) {
    var o = offence(parsed.type);
    var fine = parseFloat(parsed.amount || 0) || 0;
    var impact = o.premiumImpact;

    var payNowTotal = fine;
    var insuranceLow = impact ? impact[0] : 0;
    var insuranceHigh = impact ? impact[1] : 0;

    return {
      fine: fine,
      demerit: o.demerit,
      insuranceYears: o.insuranceYears,
      insuranceLow: insuranceLow,
      insuranceHigh: insuranceHigh,
      hasInsuranceImpact: !!impact,
      trueCostLow: payNowTotal + insuranceLow,
      trueCostHigh: payNowTotal + insuranceHigh,
      representationFrom: cheapestFirmFrom || null,
      // Worth hiring when the low end of the avoided cost clears the fee.
      representationPaysOff: !!(impact && cheapestFirmFrom && insuranceLow > cheapestFirmFrom),
      worthFighting: o.worthFighting,
      note: o.note || null
    };
  }

  root.ONTARIO = {
    parkingRegime: parkingRegime,
    torontoFeeLadder: torontoFeeLadder,
    offence: offence,
    isParking: isParking,
    costPicture: costPicture,
    OFFENCES: OFFENCES,
    APS_MUNICIPALITIES: APS_MUNICIPALITIES
  };

  if (typeof module === 'object' && module.exports) module.exports = root.ONTARIO;

})(typeof window !== 'undefined' ? window : globalThis);
