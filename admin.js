const STORAGE_KEY = "jacob20fx_applications_v1";
const ADMIN_PIN = "2020";

const getApps = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const saveApps = (apps) => localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));

const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("dashboard");

document.getElementById("pinForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (document.getElementById("pinInput").value === ADMIN_PIN) {
    sessionStorage.setItem("j20_admin", "yes");
    showDashboard();
  } else {
    document.getElementById("pinError").classList.remove("hidden");
  }
});

function showDashboard() {
  loginPanel.classList.add("hidden");
  dashboard.classList.remove("hidden");
  render();
}

function statusLabel(status) {
  return status === "approved" ? "Zaakceptowano" : status === "rejected" ? "Odrzucono" : "Oczekuje";
}

function render() {
  const apps = getApps();
  const list = document.getElementById("applications");
  const empty = document.getElementById("emptyState");
  const counts = {
    all: apps.length,
    pending: apps.filter(a => a.status === "pending").length,
    approved: apps.filter(a => a.status === "approved").length,
    rejected: apps.filter(a => a.status === "rejected").length
  };
  document.getElementById("stats").innerHTML = `
    <div class="stat"><strong>${counts.all}</strong><span>Wszystkie</span></div>
    <div class="stat"><strong>${counts.pending}</strong><span>Oczekujące</span></div>
    <div class="stat"><strong>${counts.approved}</strong><span>Zaakceptowane</span></div>
    <div class="stat"><strong>${counts.rejected}</strong><span>Odrzucone</span></div>`;

  if (!apps.length) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  list.innerHTML = apps.map(app => `
    <article class="application-card">
      <div class="application-top">
        <div>
          <h3>${escapeHtml(app.name)} <span class="status-pill ${app.status}">${statusLabel(app.status)}</span></h3>
          <div class="application-meta">${app.id} · ${new Date(app.createdAt).toLocaleString("pl-PL")} · ${escapeHtml(app.telegram)}</div>
        </div>
      </div>
      <div class="answer-grid">
        <div class="answer"><b>WIEK / KRAJ</b>${escapeHtml(app.age)} / ${escapeHtml(app.country)}</div>
        <div class="answer"><b>DOŚWIADCZENIE / RYNEK</b>${escapeHtml(app.experience)} / ${escapeHtml(app.market)}</div>
        <div class="answer"><b>STRATEGIA</b>${escapeHtml(app.strategy)}</div>
        <div class="answer"><b>CEL</b>${escapeHtml(app.goal)}</div>
        <div class="answer" style="grid-column:1/-1"><b>DLACZEGO CHCE DOŁĄCZYĆ</b>${escapeHtml(app.reason)}</div>
      </div>
      <div class="card-actions">
        <button class="approve-btn" onclick="setStatus('${app.id}','approved')">Akceptuj</button>
        <button class="reject-btn" onclick="setStatus('${app.id}','rejected')">Odrzuć</button>
        <button class="delete-btn" onclick="removeApp('${app.id}')">Usuń</button>
      </div>
    </article>`).join("");
}

window.setStatus = (id, status) => {
  const apps = getApps().map(app => app.id === id ? {...app, status} : app);
  saveApps(apps);
  render();
};

window.removeApp = (id) => {
  if (!confirm("Usunąć zgłoszenie?")) return;
  saveApps(getApps().filter(app => app.id !== id));
  render();
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(getApps(), null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jacob20fx-zgloszenia.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("j20_admin");
  location.reload();
});

if (sessionStorage.getItem("j20_admin") === "yes") showDashboard();
