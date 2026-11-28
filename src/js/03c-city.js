// ================= the real city (stages 14-16): Alexandria's streets and buildings around the old «حتة» =================
// tools/city/build_city.py turns OpenStreetMap into assets/city: 128 m chunks (roads, sidewalks, parks, kerbs, buildings),
// a 1 m raster (0 sea, 1 road, 2 land, 3 park, 4 plaza, 10+ building of height (v-10)/2 m) for walking / driving / roofs,
// and the road graph. The real map is turned 180° (real north = +z) so the sea stays on +z like the old map; positions are
// half size, road widths and building heights are human size. The old «حتة» (x -102..102, z -102..156) is the old game's own.
const CITY = await fetch('assets/city/index.json').then(r => r.ok ? r.json() : null).catch(() => null);
const CGRAPH = CITY ? await fetch('assets/city/graph.json').then(r => r.json()).catch(() => ({ nodes: [], edges: [] })) : { nodes: [], edges: [] };
const CPATCH = CITY ? CITY.patch : [-102, -102, 102, 156];
const inPatch = (x, z) => x > CPATCH[0] && x < CPATCH[2] && z > CPATCH[1] && z < CPATCH[3];
// stage 18½: the merged city — no «حتة» and no pasted grids; the story's places are single old blocks put down in real streets
// (CITY.story: each moved by dx, dz, never turned), always outside the old map's coordinates, so a position that was
// already moved and is moved again stays where it is
const MERGED = !!(CITY && CITY.merged), STORYP = MERGED ? (CITY.story || []) : [];
const storyPiece = k => STORYP.find(s => s.k === k);
const PORT_OFF = (s => s ? [s.dx, s.dz] : [0, 0])(storyPiece('port'));
function oldGroup(x, z){ const j = Math.floor((x + 96) / 48), k = Math.floor((z + 96) / 48);
  if (x <= 102 && z <= 236) return 'hara';
  if (j >= 4 && j <= 5 && k >= 0 && k <= 1) return 'market'; if (j >= 4 && j <= 5 && k >= 2 && k <= 3) return 'food'; if (j >= 6 && j <= 7 && k === 1) return 'stadium';
  if (j >= 6 && j <= 7 && k >= 2 && k <= 3) return 'works'; if (j === 6 && k === 0) return 'showroom'; if (j === 7 && k === 0) return 'villa'; return null; }
// the story piece an old-map point belongs to: the block it is in, or the nearest piece of its part of the old map
function storyOf(x, z){
  for (const s of STORYP){ if (Math.abs(x - (-72 + 48 * s.j)) <= 24 && Math.abs(z - (-72 + 48 * s.kk)) <= 24) return s; }
  const g = oldGroup(x, z); if (!g) return null; let best = null, bd = 1e18;
  for (const s of STORYP){ if (s.grp !== g) continue; const d = (x - (-72 + 48 * s.j)) ** 2 + (z - (-72 + 48 * s.kk)) ** 2; if (d < bd){ bd = d; best = s; } }
  return best;
}

// ---------- the raster ----------
const CR = { tiles: new Map(), want: new Set() };
function crTile(ti, tk){
  const key = ti * 1000 + tk; let t = CR.tiles.get(key);
  if (t !== undefined) return t;
  if (CITY && CITY.tiles && !CITY.tilesSet) CITY.tilesSet = new Set(CITY.tiles);
  if (CITY && CITY.tilesSet && !CITY.tilesSet.has(ti + '_' + tk)){ t = { a: null }; CR.tiles.set(key, t); return t; }   // open sea: no tile to load
  CR.tiles.set(key, null);   // loading
  const img = new Image(); img.decoding = 'async';
  img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data, a = new Uint8Array(img.width * img.height); for (let i = 0; i < a.length; i++) a[i] = d[i * 4];
    CR.tiles.set(key, { a, w: img.width, h: img.height }); };
  img.onerror = () => CR.tiles.set(key, { a: null });   // no tile = all sea
  img.src = `assets/city/r/${ti}_${tk}.png`;
  return null;
}
// the raster value at a point (2 = land while its tile is still loading, so nothing falls into the sea)
function cityR(x, z){
  if (!CITY) return 2;
  const lx = x - CITY.x0, lz = z - CITY.z0; if (lx < 0 || lz < 0 || x >= CITY.x1 || z >= CITY.z1) return 0;
  const ti = Math.floor(lx / 256), tk = Math.floor(lz / 256), t = crTile(ti, tk);
  if (t === null) return 2; if (!t.a) return 0;
  const px = Math.floor(lx - ti * 256), pz = Math.floor(lz - tk * 256); if (px >= t.w || pz >= t.h) return 0;
  return t.a[pz * t.w + px];
}
// are the raster tiles round a point loaded (so cityR there is real, not the 'still loading' default)?
function cityReady(x, z, r = 0){ if (!CITY) return true; for (const [dx, dz] of [[0, 0], [r, r], [-r, r], [r, -r], [-r, -r]]){ const lx = x + dx - CITY.x0, lz = z + dz - CITY.z0; if (lx < 0 || lz < 0) continue; const t = crTile(Math.floor(lx / 256), Math.floor(lz / 256)); if (t === null) return false; } return true; }
const cityH = v => v >= 10 ? (v - 10) * .5 : 0;
// is there a city building at (x, z) within pad (for feet above its roof it isn't)?
function cityBlocked(x, z, pad = PR, feet){
  if (!CITY || inPatch(x, z)) return false;
  for (const [ox, oz] of [[0, 0], [pad, 0], [-pad, 0], [0, pad], [0, -pad]]){ const v = cityR(x + ox, z + oz); if (v >= 10 && !(feet !== undefined && feet >= cityH(v) + .15 - .05)) return true; }
  return false;
}
// preload the raster around a point (used at the start and when teleporting)
function cityPreload(x, z, r = 420){
  if (!CITY) return Promise.resolve();
  const out = [];
  for (let xx = x - r; xx <= x + r + 255; xx += 128) for (let zz = z - r; zz <= z + r + 255; zz += 128){ const ti = Math.floor((xx - CITY.x0) / 256), tk = Math.floor((zz - CITY.z0) / 256); if (ti >= 0 && tk >= 0) crTile(ti, tk); }
  return new Promise(res => { const t0 = performance.now(); const w = () => { let busy = false; for (const v of CR.tiles.values()) if (v === null) busy = true; if (!busy || performance.now() - t0 > 6000) res(); else setTimeout(w, 50); }; w(); });
}
if (CITY) await cityPreload(0, 0, 700);
if (MERGED) for (const s of STORYP) await cityPreload(-72 + 48 * s.j + s.dx, -72 + 48 * s.kk + s.dz, s.grp === 'hara' ? 160 : 110);   // the story's home blocks (Bahary) are ready at the start

// ---------- shopfronts: one picture with 8 rows (each a strip of 3 shops), so every street can have its own trades ----------
// 0 mixed, 1 fish, 2 cafés, 3 clothes, 4 food, 5 pharmacy / grocery, 6 phones, 7 closed shutters
// stage 18½: every shop front shows its own trade through its open front (butcher's meat on hooks, the fish on ice,
// the cane press, the pharmacy's green cross…), not the same coloured shelves for everyone. Three shops per row; a building's
// ground floor repeats its row along the wall. Rows 13–16 are new (butcher, bakery, barber, gold): build_city.py BAND_OF / DW.
const SHOP_ROWS = [
  [['بقالة', '#2f6b3a', 'grocery'], ['خردوات', '#5a4a2a', 'haber'], ['مكتبة', '#1f4f7a', 'books']],
  [['أسماك الأنفوشي', '#0d4f7a', 'fish'], ['سمك بحري طازة', '#11657e', 'fish'], ['مطعم أسماك الريس', '#0b3f63', 'fishrest']],
  [['قهوة الحاج', '#5a3a1e', 'cafe'], ['قهوة الشباب', '#6b4a22', 'cafe'], ['قهوة المعلم', '#4a2e18', 'cafe']],
  [['ملابس الشباب', '#6a1b4d', 'clothes'], ['بوتيك سارة', '#8a1f3a', 'clothes'], ['أحذية النجمة', '#3a2a6a', 'shoes']],
  [['فول وطعمية', '#a33a12', 'foul'], ['حلواني', '#b06a12', 'sweets'], ['شاورما', '#8a2a12', 'shawarma']],
  [['صيدلية', '#1e7a4a', 'pharmacy'], ['سوبر ماركت', '#1f6f43', 'grocery'], ['عطارة', '#6b5a1e', 'spices']],
  [['موبايلات', '#202a6e', 'phones'], ['إلكترونيات', '#1a3f8a', 'phones'], ['صيانة موبايل', '#2a2a5a', 'phones']],
  [['', '#3a3530', 'shut'], ['', '#3a3530', 'shut'], ['', '#3a3530', 'shut']],
  [['ورشة ميكانيكا', '#3a3a3a', 'garage'], ['قطع غيار', '#7a1f1f', 'parts'], ['ورشة نجارة', '#6b4a22', 'carpenter']],
  [['أنتيكات', '#4a3420', 'antiques'], ['موبيليا', '#5a3a20', 'furniture'], ['تحف وأنتيكات', '#3a2a18', 'antiques']],
  [['كبدة إسكندراني', '#8a2a12', 'kebda'], ['سمك وجمبري', '#0d4f7a', 'fish'], ['فطاطري', '#a35a12', 'fateer']],
  [['أقمشة', '#6a1b4d', 'fabric'], ['خردوات', '#5a4a2a', 'haber'], ['عصير قصب', '#2d7a1f', 'cane']],
  [['قهوة البحر', '#5a3a1e', 'cafe'], ['قهوة الصيادين', '#6b4a22', 'cafe'], ['كافيه على البحر', '#0d4f7a', 'cafe']],
  [['جزارة الأمانة', '#8a1a1a', 'butcher'], ['جزارة الحاج', '#7a1515', 'butcher'], ['كبابجي', '#8a3a12', 'kebab']],
  [['مخبز بلدي', '#8a5a12', 'bakery'], ['فرن أفرنجي', '#a36a1a', 'bakery'], ['حلواني', '#b06a12', 'sweets']],
  [['حلاق', '#7a1f2b', 'barber'], ['كوافير', '#8a2a5a', 'barber'], ['ترزي', '#3a3a5a', 'tailor']],
  [['مجوهرات', '#7a5a12', 'gold'], ['صاغة الذهب', '#6a4a0a', 'gold'], ['ساعات', '#2a2a3a', 'watches']],
];
const SHOP_N = SHOP_ROWS.length;
// one shop's open front (in a 256-tall cell; x0..x0+w; the opening from y 56 to 252)
function drawTrade(g, x0, w, kind){
  const y0 = 56, h = 196, x1 = x0 + w, R = (a, b) => a + Math.random() * (b - a);
  const rect = (c, x, y, ww, hh) => { g.fillStyle = c; g.fillRect(x, y, ww, hh); };
  const tiles = (c1, c2, s = 14) => { rect(c1, x0, y0, w, h); g.strokeStyle = c2; g.lineWidth = 1; for (let y = y0; y < y0 + h; y += s){ g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); } for (let x = x0; x < x1; x += s){ g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + h); g.stroke(); } };
  const floor = c => { const gr = g.createLinearGradient(0, y0 + h - 40, 0, y0 + h); gr.addColorStop(0, c); gr.addColorStop(1, '#2a2622'); g.fillStyle = gr; g.fillRect(x0, y0 + h - 40, w, 40); };
  const lamp = (c = 'rgba(255,240,200,.55)') => { rect(c, x0 + w * .2, y0 + 4, w * .6, 4); const gr = g.createRadialGradient(x0 + w / 2, y0 + 10, 4, x0 + w / 2, y0 + 10, w * .7); gr.addColorStop(0, 'rgba(255,240,210,.22)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = gr; g.fillRect(x0, y0, w, h); };
  const counter = (c, top, y = y0 + h - 70, hh = 50) => { rect(c, x0 + 8, y, w - 16, hh); rect(top, x0 + 4, y - 6, w - 8, 7); rect('rgba(0,0,0,.25)', x0 + 8, y + hh - 6, w - 16, 6); };
  const shelves = (n, c = '#6b4a2a') => { for (let s = 0; s < n; s++) rect(c, x0 + 10, y0 + 30 + s * 34, w - 20, 4); };
  switch (kind){
    case 'shut': { rect('#8d8f91', x0, y0, w, h); g.strokeStyle = 'rgba(0,0,0,.35)'; for (let y = y0 + 4; y < y0 + h; y += 6){ g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); } rect('rgba(90,60,40,.25)', x0 + w * .3, y0 + h * .5, w * .4, 20); return; }
    case 'butcher': case 'kebab': {
      tiles('#eef1f2', 'rgba(150,160,170,.45)', 16); lamp();
      rect('#7a7f86', x0 + 6, y0 + 22, w - 12, 4);   // the rail
      for (let i = 0; i < (kind === 'butcher' ? 5 : 3); i++){ const cx = x0 + 26 + i * (w - 52) / (kind === 'butcher' ? 4 : 2), top = y0 + 26;
        g.strokeStyle = '#555'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, top); g.lineTo(cx, top + 10); g.stroke();
        g.fillStyle = '#b5342e'; g.beginPath(); g.ellipse(cx, top + 52, 15, 42, 0, 0, Math.PI * 2); g.fill();      // a side of meat
        g.fillStyle = '#e9d6c8'; g.beginPath(); g.ellipse(cx - 6, top + 40, 5, 20, .2, 0, Math.PI * 2); g.fill();   // fat
        g.fillStyle = '#8e2420'; g.beginPath(); g.ellipse(cx + 5, top + 64, 6, 18, -.1, 0, Math.PI * 2); g.fill(); }
      rect('#6b4424', x0 + w * .55, y0 + h - 62, w * .35, 44); rect('#8a5a30', x0 + w * .55, y0 + h - 66, w * .35, 6);   // the قرمة
      if (kind === 'kebab'){ rect('#3a3a3a', x0 + 10, y0 + h - 70, w * .45, 30); for (let i = 0; i < 8; i++) rect(['#d9481a', '#ff8a2a'][i % 2], x0 + 14 + i * 9, y0 + h - 66, 6, 22); }
      floor('#c9c4bc'); return; }
    case 'kebda': {
      tiles('#eaf1f4', 'rgba(60,110,170,.35)', 14); lamp();
      for (let i = 0; i < 6; i++) rect(['#c9d96a', '#e0b84a', '#b8c858'][i % 3], x0 + 14 + i * (w - 28) / 6, y0 + 34, (w - 28) / 6 - 6, 26);   // pickle jars
      counter('#b9bfc4', '#dfe4e8'); rect('#2b2b2b', x0 + 16, y0 + h - 82, w * .5, 8);   // the صاج
      for (let i = 0; i < 6; i++){ g.fillStyle = '#e2c48a'; g.beginPath(); g.ellipse(x0 + w * .72 + (i % 3) * 14, y0 + h - 84 - Math.floor(i / 3) * 8, 14, 5, 0, 0, Math.PI * 2); g.fill(); }   // عيش فينو
      floor('#b8b2a8'); return; }
    case 'fish': case 'fishrest': {
      rect('#d7e6ec', x0, y0, w, h); lamp('rgba(220,240,255,.6)');
      for (let i = 0; i < 4; i++) rect('#2563a8', x0 + 8 + i * (w - 16) / 4, y0 + 30, (w - 16) / 4 - 6, 22);   // blue crates
      g.fillStyle = '#e8f3f6'; g.beginPath(); g.moveTo(x0 + 6, y0 + h - 24); g.lineTo(x1 - 6, y0 + h - 24); g.lineTo(x1 - 14, y0 + h - 96); g.lineTo(x0 + 14, y0 + h - 96); g.closePath(); g.fill();   // the slanted ice counter
      for (let i = 0; i < 16; i++){ const fx = x0 + 22 + (i % 8) * (w - 44) / 8, fy = y0 + h - 86 + Math.floor(i / 8) * 30; g.fillStyle = i % 5 === 3 ? '#f08a6a' : '#9aa7b1'; g.beginPath(); g.ellipse(fx, fy, 13, 5, R(-.4, .4), 0, Math.PI * 2); g.fill(); }
      if (kind === 'fishrest'){ rect('#5a3a1e', x0 + 10, y0 + 60, w - 20, 6); }
      floor('#9fb3bb'); return; }
    case 'cane': {
      rect('#e9eedf', x0, y0, w, h); lamp();
      for (let i = 0; i < 14; i++) rect(i % 2 ? '#5d8a2e' : '#7aa83a', x0 + 6 + i * 7, y0 + 20, 5, h - 50);   // canes standing
      rect('#aab3ba', x0 + w * .52, y0 + h - 96, w * .32, 70); rect('#7f8a92', x0 + w * .55, y0 + h - 110, w * .26, 16);   // the press
      for (let i = 0; i < 7; i++){ g.fillStyle = i % 2 ? '#f2c230' : '#f08a2a'; g.beginPath(); g.arc(x0 + w * .5 + i * 14, y0 + 30, 7, 0, Math.PI * 2); g.fill(); }
      rect('rgba(200,220,230,.4)', x0 + w * .5, y0 + 46, w * .45, 30); floor('#b9b3a6'); return; }
    case 'pharmacy': {
      rect('#f6f8f8', x0, y0, w, h); lamp('rgba(255,255,255,.7)'); shelves(4, '#c9d3d6');
      for (let s = 0; s < 4; s++) for (let i = 0; i < 12; i++) rect(['#ffffff', '#e8f1fb', '#fbe8e8', '#e8fbe9'][(i + s) % 4], x0 + 12 + i * (w - 24) / 12, y0 + 12 + s * 34, (w - 24) / 12 - 2, 17);
      g.fillStyle = '#1ec46a'; const cx = x0 + w / 2, cy = y0 + h - 70; g.fillRect(cx - 18, cy - 6, 36, 12); g.fillRect(cx - 6, cy - 18, 12, 36);   // the green cross
      counter('#e3e8ea', '#ffffff', y0 + h - 44, 30); return; }
    case 'clothes': case 'shoes': case 'tailor': {
      rect('#efe7dc', x0, y0, w, h); lamp();
      rect('#777', x0 + 10, y0 + 26, w - 20, 3);
      for (let i = 0; i < 9; i++){ const cx = x0 + 18 + i * (w - 36) / 8; g.fillStyle = ['#c62828', '#1f4fa8', '#2e7d32', '#f5f5f5', '#6a1b4d', '#e0a21a', '#263238'][i % 7]; g.beginPath(); g.moveTo(cx - 12, y0 + 32); g.lineTo(cx + 12, y0 + 32); g.lineTo(cx + 10, y0 + 82); g.lineTo(cx - 10, y0 + 82); g.closePath(); g.fill(); }
      if (kind === 'shoes') for (let s = 0; s < 3; s++) for (let i = 0; i < 9; i++) rect(['#3a2a1e', '#f2f2f2', '#8a1f1f'][(i + s) % 3], x0 + 14 + i * (w - 28) / 9, y0 + 100 + s * 26, 18, 9);
      else { for (const mx of [x0 + w * .25, x0 + w * .72]){ g.fillStyle = '#d8c3a8'; g.beginPath(); g.arc(mx, y0 + 100, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = ['#2e4f7a', '#8a1f3a'][mx > x0 + w / 2 ? 1 : 0]; g.fillRect(mx - 14, y0 + 110, 28, 50); g.fillStyle = '#333'; g.fillRect(mx - 10, y0 + 160, 20, 30); } }
      floor('#c8bfb2'); return; }
    case 'gold': case 'watches': {
      rect('#4a0f14', x0, y0, w, h); lamp('rgba(255,245,220,.8)');
      for (let r2 = 0; r2 < 3; r2++){ rect('rgba(255,250,235,.22)', x0 + 12, y0 + 26 + r2 * 46, w - 24, 34); for (let i = 0; i < 10; i++){ g.fillStyle = kind === 'gold' ? '#f2c94c' : '#c9ced6'; g.beginPath(); g.arc(x0 + 22 + i * (w - 44) / 9, y0 + 43 + r2 * 46, 5, 0, Math.PI * 2); g.fill(); } }
      counter('#2a1a12', '#d9b35a', y0 + h - 40, 26); return; }
    case 'phones': {
      rect('#1d2333', x0, y0, w, h); lamp('rgba(200,220,255,.6)');
      for (let s = 0; s < 4; s++) for (let i = 0; i < 12; i++) rect(`hsl(${(i * 47 + s * 90) % 360},60%,${45 + (i % 3) * 10}%)`, x0 + 12 + i * (w - 24) / 12, y0 + 18 + s * 30, (w - 24) / 12 - 4, 20);
      counter('rgba(180,210,240,.35)', '#9fc4e8', y0 + h - 56, 36); return; }
    case 'grocery': case 'spices': {
      rect('#efe6d2', x0, y0, w, h); lamp();
      rect('#cfd8dc', x0 + 8, y0 + 18, w * .32, h - 40); for (let s = 0; s < 4; s++) for (let i = 0; i < 4; i++) rect(['#c62828', '#1565c0', '#2e7d32', '#f9a825'][(i + s) % 4], x0 + 14 + i * (w * .32 - 12) / 4, y0 + 26 + s * 36, 8, 26);   // the drinks fridge
      for (let i = 0; i < 6; i++) rect(['#f9a825', '#e53935', '#1e88e5'][i % 3], x0 + w * .45 + i * 15, y0 + 18, 11, 60);   // crisps strips
      if (kind === 'spices') for (let i = 0; i < 8; i++){ g.fillStyle = ['#b5651d', '#d2a03a', '#8a3a12', '#6b8e23'][i % 4]; g.beginPath(); g.ellipse(x0 + w * .42 + (i % 4) * 22, y0 + h - 60 + Math.floor(i / 4) * 22, 10, 7, 0, 0, Math.PI * 2); g.fill(); }
      else for (let i = 0; i < 6; i++) rect('#e8d9b0', x0 + w * .45 + (i % 3) * 22, y0 + h - 70 + Math.floor(i / 3) * 16, 18, 12);   // egg trays
      floor('#bdb29c'); return; }
    case 'bakery': {
      rect('#d9c19a', x0, y0, w, h); lamp('rgba(255,210,150,.6)');
      for (let s = 0; s < 4; s++){ rect('#6b4a2a', x0 + 10, y0 + 30 + s * 38, w - 20, 4); for (let i = 0; i < 9; i++){ g.fillStyle = '#c79a5a'; g.beginPath(); g.ellipse(x0 + 22 + i * (w - 44) / 8, y0 + 24 + s * 38, 11, 6, 0, 0, Math.PI * 2); g.fill(); } }
      const gr = g.createRadialGradient(x0 + w * .8, y0 + h - 40, 2, x0 + w * .8, y0 + h - 40, 30); gr.addColorStop(0, '#ffcf6a'); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.fillRect(x0 + w * .6, y0 + h - 80, w * .4, 70);   // the oven
      floor('#a8916c'); return; }
    case 'sweets': {
      rect('#f6ead8', x0, y0, w, h); lamp(); counter('rgba(255,255,255,.5)', '#f0e0c0', y0 + h - 90, 70);
      for (let i = 0; i < 12; i++){ g.fillStyle = ['#e8b04a', '#c98a2a', '#f2d7a0', '#b5651d'][i % 4]; g.fillRect(x0 + 16 + (i % 6) * (w - 32) / 6, y0 + h - 82 + Math.floor(i / 6) * 28, (w - 32) / 6 - 6, 20); }
      return; }
    case 'foul': case 'shawarma': case 'fateer': {
      tiles('#efe6d4', 'rgba(170,150,120,.35)', 16); lamp();
      // the menu board up top (price rows)
      rect('#1f3a2a', x0 + 12, y0 + 12, w * .5, 40); for (let i = 0; i < 4; i++){ rect('rgba(240,230,200,.8)', x0 + 18, y0 + 18 + i * 9, w * .3, 3); rect('#f2c94c', x0 + w * .42, y0 + 18 + i * 9, 10, 3); }
      if (kind === 'foul'){
        const brass = (cx, cy, r) => { g.fillStyle = '#b07a2a'; g.beginPath(); g.ellipse(cx, cy, r, r * 1.1, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#d9a84a'; g.beginPath(); g.ellipse(cx - r * .3, cy - r * .3, r * .3, r * .5, .3, 0, Math.PI * 2); g.fill(); g.fillStyle = '#7a5020'; g.fillRect(cx - r * .35, cy - r * 1.25, r * .7, r * .3); };
        brass(x0 + w * .22, y0 + h - 104, 26); brass(x0 + w * .42, y0 + h - 98, 20);   // the قدرة الفول
        for (let i = 0; i < 14; i++){ g.fillStyle = i % 3 ? '#6b4a1e' : '#7f5a24'; g.beginPath(); g.arc(x0 + w * .6 + (i % 7) * 11, y0 + h - 86 + Math.floor(i / 7) * 10, 5, 0, Math.PI * 2); g.fill(); }   // a tray of طعمية
        g.fillStyle = 'rgba(40,30,20,.6)'; g.fillRect(x0 + w * .58, y0 + 62, w * .36, 30); g.fillStyle = 'rgba(255,150,60,.6)'; g.fillRect(x0 + w * .6, y0 + 84, w * .32, 6);   // the frying pan & glow
        for (let i = 0; i < 6; i++){ g.fillStyle = '#e2c48a'; g.beginPath(); g.ellipse(x0 + w * .64 + (i % 3) * 18, y0 + 110 - Math.floor(i / 3) * 6, 15, 5, 0, 0, Math.PI * 2); g.fill(); }   // عيش بلدي
      }
      if (kind === 'shawarma'){
        for (const [sx, c1, c2] of [[x0 + w * .58, '#9a5a2a', '#c4793a'], [x0 + w * .8, '#c99a4a', '#e2b86a']]){
          rect('#888', sx - 1, y0 + 26, 3, 120);
          g.fillStyle = c1; g.beginPath(); g.moveTo(sx - 20, y0 + 34); g.lineTo(sx + 20, y0 + 34); g.lineTo(sx + 13, y0 + 128); g.lineTo(sx - 13, y0 + 128); g.closePath(); g.fill();   // the cone of meat
          g.fillStyle = c2; for (let k = 0; k < 8; k++) g.fillRect(sx - 18 + k * .9, y0 + 38 + k * 11, 36 - k * 1.8, 3);
          const gr = g.createLinearGradient(sx + 20, 0, sx + 44, 0); gr.addColorStop(0, 'rgba(255,120,30,.75)'); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.fillRect(sx + 18, y0 + 34, 26, 94); }   // the grill's glow
      }
      if (kind === 'fateer'){
        g.fillStyle = '#8a8580'; g.beginPath(); g.arc(x0 + w * .72, y0 + h - 70, 52, Math.PI, 0); g.fill();   // the dome oven
        const gr = g.createRadialGradient(x0 + w * .72, y0 + h - 76, 2, x0 + w * .72, y0 + h - 76, 24); gr.addColorStop(0, '#ffe08a'); gr.addColorStop(.6, '#ff8a2a'); gr.addColorStop(1, '#3a2010'); g.fillStyle = gr; g.beginPath(); g.arc(x0 + w * .72, y0 + h - 70, 24, Math.PI, 0); g.fill();
        rect('#e9e4da', x0 + 10, y0 + h - 98, w * .4, 8);   // the marble table
        for (let i = 0; i < 5; i++){ g.fillStyle = i % 2 ? '#f3e2b8' : '#e9cf8e'; g.beginPath(); g.ellipse(x0 + 26 + (i % 3) * 30, y0 + h - 106 - Math.floor(i / 3) * 10, 16, 5, 0, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(x0 + w * .28, y0 + 74, 30, 9, 0, 0, Math.PI * 2); g.fill();   // the dough flying in the air
      }
      counter('#b9bfc4', '#e0e4e6', y0 + h - 60, 40); floor('#b8b2a8'); return; }
    case 'cafe': {
      rect('#4a3424', x0, y0, w, h); lamp('rgba(255,200,120,.5)');
      rect('#111', x0 + w * .6, y0 + 22, 50, 30); rect('#2f7a3a', x0 + w * .6 + 3, y0 + 25, 44, 24);   // the TV with the match
      for (let i = 0; i < 3; i++){ rect('#8a6a4a', x0 + 16 + i * (w - 32) / 3, y0 + h - 70, 40, 6); rect('#5a3a22', x0 + 22 + i * (w - 32) / 3, y0 + h - 64, 4, 40); }
      for (let i = 0; i < 2; i++){ g.fillStyle = '#c9a227'; g.beginPath(); g.ellipse(x0 + 30 + i * 60, y0 + h - 40, 7, 14, 0, 0, Math.PI * 2); g.fill(); }   // شيشة
      rect('#d9cfc0', x0 + 12, y0 + 30, w * .45, 50); for (let i = 0; i < 5; i++) rect('#8a6a4a', x0 + 18 + i * 16, y0 + 44, 10, 26);   // the counter's shelf of glasses
      for (let i = 0; i < 4; i++){ const cx = x0 + 22 + i * (w - 44) / 3; rect('#3a2414', cx - 8, y0 + h - 40, 16, 4); rect('#3a2414', cx - 7, y0 + h - 36, 2, 16); rect('#3a2414', cx + 5, y0 + h - 36, 2, 16); rect('#3a2414', cx + 6, y0 + h - 58, 2, 20); }   // wooden chairs
      floor('#5a4434'); return; }
    case 'garage': case 'parts': case 'carpenter': {
      rect('#2c2a28', x0, y0, w, h); lamp('rgba(255,240,200,.35)');
      for (let i = 0; i < 3; i++){ g.fillStyle = '#151515'; g.beginPath(); g.ellipse(x0 + 24, y0 + h - 30 - i * 22, 20, 10, 0, 0, Math.PI * 2); g.fill(); }   // tyres
      for (let i = 0; i < 2; i++) rect(['#1f4fa8', '#c62828'][i], x0 + w - 50 + i * 22, y0 + h - 60, 18, 44);   // oil drums
      if (kind === 'parts') for (let s = 0; s < 3; s++) for (let i = 0; i < 8; i++) rect(['#888', '#a33', '#555'][(i + s) % 3], x0 + 50 + i * 20, y0 + 26 + s * 30, 14, 16);
      if (kind === 'carpenter') for (let i = 0; i < 6; i++) rect('#b98a52', x0 + 50 + i * 10, y0 + 30, 6, h - 80);
      return; }
    case 'antiques': case 'furniture': {
      rect('#3a2a1c', x0, y0, w, h); lamp('rgba(255,210,140,.5)');
      g.fillStyle = '#d9b35a'; for (let i = 0; i < 6; i++){ g.beginPath(); g.arc(x0 + w / 2 + Math.cos(i) * 22, y0 + 34 + Math.sin(i) * 6, 4, 0, Math.PI * 2); g.fill(); }   // a chandelier
      for (let i = 0; i < 3; i++){ g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(x0 + 24 + i * 30, y0 + 70, 9, 0, Math.PI * 2); g.fill(); }   // clocks
      rect('#5a3a20', x0 + 14, y0 + h - 80, w * .4, 60); rect('#6b4a2a', x0 + w * .55, y0 + h - 100, w * .35, 80); return; }
    case 'fabric': case 'haber': {
      rect('#efe4d2', x0, y0, w, h); lamp();
      for (let i = 0; i < 12; i++) rect(['#8e24aa', '#c62828', '#f9a825', '#1565c0', '#2e7d32', '#ad1457'][i % 6], x0 + 10 + i * (w - 20) / 12, y0 + 24, (w - 20) / 12 - 3, h - 60);
      if (kind === 'haber') for (let s = 0; s < 3; s++) for (let i = 0; i < 14; i++) rect(`hsl(${i * 37 % 360},50%,55%)`, x0 + 10 + i * (w - 20) / 14, y0 + 30 + s * 40, 8, 8);
      return; }
    case 'books': {
      rect('#e9dcc0', x0, y0, w, h); lamp(); shelves(4);
      for (let s = 0; s < 4; s++) for (let k = 0; k < 18; k++){ g.fillStyle = `hsl(${(s * 47 + k * 23) % 360},45%,${35 + (k * 7) % 25}%)`; g.fillRect(x0 + 14 + k * (w - 28) / 18, y0 + 6 + s * 34, (w - 28) / 18 - 2, 24); }
      return; }
    case 'barber': {
      rect('#e8e2d8', x0, y0, w, h); lamp('rgba(255,255,255,.6)');
      rect('#b9d3dc', x0 + 14, y0 + 22, w - 28, 70); rect('rgba(255,255,255,.35)', x0 + 20, y0 + 26, 30, 60);   // the mirror
      for (let i = 0; i < 2; i++){ const cx = x0 + w * (.3 + i * .4); rect('#1d1d1d', cx - 16, y0 + h - 90, 32, 50); rect('#8a1f1f', cx - 14, y0 + h - 118, 28, 34); rect('#777', cx - 3, y0 + h - 40, 6, 16); }   // chairs
      for (let i = 0; i < 3; i++){ rect('#fff', x0 + 14 + i * 26, y0 + 100, 20, 26); g.fillStyle = '#333'; g.beginPath(); g.arc(x0 + 24 + i * 26, y0 + 110, 6, 0, Math.PI * 2); g.fill(); }   // haircut posters
      floor('#cfc8bc'); return; }
  }
  rect('#3a332c', x0, y0, w, h);
}
const shopAtlas = makeTex(LOW ? 512 : 1024, LOW ? 1536 : 3072, (g, W, H) => {
  const RH = H / SHOP_N;
  SHOP_ROWS.forEach((row, r) => {
    const yy = r * RH; g.save(); g.translate(0, yy); g.scale(W / 1024, RH / 256);
    g.fillStyle = '#5b544b'; g.fillRect(0, 0, 1024, 256);
    row.forEach(([name, col, kind], b) => {
      const x = b * (1024 / 3), bw = 1024 / 3;
      g.save(); g.beginPath(); g.rect(x + 8, 56, bw - 16, 196); g.clip(); drawTrade(g, x + 8, bw - 16, kind); g.restore();
      g.strokeStyle = 'rgba(40,34,28,.9)'; g.lineWidth = 6; g.strokeRect(x + 8, 56, bw - 16, 196);   // the shop's frame
      // the sign over the shop
      g.fillStyle = name ? col : '#2b2723'; g.fillRect(x + 4, 4, bw - 8, 48);
      if (name){ g.strokeStyle = 'rgba(255,240,200,.5)'; g.lineWidth = 2; g.strokeRect(x + 7, 7, bw - 14, 42); arText(g, name, x + bw / 2, 29, 30, '#fff6dc', 800); }
    });
    g.restore();
  });
});
// ---------- materials ----------
const cityTex = (src, rep) => { const t = src.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); t.needsUpdate = true; return t; };
const cityPaveTex = makeTex(256, 256, (g, w, h) => {
  g.fillStyle = '#b9b3a6'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++){ const v = 165 + (Math.random() * 30 | 0) - (((x + y) % 2) * 10); g.fillStyle = `rgb(${v + 12},${v + 8},${v})`; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); }
  grain(g, w, h, 6000, .12); for (let i = 0; i < 14; i++){ g.fillStyle = 'rgba(60,55,45,.12)'; g.fillRect(Math.random() * w, Math.random() * h, 12 + Math.random() * 30, 3 + Math.random() * 6); }
});
const cityCurbTex = makeTex(64, 16, (g) => { g.fillStyle = '#efede6'; g.fillRect(0, 0, 32, 16); g.fillStyle = '#1d1d1d'; g.fillRect(32, 0, 32, 16); });
// the city facades get Alexandria's balconies painted on (a slab, wrought-iron or concrete railing, the shadow under it)
function balconyTex(src, i){
  if (!LOW) return src;   // stage 18: real 3D balconies above «خفيف» (19zzzzz-buildings3d.js); the painted ones stay on weak phones
  const S = FSTY[i], im = src.image, c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const bw = 128, fh = 128, iron = i % 3 !== 0;
  for (let fy = 0; fy < 4; fy++) for (let bx = 0; bx < 4; bx++){
    if (Math.random() < .35) continue;
    const x = bx * bw + 14, w = bw - 28, y = fy * fh + fh - 30;
    const sh = g.createLinearGradient(0, y + 12, 0, y + 30); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(x, y + 12, w, 18);
    g.fillStyle = new THREE.Color(S.trim).multiplyScalar(.85).getStyle(); g.fillRect(x - 4, y + 6, w + 8, 7);
    if (iron){ g.strokeStyle = 'rgba(25,25,25,.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 20); g.lineTo(x + w, y - 20); g.stroke(); for (let k = 0; k <= w; k += 7){ g.beginPath(); g.moveTo(x + k, y - 20); g.lineTo(x + k, y + 6); g.stroke(); } }
    else { g.fillStyle = S.trim; g.fillRect(x, y - 18, w, 24); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, y - 18, w, 3); }
    if (Math.random() < .25){ g.fillStyle = ['#c0392b', '#2e6fbf', '#e8e4da', '#e0a21a'][Math.floor(Math.random() * 4)]; g.fillRect(x + 6, y - 30, 26, 22); }   // washing on the line
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = src.anisotropy; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; return tex;
}
const CMAT = {
  road: new THREE.MeshStandardMaterial({ map: cityTex(asphaltTex), roughness: .93, envMapIntensity: .3 }),
  walk: new THREE.MeshStandardMaterial({ map: cityTex(cityPaveTex), roughness: .9, envMapIntensity: .25 }),
  park: new THREE.MeshStandardMaterial({ map: cityTex(parkTex), roughness: 1 }),
  plaza: new THREE.MeshStandardMaterial({ map: cityTex(paveTex), color: 0xe9dcc4, roughness: .85 }),
  mark: new THREE.MeshBasicMaterial({ color: 0xe8e4d8, polygonOffset: true, polygonOffsetFactor: -2 }),
  curb: new THREE.MeshStandardMaterial({ map: (() => { const x = cityCurbTex.clone(); x.wrapS = x.wrapT = THREE.RepeatWrapping; x.repeat.set(.7, 1); x.needsUpdate = true; return x; })(), roughness: .85, side: THREE.DoubleSide }),
  seawall: new THREE.MeshStandardMaterial({ color: 0x8c8172, roughness: .95, side: THREE.DoubleSide }),
  parapet: new THREE.MeshStandardMaterial({ color: 0xb9ad97, roughness: .9, side: THREE.DoubleSide }),
  roof: new THREE.MeshStandardMaterial({ map: cityTex(roofTex), roughness: .95, envMapIntensity: .25 }),
  band: new THREE.MeshStandardMaterial({ map: (() => { const x = shopAtlas.clone(); x.wrapS = THREE.RepeatWrapping; x.wrapT = THREE.ClampToEdgeWrapping; x.needsUpdate = true; return x; })(), roughness: .85, envMapIntensity: .3 }),
  fac: facadeTex.map((t, i) => new THREE.MeshStandardMaterial({ map: cityTex(balconyTex(t, i)), roughness: .9, envMapIntensity: .3 })),
};
// which facade styles each part of town uses (the old city: arched windows and shutters; the newer parts: plain blocks)
const DSTYLE = { bahary: [6, 0, 1, 3, 9, 6, 1, 7], manshiya: [6, 1, 3, 0, 9, 2], attarin: [6, 0, 3, 1, 2, 5], raml: [6, 1, 3, 9, 1, 3], corniche: [3, 1, 3, 1, 6, 4], smouha: [4, 1, 3, 4, 1, 5], karmouz: [0, 2, 5, 0, 3, 8], moharram: [0, 2, 3, 4, 1, 9], sidigaber: [1, 3, 4, 1, 9], shatby: [1, 3, 4, 6, 1, 9] };
const DKEY_LIST = ['', 'bahary', 'manshiya', 'raml', 'corniche', 'smouha', 'karmouz', 'moharram', 'sidigaber', 'shatby', 'attarin'];

// ---------- chunks ----------
const CCH = { map: new Map(), queue: [], loading: 0, built: 0, done: [] };
const BAND = 3.6;
function cityParse(buf){
  const dv = new DataView(buf); let o = 4; const ox = dv.getFloat32(o, true), oz = dv.getFloat32(o + 4, true); o += 8;
  const mesh = () => { const nv = dv.getUint32(o, true), ni = dv.getUint32(o + 4, true); o += 8; const v = new Int16Array(buf, o, nv * 2); o += nv * 4; const i = new Uint16Array(buf, o, ni); o += ni * 2; if (ni % 2) o += 2; return { v, i }; };
  const lines = () => { const n = dv.getUint32(o, true); o += 4; const s = new Int16Array(buf, o, n * 4); o += n * 8; return s; };
  const r = { ox, oz, road: mesh(), walk: mesh(), park: mesh(), plaza: mesh(), mark: mesh(), sea: lines(), curb: lines(), b: [] };
  const nb = dv.getUint32(o, true); o += 4;
  for (let k = 0; k < nb; k++){
    const sb = dv.getUint8(o), db = dv.getUint8(o + 1), style = sb & 15, band = (sb >> 4) | ((db >> 4) << 4), dist = db & 15, h = dv.getUint16(o + 2, true) / 10, n = dv.getUint16(o + 4, true); o += 6;
    const ring = new Int16Array(buf, o, n * 2); o += n * 4; const ni = dv.getUint16(o, true); o += 2; const idx = new Uint16Array(buf, o, ni); o += ni * 2;
    r.b.push({ style, band, dist, h, ring, idx });
  }
  return r;
}
function flatGeo(m, ox, oz, y, uvS){
  if (!m.i.length) return null;
  const n = m.v.length / 2, pos = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let k = 0; k < n; k++){ const x = ox + m.v[k * 2] / 10, z = oz + m.v[k * 2 + 1] / 10; pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = x / uvS; uv[k * 2 + 1] = z / uvS; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  // earcut's winding: make the faces point up
  const idx = Array.from(m.i); for (let k = 0; k < idx.length; k += 3){ const a = idx[k], b = idx[k + 1], c = idx[k + 2]; const ax = pos[a * 3], az = pos[a * 3 + 2]; const cr = (pos[b * 3] - ax) * (pos[c * 3 + 2] - az) - (pos[b * 3 + 2] - az) * (pos[c * 3] - ax); if (cr > 0){ idx[k + 1] = c; idx[k + 2] = b; } }
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
// vertical strips along line segments (kerbs, the sea wall)
function wallGeo(segs, ox, oz, y0, y1){
  const n = segs.length / 4; if (!n) return null;
  const pos = new Float32Array(n * 18), uv = new Float32Array(n * 12);
  for (let k = 0; k < n; k++){
    const ax = ox + segs[k * 4] / 10, az = oz + segs[k * 4 + 1] / 10, bx = ox + segs[k * 4 + 2] / 10, bz = oz + segs[k * 4 + 3] / 10, L = Math.hypot(bx - ax, bz - az);
    const q = [ax, y1, az, bx, y1, bz, bx, y0, bz, ax, y1, az, bx, y0, bz, ax, y0, az]; pos.set(q, k * 18);
    uv.set([0, 1, L, 1, L, 0, 0, 1, L, 0, 0, 0], k * 12);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
function cityBuildings(list, ox, oz, grp){
  // collect: band strips, facade per style, roofs
  const band = { p: [], u: [] }, roof = { p: [], u: [] }, fac = new Map();
  for (const b of list){
    const n = b.ring.length / 2; if (n < 3) continue;
    const pts = []; for (let k = 0; k < n; k++) pts.push([ox + b.ring[k * 2] / 10, oz + b.ring[k * 2 + 1] / 10]);
    let A = 0; for (let k = 0; k < n; k++){ const [x1, z1] = pts[k], [x2, z2] = pts[(k + 1) % n]; A += x1 * z2 - x2 * z1; }
    const sgn = A > 0 ? 1 : -1, top = .15 + b.h, pool = DSTYLE[DKEY_LIST[b.dist]] || [0, 1, 2, 3, 4], st = b.style >= 6 ? (b.style === 6 ? 3 : 4) : pool[b.style % pool.length];
    let F = fac.get(st); if (!F){ F = { p: [], u: [] }; fac.set(st, F); }
    let run = 0;
    for (let k = 0; k < n; k++){
      const [x1, z1] = pts[k], [x2, z2] = pts[(k + 1) % n], L = Math.hypot(x2 - x1, z2 - z1); if (L < .05) continue;
      // outward = right of travel for a positive (counter-clockwise in x,z) ring → order the quad so its face looks out
      const quad = (T, ya, yb, u0, u1, va, vb) => { if (sgn > 0){ T.p.push(x1, ya, z1, x2, yb, z2, x2, ya, z2, x1, ya, z1, x1, yb, z1, x2, yb, z2); T.u.push(u0, va, u1, vb, u1, va, u0, va, u0, vb, u1, vb); } else { T.p.push(x1, ya, z1, x2, ya, z2, x2, yb, z2, x1, ya, z1, x2, yb, z2, x1, yb, z1); T.u.push(u0, va, u1, va, u1, vb, u0, va, u1, vb, u0, vb); } };
      const yb = Math.min(top, .15 + BAND);
      const v0 = 1 - (b.band + 1) / SHOP_N + .002, v1 = 1 - b.band / SHOP_N - .002; quad(band, .15, yb, run / 12, (run + L) / 12, v0, v0 + (v1 - v0) * (yb - .15) / BAND);
      if (top > .15 + BAND) quad(F, .15 + BAND, top, run / 16, (run + L) / 16, 0, (top - .15 - BAND) / 12.8);
      run += L;
    }
    // roof (earcut triangles from the pipeline), facing up
    for (let k = 0; k + 2 < b.idx.length; k += 3){
      let a = pts[b.idx[k]], c = pts[b.idx[k + 1]], d = pts[b.idx[k + 2]]; if (!a || !c || !d) continue;
      const cr = (c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0]); if (cr > 0){ const t = c; c = d; d = t; }
      roof.p.push(a[0], top, a[1], c[0], top, c[1], d[0], top, d[1]); roof.u.push(a[0] / 8, a[1] / 8, c[0] / 8, c[1] / 8, d[0] / 8, d[1] / 8);
    }
  }
  const mk = (T, mat, shadow) => { if (!T.p.length) return; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(T.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(T.u, 2)); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = shadow; m.receiveShadow = !LOW; grp.add(m); };
  mk(band, CMAT.band, !LOW); mk(roof, CMAT.roof, false); for (const [st, F] of fac) mk(F, CMAT.fac[st], !LOW);
}
function cityBuildChunk(key, d){
  const grp = new THREE.Group(); grp.name = 'city ' + key;
  const add = (g, mat, rs = true) => { if (!g) return; const m = new THREE.Mesh(g, mat); m.receiveShadow = rs && !LOW; grp.add(m); };
  add(flatGeo(d.road, d.ox, d.oz, 0, 10), CMAT.road);
  add(flatGeo(d.walk, d.ox, d.oz, .15, 4), CMAT.walk);
  add(flatGeo(d.park, d.ox, d.oz, .16, 6), CMAT.park);
  add(flatGeo(d.plaza, d.ox, d.oz, .155, 4), CMAT.plaza);
  add(flatGeo(d.mark, d.ox, d.oz, .02, 1), CMAT.mark, false);
  add(wallGeo(d.curb, d.ox, d.oz, -.05, .15), CMAT.curb, false);
  add(wallGeo(d.sea, d.ox, d.oz, -2.4, .15), CMAT.seawall, false);
  add(wallGeo(d.sea, d.ox, d.oz, .15, .8), CMAT.parapet, false);   // the corniche's low stone wall people sit on
  cityBuildings(d.b, d.ox, d.oz, grp);
  grp.matrixAutoUpdate = false; grp.updateMatrixWorld(true);
  scene.add(grp); return grp;
}
function cityDrop(c){ if (!c.grp) return; scene.remove(c.grp); c.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); }); c.grp = null; }
const CITY_CH = CITY ? new Map(CITY.chunks.map(([i, k, sz]) => [i + '_' + k, { i, k }])) : new Map();
// keep the chunks near the camera built; build at most one per frame (no hitches), drop far ones
function updateCity(px, pz){
  if (!CITY) return;
  const C = CITY.chunk, R = (LOW ? 230 : GFX === 'mid' ? 300 : 360), R2 = R + 140;
  const now = performance.now(), moved = Math.hypot(px - (CCH.px ?? 1e9), pz - (CCH.pz ?? 1e9));
  if (now - (CCH.scanT || 0) > 250 || moved > 40){ CCH.scanT = now; CCH.px = px; CCH.pz = pz;   // which chunks to keep: 4 times a second
  for (const [key, c] of CITY_CH){
    const cx = CITY.x0 + c.i * C + C / 2, cz = CITY.z0 + c.k * C + C / 2, d = Math.hypot(cx - px, cz - pz);
    if (d < R && !c.grp && !c.busy && !c.bad){ c.busy = true; c.d = d; CCH.queue.push([key, c]); }
    else if (d > R2 && c.grp){ cityDrop(c); }
  } }
  // load the nearest first, two at a time
  if (CCH.loading < 2 && CCH.queue.length){
    for (const q of CCH.queue){ const c = q[1]; c.d = Math.hypot(CITY.x0 + c.i * C + C / 2 - px, CITY.z0 + c.k * C + C / 2 - pz); }
    CCH.queue.sort((a, b) => a[1].d - b[1].d);
    const [key, c] = CCH.queue.shift(); CCH.loading++;
    c.key = key; fetch(`assets/city/c/${key}.bin`).then(r => r.arrayBuffer()).then(r => r).then(buf => { c.data = cityParse(buf); }).catch(() => { c.data = null; c.bad = true; }).finally(() => { CCH.loading--; CCH.done.push(c); });
  }
  for (const c of CCH.done.splice(0, 1)){ const key = c.key; c.busy = false; c.ready = false; if (c.data){ const cx = CITY.x0 + c.i * C + C / 2, cz = CITY.z0 + c.k * C + C / 2; if (Math.hypot(cx - px, cz - pz) < R2) c.grp = cityBuildChunk(key, c.data); } c.data = null; break; }
}
// the districts: nearest centre (the old «حتة» keeps its own names)
// a real place (lat, lon) in the game: x to the real west, z to the real north, half size
const cityLL = (lat, lon) => CITY ? [-(lon - CITY.anchor[1]) * CITY.kx * CITY.S, (lat - CITY.anchor[0]) * CITY.ky * CITY.S] : [0, 0];
function cityDistrict(x, z){ if (!CITY) return null; let best = null, bd = 1e18; for (const d of CITY.districts){ const q = (d.x - x) ** 2 + (d.z - z) ** 2; if (q < bd){ bd = q; best = d; } } return best; }

// ---------- the old map's places in the real city ----------
// A position written for the old map (x -96..288, z -96..154, the fort out at z ~266) → where that place is now:
// the moved blocks (CITY.remote) keep their insides and the streets round them; the old corniche east of the «حتة» →
// the real corniche at محطة الرمل; the old bridge and fort → the way along Anfoushi bay to the real Qaitbay; the open sea
// east of the old port → Anfoushi bay. Everything inside the «حتة», the interiors far away and real-city positions stay put.
const CLM = CITY ? Object.fromEntries((CITY.landmarks || []).map(l => [l.k, l])) : {};
const QAIT_GATE = CITY && CLM.qaitbay ? [CLM.qaitbay.x + 16.4, CLM.qaitbay.z - 43.4] : [0, 0];   // on the causeway road, at the main gate (south side)
// the way from the «حتة» corniche to Qaitbay along the real streets (worked out once from the road graph)
const QAIT_WAY = [[-96, 144], [-103, 144], [-125, 108.8], [-135.7, 115.2], [-157.3, 131], [-173.5, 146.9], [-181.7, 156.4], [-196.3, 179], [-203.1, 191.9], [-208.2, 203.9], [-212.7, 217.6], [-219.1, 240.9], [-223.1, 259.1], [-227.4, 284.9], [-231.3, 315.4], [-231.6, 351.9], [-228.5, 374.1], [-226, 388.8], [-228.2, 395.4], [-234.7, 399.4], [-240.6, 401.8], [-258.9, 407.2], [-265.7, 407.9], [-283, 408.1], [-321.3, 443.1], [-328.5, 445.8], [-371.1, 441.6], [-381.4, 481.2], [-384.9, 487], [-390.4, 493.8], [-414.4, 522.5], [-420.8, 529.2], [-428.9, 534.7], [-480.1, 559.6], [-509.9, 573.1]];
function alongWay(t){ const W = QAIT_WAY, cum = [0]; for (let i = 1; i < W.length; i++) cum.push(cum[i - 1] + Math.hypot(W[i][0] - W[i - 1][0], W[i][1] - W[i - 1][1])); const s = clamp(t, 0, 1) * cum[cum.length - 1]; let i = 1; while (i < W.length - 1 && cum[i] < s) i++; const f = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return [W[i - 1][0] + (W[i][0] - W[i - 1][0]) * f, W[i - 1][1] + (W[i][1] - W[i - 1][1]) * f]; }
// the nearest street / pavement / square to a point (not a building, not the sea), within 40 m
function cityOpenNear(x, z){ const ok = (a, b) => { const v = cityR(a, b); return v >= 1 && v <= 4 && v !== 3; };
  if (ok(x, z)) return [x, z]; for (let r = 1.5; r < 40; r += 1.5) for (let a = 0; a < 6.28; a += 1 / r){ const nx = x + Math.sin(a) * r, nz = z + Math.cos(a) * r; if (ok(nx, nz)) return [nx, nz]; } return [x, z]; }
function RELOC(x, z){
  if (!CITY) return [x, z];
  if (x < -110 || x > 310 || z < -110 || z > 430) return [x, z];      // not an old-map position
  if (x > 86 && x < 106 && z > 157 && z < 252) return alongWay((z - 156) / 96);   // the old bridge → the real streets to Qaitbay
  if (MERGED){ const s = storyOf(x, z); if (s){ const nx = x + s.dx, nz = z + s.dz, inCell = Math.abs(x - (-72 + 48 * s.j)) <= 24 && Math.abs(z - (-72 + 48 * s.kk)) <= 24;
      return inCell ? [nx, nz] : cityOpenNear(nx, nz); } }   // the merged city: the story's blocks (a point between them: the nearest open ground)
  if (x <= 102 && z <= 236) return [x, z];                            // the «حتة», its pier and its bit of the bay
  for (const r of CITY.remote || []){
    const x0 = -96 + r.j0 * 48 - 6.5, x1 = -96 + (r.j1 + 1) * 48 + 6.5, z0 = -96 + r.k0 * 48 - 6.5, z1 = -96 + (r.k1 + 1) * 48 + 6.5;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return [x + r.dx, z + r.dz];
  }
  if (z <= 156){   // the old corniche east of the «حتة»: the real corniche at Raml
    const a = CITY.anchors.corniche; return [a[0] + (x - 190) * .3, a[1] + (z - 150) * .5];
  }
  if (x > 40 && x < 152 && z >= 252){ const q = CLM.qaitbay; return [q.x + (x - 96) * .55, q.z - 30 + (z - 266) * .7]; }   // the old fort → inside the real Qaitbay
  return [x - 326, z];   // the open sea east of the old port → Anfoushi bay
}
// Shams's launch on نوّة night: from the «حتة» pier out round the open sea north-west of Anfoushi (all water)
const LAUNCH_PATH = [[-64, 196], [-50, 250], [-20, 320], [30, 390], [70, 450], [40, 520], [-30, 580], [-110, 630], [-220, 670], [-330, 690]].map(([x, z]) => [x + PORT_OFF[0], z + PORT_OFF[1]]);
const RLV = (x, y, z) => { const [a, b] = RELOC(x, z); return new THREE.Vector3(a, y, b); };
const relocV = v => { if (v){ const [a, b] = RELOC(v.x, v.z); v.x = a; v.z = b; } return v; };
