// ================= 3D characters: auto-rig + procedural moves =================
// Models come from tools/shrink_model.py: one textured mesh, A-pose, feet on y = 0, facing +z, 1.8 m tall.
// The rig finds the joints from the shape, builds 18 bones and skin weights, and the moves are drawn in code.
const RV = (x, y, z) => new THREE.Vector3(x, y, z);
function segDist(p, a, b){ const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); }

function findJoints(pos, H){
  const n = pos.count, P = i => RV(pos.getX(i), pos.getY(i), pos.getZ(i));
  let tipL = null, tipR = null;                         // hand tips: the furthest points to each side
  for (let i = 0; i < n; i++){ const x = pos.getX(i); if (!tipL || x > tipL.x) tipL = P(i); if (!tipR || x < tipR.x) tipR = P(i); }
  const legX = (y0, y1, side) => { let s = 0, c = 0; for (let i = 0; i < n; i++){ const y = pos.getY(i), x = pos.getX(i); if (y > y0*H && y < y1*H && Math.sign(x) === side && Math.abs(x) < .16*H){ s += x; c++; } } return c ? s / c : side * .06*H; };
  const kneeXL = legX(.26, .31, 1), kneeXR = legX(.26, .31, -1), ankleXL = legX(.04, .08, 1), ankleXR = legX(.04, .08, -1);
  let zs = 0, zc = 0; for (let i = 0; i < n; i++){ const y = pos.getY(i); if (y > .6*H && y < .75*H && Math.abs(pos.getX(i)) < .08*H){ zs += pos.getZ(i); zc++; } }
  const cz = zc ? zs / zc : 0;
  let w = 0; for (let i = 0; i < n; i++){ const y = pos.getY(i), x = Math.abs(pos.getX(i)); if (y > .76*H && y < .8*H && x < .2*H) w = Math.max(w, x); }
  let shX = Math.max(.08*H, w * .78), shY = .805*H;
  // T-pose (hands up at shoulder height): the arms fill that height, so measure the chest just under the armpits instead
  if ((tipL.y + tipR.y) / 2 > .7*H){
    let wc = 0; for (let i = 0; i < n; i++){ const y = pos.getY(i), x = Math.abs(pos.getX(i)); if (y > .64*H && y < .69*H && x < .2*H) wc = Math.max(wc, x); }
    shX = Math.max(.07*H, wc * .82); shY = Math.max(.76*H, Math.min(.83*H, (tipL.y + tipR.y) / 2 + .005*H));
  }
  const arm = (tip, s) => { const sh = RV(s*shX, shY, cz), d = tip.clone().sub(sh); return { sh, el: sh.clone().addScaledVector(d, .42), wr: sh.clone().addScaledVector(d, .76), tip: tip.clone() }; };
  const hipY = .52*H;
  const leg = (kx, ax, s) => ({ hip: RV(s*Math.max(.045*H, Math.abs(kx)*.9), hipY, cz), knee: RV(kx, .285*H, cz + .01*H), ankle: RV(ax, .045*H, cz - .01*H), toe: RV(ax, .01*H, cz + .075*H) });
  return { cz, H, armL: arm(tipL, 1), armR: arm(tipR, -1), legL: leg(kneeXL, ankleXL, 1), legR: leg(kneeXR, ankleXR, -1),
    pelvis: RV(0, hipY, cz), spine: RV(0, .6*H, cz), chest: RV(0, .7*H, cz), neck: RV(0, .82*H, cz), head: RV(0, .87*H, cz), top: RV(0, 1.0*H, cz) };
}

// pre: the saved result of an earlier rig of the same model (assets/models/<name>.rig.json, made by tools/bake_rigs.mjs);
// with it the slow part (joints from the shape, skin weights) is skipped, which matters on phones
function rigModel(srcMesh, pre){
  const geo = srcMesh.geometry.clone(), pos = geo.attributes.position; geo.computeBoundingBox();
  const H = geo.boundingBox.max.y - geo.boundingBox.min.y, J = pre ? rigJointsFrom(pre.J) : findJoints(pos, H);
  const bones = {}, list = [];
  const mk = (name, at, parent) => { const b = new THREE.Bone(); b.name = name; const pw = parent ? parent.userData.w : RV(0, 0, 0); b.position.copy(at).sub(pw); b.userData.w = at.clone(); if (parent) parent.add(b); bones[name] = b; list.push(b); return b; };
  const root = mk('root', RV(0, 0, J.cz), null);
  const pelvis = mk('pelvis', J.pelvis, root), spine = mk('spine', J.spine, pelvis), chest = mk('chest', J.chest, spine), neck = mk('neck', J.neck, chest); mk('head', J.head, neck);
  for (const [s, A, Lg] of [['L', J.armL, J.legL], ['R', J.armR, J.legR]]){
    const ua = mk('upperArm' + s, A.sh, chest), la = mk('lowerArm' + s, A.el, ua); mk('hand' + s, A.wr, la);
    const ul = mk('upperLeg' + s, Lg.hip, pelvis), ll = mk('lowerLeg' + s, Lg.knee, ul); mk('foot' + s, Lg.ankle, ll);
  }
  let si, sw, skirt;
  if (pre){ ({ si, sw } = rigUnpack(pre, pos.count)); skirt = !!pre.skirt; }
  else {
  const segs = [
    ['pelvis', J.pelvis, J.spine, 0], ['spine', J.spine, J.chest, 0], ['chest', J.chest, J.neck, 0], ['neck', J.neck, J.head, 0], ['head', J.head, J.top, 0],
    ['upperArmL', J.armL.sh, J.armL.el, 1], ['lowerArmL', J.armL.el, J.armL.wr, 1], ['handL', J.armL.wr, J.armL.tip, 1],
    ['upperArmR', J.armR.sh, J.armR.el, -1], ['lowerArmR', J.armR.el, J.armR.wr, -1], ['handR', J.armR.wr, J.armR.tip, -1],
    ['upperLegL', J.legL.hip, J.legL.knee, 1], ['lowerLegL', J.legL.knee, J.legL.ankle, 1], ['footL', J.legL.ankle, J.legL.toe, 1],
    ['upperLegR', J.legR.hip, J.legR.knee, -1], ['lowerLegR', J.legR.knee, J.legR.ankle, -1], ['footR', J.legR.ankle, J.legR.toe, -1],
  ];
  const NB = { pelvis: ['spine', 'upperLegL', 'upperLegR'], spine: ['pelvis', 'chest'], chest: ['spine', 'neck', 'upperArmL', 'upperArmR'], neck: ['chest', 'head'], head: ['neck'],
    upperArmL: ['chest', 'lowerArmL'], lowerArmL: ['upperArmL', 'handL'], handL: ['lowerArmL'], upperArmR: ['chest', 'lowerArmR'], lowerArmR: ['upperArmR', 'handR'], handR: ['lowerArmR'],
    upperLegL: ['pelvis', 'lowerLegL'], lowerLegL: ['upperLegL', 'footL'], footL: ['lowerLegL'], upperLegR: ['pelvis', 'lowerLegR'], lowerLegR: ['upperLegR', 'footR'], footR: ['lowerLegR'] };
  const idx = {}; for (const [name] of segs) idx[name] = list.indexOf(bones[name]);
  const n = pos.count, p = RV(0, 0, 0), d = segs.map(s => [s[0], 0]); si = new Uint16Array(n*4); sw = new Float32Array(n*4);
  for (let i = 0; i < n; i++){
    p.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    const side = Math.abs(p.x) < .015*H ? 0 : Math.sign(p.x);
    for (let k = 0; k < segs.length; k++){ const [name, a, b, s] = segs[k]; d[k][0] = name; d[k][1] = (s && side && s !== side) ? 1e9 : segDist(p, a, b); }
    const sorted = d.slice().sort((a, b) => a[1] - b[1]);
    const best = sorted[0], ok = NB[best[0]];
    const cand = sorted.filter(([name, dist]) => (name === best[0] || ok.includes(name)) && dist < best[1] * 1.7 + .01*H).slice(0, 4);
    let tot = 0; const ws = cand.map(([name, dist]) => { const w = 1 / Math.pow(dist + .004*H, 4); tot += w; return [name, w]; });
    ws.forEach(([name, w], k) => { si[i*4 + k] = idx[name]; sw[i*4 + k] = w / tot; });
  }
  smoothWeights(geo, pos, si, sw, list.length, segs.map(([name, , , sd]) => [idx[name], sd]), H);
  // long dresses (no gap between the legs at knee height): the skirt follows the pelvis at the top and both thighs
  // lower down, blended across the middle, so it sways with the steps instead of splitting into two trouser legs
  // a dress fills the middle from its front to its back; trousers only touch in the middle (baggy legs, inner seams)
  let kn = 0, mid = 0, zs = 0, zMax = -1e9, zMin = 1e9, mMax = -1e9, mMin = 1e9;
  for (let i = 0; i < n; i++){ const y = pos.getY(i); if (y > .2*H && y < .3*H){ const z = pos.getZ(i); kn++; zs += z; zMax = Math.max(zMax, z); zMin = Math.min(zMin, z); if (Math.abs(pos.getX(i)) < .015*H){ mid++; mMax = Math.max(mMax, z); mMin = Math.min(mMin, z); } } }
  const zc = kn ? zs / kn : 0;
  skirt = kn > 0 && mid / kn > .04 && (mMax - zc) > .8 * (zMax - zc) && (zc - mMin) > .8 * (zc - zMin);
  if (skirt){
    const arms = new Set(['upperArmL', 'lowerArmL', 'handL', 'upperArmR', 'lowerArmR', 'handR'].map(nm => idx[nm]));
    const top = J.pelvis.y - .02*H, bot = .02*H, sm = x => x * x * (3 - 2 * x);
    for (let i = 0; i < n; i++){
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y >= top || y <= bot || (arms.has(si[i*4]) && sw[i*4] > .4)) continue;
      if (y < .065*H && [J.legL, J.legR].some(L => segDist(RV(x, y, z), L.ankle, L.toe) < .045*H)) continue;   // the shoes stay on the feet
      // above the knees: pelvis -> thighs; below: thighs -> shins (so it hangs down when she sits); blended left/right
      const c01 = v => Math.max(0, Math.min(1, v)), kneeY = (J.legL.knee.y + J.legR.knee.y) / 2, s = sm(c01(.5 + x / (.2*H)));
      if (y >= kneeY){
        const t = sm(c01((top - y) / (top - kneeY)));
        si[i*4] = idx.pelvis; si[i*4+1] = idx.upperLegL; si[i*4+2] = idx.upperLegR; si[i*4+3] = idx.spine;
        sw[i*4] = 1 - t; sw[i*4+1] = t * s; sw[i*4+2] = t * (1 - s); sw[i*4+3] = 0;
      } else {
        const u = sm(c01((kneeY - y) / (kneeY - .14*H)));
        si[i*4] = idx.upperLegL; si[i*4+1] = idx.upperLegR; si[i*4+2] = idx.lowerLegL; si[i*4+3] = idx.lowerLegR;
        sw[i*4] = (1 - u) * s; sw[i*4+1] = (1 - u) * (1 - s); sw[i*4+2] = u * s; sw[i*4+3] = u * (1 - s);
      }
    }
  }
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  const mesh = new THREE.SkinnedMesh(geo, srcMesh.material);
  mesh.add(root); mesh.bind(new THREE.Skeleton(list));
  mesh.computeBoundingSphere(); mesh.boundingSphere.radius *= 1.45;   // generous, so no pose pokes out of it
  const armAng = s => { const A = s > 0 ? J.armL : J.armR; const v = A.wr.clone().sub(A.sh); return Math.atan2(Math.abs(v.x), -v.y); };
  return { mesh, bones, J, H, skirt, head: pre && pre.head ? pre.head : measureHead(pos, H, J), armDown: { L: armAng(1), R: armAng(-1) }, t: 0, phase: 0 };
}
// ---- saving a rig: joints as arrays, bone numbers and weights as bytes in base64 ----
function rigJointsTo(o){ if (o && o.isVector3) return [+o.x.toFixed(5), +o.y.toFixed(5), +o.z.toFixed(5)]; if (o && typeof o === 'object'){ const r = {}; for (const k in o) r[k] = rigJointsTo(o[k]); return r; } return o; }
function rigJointsFrom(o){ if (Array.isArray(o) && o.length === 3 && typeof o[0] === 'number') return RV(o[0], o[1], o[2]); if (o && typeof o === 'object'){ const r = {}; for (const k in o) r[k] = rigJointsFrom(o[k]); return r; } return o; }
function b64(bytes){ let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); return btoa(s); }
function unb64(s){ const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
function rigData(R){
  const g = R.mesh.geometry, si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array;
  const qi = new Uint8Array(si.length), qw = new Uint8Array(sw.length);
  for (let i = 0; i < si.length; i++){ qi[i] = si[i]; qw[i] = Math.round(sw[i] * 255); }
  return { v: 1, count: g.attributes.position.count, J: rigJointsTo(R.J), skirt: R.skirt, head: R.head, si: b64(qi), sw: b64(qw) };
}
function rigUnpack(pre, count){
  const qi = unb64(pre.si), qw = unb64(pre.sw); if (qi.length !== count * 4) throw new Error('saved rig does not match the model');
  const si = new Uint16Array(qi), sw = new Float32Array(qw.length);
  for (let i = 0; i < count; i++){ let t = 0; for (let k = 0; k < 4; k++) t += qw[i*4+k]; for (let k = 0; k < 4; k++) sw[i*4+k] = t ? qw[i*4+k] / t : (k ? 0 : 1); }
  return { si, sw };
}
// face landmarks from the shape (for the glasses, cap and chain)
function measureHead(pos, H, J){
  const n = pos.count, X = i => pos.getX(i), Y = i => pos.getY(i), Z = i => pos.getZ(i);
  let noseY = .9*H, nz = -1e9;                                   // the nose tip: the most forward point of the face
  for (let i = 0; i < n; i++){ const y = Y(i); if (y > .83*H && y < .93*H && Math.abs(X(i)) < .012*H && Z(i) > nz){ nz = Z(i); noseY = y; } }
  const eyeY = noseY + .02*H, capY = eyeY + .025*H, neckY = noseY - .05*H, chestY = neckY - .045*H;
  let faceZ = -1e9, rx = 0, z0 = 1e9, z1 = -1e9, nF = -1e9, nB = 1e9, nX = 0, cF = -1e9;
  for (let i = 0; i < n; i++){
    const x = Math.abs(X(i)), y = Y(i), z = Z(i);
    if (Math.abs(y - eyeY) < .012*H && x > .012*H && x < .03*H) faceZ = Math.max(faceZ, z);
    if (y > capY){ rx = Math.max(rx, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    if (Math.abs(y - neckY) < .006*H && x < .06*H){ nF = Math.max(nF, z); nB = Math.min(nB, z); nX = Math.max(nX, x); }
    if (Math.abs(y - chestY) < .006*H && x < .035*H) cF = Math.max(cF, z);
  }
  // wrist thickness where the watch goes
  const A = J.armL, dir = A.wr.clone().sub(A.el).normalize(), w = A.el.clone().lerp(A.wr, .86), q = RV(0, 0, 0), pds = [];
  for (let i = 0; i < n; i++){ q.set(X(i), Y(i), Z(i)).sub(w); const al = q.dot(dir); if (Math.abs(al) > .006*H) continue; const pd = q.addScaledVector(dir, -al).length(); if (pd < .028*H) pds.push(pd); }
  pds.sort((a, b) => a - b); const wr = pds.length ? pds[Math.floor(pds.length * .8)] : 0;
  return { wristR: wr || .03, eyeY, faceZ, capY, rx, rz: (z1 - z0) / 2, cz: (z1 + z0) / 2, neckY, neckF: nF, neckB: nB, neckX: nX, chestY, chestF: cF };
}
// the shop's accessories as real 3D pieces on the bones
function make3DAccessories(R){
  const B = R.bones, J = R.J, Hd = R.head, H = R.H, at = (bone, w) => w.clone().sub(bone.userData.w);
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 1, roughness: .28 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b1016, metalness: .4, roughness: .12 });
  const out = {};
  { // sunglasses
    const g = new THREE.Group(), fz = Hd.faceZ + .012, hw = Hd.rx * .97, depth = Math.max(.08, fz - Hd.cz);
    for (const s of [-1, 1]){ const l = new THREE.Mesh(new RoundedBoxGeometry(.048, .032, .008, 2, .008), dark); l.position.set(s*.03, 0, 0); g.add(l);
      const sd = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.005, hw - .054), .006, .006), dark); sd.position.set(s*(.054 + (hw - .054)/2), .007, -.004); g.add(sd);
      const tm = new THREE.Mesh(new THREE.BoxGeometry(.006, .006, depth), dark); tm.position.set(s*hw, .007, -depth/2); g.add(tm); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(.014, .006, .006), dark); br.position.set(0, .008, .002); g.add(br);
    g.position.copy(at(B.head, RV(0, Hd.eyeY, fz))); B.head.add(g); out.glasses = g;
  }
  { // red cap
    const g = new THREE.Group(), red = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: .75 }), sx = Hd.rx * 1.13, sz = Hd.rz * 1.1;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI*2, 0, Math.PI/2), red); dome.scale.set(sx, H - Hd.capY + .035, sz); g.add(dome);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .007, 24, 1, false, -Math.PI/2, Math.PI), new THREE.MeshStandardMaterial({ color: 0xa93226, roughness: .75 })); brim.scale.set(sx * .92, 1, .085); brim.position.set(0, .004, sz * .93); brim.rotation.x = .1; g.add(brim);
    g.position.copy(at(B.head, RV(0, Hd.capY, Hd.cz))); B.head.add(g); out.cap = g;
  }
  { // gold chain: round the back of the neck, hanging onto the chest, with a medal
    const g = new THREE.Group(), fz = Hd.chestF + .008, bz = Hd.neckB - .004, dy = Hd.neckY - Hd.chestY, dz = fz - bz;
    const tilt = Math.atan2(dy, dz), rz = Math.hypot(dy, dz) / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .0045 / Math.min(Hd.neckX * .95 + .006, rz), 6, 40), gold); ring.rotation.x = Math.PI/2; ring.scale.set(Hd.neckX * .95 + .006, rz, Math.min(Hd.neckX * .95 + .006, rz));
    const tg = new THREE.Group(); tg.rotation.x = tilt; tg.add(ring); g.add(tg);
    const med = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .004, 18), gold); med.rotation.x = Math.PI/2 - .25; med.position.set(0, -.018, rz + .006); tg.add(med);
    g.position.copy(at(B.chest, RV(0, (Hd.neckY + Hd.chestY) / 2, (fz + bz) / 2))); B.chest.add(g); out.chain = g;
  }
  { // watch on the left wrist
    const A = J.armL, dir = A.wr.clone().sub(A.el).normalize(), w = A.el.clone().lerp(A.wr, .86);
    const g = new THREE.Group(); g.quaternion.setFromUnitVectors(RV(0, 1, 0), dir);
    const wr = Hd.wristR + .003; g.add(new THREE.Mesh(new THREE.CylinderGeometry(wr, wr, .022, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: .6, side: THREE.DoubleSide })));
    const face = new THREE.Mesh(new THREE.CylinderGeometry(.017, .017, .008, 18), gold); face.rotation.z = Math.PI/2; face.position.x = wr + .003; g.add(face);
    g.position.copy(at(B.lowerArmL, w)); B.lowerArmL.add(g); out.watch = g;
  }
  return out;
}

// soften the skin weights over the surface (3 rounds of averaging with the neighbours), so elbows,
// knees, shoulders and hips bend smoothly instead of creasing; left/right limbs stay apart.
function smoothWeights(geo, pos, si, sw, nb, segSide, H){
  const n = pos.count, key = new Map(), wid = new Int32Array(n); let nw = 0;
  for (let i = 0; i < n; i++){ const k = Math.round(pos.getX(i)*2e4) + ',' + Math.round(pos.getY(i)*2e4) + ',' + Math.round(pos.getZ(i)*2e4); let w = key.get(k); if (w === undefined){ w = nw++; key.set(k, w); } wid[i] = w; }
  const W = new Float32Array(nw*nb), side = new Int8Array(nw);
  for (let i = 0; i < n; i++){ const w = wid[i]; side[w] = Math.abs(pos.getX(i)) < .015*H ? 0 : Math.sign(pos.getX(i)); for (let k = 0; k < 4; k++) W[w*nb + si[i*4+k]] = Math.max(W[w*nb + si[i*4+k]], sw[i*4+k]); }
  // neighbours (welded) from the triangles
  const ix = geo.index.array, nbs = Array.from({ length: nw }, () => []);
  for (let f = 0; f < ix.length; f += 3){ const a = wid[ix[f]], b = wid[ix[f+1]], c = wid[ix[f+2]]; nbs[a].push(b, c); nbs[b].push(a, c); nbs[c].push(a, b); }
  const sideOf = new Int8Array(nb); for (const [bi, sd] of segSide) sideOf[bi] = sd;
  let T = new Float32Array(nw*nb);
  for (let it = 0; it < 3; it++){
    for (let v = 0; v < nw; v++){
      const L = nbs[v], o = v*nb; if (!L.length){ for (let b = 0; b < nb; b++) T[o+b] = W[o+b]; continue; }
      for (let b = 0; b < nb; b++){ let sum = 0; for (const u of L) sum += W[u*nb + b]; T[o+b] = W[o+b]*.5 + sum / L.length * .5; }
      if (side[v]) for (let b = 0; b < nb; b++) if (sideOf[b] && sideOf[b] !== side[v]) T[o+b] = 0;
    }
    const tmp = W.slice(); W.set(T); T = tmp;
  }
  // back to the 4 strongest bones per vertex
  const order = new Array(nb);
  for (let i = 0; i < n; i++){
    const o = wid[i]*nb; for (let b = 0; b < nb; b++) order[b] = b; order.sort((x, y) => W[o+y] - W[o+x]);
    let tot = 0; for (let k = 0; k < 4; k++) tot += W[o + order[k]];
    for (let k = 0; k < 4; k++){ si[i*4+k] = order[k]; sw[i*4+k] = tot > 0 ? W[o + order[k]] / tot : (k ? 0 : 1); }
  }
}

const _re = new THREE.Euler(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qc = new THREE.Quaternion();
const AX = RV(1, 0, 0), AY = RV(0, 1, 0), AZ = RV(0, 0, 1);
function brot(b, x, y, z){ b.quaternion.setFromEuler(_re.set(x, y, z)); }
function addRot(b, x, y, z){ b.quaternion.multiply(_qc.setFromEuler(_re.set(x, y, z))); }
function armRot(b, down, side, swing, out = 0, twist = 0){
  // lower the arm from the A-pose toward the body (around z), then swing it forward/back (around x)
  _qa.setFromAxisAngle(AX, swing); _qb.setFromAxisAngle(AZ, side * -(down - .12 - out));
  b.quaternion.copy(_qa).multiply(_qb);
  if (twist) b.quaternion.multiply(_qc.setFromAxisAngle(AY, twist));   // twist turns the bent forearm in toward the body
}
const lerpN = (a, b, k) => a + (b - a) * k;
// two-bone IK: turn the upper arm and forearm so the hand reaches `target` (world), elbow toward `pole` (world direction).
// k blends from the pose already set (0) to the full reach (1).
const _iv1 = RV(0,0,0), _iv2 = RV(0,0,0), _iv3 = RV(0,0,0), _iv4 = RV(0,0,0), _iv5 = RV(0,0,0), _iv6 = RV(0,0,0), _iv7 = RV(0,0,0), _iv8 = RV(0,0,0);
const _iq1 = new THREE.Quaternion(), _iq2 = new THREE.Quaternion(), _iq3 = new THREE.Quaternion(), _iqA = new THREE.Quaternion(), _iqB = new THREE.Quaternion();
function aimBone(b, child, dir){
  // rotate bone b (in world terms) so the direction to its child points along dir
  b.updateWorldMatrix(true, true);
  const p = b.getWorldPosition(_iv7), c = child.getWorldPosition(_iv8), cur = c.sub(p).normalize();
  _iq1.setFromUnitVectors(cur, dir);
  const wq = b.getWorldQuaternion(_iq2), pq = b.parent.getWorldQuaternion(_iq3);
  b.quaternion.copy(pq.invert().multiply(_iq1.multiply(wq)));
}
function ikArm(R, side, target, pole, k = 1){
  if (k <= 0) return;
  const s = side > 0 ? 'L' : 'R', ua = R.bones['upperArm' + s], la = R.bones['lowerArm' + s], hd = R.bones['hand' + s];
  const fkU = _iqA.copy(ua.quaternion), fkL = _iqB.copy(la.quaternion);
  R.mesh.updateMatrixWorld(true);
  const S = ua.getWorldPosition(RV(0,0,0)), E = la.getWorldPosition(RV(0,0,0)), W = hd.getWorldPosition(RV(0,0,0));
  const a = E.distanceTo(S), b = W.distanceTo(E), dir = target.clone().sub(S);
  const d = Math.max(Math.abs(a - b) + 1e-3, Math.min(a + b - 1e-3, dir.length())); dir.normalize();
  const cosA = (a * a + d * d - b * b) / (2 * a * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const n = RV(0,0,0).crossVectors(dir, pole).normalize(), toPole = RV(0,0,0).crossVectors(n, dir).normalize();
  const elbowDir = dir.clone().multiplyScalar(cosA).addScaledVector(toPole, sinA).normalize();
  aimBone(ua, la, elbowDir);
  const E2 = la.getWorldPosition(RV(0,0,0)); aimBone(la, hd, target.clone().sub(E2).normalize());
  if (k < 1){ ua.quaternion.copy(fkU.slerp(ua.quaternion, k)); la.quaternion.copy(fkL.slerp(la.quaternion, k)); }
}
// o: { f: steps per second (walk/run), k: punch / hit strength 0..1, side: 1 right hand / -1 left,
//      look: head turn (radians, + = to his left), lean: body roll in turns, snap: no blending }
function poseRig(R, move, dt, o = {}){
  const B = R.bones, H = R.H; R.t += dt;
  const t = R.t; let ph = R.phase;
  if (move !== R.move){ R.move = move; R.since = 0; } R.since = (R.since || 0) + dt;
  for (const k in B){ if (k !== 'root') B[k].quaternion.identity(); }
  B.root.position.y = 0; B.pelvis.position.set(R.J.pelvis.x, R.J.pelvis.y, 0);
  if (move === 'landHard' && !(CLIPS_READY && CLIPS.hardLand)) move = 'land';
  // a Mixamo clip for this move (05d-anim-clips.js); otherwise the hand-made pose below
  if (!clipPose(R, move, dt, o)){
  let swingL = 0, swingR = 0, elL = -.18, elR = -.18, outL = -.04, outR = -.04, twL = 0, twR = 0;
  if (move === 'idle'){
    // breathing, a slow weight shift from foot to foot, and now and then a look around
    const br = Math.sin(t * 1.8), ws = Math.sin(t * .7);
    brot(B.chest, br * .02, 0, 0); brot(B.head, Math.sin(t * .7) * .03, Math.sin(t * .37) * .1 + Math.max(0, Math.sin(t * .13) - .8) * 2.2, 0);
    B.pelvis.position.x += ws * .008*H; brot(B.pelvis, 0, 0, ws * .025); brot(B.spine, 0, 0, -ws * .02);
    brot(B.upperLegL, 0, 0, -ws * .025); brot(B.upperLegR, 0, 0, -ws * .025); brot(B.lowerLegL, Math.max(0, -ws) * .08, 0, 0); brot(B.lowerLegR, Math.max(0, ws) * .08, 0, 0);
    swingL = .04 + br * .03; swingR = .04 - br * .03;
  } else if (move === 'walk' || move === 'run'){
    const run = move === 'run', amp = (run ? 1 : .62) * (run ? 1 : o.stride || 1), f = o.f || (run ? 9.5 : 6.2); ph = R.phase += dt * f; const s = Math.sin(ph), c = Math.cos(ph);
    const la = R.skirt ? .6 : 1;   // in a long dress the steps are shorter
    brot(B.upperLegL, (-s * .55 * amp - (run ? .1 : 0)) * la, 0, 0); brot(B.upperLegR, (s * .55 * amp - (run ? .1 : 0)) * la, 0, 0);
    const knee = (run ? 1.45 : 1.1) * (R.skirt ? .55 : 1);
    brot(B.lowerLegL, Math.max(0, -Math.sin(ph - .9)) * knee * amp + .06, 0, 0); brot(B.lowerLegR, Math.max(0, Math.sin(ph - .9)) * knee * amp + .06, 0, 0);
    brot(B.footL, s * .22 * amp, 0, 0); brot(B.footR, -s * .22 * amp, 0, 0);
    swingL = s * .5 * amp; swingR = -s * .5 * amp;
    elL = run ? -1.3 : -.25 - Math.max(0, -swingL) * .5; elR = run ? -1.3 : -.25 - Math.max(0, -swingR) * .5;
    B.pelvis.position.y += Math.abs(c) * .018*H * amp - (run ? .022*H : 0); B.pelvis.position.x += s * .006*H;
    brot(B.pelvis, run ? .12 : .03, s * .09 * amp, -s * .035 * amp); brot(B.chest, run ? .07 : .01, -s * .15 * amp, s * .02);
    brot(B.head, run ? -.08 : 0, s * .05 * amp, 0);
  } else if (move === 'punch'){
    // boxing guard, the punching arm shoots straight out, the shoulder turns into it
    const k = o.k ?? Math.max(0, Math.sin(Math.min(1, (t % 1.1) / .35) * Math.PI)), sd = o.side || 1;
    swingL = swingR = -.75; elL = elR = -2.1; outL = outR = -.06;
    if (sd > 0){ swingR = lerpN(-.75, -1.5, k); elR = lerpN(-2.1, -.08, k); outR = lerpN(-.06, .02, k); }
    else { swingL = lerpN(-.75, -1.5, k); elL = lerpN(-2.1, -.08, k); outL = lerpN(-.06, .02, k); }
    brot(B.pelvis, .06, .18 * k * sd, 0); brot(B.chest, .1 * k, .38 * k * sd, 0); brot(B.head, 0, -.5 * k * sd, 0);
    B.pelvis.position.y -= .015*H;
    brot(B.upperLegL, -.32, 0, .04); brot(B.lowerLegL, .38, 0, 0); brot(B.footL, -.06, 0, 0); brot(B.upperLegR, .22, 0, -.04); brot(B.lowerLegR, .18, 0, 0);
  } else if (move === 'hit'){
    // knocked back: leans away, arms thrown back, knees give a little
    const k = o.k ?? 1;
    brot(B.chest, -.3 * k, .15 * k, 0); brot(B.neck, -.15 * k, 0, 0); brot(B.head, -.18 * k, -.2 * k, .1 * k);
    B.pelvis.position.z = -.025*H * k; B.pelvis.position.y -= .02*H * k;
    brot(B.upperLegL, -.2 * k, 0, 0); brot(B.lowerLegL, .4 * k, 0, 0); brot(B.upperLegR, .15 * k, 0, 0); brot(B.lowerLegR, .3 * k, 0, 0);
    swingL = .35 * k; swingR = .25 * k; elL = elR = -.18 - .35 * k; outL = outR = -.04 + .4 * k;
  } else if (move === 'talk'){
    // talking with the hands: one hand explains, the other joins in now and then; little nods
    const a = Math.sin(t * 3.1), b = Math.sin(t * 4.3 + 1), c = Math.max(0, Math.sin(t * 1.7));
    swingR = -.4 + a * .14; elR = -1.2 + b * .3; outR = -.02 + a * .04;
    swingL = -.1 - c * .3; elL = -.3 - c * .8; outL = -.04 + c * .05;
    brot(B.chest, .02, Math.sin(t * 1.1) * .07, 0); brot(B.head, Math.sin(t * 5) * .05, Math.sin(t * 1.3) * .14, Math.sin(t * .9) * .04);
    const ws = Math.sin(t * .7); B.pelvis.position.x += ws * .006*H; brot(B.pelvis, 0, 0, ws * .02);
  } else if (move === 'sit' || move === 'shisha'){
    brot(B.upperLegL, -1.5, 0, .05); brot(B.upperLegR, -1.5, 0, -.05); brot(B.lowerLegL, 1.5, 0, 0); brot(B.lowerLegR, 1.5, 0, 0);
    B.root.position.y = -(R.J.pelvis.y - .29*H); swingL = swingR = -.35; elL = elR = -.6;
    brot(B.spine, .06, 0, 0); brot(B.head, Math.sin(t * .6) * .03, Math.sin(t * .3) * .1, 0);
    if (move === 'shisha'){
      // a 9-second cycle: the hose goes up to the mouth, a long draw with the head back a little, then down again; leaning back, relaxed
      const c = t % 9, ss = x => x * x * (3 - 2 * x), k = c < .8 ? ss(c / .8) : c < 2.6 ? 1 : c < 3.4 ? 1 - ss((c - 2.6) / .8) : 0;
      brot(B.spine, -.04, 0, 0); brot(B.head, -.1 * k + Math.sin(t * .6) * .02, Math.sin(t * .3) * .12 * (1 - k), 0);
      o.ikMouth = k;   // the right hand is placed at the mouth further down (two-bone IK)
    }
  } else if (move === 'moto'){
    brot(B.upperLegL, -1.15, 0, .18); brot(B.upperLegR, -1.15, 0, -.18); brot(B.lowerLegL, 1.35, 0, 0); brot(B.lowerLegR, 1.35, 0, 0);
    B.root.position.y = -(R.J.pelvis.y - .5*H); brot(B.pelvis, .25, 0, 0); brot(B.chest, .15, 0, 0);
    swingL = swingR = -1.05; elL = elR = -.35; outL = outR = .25;
  } else if (move === 'dance'){
    ph = R.phase += dt * 7; const s = Math.sin(ph), s2 = Math.sin(ph * .5);
    B.pelvis.position.x += s * .03*H; B.pelvis.position.y += Math.abs(Math.cos(ph)) * .02*H;
    brot(B.pelvis, 0, s2 * .3, s * .08); brot(B.chest, 0, -s2 * .2, -s * .1); brot(B.head, 0, s2 * .2, s * .1);
    swingL = -1.2 - s * .5; swingR = -1.2 + s * .5; elL = -1.4; elR = -1.4; outL = outR = .7;
    brot(B.upperLegL, -.15 - Math.max(0, s) * .4, 0, 0); brot(B.lowerLegL, Math.max(0, s) * .6, 0, 0);
    brot(B.upperLegR, -.15 - Math.max(0, -s) * .4, 0, 0); brot(B.lowerLegR, Math.max(0, -s) * .6, 0, 0);
  } else if (move === 'cheer'){
    const s = Math.abs(Math.sin(t * 8));
    outL = outR = 1.6 + s * .25; elL = elR = -.35 - s * .4; swingL = swingR = -.15;
    B.pelvis.position.y += s * .05*H; brot(B.upperLegL, -.2 * s, 0, 0); brot(B.upperLegR, -.2 * s, 0, 0); brot(B.lowerLegL, .35 * s, 0, 0); brot(B.lowerLegR, .35 * s, 0, 0);
    brot(B.head, -.15, 0, 0);
  } else if (move === 'wave'){
    swingR = -.2; outR = 2.1; elR = -.2 - Math.abs(Math.sin(t * 6)) * .9; swingL = .05;
    brot(B.head, 0, -.15, 0);
  } else if (move === 'jump'){
    // knees tucked, arms up and out for balance
    swingL = swingR = -1.05; outL = outR = .45; elL = elR = -.45;
    brot(B.upperLegL, -.75, 0, .03); brot(B.lowerLegL, 1.15, 0, 0); brot(B.upperLegR, -.35, 0, -.03); brot(B.lowerLegR, .7, 0, 0);
    brot(B.chest, .1, 0, 0); brot(B.head, -.1, 0, 0);
  } else if (move === 'fall'){
    // falling a long way: arms and legs flail
    const a = Math.sin(t * 11), b = Math.sin(t * 8 + 1);
    outL = 1.25 + a * .35; outR = 1.25 - a * .35; swingL = -.5 + b * .5; swingR = -.5 - b * .5; elL = elR = -.5;
    brot(B.upperLegL, -.45 + b * .35, 0, .08); brot(B.lowerLegL, .7, 0, 0); brot(B.upperLegR, -.45 - b * .35, 0, -.08); brot(B.lowerLegR, .7, 0, 0);
    brot(B.chest, -.15, 0, 0); brot(B.head, -.2, 0, 0);
  } else if (move === 'land'){
    // landing: knees give, body forward, hands out
    B.pelvis.position.y -= .1 * H;
    brot(B.upperLegL, -.95, 0, .05); brot(B.upperLegR, -.95, 0, -.05); brot(B.lowerLegL, 1.45, 0, 0); brot(B.lowerLegR, 1.45, 0, 0); brot(B.footL, -.45, 0, 0); brot(B.footR, -.45, 0, 0);
    brot(B.chest, .32, 0, 0); brot(B.head, -.25, 0, 0); swingL = swingR = -.55; outL = outR = .35; elL = elR = -.55;
  } else if (move === 'swim'){
    // front crawl (the whole body is tipped forward by the caller): the arms turn over in turn, the legs flutter
    ph = R.phase += dt * 3.4; const s = Math.sin(ph);
    swingL = -1.5 + s * 1.55; swingR = -1.5 - s * 1.55; elL = -.25 - Math.max(0, s) * .5; elR = -.25 - Math.max(0, -s) * .5; outL = outR = .15;
    const fl = Math.sin(ph * 2.6) * .28; brot(B.upperLegL, fl, 0, 0); brot(B.upperLegR, -fl, 0, 0); brot(B.lowerLegL, .2 + Math.max(0, fl), 0, 0); brot(B.lowerLegR, .2 + Math.max(0, -fl), 0, 0);
    brot(B.chest, 0, s * .25, 0); brot(B.neck, -.35, 0, 0); brot(B.head, -.35, -s * .25, 0);
  } else if (move === 'tread'){
    // treading water: upright, hands sculling, legs cycling
    ph = R.phase += dt * 2.4; const s = Math.sin(ph), c = Math.cos(ph);
    outL = outR = .85 + s * .25; swingL = swingR = -.35; elL = elR = -.7 - c * .2;
    brot(B.upperLegL, -.55 + s * .35, 0, .05); brot(B.lowerLegL, .95 + c * .3, 0, 0); brot(B.upperLegR, -.55 - s * .35, 0, -.05); brot(B.lowerLegR, .95 - c * .3, 0, 0);
    brot(B.head, -.05, Math.sin(t * .6) * .2, 0);
  } else if (move === 'climb'){
    // pulling himself up out of the water
    swingL = swingR = -2.75; elL = elR = -.55; outL = outR = .25;
    brot(B.upperLegL, -1.15, 0, 0); brot(B.lowerLegL, 1.35, 0, 0); brot(B.upperLegR, -.25, 0, 0); brot(B.lowerLegR, .35, 0, 0);
    brot(B.chest, .25, 0, 0); brot(B.head, -.3, 0, 0);
  }
  // long hair and wide sleeves over the shoulders stretch if the arms go up high: keep them lower in a long dress
  if (R.skirt){ outL = Math.min(outL, .85); outR = Math.min(outR, .85); swingL = Math.max(swingL, -1.25); swingR = Math.max(swingR, -1.25); }
  armRot(B.upperArmL, R.armDown.L, 1, swingL, outL, twL); armRot(B.upperArmR, R.armDown.R, -1, swingR, outR, twR);
  brot(B.lowerArmL, elL, 0, 0); brot(B.lowerArmR, elR, 0, 0);
  }
  // looking at someone, and leaning into turns
  if (o.look){ const lk = Math.max(-1.1, Math.min(1.1, o.look)); addRot(B.neck, 0, lk * .4, 0); addRot(B.head, 0, lk * .6, 0); }
  if (o.lean){ const ln = Math.max(-.25, Math.min(.25, o.lean)); addRot(B.pelvis, 0, 0, ln * .4); addRot(B.chest, 0, 0, ln * .6); }
  // hand to the mouth (the shisha hose), or any hand to a point in the world (o.ikTarget = { side, pos, pole, k })
  if (o.ikMouth > 0){
    R.mesh.updateMatrixWorld(true); const hp = B.head.getWorldPosition(_iv1), fw = _iv2.set(0, 0, 1).applyQuaternion(R.mesh.getWorldQuaternion(_iq1));
    const up = _iv3.set(0, 1, 0), right = _iv4.crossVectors(fw, up).normalize();   // the character's right (+z forward, x left)
    const mouth = _iv5.copy(hp).addScaledVector(fw, .15 * R.mesh.scale.y).addScaledVector(up, -.11 * R.mesh.scale.y).addScaledVector(right, .06);   // the wrist sits under the chin, so the fingers hold the hose at the lips
    ikArm(R, -1, mouth, _iv6.copy(up).multiplyScalar(-1).addScaledVector(right, .8).addScaledVector(fw, -.3), o.ikMouth);
  }
  if (o.ikTarget) ikArm(R, o.ikTarget.side, o.ikTarget.pos, o.ikTarget.pole, o.ikTarget.k ?? 1);
  // blend from the last pose: quick inside a move, softer when the move changes, so nothing snaps
  const P = R.prev || (R.prev = {}), first = !P.root;
  const rate = o.snap || first ? 0 : move === 'punch' || move === 'strike' ? 35 : R.since < .4 ? 10 : 40, a = rate ? 1 - Math.exp(-rate * dt) : 1;
  for (const k in B){
    const b = B[k], p = P[k] || (P[k] = { q: b.quaternion.clone(), v: b.position.clone() });
    if (a < 1){ p.q.slerp(b.quaternion, a); p.v.lerp(b.position, a); b.quaternion.copy(p.q); b.position.copy(p.v); }
    else { p.q.copy(b.quaternion); p.v.copy(b.position); }
  }
}

// a copy of a rigged model with its own skeleton (the mesh data and texture are shared): for NPCs of the same look
function cloneRig(R){
  const root = R.bones.root.clone(true), bones = {};
  root.traverse(b => { if (b.isBone) bones[b.name] = b; });
  const list = R.mesh.skeleton.bones.map(b => bones[b.name]);
  const mesh = new THREE.SkinnedMesh(R.mesh.geometry, R.mesh.material); mesh.castShadow = R.mesh.castShadow;
  mesh.add(root); mesh.bind(new THREE.Skeleton(list, R.mesh.skeleton.boneInverses.map(m => m.clone())), new THREE.Matrix4());
  mesh.boundingSphere = R.mesh.boundingSphere.clone();
  return { ...R, mesh, bones, t: Math.random() * 10, phase: Math.random() * 6, prev: null, move: null, since: 0 };
}
