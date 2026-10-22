// Full-surah audio from quranicaudio.com. Add more reciters by folder name.
const RECITERS = [
  { id: "mishaari_raashid_al_3afaasee", name: "Mishary Rashid Alafasy" },
  { id: "abdurrahmaan_as-sudays",       name: "Abdur-Rahman As-Sudais" },
  { id: "sa3ood_ash-shuraym",           name: "Saud Ash-Shuraim" },
  { id: "maher_almu3aiqly/year1440",    name: "Maher Al-Muaiqly" }
];
function surahUrl(reciter, n) {
  return `https://download.quranicaudio.com/quran/${reciter}/${String(n).padStart(3, "0")}.mp3`;
}
