// ================= radar / minimap and full map =================
// A 1 m = 1 px picture of the whole map is drawn once; the minimap shows the part around طيارة, the full map shows all of it.
// stage 14: the picture is the whole real city (0.5 px per metre); the old map's «حتة» is drawn on top of it
const MAP = CITY ? { x0: CITY.x0, z0: CITY.z0, x1: CITY.x1, z1: CITY.z1, k: .5 } : { x0: X0 - 12, z0: Z0 - 12, x1: XMAX + 12, z1: FAR.z1 + 4, k: 1 };
const mapBase = document.createElement('canvas'); mapBase.width = Math.ceil((MAP.x1 - MAP.x0) * MAP.k); mapBase.height = Math.ceil((MAP.z1 - MAP.z0) * MAP.k);
const MX = x => (x - MAP.x0) * MAP.k, MZ = z => (z - MAP.z0) * MAP.k;
const cityMapImg = CITY ? await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = 'assets/city/map.webp'; }) : null;
{
  const g = mapBase.getContext('2d'); const K = MAP.k; g.save(); g.scale(K, K); g.translate(-MAP.x0, -MAP.z0);
  const MX = x => x, MZ = z => z;   // inside: world metres (the canvas is scaled)
  // dark like a phone GPS: dark land, light grey streets, the sea deep blue
  if (cityMapImg){ g.drawImage(cityMapImg, MAP.x0, MAP.z0, MAP.x1 - MAP.x0, MAP.z1 - MAP.z0); g.fillStyle = '#0e2333'; g.fillRect(X0 - 8, NILE_Z, XMAX - X0 + 16, 80); }
  else { g.fillStyle = '#1b1f24'; g.fillRect(MAP.x0, MAP.z0, MAP.x1 - MAP.x0, MAP.z1 - MAP.z0); g.fillStyle = '#0e2333'; g.fillRect(MAP.x0, NILE_Z, MAP.x1 - MAP.x0, MAP.z1 - NILE_Z); }
  g.fillStyle = '#5a626c'; g.fillRect(MX(X0-6), MZ(Z0-6), XMAX - X0 + 12, NILE_Z - Z0 + 6);
  g.fillStyle = '#6b4f2a'; g.fillRect(PIER.x0, PIER.z0, PIER.x1 - PIER.x0, PIER.z1 - PIER.z0);
  blocksInfo.forEach(b => { g.fillStyle = b.type === 'park' ? '#1f3526' : b.type === 'pitch' ? '#234a2c' : '#252a30'; g.fillRect(MX(b.cx - BW/2), MZ(b.cz - BW/2), BW, BW); });
  g.fillStyle = '#30363e'; obstacles.filter(o => o.building && o.minX > X0 - 20 && o.maxX < XMAX + 20 && o.minZ > Z0 - 20 && o.maxZ < NILE_Z + 10).forEach(o => g.fillRect(MX(o.minX), MZ(o.minZ), o.maxX - o.minX, o.maxZ - o.minZ));
  g.restore();
}
const radar = $('radar'), rctx = radar.getContext('2d'); const RW = 150, RANGE = 150;
let radarC = { x: 0, z: 0 };
const rx = x => (x - radarC.x) / RANGE * RW + RW/2, rz = z => (z - radarC.z) / RANGE * RW + RW/2;
function dot(x, z, r, c){ const px = clamp(rx(x), 4, RW-4), pz = clamp(rz(z), 4, RW-4); rctx.fillStyle = c; rctx.beginPath(); rctx.arc(px, pz, r, 0, 7); rctx.fill(); }
function star(x, z, t){ const px = clamp(rx(x), 8, RW-8), pz = clamp(rz(z), 8, RW-8); rctx.fillStyle = Math.floor(t*3)%2 ? '#ffc94a' : '#fff3c4'; rctx.font = 'bold 16px sans-serif'; rctx.textAlign = 'center'; rctx.textBaseline = 'middle'; rctx.strokeStyle = '#000'; rctx.lineWidth = 3; rctx.strokeText('★', px, pz); rctx.fillText('★', px, pz); }
function radarMarks(t){
  const m = [];
  if (POL.on){ const bl = Math.floor(t * 6) % 2; for (const u of POL.units.filter(Boolean)) if (u.active && u.v !== hero.veh) m.push({ x: u.pos.x, z: u.pos.z, r: 4, c: bl ? '#ff3347' : '#3a6bff' }); for (const c of POL.cops) if (c.on && c.state !== 'down') m.push({ x: c.pos.x, z: c.pos.z, r: 2.4, c: '#6aa8ff' }); if (POL.heli && POL.heli.on) m.push({ x: POL.heli.pos.x, z: POL.heli.pos.z, r: 5, c: bl ? '#ffffff' : '#3a6bff' }); }
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
  const C = RW / 2, K = RW / RANGE, A = camYaw, ca = Math.cos(A), sa = Math.sin(A), rr = C - 8;
  const pr = (x, z, edge) => { let px = (x - f.x) * K, pz = (z - f.z) * K; const qx = px * ca - pz * sa, qz = px * sa + pz * ca; const l = Math.hypot(qx, qz); if (edge && l > rr) return [C + qx / l * rr, C + qz / l * rr, true]; return [C + qx, C + qz, l > C]; };
  rctx.save(); rctx.clearRect(0, 0, RW, RW); rctx.beginPath(); rctx.arc(C, C, C, 0, 7); rctx.clip();
  rctx.fillStyle = '#1b1f24'; rctx.fillRect(0, 0, RW, RW);
  rctx.save(); rctx.translate(C, C); rctx.rotate(A); rctx.drawImage(mapBase, MX(f.x - RANGE * .75), MZ(f.z - RANGE * .75), RANGE * 1.5 * MAP.k, RANGE * 1.5 * MAP.k, -RW * .75, -RW * .75, RW * 1.5, RW * 1.5);
  if (GPS.on && GPS.path.length){ rctx.strokeStyle = '#b06cff'; rctx.lineWidth = 4; rctx.lineJoin = rctx.lineCap = 'round'; rctx.beginPath(); GPS.path.forEach((q, i) => { const x = (q.x - f.x) * K, z = (q.z - f.z) * K; i ? rctx.lineTo(x, z) : rctx.moveTo(x, z); }); rctx.stroke(); }
  if (POL.on && !POL.seen){ rctx.strokeStyle = Math.floor(t * 3) % 2 ? 'rgba(255,60,60,.9)' : 'rgba(80,120,255,.9)'; rctx.fillStyle = 'rgba(255,60,60,.14)'; rctx.lineWidth = 2; rctx.beginPath(); rctx.arc((POL.lastSeen.x - f.x) * K, (POL.lastSeen.z - f.z) * K, POL.zoneR * K, 0, 7); rctx.fill(); rctx.stroke(); }
  rctx.restore();
  // places nearby: small icons (only the ones the map filter shows)
  for (const p of gmPlacesCached()){ if (p.cat === 'mission' || !GM.show[p.cat]) continue; const [x, z, out] = pr(p.pos.x, p.pos.z, false); if (out) continue; drawPin(rctx, p.ic, x, z, 6.5, GM_COL[p.cat]); }
  for (const q of owPins()){ const [x, z, out] = pr(q.x, q.z, false); if (!out) drawPin(rctx, q.ic, x, z, 6, q.col); }
  for (const k of radarMarks(t)){ if (k.star){ const [x, z] = pr(k.x, k.z, true); drawPin(rctx, 'star', x, z, 8, '#f2c443', true); } else { const [x, z, out] = pr(k.x, k.z, true); rctx.fillStyle = k.c; rctx.beginPath(); rctx.arc(x, z, (k.r || 3) * .9, 0, 7); rctx.fill(); rctx.strokeStyle = 'rgba(0,0,0,.7)'; rctx.lineWidth = 1; rctx.stroke(); } }
  if (GPS.on){ const [x, z] = pr(GPS.to.x, GPS.to.z, true); drawPin(rctx, 'map-pin', x, z, 7.5, '#b06cff', true); }
  // you: the arrow points the way the camera looks (always up)
  rctx.fillStyle = '#fff'; rctx.strokeStyle = '#000'; rctx.lineWidth = 1.6; rctx.beginPath(); rctx.moveTo(C, C - 8); rctx.lineTo(C + 5.5, C + 6); rctx.lineTo(C, C + 3); rctx.lineTo(C - 5.5, C + 6); rctx.closePath(); rctx.fill(); rctx.stroke();
  // N on the rim
  const nx = C - Math.sin(A) * (C - 9), nz = C + Math.cos(A) * (C - 9);   // real north is +z
  rctx.fillStyle = '#0b0c0e'; rctx.beginPath(); rctx.arc(nx, nz, 7, 0, 7); rctx.fill(); rctx.fillStyle = '#fff'; rctx.font = "700 10px 'Readex Pro', sans-serif"; rctx.textAlign = 'center'; rctx.textBaseline = 'middle'; rctx.fillText('N', nx, nz + .5);
  rctx.restore();
  zoneCheck(f);
}
// the district name comes up bottom-right when you get into a new one (like GTA)
let zoneLast = null, zoneT = 0;
function zoneCheck(f){
  if (HOUSE.inside) return;   // inside a house / shop / the cave: no district name
  const cd = CITY && !inPatch(f.x, f.z) ? cityDistrict(f.x, f.z) : null, z = cd ? 'c_' + cd.k : districtAt(f.x, f.z);
  if (cd) DISTRICT_NAMES[z] = cd.name; if (z === zoneLast) return; const first = zoneLast === null; zoneLast = z; if (first || CUT.on || !DISTRICT_NAMES[z]) return;
  const el = $('zoneName'); el.textContent = DISTRICT_NAMES[z]; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(zoneT); zoneT = setTimeout(() => el.classList.remove('show'), 3200);
}
// the full map: 23d-gps-map.js
