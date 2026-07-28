const cfg = window.J20_CONFIG;
const client = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const login = document.getElementById("login"), dashboard = document.getElementById("dashboard");

document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const { error } = await client.auth.signInWithPassword({ email:email.value, password:password.value });
  document.getElementById("loginMessage").textContent = error ? "Nieprawidłowe dane logowania albo brak uprawnień." : "";
  if (!error) show();
});
document.getElementById("logout").addEventListener("click", async () => { await client.auth.signOut(); location.reload(); });

async function show() {
  login.classList.add("hidden"); dashboard.classList.remove("hidden"); await render();
}
async function render() {
  const { data:apps, error } = await client.from("applications").select("*").order("created_at",{ascending:false});
  if (error) { document.getElementById("applications").innerHTML = `<p class="message">Brak dostępu. Dodaj swoje konto do tabeli admin_users.</p>`; return; }
  const counts = {all:apps.length,pending:apps.filter(x=>x.status==="pending").length,approved:apps.filter(x=>x.status==="approved").length,rejected:apps.filter(x=>x.status==="rejected").length};
  document.getElementById("stats").innerHTML = `<div><b>${counts.all}</b><span>Wszystkie</span></div><div><b>${counts.pending}</b><span>Oczekujące</span></div><div><b>${counts.approved}</b><span>Zaakceptowane</span></div><div><b>${counts.rejected}</b><span>Odrzucone</span></div>`;
  const box = document.getElementById("applications"), empty=document.getElementById("empty");
  if(!apps.length){box.innerHTML="";empty.classList.remove("hidden");return} empty.classList.add("hidden");
  box.innerHTML=apps.map(a=>`<article class="app-card"><div class="app-top"><div><h3>${esc(a.name)} <span class="pill ${a.status}">${label(a.status)}</span></h3><small>${a.application_code} · ${new Date(a.created_at).toLocaleString("pl-PL")} · ${esc(a.telegram)}</small></div></div><div class="answers"><div><b>WIEK / KRAJ</b>${a.age} / ${esc(a.country)}</div><div><b>DOŚWIADCZENIE / RYNEK</b>${esc(a.experience)} / ${esc(a.market)}</div><div><b>STRATEGIA</b>${esc(a.strategy)}</div><div><b>CEL</b>${esc(a.goal)}</div><div class="wide"><b>POWÓD DOŁĄCZENIA</b>${esc(a.reason)}</div></div><div class="card-actions"><button onclick="setStatus('${a.id}','approved')" class="accept">Akceptuj</button><button onclick="setStatus('${a.id}','rejected')" class="reject">Odrzuć</button><button onclick="removeApp('${a.id}')" class="delete">Usuń</button></div></article>`).join("");
}
window.setStatus=async(id,status)=>{await client.from("applications").update({status}).eq("id",id);await render()};
window.removeApp=async id=>{if(confirm("Usunąć zgłoszenie?")){await client.from("applications").delete().eq("id",id);await render()}};
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const label=s=>s==="approved"?"Zaakceptowano":s==="rejected"?"Odrzucono":"Oczekuje";
client.auth.getSession().then(({data})=>{if(data.session)show()});