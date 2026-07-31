const STRIPE_API = 'https://api.stripe.com/v1';

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Brak zmiennej środowiskowej ${name}.`);
  return value;
}

async function getStripeSession(sessionId) {
  const stripeSecretKey = requiredEnv('STRIPE_SECRET_KEY');
  const response = await fetch(`${STRIPE_API}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Nie udało się sprawdzić sesji Stripe.');
  return data;
}

function verifyPaidSession(session) {
  const allowedPaymentLinkId = process.env.STRIPE_PAYMENT_LINK_ID;
  if (session.payment_status !== 'paid') throw new Error('Płatność nie została oznaczona jako opłacona.');
  if (allowedPaymentLinkId && session.payment_link !== allowedPaymentLinkId) {
    throw new Error('Ta płatność nie pochodzi z właściwego linku Stripe.');
  }
}

async function supabaseRequest(path, options = {}) {
  const url = requiredEnv('SUPABASE_URL');
  const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: Bearer ${serviceKey},
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.message || data?.error || 'Błąd zapisu w bazie danych.');
  return data;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0].trim() || null;
}

module.exports = { sendJson, getStripeSession, verifyPaidSession, supabaseRequest, getClientIp, requiredEnv };
