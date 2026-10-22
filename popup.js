const $ = id => document.getElementById(id);
let surahs = [], filtered = [], cur = null, st = {};

const norm = s => (s || "").toLowerCase()
  .replace(/[\u064B-\u0652\u0670]/g, "")        // Arabic diacritics
  .replace(/[^a-z0-9\u0600-\u06FF]/g, "")
  .replace(/^al/, "");

const fmt = t => { t = Math.floor(t || 0); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };
const send = msg => chrome.runtime.sendMessage({ target: "offscreen", ...msg }).catch(() => null);

async function loadSurahs() {
  const { surahs: cached } = await chrome.storage.local.get("surahs");
  if (cached && cached.length === 114) return cached;
  const r = await fetch("https://api.alquran.cloud/v1/surah");
  const j = await r.json();
  await chrome.storage.local.set({ surahs: j.data });
  return j.data;
}

function render() {
  const list = $("list");
  $("count").textContent = filtered.length === 114 ? "" : `${filtered.length} found`;
  if (!filtered.length) { list.innerHTML = '<div class="msg">No surah found</div>'; return; }
  list.innerHTML = filtered.map(s => `
    <div class="row ${s.number === cur ? "active" : ""}" data-n="${s.number}">
      <div class="num">${s.number}</div>
      <div class="info"><b>${s.englishName}</b>
        <span>${s.englishNameTranslation} · ${s.numberOfAyahs} ayahs · ${s.revelationType}</span></div>
      <div class="ar">${s.name.replace("سُورَةُ ", "")}</div>
    </div>`).join("");
}

function search() {
  const raw = $("q").value.trim();
  const q = norm(raw);
  if (!q) filtered = surahs;
  else if (/^\d+$/.test(raw)) filtered = surahs.filter(s => String(s.number).startsWith(raw));
  else filtered = surahs.filter(s =>
    norm(s.englishName).includes(q) || norm(s.englishNameTranslation).includes(q) ||
    norm(s.name).includes(q) || norm(s.englishName).replace(/[aeiou]/g, "").includes(q.replace(/[aeiou]/g, "")));
  render();
}

function updateUI(s) {
  st = s; 
  if (s.surah) {
    $("player").classList.remove("hidden");
    const info = surahs.find(x => x.number === s.surah);
    $("pTitle").textContent = info ? `${s.surah}. ${info.englishName}` : `Surah ${s.surah}`;
    $("pSub").textContent = s.error ? "⚠ Could not load audio" : (info ? info.englishNameTranslation : "");
    $("toggle").textContent = s.playing ? "⏸" : "▶";
    if (!seeking) {
      $("seek").max = s.duration || 100;
      $("seek").value = s.current;
    }
    $("tCur").textContent = fmt(s.current);
    $("tDur").textContent = fmt(s.duration);
    $("vol").value = s.volume;
    $("rate").value = String(s.rate);
    if (s.reciter) $("reciter").value = s.reciter;
    if (cur !== s.surah) { cur = s.surah; render(); scrollActive(); chrome.storage.local.set({ last: cur }); }
  }
}
const scrollActive = () => document.querySelector(".row.active")?.scrollIntoView({ block: "nearest" });

let seeking = false;
async function init() {
  $("reciter").innerHTML = RECITERS.map(r => `<option value="${r.id}">${r.name}</option>`).join("");
  const { reciter } = await chrome.storage.local.get("reciter");
  if (reciter) $("reciter").value = reciter;

  try { surahs = await loadSurahs(); }
  catch { $("list").innerHTML = '<div class="msg">Internet connection needed for first load.</div>'; return; }
  filtered = surahs; render();

  await chrome.runtime.sendMessage({ type: "ensure" });
  const s = await send({ cmd: "getState" });
  if (s) updateUI(s);
}

$("q").addEventListener("input", search);
$("list").addEventListener("click", e => {
  const row = e.target.closest(".row"); if (!row) return;
  send({ cmd: "play", surah: +row.dataset.n, reciter: $("reciter").value }).then(s => s && updateUI(s));
});
$("reciter").addEventListener("change", () => {
  chrome.storage.local.set({ reciter: $("reciter").value });
  if (st.surah) send({ cmd: "play", surah: st.surah, reciter: $("reciter").value });
});
$("toggle").onclick = () => send({ cmd: "toggle" });
$("next").onclick = () => send({ cmd: "next" });
$("prev").onclick = () => send({ cmd: "prev" });
$("vol").oninput = e => send({ cmd: "volume", value: +e.target.value });
$("rate").onchange = e => send({ cmd: "rate", value: +e.target.value });
$("seek").addEventListener("input", () => { seeking = true; $("tCur").textContent = fmt($("seek").value); });
$("seek").addEventListener("change", () => { send({ cmd: "seek", time: +$("seek").value }); seeking = false; });

chrome.runtime.onMessage.addListener(m => { if (m.type === "state") updateUI(m); });
init();
