// ================= recorded voices for the story dialogue =================
// Each line has an id (a hash of its text). A line plays a real recording when one exists:
// 1) recorded on this device with record.html (kept in IndexedDB), or 2) shipped in assets/voices (listed in index.json by build.py).
// Otherwise the game falls back to the computer voice.
const VOICE = { files: {}, db: null, cur: null, local: new Set() };
function vHash(t){ let h = 0x811c9dc5; for (const ch of t){ h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
fetch('assets/voices/index.json').then(r => r.ok ? r.json() : {}).then(j => { VOICE.files = j || {}; }).catch(() => {});
function vDb(){ return new Promise((res, rej) => { const rq = indexedDB.open('tayara-voices', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('lines'); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); }); }
function vRefreshLocal(){ if (!window.indexedDB) return; vDb().then(db => { VOICE.db = db; const rq = db.transaction('lines').objectStore('lines').getAllKeys(); rq.onsuccess = () => { VOICE.local = new Set(rq.result); }; }).catch(() => {}); }
vRefreshLocal(); addEventListener('focus', vRefreshLocal);
function stopVoice(){ if (VOICE.cur){ try { VOICE.cur.pause(); } catch(e){} VOICE.cur = null; } }
function startAudio(src, revoke){ const a = new Audio(src); a.muted = muted; VOICE.cur = a; a.play().catch(() => {}); a.onended = () => { if (revoke) URL.revokeObjectURL(src); }; return a; }
function playVoice(text){
  stopVoice(); const id = vHash(text);
  if (VOICE.db && VOICE.local.has(id)){ const rq = VOICE.db.transaction('lines').objectStore('lines').get(id); rq.onsuccess = () => { const v = rq.result; if (v && v.blob) startAudio(URL.createObjectURL(v.blob), true); }; VOICE.cur = { paused: false, duration: 3, currentTime: 0, pause(){} }; return true; }
  const f = VOICE.files[id]; if (f){ startAudio('assets/voices/' + f); return true; }
  return false;
}
function voiceLeft(){ const a = VOICE.cur; if (!a || a.paused) return 0; const d = a.duration; return isFinite(d) ? Math.max(0, d - a.currentTime) : 1.5; }
