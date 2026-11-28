// ================= the real landmarks (built in Blender from photos: assets/landmarks/<name>.glb) =================
// Each model is made at real size with real north along Blender +Y (= glTF -Z), so it is turned 180° here (real north is +z
// in the game). The city is half size, so the biggest ones are shrunk a little to fit their place. Every part of a model
// becomes a solid box (walls, towers, the pedestal), and the model is only drawn when you are near enough to see it.
const LM = { list: [] };
// the city is half size; the landmarks are a bit more than that so they keep their presence, and their height is closer
// to the real one (a footprint scale s, a height scale up to 1.25 s), so next to the houses they look as they do in Alexandria
// every landmark at the city's own scale (half), so it sits exactly on its real footprint with its real streets round it;
// a bit taller than half (×1.3) so it keeps its presence next to the houses, which are full height. Saad's statue keeps
// its human proportions; the Stanley bridge stays exactly the road's size.
const LM_SCALE = { qaitbay: .5, 'mursi-mosque': .5, 'unknown-soldier': .5, cecil: .5, 'raml-station': .5, 'saad-zaghloul': .7, 'mohamed-ali': .6, tram: 1, library: .5, stadium: .5, raseltin: .5, 'misr-station': .5, 'sidigaber-station': .5, pompey: .5, 'roman-theatre': .5, 'stanley-bridge': .5 };
const LM_TALL = m => m === 'mohamed-ali' ? 1.5 : m === 'stanley-bridge' || m === 'saad-zaghloul' ? 1 : 1.3;
const LM_YAW = {};
// ways in that the models draw as closed panels (metres from the model's centre, in the game's frame)
const LM_DOORS = {};   // the real roads that lead in (the Qaitbay causeway) keep the way open
function carveObstacles(x0, z0, x1, z1, k){
  for (let i = obstacles.length - 1; i >= 0; i--){ const o = obstacles[i]; if (o.landmark !== k || o.maxX <= x0 || o.minX >= x1 || o.maxZ <= z0 || o.minZ >= z1) continue;
    obstacles.splice(i, 1);
    if (o.minX < x0) obstacles.push({ ...o, maxX: x0 }); if (o.maxX > x1) obstacles.push({ ...o, minX: x1 });
    if (o.minZ < z0) obstacles.push({ ...o, minX: Math.max(o.minX, x0), maxX: Math.min(o.maxX, x1), maxZ: z0 }); if (o.maxZ > z1) obstacles.push({ ...o, minX: Math.max(o.minX, x0), maxX: Math.min(o.maxX, x1), minZ: z1 }); }
  OG.n = -1;
}   // extra turn per model if its footprint needs to line up with the streets (filled after a look in game)
async function loadLandmarks(){
  if (!CITY) return;
  // Mohamed Ali on his horse in the middle of Midan el-Tahrir (el-Manshiya), if the city was built before he was added
  if (!CITY.landmarks.some(l => l.k === 'mohamedali')){ const [x, z] = cityLL(31.19746, 29.89267); CITY.landmarks.push({ k: 'mohamedali', name: 'تمثال محمد علي (المنشية)', x, z, model: 'mohamed-ali' }); }
  const { GLTFLoader } = await import('three/addons/GLTFLoader.js'); const loader = new GLTFLoader();
  for (const l of CITY.landmarks){
    if (!l.model) continue;
    let g; try { g = await loader.loadAsync(`assets/landmarks/${l.model}.glb`); } catch (e){ continue; }   // not made yet
    const root = new THREE.Group(), m = g.scene, s = LM_SCALE[l.model] || 1;
    m.scale.set(s, Math.min(1, s * LM_TALL(l.model)), s); m.rotation.y = Math.PI + (LM_YAW[l.model] || 0); root.add(m);
    root.position.set(l.x, .19, l.z); scene.add(root); root.updateMatrixWorld(true);   // a hair above the city's pavement (.15) so the model's own floors show
    m.traverse(o => { if (o.isMesh){ o.castShadow = !LOW; o.receiveShadow = true; if (o.material && o.material.map) o.material.map.anisotropy = 4; } });
    // what's solid: every bit of the model higher than a knee (walls, towers, columns) marks its 1.5 m cell; the cells of each
    // row join into boxes. Floors, courtyards, the bridge deck and the rocks stay walkable.
    await cityPreload(l.x, l.z, 140); landmarkSolids(m, l.k);
    for (const [x0, z0, x1, z1] of LM_DOORS[l.k] || []) carveObstacles(l.x + x0, l.z + z0, l.x + x1, l.z + z1, l.k);
    const all = new THREE.Box3().setFromObject(root);
    LM.list.push({ k: l.k, root, r: Math.max(all.max.x - all.min.x, all.max.z - all.min.z) / 2, box: all });
    buildings.push({ grp: root, mats: [], box: all, opacity: 1, landmark: true });
  }
}
function landmarkSolids(m, k){
  const C = 1.5, cells = new Set(), A = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3(), P = new THREE.Vector3();
  m.traverse(o => { if (!o.isMesh) return; o.updateMatrixWorld(true); const pos = o.geometry.attributes.position, idx = o.geometry.index, n = idx ? idx.count : pos.count, M = o.matrixWorld;
    const get = (i, v) => v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(M);
    for (let i = 0; i + 2 < n; i += 3){
      get(i, A); get(i + 1, B); get(i + 2, D); if (Math.max(A.y, B.y, D.y) < .9) continue;
      const L = Math.max(A.distanceTo(B), A.distanceTo(D), B.distanceTo(D)), s = Math.min(200, Math.ceil(L / (C * .5)));
      for (let a = 0; a <= s; a++) for (let b = 0; a + b <= s; b++){
        P.set(A.x + (B.x - A.x) * a / s + (D.x - A.x) * b / s, A.y + (B.y - A.y) * a / s + (D.y - A.y) * b / s, A.z + (B.z - A.z) * a / s + (D.z - A.z) * b / s);
        if (P.y > .9 && P.y < 2.4 && cityR(P.x, P.z) !== 1) cells.add(Math.floor(P.x / C) + ',' + Math.floor(P.z / C));   // not on a real road   // body height: arches and roofs overhead don't block
      }
    } });
  const byRow = new Map(); for (const c of cells){ const [gx, gz] = c.split(',').map(Number); let r = byRow.get(gz); if (!r) byRow.set(gz, r = []); r.push(gx); }
  let n = 0;
  for (const [gz, xs] of byRow){ xs.sort((a, b) => a - b); let s = xs[0], prev = xs[0];
    for (let i = 1; i <= xs.length; i++){ if (i < xs.length && xs[i] === prev + 1){ prev = xs[i]; continue; }
      obstacles.push({ minX: s * C, maxX: (prev + 1) * C, minZ: gz * C, maxZ: (gz + 1) * C, landmark: k }); n++;
      if (i < xs.length){ s = prev = xs[i]; } } }
  return n;
}
await loadLandmarks();
// near enough to see (big ones from far)
const _lmP = new THREE.Vector3();
function updateLandmarks(f){
  for (const L of LM.list){ const d = L.box.distanceToPoint(_lmP.set(f.x, L.box.min.y, f.z)); L.root.visible = !HOUSE.inside && d < (LOW ? 300 : 460); }
}

// ---------- the cave under Qaitbay: a rock arch on the sea side of the fort, a grotto inside (far away, like the shops) ----------
const CAVE = { room: { x: 5800, z: 5800, w: 14, d: 11 }, out: null, outYaw: 0 };
if (CITY && CLM.qaitbay) await cityPreload(CLM.qaitbay.x, CLM.qaitbay.z, 160);   // the rock around the fort must be known before looking for the way in
if (CITY && CLM.qaitbay){
  // the way in: the open land point round the fort closest to the sea (north), not inside a wall
  const q = CLM.qaitbay; let best = null, bz = -1e9;
  for (let r = 32; r <= 72; r += 2) for (let a = 0; a < 6.28; a += .12){
    const x = q.x + Math.sin(a) * r, z = q.z + Math.cos(a) * r;
    if (cityR(x, z) === 0 || staticBlocked(x, z, 1.2)) continue;
    if (z > bz){ bz = z; best = [x, z]; }
  }
  if (best){
    CAVE.out = new THREE.Vector3(best[0], .15, best[1]); CAVE.outYaw = Math.atan2(best[0] - q.x, best[1] - q.z);
    const p = [], rk = '#7d7466';
    for (let i = 0; i < 9; i++){ const a = -1.2 + i * .3, g = new THREE.IcosahedronGeometry(R(1.1, 1.7), 0); g.translate(Math.sin(a) * 2.6, 1 + Math.cos(a) * 2.3, 0); p.push(colored(g, i % 2 ? rk : '#6d6558')); }
    const arch = new THREE.Mesh(mergeGeometries(p.map(x => x.index ? x.toNonIndexed() : x)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
    arch.position.set(best[0] + Math.sin(CAVE.outYaw) * 1.4, 0, best[1] + Math.cos(CAVE.outYaw) * 1.4); arch.rotation.y = CAVE.outYaw + Math.PI / 2; arch.castShadow = true; scene.add(arch);
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3), new THREE.MeshBasicMaterial({ color: 0x050403 })); dark.position.copy(arch.position).setY(1.4); dark.rotation.y = CAVE.outYaw + Math.PI; scene.add(dark);
    { const o = new THREE.Object3D(); o.position.set(best[0], 3.2, best[1]); WORLD_MARKS.push({ obj: o, ic: 'building-castle', name: 'الكهف' }); }
  }
  // the grotto: rough rock walls round a sandy floor, a pool of sea water, a torch
  const { x, z, w, d } = CAVE.room, p = [];
  for (let i = 0; i < 46; i++){ const t = i / 46 * 6.28, rx = Math.sin(t) * (w / 2 + .6), rz = Math.cos(t) * (d / 2 + .6), g = new THREE.IcosahedronGeometry(R(1.4, 2.2), 0); g.translate(x + rx, R(.5, 2.6), z + rz); p.push(colored(g, pick(['#5f584d', '#6d6558', '#544d43']))); }
  for (let i = 0; i < 18; i++){ const g = new THREE.IcosahedronGeometry(R(2, 3), 0); g.translate(x + R(-w / 2, w / 2), 4.6, z + R(-d / 2, d / 2)); p.push(colored(g, '#4b453c')); }
  const walls = new THREE.Mesh(mergeGeometries(p.map(q => q.index ? q.toNonIndexed() : q)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide })); walls.receiveShadow = true; scene.add(walls);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w + 2, d + 2), new THREE.MeshStandardMaterial({ color: 0xb8a57c, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.set(x, .01, z); scene.add(floor);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshStandardMaterial({ color: 0x1d5a6e, roughness: .1, metalness: .3, emissive: 0x062a33, emissiveIntensity: .6 })); pool.rotation.x = -Math.PI / 2; pool.position.set(x + 3, .03, z - 2); scene.add(pool);
  obstacles.push({ minX: x + 1.2, maxX: x + 4.8, minZ: z - 3.8, maxZ: z - .2 });
  CAVE.light = new THREE.PointLight(0xffa860, 0, 16, 1.4); CAVE.light.position.set(x - 3, 2.4, z + 2); scene.add(CAVE.light);
  CAVE.doorIn = new THREE.Vector3(x, 0, z + d / 2 - .8);
}
function enterCave(){
  if (hero.veh || !CAVE.out) return;
  fadeTo(() => {
    const { x, z, w, d } = CAVE.room; HOUSE.inside = true; HOUSE.shop = 'cave'; HOUSE.homeRoom ||= HOUSE.room;
    HOUSE.room = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 };
    HOUSE.prevCam = camTarget; camTarget = Math.min(camTarget, 4); camDist = camTarget; CAVE.light.intensity = 6;
    hero.pos.set(CAVE.doorIn.x, 0, CAVE.doorIn.z - .4); hero.vel.set(0, 0, 0); CAM.orbit = CAM.orbitSm = 0; CAM.tilt = .5; lookAt.copy(hero.pos);
    banner('الكهف اللي تحت القلعة', 'info', 2);
  });
}
function exitCave(){
  fadeTo(() => {
    HOUSE.inside = false; HOUSE.shop = null; HOUSE.room = HOUSE.homeRoom || HOUSE.room; CAVE.light.intensity = 0;
    camTarget = HOUSE.prevCam || 5; hero.pos.copy(CAVE.out); hero.vel.set(0, 0, 0); CAM.orbit = CAM.orbitSm = CAVE.outYaw; lookAt.copy(hero.pos);
  });
}

// ---------- the beaches (الشاطبي and the rest): sand, umbrellas and plastic chairs, built when you come near ----------
const BEACHES = CITY ? await fetch('assets/city/beaches.json').then(r => r.ok ? r.json() : []).catch(() => []) : [];
const sandTex = makeTex(256, 256, (g, w, h) => { g.fillStyle = '#b9a271'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++){ g.fillStyle = `rgba(${150 + Math.random() * 80 | 0},${130 + Math.random() * 70 | 0},${80 + Math.random() * 60 | 0},.35)`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } }, [1, 1]);
sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
const sandMat = new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }); PBR(sandMat, 'sand', 2.4, 2.4, { tint: 0xf4ead8, ns: .8 });   // stage 17: real photographed sand
function buildBeach(b){ const sfB = {};
  const pos = new Float32Array(b.v.length * 3), uv = new Float32Array(b.v.length * 2);
  b.v.forEach(([x, z], k) => { pos.set([x, .17, z], k * 3); uv.set([x / 6, z / 6], k * 2); });
  const idx = b.i.slice(); for (let k = 0; k < idx.length; k += 3){ const [a, c, d] = [idx[k], idx[k + 1], idx[k + 2]]; const cr = (b.v[c][0] - b.v[a][0]) * (b.v[d][1] - b.v[a][1]) - (b.v[c][1] - b.v[a][1]) * (b.v[d][0] - b.v[a][0]); if (cr > 0){ idx[k + 1] = d; idx[k + 2] = c; } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const grp = new THREE.Group(); const m = new THREE.Mesh(g, sandMat); m.receiveShadow = true; grp.add(m);
  // umbrellas in rows, each with two chairs (only on the bigger beaches)
  const p = [], n = Math.min(LOW ? 14 : 30, Math.floor(b.a / 90));
  const inTri = (x, z) => { for (let k = 0; k < b.i.length; k += 3){ const A = b.v[b.i[k]], B = b.v[b.i[k + 1]], C = b.v[b.i[k + 2]]; const d1 = (x - B[0]) * (A[1] - B[1]) - (A[0] - B[0]) * (z - B[1]), d2 = (x - C[0]) * (B[1] - C[1]) - (B[0] - C[0]) * (z - C[1]), d3 = (x - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (z - A[1]); if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) return true; } return false; };
  const xs = b.v.map(q => q[0]), zs = b.v.map(q => q[1]); let placed = 0;
  for (let tries = 0; tries < n * 6 && placed < n; tries++){
    const x = R(Math.min(...xs), Math.max(...xs)), z = R(Math.min(...zs), Math.max(...zs)); if (!inTri(x, z)) continue;
    const col = pick(['#c0392b', '#1f5fa8', '#e0a21a', '#2e7d32', '#f1ead8', '#c2185b']);
    if (!sfPush(sfB, 'beach-umbrella', x, .17, z, Math.random() * 6.28)){ cyl(p, .04, .04, 2.3, x, 1.32, z, '#e8e4da'); { const c = new THREE.ConeGeometry(1.25, .55, 8); c.translate(x, 2.45, z); p.push(colored(c, col)); } }
    for (const s of [-1, 1]) if (!sfPush(sfB, Math.random() < .5 ? 'beach-chair-white' : 'beach-chair-blue', x + s * .8, .17, z + .6, s * .5 + Math.PI)) box(p, .5, .45, .5, x + s * .8, .4, z + .6, pick(['#f2f2f2', '#2e6fbf', '#e8b21a']));
    obstacles.push({ minX: x - .1, maxX: x + .1, minZ: z - .1, maxZ: z + .1 }); placed++;
  }
  // the fresca men walking the sand, a termis cart and a corn grill at the top of the beach
  if (b.a > 400 && typeof AR_GEO !== 'undefined'){ let k = 0; const want = Math.min(5, 1 + Math.floor(b.a / 2500));
    for (let tries = 0; tries < 60 && k < want; tries++){ const x = R(Math.min(...xs), Math.max(...xs)), z = R(Math.min(...zs), Math.max(...zs)); if (!inTri(x, z)) continue;
      const kind = k === 1 ? 'termis' : k === 3 ? 'corn' : 'fresca'; if (!sfPush(sfB, { termis: 'termis-cart', corn: 'corn-grill-cart', fresca: 'fresca-box' }[kind], x, .17, z, Math.random() * 6.28)){ const g2 = AR_GEO[kind].clone(); g2.rotateY(Math.random() * 6.28); g2.translate(x, .17, z); p.push(g2); } k++; } }
  sfFlush(grp, sfB);
  if (p.length){ const um = new THREE.Mesh(mergeGeometries(p.map(q => q.index ? q.toNonIndexed() : q)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 })); um.castShadow = !LOW; grp.add(um); }
  scene.add(grp); return grp;
}
function updateBeaches(f){ for (const b of BEACHES){ const d = Math.hypot(b.c[0] - f.x, b.c[1] - f.z); if (d < 420 && !b.grp) b.grp = buildBeach(b); if (b.grp) b.grp.visible = d < 460; } }

// ---------- the story's own places in the real city (stage 16): بنك الثغر, قصر الشاطر, the petrol station, the scrapyard, the power station ----------
// Each turns to face its nearest street; its parts are solid; SETS.<k> keeps where its door / front is for later missions.
const SETS = {};
function setFacing(x, z){ const q = graphNearest(x, z, 140); if (!q) return { yaw: 0, front: new THREE.Vector3(x, .15, z + 20) }; return { yaw: Math.atan2(q.x - x, q.z - z), front: new THREE.Vector3(q.x, .15, q.z) }; }
const SET_K = .6;   // the set pieces at the city's scale
function setPiece(s, build){
  const { yaw, front } = setFacing(s.x, s.z), grp = new THREE.Group(); grp.position.set(s.x, 0, s.z); grp.rotation.y = yaw; grp.scale.setScalar(SET_K); scene.add(grp);
  const p = [], solids = []; build(p, solids);
  const m = new THREE.Mesh(mergeGeometries(p.map(q => q.index ? q.toNonIndexed() : q)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .75, metalness: .1 })); m.castShadow = !LOW; m.receiveShadow = true; grp.add(m);
  grp.updateMatrixWorld(true);
  const c = Math.cos(yaw), sn = Math.sin(yaw), W = (lx, lz) => [s.x + (lx * c + lz * sn) * SET_K, s.z + (-lx * sn + lz * c) * SET_K];
  // each solid in pieces of about 1.6 m, so a turned wall stays a thin line of boxes (one big box round a turned wall closed the streets beside it)
  for (const [x0, z0, x1, z1, h] of solids){ const nx = Math.max(1, Math.ceil((x1 - x0) * SET_K / 1.6)), nz = Math.max(1, Math.ceil((z1 - z0) * SET_K / 1.6));
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++){ const ax = x0 + (x1 - x0) * a / nx, bx = x0 + (x1 - x0) * (a + 1) / nx, az = z0 + (z1 - z0) * b / nz, bz = z0 + (z1 - z0) * (b + 1) / nz;
      const pts = [W(ax, az), W(bx, az), W(ax, bz), W(bx, bz)], xs = pts.map(q => q[0]), zs = pts.map(q => q[1]); obstacles.push({ minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs), h: h ? h * SET_K : undefined, building: !h || h > 3, set: s.k }); } }
  SETS[s.k] = { grp, yaw, front, at: (lx, lz) => { const [x, z] = W(lx, lz); return new THREE.Vector3(x, .15, z); } };
  return { grp, W, yaw };
}
if (CITY && CITY.sets) for (const s of CITY.sets){
  if (s.k === 'bank') { const r = setPiece(s, (p, S) => {
      box(p, 30, 15, 20, 0, 7.65, -2, '#d9cfbd'); box(p, 31, 1.2, 21, 0, 15.7, -2, '#bfb39e'); box(p, 32, 1, 3, 0, .65, 9.5, '#cbbfa8');
      for (let i = -3; i <= 3; i++) cyl(p, .55, .6, 11, i * 3.6, 6.6, 9.4, '#ece6da', 0, 14);
      box(p, 27, 1.4, 2.4, 0, 12.7, 9.4, '#e3dccf'); box(p, 24, 1.2, 2.2, 0, 14, 9.3, '#d8d0bf'); box(p, 16, 1, 2, 0, 15.1, 9.2, '#e3dccf');
      box(p, 3.6, 5, .2, 0, 3.3, 8.1, '#3b2a1a'); for (let i = -4; i <= 4; i++) if (i) box(p, 1.6, 3, .1, i * 3.3, 6.2, 7.95, '#2a3640');
      S.push([-15, -12, 15, 8, 0]);
    }); void r; }
  else if (s.k === 'palace') setPiece(s, (p, S) => {
      for (const [w, d, x, z] of [[60, .6, 0, -26], [.6, 52, -30, 0], [.6, 52, 30, 0], [24, .6, -18, 26], [24, .6, 18, 26]]){ box(p, w, 3.2, d, x, 1.6, z, '#efe9dd'); S.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2, 0]); }
      for (const sx of [-1, 1]) box(p, 1.2, 4.2, 1.2, sx * 6, 2.1, 26, '#d8c39d');
      box(p, 34, 9, 18, 0, 4.65, -12, '#f7f3ea'); box(p, 20, 6, 12, 0, 12, -12, '#f7f3ea'); box(p, 36, .6, 20, 0, 9.3, -12, '#d8d0bf');
      { const dm = new THREE.SphereGeometry(4.2, 18, 10, 0, 6.29, 0, 1.6); dm.translate(0, 15, -12); p.push(colored(dm, '#c9a227')); }
      for (let i = -5; i <= 5; i++) cyl(p, .4, .45, 8, i * 3, 4.15, -2.6, '#f2ede2', 0, 10);
      box(p, 14, .4, 8, 0, .35, 10, '#3fb7d8'); for (let i = 0; i < 10; i++) cyl(p, .25, .3, 6, R(-26, 26), 3, R(4, 22), '#7a5a3a');
      S.push([-17, -21, 17, -3, 0]);
    });
  else if (s.k === 'gas') setPiece(s, (p, S) => {
      box(p, 18, .5, 10, 0, 5.4, 6, '#e8e8e8'); box(p, 18.2, .9, 10.2, 0, 5.9, 6, '#c62828');
      for (const sx of [-6, 0, 6]){ cyl(p, .25, .25, 5, sx, 2.7, 6, '#cfcfcf'); box(p, 1, 1.8, .8, sx + 1.4, 1.05, 6, '#f2f2f2'); box(p, 1.05, .5, .85, sx + 1.4, 1.75, 6, '#c62828'); S.push([sx + .8, 5.5, sx + 2, 6.5, 0]); }
      box(p, 10, 4, 7, 0, 2.15, -6, '#f2f2f2'); box(p, 10.2, .8, 7.2, 0, 4.4, -6, '#c62828'); box(p, 6, 2.4, .1, 0, 1.6, -2.45, '#24323a');
      box(p, .5, 9, .5, 10, 4.5, 11, '#888'); box(p, 3, 3, .4, 10, 9, 11, '#c62828');
      S.push([-5, -9.5, 5, -2.5, 0]);
    });
  else if (s.k === 'junk') setPiece(s, (p, S) => {
      for (const [w, d, x, z] of [[54, .2, 0, -24], [.2, 48, -27, 0], [.2, 48, 27, 0], [20, .2, -17, 24], [20, .2, 17, 24]]){ box(p, w, 2.8, d, x, 1.4, z, '#7a6f5f'); S.push([x - w / 2 - .1, z - d / 2 - .1, x + w / 2 + .1, z + d / 2 + .1, 0]); }
      for (let i = 0; i < 26; i++){ const x = R(-22, 22), z = R(-20, 18); if (Math.abs(x) < 5 && z > 8) continue; const h = R(.8, 1.6); box(p, R(3.5, 4.5), h, R(1.6, 2), x, h / 2 + R(0, 1.4) * (i % 3 === 0 ? 1 : 0), z, pick(['#6d4c41', '#8a3a2a', '#4a5a6a', '#7a7a6a', '#5a4a3a']), R(0, 3)); S.push([x - 2, z - 1, x + 2, z + 1, 2.6]); }
      box(p, .8, 14, .8, -18, 7, -14, '#d4a017'); box(p, 16, .8, .8, -11, 14, -14, '#d4a017'); cyl(p, .05, .05, 6, -4, 11, -14, '#222');
      box(p, 6, 3, 4, 18, 1.5, -16, '#9a8f7f'); S.push([15, -18, 21, -14, 0]);
    });
  else if (s.k === 'power') setPiece(s, (p, S) => {
      for (const [w, d, x, z] of [[62, .2, 0, -30], [.2, 60, -31, 0], [.2, 60, 31, 0], [26, .2, -18, 30], [26, .2, 18, 30]]){ box(p, w, 3, d, x, 1.5, z, '#9aa0a6'); S.push([x - w / 2 - .1, z - d / 2 - .1, x + w / 2 + .1, z + d / 2 + .1, 0]); }
      box(p, 30, 14, 16, -8, 7, -16, '#b8b2a6'); for (const cx of [-16, -8]) cyl(p, 1.6, 2, 34, cx, 17, -22, '#c9c3b6', 0, 14);
      for (let i = 0; i < 6; i++){ box(p, 4, 4, 3, 14, 2, -18 + i * 6, '#6f7a85'); for (const sx of [-1, 1]) cyl(p, .18, .18, 3, 14 + sx * 1.2, 5.5, -18 + i * 6, '#d8d0c0'); S.push([12, -19.5 + i * 6, 16, -16.5 + i * 6, 0]); }
      for (const z of [-24, 0, 22]) { box(p, .6, 18, .6, 24, 9, z, '#6b7178'); box(p, 7, .4, .4, 24, 17, z, '#6b7178'); }
      S.push([-23, -24, 7, -8, 0]);
    });
}
// signs at the fronts
if (SETS.bank){ const a = SETS.bank.at(0, 11); glowSigns.push(signBoard(bigSign('بنك الثغر', '#0d2e4f', '#e9c46a', 768, 140, 66), a.x, 8.4, a.z, 6, 1.1, SETS.bank.yaw, .3)); }
if (SETS.palace){ const a = SETS.palace.at(0, 26.8); glowSigns.push(signBoard(bigSign('قصر الشاطر', '#f7f3ea', '#8a6a1a', 640, 120, 58), a.x, 2.4, a.z, 3, .58, SETS.palace.yaw, .2)); }
if (SETS.gas){ const a = SETS.gas.at(10, 11.3); glowSigns.push(signBoard(bigSign('بنزينة', '#c62828', '#ffffff', 512, 160, 80), a.x, 5.6, a.z, 2, .64, SETS.gas.yaw, .5)); }
if (SETS.junk){ const a = SETS.junk.at(0, 24.4); glowSigns.push(signBoard(bigSign('الخردة', '#3a3226', '#f2c14e', 512, 120, 64), a.x, 2.2, a.z, 2.4, .56, SETS.junk.yaw, .2)); }
if (SETS.power){ const a = SETS.power.at(0, 30.4); glowSigns.push(signBoard(bigSign('محطة الكهربا', '#20262c', '#ffb74d', 640, 120, 58), a.x, 2.3, a.z, 3, .58, SETS.power.yaw, .2)); }

// ---------- the Bahary tram wears the real yellow Alexandria tram (two cars) when the model is there ----------
(async () => {
  try {
    const { GLTFLoader } = await import('three/addons/GLTFLoader.js'); const g = await new GLTFLoader().loadAsync('assets/landmarks/tram.glb'); LM.tramGLB = g.scene;
    const old = tram.mesh.children[0]; if (!old || !old.isMesh) return; old.visible = false;
    for (const off of [5.2, -5.4]){ const c = g.scene.clone(true); c.scale.set(.95, .95, .72); c.rotation.y = Math.PI / 2; c.position.set(off, 0, 0); c.traverse(o => { if (o.isMesh) o.castShadow = !LOW; }); tram.mesh.add(c); }
  } catch (e){ /* keep the drawn tram */ }
})();
