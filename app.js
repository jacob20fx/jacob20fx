const STORAGE_KEY = "jacob20fx_applications_v1";
const TELEGRAM_URL = "https://t.me/jacob20FX";

const getApps = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveApps = (apps) => localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
const makeId = () => "J20-" + Math.random().toString(36).slice(2, 8).toUpperCase();

const form = document.getElementById("applicationForm");
const successBox = document.getElementById("successBox");
const idOutput = document.getElementById("applicationId");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const id = makeId();
  const apps = getApps();
  apps.unshift({
    id,
    ...data,
    status: "pending",
    createdAt: new Date().toISOString()
  });
  saveApps(apps);
  form.reset();
  idOutput.textContent = id;
  successBox.classList.remove("hidden");
  successBox.scrollIntoView({ behavior: "smooth", block: "center" });
});

document.getElementById("copyId").addEventListener("click", async () => {
  await navigator.clipboard.writeText(idOutput.textContent);
  document.getElementById("copyId").textContent = "Skopiowano";
});

document.getElementById("statusForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = document.getElementById("statusId").value.trim().toUpperCase();
  const app = getApps().find(item => item.id === id);
  const result = document.getElementById("statusResult");
  result.classList.remove("hidden");

  if (!app) {
    result.innerHTML = "<strong>Nie znaleziono zgłoszenia.</strong><p>Sprawdź, czy numer został wpisany poprawnie.</p>";
    return;
  }

  if (app.status === "approved") {
    result.innerHTML = `
      <div class="approved-contact">
        <div>
          <span class="status-pill approved">ZAAKCEPTOWANO</span>
          <h3>Twoje zgłoszenie zostało przyjęte.</h3>
          <p>Skontaktuj się z administratorem na Telegramie. Podaj swój numer aplikacji: <strong>${app.id}</strong>.</p>
          <a class="primary-btn" href="${TELEGRAM_URL}" target="_blank" rel="noopener">Otwórz Telegram</a>
        </div>
        <img src="telegram-kontakt.jpg" alt="Kod QR do kontaktu na Telegramie JACOBFX">
      </div>`;
  } else if (app.status === "rejected") {
    result.innerHTML = `<span class="status-pill rejected">ODRZUCONO</span><h3>Zgłoszenie nie zostało zaakceptowane.</h3><p>Dziękujemy za poświęcony czas.</p>`;
  } else {
    result.innerHTML = `<span class="status-pill pending">OCZEKUJE</span><h3>Zgłoszenie jest w trakcie weryfikacji.</h3><p>Wróć później i sprawdź status ponownie.</p>`;
  }
});
