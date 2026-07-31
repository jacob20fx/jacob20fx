const assert = require('assert');

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(k, v) { this.headers[k] = v; },
    end(v) { this.body = v || ''; }
  };
}

async function runHandler(handler, req) {
  const res = mockRes();
  await handler(req, res);
  return { status: res.statusCode, json: JSON.parse(res.body || '{}'), headers: res.headers };
}

async function main() {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  process.env.STRIPE_PAYMENT_LINK_ID = 'plink_ok';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_fake';
  process.env.DISCORD_INVITE_URL = 'https://discord.gg/example';

  const verify = require('../api/verify-payment');
  const sign = require('../api/sign-nda');
  const health = require('../api/health');

  // 1. Invalid Stripe session is rejected before network access.
  let r = await runHandler(verify, { method: 'GET', query: { session_id: 'bad' }, headers: {} });
  assert.equal(r.status, 400);

  // 2. Paid Stripe session is accepted and customer data is returned.
  global.fetch = async (url) => {
    assert(url.includes('/checkout/sessions/cs_test_123'));
    return new Response(JSON.stringify({
      id: 'cs_test_123', object: 'checkout.session', mode: 'payment', payment_status: 'paid',
      payment_link: 'plink_ok', customer_details: { email: 'buyer@example.com', name: 'Jan Kowalski' }
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  r = await runHandler(verify, { method: 'GET', query: { session_id: 'cs_test_123' }, headers: {} });
  assert.equal(r.status, 200);
  assert.equal(r.json.email, 'buyer@example.com');

  // 3. Unpaid session is rejected.
  global.fetch = async () => new Response(JSON.stringify({
    id: 'cs_test_unpaid', object: 'checkout.session', mode: 'payment', payment_status: 'unpaid', payment_link: 'plink_ok'
  }), { status: 200, headers: { 'content-type': 'application/json' } });
  r = await runHandler(verify, { method: 'GET', query: { session_id: 'cs_test_unpaid' }, headers: {} });
  assert.equal(r.status, 400);
  assert(r.json.error.includes('opłacona'));

  // 4. Signature mismatch is rejected.
  r = await runHandler(sign, { method: 'POST', headers: {}, body: {
    sessionId: 'cs_test_123', fullName: 'Jan Kowalski', signature: 'Jan K.', discordUsername: 'jan',
    ndaVersion: 'J20-NDA-2026-01', confidentialityAccepted: true, electronicSignatureAccepted: true, privacyAccepted: true
  }});
  assert.equal(r.status, 400);

  // 5. Full paid -> database write -> Discord flow succeeds and uses Bearer auth.
  let calls = 0;
  global.fetch = async (url, options = {}) => {
    calls += 1;
    if (String(url).includes('api.stripe.com')) {
      assert.equal(options.headers.Authorization, 'Bearer sk_test_fake');
      return new Response(JSON.stringify({
        id: 'cs_test_123', object: 'checkout.session', mode: 'payment', payment_status: 'paid',
        payment_link: 'plink_ok', customer_details: { email: 'buyer@example.com', name: 'Jan Kowalski' }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    assert(String(url).includes('/rest/v1/nda_signatures'));
    assert.equal(options.headers.Authorization, 'Bearer service_fake');
    assert.equal(options.headers.apikey, 'service_fake');
    const record = JSON.parse(options.body);
    assert.equal(record.stripe_customer_email, 'buyer@example.com');
    assert.equal(record.confidentiality_accepted, true);
    return new Response('', { status: 201 });
  };
  r = await runHandler(sign, { method: 'POST', headers: { 'user-agent': 'test', 'x-forwarded-for': '127.0.0.1' }, body: {
    sessionId: 'cs_test_123', fullName: 'Jan Kowalski', signature: 'Jan Kowalski', discordUsername: 'jan',
    ndaVersion: 'J20-NDA-2026-01', confidentialityAccepted: true, electronicSignatureAccepted: true, privacyAccepted: true
  }});
  assert.equal(r.status, 200);
  assert.equal(r.json.discordUrl, 'https://discord.gg/example');
  assert.equal(calls, 2);

  // Configuration health endpoint.
  r = await runHandler(health, { method: 'GET', headers: {} });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);

  global.fetch = originalFetch;
  process.env = originalEnv;
  console.log('PASS: 5 głównych testów przepływu + kontrola konfiguracji.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
