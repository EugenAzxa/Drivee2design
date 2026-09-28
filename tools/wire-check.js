// Confirms what the SDK actually puts on the wire for our scan request —
// specifically that `output_config` (structured outputs + effort) and
// `thinking` survive serialisation on this SDK version. Runs against a local
// echo server, so it needs no API key and spends nothing.
const http = require('http');
const Anthropic = require('@anthropic-ai/sdk');
const { TICKET_SCHEMA, SYSTEM } = require('../api/scan-ticket.js');

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch (e) { parsed = { PARSE_FAIL: body.slice(0, 200) }; }

    console.log('── request line ───────────────────────────────');
    console.log(req.method, req.url);
    console.log('anthropic-version:', req.headers['anthropic-version'] || '(none)');
    console.log('has x-api-key    :', !!req.headers['x-api-key']);
    console.log();
    console.log('── body keys ──────────────────────────────────');
    console.log(Object.keys(parsed).join(', '));
    console.log();
    console.log('model        :', parsed.model);
    console.log('max_tokens   :', parsed.max_tokens);
    console.log('thinking     :', JSON.stringify(parsed.thinking));
    console.log('output_config:', parsed.output_config
      ? 'effort=' + parsed.output_config.effort +
        ' format.type=' + (parsed.output_config.format && parsed.output_config.format.type) +
        ' schema.props=' + Object.keys(
          (parsed.output_config.format && parsed.output_config.format.schema && parsed.output_config.format.schema.properties) || {}
        ).length
      : '*** MISSING — structured outputs would NOT be applied ***');
    console.log('system       :', typeof parsed.system === 'string' ? parsed.system.length + ' chars' : JSON.stringify(parsed.system).slice(0, 60));

    const content = parsed.messages && parsed.messages[0] && parsed.messages[0].content;
    if (Array.isArray(content)) {
      console.log('content      :', content.map((b) => {
        if (b.type === 'image') return 'image(' + b.source.media_type + ', ' + b.source.data.length + ' b64 chars)';
        return b.type;
      }).join(' + '));
    }
    console.log();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: 'msg_echo', type: 'message', role: 'assistant', model: parsed.model,
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify(SAMPLE) }],
      usage: { input_tokens: 1200, output_tokens: 180 }
    }));
  });
});

const SAMPLE = {
  is_ticket: true, doc_type: 'parking', amount: 30, ticket_number: 'PA12345678',
  plate: 'CJTK 771', province: 'ON', municipality: 'Toronto',
  issued_date: '2026-09-10', due_date: '2026-09-25',
  location: '250 King St W', offence_text: 'Park on private property without consent',
  statute_section: 'Ch. 950-300', speed_over: null,
  confidence: 'high', unreadable_fields: [], advice: 'Worth a screening review if signage was obscured.'
};

server.listen(0, async () => {
  const port = server.address().port;
  const client = new Anthropic({ apiKey: 'sk-ant-test-not-real', baseURL: 'http://127.0.0.1:' + port });

  try {
    const r = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 8000,
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: TICKET_SCHEMA } },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD'.repeat(50) } },
          { type: 'text', text: 'Read this ticket.' }
        ]
      }]
    });
    console.log('── round trip ─────────────────────────────────');
    console.log('stop_reason:', r.stop_reason);
    const parsed = JSON.parse(r.content.find((b) => b.type === 'text').text);
    console.log('parsed doc_type:', parsed.doc_type, '| amount:', parsed.amount, '| confidence:', parsed.confidence);
  } catch (e) {
    console.log('ERROR:', e.constructor.name, e.message);
  }
  server.close();
});
