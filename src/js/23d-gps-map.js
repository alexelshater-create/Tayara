// ================= the GPS map: dark like a phone map, filters, a card with «وديني هناك», the route; and the markers in the world =================
const GM_CATS = [['mission', 'المهمة', 'star'], ['home', 'الحتة', 'home'], ['shops', 'المحلات', 'building-store'], ['fun', 'تسالي', 'device-gamepad-2'], ['places', 'أماكن', 'map-pin'], ['cars', 'عربياتك', 'car'], ['transit', 'مواصلات', 'bus']];
const GM_COL = { mission: '#f2c443', home: '#5fd068', shops: '#4fa3ff', fun: '#c77dff', places: '#ff9f43', cars: '#7fd3ff', transit: '#9aa6b2' };
const GM = { show: { mission: true, home: true, shops: true, fun: true, places: true, cars: true, transit: false }, cx: 0, cz: 0, s: 1, sel: null, hit: [], ptr: new Map(), down: null, pinch: 0 };
try { const sv = JSON.parse(localStorage.getItem('gtaMapFilter') || 'null'); if (sv) Object.assign(GM.show, sv); } catch (e){}

// the same Tabler icons as the HUD, drawn on a canvas
const IC_PATHS = {};
function icPaths(name){
  if (IC_PATHS[name]) return IC_PATHS[name];
  const src = ICONS[name] || ICONS['map-pin'], out = [];
  src.replace(/<path[^>]*\sd="([^"]+)"/g, (_, d) => { out.push(new Path2D(d)); return ''; });
  src.replace(/<circle[^>]*cx="([\d.]+)"[^>]*cy="([\d.]+)"[^>]*r="([\d.]+)"/g, (_, x, y, r) => { const p = new Path2D(); p.arc(+x, +y, Math.max(+r, .9), 0, 7); out.push(p); return ''; });
  return IC_PATHS[name] = out;
}
function drawPin(g, name, x, y, r, col, ring){
  g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = col; g.fill(); g.lineWidth = ring ? 2 : 1.2; g.strokeStyle = ring ? '#fff' : 'rgba(0,0,0,.75)'; g.stroke();
  const k = r * 1.25 / 24; g.translate(x - 12 * k, y - 12 * k); g.scale(k, k); g.strokeStyle = '#111417'; g.lineWidth = 2.5; g.lineCap = g.lineJoin = 'round';
  for (const p of icPaths(name)) g.stroke(p);
  g.restore();
}
let gmCache = [], gmCacheT = -1e9;
function gmPlacesCached(force){ const n = performance.now(); if (force || n - gmCacheT > 1000){ gmCacheT = n; try { gmCache = gpsPlaces(); } catch (e){ gmCache = []; } } return gmCache; }

// ---- the big map ----
const gmCv = $('mapCanvas'), gmG = gmCv.getContext('2d');
const gmFit = () => Math.min(innerWidth / (MAP.x1 - MAP.x0), innerHeight / (MAP.z1 - MAP.z0));
const GFLIP = CITY ? -1 : 1;   // the real city: north (+z) at the top of the screen
const gmHero = () => hero.veh ? hero.veh.pos : hero.pos;
function openMap(){
  if (state !== 'play' || CUT.on || DSC.on) return;
  state = 'pause'; for (const k in keys) keys[k] = false;          // the world stops behind the map
  $('mapOv').hidden = false; document.body.classList.add('map-open'); const f = gmHero(); GM.cx = f.x; GM.cz = f.z; GM.s = CITY ? 1.1 : Math.max(gmFit() * 2.4, 1.6); GM.sel = null; $('gmCard').hidden = true;
  gmFilters(); gmResize();
}
function closeMap(){ $('mapOv').hidden = true; document.body.classList.remove('map-open'); resumeIfFree(); }
function gmResize(){ if ($('mapOv').hidden) return; const d = Math.min(devicePixelRatio || 1, 2); gmCv.width = Math.round(innerWidth * d); gmCv.height = Math.round(innerHeight * d); gmDraw(); }
function gmClamp(){
  GM.s = clamp(GM.s, gmFit() * .9, 7);
  GM.cx = clamp(GM.cx, MAP.x0, MAP.x1); GM.cz = clamp(GM.cz, MAP.z0, MAP.z1);
}
function gmDraw(){
  if ($('mapOv').hidden) return; gmClamp();
  const g = gmG, d = gmCv.width / innerWidth, W = innerWidth, H = innerHeight, s = GM.s, t = performance.now() / 1000;
  const P = (x, z) => [W / 2 + (x - GM.cx) * s * GFLIP, H / 2 + (z - GM.cz) * s * GFLIP];
  g.setTransform(d, 0, 0, d, 0, 0); g.fillStyle = '#14171b'; g.fillRect(0, 0, W, H);
  const [ox, oz] = P(MAP.x0, MAP.z0); g.imageSmoothingEnabled = s < 2.5; g.save(); g.translate(ox, oz); g.scale(GFLIP * s / MAP.k, GFLIP * s / MAP.k); g.drawImage(mapBase, 0, 0); g.restore();
  // the route
  if (GPS.on && GPS.path.length){ g.strokeStyle = '#b06cff'; g.lineWidth = 5; g.lineJoin = g.lineCap = 'round'; g.beginPath(); GPS.path.forEach((q, i) => { const [px, pz] = P(q.x, q.z); i ? g.lineTo(px, pz) : g.moveTo(px, pz); }); g.stroke(); }
  // moving things (police, chases, pickups)
  for (const k of radarMarks(t)){ if (k.star) continue; const [px, pz] = P(k.x, k.z); g.fillStyle = k.c; g.beginPath(); g.arc(px, pz, (k.r || 3) + 1.5, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1; g.stroke(); }
  // places
  const taken = [], fr = $('gmFilt').getBoundingClientRect(), tb = $('mapClose').getBoundingClientRect();
  taken.push({ x0: fr.left - 6, x1: W, y0: 0, y1: fr.bottom + 6 }, { x0: 0, x1: tb.right + 8, y0: 0, y1: tb.bottom + 8 }, { x0: W - 140, x1: W, y0: 0, y1: 48 });
  const free = (x0, y0, x1, y1) => { if (taken.some(r => x0 < r.x1 && x1 > r.x0 && y0 < r.y1 && y1 > r.y0)) return false; taken.push({ x0, y0, x1, y1 }); return true; };
  GM.hit = []; const L = gmPlacesCached(true), big = s > 3.2;
  for (const p of L){ if (!GM.show[p.cat]) continue; const [px, pz] = P(p.pos.x, p.pos.z); if (px < -20 || pz < -20 || px > W + 20 || pz > H + 20) continue;
    const sel = GM.sel && GM.sel.name === p.name, r0 = clamp(s * 4.4, 6.5, 11), r = p.cat === 'mission' ? r0 + 4 : sel ? r0 + 3 : r0;
    drawPin(g, p.ic, px, pz, r, GM_COL[p.cat], sel || p.cat === 'mission'); GM.hit.push({ p, x: px, y: pz });
    if (big || sel){ g.font = `700 12px 'Readex Pro', sans-serif`; const tw = g.measureText(p.name).width, ty = pz + r + 10; if (!sel && !free(px - tw / 2 - 3, ty - 8, px + tw / 2 + 3, ty + 8)) continue; g.lineWidth = 3; g.strokeStyle = 'rgba(8,9,11,.9)'; g.strokeText(p.name, px, pz + r + 10); g.fillStyle = '#eef1f4'; g.fillText(p.name, px, pz + r + 10); } }
  // the districts' names, quiet and big like on a GPS
  const labels = CITY ? Object.fromEntries([['الحتة', [0, 20]], ...CITY.districts.map(d => [d.name, [d.x, d.z]])]) : Object.fromEntries(Object.entries({ hara: [0, 0], market: [144, -48], food: [144, 48], stadium: [240, -48], works: [240, 48], corniche: [96, 120], bridge: [96, 210], bank: [96, 278] }).map(([k, v]) => [DISTRICT_NAMES[k], v]));
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
  const lfs = CITY ? Math.round(clamp(9 + s * 6, 12, 22)) : Math.round(clamp(11 * s, 12, 26)); g.font = `800 ${lfs}px 'Alexandria', sans-serif`;
  for (const [k, [x, z]] of Object.entries(labels)){ const [px, pz] = P(x, z), tw = g.measureText(k).width / 2 + 4, th = lfs / 2 + 2; if (!free(px - tw, pz - th, px + tw, pz + th)) continue; g.lineWidth = 3; g.strokeStyle = 'rgba(10,12,14,.8)'; g.strokeText(k, px, pz); g.fillStyle = 'rgba(215,221,228,.62)'; g.fillText(k, px, pz); }
  if (GPS.on){ const [px, pz] = P(GPS.to.x, GPS.to.z); drawPin(g, 'map-pin', px, pz, 12, '#b06cff', true); }
  // you
  const f = gmHero(), [hx, hz] = P(f.x, f.z);
  g.save(); g.translate(hx, hz); g.rotate(-camYaw + (GFLIP < 0 ? Math.PI : 0)); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -12); g.lineTo(8.5, 9); g.lineTo(0, 4.5); g.lineTo(-8.5, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
}
function gmFilters(){
  $('gmFilt').innerHTML = GM_CATS.map(([k, n, ic]) => `<button data-cat="${k}" class="${GM.show[k] ? '' : 'off'}"><i style="background:${GM_COL[k]}">${icon(ic)}</i>${n}</button>`).join('');
  $('gmFilt').querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { const k = b.dataset.cat; GM.show[k] = !GM.show[k]; b.classList.toggle('off', !GM.show[k]); try { localStorage.setItem('gtaMapFilter', JSON.stringify(GM.show)); } catch (e){} if (GM.sel && GM.sel.cat === k && !GM.show[k]) gmSelect(null); gmDraw(); });
}
function gmSelect(p){
  GM.sel = p; const c = $('gmCard'); if (!p){ c.hidden = true; gmDraw(); return; }
  const f = gmHero(), dd = Math.hypot(f.x - p.pos.x, f.z - p.pos.z), on = GPS.on && GPS.name === p.name;
  $('gmCardIc').innerHTML = icon(p.ic); $('gmCardIc').style.background = GM_COL[p.cat];
  $('gmCardName').textContent = p.name; $('gmCardSub').textContent = `${p.g} · ${AR(dd >= 1000 ? (dd / 1000).toFixed(1) + ' كم' : Math.round(dd) + ' م')}`;
  $('gmGo').textContent = on ? 'شيل الطريق' : 'وديني هناك'; $('gmGo').classList.toggle('on', on);
  c.hidden = false; gmDraw();
}
$('gmGo').onclick = () => { const p = GM.sel; if (!p) return; if (GPS.on && GPS.name === p.name) gpsClear(); else { gpsSet(p); updateGps(0); } gmSelect(p); };
$('mapClose').onclick = closeMap;
$('gmMe').onclick = () => { const f = gmHero(); GM.cx = f.x; GM.cz = f.z; gmDraw(); };
const gmZoom = (k, sx = innerWidth / 2, sy = innerHeight / 2) => { const s0 = GM.s, wx = GM.cx + (sx - innerWidth / 2) / s0 * GFLIP, wz = GM.cz + (sy - innerHeight / 2) / s0 * GFLIP; GM.s = clamp(s0 * k, gmFit() * .9, 7); GM.cx = wx - (sx - innerWidth / 2) / GM.s * GFLIP; GM.cz = wz - (sy - innerHeight / 2) / GM.s * GFLIP; gmDraw(); };
$('gmIn').onclick = () => gmZoom(1.5); $('gmOut').onclick = () => gmZoom(1 / 1.5);
gmCv.addEventListener('wheel', e => { e.preventDefault(); gmZoom(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX, e.clientY); }, { passive: false });
gmCv.addEventListener('pointerdown', e => { try { gmCv.setPointerCapture(e.pointerId); } catch (err){} GM.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (GM.ptr.size === 1) GM.down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; else { GM.down = null; const [a, b] = [...GM.ptr.values()]; GM.pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
gmCv.addEventListener('pointermove', e => {
  const q = GM.ptr.get(e.pointerId); if (!q) return; const dx = e.clientX - q.x, dy = e.clientY - q.y; q.x = e.clientX; q.y = e.clientY;
  if (GM.ptr.size === 1){ GM.cx -= dx / GM.s * GFLIP; GM.cz -= dy / GM.s * GFLIP; if (GM.down) GM.down.moved += Math.abs(dx) + Math.abs(dy); gmDraw(); }
  else if (GM.ptr.size === 2){ const [a, b] = [...GM.ptr.values()], dd = Math.hypot(a.x - b.x, a.y - b.y); if (GM.pinch > 0) gmZoom(dd / GM.pinch, (a.x + b.x) / 2, (a.y + b.y) / 2); GM.pinch = dd; }
});
const gmUp = e => {
  GM.ptr.delete(e.pointerId); const d = GM.down; GM.down = null; if (GM.ptr.size < 2) GM.pinch = 0;
  if (!d || d.moved > 8 || performance.now() - d.t > 450) return;
  let best = null, bd = 26; for (const h of GM.hit){ const k = Math.hypot(h.x - e.clientX, h.y - e.clientY); if (k < bd){ bd = k; best = h.p; } }
  gmSelect(best);
};
gmCv.addEventListener('pointerup', gmUp); gmCv.addEventListener('pointercancel', e => { GM.ptr.delete(e.pointerId); GM.down = null; GM.pinch = 0; });
addEventListener('resize', gmResize);
radar.style.pointerEvents = 'auto'; radar.style.cursor = 'pointer';
radar.addEventListener('pointerdown', e => { e.stopPropagation(); openMap(); });
addEventListener('keydown', e => { if (e.code !== 'KeyM' || e.repeat || (e.target && e.target.tagName === 'INPUT')) return; if ($('mapOv').hidden){ if (state === 'play') openMap(); } else closeMap(); });
setInterval(() => { if (!$('mapOv').hidden) gmDraw(); else document.body.classList.remove('map-open'); }, 500);   // police and chases keep moving on it

// ---- markers in the world: an icon from far away, the name when you get close; the mission in gold with how far it is ----
const wmLayer = document.createElement('div'); wmLayer.id = 'wmarks'; $('hud').prepend(wmLayer);
const WM = { pool: [], t: 0 }, _wmV = new THREE.Vector3();
function wmEl(i){
  let el = WM.pool[i]; if (el) return el;
  el = document.createElement('div'); el.className = 'wm'; el.innerHTML = '<i></i><b></b>'; wmLayer.appendChild(el); el._ic = ''; return WM.pool[i] = el;
}
// the part of the screen without HUD: right of the radar's button column, under the stats, above the touch buttons
function wmSafe(){ const W = innerWidth, H = innerHeight, sm = H <= 500; return { l: sm ? 190 : 230, r: W - (sm ? 120 : 150), t: sm ? 70 : 90, b: H - (isTouch ? (sm ? 120 : 150) : 60) }; }
function updateWorldMarks(dt){
  WM.t -= dt; if (WM.t > 0) return; WM.t = 1 / 30;
  const on = state === 'play' && !CUT.on && !HOUSE.inside && !DSC.on && (modeId === 'free' || modeId === 'story');
  const f = gmHero(), L = [];
  if (on){
    if (typeof missionMark !== 'undefined' && missionMark.visible){ const p = missionMark.position; L.push({ x: p.x, y: 3.2, z: p.z, ic: 'star', name: '', mission: true, dd: Math.hypot(p.x - f.x, p.z - f.z) }); }
    for (const m of WORLD_MARKS){ if (!m.obj.visible) continue; const p = m.obj.position, dd = Math.hypot(p.x - f.x, p.z - f.z); if (dd < 70) L.push({ x: p.x, y: p.y, z: p.z, ic: m.ic, name: m.name, dd }); }
  }
  let n = 0;
  for (const k of L){
    _wmV.set(k.x, k.y, k.z).project(camera); if (_wmV.z > 1) continue;
    let x = (_wmV.x + 1) / 2 * innerWidth, y = (1 - _wmV.y) / 2 * innerHeight;
    const S = wmSafe(), inside = x > S.l && x < S.r && y > S.t && y < S.b;
    if (!inside){ if (!k.mission) continue; x = clamp(x, S.l, S.r); y = clamp(y, S.t, S.b); }
    const el = wmEl(n++);
    if (el._ic !== k.ic){ el._ic = k.ic; el.firstChild.innerHTML = icon(k.ic); }
    const near = !k.mission && k.dd < 16, txt = k.mission ? AR(Math.round(k.dd) + ' م') : near ? k.name : '';
    if (el.lastChild.textContent !== txt) el.lastChild.textContent = txt;
    el.className = 'wm' + (k.mission ? ' mis' : '') + (near ? ' near' : '');
    el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; el.style.opacity = k.mission ? 1 : clamp((70 - k.dd) / 20, 0, 1); el.hidden = false;
  }
  for (let i = n; i < WM.pool.length; i++) WM.pool[i].hidden = true;
}
