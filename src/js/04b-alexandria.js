// ================= Alexandria: the fort, the bridge towers, the breakwater, the tram line, the villa, the story houses =================
// (the sea, the fish market and the pastel facades are in 03-textures / 04-world-layout)

// stone: one texture of sandstone blocks, mapped by world position so big and small pieces share the same block size
const stoneTex = makeTex(256, 256, (g, w, h) => {
  g.fillStyle = '#d6bd8c'; g.fillRect(0, 0, w, h); grain(g, w, h, 16000, .16);
  g.strokeStyle = 'rgba(110,84,50,.45)'; g.lineWidth = 2;
  for (let y = 0; y <= h; y += 32){ g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = ((y / 32) % 2) * 32; x < w; x += 64){ g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } }
  for (let i = 0; i < 40; i++){ g.fillStyle = `rgba(${Math.random() < .5 ? '90,70,40' : '255,245,220'},${Math.random() * .12})`; g.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 40, 10 + Math.random() * 25); }
});
const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: .92, envMapIntensity: .35 });
// merge pieces and give every vertex texture coordinates from its world position (4 m per texture repeat)
function stoneMesh(geos, cast = true){
  const g = mergeGeometries(geos.map(x => x.index ? x.toNonIndexed() : x)); const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++){ const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay > .6){ uv[i*2] = x / 4; uv[i*2+1] = z / 4; } else if (ax > az){ uv[i*2] = z / 4; uv[i*2+1] = y / 4; } else { uv[i*2] = x / 4; uv[i*2+1] = y / 4; } }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const m = new THREE.Mesh(g, stoneMat); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m;
}
const bx = (w, h, d, x, y, z, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
const cy = (r, h, x, y, z, seg = 16, r2) => new THREE.CylinderGeometry(r, r2 ?? r, h, seg).translate(x, y, z);
// battlements along a wall from (x0,z0) to (x1,z1) at height y
function merlons(list, x0, z0, x1, z1, y, t = 1.2){ const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / 1.6), ry = Math.atan2(x1 - x0, z1 - z0); for (let i = 0; i <= n; i++){ const k = i / n; list.push(bx(t, .9, .8, x0 + (x1 - x0) * k, y + .45, z0 + (z1 - z0) * k, ry)); } }

// ---- the fort (like Qaitbay): a spit of land at the end of the bridge, a curtain wall with round towers, the keep with its minaret ----
const FORT = { cx: 96, gateZ: 266, x0: 62, x1: 130, z0: 266, z1: 306, keep: { x: 96, z: 291, s: 20, h: 13 } };
{
  const lt = stoneTex.clone(); lt.repeat.set((FAR.x1 - FAR.x0) / 4, (FAR.z1 - FAR.z0) / 4); lt.needsUpdate = true;
  const land = new THREE.Mesh(new THREE.BoxGeometry(FAR.x1 - FAR.x0, .15, FAR.z1 - FAR.z0), new THREE.MeshStandardMaterial({ map: lt, roughness: .95, color: 0xcab89a }));
  land.position.set((FAR.x0 + FAR.x1) / 2, .075, (FAR.z0 + FAR.z1) / 2); land.receiveShadow = true; scene.add(land);
  // rocks round the edge
  const rk = []; for (let i = 0; i < 70; i++){ const side = i % 4, t = rng(); const x = side < 2 ? FAR.x0 + t * (FAR.x1 - FAR.x0) : side === 2 ? FAR.x0 - 1 : FAR.x1 + 1, z = side === 0 ? FAR.z0 - 1 : side === 1 ? FAR.z1 + 1 : FAR.z0 + t * (FAR.z1 - FAR.z0); if (side === 0 && Math.abs(x - BRIDGE.x) < BRIDGE.w) continue; const g = new THREE.DodecahedronGeometry(R(1, 2.2), 0); g.translate(x + R(-1, 1), -.7, z + R(-1, 1)); rk.push(colored(g, pick(['#8a8478', '#6f6a60', '#9c9284']))); }
  const rocks = new THREE.Mesh(mergeGeometries(rk), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); rocks.receiveShadow = true; scene.add(rocks);
  const W = 1.6, H = 6.5, wall = [], top = [];
  const { x0, x1, z0, z1 } = FORT, gx0 = FORT.cx - 4, gx1 = FORT.cx + 4;
  const seg = (ax, az, bx2, bz) => { const L = Math.hypot(bx2 - ax, bz - az), ry = Math.atan2(bx2 - ax, bz - az); wall.push(bx(W, H, L, (ax + bx2) / 2, H / 2, (az + bz) / 2, ry)); merlons(top, ax, az, bx2, bz, H); obstacles.push({ minX: Math.min(ax, bx2) - W / 2, maxX: Math.max(ax, bx2) + W / 2, minZ: Math.min(az, bz) - W / 2, maxZ: Math.max(az, bz) + W / 2 }); };
  seg(x0, z0, gx0, z0); seg(gx1, z0, x1, z0); seg(x1, z0, x1, z1); seg(x1, z1, x0, z1); seg(x0, z1, x0, z0);
  for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]){ wall.push(cy(3.2, H + 2, x, (H + 2) / 2, z, 20)); for (let a = 0; a < 12; a++){ const an = a / 12 * Math.PI * 2; top.push(bx(1, .9, .7, x + Math.sin(an) * 3, H + 2.45, z + Math.cos(an) * 3, an)); } obstacles.push({ minX: x - 3.2, maxX: x + 3.2, minZ: z - 3.2, maxZ: z + 3.2 }); }
  // the gate: two bastions and an arch over the way in
  for (const s of [-1, 1]){ wall.push(bx(3.4, H + 2.5, 4, FORT.cx + s * 5.6, (H + 2.5) / 2, z0, 0)); obstacles.push({ minX: FORT.cx + s * 5.6 - 1.7, maxX: FORT.cx + s * 5.6 + 1.7, minZ: z0 - 2, maxZ: z0 + 2 }); merlons(top, FORT.cx + s * 4, z0 - 2, FORT.cx + s * 7.2, z0 - 2, H + 2.5, 1); }
  wall.push(bx(8, 2.4, 4, FORT.cx, H + 1.3, z0)); merlons(top, gx0, z0 - 2, gx1, z0 - 2, H + 2.5, 1);
  // the keep: four round turrets, battlements, a dark arched door, and a small minaret on the roof
  const K = FORT.keep, hs = K.s / 2;
  wall.push(bx(K.s, K.h, K.s, K.x, K.h / 2, K.z)); merlons(top, K.x - hs, K.z - hs, K.x + hs, K.z - hs, K.h); merlons(top, K.x + hs, K.z - hs, K.x + hs, K.z + hs, K.h); merlons(top, K.x + hs, K.z + hs, K.x - hs, K.z + hs, K.h); merlons(top, K.x - hs, K.z + hs, K.x - hs, K.z - hs, K.h);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]){ wall.push(cy(2.6, K.h + 2.5, K.x + sx * hs, (K.h + 2.5) / 2, K.z + sz * hs, 18)); wall.push(cy(2.9, .5, K.x + sx * hs, K.h + 2.75, K.z + sz * hs, 18)); }
  obstacles.push({ minX: K.x - hs - 2, maxX: K.x + hs + 2, minZ: K.z - hs - 2, maxZ: K.z + hs + 2, building: true });
  wall.push(cy(1.5, 5, K.x + 4, K.h + 2.5, K.z + 3, 12)); wall.push(cy(2, .5, K.x + 4, K.h + 5.2, K.z + 3, 12)); wall.push(cy(1.1, 2.6, K.x + 4, K.h + 6.6, K.z + 3, 12));
  stoneMesh(wall); stoneMesh(top, false);
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 1 });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(3, 4.6), dark); door.position.set(K.x, 2.4, K.z - hs - .02); door.rotation.y = Math.PI; scene.add(door);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: .8 })); dome.position.set(K.x + 4, K.h + 7.9, K.z + 3); scene.add(dome);
  // small windows on the keep (slits)
  const sl = []; for (const f of [-1, 1]) for (let i = -2; i <= 2; i++) for (const y of [6, 10]){ sl.push(bx(.5, 1.6, .1, K.x + i * 3.5, y, K.z + f * (hs + .03))); sl.push(bx(.1, 1.6, .5, K.x + f * (hs + .03), y, K.z + i * 3.5)); }
  scene.add(new THREE.Mesh(mergeGeometries(sl), dark));
  glowSigns.push(signBoard(bigSign('🏰 القلعة', '#3a2a14', '#f4d35e', 512, 130, 70), FORT.cx, H + 3.4, z0 - 2.1, 4.2, 1.06, Math.PI, .25));
}

// ---- Stanley-style towers at both ends of the bridge: square pavilions with arches and a little dome ----
{
  const tw = [], domes = [];
  for (const z of [NILE_Z + 1.5, BRIDGE.z1 - 1.5]) for (const s of [-1, 1]){
    const x = BRIDGE.x + s * (BRIDGE.w / 2 + 1.8);
    tw.push(bx(3.2, 7, 3.2, x, 3.5, z)); tw.push(bx(3.8, .5, 3.8, x, 7.2, z)); tw.push(bx(2.6, 1.6, 2.6, x, 8.2, z));
    for (let a = 0; a < 4; a++){ const an = a * Math.PI / 2; tw.push(bx(.9, .9, .4, x + Math.sin(an) * 1.6, 5.4, z + Math.cos(an) * 1.6, an)); }
    domes.push([x, z]);
    obstacles.push({ minX: x - 1.6, maxX: x + 1.6, minZ: z - 1.6, maxZ: z + 1.6 });
  }
  stoneMesh(tw);
  const dm = new THREE.MeshStandardMaterial({ color: 0x3f7f8c, roughness: .5, metalness: .3 });
  for (const [x, z] of domes){ const d = new THREE.Mesh(new THREE.SphereGeometry(1.25, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), dm); d.position.set(x, 9, z); d.castShadow = true; scene.add(d); }
}

// ---- the breakwater: concrete tetrapods piled along the corniche wall (weak phones: fewer) ----
{
  const parts = []; for (const [x, y, z] of [[0, 1, 0], [.94, -.33, 0], [-.47, -.33, .82], [-.47, -.33, -.82]]){ const g = new THREE.CylinderGeometry(.18, .42, 1.3, 7); g.translate(0, .65, 0); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, y, z).normalize()); g.applyQuaternion(q); parts.push(g); }
  const tetra = mergeGeometries(parts); tetra.computeVertexNormals();
  const list = [], step = GFX === 'low' ? 2.6 : 1.7;
  for (let x = X0 - 8; x <= XMAX + 8; x += step){ if (Math.abs(x - BRIDGE.x) < BRIDGE.w / 2 + 3) continue; for (let r = 0; r < 2; r++) list.push({ x: x + R(-.5, .5) + r * step / 2, y: -1.25 + r * .35, z: NILE_Z + 1.6 + r * 1.3 + R(-.3, .3), rx: R(0, 3), ry: R(0, 6), s: R(.9, 1.15) }); }
  const im = instanced(tetra, new THREE.MeshStandardMaterial({ color: 0xbdb7ab, roughness: .95 }), list, false, t => ({ ...t, sx: t.s, sy: t.s, sz: t.s }));
  if (im) im.receiveShadow = true;
}

// ---- the tram line along the market road (z = -48): rails in the middle of the road, poles and wires, three stops ----
const TRAM = { z: ROADS_Z[1], x0: X0 - 24, x1: XMAX + 24, stations: [-60, 72, 216] };
{
  const p = [];
  for (const s of [-1, 1]) box(p, TRAM.x1 - TRAM.x0, .06, .12, (TRAM.x0 + TRAM.x1) / 2, .04, TRAM.z + s * .72, '#9aa0a6');
  box(p, TRAM.x1 - TRAM.x0, .02, 2.6, (TRAM.x0 + TRAM.x1) / 2, .012, TRAM.z, '#3a3835');
  for (let x = TRAM.x0; x <= TRAM.x1; x += 24){ if (ROADS_X.some(r => Math.abs(r - x) < 7)) continue; for (const s of [-1, 1]) box(p, .2, 6.6, .2, x, 3.3, TRAM.z + s * 6.7, '#2b2f33'); box(p, .08, .08, 13.4, x, 6.2, TRAM.z, '#2b2f33'); }
  box(p, TRAM.x1 - TRAM.x0, .04, .04, (TRAM.x0 + TRAM.x1) / 2, 5.7, TRAM.z, '#1d1f22');
  for (const x of TRAM.stations){
    // a shelter on the north pavement with a bench and the stop's sign
    const sz = TRAM.z - 7.6;
    box(p, 5, .12, 2, x, 2.7, sz, '#e0a21a'); for (const dx of [-2.3, 2.3]) box(p, .12, 2.6, .12, x + dx, 1.4, sz - .8, '#2b2f33'); box(p, 4.6, 1.8, .06, x, 1.5, sz - .9, '#cfe0ea');
    box(p, 3, .1, .5, x, .6, sz - .4, '#8a5a32'); for (const dx of [-1.2, 1.2]) box(p, .1, .45, .45, x + dx, .38, sz - .4, '#2b2f33');
    obstacles.push({ minX: x - 2.5, maxX: x + 2.5, minZ: sz - 1, maxZ: sz - .7 });
    glowSigns.push(signBoard(bigSign('🚋 محطة الترام', '#e0a21a', '#2a1700', 512, 120, 60), x, 3.05, sz + .02, 3.6, .84, Math.PI, .3));
  }
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: .3 })); m.receiveShadow = true; m.castShadow = true; scene.add(m);
}

// ---- العربي's family villa: white walls round a garden, a pool, palms, a gate; the house itself modern and white ----
const VILLA = { cx: X0 + PITCH / 2 + 7 * PITCH, cz: Z0 + PITCH / 2 };
{
  const { cx, cz } = VILLA, p = [], wallC = '#f2efe8', gateZ = cz + 16.5;
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(BW - 3, .05, BW - 3), new THREE.MeshStandardMaterial({ map: parkTex, roughness: 1 })); lawn.position.set(cx, .18, cz); lawn.receiveShadow = true; scene.add(lawn);
  for (const [w, d, x, z] of [[BW - 2, .4, 0, -(BW / 2 - 1)], [.4, BW - 2, -(BW / 2 - 1), 0], [.4, BW - 2, BW / 2 - 1, 0], [(BW - 2) / 2 - 3, .4, -((BW - 2) / 4 + 1.5), BW / 2 - 1], [(BW - 2) / 2 - 3, .4, (BW - 2) / 4 + 1.5, BW / 2 - 1]]){
    box(p, w, 2.4, d, cx + x, 1.35, cz + z, wallC); obstacles.push({ minX: cx + x - w / 2, maxX: cx + x + w / 2, minZ: cz + z - d / 2, maxZ: cz + z + d / 2 });
  }
  for (const s of [-1, 1]) box(p, .7, 3.2, .7, cx + s * 3.2, 1.75, gateZ, '#d8c39d');
  for (let i = -5; i <= 5; i++) box(p, .06, 2.2, .06, cx + i * .55, 1.25, gateZ, '#1d1f22');
  box(p, 6, .1, .1, cx, 2.35, gateZ, '#c9a227');
  // the house: two white boxes, big dark windows, a flat roof terrace
  box(p, 18, 4, 11, cx, 2.15, cz - 6, '#f7f5f0'); box(p, 12, 3.6, 9, cx - 2, 5.95, cz - 7, '#f7f5f0'); box(p, 19, .25, 12, cx, 4.2, cz - 6, '#d8d4cc');
  for (let i = -3; i <= 3; i++) box(p, 1.8, 2.4, .06, cx + i * 2.4, 1.9, cz - .45, '#22313a');
  for (let i = -2; i <= 2; i++) box(p, 1.6, 2.2, .06, cx - 2 + i * 2.2, 5.9, cz - 2.47, '#22313a');
  box(p, 3, 2.6, .08, cx + 6.5, 1.45, cz - .4, '#5a3a1e');
  obstacles.push({ minX: cx - 9, maxX: cx + 9, minZ: cz - 11.5, maxZ: cz - .5, building: true });
  // the pool
  box(p, 9, .3, 4.6, cx - 5, .2, cz + 6, '#e8e4da');
  const pool = new THREE.Mesh(new THREE.BoxGeometry(8, .1, 3.6), new THREE.MeshStandardMaterial({ color: 0x3fb7d8, roughness: .1, metalness: .2, emissive: 0x0a3a4a, emissiveIntensity: .4 })); pool.position.set(cx - 5, .33, cz + 6); scene.add(pool);
  obstacles.push({ minX: cx - 9.5, maxX: cx - .5, minZ: cz + 3.7, maxZ: cz + 8.3 });
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .55 })); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  buildings.push({ grp: m, mats: [m.material], box: new THREE.Box3().setFromObject(m), opacity: 1 });
  glowSigns.push(signBoard(bigSign('فيلا الحاج العربي', '#f7f5f0', '#8a6a1a', 640, 120, 58), cx, 2.9, gateZ + .3, 4.2, .8, 0, .2));
  VILLA.gate = new THREE.Vector3(cx, .15, gateZ + 1.2);
}

// ---- the story houses get their names on the door: طيارة's (already there), شادية's next door, إسلام's family ----
const STORY_HOUSES = {
  shadia: { name: 'بيت شادية', door: new THREE.Vector3(-35, .15, 86.4) },
  islam: { name: 'بيت إسلام', door: new THREE.Vector3(-72, .15, 22.4) },
};
for (const h of Object.values(STORY_HOUSES)){
  const d = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.3), new THREE.MeshStandardMaterial({ map: doorTex, roughness: .8, color: 0xb8a48c })); d.position.set(h.door.x, 1.3, h.door.z - .3); scene.add(d);
  glowSigns.push(signBoard(bigSign(h.name, '#f3ecd8', '#5a2a14', 512, 120, 64), h.door.x, 2.85, h.door.z - .28, 2.2, .52, 0, .15));
}

// ---- the harbour (الميناء) at the east end of the corniche: a warehouse you can walk into, containers, a pier with launches ----
const PORT = { cx: X0 + PITCH / 2 + 7 * PITCH, cz: Z0 + PITCH / 2 + 4 * PITCH };
{
  const { cx, cz } = PORT, p = [], wx0 = cx - 15, wx1 = cx + 13, wz0 = cz - 15, wz1 = cz + 1, H = 8;
  PORT.shed = { x0: wx0, x1: wx1, z0: wz0, z1: wz1 }; PORT.door = new THREE.Vector3(cx - 1, .15, wz1 + 1.5); PORT.inside = new THREE.Vector3(cx - 1, .15, cz - 8);
  const wall = (w, d, x, z) => { box(p, w, H, d, x, H / 2, z, '#7d8a96'); obstacles.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); };
  wall(wx1 - wx0, .4, (wx0 + wx1) / 2, wz0); wall(.4, wz1 - wz0, wx0, (wz0 + wz1) / 2); wall(.4, wz1 - wz0, wx1, (wz0 + wz1) / 2);
  wall(cx - 5 - wx0, .4, (wx0 + cx - 5) / 2, wz1); wall(wx1 - (cx + 3), .4, (cx + 3 + wx1) / 2, wz1);
  box(p, 8, H - 5.5, .4, cx - 1, H - (H - 5.5) / 2, wz1, '#7d8a96');
  for (let x = wx0; x <= wx1; x += 1.2) box(p, .1, H, .5, x, H / 2, wz1 + .05, '#6b7783');
  box(p, wx1 - wx0 + 1, .3, wz1 - wz0 + 1, (wx0 + wx1) / 2, H + .15, (wz0 + wz1) / 2, '#5f6b77');
  // crates inside
  for (let i = 0; i < 9; i++){ const x = wx0 + 3 + (i % 3) * 3.2, z = wz0 + 3 + Math.floor(i / 3) * 3.4; box(p, 1.8, 1.2 + (i % 2) * .6, 1.8, x, .75 + (i % 2) * .3, z, '#8a6a3a'); obstacles.push({ minX: x - .9, maxX: x + .9, minZ: z - .9, maxZ: z + .9 }); }
  // containers along the quay
  for (let i = 0; i < 5; i++){ const x = cx - 14 + i * 6.3, c = pick(['#c0392b', '#1f5fa8', '#2e7d32', '#e0a21a', '#6d4c41']); box(p, 6, 2.6, 2.5, x, 1.45, cz + 11, c); if (i % 2) box(p, 6, 2.6, 2.5, x, 4.05, cz + 11, pick(['#1f5fa8', '#c0392b'])); obstacles.push({ minX: x - 3, maxX: x + 3, minZ: cz + 9.75, maxZ: cz + 12.25 }); }
  // the pier and its posts
  box(p, PIER.x1 - PIER.x0, .3, PIER.z1 - PIER.z0, (PIER.x0 + PIER.x1) / 2, 0, (PIER.z0 + PIER.z1) / 2, '#8a6a4a');
  for (let z = PIER.z0 + 2; z < PIER.z1; z += 4) for (const x of [PIER.x0, PIER.x1]) box(p, .35, 2.2, .35, x, -.6, z, '#5a4030');
  for (const s2 of [-1, 1]) obstacles.push({ minX: (s2 < 0 ? PIER.x0 - .3 : PIER.x1 - .2), maxX: (s2 < 0 ? PIER.x0 + .2 : PIER.x1 + .3), minZ: NILE_Z + 1, maxZ: PIER.z1 });
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, metalness: .25 })); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  glowSigns.push(signBoard(bigSign('⚓ مخازن الميناء', '#20262c', '#ffb74d', 640, 120, 58), cx - 1, H - 1.2, wz1 + .25, 6, 1.1, 0, .3));
  const fl = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, .04, wz1 - wz0), new THREE.MeshStandardMaterial({ color: 0x5a5650, roughness: .9 })); fl.position.set((wx0 + wx1) / 2, .17, (wz0 + wz1) / 2); fl.receiveShadow = true; scene.add(fl);
}

// ---- الحاج العربي's car showroom (the story calls it «سموحة»): glass front, cars inside ----
const SHOWROOM = { cx: X0 + PITCH / 2 + 6 * PITCH, cz: Z0 + PITCH / 2 };
{
  const { cx, cz } = SHOWROOM, p = [];
  box(p, 28, 6.5, 14, cx, 3.4, cz - 4, '#f2f2f0'); box(p, 29, .5, 15, cx, 6.9, cz - 4, '#20262c');
  obstacles.push({ minX: cx - 14, maxX: cx + 14, minZ: cz - 11, maxZ: cz + 3, building: true });
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .4 })); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(26, 5), new THREE.MeshStandardMaterial({ color: 0x9fd0e0, emissive: 0x2a5a6a, emissiveIntensity: .5, roughness: .05, metalness: .5, transparent: true, opacity: .55 })); glass.position.set(cx, 2.9, cz + 3.05); scene.add(glass);
  SHOWROOM.mats = [m.material, glass.material];
  buildings.push({ grp: m, mats: [m.material], box: new THREE.Box3().setFromObject(m), opacity: 1 });
  glowSigns.push(signBoard(bigSign('معرض الحاج العربي للسيارات', '#20262c', '#f2c14e', 1024, 150, 66), cx, 6.1, cz + 3.1, 12, 1.75, 0, .4));
  SHOWROOM.front = new THREE.Vector3(cx, .15, cz + 8);
}
// burnt after chapter 6 (until the end of the story)
function showroomBurnt(on){ const [m, g] = SHOWROOM.mats; m.color.setScalar(on ? .25 : 1); g.opacity = on ? .15 : .55; g.emissiveIntensity = on ? 0 : .5; }
