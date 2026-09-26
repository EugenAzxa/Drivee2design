var ALLOWED_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6'
];
var MAX_TOKENS_LIMIT = 500;
var ALLOWED_ORIGINS = [
  'https://drivee.ca',
  'https://www.drivee.ca',
  'http://localhost',
  'http://127.0.0.1'
];

module.exports = async function handler(req, res) {
  var origin = req.headers.origin || req.headers.referer || '';
  var allowed = ALLOWED_ORIGINS.some(function(o) { return origin.indexOf(o) === 0; });

  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server' });

  // Validate request body
  var body = req.body || {};
  var model = body.model;
  var maxTokens = body.max_tokens;

  if (!model || ALLOWED_MODELS.indexOf(model) === -1) {
    return res.status(400).json({ error: 'Invalid or disallowed model' });
  }

  if (!maxTokens || maxTokens > MAX_TOKENS_LIMIT) {
    body.max_tokens = MAX_TOKENS_LIMIT;
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: 'Messages required' });
  }

  // Only forward safe fields
  var safeBody = {
    model: model,
    max_tokens: body.max_tokens,
    messages: body.messages
  };
  if (body.system) safeBody.system = body.system;

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(safeBody)
    });

    var data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reach Claude' });
  }
};
