// Ticket scanner — reads a photo of an Ontario ticket and returns structured
// fields. POST { image: <base64>, mediaType } -> { ok, ticket }
//
// Two things this does that the old /api/claude did not:
//
//   1. The prompt and the response schema live HERE, on the server. /api/claude
//      forwards whatever `messages` the caller sends, which makes it an open
//      LLM proxy for anyone who can set an Origin header. This endpoint only
//      ever accepts an image.
//
//   2. It uses structured outputs, so the response is schema-valid JSON rather
//      than prose we regex at. A smudged ticket now degrades into low
//      confidence and named unreadable fields instead of a silent mis-parse.

const Anthropic = require('@anthropic-ai/sdk');

// One source of truth for the model — tools/wire-check.js imports this so
// a migration can never leave the test asserting against the old model.
const MODEL = 'claude-opus-5-5';

const ALLOWED_ORIGINS = [
  'https://drivee.ca',
  'https://www.drivee.ca',
  'http://localhost',
  'http://127.0.0.1'
];

const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// ~4.5MB is Vercel's body ceiling; the client shrinks to 1800px/0.85 first.
const MAX_BASE64_CHARS = 4_000_000;

const TICKET_SCHEMA = {
  type: 'object',
  properties: {
    is_ticket: {
      type: 'boolean',
      description: 'True only if this image shows a real traffic/parking ticket, fine, or toll bill.'
    },
    is_ontario: {
      type: 'boolean',
      description: 'True if this ticket was issued in Ontario, Canada. False for any other province, territory, state or country. If the jurisdiction genuinely cannot be determined, infer it from the issuing body, court, or address printed on the ticket; only guess true when the evidence points to Ontario.'
    },
    jurisdiction: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description: 'Plain name of the issuing jurisdiction when it is NOT Ontario, e.g. "Quebec", "New York State", "British Columbia". Null when it is Ontario.'
    },
    doc_type: {
      type: 'string',
      enum: [
        'parking', 'meter', 'toll', 'speeding', 'redlight', 'camera', 'stopsign',
        'hov', 'distracted', 'seatbelt', 'careless', 'stunt', 'dui', 'suspended',
        'insurance', 'registration', 'other', 'not_a_ticket'
      ]
    },
    amount:        { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'Total payable, numbers only.' },
    ticket_number: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    plate:         { anyOf: [{ type: 'string' }, { type: 'null' }] },
    province:      { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Two-letter code, e.g. ON.' },
    municipality:  { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'City that issued it, e.g. Toronto, Mississauga, Ottawa.' },
    issued_date:   { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'YYYY-MM-DD.' },
    due_date:      { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'YYYY-MM-DD.' },
    location:      { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Where the offence occurred, as printed.' },
    offence_text:  { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'The offence wording exactly as printed.' },
    statute_section: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'e.g. "HTA s.128" or a municipal by-law number.' },
    speed_over:    { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'For speeding only: km/h over the limit.' },
    confidence:    { type: 'string', enum: ['high', 'medium', 'low'] },
    unreadable_fields: {
      type: 'array',
      items: { type: 'string' },
      description: 'Names of fields that were blurred, cropped, or otherwise unreadable.'
    },
    advice: { type: 'string', description: 'One plain-English sentence on dispute prospects and the next step.' }
  },
  required: [
    'is_ticket', 'is_ontario', 'jurisdiction', 'doc_type', 'amount', 'ticket_number',
    'plate', 'province', 'municipality', 'issued_date', 'due_date', 'location',
    'offence_text', 'statute_section', 'speed_over', 'confidence',
    'unreadable_fields', 'advice'
  ],
  additionalProperties: false
};

const SYSTEM = `You read photographs of traffic and parking tickets and extract their fields. Drivee serves ONTARIO, CANADA only, so establishing the jurisdiction is part of the job.

Deciding the jurisdiction:
- Ontario tickets name an Ontario municipality (Toronto, Ottawa, Mississauga, Hamilton, London, Brampton, Windsor, Kingston, …), cite the Highway Traffic Act / Provincial Offences Act, or name an Ontario court office or the City's administrative penalty process.
- Set is_ontario false for any other province or territory, any US state, or any other country — and put the plain jurisdiction name in "jurisdiction". A 407 ETR, 412 or 418 toll bill is Ontario.
- Still extract every other field normally even when is_ontario is false. The driver is told we do not cover their jurisdiction, and a correct read is still useful to them.

Ontario context you should apply:
- Parking tickets are municipal. Toronto and many other municipalities run an Administrative Penalty System: the response is a screening review, not a court date.
- Moving violations (speeding, careless driving, stunt driving, red light, stop sign, distracted driving, seatbelt, HOV) are Highway Traffic Act offences prosecuted under the Provincial Offences Act.
- An automated RED LIGHT CAMERA or SPEED CAMERA ticket is issued to the plate holder and carries NO demerit points. An officer-issued red light or speeding ticket does. Distinguish these carefully — cameras usually say "photo", show a photograph of the vehicle, and name no officer.
- Impaired driving / over 80 is a Criminal Code charge, not a Highway Traffic Act ticket. Classify it as "dui".
- 407 ETR, 412 and 418 bills are toll invoices, not offences. Classify as "toll".

Rules:
- Transcribe only what is legibly printed. Never guess a plate, a ticket number, or an amount — if a field is not clearly readable, return null for it and name it in unreadable_fields.
- Set confidence to "low" if the image is blurred, cropped, angled, or partly obscured; "medium" if most but not all key fields are clear; "high" only when amount, ticket number and date are all crisply legible.
- If the image is not a ticket, fine, or toll bill at all, set is_ticket false and doc_type "not_a_ticket".
- advice must be one sentence, plain English, no legal jargon, and must not promise an outcome.`;

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || '';
  const allowed = ALLOWED_ORIGINS.some((o) => origin.indexOf(o) === 0);

  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: 'Scanner is not configured on the server.' });

  const body = req.body || {};
  const image = typeof body.image === 'string' ? body.image : '';
  let mediaType = body.mediaType || 'image/jpeg';

  if (!image) return res.status(400).json({ ok: false, error: 'No image supplied.' });
  if (image.length > MAX_BASE64_CHARS) {
    return res.status(413).json({ ok: false, error: 'That photo is too large — try again and it will be resized.' });
  }
  if (ALLOWED_MEDIA.indexOf(mediaType) === -1) mediaType = 'image/jpeg';

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: TICKET_SCHEMA }
      },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: 'Read this ticket and extract every field you can. Return null for anything not clearly legible.' }
        ]
      }]
    });

    // A safety decline returns HTTP 200 — check before reading content.
    if (response.stop_reason === 'refusal') {
      return res.status(422).json({ ok: false, error: 'That image could not be processed. Try a photo of just the ticket.' });
    }
    if (response.stop_reason === 'max_tokens') {
      return res.status(502).json({ ok: false, error: 'The scan was cut short — please try again.' });
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock) return res.status(502).json({ ok: false, error: 'Empty response from the scanner.' });

    let ticket;
    try {
      ticket = JSON.parse(textBlock.text);
    } catch (e) {
      return res.status(502).json({ ok: false, error: 'Could not read the scanner response.' });
    }

    if (!ticket.is_ticket || ticket.doc_type === 'not_a_ticket') {
      return res.status(200).json({ ok: false, notATicket: true, error: 'No ticket detected — try a clearer photo of the whole ticket.' });
    }

    // Out-of-province: still hand back the read — it is useful to the driver —
    // but flag it, because our firms are licensed in Ontario and the fee and
    // demerit rules below the fold are Ontario's.
    const province = String(ticket.province || '').toUpperCase();
    const outOfProvince = Boolean(
      ticket.is_ontario === false || (province && province !== 'ON')
    );

    return res.status(200).json({
      ok: true,
      ticket,
      outOfProvince,
      jurisdiction: outOfProvince ? (ticket.jurisdiction || province || null) : null,
      usage: { input: response.usage.input_tokens, output: response.usage.output_tokens }
    });

  } catch (err) {
    // Typed SDK errors — most-specific first, so retryable and terminal differ.
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ ok: false, error: 'The scanner is busy right now — try again in a moment.' });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('[scan-ticket] auth failed — check CLAUDE_API_KEY');
      return res.status(500).json({ ok: false, error: 'Scanner is not configured correctly.' });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return res.status(503).json({ ok: false, error: 'Could not reach the scanner — check your connection.' });
    }
    if (err instanceof Anthropic.BadRequestError) {
      // A 400 here is our bug (bad schema / unsupported param), not the user's.
      console.error('[scan-ticket] bad request', err.status, err.message);
      return res.status(502).json({ ok: false, error: 'The scanner rejected that request — please try again.' });
    }
    // APIError is the base class for every HTTP status error in this SDK.
    if (err instanceof Anthropic.APIError) {
      console.error('[scan-ticket] api error', err.status, err.message);
      return res.status(502).json({ ok: false, error: 'The scanner returned an error — please try again.' });
    }
    console.error('[scan-ticket] unexpected', err && err.message);
    return res.status(500).json({ ok: false, error: 'Scan failed — please try again.' });
  }
};

// exported for the local test harness
module.exports.MODEL = MODEL;
module.exports.TICKET_SCHEMA = TICKET_SCHEMA;
module.exports.SYSTEM = SYSTEM;
