// ================= the last touches of the real city: market goods on the pavement, the corniche beaches, footbridges, the rail yards =================

// ---------- goods out on the pavement in the old markets: clothes racks, furniture, rolls of cloth (Attarin, Manshiya, Bahary, Karmouz) ----------
const GOODS_GEO = (() => { const m = list => mergeGeometries(list.map(q => q.index ? q.toNonIndexed() : q)), G = {};
  { const p = []; for (const x of [-.75, .75]) cyl(p, .025, .025, 1.6, x, .8, 0, '#9e9e9e', 0, 5);
    { const bar = new THREE.CylinderGeometry(.02, .02, 1.6, 5); bar.rotateZ(Math.PI / 2); bar.translate(0, 1.58, 0); p.push(colored(bar, '#9e9e9e')); }
    for (let i = 0; i < 7; i++) box(p, .16, .75, .38, -.6 + i * .2, 1.15, 0, ['#c62828', '#1f4fa8', '#2e7d32', '#f5f5f5', '#6a1b4d', '#e0a21a', '#263238'][i]); G.rack = m(p); }
  { const p = []; box(p, 1.1, .75, .6, 0, .375, 0, '#6d4c41'); box(p, .5, .9, .5, .2, 1.2, 0, '#8d6e63'); box(p, .45, .05, .45, -.3, .78, 0, '#a1887f'); for (const x of [-.5, -.1]) box(p, .05, .5, .05, x, 1.05, .18, '#5d4037'); G.furn = m(p); }
  { const p = []; for (let i = 0; i < 5; i++){ const c = new THREE.CylinderGeometry(.11, .11, 1.5, 8); c.rotateZ(.25); c.translate(-.5 + i * .25, .75, 0); p.push(colored(c, ['#8e24aa', '#c62828', '#f9a825', '#1565c0', '#2e7d32'][i])); } G.cloth = m(p); }
  return G; })();
const GOODS_D = new Set(['attarin', 'manshiya', 'bahary', 'karmouz']), GOODS_OBS = new Set();
function cityGoods(grp, ox, oz){
  const list = grp.userData.blist; if (!list) return;
  const parts = [];
  for (const b of list){
    const dk = DKEY_LIST[b.dist]; if (!GOODS_D.has(dk)) continue;
    const kind = b.band === 9 ? 'furn' : b.band === 11 ? 'cloth' : b.band === 3 ? 'rack' : null; if (!kind) continue;
    const n = b.ring.length / 2; if (n < 3) continue;
    const pts = []; for (let k = 0; k < n; k++) pts.push([ox + b.ring[k * 2] / 10, oz + b.ring[k * 2 + 1] / 10]);
    let A = 0; for (let k = 0; k < n; k++){ const [x1, z1] = pts[k], [x2, z2] = pts[(k + 1) % n]; A += x1 * z2 - x2 * z1; } const sgn = A > 0 ? 1 : -1;
    for (let k = 0; k < n; k++){
      const [x1, z1] = pts[k], [x2, z2] = pts[(k + 1) % n], L = Math.hypot(x2 - x1, z2 - z1); if (L < 4) continue;
      const nx = sgn > 0 ? (z2 - z1) / L : -(z2 - z1) / L, nz = sgn > 0 ? -(x2 - x1) / L : (x2 - x1) / L;
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
      if (cityR(mx + nx, mz + nz) >= 10 || ![2.5, 3.5, 4.5].some(d => cityR(mx + nx * d, mz + nz * d) === 1)) continue;   // only a front on a street
      for (let s = 2; s < L - 1.5; s += 3.2){
        if (((Math.round(x1 * 7 + z1 * 13 + s * 31) >>> 0) % 100) > 45) continue;
        const x = x1 + (x2 - x1) * s / L + nx * .75, z = z1 + (z2 - z1) * s / L + nz * .75, g = GOODS_GEO[kind].clone();
        g.rotateY(Math.atan2(x2 - x1, z2 - z1) + Math.PI / 2); g.translate(x, .15, z); parts.push(g);
        const key = Math.round(x * 2) + ',' + Math.round(z * 2); if (!GOODS_OBS.has(key)){ GOODS_OBS.add(key); ogAdd({ minX: x - .45, maxX: x + .45, minZ: z - .45, maxZ: z + .45 }); }
      }
    }
  }
  if (parts.length){ const m = new THREE.Mesh(mergeGeometries(parts), arMat); m.castShadow = !LOW; m.matrixAutoUpdate = false; m.updateMatrixWorld(true); grp.add(m); }
}
{ const _bl = cityBaseLayer; cityBaseLayer = function(grp, ox, oz){ _bl(grp, ox, oz); try { cityGoods(grp, ox, oz); } catch (e){} }; }

// ---------- the corniche beaches: sand between the corniche and the sea, rows of umbrellas and plastic chairs, a gate sign ----------
const CBEACHES = [['الشاطبي', 31.2118, 29.9105], ['كامب شيزار', 31.2148, 29.9215], ['الإبراهيمية', 31.2165, 29.9265], ['سبورتنج', 31.2195, 29.9335], ['كليوباترا', 31.2238, 29.9405], ['مصطفى كامل', 31.2290, 29.9465], ['ستانلي', 31.2352, 29.9488]]
  .map(([n, la, lo]) => { const [x, z] = cityLL(la, lo); return { n, x, z, built: false, grp: null }; });
// the beach is a strip of sand on the sea side of the corniche wall (as in Alexandria: the road runs right along the water)
const BEACH_CELLS = new Set(), BEACH_Y = new Map(), bkey = (x, z) => Math.round(x / 2) + ',' + Math.round(z / 2);
// the sand slopes from just under the promenade (−0.25 m) down to the water's edge (the sea is at −1.1)
const beachLandDist = (x, z, W) => { for (let r = 2; r <= W; r += 2) for (let a = 0; a < 6.28; a += .785) if (cityR(x + Math.sin(a) * r, z + Math.cos(a) * r) >= 1) return r; return W + 2; };
// the height of the sand at a cell corner: the mean of the (up to 4) beach cells that share it
function beachCorner(x, z){ let s = 0, n = 0; for (const dx of [-1, 1]) for (const dz of [-1, 1]){ const y = BEACH_Y.get(bkey(x + dx, z + dz)); if (y !== undefined){ s += y; n++; } } return n ? s / n : -.25; }
// plastic beach chairs (white / blue / yellow): a seat, a back, four legs — merged once, copied for every chair
const BCHAIR = (() => { const q = []; box(q, .46, .04, .44, 0, .42, 0, '#ffffff'); { const b = new THREE.BoxGeometry(.46, .46, .04); b.rotateX(-.22); b.translate(0, .66, -.24); q.push(colored(b, '#ffffff')); }
  for (const [x, z] of [[-.2, -.18], [.2, -.18], [-.2, .18], [.2, .18]]){ const l = new THREE.CylinderGeometry(.018, .022, .42, 5); l.translate(x, .21, z); q.push(colored(l, '#ffffff')); }
  return mergeGeometries(q.map(g => g.index ? g.toNonIndexed() : g)); })();
function buildCityBeach(B){
  const S = 2, R0 = 180, W = 18, sfB = {};
  const landNear = (x, z) => { for (let a = 0; a < 6.28; a += .52) for (let r = 2; r <= W; r += 4) if (cityR(x + Math.sin(a) * r, z + Math.cos(a) * r) >= 1) return true; return false; };
  const cells = [], P = [], U = [];
  for (let z = B.z - R0; z <= B.z + R0; z += S){
    for (let x = B.x - R0; x <= B.x + R0; x += S){
      const ok = x <= B.x + R0 && Math.hypot(x - B.x, z - B.z) < R0 && cityR(x, z) === 0 && !inPatch(x, z) && landNear(x, z) && ![[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, 2], [2, -2], [-2, -2]].some(([a, b]) => cityR(x + a, z + b) === 1);
      if (ok){ const d = beachLandDist(x, z, W), y = -.25 - .045 * d; cells.push([x, z, y]); BEACH_CELLS.add(bkey(x, z)); BEACH_Y.set(bkey(x, z), y); }
    }
  }
  if (cells.length < 40) return null;
  for (const [x, z] of cells){ const x0 = x - S / 2, x1 = x + S / 2, z0 = z - S / 2, z1 = z + S / 2, a = beachCorner(x0, z0), b = beachCorner(x0, z1), c = beachCorner(x1, z1), e = beachCorner(x1, z0);
    P.push(x0, a, z0, x0, b, z1, x1, c, z1, x0, a, z0, x1, c, z1, x1, e, z0); U.push(x0 / 6, z0 / 6, x0 / 6, z1 / 6, x1 / 6, z1 / 6, x0 / 6, z0 / 6, x1 / 6, z1 / 6, x1 / 6, z0 / 6); }
  const grp = new THREE.Group(), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.computeVertexNormals();
  const sand = new THREE.Mesh(g, sandMat); sand.receiveShadow = true; grp.add(sand);
  const p = []; let k = 0, gate = null, gd = 1e9;
  for (const [x, z, cy] of cells){
    const toLand = [2, 4].some(r => [[0, r], [r, 0], [0, -r], [-r, 0]].some(([a, b]) => cityR(x + a, z + b) >= 1));
    if (toLand){ const d = Math.hypot(x - B.x, z - B.z); if (d < gd){ gd = d; gate = [x, z]; } continue; }   // keep the foot of the wall clear
    const ix = Math.round(x / S), iz = Math.round(z / S);
    if (((ix % 3) + 3) % 3 !== 0 || ((iz % 3) + 3) % 3 !== 0 || (((ix * 13 + iz * 7) & 7) > 5)) continue;
    const col = ['#c0392b', '#1f5fa8', '#e0a21a', '#2e7d32', '#f1ead8', '#c2185b'][(k++) % 6];
    cyl(p, .04, .04, 2.3, x, cy + 1.15, z, '#e8e4da'); { const cn = new THREE.ConeGeometry(1.25, .55, 14, 1, true); cn.translate(x, cy + 2.28, z); p.push(colored(cn, col)); }
    for (const s of [-1, 1]){ if (sfPush(sfB, (k + s) % 2 ? 'beach-chair-white' : 'beach-chair-blue', x + s * .8, beachCorner(x + s * .8, z + .6) + .02, z + .6, s * .5)) continue; const ch = BCHAIR.clone(), c2 = new THREE.Color(['#f2f2f2', '#2e6fbf', '#e8b21a'][(k + s + 3) % 3]), C = ch.attributes.color; for (let i = 0; i < C.count; i++) C.setXYZ(i, c2.r, c2.g, c2.b);
      ch.rotateY(s * .5 + Math.PI); ch.translate(x + s * .8, beachCorner(x + s * .8, z + .6) + .02, z + .6); p.push(ch); }
    ogAdd({ minX: x - .1, maxX: x + .1, minZ: z - .1, maxZ: z + .1 });
  }
  let f = 0; for (const [x, z, cy] of cells){ if (f >= 3) break; if (((Math.round(x) * 31 + Math.round(z) * 17) & 31) !== 5) continue; if (!sfPush(sfB, 'fresca-box', x, cy, z, x)){ const q = AR_GEO.fresca.clone(); q.rotateY(x); q.translate(x, cy, z); p.push(q); } f++; }
  // Stanley's row of beach cabins along the foot of the wall
  if (B.n === 'ستانلي' && SFM['beach-cabins-row']){ let n = 0; for (const [x, z, cy] of cells){ if (n >= 3) break; const toLand = [3, 5].some(r => [[0, r], [r, 0], [0, -r], [-r, 0]].some(([a, b]) => cityR(x + a, z + b) >= 1)); if (!toLand || ((Math.round(x / 2) + Math.round(z / 2)) % 9)) continue;
    let ax = 0, az = 0; for (const [a, b] of [[0, 4], [4, 0], [0, -4], [-4, 0]]) if (cityR(x + a, z + b) >= 1){ ax += a; az += b; } sfPush(sfB, 'beach-cabins-row', x, cy, z, Math.atan2(ax, az)); n++; } }
  sfFlush(grp, sfB);
  if (p.length){ const m = new THREE.Mesh(mergeGeometries(p.map(q => q.index ? q.toNonIndexed() : q)), arMat); m.castShadow = !LOW; grp.add(m); }
  if (gate) glowSigns.push(signBoard(bigSign('شاطئ ' + B.n, '#0d4f7a', '#ffffff', 640, 120, 58), gate[0], 2.4, gate[1], 3.2, .6, Math.atan2(B.x - gate[0], B.z - gate[1]), .3)); scene.add(grp); return grp;
}
// you can step over the corniche wall onto the sand and walk on it
if (CITY){
  const _iwB = inWorld, _gyB = groundY;
  inWorld = function(x, z){ return _iwB(x, z) || (BEACH_CELLS.size > 0 && BEACH_CELLS.has(bkey(x, z))); };
  groundY = function(x, z){ if (BEACH_CELLS.size && cityR(x, z) === 0 && BEACH_Y.has(bkey(x, z))){ const cx = Math.round(x / 2) * 2, cz = Math.round(z / 2) * 2, fx = (x - cx + 1) / 2, fz = (z - cz + 1) / 2;
    const a = beachCorner(cx - 1, cz - 1), b = beachCorner(cx + 1, cz - 1), c = beachCorner(cx - 1, cz + 1), d = beachCorner(cx + 1, cz + 1); return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz; } return _gyB(x, z); };
}

// ---------- footbridges over the corniche road (Sporting, Ibrahimia, Shatby) ----------
const CFOOT = [[31.2190, 29.9325], [31.2163, 29.9262], [31.2112, 29.9120]].map(([la, lo]) => { const [x, z] = cityLL(la, lo); return { x, z, built: false }; });
function buildFootbridge(F){
  const q = graphNearest(F.x, F.z, 400, e => /الجيش/.test(e.name || '')); if (!q) return null;
  const o = edgeAt(q.e, q.s), nx = -o.fz, nz = o.fx, half = q.e.w / 2 + 3.2, p = [], y = 5.6, rot = Math.atan2(nx, nz);
  const grp = new THREE.Group();
  { const deck = new THREE.BoxGeometry(2.4, .35, half * 2 + 2.6); deck.rotateY(rot); deck.translate(q.x, y, q.z); p.push(colored(deck, '#a9a39a')); }
  for (const s of [-1, 1]){ const r = new THREE.BoxGeometry(.06, .9, half * 2 + 2.6); r.translate(s * 1.17, .6, 0); r.rotateY(rot); r.translate(q.x, y, q.z); p.push(colored(r, '#1f5fa8')); }
  for (const s of [-1, 1]){
    const tx = q.x + nx * s * (half + 1.3), tz = q.z + nz * s * (half + 1.3);
    const t = new THREE.BoxGeometry(2.6, y, 2.6); t.translate(tx, y / 2, tz); p.push(colored(t, '#bdb5a6'));
    for (let i = 0; i < 6; i++){ const st = new THREE.BoxGeometry(2.6, .2, .5); st.rotateY(rot + Math.PI / 2); st.translate(tx + o.fx * (1.6 + i * .5), .15 + i * .9, tz + o.fz * (1.6 + i * .5)); p.push(colored(st, '#9e978c')); }
    ogAdd({ minX: tx - 1.3, maxX: tx + 1.3, minZ: tz - 1.3, maxZ: tz + 1.3 });
  }
  const m = new THREE.Mesh(mergeGeometries(p.map(g => g.index ? g.toNonIndexed() : g)), arMat); m.castShadow = !LOW; m.receiveShadow = true; grp.add(m);
  if (SFM.footbridge && typeof sfGroup === 'function'){ m.visible = false; const fb = sfGroup('footbridge'); fb.scale.x = ((half + 2.6) * 2) / 26.9; fb.position.set(q.x, .15, q.z); fb.rotation.y = rot - Math.PI / 2; grp.add(fb); }   // the real footbridge (stairs and towers stay solid as before)
  glowSigns.push(signBoard(bigSign('كوبري مشاة', '#1f5fa8', '#ffffff', 512, 110, 54), q.x + o.fx * 1.25, y + .1, q.z + o.fz * 1.25, 3, .6, Math.atan2(o.fx, o.fz), .2)); scene.add(grp); return grp;
}

// ---------- the railway yards at Qabbari and behind Misr station: gravel, tracks, a few goods wagons ----------
const YARD_WAGONS = [];   // where they stand (the real wagon model replaces the drawn ones: 19zzzzz-sf3)
(async () => {
  if (!CITY) return;
  let d = null; try { d = await fetch('assets/city/yards.json').then(r => r.ok ? r.json() : null); } catch (e){}
  if (!d) return;
  const g = d.ground, P = new Float32Array(g.v.length * 3), U = new Float32Array(g.v.length * 2);
  g.v.forEach(([x, z], k) => { P.set([x, .16, z], k * 3); U.set([x / 3, z / 3], k * 2); });
  const idx = g.i.slice(); for (let k = 0; k < idx.length; k += 3){ const a = g.v[idx[k]], b = g.v[idx[k + 1]], c = g.v[idx[k + 2]]; if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0){ const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(U, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const gm = new THREE.Mesh(geo, CT_BED); gm.receiveShadow = true; scene.add(gm);
  const rails = [];
  for (const L of d.lines) for (let i = 1; i < L.length; i++){
    const [ax, az] = L[i - 1], [bx, bz] = L[i], dd = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / dd, nz = (bx - ax) / dd, y = .2;
    for (const off of [-.72, .72]){ const a0 = off - .05, a1 = off + .05; rails.push(ax + nx * a0, y, az + nz * a0, ax + nx * a1, y, az + nz * a1, bx + nx * a1, y, bz + nz * a1, ax + nx * a0, y, az + nz * a0, bx + nx * a1, y, bz + nz * a1, bx + nx * a0, y, bz + nz * a0); }
  }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rails, 3)); rg.computeVertexNormals(); scene.add(new THREE.Mesh(rg, CT_RAIL));
  const wp = []; let n = 0;
  for (const L of d.lines){
    if (n > 40) break; if (L[0][1] > -900) continue;   // the Qabbari goods yard, south-west
    for (let i = 1; i < L.length && n <= 40; i++){
      const [ax, az] = L[i - 1], [bx, bz] = L[i], dd = Math.hypot(bx - ax, bz - az); if ((i * 7 + n) % 3 !== 0 || dd < 14) continue;
      const yaw = Math.atan2(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2, w = new THREE.BoxGeometry(2.8, 2.6, 12.5); w.translate(0, 1.75, 0); w.rotateY(yaw); w.translate(cx, .15, cz);
      wp.push(colored(w, ['#6d4c41', '#455a64', '#8d6e63', '#37474f'][n % 4])); YARD_WAGONS.push([cx, .15, cz, yaw]);
      for (let k = -2; k <= 2; k++) ogAdd({ minX: cx + Math.sin(yaw) * k * 2.5 - 1.5, maxX: cx + Math.sin(yaw) * k * 2.5 + 1.5, minZ: cz + Math.cos(yaw) * k * 2.5 - 1.5, maxZ: cz + Math.cos(yaw) * k * 2.5 + 1.5 });
      n++;
    }
  }
  if (wp.length){ const m = new THREE.Mesh(mergeGeometries(wp.map(q => q.index ? q.toNonIndexed() : q)), arMat); m.castShadow = !LOW; m.name = 'yardWagons'; scene.add(m); }
})();

if (CITY){
  const _uc2 = updateCity; let tB = 0;
  updateCity = function(px, pz){
    _uc2(px, pz); const now = performance.now(); if (now - tB < 500) return; tB = now;
    for (const B of CBEACHES){ if (!B.built && Math.hypot(B.x - px, B.z - pz) < 380 && cityReady(B.x, B.z, 170)){ B.built = true; B.grp = buildCityBeach(B); return; } if (B.grp) B.grp.visible = Math.hypot(B.x - px, B.z - pz) < 460; }
    for (const F of CFOOT){ if (!F.built && Math.hypot(F.x - px, F.z - pz) < 380 && cityReady(F.x, F.z, 40)){ F.built = true; F.grp = buildFootbridge(F); return; } }
  };
}

// ---------- the city's sea is water: you swim in it, dive in from the corniche, climb out where the shore is low ----------
// (the old swimming only knew the «حتة»'s bay; out in the city the sea was solid ground at y = 0)
if (CITY){
  const citySea = (x, z) => !inPatch(x, z) && cityR(x, z) === 0 && !BEACH_CELLS.has(bkey(x, z));
  const _ow = overWater; overWater = function(x, z){ return _ow(x, z) || (!HOUSE.inside && citySea(x, z) && !stairAt(x, z)); };
  const _is = inSea; inSea = function(x, z){ return _is(x, z) || citySea(x, z); };
  const _so = swimOK; swimOK = function(x, z){ return citySea(x, z) || _so(x, z); };
  // walking into the sea's edge on the corniche: over the wall and in
  const _vd = vaultDir; vaultDir = function(p, wx, wz){
    const r = _vd(p, wx, wz); if (r || HOUSE.inside || inPatch(p.x, p.z)) return r;
    const m = Math.hypot(wx, wz); if (m < .35) return null; const dx = wx / m, dz = wz / m;
    if (!citySea(p.x, p.z) && citySea(p.x + dx * 1.4, p.z + dz * 1.4) && citySea(p.x + dx * 3, p.z + dz * 3)) return { dx, dz, sp: 6.5 };
    return null;
  };
  // a swimmer beside the shore pulls himself out onto it
  const _ct = climbTarget; climbTarget = function(p){
    const t = _ct(p); if (t || inPatch(p.x, p.z) || !citySea(p.x, p.z)) return t;
    for (let a = 0; a < 6.28; a += .39) for (const r of [1.2, 2, 2.8]){ const x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r, v = cityR(x, z);
      if (v >= 1 && v < 10 && inWorld(x, z) && !staticBlocked(x, z, .4)){ const [fx, fz] = freeSpot(x, z); return new THREE.Vector3(fx, groundY(fx, fz), fz); } }
    return null;
  };
}
