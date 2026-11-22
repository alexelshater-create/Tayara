// ================= radar / minimap and full map =================
// A 1 m = 1 px picture of the whole map is drawn once; the minimap shows the part around طيارة, the full map shows all of it.
const MAP = { x0: X0 - 12, z0: Z0 - 12, x1: XMAX + 12, z1: FAR.z1 + 4 };
const mapBase = document.createElement('canvas'); mapBase.width = Math.ceil(MAP.x1 - MAP.x0); mapBase.height = Math.ceil(MAP.z1 - MAP.z0);
const MX = x => x - MAP.x0, MZ = z => z - MAP.z0;
{
  const g = mapBase.getContext('2d');
  g.fillStyle = '#3c5a2c'; g.fillRect(0, 0, mapBase.width, mapBase.height);
  g.fillStyle = '#2f6470'; g.fillRect(0, MZ(NILE_Z), mapBase.width, FAR.z0 - NILE_Z);
  g.fillStyle = '#3d3a35'; g.fillRect(MX(X0-6), MZ(Z0-6), XMAX - X0 + 12, NILE_Z - Z0 + 6);
  g.fillRect(MX(BRIDGE.x - BRIDGE.w/2), MZ(NILE_Z - 2), BRIDGE.w, BRIDGE.z1 - NILE_Z + 4);
  g.fillStyle = '#8a8070'; g.fillRect(MX(FAR.x0), MZ(FAR.z0), FAR.x1 - FAR.x0, FAR.z1 - FAR.z0);
  const tint = { hara: '#857a68', market: '#94764e', food: '#8c6a5c', stadium: '#6f8060', works: '#6c6c70', corniche: '#9a8a70' };
  blocksInfo.forEach(b => { g.fillStyle = b.type === 'park' ? '#3d5a2b' : b.type === 'pitch' ? '#3f8f3a' : tint[b.dist] || '#857a68'; g.fillRect(MX(b.cx - BW/2), MZ(b.cz - BW/2), BW, BW); });
  g.fillStyle = 'rgba(30,26,22,.85)'; obstacles.filter(o => o.building).forEach(o => g.fillRect(MX(o.minX), MZ(o.minZ), o.maxX - o.minX, o.maxZ - o.minZ));
}
const radar = $('radar'), rctx = radar.getContext('2d'); const RW = 150, RANGE = 150;
let radarC = { x: 0, z: 0 };
const rx = x => (x - radarC.x) / RANGE * RW + RW/2, rz = z => (z - radarC.z) / RANGE * RW + RW/2;
function dot(x, z, r, c){ const px = clamp(rx(x), 4, RW-4), pz = clamp(rz(z), 4, RW-4); rctx.fillStyle = c; rctx.beginPath(); rctx.arc(px, pz, r, 0, 7); rctx.fill(); }
function star(x, z, t){ const px = clamp(rx(x), 8, RW-8), pz = clamp(rz(z), 8, RW-8); rctx.fillStyle = Math.floor(t*3)%2 ? '#ffc94a' : '#fff3c4'; rctx.font = 'bold 16px sans-serif'; rctx.textAlign = 'center'; rctx.textBaseline = 'middle'; rctx.strokeStyle = '#000'; rctx.lineWidth = 3; rctx.strokeText('★', px, pz); rctx.fillText('★', px, pz); }
function radarMarks(t){
  const m = [];
  if (chaser.active) m.push({ x: chaserCar.position.x, z: chaserCar.position.z, r: 4, c: Math.floor(t*6)%2 ? '#ff3347' : '#3a6bff' });
  if (enemy.active && enemy.d.root.visible) m.push({ x: enemy.pos.x, z: enemy.pos.z, r: 3.5, c: enemy.ally ? '#7be07a' : '#ff8a3d' });
  if (thief.active && !thief.caught) m.push({ x: thief.pos.x, z: thief.pos.z, r: 4, c: Math.floor(t*5)%2 ? '#ff4d4d' : '#ffd34d' });
  if (wanted.active && !wanted.caught) m.push({ x: wanted.pos.x, z: wanted.pos.z, r: 4.5, c: Math.floor(t*4)%2 ? '#ff2020' : '#ffffff' });
  if (modeId === 'cash') cash.forEach(c => { if (!c.taken) m.push({ x: c.x, z: c.z, r: 3, c: '#ffd34d' }); });
  if (typeof storyMapMarks === 'function') m.push(...storyMapMarks(t));
  m.push(...actMapMarks(t));
  return m;
}
function drawRadar(t){
  const f = hero.veh ? hero.veh.pos : hero.pos; radarC = { x: f.x, z: f.z };
  rctx.fillStyle = '#1a1712'; rctx.fillRect(0, 0, RW, RW);
  rctx.drawImage(mapBase, MX(f.x - RANGE/2), MZ(f.z - RANGE/2), RANGE, RANGE, 0, 0, RW, RW);
  for (const k of radarMarks(t)){ if (k.star) star(k.x, k.z, t); else dot(k.x, k.z, k.r || 3, k.c); }
  // player arrow pointing where the camera looks
  rctx.save(); rctx.translate(RW/2, RW/2); rctx.rotate(-camYaw + Math.PI); rctx.fillStyle = '#fff'; rctx.strokeStyle = '#000'; rctx.lineWidth = 1.5;
  rctx.beginPath(); rctx.moveTo(0, -7); rctx.lineTo(5, 5); rctx.lineTo(0, 2); rctx.lineTo(-5, 5); rctx.closePath(); rctx.fill(); rctx.stroke(); rctx.restore();
  rctx.fillStyle = 'rgba(0,0,0,.55)'; rctx.fillRect(0, RW - 18, RW, 18); rctx.fillStyle = '#ffe9b0'; rctx.font = '700 12px Cairo, sans-serif'; rctx.textAlign = 'center'; rctx.textBaseline = 'middle'; rctx.direction = 'rtl';
  rctx.fillText(DISTRICT_NAMES[districtAt(f.x, f.z)] || '', RW/2, RW - 9);
}
// full map
function openMap(){
  if (state !== 'play') return;
  $('mapOv').hidden = false; drawFullMap();
}
function drawFullMap(){
  const cv = $('mapCanvas'), W = mapBase.width, H = mapBase.height, sc = Math.min((innerWidth - 40) / W, (innerHeight - 110) / H, 2.2);
  cv.width = Math.round(W*sc); cv.height = Math.round(H*sc); const g = cv.getContext('2d');
  g.drawImage(mapBase, 0, 0, cv.width, cv.height);
  const P = (x, z) => [MX(x)*sc, MZ(z)*sc];
  const labels = { hara: [0, 0], market: [144, -48], food: [144, 48], stadium: [240, -48], works: [240, 48], corniche: [96, 120], bridge: [96, 210], bank: [96, 278] };
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
  for (const [k, [x, z]] of Object.entries(labels)){ const [px, pz] = P(x, z); g.font = `900 ${Math.round(15*Math.max(sc,.8))}px Cairo, sans-serif`; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(DISTRICT_NAMES[k], px, pz); g.fillStyle = '#ffe9b0'; g.fillText(DISTRICT_NAMES[k], px, pz); }
  for (const s of STOPS){ const [px, pz] = P(s.pos.x, s.pos.z); g.fillStyle = '#1e66d0'; g.beginPath(); g.arc(px, pz, 6, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '700 9px sans-serif'; g.fillText('🚌', px, pz); }
  const marks = radarMarks(performance.now()/1000);
  for (const k of marks){ const [px, pz] = P(k.x, k.z); if (k.star){ g.font = 'bold 22px sans-serif'; g.lineWidth = 4; g.strokeStyle = '#000'; g.strokeText('★', px, pz); g.fillStyle = '#ffc94a'; g.fillText('★', px, pz); } else { g.fillStyle = k.c; g.beginPath(); g.arc(px, pz, (k.r||3)+1, 0, 7); g.fill(); } }
  const f = hero.veh ? hero.veh.pos : hero.pos; const [hx, hz] = P(f.x, f.z);
  g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(hx, hz, 7, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#000'; g.font = '900 9px Cairo, sans-serif'; g.fillText('انت', hx, hz);
}
radar.style.pointerEvents = 'auto'; radar.style.cursor = 'pointer';
radar.addEventListener('pointerdown', e => { e.stopPropagation(); openMap(); });
$('mapClose').onclick = () => { $('mapOv').hidden = true; };
addEventListener('keydown', e => { if (e.code === 'KeyM' && state === 'play'){ if ($('mapOv').hidden) openMap(); else $('mapOv').hidden = true; } });
