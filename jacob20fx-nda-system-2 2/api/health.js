const { sendJson } = require('./_helpers');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false });
  const required = ['STRIPE_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DISCORD_INVITE_URL'];
  const missing = required.filter((name) => !String(process.env[name] || '').trim());
  return sendJson(res, missing.length ? 503 : 200, {
    ok: missing.length === 0,
    configuration: missing.length ? 'incomplete' : 'complete',
    missing
  });
};
