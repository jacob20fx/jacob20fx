const { sendJson, getStripeSession, verifyPaidSession, safeError } = require('./_helpers');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Dozwolona jest tylko metoda GET.' });

  const sessionId = String(req.query?.session_id || '').trim();
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
    return sendJson(res, 400, { error: 'Nieprawidłowy identyfikator sesji Stripe.' });
  }

  try {
    const session = await getStripeSession(sessionId);
    verifyPaidSession(session);
    const email = session.customer_details?.email || session.customer_email || '';
    if (!email) throw new Error('Płatność nie zawiera adresu e-mail.');

    return sendJson(res, 200, {
      paid: true,
      email,
      customerName: session.customer_details?.name || '',
      sessionId: session.id
    });
  } catch (error) {
    console.error('verify-payment:', error);
    return sendJson(res, 400, { error: safeError(error, 'Nie udało się potwierdzić płatności.') });
  }
};
