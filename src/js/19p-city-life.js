// ================= city life: traffic lights, people by the hour, crossing the street, traffic by the hour =================
// Every crossing has a light that cycles: east-west green 10 s, yellow 2.5 s, all red .5 s, then north-south the same.
// Cars stop at the line on yellow and red (a few rude ones don't). People walk round their block and, at a corner,
// sometimes cross to the next block on the zebra when their light is on (a few just cross); cars stop for them.
// How many people and cars are out follows the hour (morning rush, quiet afternoon, busy evenings on the corniche,
// empty streets at 4 am).

// ---- the lights ----
const TL = { list: [], map: new Map(), T: 26, tick: 0 };
const tlKey = (x, z) => Math.round(x) + ',' + Math.round(z);
function tlTime(L){ return (((typeof elapsed === 'number' ? elapsed : 0) + L.off) % TL.T + TL.T) % TL.T; }
function tlPhase(L){ const k = tlTime(L); return k < 10 ? 'gx' : k < 12.5 ? 'yx' : k < 13 ? 'r' : k < 23 ? 'gz' : k < 25.5 ? 'yz' : 'r'; }
// the light a car on `axis` sees at the crossing (x, z): 'g', 'y' or 'r'
function tlFor(L, axis){ const p = tlPhase(L); return p === 'g' + axis ? 'g' : p === 'y' + axis ? 'y' : 'r'; }
const TL_ON = { r: new THREE.Color(1, .12, .1), y: new THREE.Color(1, .72, .1), g: new THREE.Color(.15, 1, .35) };
const TL_OFF = { r: new THREE.Color(.16, .03, .03), y: new THREE.Color(.16, .11, .02), g: new THREE.Color(.03, .13, .05) };
const tlLamps = (() => {
  const poles = [], heads = [], lamps = [];
  for (const xi of ROADS_X) for (const zi of ROADS_Z){
    const L = { x: xi, z: zi, off: R(0, TL.T), phase: '', groups: [] }; TL.list.push(L); TL.map.set(tlKey(xi, zi), L);
    // one pole on the near-right corner for each way in (traffic keeps right), facing the cars that come
    for (const [sx, sz, axis, fx, fz] of [[-1, 1, 'x', -1, 0], [1, -1, 'x', 1, 0], [-1, -1, 'z', 0, -1], [1, 1, 'z', 0, 1]]){
      const px = xi + sx * 6.5, pz = zi + sz * 6.5;   // at the kerb, out of the way of people walking round the corner
      if (!blockAt(px + sx * 4, pz + sz * 4) || staticBlocked(px, pz, .35)) continue;   // only on a free pavement corner
      const ry = Math.atan2(fx, fz);
      poles.push({ x: px, z: pz }); heads.push({ x: px, y: 0, z: pz, ry });
      obstacles.push({ minX: px - .1, maxX: px + .1, minZ: pz - .1, maxZ: pz + .1 });
      const i0 = lamps.length;
      for (const [c, y] of [['r', 3.78], ['y', 3.5], ['g', 3.22]]) lamps.push({ x: px + fx * .15, y, z: pz + fz * .15, ry, c });
      L.groups.push({ axis, i0 });
    }
  }
  const poleGeo = new THREE.CylinderGeometry(.06, .08, 3.9, 6); poleGeo.translate(0, 1.95 + .15, 0);
  instanced(poleGeo, new THREE.MeshStandardMaterial({ color: 0x2b2f33, metalness: .6, roughness: .45 }), poles, true);
  const headGeo = new THREE.BoxGeometry(.32, .98, .24); headGeo.translate(0, 3.5, 0);
  instanced(headGeo, new THREE.MeshStandardMaterial({ color: 0x1a1d20, roughness: .6 }), heads, true);
  const lampGeo = new THREE.BoxGeometry(.2, .2, .06);
  const im = keepWhole(instanced(lampGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), lamps, false));
  lamps.forEach((l, i) => im.setColorAt(i, TL_OFF[l.c]));
  return { im, lamps };
})();
function updateLights(){
  const im = tlLamps.im; if (!im) return; let changed = false;   // the merged city has none of the old grid's lights
  for (const L of TL.list){
    const p = tlPhase(L); if (p === L.phase) continue; L.phase = p; changed = true;
    for (const g of L.groups){ const s = p === 'g' + g.axis ? 'g' : p === 'y' + g.axis ? 'y' : 'r'; ['r', 'y', 'g'].forEach((c, k) => im.setColorAt(g.i0 + k, c === s ? TL_ON[c] : TL_OFF[c])); }
  }
  if (changed) im.instanceColor.needsUpdate = true;
}

// ---- how busy the city is at this hour (0..1) ----
function crowdWanted(h){ return h < 5 ? .15 : h < 7 ? .35 : h < 10 ? .8 : h < 16 ? .6 : h < 23.5 ? 1 : .45; }
function trafficWanted(h){ return h < 5 ? .3 : h < 7 ? .55 : h < 10 ? 1 : h < 16 ? .8 : h < 21 ? 1 : .6; }
// where people are, by the hour: the market in the morning, the corniche and the restaurants in the evening
function blockWeight(b, h){
  const m = h >= 6 && h < 12, a = h >= 12 && h < 17, e = h >= 17 || h < 1;
  const W = { market: m ? 3 : a ? 2 : 1, food: e ? 3 : a ? 2 : 1, corniche: e ? 3 : 1.5, hara: 2, stadium: 1, works: m || a ? 1.5 : .5 };
  return W[b.dist] ?? 1;
}
function pickBlock(h, awayFrom, minD){
  let tot = 0; const c = [];
  blocksInfo.forEach((b, i) => { if (awayFrom && (Math.hypot(b.cx - awayFrom.x, b.cz - awayFrom.z) < minD || Math.hypot(b.cx - awayFrom.x, b.cz - awayFrom.z) > 280)) return; const w = blockWeight(b, h); tot += w; c.push([i, w]); });
  let r = rng() * tot; for (const [i, w] of c){ r -= w; if (r <= 0) return i; } return c.length ? c[c.length - 1][0] : 0;
}

// ---- extra people for the busy hours (on top of the regular walkers) ----
const CROWD = []; for (let i = 0; i < (GFX === 'low' ? 4 : GFX === 'mid' ? 8 : 12); i++){ const n = makeNPC(); n.crowd = true; CROWD.push(n); }
const CROSSERS = new Set();
const isWalkerNPC = n => n.role === 'walker' || n.role === 'crowd';
function crowdPool(){ return npcs.filter(n => (n.crowd && (n.role === 'crowd' || (!n.role && n.state === 'hidden'))) || (!n.crowd && n.role === 'walker')); }
function activateWalker(n){
  const from = heroAt();
  setWalker(n); if (n.crowd) n.role = 'crowd';
  n.timeOff = false; n.crossCD = R(4, 20); n.lastCorner = null;
  if (n.blk) return;   // a real city block (19y) chosen by setWalker
  n.block = pickBlock(TOD.h, from, 45);
  const p = perimPos(blocksInfo[n.block], n.t); n.g.position.set(p[0], .15, p[1]);
}
function deactivateWalker(n){ n.state = 'hidden'; n.g.visible = false; n.timeOff = true; CROSSERS.delete(n); if (n.crowd) n.role = 'crowd'; }

// ---- crossing the street at a corner ----
const CORNER_SIGN = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const cornerIdx = (sx, sz) => CORNER_SIGN.findIndex(([a, b]) => a === sx && b === sz);
const blockIdxAt = (x, z) => blocksInfo.findIndex(b => Math.abs(b.cx - x) < 2 && Math.abs(b.cz - z) < 2);
function maybeCross(n){
  if (n.blk || !blocksInfo[n.block]) return;   // crossing at the old «حتة» zebras only
  const b = blocksInfo[n.block], k = ((Math.round(n.t) % 4) + 4) % 4, [sx, sz] = CORNER_SIGN[k];
  const opts = [];
  const bx = blockIdxAt(b.cx + sx * PITCH, b.cz); if (bx >= 0) opts.push({ to: bx, corner: cornerIdx(-sx, sz), road: 'z', L: TL.map.get(tlKey(b.cx + sx * PITCH / 2, b.cz + sz * PITCH / 2)) });   // across a north-south road
  const bz = blockIdxAt(b.cx, b.cz + sz * PITCH); if (bz >= 0) opts.push({ to: bz, corner: cornerIdx(sx, -sz), road: 'x', L: TL.map.get(tlKey(b.cx + sx * PITCH / 2, b.cz + sz * PITCH / 2)) });   // across an east-west road
  if (!opts.length) return;
  const o = pick(opts), tb = blocksInfo[o.to], [tx, tz] = perimPos(tb, o.corner);
  n.cross = { ...o, tx, tz, rude: rng() < .1 }; n.state = 'wait'; n.wait = 0;
  n.yaw = Math.atan2(tx - n.g.position.x, tz - n.g.position.z);
}
// the people's light: you may start across a road while its cars have red and there is time left
function crossOK(c){
  if (c.rude || !c.L) return true;
  const k = tlTime(c.L);
  return c.road === 'z' ? k < 5 : (k >= 13 && k < 18);     // road 'z' = north-south cars: they stop while east-west is green, and the other way round
}
function startCross(n){
  const c = n.cross; CROSSERS.add(n); if (!n.baseSpeed) n.baseSpeed = n.speed; n.speed = n.baseSpeed * 1.5; n.state = 'goto'; n.tx = c.tx; n.tz = c.tz;
  n.onArrive = m => { CROSSERS.delete(m); if (m.baseSpeed){ m.speed = m.baseSpeed; m.baseSpeed = null; } m.block = c.to; m.t = c.corner; m.state = 'walk'; m.cross = null; m.crossCD = R(15, 40); m.lastCorner = Math.round(m.t); m.dir = rng() < .5 ? 1 : -1; };
}

// ---- traffic by the hour: spare cars wait off the map ----
function trafficOff(c){ const u = c.userData; u.off = true; u.offByHour = true; c.visible = false; c.userData.farHidden = false; c.position.set(9000 + traffic.indexOf(c) * 10, -80, 9000); }
function trafficOn(c){
  const u = c.userData, from = heroAt();
  if (RG.E.length){ u.off = false; u.offByHour = false; c.visible = true; u.graph = false; return; }   // 19y puts it on a real street next frame
  for (let tries = 0; tries < 20; tries++){
    u.axis = rng() < .35 ? 'z' : 'x'; u.road = u.axis === 'x' ? pick(ROADS_Z) : pick(ROADS_X); u.dir = rng() < .5 ? 1 : -1;
    u.s = u.axis === 'x' ? R(X0 - 15, XMAX + 15) : R(Z0 + 8, ZMAX - 8); u.turn = null; u.next = null; u.speed = u.base * .6; u.waitT = 0;
    placeTraffic(c); if (c.position.distanceTo(from) > 80) break;
  }
  u.off = false; c.visible = true;
}

let cityT = 0;
function updateCityLife(dt){
  TL.tick -= dt; if (TL.tick <= 0){ TL.tick = .15; updateLights(); }
  for (const n of CROSSERS) if (n.state !== 'goto' || !n.cross){ CROSSERS.delete(n); n.cross = null; if (n.baseSpeed){ n.speed = n.baseSpeed; n.baseSpeed = null; } }
  // people at corners and on the zebra
  for (const n of npcs){
    if (!isWalkerNPC(n)) continue;
    if (n.state === 'walk'){
      n.crossCD = (n.crossCD ?? R(4, 20)) - dt;
      const c = Math.round(n.t); if (n.lastCorner === undefined || n.lastCorner === null) n.lastCorner = c;
      if (c !== n.lastCorner && Math.abs(n.t - c) < .03){ n.lastCorner = c; if (n.crossCD <= 0 && rng() < .45) maybeCross(n); }
    } else if (n.state !== 'goto' && n.baseSpeed && !CROSSERS.has(n)){ n.speed = n.baseSpeed; n.baseSpeed = null;
    } else if (n.state === 'wait' && n.cross){
      n.wait += dt; if (crossOK(n.cross) || n.wait > 30) startCross(n);
    }
  }
  if (state !== 'play') return;
  cityT -= dt; if (cityT > 0) return; cityT = 1;
  const from = heroAt(), h = TOD.h;
  // how many people out now
  const pool = crowdPool(), out = pool.filter(n => !n.timeOff && n.state !== 'hidden');
  const want = Math.max(3, Math.round(pool.length * crowdWanted(h)));
  if (out.length > want){ const n = out.find(m => m.state === 'walk' && m.g.position.distanceTo(from) > 45); if (n) deactivateWalker(n); }
  else if (out.length < want){ const n = pool.find(m => m.state === 'hidden' && (m.timeOff || (m.crowd && !m.role) || m.role === 'crowd')); if (n) activateWalker(n); }
  // how many cars out now
  const on = traffic.filter(c => !c.userData.off), carsWant = Math.max(4, Math.round(traffic.length * trafficWanted(h)));
  if (on.length > carsWant){ const c = on.find(c => c.position.distanceTo(from) > 90 && !c.userData.turn); if (c) trafficOff(c); }
  else if (on.length < carsWant){ const c = traffic.find(c => c.userData.off); if (c) trafficOn(c); }
}
