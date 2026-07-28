const cfg = window.J20_CONFIG;
const client = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

function randomCode() {
  const bytes = new Uint8Array(7);
  crypto.getRandomValues(bytes);
  return "J20-" + Array.from(bytes, b => b.toString(36).padStart(2, "0")).join("").slice(0, 10).toUpperCase();
}
const form = document.getElementById("applicationForm");
const msg = document.getElementById("formMessage");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = document.getElementById("submitBtn");
  button.disabled = true; button.textContent = "Wysyłanie…"; msg.textContent = "";
  const d = Object.fromEntries(new FormData(form).entries());
  const application_code = randomCode();
  const { error } = await client.from("applications").insert({
    application_code, name:d.name, age:Number(d.age), telegram:d.telegram, email:d.email, country:d.country,
    experience:d.experience, market:d.market, strategy:d.strategy, reason:d.reason, goal:d.goal
  });
  button.disabled = false; button.textContent = "Wyślij zgłoszenie";
  if (error) { console.error(error); msg.textContent = "Nie udało się wysłać zgłoszenia. Sprawdź konfigurację Supabase."; return; }
  form.reset();
  fetch("/api/send-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: d.name,
    email: d.email,
    telegram: d.telegram,
    applicationCode: application_code
  })
}).catch(error => console.error("Email error:", error));,
  document.getElementById("applicationCode").textContent = application_code;
  document.getElementById("success").classList.remove("hidden");
  document.getElementById("success").scrollIntoView({behavior:"smooth", block:"center"});
});
document.getElementById("copyCode").addEventListener("click", async () => {
  await navigator.clipboard.writeText(document.getElementById("applicationCode").textContent);
  document.getElementById("copyCode").textContent = "Skopiowano";
});
document.getElementById("statusForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = document.getElementById("statusCode").value.trim().toUpperCase();
  const out = document.getElementById("statusResult");
  out.classList.remove("hidden"); out.innerHTML = "Sprawdzanie…";
  const { data, error } = await client.rpc("get_application_status", { p_code: code });
  if (error || !data || !data.length) { out.innerHTML = "<h3>Nie znaleziono zgłoszenia</h3><p>Sprawdź numer aplikacji.</p>"; return; }
  const status = data[0].status;
  if (status === "approved") out.innerHTML = `<div class="approved-box"><div><span class="pill approved">ZAAKCEPTOWANO</span><h3>Twoje zgłoszenie zostało przyjęte.</h3><p>Skontaktuj się na Telegramie i podaj numer <strong>${code}</strong>.</p><a class="primary" target="_blank" rel="noopener" href="${cfg.TELEGRAM_URL}">Otwórz Telegram @jacob20FX</a></div><img src="telegram-kontakt.jpg" alt="Kontakt Telegram"></div>`;
  else if (status === "rejected") out.innerHTML = '<span class="pill rejected">ODRZUCONO</span><h3>Zgłoszenie nie zostało zaakceptowane.</h3>';
  else out.innerHTML = '<span class="pill pending">OCZEKUJE</span><h3>Zgłoszenie jest w trakcie weryfikacji.</h3><p>Sprawdź ponownie później.</p>';
});
