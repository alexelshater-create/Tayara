// ================= Alexandria's trams on their real lines (OSM railway=tram): the yellow city tram and the blue Raml tram =================
// The lines and the real stops come from the city build (assets/city/trams.json). Rails are laid near you (in the street the rails
// sit in the asphalt; on the Raml tram's own corridor they lie on gravel and sleepers under the overhead wire), every stop has its
// platform, shelter and name, and the trams run up and down their line, wait at the stops, and stop for whoever is on the track.
const CTRAM = { lines: [], stops: [], trams: [], ready: false, pieces: [], near: [], glb: {}, stopBuilt: new Set() };
const CT_CAR = 15.2, CT_GAP = .5, CT_SPEED = 7.5, CT_DWELL = 7, CT_SHOW = LOW ? 300 : 380, CT_HALF_W = 1.4;
const CT_NAMES = { 'Ras El Tin': 'رأس التين', 'El Anfoushi': 'الأنفوشي', 'Karmouz': 'كرموز', 'Moharam Bek': 'محرم بك', 'El Amari': 'العامري', 'El Salam': 'السلام',
  'Nokrashi': 'النقراشي', 'El Koweri': 'الكوبري', 'El Wezara Station': 'الوزارة', 'Gleem Station': 'جليم', 'Saba Basha Station': 'سابا باشا', 'El Gamla': 'الجملة',
  'Bab 10': 'باب ١٠', 'Abu El Abbas': 'أبو العباس', 'Kahwet Farouk': 'قهوة فاروق', 'El Matafi': 'المطافي', 'El Rasafa': 'الرصافة', 'Ramleh Station': 'محطة الرمل',
  'St. Catherine Square': 'ميدان سانت كاترين', 'Fleming Station': 'فليمنج' };
const CT_AR = { 'محطة بُكلة': 'بولكلي', 'محطة جامع ابراهيم': 'القائد إبراهيم', 'نزهة': 'النزهة', 'الرياضة (سبورتنج) الكبرى': 'سبورتنج الكبرى', 'الرياضة (سبورتنج) الصغرى': 'سبورتنج الصغرى',
  'كمب شيزار': 'كامب شيزار', 'محطة ترام مصطفى كامل': 'مصطفى كامل', 'محطة ترام الوزارة': 'الوزارة', 'سيدي جابر المحطة': 'سيدي جابر المحطة', 'محطة سيدي جابر الشيخ': 'سيدي جابر الشيخ', 'محطة ترام كليوباترا (زنانيري)': 'كليوباترا (زنانيري)' };
const ctName = n => { n = CT_NAMES[n] || n || ''; n = CT_AR[n] || n; if (/محطة/.test(n)) return n.replace(/^محطة ترام /, 'محطة '); if (!/[؀-ۿ]/.test(n)) return 'محطة ترام'; return n.startsWith('محطة') || n.startsWith('ميدان') ? n : 'محطة ' + n; };
// a point on a line at arc length s (and its direction)
function ctAt(l, s, o = {}){
  const c = l.cum, P = l.p; s = Math.max(0, Math.min(l.L, s));
  let a = 0, b = c.length - 1; while (b - a > 1){ const m = (a + b) >> 1; if (c[m] <= s) a = m; else b = m; }
  const L = c[b] - c[a] || 1, t = (s - c[a]) / L, fx = (P[b][0] - P[a][0]) / L, fz = (P[b][1] - P[a][1]) / L;
  o.x = P[a][0] + (P[b][0] - P[a][0]) * t; o.z = P[a][1] + (P[b][1] - P[a][1]) * t; o.fx = fx; o.fz = fz; return o;
}
function ctProject(l, x, z){
  let best = { d: 1e9 };
  for (let i = 1; i < l.p.length; i++){ const [ax, az] = l.p[i - 1], [bx, bz] = l.p[i], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (d < best.d){ const L = Math.sqrt(L2); best = { d, s: l.cum[i - 1] + t * L, x: px, z: pz, fx: dx / L, fz: dz / L }; } }
  return best;
}
// OSM cuts a line at every switch and crossing: join the pieces of one colour end to end where they go on straight
function ctChain(lines){
  const used = new Set(), out = [], dirAt = (p, end) => { const n = p.length, a = end ? p[n - 2] : p[1], b = end ? p[n - 1] : p[0]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; };
  const next = (p, blue) => { const e = p[p.length - 1], [dx, dz] = dirAt(p, true); let best = null, bs = .7;
    lines.forEach((m, i) => { if (used.has(i) || m.blue !== blue) return; for (const rev of [false, true]){ const q = rev ? [...m.p].reverse() : m.p, s = q[0];
      if (Math.hypot(s[0] - e[0], s[1] - e[1]) > 4) continue; const [fx, fz] = dirAt(q, false), dot = -(fx * dx + fz * dz);   // dirAt(start) points backwards
      if (dot > bs){ bs = dot; best = { i, q }; } } }); return best; };
  lines.forEach((l, i) => { if (used.has(i)) return; used.add(i); let p = [...l.p];
    for (let k = 0; k < 2; k++){ for (let g = 0; g < 60; g++){ const n = next(p, l.blue); if (!n) break; used.add(n.i); p = p.concat(n.q.slice(1)); } p.reverse(); }
    out.push({ p, blue: l.blue }); });
  return out;
}
// ---------- the data, the models ----------
(async () => {
  if (!CITY) return;
  let d = null; try { d = await fetch('assets/city/trams.json').then(r => r.ok ? r.json() : null); } catch (e){}
  if (!d) return; if (Array.isArray(d)) d = { lines: d, stops: [] };
  const trainLen = 2 * CT_CAR + CT_GAP;
  // OSM gives whole ways that cross the edge of the map: keep only what's inside the city
  { const inB = q => q[0] > CITY.x0 + 40 && q[0] < CITY.x1 - 40 && q[1] > CITY.z0 + 40 && q[1] < CITY.z1 - 40, out = [];
    for (const l of d.lines){ let run = []; for (const q of l.p){ if (inB(q)) run.push(q); else { if (run.length > 1) out.push({ p: run, blue: l.blue }); run = []; } } if (run.length > 1) out.push({ p: run, blue: l.blue }); }
    d.lines = out; }
  d.lines = ctChain(d.lines);
  for (const l of d.lines){ const cum = [0]; for (let i = 1; i < l.p.length; i++) cum.push(cum[i - 1] + Math.hypot(l.p[i][0] - l.p[i - 1][0], l.p[i][1] - l.p[i - 1][1]));
    l.cum = cum; l.L = cum[cum.length - 1]; l.stopS = []; if (l.L > trainLen + 30) CTRAM.lines.push(l); }
  for (const s of d.stops || []){ if (!s.name && Math.hypot(s.x - cityLL(31.1773, 29.8796)[0], s.z - cityLL(31.1773, 29.8796)[1]) < 120) s.name = 'مينا البصل'; let best = null; for (const l of CTRAM.lines){ const q = ctProject(l, s.x, s.z); if (q.d < 14 && (!best || q.d < best.q.d)) best = { l, q }; }
    if (!best) continue; best.l.stopS.push(best.q.s); CTRAM.stops.push({ name: ctName(s.name), x: best.q.x, z: best.q.z, fx: best.q.fx, fz: best.q.fz, blue: best.l.blue, line: best.l }); }
  for (const l of CTRAM.lines) l.stopS.sort((a, b) => a - b);
  for (const l of CTRAM.lines){ const n = Math.max(1, Math.min(6, Math.round(l.L / 700)));
    for (let i = 0; i < n; i++){ const dir = i % 2 ? -1 : 1, s = trainLen + (l.L - trainLen) * (i + .5) / n; CTRAM.trams.push({ line: l, s: dir > 0 ? s : s - trainLen, dir, v: CT_SPEED, dwell: 0, lastStop: -1, cars: null, blue: !!l.blue, bellT: 0 }); } }
  // rails in pieces of ~120 m, laid when you come near
  for (const l of CTRAM.lines) for (let s = 0; s < l.L; s += 120){ const m = ctAt(l, Math.min(l.L, s + 60)); CTRAM.pieces.push({ l, s0: s, s1: Math.min(l.L, s + 121), x: m.x, z: m.z, mesh: null }); }
  try {
    const { GLTFLoader } = await import('three/addons/GLTFLoader.js'); const ld = new GLTFLoader();
    const [y, b] = await Promise.all([ld.loadAsync('assets/landmarks/tram.glb').catch(() => null), ld.loadAsync('assets/landmarks/tram-blue.glb').catch(() => null)]);
    CTRAM.glb.yellow = y && y.scene; CTRAM.glb.blue = (b && b.scene) || CTRAM.glb.yellow;
  } catch (e){}
  CTRAM.ready = !!CTRAM.glb.yellow;
})();
// ---------- the track ----------
const CT_RAIL = new THREE.MeshStandardMaterial({ color: 0x6d6a66, metalness: .75, roughness: .35, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const CT_BED = new THREE.MeshStandardMaterial({ map: (() => { const t = makeTex(128, 128, (g, w, h) => {
    g.fillStyle = '#857c70'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++){ const v = 95 + Math.random() * 70 | 0; g.fillStyle = `rgb(${v + 8},${v + 4},${v})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3); }
    g.fillStyle = '#5b4a3a'; g.fillRect(6, 40, w - 12, 30); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(6, 66, w - 12, 4); });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })(), roughness: .95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const CT_POLE = new THREE.MeshStandardMaterial({ color: 0x4a5a52, roughness: .6, metalness: .4 });
const CT_WIRE = new THREE.LineBasicMaterial({ color: 0x222222 });
function ctBuildPiece(pc){
  const l = pc.l, rails = [], bed = [], bedUV = [], wire = [], poles = [], q = {};
  const groundAt = (x, z) => cityR(x, z) === 1 ? 0 : .15;
  let prev = null;
  for (let s = pc.s0; s <= pc.s1 + .01; s += 2){
    ctAt(l, s, q); const nx = -q.fz, nz = q.fx, y0 = groundAt(q.x, q.z), road = y0 === 0;
    const cur = { s, x: q.x, z: q.z, nx, nz, y: road ? .012 : .17, road };
    if (prev){
      for (const off of [-.72, .72]) for (const w of [[-.05, .05]]){ const a0 = off + w[0], a1 = off + w[1], yr = Math.max(prev.y, cur.y) + (cur.road ? 0 : .04);
        rails.push(prev.x + prev.nx * a0, yr, prev.z + prev.nz * a0, prev.x + prev.nx * a1, yr, prev.z + prev.nz * a1, cur.x + cur.nx * a1, yr, cur.z + cur.nz * a1,
                   prev.x + prev.nx * a0, yr, prev.z + prev.nz * a0, cur.x + cur.nx * a1, yr, cur.z + cur.nz * a1, cur.x + cur.nx * a0, yr, cur.z + cur.nz * a0); }
      if (!cur.road && !prev.road){ const W = 1.5, y = .165, v0 = prev.s / .75, v1 = cur.s / .75;
        bed.push(prev.x - prev.nx * W, y, prev.z - prev.nz * W, prev.x + prev.nx * W, y, prev.z + prev.nz * W, cur.x + cur.nx * W, y, cur.z + cur.nz * W,
                 prev.x - prev.nx * W, y, prev.z - prev.nz * W, cur.x + cur.nx * W, y, cur.z + cur.nz * W, cur.x - cur.nx * W, y, cur.z - cur.nz * W);
        bedUV.push(0, v0, 1, v0, 1, v1, 0, v0, 1, v1, 0, v1); }
      wire.push(prev.x, 5.6, prev.z, cur.x, 5.6, cur.z);
    }
    if (Math.round(s) % 30 < 2 && (!poles.length || s - poles[poles.length - 1].s > 20)) poles.push({ s, x: q.x + nx * 2.3, z: q.z + nz * 2.3, nx, nz, road });
    prev = cur;
  }
  const g = new THREE.Group();
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(rails, 3)); geo.computeVertexNormals(); g.add(new THREE.Mesh(geo, CT_RAIL));
  if (bed.length){ const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(bed, 3)); b.setAttribute('uv', new THREE.Float32BufferAttribute(bedUV, 2)); b.computeVertexNormals(); const m = new THREE.Mesh(b, CT_BED); m.receiveShadow = true; g.add(m); }
  const w = new THREE.BufferGeometry(); w.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3)); g.add(new THREE.LineSegments(w, CT_WIRE));
  // the overhead line's poles with their arm over the track (off the road they stand beside the corridor)
  const pg = new THREE.CylinderGeometry(.09, .12, 6.2, 6); pg.translate(0, 3.1, 0); const ag = new THREE.BoxGeometry(.07, .07, 2.5); ag.translate(0, 5.75, -1.25);
  const pm = new THREE.InstancedMesh(pg, CT_POLE, poles.length), am = new THREE.InstancedMesh(ag, CT_POLE, poles.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0);
  poles.forEach((p, i) => { Q.setFromAxisAngle(Y, Math.atan2(p.nx, p.nz)); M.compose(new THREE.Vector3(p.x, p.road ? .15 : .16, p.z), Q, S); pm.setMatrixAt(i, M); am.setMatrixAt(i, M); });
  g.add(pm, am); for (const p of poles) obstacles.push({ minX: p.x - .15, maxX: p.x + .15, minZ: p.z - .15, maxZ: p.z + .15, tram: true });
  if (poles.length) OG.n = -1;
  scene.add(g); return g;
}
function ctBuildStop(st){
  const g = new THREE.Group(), nx = -st.fz, nz = st.fx, side = 2.9, px = st.x + nx * side, pz = st.z + nz * side, yaw = Math.atan2(st.fx, st.fz);
  const conc = new THREE.MeshStandardMaterial({ color: 0xb8b2a6, roughness: .9 }), col = st.blue ? 0x1f4fa8 : 0xd9a400;
  const plat = new THREE.Mesh(new THREE.BoxGeometry(2.2, .32, 16), conc); plat.position.set(0, .16, 0); plat.receiveShadow = true; g.add(plat);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(.25, .33, 16), new THREE.MeshStandardMaterial({ color: 0xe8d36a, roughness: .8 })); edge.position.set(-1.0, .165, 0); g.add(edge);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, .1, 6), new THREE.MeshStandardMaterial({ color: col, roughness: .6 })); roof.position.set(.2, 2.9, 0); roof.castShadow = !LOW; g.add(roof);
  for (const zz of [-2.6, 2.6]){ const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.6, 6), CT_POLE); p.position.set(.9, 1.6, zz); g.add(p); }
  const bench = new THREE.Mesh(new THREE.BoxGeometry(.45, .45, 2.4), new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: .8 })); bench.position.set(.75, .55, 0); g.add(bench);
  g.position.set(px, 0, pz); g.rotation.y = yaw; scene.add(g);
  const sx = px + Math.sin(yaw) * 3.2, sz = pz + Math.cos(yaw) * 3.2;
  glowSigns.push(signBoard(bigSign(st.name, st.blue ? '#173e86' : '#c99a00', '#ffffff', 640, 120, 56), sx, 3.25, sz, 2.6, .5, yaw + Math.PI / 2, .25));
  // the platform is solid at its ends only (you walk onto it from the side)
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const zz of [-2.6, 2.6]){ const x = px + s * zz + c * .9, z = pz + c * zz - s * .9; obstacles.push({ minX: x - .12, maxX: x + .12, minZ: z - .12, maxZ: z + .12, tram: true }); }
  OG.n = -1;
}
// ---------- the trams ----------
function ctCars(T){
  const src = T.blue ? CTRAM.glb.blue : CTRAM.glb.yellow; T.cars = [];
  for (let k = 0; k < 2; k++){ const c = src.clone(true); c.traverse(o => { if (o.isMesh){ o.castShadow = !LOW; o.receiveShadow = true; } }); scene.add(c); T.cars.push({ obj: c, x: 0, z: 0, fx: 0, fz: 1 }); }
}
const _ctq = {};
function ctAhead(T, dist){
  // is something on the track ahead of the front car (you, your car, a street car)?
  const head = ctAt(T.line, T.s, {}), fx = head.fx * T.dir, fz = head.fz * T.dir;
  const test = (x, z) => { const dx = x - head.x, dz = z - head.z, a = dx * fx + dz * fz, b = Math.abs(-dx * fz + dz * fx); return a > -1 && a < dist && b < 2.2; };
  const h = heroAt(); if (!(TRAMR.on && TRAMR.city === T) && test(h.x, h.z)) return true;
  for (const c of traffic){ if (c.visible && Math.abs(c.position.x - head.x) < dist && Math.abs(c.position.z - head.z) < dist && test(c.position.x, c.position.z)) return true; }
  return false;
}
function updateCityTrams(dt){
  if (!CTRAM.ready || HOUSE.inside) return;
  const h = heroAt(), trainLen = 2 * CT_CAR + CT_GAP; CTRAM.near.length = 0;
  // rails and stops near you
  for (const pc of CTRAM.pieces) if (!pc.mesh && Math.abs(pc.x - h.x) < 420 && Math.abs(pc.z - h.z) < 420 && cityReady(pc.x, pc.z, 70)){ pc.mesh = ctBuildPiece(pc); break; }
  for (const st of CTRAM.stops){ if (CTRAM.stopBuilt.has(st)) continue; if (Math.abs(st.x - h.x) < 260 && Math.abs(st.z - h.z) < 260 && cityReady(st.x, st.z, 10)){ CTRAM.stopBuilt.add(st); ctBuildStop(st); break; } }
  for (const T of CTRAM.trams){
    const l = T.line, headS = T.s;
    // the next stop ahead
    let nextS = null; for (const ss of T.dir > 0 ? l.stopS : [...l.stopS].reverse()){ if (T.dir > 0 ? ss > headS + .3 : ss < headS - .3){ nextS = ss; break; } }
    const toStop = nextS == null ? 1e9 : Math.abs(nextS - headS);
    let target = CT_SPEED;
    if (T.dwell > 0){ T.dwell -= dt; target = 0; }
    else {
      if (toStop < 30) target = Math.max(1.2, CT_SPEED * toStop / 30);
      if (toStop < .6 && T.lastStop !== nextS){ T.lastStop = nextS; T.dwell = CT_DWELL; target = 0; }
      const near = Math.abs(ctAt(l, headS, _ctq).x - h.x) < 120 && Math.abs(_ctq.z - h.z) < 120;
      if (near && ctAhead(T, 14)){ target = 0; T.bellT -= dt; if (T.bellT <= 0){ T.bellT = 2.2; if (typeof tone === 'function') { tone(1250, 1250, .12, 'triangle', .05); setTimeout(() => tone(1250, 1250, .12, 'triangle', .05), 180); } } }
    }
    T.v += Math.max(-3 * dt, Math.min(1.5 * dt, target - T.v)); if (T.v < 0) T.v = 0;
    T.s += T.v * T.dir * dt;
    // the end of the line: the driver walks to the other cab
    if (T.dir > 0 && T.s >= l.L){ T.dir = -1; T.s = l.L - trainLen; T.dwell = CT_DWELL * 2; T.lastStop = -1; }
    else if (T.dir < 0 && T.s <= 0){ T.dir = 1; T.s = trainLen; T.dwell = CT_DWELL * 2; T.lastStop = -1; }
    // drawn only near you
    const hp = ctAt(l, T.s, _ctq), show = Math.abs(hp.x - h.x) < CT_SHOW && Math.abs(hp.z - h.z) < CT_SHOW;
    if (!show){ if (T.cars) for (const c of T.cars) c.obj.visible = false; continue; }
    if (!T.cars) ctCars(T);
    T.cars.forEach((c, k) => {
      const sc = T.s - T.dir * (CT_CAR / 2 + k * (CT_CAR + CT_GAP)), p = ctAt(l, sc, {}), fx = p.fx * T.dir, fz = p.fz * T.dir;
      c.x = p.x; c.z = p.z; c.fx = fx; c.fz = fz; c.obj.visible = true;
      const y = cityR(p.x, p.z) === 1 ? .02 : .2;
      c.obj.position.set(p.x, y, p.z); c.obj.rotation.y = Math.atan2(-fx, -fz) + (k ? Math.PI : 0);   // the cab (glTF -Z) leads, the second car's cab at the back
      c.T = T; CTRAM.near.push(c);
    });
    if (TRAMR.on && TRAMR.city === T){ const c = T.cars[0]; hero.pos.set(c.x, .15, c.z); hero.vel.set(0, 0, 0); }
  }
  // a tram moving into you pushes you off the track
  if (TRAMR.on && TRAMR.city && !TRAMR.city.cars) TRAMR.city = null;
  if (!hero.veh && !TRAMR.on) for (const c of CTRAM.near){ const dx = hero.pos.x - c.x, dz = hero.pos.z - c.z, a = dx * c.fx + dz * c.fz, b = -dx * c.fz + dz * c.fx;
    if (Math.abs(a) < CT_CAR / 2 + .2 && Math.abs(b) < CT_HALF_W + .35){ const sg = b < 0 ? -1 : 1, need = (CT_HALF_W + .4) * sg - b; hero.pos.x += -c.fz * need; hero.pos.z += c.fx * need; } }
}
function ctBlocked(x, z, pad){
  for (const c of CTRAM.near){ const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz > 120) continue;
    const a = dx * c.fx + dz * c.fz, b = -dx * c.fz + dz * c.fx; if (Math.abs(a) < CT_CAR / 2 + pad && Math.abs(b) < CT_HALF_W + pad) return true; }
  return false;
}
if (CITY){
  const _sbTram = staticBlocked;
  staticBlocked = function(x, z, pad = PR, feet){ return _sbTram(x, z, pad, feet) || (CTRAM.near.length > 0 && !TRAMR.on && ctBlocked(x, z, pad)); };
  // street cars wait for a tram in front of them
  const _tsTram = trafficStep;
  trafficStep = function(c, dt, t, playing){
    if (CTRAM.near.length && c.visible && c.userData.graph){ const yaw = c.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw);
      for (const k of CTRAM.near){ const dx = k.x - c.position.x, dz = k.z - c.position.z; if (dx * dx + dz * dz > 400) continue; const a = dx * fx + dz * fz, b = Math.abs(-dx * fz + dz * fx);
        if (a > 0 && a < 16 && b < CT_HALF_W + 1.6){ c.userData.speed = 0; return; } } }
    return _tsTram(c, dt, t, playing);
  };
  // the GPS: the real places and the tram stops
  const _gpsTram = gpsPlaces;
  gpsPlaces = function(){
    const L = _gpsTram();
    for (const p of CITY.places || []) L.push({ cat: 'places', g: 'إسكندرية', name: p.name, ic: p.ic || 'map-pin', pos: new THREE.Vector3(p.x, 0, p.z) });
    for (const s of CTRAM.stops) L.push({ cat: 'transit', g: 'مواصلات', name: s.name + (s.blue ? ' (ترام الرمل)' : ' (الترام الأصفر)'), ic: 'train', pos: new THREE.Vector3(s.x - s.fz * 2.9, 0, s.z + s.fx * 2.9) });
    return L;
  };
}
