// ================= stage 18½: the corniche's sea side =================
// - Manshiya → Raml → Silsila: concrete tetrapods piled at the foot of the corniche wall, and men fishing from the wall
// - the breakwaters (OSM) as long rows of tetrapods out into the sea (they used to be filled in as land with houses on them)
// - the inland ponds (the Library's pool, park ponds) as water you can't walk on
const COAST = { tetra: null, mat: null, spots: [], fishers: [], fishT: 0 };
{
  const parts = []; for (const [x, y, z] of [[0, 1, 0], [.94, -.33, 0], [-.47, -.33, .82], [-.47, -.33, -.82]]){ const g = new THREE.CylinderGeometry(.18, .42, 1.3, 7); g.translate(0, .65, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, y, z).normalize())); parts.push(g.index ? g.toNonIndexed() : g); }
  COAST.tetra = mergeGeometries(parts); COAST.tetra.computeVertexNormals();
  COAST.mat = new THREE.MeshStandardMaterial({ color: 0xbdb7ab, roughness: .95 }); if (typeof PBR === 'function') try { PBR(COAST.mat, 'concrete', .8, .8, { tint: 0xd9d3c6, ns: .8 }); } catch (e){}
}
// the stretch of corniche with the blocks: from Manshiya (west) to Silsila (east)
const COAST_X = CITY ? (() => { const a = cityLL(31.2010, 29.8925)[0], b = cityLL(31.2125, 29.9065)[0]; return [Math.min(a, b), Math.max(a, b)]; })() : [0, 0];
function tetraMesh(list){
  if (!list.length) return null; const im = new THREE.InstancedMesh(COAST.tetra, COAST.mat, list.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), P = new THREE.Vector3();
  list.forEach(([x, y, z, s], i) => { E.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28); Q.setFromEuler(E); M.compose(P.set(x, y, z), Q, S.set(s, s, s)); im.setMatrixAt(i, M); });
  im.receiveShadow = true; im.castShadow = GFX === 'high'; im.computeBoundingSphere(); return im;
}
{ const _cb = cityBuildChunk; cityBuildChunk = function(key, d){
  const grp = _cb(key, d);
  try {
    const segs = d.sea, n = segs ? segs.length / 4 : 0, list = [], step = LOW ? 2.4 : 1.6;
    for (let k = 0; k < n; k++){
      const ax = d.ox + segs[k * 4] / 10, az = d.oz + segs[k * 4 + 1] / 10, bx = d.ox + segs[k * 4 + 2] / 10, bz = d.oz + segs[k * 4 + 3] / 10, L = Math.hypot(bx - ax, bz - az);
      const mx = (ax + bx) / 2, mz = (az + bz) / 2; if (L < .5 || mx < COAST_X[0] || mx > COAST_X[1]) continue;
      let nx = -(bz - az) / L, nz = (bx - ax) / L; if (cityR(mx + nx * 4, mz + nz * 4) !== 0){ nx = -nx; nz = -nz; } if (cityR(mx + nx * 4, mz + nz * 4) !== 0) continue;   // which side is the sea
      for (let s = 0; s < L; s += step) for (let r = 0; r < 2; r++){ const t = s + Math.random() * .4, x = ax + (bx - ax) * t / L + nx * (1.5 + r * 1.35), z = az + (bz - az) * t / L + nz * (1.5 + r * 1.35);
        list.push([x + (Math.random() - .5) * .5, -1.25 + r * .3 + Math.random() * .2, z + (Math.random() - .5) * .5, .9 + Math.random() * .25]); }
      // a place for a man with a rod, every ~45 m
      if (Math.random() < L / 45) COAST.spots.push({ x: mx - nx * .35, z: mz - nz * .35, yaw: Math.atan2(nx, nz), key });
    }
    const im = tetraMesh(list); if (im){ grp.add(im); }
  } catch (e){ console.warn('coast blocks', e); }
  return grp;
}; }
{ const _cd = cityDrop; cityDrop = function(c){ if (c.grp){ const key = c.grp.name.slice(5); COAST.spots = COAST.spots.filter(s => s.key !== key); } _cd(c); }; }

// the breakwaters out in the sea
(async () => {
  if (!CITY) return;
  let d = null; try { d = await fetch('assets/city/breakwaters.json').then(r => r.ok ? r.json() : null); } catch (e){}
  if (!d || !d.breakwaters) return;
  const list = [], step = LOW ? 2.2 : 1.5;
  for (const line of d.breakwaters) for (let k = 0; k + 1 < line.length; k++){
    const [ax, az] = line[k], [bx, bz] = line[k + 1], L = Math.hypot(bx - ax, bz - az); if (L < .1) continue; const nx = -(bz - az) / L, nz = (bx - ax) / L;
    for (let s = 0; s < L; s += step) for (let r = -1; r <= 1; r++){ const x = ax + (bx - ax) * s / L + nx * r * 1.3, z = az + (bz - az) * s / L + nz * r * 1.3; list.push([x + (Math.random() - .5) * .6, -1.1 + (r ? 0 : .55) + Math.random() * .25, z + (Math.random() - .5) * .6, .95 + Math.random() * .3]); }
  }
  // in pieces of 600, so the far ones are skipped by the camera
  for (let i = 0; i < list.length; i += 600){ const im = tetraMesh(list.slice(i, i + 600)); if (im) scene.add(im); }
})();

// the ponds
const POOLS = [];
(async () => {
  if (!CITY) return;
  let d = null; try { d = await fetch('assets/city/pools.json').then(r => r.ok ? r.json() : null); } catch (e){}
  if (!d || !d.length) return;
  const pos = [], idx = []; let base = 0;
  for (const p of d){ for (const [x, z] of p.v) pos.push(x, .05, z); for (const i of p.i) idx.push(base + i); base += p.v.length; POOLS.push(p); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  for (let k = 0; k < idx.length; k += 3){ const a = idx[k], b = idx[k + 1], c = idx[k + 2], cr = (pos[b * 3] - pos[a * 3]) * (pos[c * 3 + 2] - pos[a * 3 + 2]) - (pos[b * 3 + 2] - pos[a * 3 + 2]) * (pos[c * 3] - pos[a * 3]); if (cr > 0){ idx[k + 1] = c; idx[k + 2] = b; } }
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x2f5560, roughness: .08, metalness: .2, envMapIntensity: 1.1 })); m.receiveShadow = !LOW; scene.add(m);
})();
// ponds are not ground
{ const _cbk = cityBlocked; cityBlocked = function(x, z, pad = PR, feet){ if (_cbk(x, z, pad, feet)) return true; return !!CITY && !inPatch(x, z) && cityR(x, z) === 5; }; }

// the fishermen on the wall: up to 4 near you, sitting on the parapet facing the sea, a rod each
const ROD = (() => { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: .6 }); const r = new THREE.Mesh(new THREE.CylinderGeometry(.008, .018, 3.2, 5), m); r.position.set(0, 1.4, .9); r.rotation.x = .95; g.add(r);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(.002, .002, 3.4, 3), new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: .5 })); line.position.set(0, .35, 2.25); line.rotation.x = .08; g.add(line); return g; })();
function updateFishers(f){
  COAST.fishT -= 1 / 60; if (COAST.fishT > 0) return; COAST.fishT = 1;
  for (const F of COAST.fishers){ if (F.n.state === 'dead' || F.n.state === 'down' || F.n.fleeT > 0){ if (F.rod) { F.n.g.remove(F.rod); F.rod = null; } continue; }
    if (Math.hypot(F.s.x - f.x, F.s.z - f.z) > 110 || !COAST.spots.includes(F.s)){ F.n.state = 'hidden'; F.n.g.visible = false; F.s = null; } }
  for (let i = COAST.fishers.length - 1; i >= 0; i--) if (!COAST.fishers[i].s){ const F = COAST.fishers[i]; if (F.rod) F.n.g.remove(F.rod); F.n.role = null; COAST.fishers.splice(i, 1); FISH_IDLE.push(F.n); }
  if (COAST.fishers.length >= (LOW ? 2 : 4)) return;
  const used = new Set(COAST.fishers.map(F => F.s)), s = COAST.spots.filter(s => !used.has(s) && Math.hypot(s.x - f.x, s.z - f.z) < 90 && Math.hypot(s.x - f.x, s.z - f.z) > 25).sort((a, b) => Math.hypot(a.x - f.x, a.z - f.z) - Math.hypot(b.x - f.x, b.z - f.z))[0];
  if (!s) return;
  const n = FISH_IDLE.pop() || makeNPC(); n.role = 'fisher'; seatNPC(n, s.x, s.z, s.yaw); n.g.position.y = .35; n.name = rpick(['عم صابر', 'الريس حمدي', 'عم مرسي', 'أبو سمرة']);
  const rod = ROD.clone(); n.g.add(rod); COAST.fishers.push({ n, s, rod });
}
const FISH_IDLE = [];
{ const _ua2 = updateAround; updateAround = function(f){ _ua2(f); try { updateFishers(f); } catch (e){} }; }

// the corniche's low wall: plain grey stone; the asphalt a little lighter (it read as black from the sea road)
if (typeof CMAT !== 'undefined'){ CMAT.parapet.color.set(0xc4c3be); CMAT.road.color.setScalar(1.22); }

// far beaches are freed (they used to stay in memory, hidden, for the whole game)
if (CITY && typeof CBEACHES !== 'undefined'){ const _ucB = updateCity; let tF = 0; updateCity = function(px, pz){ _ucB(px, pz); const now = performance.now(); if (now - tF < 3000) return; tF = now;
  for (const B of CBEACHES) if (B.grp && Math.hypot(B.x - px, B.z - pz) > 900){ scene.remove(B.grp); B.grp.traverse(o => { if (o.geometry && !o.isInstancedMesh) o.geometry.dispose(); else if (o.isInstancedMesh) o.dispose(); }); B.grp = null; B.built = false; } }; }
