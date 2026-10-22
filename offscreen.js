const audio = new Audio();
audio.preload = "auto";
let surah = null, reciter = RECITERS[0].id, error = false;

const getState = () => ({
  type: "state", surah, reciter,
  playing: !audio.paused && !audio.ended,
  current: audio.currentTime || 0,
  duration: isFinite(audio.duration) ? audio.duration : 0,
  volume: audio.volume, rate: audio.playbackRate, error
});
const push = () => chrome.runtime.sendMessage(getState()).catch(() => {});

function play(n, r) {
  if (n < 1 || n > 114) return;
  surah = n; reciter = r || reciter; error = false;
  audio.src = surahUrl(reciter, n);
  audio.play().catch(() => { error = true; push(); });
  push();
}

audio.addEventListener("ended", () => { if (surah && surah < 114) play(surah + 1); else push(); });
audio.addEventListener("error", () => { error = true; push(); });
["play", "pause", "loadedmetadata"].forEach(e => audio.addEventListener(e, push));
setInterval(() => { if (!audio.paused) push(); }, 500);

chrome.runtime.onMessage.addListener((m, _s, send) => {
  if (m.target !== "offscreen") return;
  switch (m.cmd) {
    case "play":   play(m.surah, m.reciter); break;
    case "toggle": audio.paused ? audio.play().catch(() => {}) : audio.pause(); break;
    case "seek":   audio.currentTime = m.time; break;
    case "volume": audio.volume = m.value; break;
    case "rate":   audio.playbackRate = m.value; break;
    case "next":   if (surah) play(surah + 1); break;
    case "prev":   if (surah) play(surah - 1); break;
  }
  send(getState());
});
