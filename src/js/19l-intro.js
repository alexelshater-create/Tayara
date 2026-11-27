// ================= intro: the film (Google Flow) with name tags, else character cards and the poster =================
// The film and its name tags are played by boot.js (every launch, then from the menu); this file keeps the drawn fallback and the poster image.
// the poster line-up (POSTER_CAST, POSTER_LAYOUT, posterImg, posterPart, introLayout) and the intro film live in boot.js now (they run before the game loads)
const INTRO = { timers: [], playing: false };
const iAt = (ms, fn) => INTRO.timers.push(setTimeout(fn, ms));
function whoosh(){ if (AC && !muted) noise(.35, 1200, .35); }
function playIntroSeq(){ BOOT.playIntro(); }   // the menu's «المقدمة»: the film again (boot.js), back to the menu after
// the older intro (illustrated character cards, then the poster): used when the film can't play
function playPosterIntro(){
  if (INTRO.playing) return; INTRO.playing = true; INTRO.timers.forEach(clearTimeout); INTRO.timers = [];
  initAudio(); const box = $('intro'); box.hidden = false; box.className = 'intro on'; $('iCard').className = 'icard'; $('iFinal').className = 'ifinal'; $('iTap').classList.remove('show');
  const card = $('iCard'); let t = 900;
  iAt(200, () => { box.classList.add('bgin'); $('iKicker').classList.add('show'); });
  iAt(t + 1400, () => $('iKicker').classList.remove('show')); t += 2000;
  for (const c of POSTER_CAST){
    iAt(t, () => { card.className = 'icard'; void card.offsetWidth; card.style.setProperty('--c', c.color); card.style.setProperty('--from', c.from); $('iImg').src = posterImg(c.k); $('iName').textContent = c.name; $('iLine').textContent = c.line; card.className = 'icard in'; whoosh(); });
    iAt(t + 2350, () => { card.classList.add('out'); });
    t += 2700;
  }
  iAt(t, () => { card.className = 'icard'; introLayout(); box.classList.add('final'); $('iFinal').className = 'ifinal in'; whoosh(); });
  iAt(t + 1500, () => { $('iTitle').classList.add('slam'); if (AC && !muted){ noise(.5, 400, .6); tone(110, 55, .5, 'sawtooth', .12); } shake = .3; });
  iAt(t + 2600, () => { $('iTap').classList.add('show'); INTRO.ready = true; BOOT.introReady(); });
}
function stopPosterIntro(){ INTRO.timers.forEach(clearTimeout); INTRO.timers = []; INTRO.playing = false; INTRO.ready = false; }
function endIntro(){ BOOT.endIntro(); }
window.__posterIntro = () => { BOOT.phase = 'intro'; playPosterIntro(); };
window.__introStop = stopPosterIntro;
$('iSave').onclick = async e => { e.stopPropagation(); const wide = innerWidth >= innerHeight; const cv = await makePosterImage(wide ? 1920 : 1080, wide ? 1080 : 1920); const a = document.createElement('a'); a.href = cv.toDataURL('image/jpeg', .92); a.download = `tayara-poster-${wide ? 'wide' : 'tall'}.jpg`; document.body.appendChild(a); a.click(); a.remove(); };
// the intro now opens on every launch (boot.js: logo → film → menu); the old «يلا بينا» card is never shown
function introOnLoad(){}
// ---- the poster as an image (same layout, drawn on a canvas) ----
const posterCache = {};
const loadImg = src => posterCache[src] ||= new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
async function makePosterImage(W, H, kind){
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  if (!kind){   // the shared poster: the five on the Corniche (key art) with the game's logo
    try { const wide = W / H >= 1.05, art = await loadImg(`assets/poster/key-${wide ? 'wide' : 'tall'}.jpg`), s = Math.max(W / art.width, H / art.height);
      g.drawImage(art, (W - art.width*s) / 2, (H - art.height*s) / 2, art.width*s, art.height*s);
      const lg = await loadImg('assets/brand/logo.png'), lh = wide ? H*.3 : H*.17, lw = lg.width / lg.height * lh;
      g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = lh*.08; g.drawImage(lg, wide ? W*.97 - lw : (W - lw) / 2, H*.03, lw, lh); g.restore();
      return cv; } catch(e){}
  }
  try { await document.fonts.load('900 100px Cairo'); await document.fonts.load('700 40px Cairo'); } catch(e){}
  const L = POSTER_LAYOUT[kind || (W / H >= 1.05 ? 'wide' : 'tall')];
  const bg = await loadImg(posterImg('bg')); const s = Math.max(W / bg.width, H / bg.height), bw = bg.width*s, bx = clamp(W/2 - L.fx*bw, W - bw, 0);
  g.save(); g.filter = `blur(${Math.round(W/900)}px) brightness(.8) saturate(1.05)`; g.drawImage(bg, bx, (H - bg.height*s)/2, bw, bg.height*s); g.restore();
  const top = g.createLinearGradient(0, 0, 0, H*.3); top.addColorStop(0, 'rgba(8,5,3,.7)'); top.addColorStop(1, 'rgba(8,5,3,0)'); g.fillStyle = top; g.fillRect(0, 0, W, H*.3);
  const vg = g.createLinearGradient(0, H*.6, 0, H); vg.addColorStop(0, 'rgba(8,5,3,0)'); vg.addColorStop(1, 'rgba(8,5,3,.8)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W/2, H*.55, Math.min(W, H)*.3, W/2, H*.55, Math.max(W, H)*.75); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  const order = [...POSTER_CAST].sort((a, b) => L[a.k].z - L[b.k].z);
  for (const c of order){ const p = L[c.k], im = await loadImg(posterPart(c.k)); const h = p.h*H, w = im.width / im.height * h; g.save(); if (p.dim) g.filter = `brightness(${p.dim}) saturate(.9)`; g.drawImage(im, p.x*W - w/2, (p.b - p.h)*H, w, h); g.restore(); }
  if (!L.title) return cv;
  // title
  const fs = (W / H >= 1.05 ? H : W*1.9) * L.title.s, tx = L.title.x*W, ty = L.title.y*H;
  try { const lg = await loadImg('assets/brand/logo.png'), lh = fs * 2.6, lw = lg.width / lg.height * lh;   // the game logo (Grand Thieves Alexandria)
    g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = fs*.3; g.drawImage(lg, tx - lw/2, Math.max(H*.01, ty - lh*.42), lw, lh); g.restore(); } catch(e){}
  return cv;
}
