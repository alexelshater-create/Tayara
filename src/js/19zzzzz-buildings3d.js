// ================= stage 18: Alexandrian buildings in 3D — balconies that stand out, cornices, roof parapets, stair rooms on the roofs =================
// The facades' windows sit every 4 m along a wall (from where its outline starts) and every 3.2 m up from the top of the shop band
// (03c-city.js: u = run / 16, v = (y − band) / 12.8, four windows and four floors per tile), so the balconies line up with them.
const B3 = {
  // one balcony: the slab, the shadow strip under it, and its railing — iron bars or a solid concrete balustrade
  // the iron balcony: its slab (instanced, tinted) and its railing — three planes with the bars drawn in a cut-out texture
  iron: (() => { const p = []; box(p, 2.5, .16, 1.0, 0, 0, .5, '#ffffff'); return mergeGeometries(p.map(q => q.index ? q.toNonIndexed() : q)); })(),
  rail: (() => { const parts = [];
    { const g = new THREE.PlaneGeometry(2.5, .95); g.translate(0, .55, .98); parts.push(g); }
    for (const s of [-1, 1]){ const g = new THREE.PlaneGeometry(1.0, .95); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * .4); g.rotateY(Math.PI / 2); g.translate(s * 1.24, .55, .5); parts.push(g); }
    return mergeGeometries(parts); })(),
  railMat: new THREE.MeshStandardMaterial({ map: makeTex(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#1e1e1e'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 8, w, 8); for (let x = 4; x < w; x += 16) g.fillRect(x, 0, 4, h); g.strokeStyle = '#1e1e1e'; g.lineWidth = 3; for (let x = 0; x < w; x += 32){ g.beginPath(); g.arc(x + 16, h * .55, 9, 0, Math.PI * 2); g.stroke(); } }),
    transparent: false, alphaTest: .5, side: THREE.DoubleSide, roughness: .5, metalness: .5 }),
  solid: (() => { const p = []; box(p, 2.5, .16, 1.0, 0, 0, .5, '#ffffff');
    box(p, 2.5, .9, .12, 0, .52, .94, '#ffffff'); for (const s of [-1, 1]) box(p, .12, .9, .9, s * 1.19, .52, .45, '#f0f0f0');
    return mergeGeometries(p.map(q => q.index ? q.toNonIndexed() : q)); })(),
  mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, envMapIntensity: .3 }),
  near: [],
  OLD: new Set(['bahary', 'manshiya', 'attarin', 'karmouz', 'moharram', 'raml', 'labban']),
};
const b3hash = (a, b) => { let h = Math.imul(Math.round(a * 10) | 0, 73856093) ^ Math.imul(Math.round(b * 10) | 0, 19349663); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function cityBuildings3D(grp, ox, oz){
  const list = grp.userData.blist; if (!list) return;
  const iron = [], solid = [], ironTrim = [], solidTrim = [], trimCol = [], P = [], C = [], NP = [], NC = [], col = new THREE.Color();
  const quad = (a, b, c, d, cl) => { P.push(...a, ...b, ...c, ...a, ...c, ...d); for (let i = 0; i < 6; i++) C.push(cl.r, cl.g, cl.b); };
  const nquad = (a, b, c, d, cl) => { if (LOW) return; NP.push(...a, ...b, ...c, ...a, ...c, ...d); for (let i = 0; i < 6; i++) NC.push(cl.r, cl.g, cl.b); };
  const boxAt = (x, y, z, w, h, d, ry, cl) => { const g = new THREE.BoxGeometry(w, h, d); g.rotateY(ry); g.translate(x, y, z); const n = g.toNonIndexed(), p = n.attributes.position.array; for (let i = 0; i < p.length; i++) P.push(p[i]); for (let i = 0; i < p.length / 3; i++) C.push(cl.r, cl.g, cl.b); };
  for (const b of list){
    const n = b.ring.length / 2; if (n < 3 || b.h < 5) continue;
    const pts = []; for (let k = 0; k < n; k++) pts.push([ox + b.ring[k * 2] / 10, oz + b.ring[k * 2 + 1] / 10]);
    let A = 0, cx = 0, cz = 0; for (let k = 0; k < n; k++){ const [x1, z1] = pts[k], [x2, z2] = pts[(k + 1) % n]; A += x1 * z2 - x2 * z1; cx += x1; cz += z1; } cx /= n; cz /= n;
    const sgn = A > 0 ? 1 : -1, top = .15 + b.h, dk = DKEY_LIST[b.dist], pool = DSTYLE[dk] || [0, 1, 2, 3, 4], st = b.style >= 6 ? (b.style === 6 ? 3 : 4) : pool[b.style % pool.length], S = FSTY[st] || FSTY[0];
    const trim = new THREE.Color(S.trim), wall = new THREE.Color(S.wall), old = B3.OLD.has(dk), hb = b3hash(cx, cz);
    const ironStyle = hb < (old ? .7 : .45), stackP = old ? .55 : .3, base = .15 + BAND;
    const floors = Math.floor((top - base - 1.2) / 3.2);
    // the roof: a parapet round the edge (with a cornice under it) and, on bigger roofs, the stair room
    let run = 0;
    for (let k = 0; k < n; k++){
      const [x1, z1] = pts[k], [x2, z2] = pts[(k + 1) % n], L = Math.hypot(x2 - x1, z2 - z1); if (L < .05) continue;
      const nx = sgn > 0 ? (z2 - z1) / L : -(z2 - z1) / L, nz = sgn > 0 ? -(x2 - x1) / L : (x2 - x1) / L;
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, street = [3, 5, 7].some(d => cityR(mx + nx * d, mz + nz * d) === 1) || [3, 5].some(d => { const v = cityR(mx + nx * d, mz + nz * d); return v === 0 || v === 4; });
      // parapet (outer face and top) and, near you, the cornice under it
      const o = .02, ph = old ? 1.0 : .8;
      quad([x1 + nx * o, top, z1 + nz * o], [x2 + nx * o, top, z2 + nz * o], [x2 + nx * o, top + ph, z2 + nz * o], [x1 + nx * o, top + ph, z1 + nz * o], col.copy(wall).multiplyScalar(.96));
      quad([x1 + nx * o, top + ph, z1 + nz * o], [x2 + nx * o, top + ph, z2 + nz * o], [x2 - nx * .2, top + ph, z2 - nz * .2], [x1 - nx * .2, top + ph, z1 - nz * .2], col.copy(trim).multiplyScalar(.95));
      if (old || hb > .5){ const cd = .28, ch = .32;   // the cornice: a moulded ledge under the roof line
        nquad([x1 + nx * cd, top - ch, z1 + nz * cd], [x2 + nx * cd, top - ch, z2 + nz * cd], [x2 + nx * cd, top, z2 + nz * cd], [x1 + nx * cd, top, z1 + nz * cd], trim);
        nquad([x1 + nx * o, top - ch, z1 + nz * o], [x2 + nx * o, top - ch, z2 + nz * o], [x2 + nx * cd, top - ch, z2 + nz * cd], [x1 + nx * cd, top - ch, z1 + nz * cd], col.copy(trim).multiplyScalar(.55));
        nquad([x1 + nx * cd, top, z1 + nz * cd], [x2 + nx * cd, top, z2 + nz * cd], [x2 + nx * o, top, z2 + nz * o], [x1 + nx * o, top, z1 + nz * o], trim); }
      // floor ledges on the old buildings, at every floor line
      if (old && street && floors > 0) for (let f = 1; f <= Math.min(floors, 7); f++){ const y = base + 3.2 * f - .05, d = .12;
        nquad([x1 + nx * d, y - .12, z1 + nz * d], [x2 + nx * d, y - .12, z2 + nz * d], [x2 + nx * d, y, z2 + nz * d], [x1 + nx * d, y, z1 + nz * d], trim);
        nquad([x1 + nx * d, y, z1 + nz * d], [x2 + nx * d, y, z2 + nz * d], [x2 + nx * o, y, z2 + nz * o], [x1 + nx * o, y, z1 + nz * o], trim); }
      // balconies over the windows that look onto a street (the window columns are at run ≡ 2 m, every 4 m)
      if (street && floors > 0 && L > 3 && !LOW){
        let s0 = ((2 - run) % 4 + 4) % 4; if (s0 < 1.3) s0 += 4;
        for (let s = s0; s < L - 1.3; s += 4){
          const wx = x1 + (x2 - x1) * s / L, wz = z1 + (z2 - z1) * s / L, colH = b3hash(wx, wz);
          if (colH > stackP) continue;   // this window column has balconies all the way up (Alexandrian blocks stack them)
          const yaw = Math.atan2(nx, nz);
          for (let f = 0; f < floors; f++){ if (f === 0 && !old && colH > stackP * .5) continue;
            const y = base + .5 + 3.2 * f; if (ironStyle){ iron.push([wx + nx * .02, y, wz + nz * .02, yaw]); ironTrim.push(trim); } else { solid.push([wx + nx * .02, y, wz + nz * .02, yaw]); solidTrim.push(trim); } }
        }
      }
      run += L;
    }
    // the stair room (and sometimes a little rooftop room) on the roof
    if (Math.abs(A) / 2 > 110 && hb > .45){ const [vx, vz] = pts[Math.floor(hb * 997) % n], x = cx + (vx - cx) * .35, z = cz + (vz - cz) * .35;
      boxAt(x, top + 1.35, z, 2.8, 2.7, 2.8, hb * 6.28, col.copy(wall).multiplyScalar(.92)); boxAt(x, top + 2.75, z, 3.0, .14, 3.0, hb * 6.28, trim); }
  }
  const g = new THREE.Group(); g.name = 'b3d';
  if (NP.length){ const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(NP, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(NC, 3)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, B3.mat); m.receiveShadow = true; g.add(m); }
  if (P.length){ const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, B3.mat); m.castShadow = GFX === 'high'; m.receiveShadow = !LOW; grp.add(m); }   // parapets, cornices, ledges: always (they're cheap and they make the skyline)
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), V = new THREE.Vector3(), Sc = new THREE.Vector3(1, 1, 1);
  const ironCol = ironTrim, solidCol = solidTrim;
  for (const [geo, L, cols, mat] of [[B3.iron, iron, ironCol, B3.mat], [B3.rail, iron, null, B3.railMat], [B3.solid, solid, solidCol, B3.mat]]){
    if (!L.length) continue; const im = new THREE.InstancedMesh(geo, mat, L.length); im.castShadow = GFX === 'high' && mat !== B3.railMat; im.receiveShadow = !LOW;
    L.forEach(([x, y, z, ry], i) => { Q.setFromAxisAngle(Y, ry); M.compose(V.set(x, y, z), Q, Sc); im.setMatrixAt(i, M); if (cols) im.setColorAt(i, cols[i]); });
    im.computeBoundingSphere(); g.add(im);
  }
  if (g.children.length){ g.userData.c = [ox + CITY.chunk / 2, oz + CITY.chunk / 2]; grp.add(g); B3.near.push(g); }   // the balconies only near you (they're small from further away)
}
if (CITY){ const _bl3 = cityBaseLayer; cityBaseLayer = function(grp, ox, oz){ _bl3(grp, ox, oz); try { cityBuildings3D(grp, ox, oz); } catch (e){ console.warn('b3d', e); } }; }

{ const _ucB3 = updateCity; let tB3 = 0;
  updateCity = function(px, pz){ _ucB3(px, pz); const now = performance.now(); if (now - tB3 < 300) return; tB3 = now;
    const R = GFX === 'high' ? 170 : 125;
    for (let i = B3.near.length - 1; i >= 0; i--){ const g = B3.near[i]; if (!g.parent || !g.parent.parent){ B3.near.splice(i, 1); continue; } const [cx, cz] = g.userData.c; g.visible = Math.hypot(cx - px, cz - pz) < R; } }; }
