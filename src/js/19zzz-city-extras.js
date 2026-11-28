// ================= the corniche's funfair at Shatby, and riding Alexandria's trams =================
// ---------- the ferris wheel goes to the Shatby corniche, on the open ground between the road and the sea ----------
(async () => {
  if (!CITY || !WHEEL.g) return;
  const [tx, tz] = cityLL(31.2148, 29.9228);   // east of the Library and Silsila, on the Shatby corniche (not in front of the Library)
  await cityPreload(tx, tz, 200);
  for (let i = 0; i < 60 && !cityReady(tx, tz, 150); i++) await new Promise(r => setTimeout(r, 250));
  const fits = (x, z) => { for (let dx = -5; dx <= 5; dx += 1) for (let dz = -2.5; dz <= 4; dz += 1){ const v = cityR(x + dx, z + dz); if (v < 2 || v >= 10) return false; } return !staticBlocked(x, z, 5); };
  const seaNear = (x, z) => { for (let a = 0; a < 6.28; a += .4) for (let r = 8; r <= 40; r += 4) if (cityR(x + Math.sin(a) * r, z + Math.cos(a) * r) === 0) return true; return false; };
  let best = null;
  for (let r = 0; r <= 200 && !best; r += 4) for (let a = 0; a < 6.28 && !best; a += Math.max(.08, 2 / Math.max(r, 1))){ const x = tx + Math.sin(a) * r, z = tz + Math.cos(a) * r; if (fits(x, z) && seaNear(x, z)) best = [x, z]; }
  if (!best) return;
  const [x, z] = best, dx = x - WHEEL.x, dz = z - WHEEL.z;
  for (const o of [WHEEL.g, WHEEL.legs, WHEEL.sign]) if (o){ o.position.x += dx; o.position.z += dz; o.updateMatrixWorld(true); }
  if (WHEEL.ob){ WHEEL.ob.minX += dx; WHEEL.ob.maxX += dx; WHEEL.ob.minZ += dz; WHEEL.ob.maxZ += dz; OG.n = -1; }
  WHEEL.x = x; WHEEL.z = z; ACTS.ferris.pos.set(x + 3.2, .15, z + 2.6);
  if (WHEEL.sign && WHEEL.sign.material && WHEEL.sign.material.map){ const t = bigSign('ملاهي الشاطبي', '#1a237e', '#ffd54f', 640, 120, 60); WHEEL.sign.material.map = t; WHEEL.sign.material.needsUpdate = true; }
})();

// ---------- riding the city trams: get on at a stop (٢ جنيه), get off at any later stop ----------
const CT_FARE = 2;
function ctBoardAction(p){
  if (!CTRAM.ready || hero.veh || TRAMR.on) return null;
  for (const c of CTRAM.near){ const T = c.T; if (!T || T.dwell <= .8) continue;
    const dx = p.x - c.x, dz = p.z - c.z, a = dx * c.fx + dz * c.fz, b = -dx * c.fz + dz * c.fx;
    if (Math.abs(a) < CT_CAR / 2 + 1 && Math.abs(b) < CT_HALF_W + 2.4) return { text: `اركب ${T.blue ? 'ترام الرمل' : 'الترام'} (${AR(CT_FARE)} جنيه)`, fn: () => {
      if (hero.money < CT_FARE) return banner(`مفيش ${AR(CT_FARE)} جنيه للتذكرة`, 'bad', 1.8);
      hero.money -= CT_FARE; TRAMR.on = true; TRAMR.city = T; TRAMR.fromStop = T.lastStop; TRAMR.cam = camTarget; camTarget = 11; CAM.tilt = .5; hero.locked = true;
      if (typeof tramBell === 'function') tramBell(); banner('ركبت الترام · انزل في أي محطة جاية', 'ok', 2.4);
    } };
  }
  return null;
}
function ctStopNear(x, z){ let best = null, bd = 1e9; for (const s of CTRAM.stops){ const d = Math.hypot(s.x - x, s.z - z); if (d < bd){ bd = d; best = s; } } return bd < 40 ? best : null; }
function ctEndRide(){
  const T = TRAMR.city; TRAMR.on = false; TRAMR.city = null; hero.locked = false; if (TRAMR.cam) camTarget = TRAMR.cam;
  if (!T || !T.cars) return;
  const c = T.cars[0], st = ctStopNear(c.x, c.z);
  let x = c.x - c.fz * (CT_HALF_W + 1.6), z = c.z + c.fx * (CT_HALF_W + 1.6);
  if (st){ const px = st.x - st.fz * 2.9, pz = st.z + st.fx * 2.9; x = px; z = pz; }
  const [fx, fz] = freeSpot(x, z); hero.pos.set(fx, .15, fz); hero.vel.set(0, 0, 0); lookAt.copy(hero.pos);
}
{
  const _ta = tramAction; tramAction = function(p){ return _ta(p) || ctBoardAction(p); };
  const _tr = tramRideAction; tramRideAction = function(){
    const T = TRAMR.city; if (!T) return _tr();
    if (T.dwell > .5 && T.lastStop !== TRAMR.fromStop){ const st = T.cars && ctStopNear(T.cars[0].x, T.cars[0].z); return { text: st ? `انزل في ${st.name}` : 'انزل من الترام', fn: ctEndRide }; }
    return { text: 'الترام ماشي… استنى المحطة الجاية', fn: () => {} };
  };
  const _er = endTramRide; endTramRide = function(){ if (TRAMR.city) return ctEndRide(); return _er(); };
  const _lp = leavePlaces; leavePlaces = function(){ if (TRAMR.city){ TRAMR.city = null; } return _lp(); };
}

// ---------- a ground under every city chunk, from the raster: wherever the pavement mesh left a hole, the land still shows ----------
// (1 m cells, eroded 1.5 m from the roads and the sea so it never pokes out; a hair under the pavement)
const CBASE_MAT = (() => { const m = CMAT.walk.clone(); m.polygonOffset = true; m.polygonOffsetFactor = 2; m.polygonOffsetUnits = 2; return m; })();
const CBASE_WAIT = [];
function cityBaseLayer(grp, ox, oz){
  try { cityKiosks(grp, ox, oz); } catch (e){}
  const C = CITY.chunk, land = (x, z) => { if (inPatch(x, z)) return false; const v = cityR(x, z); return v >= 2; };
  const P = [], U = [], y = .14;
  for (let z = 0; z < C; z++){
    let run = -1;
    for (let x = 0; x <= C; x++){
      const X = ox + x + .5, Z = oz + z + .5;
      const ok = x < C && land(X, Z) && land(X + 1.5, Z) && land(X - 1.5, Z) && land(X, Z + 1.5) && land(X, Z - 1.5);
      if (ok && run < 0) run = x;
      if (!ok && run >= 0){ const x0 = ox + run, x1 = ox + x, z0 = oz + z, z1 = oz + z + 1;
        P.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0); U.push(x0 / 4, z0 / 4, x0 / 4, z1 / 4, x1 / 4, z1 / 4, x0 / 4, z0 / 4, x1 / 4, z1 / 4, x1 / 4, z0 / 4); run = -1; }
    }
  }
  if (!P.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, CBASE_MAT); m.receiveShadow = !LOW; m.matrixAutoUpdate = false; grp.add(m); m.updateMatrixWorld(true);
}
if (CITY){
  const _bc = cityBuildChunk;
  cityBuildChunk = function(key, d){
    const grp = _bc(key, d), [i, k] = key.split('_').map(Number), ox = CITY.x0 + i * CITY.chunk, oz = CITY.z0 + k * CITY.chunk;
    if (cityReady(ox + CITY.chunk / 2, oz + CITY.chunk / 2, CITY.chunk / 2)) cityBaseLayer(grp, ox, oz); else CBASE_WAIT.push({ grp, ox, oz });
    return grp;
  };
  const _uc = updateCity;
  updateCity = function(px, pz){
    _uc(px, pz);
    for (let n = 0; n < CBASE_WAIT.length; n++){ const w = CBASE_WAIT[n]; if (!w.grp.parent){ CBASE_WAIT.splice(n--, 1); continue; }
      if (cityReady(w.ox + CITY.chunk / 2, w.oz + CITY.chunk / 2, CITY.chunk / 2)){ cityBaseLayer(w.grp, w.ox, w.oz); CBASE_WAIT.splice(n, 1); break; } }
  };
}

// ---------- the corniche microbuses: two of the street cars become white-and-blue microbuses that keep to طريق الجيش ----------
if (CITY && AR_GEO.micro){
  let n = 0;
  for (const c of [...traffic].reverse()){ if (n >= (LOW ? 2 : 3)) break; const u = c.userData; if (u.kind !== 'car') continue;   // from the end: the hour turns cars off from the front
    if (SFM.microbus){ c.userData.sf = null; sfSkin(c, 'microbus'); } else { for (const ch of c.children) ch.visible = false; const m = new THREE.Mesh(AR_GEO.micro, arMat); m.castShadow = !LOW; c.add(m); } u.kind = 'micro'; u.graph = false; u.base = R(9, 12); u.len = 2.6; n++; }
}
// ---------- a kiosk on some street corners (cigarettes, a drinks fridge, papers), city-wide ----------
const CKIOSK = { byChunk: null, obs: new Set() };
function cityKiosks(grp, ox, oz){
  if (!RG.N.length) return;
  if (!CKIOSK.byChunk){ CKIOSK.byChunk = new Map(); RG.N.forEach(([x, z], i) => { if (RG.adj[i].length < 3) return; const k = Math.floor((x - CITY.x0) / CITY.chunk) + '_' + Math.floor((z - CITY.z0) / CITY.chunk); let l = CKIOSK.byChunk.get(k); if (!l) CKIOSK.byChunk.set(k, l = []); l.push(i); }); }
  const key = Math.floor((ox + 1 - CITY.x0) / CITY.chunk) + '_' + Math.floor((oz + 1 - CITY.z0) / CITY.chunk), list = CKIOSK.byChunk.get(key); if (!list) return;
  const parts = [], sfk = {};
  for (const i of list){
    if (((i * 2654435761) >>> 0) % 100 >= 14) continue;   // about one corner in seven, the same ones every time
    const [x, z] = RG.N[i];
    for (const [dx, dz] of [[6.5, 6.5], [-6.5, 6.5], [6.5, -6.5], [-6.5, -6.5]]){
      const px = x + dx, pz = z + dz; let ok = true;
      for (const [a, b] of [[0, 0], [1.8, 0], [-1.8, 0], [0, 1.8], [0, -1.8], [1.6, 1.6], [-1.6, 1.6], [1.6, -1.6], [-1.6, -1.6]]){ const v = cityR(px + a, pz + b); if (v < 2 || v >= 10){ ok = false; break; } }
      if (!ok || inPatch(px, pz)) continue;
      const kind = i % 2 ? 'news' : 'kiosk', sn = kind === 'news' ? 'newspaper-stand' : 'kiosk';
      if (SFM[sn]) (sfk[sn] = sfk[sn] || []).push([px, .15, pz, Math.atan2(-dx, -dz) + Math.PI]); else { const g = AR_GEO[kind].clone(); g.rotateY(Math.atan2(-dx, -dz)); g.translate(px, .15, pz); parts.push(g); }
      if (!CKIOSK.obs.has(i)){ CKIOSK.obs.add(i); ogAdd({ minX: px - 1.2, maxX: px + 1.2, minZ: pz - 1.2, maxZ: pz + 1.2 }); }
      break;
    }
  }
  for (const [nm, l] of Object.entries(sfk)){ const g = sfInst(nm, l); if (g) grp.add(g); }
  if (parts.length){ const m = new THREE.Mesh(mergeGeometries(parts), arMat); m.castShadow = !LOW; m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrixWorld(true); grp.add(m); }
}

// the microbus you drive for the job is the real HiAce too
if (typeof microVeh !== 'undefined' && SFM.microbus) sfSkin(microVeh.mesh, 'microbus');
