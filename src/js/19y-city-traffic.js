// ================= the real streets: the road graph, routes (GPS / police), traffic, walkers, parked cars =================
// assets/city/graph.json: nodes [x,z] and edges {a,b,pts,w,cls,ow,len} (03c-city.js loads it). Traffic drives on the right
// of real streets and turns at real junctions; walkers go round real blocks (walk.json); parked cars line the side streets
// (parked.json). All of it lives near the player and is moved along as you go, so the whole city costs the same as the old map.
const RG = (() => {
  const N = CGRAPH.nodes, E = CGRAPH.edges, adj = N.map(() => []), cell = 64, grid = new Map();
  E.forEach((e, i) => {
    const p = e.pts, cum = [0]; for (let k = 1; k < p.length; k++) cum.push(cum[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]));
    e.cum = cum; e.L = cum[cum.length - 1] || .01; e.i = i;
    adj[e.a].push({ e: i, d: 1 }); adj[e.b].push({ e: i, d: -1 });
    const put = (x, z) => { const key = Math.floor(x / cell) * 100000 + Math.floor(z / cell); let l = grid.get(key); if (!l) grid.set(key, l = new Set()); l.add(i); };
    for (let k = 0; k < p.length; k++){ put(p[k][0], p[k][1]); if (k){ const L = Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]), n = Math.ceil(L / (cell / 2)); for (let j = 1; j < n; j++) put(p[k - 1][0] + (p[k][0] - p[k - 1][0]) * j / n, p[k - 1][1] + (p[k][1] - p[k - 1][1]) * j / n); } }
  });
  return { N, E, adj, cell, grid };
})();
// a point along an edge, s metres from its start (a), with its direction
function edgeAt(e, s, out = {}){
  s = clamp(s, 0, e.L); const c = e.cum, p = e.pts; let k = 1; while (k < c.length - 1 && c[k] < s) k++;
  const t = (s - c[k - 1]) / ((c[k] - c[k - 1]) || 1), ax = p[k - 1][0], az = p[k - 1][1], bx = p[k][0], bz = p[k][1], L = Math.hypot(bx - ax, bz - az) || 1;
  out.x = ax + (bx - ax) * t; out.z = az + (bz - az) * t; out.fx = (bx - ax) / L; out.fz = (bz - az) / L; return out;
}
// the nearest point on the road network (for cars: not footpaths, the graph only has roads)
function graphNearest(x, z, maxD = 90, filter){
  const c = RG.cell, gx = Math.floor(x / c), gz = Math.floor(z / c), r = Math.ceil(maxD / c); let best = null, bd = maxD;
  for (let i = gx - r; i <= gx + r; i++) for (let k = gz - r; k <= gz + r; k++){
    const l = RG.grid.get(i * 100000 + k); if (!l) continue;
    for (const ei of l){ const e = RG.E[ei]; if (filter && !filter(e)) continue; const p = e.pts;
      for (let j = 1; j < p.length; j++){ const ax = p[j - 1][0], az = p[j - 1][1], dx = p[j][0] - ax, dz = p[j][1] - az, L2 = dx * dx + dz * dz || 1;
        const t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1), qx = ax + dx * t, qz = az + dz * t, d = Math.hypot(x - qx, z - qz);
        if (d < bd){ bd = d; best = { e, s: e.cum[j - 1] + Math.sqrt(L2) * t, d, x: qx, z: qz }; } } }
  }
  return best;
}
const RFAIL = new Set();   // pairs of streets with no way between them (the graph has a few islands)
// shortest way along the streets (A*), as a list of points; null when there is none
function graphRoute(from, to, drive = true){
  const A = graphNearest(from.x, from.z, 120), B = graphNearest(to.x, to.z, 160); if (!A || !B) return null;
  if (A.e === B.e){ const out = []; const st = Math.min(A.s, B.s), en = Math.max(A.s, B.s); for (let s = st; s <= en; s += 10) out.push(edgeAt(A.e, s)); if (A.s > B.s) out.reverse(); out.push({ x: B.x, z: B.z }); return out; }
  const fk = A.e.i + ':' + B.e.i + ':' + drive; if (RFAIL.has(fk)) return null;
  const N = RG.N, g = new Map(), came = new Map(), closed = new Set(), H = n => Math.hypot(N[n][0] - B.x, N[n][1] - B.z);
  const heap = [], hpush = (f, n) => { heap.push([f, n]); let i = heap.length - 1; while (i){ const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const hpop = () => { const top = heap[0], last = heap.pop(); if (heap.length){ heap[0] = last; let i = 0; for (;;){ const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const push = (n, cost, from, via) => { if (closed.has(n) || (g.has(n) && g.get(n) <= cost)) return; g.set(n, cost); came.set(n, [from, via]); hpush(cost + H(n), n); };
  const ea = A.e; if (!(drive && ea.ow)) push(ea.a, A.s, -1, null); push(ea.b, ea.L - A.s, -2, null);
  if (drive && ea.ow) { /* one way: only forward (to b) */ }
  const goalA = B.e.a, goalB = B.e.b; let goal = -1, it = 0;
  while (heap.length && it++ < 20000){
    const [, n] = hpop(); if (closed.has(n)) continue; closed.add(n);
    if (n === goalA || n === goalB){ goal = n; break; }
    const gn = g.get(n);
    for (const { e: ei, d } of RG.adj[n]){ const e = RG.E[ei]; if (drive && e.ow && d < 0) continue; const m = d > 0 ? e.b : e.a; push(m, gn + e.L * (e.cls === 'service' ? 1.4 : e.cls === 'major' ? .85 : 1) * (drive && e.w < 5.5 ? 4 : 1), n, [ei, d]); }
  }
  if (goal < 0){ RFAIL.add(fk); return null; }
  const legs = []; let n = goal; while (true){ const [p, via] = came.get(n); if (!via) break; legs.push(via); n = p; } legs.reverse();
  const out = [{ x: A.x, z: A.z }];
  for (const [ei, d] of legs){ const e = RG.E[ei], pts = d > 0 ? e.pts : [...e.pts].reverse(); for (let k = 1; k < pts.length; k++) out.push({ x: pts[k][0], z: pts[k][1] }); }
  // the last bit along the goal edge
  const e = B.e, sFrom = goal === e.a ? 0 : e.L, step = sFrom < B.s ? 8 : -8; for (let s = sFrom; (step > 0 ? s < B.s : s > B.s); s += step) out.push(edgeAt(e, s));
  out.push({ x: B.x, z: B.z });
  return out;
}
// the GPS and the police use the real streets (the old grid helpers stay for the «حتة» if there is no graph)
if (RG.E.length){
  const _roadPathOld = roadPath;
  roadPath = function(from, to){ const r = graphRoute(from, to, true) || graphRoute(from, to, false); if (!r) return inPatch(from.x, from.z) && inPatch(to.x, to.z) ? _roadPathOld(from, to) : [new THREE.Vector3(from.x, 0, from.z), new THREE.Vector3(to.x, 0, to.z)]; const V3 = p => new THREE.Vector3(p.x, 0, p.z); const out = [V3(r[0])]; for (const p of r) if (Math.hypot(p.x - out[out.length - 1].x, p.z - out[out.length - 1].z) > 4) out.push(V3(p)); out.push(new THREE.Vector3(to.x, 0, to.z)); return out; };
  polRoute = function(from, to){ return roadPath(from, to); };
}

// ---------------- traffic on the graph ----------------
const TRF = { recycle: LOW ? 200 : 260, ring: [90, LOW ? 190 : 240] };
const TUK_DIST = new Set(['bahary', 'karmouz', 'moharram', 'manshiya', 'attarin']);
const laneOff = e => e.ow ? (e.w > 9 ? e.w / 4 : 0) : Math.min(e.w / 4, 3.2);
function trafficSpawn(c, near, minD, maxD){
  const u = c.userData; const p = near || heroAt();
  for (let tries = 0; tries < 40; tries++){
    const a = Math.random() * Math.PI * 2, r = minD + Math.random() * (maxD - minD), x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
    const tuk = u.kind === 'tuk';
    const q = graphNearest(x, z, 60, e => e.cls !== 'service' && e.L > 20 && (!tuk || (e.cls === 'minor' && e.w <= 7)) && (u.kind !== 'micro' || /الجيش|كورنيش/.test(e.name || ''))); if (!q) continue;
    if (inPatch(q.x, q.z)) continue;
    if (tuk){ const d = cityDistrict(q.x, q.z); if (!d || !TUK_DIST.has(d.h)) continue; }   // tuk-tuks only in the old quarters' side streets
    u.ge = q.e.i; u.gd = q.e.ow ? 1 : (Math.random() < .5 ? 1 : -1); u.gs = u.gd > 0 ? q.s : q.e.L - q.s;
    u.speed = 6; u.vis = null; u.off = false; c.visible = true; u.graph = true; u.waitT = 0; u.ghostT = 0;
    trafficPlace(c, 0); return true;
  }
  return false;
}
const _tp = {};
function trafficPlace(c, dt){
  const u = c.userData, e = RG.E[u.ge], s = u.gd > 0 ? u.gs : e.L - u.gs; edgeAt(e, s, _tp);
  const fx = _tp.fx * u.gd, fz = _tp.fz * u.gd, off = laneOff(e), x = _tp.x - fz * off, z = _tp.z + fx * off;
  // a little smoothing so lane changes at junctions don't jump
  if (!u.vis || !dt){ u.vis = { x, z, yaw: Math.atan2(fx, fz) }; } else { const k = damp(9, dt); u.vis.x += (x - u.vis.x) * k; u.vis.z += (z - u.vis.z) * k; u.vis.yaw = lerpAngle(u.vis.yaw, Math.atan2(fx, fz), damp(7, dt)); }
  c.position.set(u.vis.x, 0, u.vis.z); c.rotation.y = u.vis.yaw;
}
function trafficNext(c){
  const u = c.userData, e = RG.E[u.ge], node = u.gd > 0 ? e.b : e.a;
  const opts = RG.adj[node].filter(o => o.e !== u.ge && !(RG.E[o.e].ow && o.d < 0) && RG.E[o.e].cls !== 'service');
  if (u.kind === 'micro'){ const same = opts.filter(o => /الجيش|كورنيش/.test(RG.E[o.e].name || '')); if (same.length) opts.splice(0, opts.length, ...same); }
  if (u.kind === 'tuk'){ const side = opts.filter(o => RG.E[o.e].cls === 'minor' && RG.E[o.e].w <= 7); if (side.length) opts.splice(0, opts.length, ...side); }
  let pick2 = opts.length ? opts[Math.floor(Math.random() * opts.length)] : null;
  // prefer going on straight-ish (cars mostly keep to their street)
  if (opts.length > 1 && Math.random() < .55){ const dir = edgeAt(e, u.gd > 0 ? e.L - .5 : .5); const fx = dir.fx * u.gd, fz = dir.fz * u.gd; let best = -2; for (const o of opts){ const ne = RG.E[o.e], q = edgeAt(ne, o.d > 0 ? 1 : ne.L - 1); const dot = (q.fx * o.d) * fx + (q.fz * o.d) * fz; if (dot > best){ best = dot; pick2 = o; } } }
  if (!pick2){ if (e.ow){ return false; } u.gd = -u.gd; u.gs = 0; return true; }   // dead end: turn round
  u.ge = pick2.e; u.gd = pick2.d; u.gs = 0; return true;
}
const _owTrafficStep = trafficStep;
trafficStep = function(c, dt, t, playing){
  const u = c.userData;
  if (!u.graph){ if (!RG.E.length) return _owTrafficStep(c, dt, t, playing); if (!trafficSpawn(c, null, 30, TRF.ring[1])){ u.off = true; c.visible = false; return; } }
  if (u.off && !u.offByHour){ u.offT = (u.offT || 0) - dt; if (u.offT <= 0){ u.offT = 3; if (!HOUSE.inside && trafficSpawn(c, null, TRF.ring[0], TRF.ring[1])) u.off = false; } return; }
  if (u.off || u.jackHold || HOUSE.inside) return;   // inside a house / shop / the cave: the street waits
  const f = heroAt();
  if (Math.hypot(c.position.x - f.x, c.position.z - f.z) > TRF.recycle){ if (!trafficSpawn(c, null, TRF.ring[0], TRF.ring[1])){ u.off = true; c.visible = false; } return; }
  const e = RG.E[u.ge]; let target = u.base * (e.cls === 'major' ? 1.25 : e.cls === 'minor' ? .85 : .6);
  if (u.paradeT > 0) target = Math.min(target, 4.5);
  u.ghostT -= dt; u.honkT -= dt; u.held = false;
  if (u.ghostT <= 0){
    for (const o of traffic){ if (o === c || o.userData.off) continue; const L = carLocal(c, o.position); if (L.along > 0 && L.along < 9 && Math.abs(L.lat) < 1.8) target = Math.min(target, L.along < 5 ? 0 : o.userData.speed); }
    if (hero.veh){ const L = carLocal(c, hero.veh.pos); if (L.along > 0 && L.along < 10 && Math.abs(L.lat) < 2){ target = 0; u.held = true; } }
    else if (!HOUSE.inside){ const L = carLocal(c, hero.pos); if (L.along > 0 && L.along < 8 && Math.abs(L.lat) < 1.6){ target = 0; u.held = true; if (playing && u.honkT <= 0 && L.along < 6){ u.honkT = R(2.5, 5); if (c.position.distanceTo(hero.pos) < 25) horn(); } } }
    for (const n of npcs){ if (n.state === 'hidden' || !n.g.visible) continue; const L = carLocal(c, n.g.position); if (L.along > 0 && L.along < 6 && Math.abs(L.lat) < 1.3){ target = Math.min(target, L.along < 3.5 ? 0 : 2); u.held = true; } }
    // slow down for the turn at the end of the street
    const left = e.L - u.gs; if (left < 14) target = Math.min(target, 5 + left * .5);
  }
  if (target === 0 && u.speed < .3 && !u.held){ u.waitT += dt; if (u.waitT > 3.5){ u.ghostT = 1.6; u.waitT = 0; } } else u.waitT = 0;
  u.speed += (target - u.speed) * damp(target < u.speed - 1 ? 5.5 : 3, dt);
  u.gs += u.speed * dt;
  let guard = 0; while (u.gs >= RG.E[u.ge].L && guard++ < 4){ const over = u.gs - RG.E[u.ge].L; if (!trafficNext(c)){ trafficSpawn(c, null, TRF.ring[0], TRF.ring[1]); return; } u.gs = over; }
  trafficPlace(c, dt);
};
placeTraffic = function(c){ if (c.userData.graph) trafficPlace(c, 0); };
// at the start, the cars come out round the player
function trafficAround(p){ for (const c of traffic){ c.userData.graph = false; c.userData.vis = null; if (RG.E.length) trafficSpawn(c, p, 25, TRF.ring[1]); } }

// ---------------- walkers round real blocks ----------------
const WALK = CITY ? await fetch('assets/city/walk.json').then(r => r.json()).catch(() => []) : [];
WALK.forEach(w => { const p = w.p, cum = [0]; for (let k = 1; k < p.length; k++) cum.push(cum[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1])); w.cum = cum; w.L = cum[cum.length - 1] || 1; w.cx = w.c[0]; w.cz = w.c[1]; });
const _perimOld = perimPos;
perimPos = function(b, t){
  if (!b || !b.p) return _perimOld(b, t);
  const L = b.L, s = ((t / 4) % 1 + 1) % 1 * L, c = b.cum, p = b.p; let k = 1; while (k < c.length - 1 && c[k] < s) k++;
  const f = (s - c[k - 1]) / ((c[k] - c[k - 1]) || 1); let x = p[k - 1][0] + (p[k][0] - p[k - 1][0]) * f, z = p[k - 1][1] + (p[k][1] - p[k - 1][1]) * f;
  if (cityR(x, z) >= 10 && b.c){ const dx = x - b.c[0], dz = z - b.c[1], d = Math.hypot(dx, dz) || 1;   // a corner that cuts into a house: step out onto the pavement
    for (const st of [.5, 1, 1.5, 2, 2.5]){ const nx = x + dx / d * st, nz = z + dz / d * st, v = cityR(nx, nz); if (v >= 2 && v < 10){ x = nx; z = nz; break; } } }
  return [x, z];
};
// a block round the player, not too close (so people don't pop up in front of you)
function walkNear(p, minD = 35, maxD = 170){
  const L = []; for (const w of WALK){ const d = Math.hypot(w.cx - p.x, w.cz - p.z); if (d > minD && d < maxD) L.push(w); }
  return L.length ? L[Math.floor(Math.random() * L.length)] : null;
}
const nearBlocks = (p, maxD = 260, minD = 0) => blocksInfo.map((b, i) => [b, i]).filter(([b]) => { const d = Math.hypot(b.cx - p.x, b.cz - p.z); return d < maxD && d >= minD; });
const _rspOld = randomSidewalkPoint;
randomSidewalkPoint = function(minD, from){ const f = from || heroAt(); const w = WALK.length ? walkNear(f, minD || 20, 240) : null; if (w){ const q = perimPos(w, R(0, 4)); return new THREE.Vector3(q[0], .15, q[1]); } const L = nearBlocks(f, 300, minD || 0); if (L.length){ const [b] = pick(L); const q = perimPos(b, R(0, 4)); return new THREE.Vector3(q[0], .15, q[1]); } return _rspOld(minD, from); };
const _setWalkerOld = setWalker;
setWalker = function(n){
  _setWalkerOld(n); n.blk = null;
  const f = typeof heroAt === 'function' ? heroAt() : hero.pos;
  { const L = nearBlocks(f); if (L.length && Math.hypot(blocksInfo[n.block].cx - f.x, blocksInfo[n.block].cz - f.z) > 260){ n.block = pick(L)[1]; const q = perimPos(blocksInfo[n.block], n.t); n.g.position.set(q[0], .15, q[1]); } }
  if (WALK.length && (!inPatch(f.x, f.z) || Math.random() < .25)){ const w = walkNear(f); if (w){ n.blk = w; n.block = -1; n.t = R(0, 4); const q = perimPos(w, n.t); n.g.position.set(q[0], .15, q[1]); } }
};
// walkers far behind are moved to blocks near the player (the old «حتة» walkers too, when you've left it)
const WLK = { t: 0 };
function updateCityWalkers(dt){
  WLK.t -= dt; if (WLK.t > 0) return; WLK.t = .7;
  const f = heroAt();
  for (const n of npcs){
    if (n.role !== 'walker' || n.state !== 'walk') continue;
    const d = Math.hypot(n.g.position.x - f.x, n.g.position.z - f.z);
    if (d > (LOW ? 150 : 190)){ const w = walkNear(f, 70, 160); if (w){ n.blk = w; n.block = -1; n.t = R(0, 4); const q = perimPos(w, n.t); n.g.position.set(q[0], .15, q[1]); } else if (inPatch(f.x, f.z)) { n.blk = null; _setWalkerOld(n); } }
  }
}

// ---------------- parked cars along the side streets ----------------
const PARKED = CITY ? await fetch('assets/city/parked.json').then(r => r.json()).catch(() => []) : [];
const PKC = { pool: [], t: 0, used: new Set() };
if (PARKED.length){
  const n = LOW ? 14 : GFX === 'mid' ? 22 : 30;
  for (let i = 0; i < n; i++){ const v = addVehicle(rng() < .25 ? 'taxi' : 'car', 0, -3000 - i * 6, 0, rng() < .25 ? '#f2f2f2' : pick(COLORS)); v.cityParked = true; v.mesh.visible = false; v.parkedSpot = -1; PKC.pool.push(v); FAR_CULL.push({ v, mesh: v.mesh }); }
}
function parkAround(f, force){
  const near = []; for (let i = 0; i < PARKED.length; i += 1){ const s = PARKED[i], d = Math.hypot(s[0] - f.x, s[1] - f.z); if (d > 20 && d < 170 && !PKC.used.has(i)) near.push(i); }
  for (const v of PKC.pool){
    if (hero.veh === v || v.ai || v.owned || v.stolen || (typeof OW_LEFT !== 'undefined' && OW_LEFT.includes(v))) continue;
    const d = Math.hypot(v.pos.x - f.x, v.pos.z - f.z);
    if (!force && v.parkedSpot >= 0 && d < 230) continue;
    if (!near.length) break;
    const k = Math.floor(Math.random() * near.length), i = near.splice(k, 1)[0], s = PARKED[i];
    if (vehBlockedAt(s[0], s[1], 2.2, v)) continue;
    if (v.parkedSpot >= 0) PKC.used.delete(v.parkedSpot); PKC.used.add(i); v.parkedSpot = i;
    v.pos.set(s[0], 0, s[1]); v.yaw = s[2]; v.mesh.rotation.set(0, s[2], 0); v.speed = 0; v.home = { x: s[0], z: s[1], yaw: s[2], y: 0 }; v.mesh.visible = true; v.wrecked = false;
  }
}
function updateCityParked(dt){ if (!PKC.pool.length) return; PKC.t -= dt; if (PKC.t > 0) return; PKC.t = 1.2; parkAround(heroAt(), false); }
function updateCityStreets(dt){ if (HOUSE.inside) return; updateCityWalkers(dt); updateCityParked(dt); }

// an old-map route (a race, a chase, someone walking) → the same trip along the real streets
function cityPath(pts){
  const P = pts.map(([x, z]) => RELOC(x, z));
  if (!RG.E.length) return P;
  const out = [P[0]];
  for (let i = 1; i < P.length; i++){
    const last = out[out.length - 1], r = graphRoute({ x: last[0], z: last[1] }, { x: P[i][0], z: P[i][1] }, false);
    if (r) for (const q of r.slice(1)){ const l = out[out.length - 1]; if (Math.hypot(q.x - l[0], q.z - l[1]) > 3) out.push([q.x, q.z]); }
    else out.push(P[i]);
  }
  return out;
}

// ---------------- the police and the checkpoint on real streets ----------------
if (RG.E.length){
  // a police car comes out on a street round you (or round where you were seen), facing along it
  spawnPoint = function(minR, maxR, ahead){
    const f = POL.on && !POL.seen ? POL.lastSeen : heroAt(), dirA = hero.veh ? hero.veh.yaw : Math.atan2(hero.vel.x, hero.vel.z), o = {};
    for (let k = 0; k < 50; k++){
      const a = ahead && k < 30 ? dirA + (Math.random() - .5) * 1.5 : Math.random() * 6.28, r = minR + Math.random() * (maxR - minR);
      const q = graphNearest(f.x + Math.sin(a) * r, f.z + Math.cos(a) * r, 50, e => e.cls !== 'service' && e.w >= 6); if (!q) continue;
      edgeAt(q.e, q.s, o); const px = q.x, pz = q.z, toward = (f.x - px) * o.fx + (f.z - pz) * o.fz > 0 ? 1 : -1, yaw = Math.atan2(o.fx * toward, o.fz * toward);
      if (Math.hypot(px - f.x, pz - f.z) < minR * .75 || !inWorld(px, pz)) continue;
      if (POL.on && !POL.seen && Math.hypot(px - heroAt().x, pz - heroAt().z) < 75) continue;
      if (onScreen(px, pz) && Math.hypot(px - f.x, pz - f.z) < 150 && lineOfSight(heroAt().x, heroAt().z, px, pz)) continue;
      if (vehBlockedAt(px, pz, 2.6) || staticBlocked(px, pz, 1.6)) continue;
      return { x: px, z: pz, yaw };
    }
    return null;
  };
  // a road block: two cars across the street you're driving on, 125 m ahead
  roadBlock = function(){
    if (!hero.veh || Math.abs(hero.veh.speed) < 9) return false;
    const hv = hero.veh, fx = Math.sin(hv.yaw), fz = Math.cos(hv.yaw);
    const q = graphNearest(hv.pos.x + fx * 125, hv.pos.z + fz * 125, 30, e => e.cls !== 'service'); if (!q) return false;
    const o = edgeAt(q.e, q.s), px = q.x, pz = q.z, nx = o.fz, nz = -o.fx;
    if (!inWorld(px, pz) || (onScreen(px, pz) && lineOfSight(hv.pos.x, hv.pos.z, px, pz) && Math.hypot(px - hv.pos.x, pz - hv.pos.z) < 115)) return false;
    POL_BLOCK.forEach((k, j) => { const u = polUnit(k), s = j ? 1 : -1, P = { x: px + nx * s * 2.6, z: pz + nz * s * 2.6, yaw: Math.atan2(o.fx, o.fz) + Math.PI / 2 };
      if (vehBlockedAt(P.x, P.z, 1.5) || staticBlocked(P.x, P.z, 1.2)) return; activateUnit(u, P); u.block = true; u.blockAt = runTime; u.crewOut = true; copSpawn(u, s); });
    return true;
  };
  // the checkpoint (كمين): on your street 60 m ahead, the police car pulled to the side, the officer beside it
  kameenSpawn = function(){
    const v = hero.veh, fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
    const q = graphNearest(v.pos.x + fx * 60, v.pos.z + fz * 60, 14, e => e.cls !== 'service'); if (!q) return false;
    const o = edgeAt(q.e, q.s), x = q.x, z = q.z, nx = -fz, nz = fx, side = q.e.w / 2 + 1.2;   // your right (you drive on the right)
    if (!inWorld(x, z) || Math.abs(o.fx * fx + o.fz * fz) < .7) return false;   // only when you drive along that street
    actStart('kameen'); const d = ACT.d; d.pos = new THREE.Vector3(x, 0, z); d.alongX = Math.abs(o.fx) > Math.abs(o.fz);
    kameenCar.visible = true; kameenCar.position.set(x + nx * side, 0, z + nz * side); kameenCar.rotation.y = Math.atan2(o.fx, o.fz);
    helperShow(x + nx * (side - 2.3), z + nz * (side - 2.3), Math.atan2(-nx, -nz), 'أمين الشرطة');
    banner('كمين قدامك! هدّي ووقف عند الظابط', 'police', 3); return true;
  };
}
