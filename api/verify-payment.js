const { sendJson, getStripeSession, verifyPaidSession } = require('./_helpers');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Dozwolona jest tylko metoda GET.' });
  const sessionId = String(req.query?.session_id || '');
  if (!sessionId.startsWith('cs_')) return sendJson(res, 400, { error: 'Nieprawidłowy identyfikator sesji Stripe.' });

  try {
    const session = await getStripeSession(sessionId);
    verifyPaidSession(session);
    return sendJson(res, 200, {
      paid: true,
      email: session.customer_details?.email || session.customer_email || '',
      customerName: session.customer_details?.name || ''
    });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'Nie udało się potwierdzić płatności.' });
  }
};
