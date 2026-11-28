// ================= real models from Sketchfab (CC BY, credits in assets/props/sf/CREDITS.md and on the credits page) =================
// The black-and-yellow Lada taxis, Ladas and Peugeot 504s, the red tuk-tuk, street cats, the vendor's stall, the foul cart,
// the corniche's iron lamps, palms, the rowing boats, and on the city's buildings their satellite dishes, water tanks and AC units.
// Every model is real size, standing on the ground at its middle, its front at glTF -Z.
const SFM = {};
await (async () => {
  const names = ['lada-taxi', 'lada-car', 'peugeot-504-break', 'old-car-saratoga', 'tuktuk', 'cat', 'vendor-stall', 'foul-cart', 'street-lamp', 'palm-trees', 'fishing-boat', 'satellite-dish', 'water-tanks', 'ac-unit', 'butane-cylinder', 'vespa',
    // stage 18 (assets/props/sf2): today's Egyptian cars, the HiAce microbus, a motorbike, a bicycle, the street trees
    'sf2/lanos', 'sf2/corolla', 'sf2/elantra', 'sf2/lada2107', 'sf2/sunny', 'sf2/microbus', 'sf2/motorcycle', 'sf2/bicycle', 'sf2/ficus-tree', 'sf2/mediterranean-tree', 'sf2/date-palm', 'sf2/hedge-bush'];
  try {
    const { GLTFLoader } = await import('three/addons/GLTFLoader.js'); const ld = new GLTFLoader();
    const got = await Promise.all(names.map(n => ld.loadAsync(`assets/props/${n.includes('/') ? n : 'sf/' + n}.glb`).catch(() => null)));
    got.forEach((g, i) => {
      if (!g) return; const n = names[i].split('/').pop(); g.scene.updateMatrixWorld(true);
      const parts = []; g.scene.traverse(o => { if (!o.isMesh) return; const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats){ m.side = THREE.FrontSide; if (m.map) m.map.anisotropy = 4; } parts.push({ name: o.name, geo, mat: o.material }); });
      SFM[n] = parts;
      // each piece on its own too (the two palms), stood at its own middle
      for (const p of parts){ const b = new THREE.Box3().setFromBufferAttribute(p.geo.attributes.position), c = b.getCenter(new THREE.Vector3()); const geo = p.geo.clone(); geo.translate(-c.x, -b.min.y, -c.z); SFM[n + ':' + p.name] = [{ name: p.name, geo, mat: p.mat }]; }
    });
  } catch (e){ console.warn('sketchfab props failed', e); }
})();
// many copies of one model: one InstancedMesh per piece. list: [x, y, z, yaw, scale]
function sfInst(name, list, shadow = !LOW){
  const parts = SFM[name]; if (!parts || !list.length) return null;
  const g = new THREE.Group(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), S = new THREE.Vector3();
  for (const p of parts){ const im = new THREE.InstancedMesh(p.geo, p.mat, list.length); im.castShadow = shadow; im.receiveShadow = true;
    list.forEach(([x, y, z, ry, s = 1], i) => { Q.setFromAxisAngle(Y, ry); M.compose(P.set(x, y, z), Q, S.set(s, s, s)); im.setMatrixAt(i, M); });
    im.computeBoundingSphere(); g.add(im); }
  return g;
}
// ---------- the street cars wear the real models ----------
// (the old shared car stays as the hidden fallback; the wheels become pivots the driving code spins and steers)
const SF_PAINT = ['#e8e4da', '#1f3a5f', '#7a1f1f', '#2f4f3a', '#c9b48a', '#5a5f66', '#8a6a3a', '#2a2a2a', '#9fb4c7'];
function sfSkin(g, model, tint){
  const parts = SFM[model]; if (!parts || !g || g.userData.sf) return false;
  for (const c of g.children) c.visible = false;
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = !LOW; m.receiveShadow = true; return m; };
  for (const p of parts){
    const geo = p.geo.clone(); geo.rotateY(Math.PI);   // the game's cars face +z
    let mat = p.mat; if (tint && /paint/.test(mat.name || '')){ mat = mat.clone(); mat.color.set(tint); }
    if (/^wheel/.test(p.name)){ const b = new THREE.Box3().setFromBufferAttribute(geo.attributes.position), c = b.getCenter(new THREE.Vector3()); geo.translate(-c.x, -c.y, -c.z);
      const pv = new THREE.Object3D(); pv.position.copy(c); pv.userData.wheelPivot = true; pv.userData.front = c.z > 0; pv.add(add(geo, mat)); g.add(pv); }
    else g.add(add(geo, mat));
  }
  g.userData.sf = model; return true;
}
function sfCarFor(kind){
  if (kind === 'taxi') return ['lada-taxi', null];
  if (kind === 'tuk') return ['tuktuk', null];
  if (kind === 'micro') return ['microbus', null];
  // what's on Alexandria's streets: lots of Lanos, Ladas and old Corollas, Sunnys, a newer Elantra, Peugeot 504s, now and then an old Chevrolet
  const r = Math.random();
  return r < .2 ? ['lanos', pick(SF_PAINT)] : r < .34 ? ['lada-car', pick(SF_PAINT)] : r < .46 ? ['lada2107', pick(SF_PAINT)] : r < .58 ? ['corolla', pick(SF_PAINT)] : r < .7 ? ['sunny', pick(SF_PAINT)]
    : r < .8 ? ['elantra', pick(SF_PAINT)] : r < .92 ? ['peugeot-504-break', pick(SF_PAINT)] : r < .96 ? ['old-car-saratoga', null] : [null, null];
}
for (const c of traffic){ const [m, t] = sfCarFor(c.userData.kind); if (m) sfSkin(c, m, t); }
for (const v of vehicles){
  if (v.cityParked && (v.type === 'car' || v.type === 'taxi')){ const [m, t] = sfCarFor(v.type); if (m) sfSkin(v.mesh, m, t); }
}
if (typeof taxiVeh !== 'undefined') sfSkin(taxiVeh.mesh, 'lada-taxi');
// ---------- the city's buildings: dishes and water tanks on the roofs, AC units on the walls ----------
SFM['roof-dish'] = (() => { const p = [];
  { const c = new THREE.ConeGeometry(.42, .16, 10, 1, true); c.rotateX(Math.PI); c.rotateX(-.9); c.translate(0, .62, 0); p.push(colored(c, '#e6e6e2')); }
  { const c = new THREE.CircleGeometry(.42, 10); c.rotateX(-Math.PI / 2); c.rotateX(-.9 + Math.PI); c.translate(0, .64, -.06); p.push(colored(c, '#cfcfc9')); }
  box(p, .05, .55, .05, 0, .28, .05, '#7a7a76'); box(p, .03, .03, .35, 0, .62, .18, '#7a7a76');
  return [{ name: 'dish', geo: mergeGeometries(p.map(x => x.index ? x.toNonIndexed() : x)), mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .3, side: THREE.DoubleSide }) }]; })();
const CROOF = [];   // the rooftop clutter of each chunk: only drawn within 170 m (it's small; far away nobody sees it)
function cityRoofProps(list, ox, oz, grp){
  if (!SFM['satellite-dish']) return;
  const dish = [], tank = [], ac = [], rnd = (a => () => (a = (a * 16807) % 2147483647) / 2147483647)(Math.abs((ox * 73856093) ^ (oz * 19349663)) % 2147483646 + 1);
  const keep = LOW ? .5 : 1;
  for (const b of list){
    const n = b.ring.length / 2; if (n < 4 || b.h < 6) continue;
    const pts = []; let cx = 0, cz = 0; for (let k = 0; k < n; k++){ const x = ox + b.ring[k * 2] / 10, z = oz + b.ring[k * 2 + 1] / 10; pts.push([x, z]); cx += x; cz += z; } cx /= n; cz /= n;
    let A = 0; for (let k = 0; k < n; k++){ const [x1, z1] = pts[k], [x2, z2] = pts[(k + 1) % n]; A += x1 * z2 - x2 * z1; } const sgn = A > 0 ? 1 : -1, top = .15 + b.h;
    if (Math.abs(A) / 2 < 40) continue;
    const inside = t => { const v = pts[Math.floor(rnd() * n)]; return [cx + (v[0] - cx) * t, cz + (v[1] - cz) * t]; };
    // the roof: satellite dishes (most buildings have a few), the black and white water tanks
    const nd = rnd() < .6 * keep ? 1 + Math.floor(rnd() * 2) : 0;
    for (let i = 0; i < nd; i++){ const [x, z] = inside(.35 + rnd() * .4); dish.push([x, top, z, rnd() * 6.28, 1]); }
    if (rnd() < .3 * keep){ const [x, z] = inside(rnd() * .3); tank.push([x, top, z, rnd() * 6.28, 1]); }
    // the walls: a split AC unit here and there under the windows
    if (!LOW || rnd() < .5) for (let k = 0; k < n; k++){
      const [x1, z1] = pts[k], [x2, z2] = pts[(k + 1) % n], L = Math.hypot(x2 - x1, z2 - z1); if (L < 5 || rnd() > .3) continue;
      const nx = sgn > 0 ? (z2 - z1) / L : -(z2 - z1) / L, nz = sgn > 0 ? -(x2 - x1) / L : (x2 - x1) / L, yaw = Math.atan2(-nx, -nz);
      const floors = Math.max(1, Math.floor((b.h - 4) / 3)), na = 1;
      for (let i = 0; i < na; i++){ const t = .15 + rnd() * .7, f = 1 + Math.floor(rnd() * floors), y = .15 + 4 + (f - 1) * 3 + .1; if (y > top - 1.2) continue;
        ac.push([x1 + (x2 - x1) * t + nx * .02, y, z1 + (z2 - z1) * t + nz * .02, yaw, 1]); }
    }
  }
  const props = new THREE.Group(); props.name = 'roofprops'; props.userData.c = [ox + CITY.chunk / 2, oz + CITY.chunk / 2]; grp.add(props); CROOF.push(props);
  for (const [nm, L] of [['roof-dish', dish], ['water-tanks:tank_white', tank.filter((_, i) => i % 2 === 0)], ['water-tanks:tank_black', tank.filter((_, i) => i % 2 === 1)], ['ac-unit', ac]]){ const g = sfInst(nm, L, false); if (g) props.add(g); }
}
{ const _cb = cityBuildings; cityBuildings = function(list, ox, oz, grp){ _cb(list, ox, oz, grp); grp.userData.blist = list; try { cityRoofProps(list, ox, oz, grp); } catch (e){} }; }

{ const _ucr = updateCity; let t0 = 0;
  updateCity = function(px, pz){ _ucr(px, pz); const now = performance.now(); if (now - t0 < 300) return; t0 = now;
    for (let i = CROOF.length - 1; i >= 0; i--){ const g = CROOF[i]; if (!g.parent || !g.parent.parent){ CROOF.splice(i, 1); continue; } const [cx, cz] = g.userData.c; g.visible = Math.hypot(cx - px, cz - pz) < (LOW ? 90 : GFX === 'high' ? 170 : 115); } }; }
