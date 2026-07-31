(() => {
  'use strict';

  const NDA_VERSION = 'J20-NDA-2026-01';
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  const loading = document.getElementById('loading');
  const paymentError = document.getElementById('paymentError');
  const paymentErrorText = document.getElementById('paymentErrorText');
  const ndaSection = document.getElementById('ndaSection');
  const successSection = document.getElementById('successSection');
  const ndaForm = document.getElementById('ndaForm');
  const emailInput = document.getElementById('email');
  const signBtn = document.getElementById('signBtn');
  const formMessage = document.getElementById('formMessage');
  const discordButton = document.getElementById('discordButton');

  let verifiedEmail = '';

  function showPaymentError(message) {
    loading.classList.add('hidden');
    ndaSection.classList.add('hidden');
    paymentError.classList.remove('hidden');
    paymentErrorText.textContent = message;
  }

  async function parseResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Wystąpił błąd serwera.');
    return data;
  }

  async function verifyPayment() {
    if (!sessionId || !sessionId.startsWith('cs_')) {
      showPaymentError('Brakuje prawidłowego identyfikatora sesji Stripe. Wróć do linku płatniczego i zakończ płatność.');
      return;
    }

    try {
      const response = await fetch(`/api/verify-payment?session_id=${encodeURIComponent(sessionId)}`, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await parseResponse(response);
      verifiedEmail = data.email || '';
      emailInput.value = verifiedEmail;
      loading.classList.add('hidden');
      ndaSection.classList.remove('hidden');
    } catch (error) {
      showPaymentError(error.message);
    }
  }

  ndaForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    formMessage.textContent = '';
    formMessage.classList.remove('error-text');

    const formData = new FormData(ndaForm);
    const fullName = String(formData.get('fullName') || '').trim();
    const signature = String(formData.get('signature') || '').trim();

    if (fullName.toLocaleLowerCase('pl') !== signature.toLocaleLowerCase('pl')) {
      formMessage.textContent = 'Podpis musi być identyczny jak wpisane imię i nazwisko.';
      formMessage.classList.add('error-text');
      return;
    }

    signBtn.disabled = true;
    signBtn.textContent = 'Zapisywanie podpisu…';

    try {
      const response = await fetch('/api/sign-nda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          sessionId,
          fullName,
          email: verifiedEmail,
          discordUsername: String(formData.get('discordUsername') || '').trim(),
          signature,
          ndaVersion: NDA_VERSION,
          confidentialityAccepted: formData.get('confidentialityAccepted') === 'on',
          electronicSignatureAccepted: formData.get('electronicSignatureAccepted') === 'on',
          privacyAccepted: formData.get('privacyAccepted') === 'on'
        })
      });
      const data = await parseResponse(response);
      discordButton.href = data.discordUrl;
      ndaSection.classList.add('hidden');
      successSection.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      formMessage.textContent = error.message;
      formMessage.classList.add('error-text');
    } finally {
      signBtn.disabled = false;
      signBtn.textContent = 'Podpisuję NDA';
    }
  });

  verifyPayment();
})();
