// ================= intro: the film (Google Flow) with name tags, else character cards and the poster =================
// Plays once on the first visit (after a tap, so the sound can start) and again from the menu. The same layout draws the poster images.
const POSTER_CAST = [
  { k: 'youssef', name: 'يوسف إبراهيم', line: 'حرامي الساندوتشات… ممنوع دخوله في أي حتة', color: '#f4a300', from: 1 },
  { k: 'arabi', name: 'العربي', line: 'كان عايز الشغلانة… وعايز طيارة يختفي', color: '#e0457b', from: -1 },
  { k: 'islam', name: 'إسلام', line: 'الصاحب الجدع… وعريس الحتة', color: '#12a39a', from: 1 },
  { k: 'shams', name: 'شمس', line: 'المطلوب رقم ١… كان أشطر ميكانيكي في المنطقة', color: '#c62828', from: -1 },
  { k: 'tayara', name: 'طيارة', line: 'صبي قهوجي مفلس… وهيبقى الجامد', color: '#ffc94a', from: 1 },
];
// where each one stands in the poster: x = centre, b = feet line, h = height (fractions of the frame)
// a clean line-up on one ground line: طيارة in front in the middle, شمس darker at the edge, the café sign left visible
const POSTER_LAYOUT = {
  wide: { youssef: { x: .085, b: .97, h: .47, z: 4 }, arabi: { x: .275, b: .95, h: .64, z: 2 }, tayara: { x: .5, b: .98, h: .74, z: 3 }, islam: { x: .725, b: .95, h: .64, z: 2 }, shams: { x: .905, b: .94, h: .7, dim: .78, z: 1 }, title: { x: .5, y: .105, s: .1 }, fx: .5 },
  // the menu keeps the right side free for the buttons (wide) or the bottom (tall)
  menuWide: { youssef: { x: .06, b: .99, h: .42, z: 4 }, arabi: { x: .17, b: .96, h: .58, z: 2 }, tayara: { x: .32, b: .99, h: .72, z: 3 }, islam: { x: .47, b: .96, h: .58, z: 2 }, shams: { x: .4, b: .86, h: .6, dim: .6, z: 0 }, fx: .4 },
  menuTall: { arabi: { x: .2, b: .44, h: .19, z: 1 }, shams: { x: .8, b: .44, h: .2, dim: .7, z: 1 }, islam: { x: .82, b: .52, h: .22, z: 2 }, tayara: { x: .52, b: .53, h: .3, z: 3 }, youssef: { x: .16, b: .54, h: .15, z: 4 }, fx: .29 },
  tall: { arabi: { x: .2, b: .8, h: .3, z: 1 }, shams: { x: .8, b: .8, h: .32, dim: .78, z: 1 }, islam: { x: .82, b: .985, h: .34, z: 2 }, tayara: { x: .52, b: .99, h: .48, z: 3 }, youssef: { x: .17, b: .995, h: .22, z: 4 }, title: { x: .5, y: .075, s: .072 }, fx: .29 },
};
const POSTER_FILE = { shams: 'shams-solo' };
const posterImg = k => `assets/poster/${k}.webp`;
const posterPart = k => posterImg(POSTER_FILE[k] || k);
const INTRO = { timers: [], playing: false };
const iAt = (ms, fn) => INTRO.timers.push(setTimeout(fn, ms));
function whoosh(){ if (AC && !muted) noise(.35, 1200, .35); }
function introLayout(){
  const el = $('iFinal'), wide = innerWidth / innerHeight >= 1.05, L = POSTER_LAYOUT[wide ? 'wide' : 'tall'];
  for (const c of POSTER_CAST){ const p = L[c.k], img = el.querySelector(`[data-k="${c.k}"]`); Object.assign(img.style, { left: `${p.x*100}%`, top: `${(p.b - p.h)*100}%`, height: `${p.h*100}%`, zIndex: p.z, filter: p.dim ? `brightness(${p.dim}) saturate(.9)` : '' }); }
  const t = $('iTitle'); Object.assign(t.style, { left: `${L.title.x*100}%`, top: `${L.title.y*100}%`, fontSize: `${(wide ? innerHeight : innerWidth) * L.title.s * (wide ? 1 : 1.9)}px` });
  document.querySelector('#intro .ibg').style.backgroundPosition = `${L.fx*100}% center`;
}
// the film: who appears when (seconds into assets/intro/intro.mp4)
const INTRO_TAGS = [
  { t: 9.0, end: 13.2, name: 'طيارة', line: 'صبي القهوة… وهيبقى الجامد', color: '#ffc94a' },
  { t: 16.4, end: 20.6, name: 'العربي', line: 'ابن الحاج العربي الكبير… والفلوس عنده مش مشكلة', color: '#e0457b' },
  { t: 24.6, end: 28.8, name: 'إسلام', line: 'الصاحب الجدع… وعريس الحتة', color: '#12a39a' },
  { t: 31.2, end: 35.6, name: 'يوسف إبراهيم', line: 'بيدوّر على شغل… ولقى حاجة تانية', color: '#f4a300' },
  { t: 39.4, end: 43.6, name: 'شمس', line: 'محدش شاف وشه… غير اللي ندم', color: '#c62828' },
];
const INTRO_TITLE_AT = 46;
function playIntroSeq(){
  if (INTRO.playing) return;
  const v = $('iVideo');
  if (!v || INTRO.noVideo || !v.canPlayType('video/mp4')) return playPosterIntro();
  INTRO.playing = true; INTRO.timers.forEach(clearTimeout); INTRO.timers = []; initAudio();
  const box = $('intro'); box.hidden = false; box.className = 'intro on video'; $('iFinal').className = 'ifinal'; $('iTitle').classList.remove('slam'); $('iTap').classList.remove('show');
  const tag = $('iTag'); tag.className = 'iname'; let shown = -1, titled = false;
  if (!v.src) v.src = 'assets/intro/intro.mp4';
  v.muted = muted; v.currentTime = 0;
  v.onerror = () => { INTRO.noVideo = true; INTRO.playing = false; playPosterIntro(); };
  const tick = () => {
    if (!INTRO.playing || box.hidden) return;
    const t = v.currentTime, k = INTRO_TAGS.findIndex(c => t >= c.t && t < c.end);
    if (k !== shown){
      if (k >= 0){ const c = INTRO_TAGS[k]; tag.style.setProperty('--c', c.color); tag.querySelector('b').textContent = c.name; tag.querySelector('span').textContent = c.line; tag.className = 'iname'; void tag.offsetWidth; tag.className = 'iname show'; }
      else if (shown >= 0) tag.className = 'iname hide';
      shown = k;
    }
    if (!titled && t >= INTRO_TITLE_AT){ titled = true; introLayout(); box.classList.add('final'); $('iFinal').className = 'ifinal in'; setTimeout(() => $('iTitle').classList.add('slam'), 60); }
    requestAnimationFrame(tick);
  };
  v.onended = () => { $('iTap').classList.add('show'); INTRO.ready = true; };
  const p = v.play(); if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(() => { INTRO.playing = false; playPosterIntro(); }); });
  requestAnimationFrame(tick);
}
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
  iAt(t + 2600, () => { $('iTap').classList.add('show'); INTRO.ready = true; });
}
function endIntro(){ const v = $('iVideo'); if (v){ v.pause(); } INTRO.timers.forEach(clearTimeout); INTRO.timers = []; INTRO.playing = false; INTRO.ready = false; $('intro').hidden = true; $('intro').className = 'intro'; store.set('ty_intro', '1'); }
$('introSkip').onclick = e => { e.stopPropagation(); endIntro(); };
$('intro').addEventListener('pointerdown', e => { if (INTRO.ready && !e.target.closest('button')) endIntro(); });
$('iSave').onclick = async e => { e.stopPropagation(); const wide = innerWidth >= innerHeight; const cv = await makePosterImage(wide ? 1920 : 1080, wide ? 1080 : 1920); const a = document.createElement('a'); a.href = cv.toDataURL('image/jpeg', .92); a.download = `tayara-poster-${wide ? 'wide' : 'tall'}.jpg`; document.body.appendChild(a); a.click(); a.remove(); };
addEventListener('resize', () => { if (!$('intro').hidden) introLayout(); });
// first visit: a tap to start (browsers only allow sound after a tap), then the intro
function introOnLoad(){
  if (store.get('ty_intro') === '1') return;
  $('introStart').hidden = false;
}
$('introStartBtn').onclick = () => { $('introStart').hidden = true; playIntroSeq(); };
$('introStartSkip').onclick = () => { $('introStart').hidden = true; store.set('ty_intro', '1'); };
// ---- the poster as an image (same layout, drawn on a canvas) ----
const posterCache = {};
const loadImg = src => posterCache[src] ||= new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
async function makePosterImage(W, H, kind){
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
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
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl'; g.font = `900 ${fs}px Cairo, sans-serif`;
  g.lineJoin = 'round'; g.lineWidth = fs*.14; g.strokeStyle = '#2a1404'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = fs*.25; g.strokeText('طيارة الجامد', tx, ty); g.shadowBlur = 0;
  const gr = g.createLinearGradient(0, ty - fs*.5, 0, ty + fs*.5); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(.45, '#ffc94a'); gr.addColorStop(1, '#d9781a'); g.fillStyle = gr; g.fillText('طيارة الجامد', tx, ty);
  g.font = `800 ${fs*.28}px Cairo, sans-serif`; g.lineWidth = fs*.06; g.strokeStyle = 'rgba(20,10,4,.9)'; g.strokeText('الحتة كلها بتتكلم عليه', tx, ty + fs*.78); g.fillStyle = '#fff'; g.fillText('الحتة كلها بتتكلم عليه', tx, ty + fs*.78);
  return cv;
}
