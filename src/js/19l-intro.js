// ================= intro: character cards, then the poster =================
// Plays once on the first visit (after a tap, so music can start) and again from the menu. The same layout draws the poster images.
const POSTER_CAST = [
  { k: 'youssef', name: 'يوسف إبراهيم', line: 'حرامي الساندوتشات… ممنوع دخوله في أي حتة', color: '#f4a300', from: 1 },
  { k: 'arabi', name: 'العربي', line: 'كان عايز الشغلانة… وعايز طيارة يختفي', color: '#e0457b', from: -1 },
  { k: 'islam', name: 'إسلام', line: 'الصاحب الجدع… وعريس الحتة', color: '#12a39a', from: 1 },
  { k: 'shams', name: 'شمس', line: 'المطلوب رقم ١… كان أشطر ميكانيكي في المنطقة', color: '#c62828', from: -1 },
  { k: 'tayara', name: 'طيارة', line: 'صبي قهوجي مفلس… وهيبقى الجامد', color: '#ffc94a', from: 1 },
];
// where each one stands in the poster: x = centre, b = feet line, h = height (fractions of the frame)
const POSTER_LAYOUT = {
  wide: { shams: { x: .62, b: .97, h: .9, dim: .72, z: 1 }, arabi: { x: .3, b: 1.01, h: .74, z: 2 }, islam: { x: .82, b: 1.01, h: .76, z: 2 }, tayara: { x: .53, b: 1.03, h: .88, z: 3 }, youssef: { x: .1, b: 1.0, h: .5, z: 4 }, title: { x: .25, y: .13, s: .105 } },
  tall: { shams: { x: .68, b: .8, h: .5, dim: .72, z: 1 }, arabi: { x: .82, b: .95, h: .4, z: 2 }, islam: { x: .2, b: .96, h: .4, z: 2 }, tayara: { x: .55, b: 1.0, h: .6, z: 3 }, youssef: { x: .16, b: 1.0, h: .25, z: 4 }, title: { x: .5, y: .09, s: .075 } },
};
const posterImg = k => `assets/poster/${k}.webp`;
const INTRO = { timers: [], playing: false };
const iAt = (ms, fn) => INTRO.timers.push(setTimeout(fn, ms));
function whoosh(){ if (AC && !muted) noise(.35, 1200, .35); }
function introLayout(){
  const el = $('iFinal'), wide = innerWidth / innerHeight >= 1.05, L = POSTER_LAYOUT[wide ? 'wide' : 'tall'];
  for (const c of POSTER_CAST){ const p = L[c.k], img = el.querySelector(`[data-k="${c.k}"]`); Object.assign(img.style, { left: `${p.x*100}%`, top: `${(p.b - p.h)*100}%`, height: `${p.h*100}%`, zIndex: p.z, filter: p.dim ? `brightness(${p.dim}) saturate(.9)` : '' }); }
  const t = $('iTitle'); Object.assign(t.style, { left: `${L.title.x*100}%`, top: `${L.title.y*100}%`, fontSize: `${(wide ? innerHeight : innerWidth) * L.title.s * (wide ? 1 : 1.9)}px` });
}
function playIntroSeq(){
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
  iAt(t, () => { card.className = 'icard'; introLayout(); $('iFinal').className = 'ifinal in'; whoosh(); });
  iAt(t + 1500, () => { $('iTitle').classList.add('slam'); if (AC && !muted){ noise(.5, 400, .6); tone(110, 55, .5, 'sawtooth', .12); } shake = .3; });
  iAt(t + 2600, () => { $('iTap').classList.add('show'); INTRO.ready = true; });
}
function endIntro(){ INTRO.timers.forEach(clearTimeout); INTRO.timers = []; INTRO.playing = false; INTRO.ready = false; $('intro').hidden = true; $('intro').className = 'intro'; store.set('ty_intro', '1'); }
$('introSkip').onclick = e => { e.stopPropagation(); endIntro(); };
$('intro').addEventListener('pointerdown', e => { if (INTRO.ready && !e.target.closest('button')) endIntro(); });
$('iSave').onclick = async e => { e.stopPropagation(); const wide = innerWidth >= innerHeight; const cv = await makePosterImage(wide ? 1920 : 1080, wide ? 1080 : 1920); const a = document.createElement('a'); a.href = cv.toDataURL('image/jpeg', .92); a.download = `tayara-poster-${wide ? 'wide' : 'tall'}.jpg`; document.body.appendChild(a); a.click(); a.remove(); };
addEventListener('resize', () => { if (!$('intro').hidden) introLayout(); });
// first visit: a tap to start (browsers only allow sound after a tap), then the intro
function introOnLoad(){
  if (store.get('ty_intro') === '1') return;
  $('introStart').hidden = false;
}
$('introStartBtn').onclick = () => { $('introStart').hidden = true; if (!musicOn){ musicOn = true; store.set('ty_music', '1'); setBtnStates(); } playIntroSeq(); };
$('introStartSkip').onclick = () => { $('introStart').hidden = true; store.set('ty_intro', '1'); };
// ---- the poster as an image (same layout, drawn on a canvas) ----
const posterCache = {};
const loadImg = src => posterCache[src] ||= new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
async function makePosterImage(W, H){
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  try { await document.fonts.load('900 100px Cairo'); await document.fonts.load('700 40px Cairo'); } catch(e){}
  const bg = await loadImg(posterImg('bg')); const s = Math.max(W / bg.width, H / bg.height); g.drawImage(bg, (W - bg.width*s)/2, (H - bg.height*s)/2, bg.width*s, bg.height*s);
  const vg = g.createLinearGradient(0, H*.55, 0, H); vg.addColorStop(0, 'rgba(10,6,4,0)'); vg.addColorStop(1, 'rgba(10,6,4,.75)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const L = POSTER_LAYOUT[W / H >= 1.05 ? 'wide' : 'tall'];
  const order = [...POSTER_CAST].sort((a, b) => L[a.k].z - L[b.k].z);
  for (const c of order){ const p = L[c.k], im = await loadImg(posterImg(c.k)); const h = p.h*H, w = im.width / im.height * h; g.save(); if (p.dim) g.filter = `brightness(${p.dim}) saturate(.9)`; g.drawImage(im, p.x*W - w/2, (p.b - p.h)*H, w, h); g.restore(); }
  // title
  const fs = (W / H >= 1.05 ? H : W*1.9) * L.title.s, tx = L.title.x*W, ty = L.title.y*H;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl'; g.font = `900 ${fs}px Cairo, sans-serif`;
  g.lineJoin = 'round'; g.lineWidth = fs*.14; g.strokeStyle = '#2a1404'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = fs*.25; g.strokeText('طيارة الجامد', tx, ty); g.shadowBlur = 0;
  const gr = g.createLinearGradient(0, ty - fs*.5, 0, ty + fs*.5); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(.45, '#ffc94a'); gr.addColorStop(1, '#d9781a'); g.fillStyle = gr; g.fillText('طيارة الجامد', tx, ty);
  g.font = `800 ${fs*.28}px Cairo, sans-serif`; g.lineWidth = fs*.06; g.strokeStyle = 'rgba(20,10,4,.9)'; g.strokeText('الحتة كلها بتتكلم عليه', tx, ty + fs*.78); g.fillStyle = '#fff'; g.fillText('الحتة كلها بتتكلم عليه', tx, ty + fs*.78);
  return cv;
}
