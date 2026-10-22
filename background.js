async function ensureOffscreen() {
  const ctx = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (ctx.length) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Play Quran recitation while the popup is closed"
  });
}
chrome.runtime.onMessage.addListener((m, _s, send) => {
  if (m && m.type === "ensure") {
    ensureOffscreen().then(() => send({ ok: true }));
    return true;
  }
});
