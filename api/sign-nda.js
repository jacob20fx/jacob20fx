const crypto = require('crypto');
const { sendJson, getStripeSession, verifyPaidSession, supabaseRequest, getClientIp, requiredEnv } = require('./_helpers');

const NDA_VERSION = 'J20-NDA-2026-01';

function clean(value, max) {
  return String(value || '').trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Dozwolona jest tylko metoda POST.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const sessionId = clean(body.sessionId, 255);
    const fullName = clean(body.fullName, 120);
    const discordUsername = clean(body.discordUsername, 80);
    const signature = clean(body.signature, 120);

    if (!sessionId.startsWith('cs_')) throw new Error('Nieprawidłowy identyfikator płatności.');
    if (fullName.length < 3 || signature.length < 3 || discordUsername.length < 2) throw new Error('Uzupełnij wszystkie wymagane dane.');
    if (fullName.toLocaleLowerCase('pl') !== signature.toLocaleLowerCase('pl')) throw new Error('Podpis musi być identyczny jak imię i nazwisko.');
    if (body.ndaVersion !== NDA_VERSION) throw new Error('Wersja NDA jest nieprawidłowa. Odśwież stronę.');
    if (!body.confidentialityAccepted || !body.electronicSignatureAccepted || !body.privacyAccepted) throw new Error('Wszystkie wymagane zgody muszą zostać zaznaczone.');

    const session = await getStripeSession(sessionId);
    verifyPaidSession(session);
    const stripeEmail = clean(session.customer_details?.email || session.customer_email, 254).toLowerCase();
    if (!stripeEmail) throw new Error('Sesja Stripe nie zawiera adresu e-mail klienta.');

    const signedAt = new Date().toISOString();
    const ndaTextHash = crypto.createHash('sha256').update(NDA_VERSION).digest('hex');
    const record = {
      stripe_session_id: sessionId,
      stripe_payment_link_id: session.payment_link || null,
      stripe_customer_email: stripeEmail,
      full_name: fullName,
      discord_username: discordUsername,
      signature_text: signature,
      nda_version: NDA_VERSION,
      nda_text_hash: ndaTextHash,
      signed_at: signedAt,
      ip_address: getClientIp(req),
      user_agent: clean(req.headers['user-agent'], 500),
      confidentiality_accepted: true,
      electronic_signature_accepted: true,
      privacy_notice_accepted: true
    };

    await supabaseRequest('nda_signatures?on_conflict=stripe_session_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(record)
    });

    const discordUrl = requiredEnv('DISCORD_INVITE_URL');
    return sendJson(res, 200, { signed: true, discordUrl });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || 'Nie udało się zapisać podpisu.' });
  }
};
