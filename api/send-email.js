export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, telegram, applicationCode } = req.body || {};

    if (!name  !email  !applicationCode) {
      return res.status(400).json({ error: "Brak wymaganych danych" });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL;
    const from = process.env.RESEND_FROM || "Jacob20FX <onboarding@resend.dev>";

    if (!apiKey || !adminEmail) {
      return res.status(500).json({ error: "Brak konfiguracji e-mail" });
    }

    // Dopóki używamy onboarding@resend.dev, wiadomości testowe
    // wysyłamy na adres właściciela konta Resend.
    const candidateRecipient = adminEmail;

    const candidateHtml = `
      <div style="background:#070912;padding:40px 20px;font-family:Arial,sans-serif;color:#ffffff">
        <div style="max-width:600px;margin:auto;background:#111528;border:1px solid #273052;border-radius:20px;padding:32px">
          <div style="font-size:25px;font-weight:800;color:#52b8ff">JACOB20FX</div>
          <p style="color:#8395c8;margin-top:4px">KEY IS TIMING AND CYCLE</p>

          <h1 style="font-size:26px;margin-top:30px">Application received</h1>

          <p style="color:#c4c9db;line-height:1.7">
            Hi ${escapeHtml(name)},<br><br>
            Your application to join Jacob20FX has been successfully received.
            Every application is reviewed manually.
          </p>

          <div style="background:#0a0d19;border-radius:12px;padding:18px;margin:24px 0">
            <div style="color:#8395c8;font-size:12px">APPLICATION CODE</div>
            <div style="font-size:22px;font-weight:800;color:#52b8ff">${escapeHtml(applicationCode)}</div>
          </div>

          <p style="color:#c4c9db">
            Save this code — you will need it to check your application status.
          </p>

          <p style="color:#7f879f;font-size:12px;margin-top:35px">
            Test recipient: ${escapeHtml(email)}
          </p>
        </div>
      </div>
    `;

    const adminHtml = `
      <div style="font-family:Arial,sans-serif;padding:25px">
        <h2>Nowe zgłoszenie — Jacob20FX</h2>
        <p><strong>Imię/nick:</strong> ${escapeHtml(name)}</p>
        <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
        <p><strong>Telegram:</strong> ${escapeHtml(telegram || "-")}</p>
        <p><strong>Kod:</strong> ${escapeHtml(applicationCode)}</p>
        <p>
          <a href="https://jacob20fx.vercel.app/admin.html">
            Otwórz panel administratora
          </a>
        </p>
      </div>
    `;

    const messages = [
      {
        from,
        to: [candidateRecipient],
        subject: [TEST] Application Received — ${applicationCode},
        html: candidateHtml
      },
      {
        from,
        to: [adminEmail],
        subject: Nowe zgłoszenie Jacob20FX — ${name},
        html: adminHtml
      }
    ];

    const results = [];

    for (const message of messages) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: Bearer ${apiKey},
          "Content-Type": "application/json"
        },
        body: JSON.stringify(message)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Błąd wysyłania wiadomości");
      }

      results.push(data);
    }

    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Email error:", error);
    return res.status(500).json({
      error: error.message || "Nie udało się wysłać wiadomości"
    });
  }
}

function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    char =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]
  );
}
