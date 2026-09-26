// Daily cron — runs a lightweight Supabase query to prevent free-tier project pause.
module.exports = async function handler(req, res) {
  var supabaseUrl = process.env.SUPABASE_URL || 'https://ofnsssyiiejohcnbejxq.supabase.co';
  var supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (!supabaseKey) {
    return res.status(500).json({ ok: false, error: 'No Supabase key' });
  }

  try {
    var response = await fetch(supabaseUrl + '/rest/v1/analytics?select=id&limit=1', {
      headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey
      }
    });
    var status = response.status;
    console.log('[keepalive] Supabase ping status:', status);
    return res.status(200).json({ ok: true, supabase: status, ts: new Date().toISOString() });
  } catch (err) {
    console.error('[keepalive] Supabase ping failed:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
