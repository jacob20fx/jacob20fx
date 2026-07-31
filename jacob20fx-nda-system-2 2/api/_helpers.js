const STRIPE_API = 'https://api.stripe.com/v1';
const REQUEST_TIMEOUT_MS = 12000;

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Brak konfiguracji serwera: ${name}.`);
  return value;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Serwer zewnętrzny nie odpowiedział na czas. Spróbuj ponownie.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function getStripeSession(sessionId) {
  const stripeSecretKey = requiredEnv('STRIPE_SECRET_KEY');
  const response = await fetchWithTimeout(`${STRIPE_API}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Stripe-Version': '2024-06-20'
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || 'Nie udało się sprawdzić sesji Stripe.');
  return data;
}

function verifyPaidSession(session) {
  const allowedPaymentLinkId = String(process.env.STRIPE_PAYMENT_LINK_ID || '').trim();
  if (!session || session.object !== 'checkout.session') throw new Error('Stripe zwrócił nieprawidłową sesję.');
  if (session.mode !== 'payment' && session.mode !== 'subscription') throw new Error('Nieobsługiwany typ płatności Stripe.');
  if (session.payment_status !== 'paid') throw new Error('Płatność nie została oznaczona jako opłacona.');
  if (allowedPaymentLinkId && session.payment_link !== allowedPaymentLinkId) {
    throw new Error('Ta płatność nie pochodzi z właściwego linku Stripe.');
  }
}

async function supabaseRequest(path, options = {}) {
  const baseUrl = requiredEnv('SUPABASE_URL').replace(/\/+$/, '');
  const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetchWithTimeout(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const detail = data?.message || data?.details || data?.hint || data?.error;
    throw new Error(detail || 'Błąd zapisu w bazie danych.');
  }
  return data;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0].trim();
  return value || null;
}

function safeError(error, fallback) {
  const message = String(error?.message || fallback || 'Wystąpił błąd.');
  if (message.includes('STRIPE_SECRET_KEY') || message.includes('SUPABASE_') || message.includes('DISCORD_INVITE_URL')) {
    return 'System nie został jeszcze w pełni skonfigurowany na serwerze. Skontaktuj się z administratorem.';
  }
  return message;
}

module.exports = {
  sendJson,
  getStripeSession,
  verifyPaidSession,
  supabaseRequest,
  getClientIp,
  requiredEnv,
  safeError
};
