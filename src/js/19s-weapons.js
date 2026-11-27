// ================= stage 9: weapons and blood =================
// Knife, machete (سنجة), pistol, sawed-off (مقروطة), AK (آلي), molotov, plus the funny ones from stage 5.
// Guns: the camera aims, the closest person in front is locked (a red mark under him); ammo, reload (R or automatic),
// recoil, muzzle flash, falling shells, bullet holes, sparks on cars. Blood like GTA, with an off switch in the settings.
// Shooting in the street brings the police (more stars for the AK). Hold the weapon button = the weapon wheel (slow motion).
Object.assign(WEAPONS, {
  knife:   { name: 'سكينة', icon: 'knife', mult: 1.9, range: 1.8, blade: true },
  machete: { name: 'سنجة', icon: 'sword', mult: 2.8, range: 2.2, blade: true, heavy: true },
  shotgun: { name: 'مقروطة', icon: 'crosshair', mult: 3, range: 11, gun: true },
  ak:      { name: 'آلي', icon: 'AK', mult: 3, range: 30, gun: true, auto: true },
  molotov: { name: 'مولوتوف', icon: 'flame', mult: 1, range: 14, thrown: true },
});
STRIKES.stab = { clip: 'stab', s0: .85, tc: 1.27, te: 1.62, rate: 1.9, dmg: 1, push: 2 };
const GUN = {
  pistol:  { mag: 12, start: 60,  rate: .28, dmg: 34, range: 26, spread: .012, pellets: 1, reload: 1.3, recoil: .55, shake: .12, stars: 2, pitch: 2600, set: 'pistol' },
  shotgun: { mag: 2,  start: 20,  rate: .7,  dmg: 30, range: 11, spread: .11,  pellets: 7, reload: 1.7, recoil: 1.2,  shake: .38, stars: 2, pitch: 900,  set: 'rifle', push: 7 },
  ak:      { mag: 30, start: 150, rate: .1,  dmg: 26, range: 32, spread: .028, pellets: 1, reload: 2.1, recoil: .32, shake: .07, stars: 3, pitch: 1900, set: 'rifle', auto: true },
  molotov: { mag: 3,  start: 3,   rate: .9,  stars: 2 },
};
const AMMO = (() => { let a = {}; try { a = JSON.parse(store.get('ty_ammo') || '{}'); } catch (e){} for (const k in GUN) if (!a[k]) a[k] = { mag: GUN[k].mag, res: GUN[k].start - GUN[k].mag }; return a; })();
const saveAmmo = () => store.set('ty_ammo', JSON.stringify(AMMO));
const GW = { rmb: false, aimK: 0, cd: 0, reloadT: 0, trigger: false, lock: null, lockT: 0, aimT: 0, recoil: 0, fireT: 0, wheel: null };
const BLOOD = { on: store.get('ty_blood') !== '0' };
const AIM_RAISE = { pistol: .3, rifle: .12 };
const isGun = id => !!(WEAPONS[id] && (WEAPONS[id].gun || WEAPONS[id].thrown));

// ---------- effects: a small pool of flying bits (blood, sparks, fire), marks on walls and the ground, shells ----------
const FX = { bits: [], marks: [], pools: [], shells: [] };
// textured sprites (Kenney particle packs, CC0): drops and mist of blood, sparks, dust, gun smoke, fire
const _ktl = new THREE.TextureLoader(), KT = {};
for (const k of ['muzzle01', 'muzzle02', 'muzzle05', 'spark01', 'spark04', 'smoke01', 'smoke04', 'smoke07', 'dirt01', 'dirt02', 'flame02', 'flame04', 'fire01', 'scorch01']){ KT[k] = _ktl.load(`assets/fx/k-${k}.png`); KT[k].colorSpace = THREE.SRGBColorSpace; }
// kind: textures, colour, additive?, size [min, max], growth per second, life [min, max], gravity, start opacity, drag
const FXK = {
  blood:  { tex: ['dirt01', 'dirt02'], col: 0x5c0606, add: false, size: [.05, .16], grow: .2, life: [.35, .7], g: 9.8, op: 1, drag: 1.5 },
  mist:   { tex: ['smoke04'], col: 0x6a0a0a, add: false, size: [.25, .4], grow: 1.6, life: [.3, .5], g: 0, op: .7, drag: 4 },
  spark:  { tex: ['spark01', 'spark04'], col: 0xffd890, add: true, size: [.05, .14], grow: -.2, life: [.12, .28], g: 6, op: 1, drag: .5 },
  dust:   { tex: ['smoke07', 'smoke01'], col: 0xa89c88, add: false, size: [.15, .3], grow: 1.1, life: [.5, .9], g: -.4, op: .55, drag: 3 },
  smoke:  { tex: ['smoke01', 'smoke04'], col: 0xdedad2, add: false, size: [.12, .2], grow: .9, life: [.6, 1.1], g: -.6, op: .28, drag: 2.5 },
  fire:   { tex: ['flame02', 'flame04', 'fire01'], col: 0xff7a26, add: true, size: [.7, 1.4], grow: .3, life: [.4, .75], g: -2.2, op: .7, drag: 1 },
  soot:   { tex: ['smoke04', 'smoke07'], col: 0x1d1b19, add: false, size: [.4, .7], grow: 1.2, life: [.9, 1.6], g: -1.4, op: .45, drag: 1 },
};
for (let i = 0; i < 180; i++){ const m = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); m.visible = false; scene.add(m); FX.bits.push({ m, v: new THREE.Vector3(), life: 0, max: 1 }); }
function burst(kind, p, dir, n, sp = 3){
  if (kind === 'blood'){ burst('mist', p, dir, 2, sp * .3); }
  if (kind === 'fire' && Math.random() < .25) burst('soot', p, null, 1, .3);
  const K = FXK[kind]; if (!K) return; let k = 0;
  for (const b of FX.bits){ if (b.life > 0) continue; if (k++ >= n) break;
    const M = b.m.material; M.map = KT[K.tex[(Math.random() * K.tex.length) | 0]]; M.color.setHex(K.col); M.blending = K.add ? THREE.AdditiveBlending : THREE.NormalBlending; M.opacity = K.op; M.rotation = Math.random() * 6.28; M.needsUpdate = true;
    b.m.visible = true; b.m.position.copy(p); b.kind = kind; b.K = K; b.max = b.life = K.life[0] + Math.random() * (K.life[1] - K.life[0]);
    b.v.set((Math.random() - .5) * sp, Math.random() * sp * .6 + (K.g < 0 ? .2 : .4), (Math.random() - .5) * sp); if (dir) b.v.addScaledVector(dir, sp * .8);
    b.m.scale.setScalar(K.size[0] + Math.random() * (K.size[1] - K.size[0]));
  }
}
const fxMarkGeo = new THREE.CircleGeometry(1, 14), fxQuadGeo = new THREE.PlaneGeometry(2, 2), holeMat = new THREE.MeshBasicMaterial({ color: 0x1a1612, polygonOffset: true, polygonOffsetFactor: -2, transparent: true, opacity: .85 });
const _tl = new THREE.TextureLoader(), bloodTex = [_tl.load('assets/fx/blood2.png'), _tl.load('assets/fx/blood1.png')]; bloodTex.forEach(t => { t.colorSpace = THREE.SRGBColorSpace; });
const poolMat = new THREE.MeshBasicMaterial({ map: bloodTex[0], polygonOffset: true, polygonOffsetFactor: -2, transparent: true, opacity: .95, depthWrite: false, alphaTest: .05 });
const splatMat = new THREE.MeshBasicMaterial({ map: bloodTex[1], polygonOffset: true, polygonOffsetFactor: -2, transparent: true, opacity: .95, depthWrite: false, alphaTest: .05 });
const scorchMat = new THREE.MeshBasicMaterial({ map: KT.scorch01, color: 0x111111, polygonOffset: true, polygonOffsetFactor: -2, transparent: true, opacity: .6, depthWrite: false });
function addMark(list, max, mat, pos, normal, r, life){
  let M = list.length < max ? null : list.shift();
  const geo = mat.map ? fxQuadGeo : fxMarkGeo;
  if (!M){ M = { m: new THREE.Mesh(geo, mat) }; scene.add(M.m); } else { M.m.material = mat; M.m.geometry = geo; }
  M.m.visible = true; M.m.scale.setScalar(r); M.m.position.copy(pos); M.m.lookAt(pos.clone().add(normal)); M.m.rotateZ(Math.random() * 6.28); M.life = life; M.grow = 0; list.push(M); return M;
}
function bloodPool(x, z, r){ if (!BLOOD.on) return; const y = groundY(x, z) + .02; const M = addMark(FX.pools, 30, poolMat, new THREE.Vector3(x, y, z), new THREE.Vector3(0, 1, 0), .05, 40); M.grow = r; }
function bleed(p, dir, big){ if (!BLOOD.on) return; burst('blood', p, dir, big ? 14 : 7, big ? 3.2 : 2.2); }
const shellGeo = new THREE.CylinderGeometry(.008, .008, .03, 6).rotateZ(Math.PI / 2), shellMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: .8, roughness: .3 });
for (let i = 0; i < 24; i++){ const m = new THREE.Mesh(shellGeo, shellMat); m.visible = false; scene.add(m); FX.shells.push({ m, v: new THREE.Vector3(), life: 0 }); }
const SHELLM = {};
(async () => { try { const { GLTFLoader } = await import('three/addons/GLTFLoader.js'); const L = new GLTFLoader(); for (const k of ['9mm', 'ak', 'shotgun']){ const g = (await L.loadAsync(`assets/fx/shell-${k}.glb`)).scene; g.traverse(o => { if (o.isMesh && !SHELLM[k]){ const geo = o.geometry.clone(); geo.rotateX(Math.PI / 2); SHELLM[k] = { geo, mat: o.material }; } }); } } catch (e){ console.warn('shells', e); } })();
function ejectShell(p, right, kind){ const s = FX.shells.find(s => s.life <= 0) || FX.shells[0]; const S = SHELLM[kind]; if (S){ s.m.geometry = S.geo; s.m.material = S.mat; } else { s.m.geometry = shellGeo; s.m.material = shellMat; } s.m.visible = true; s.m.position.copy(p); s.v.set(right.x * 2.2 + (Math.random() - .5), 2.4 + Math.random(), right.z * 2.2 + (Math.random() - .5)); s.life = 4; s.m.rotation.set(Math.random() * 6, Math.random() * 6, 0); }
const flashMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, map: KT.muzzle01, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const flash3 = new THREE.Mesh(new THREE.PlaneGeometry(.32, .32), flashMat); flash3.visible = false; scene.add(flash3);
const aimMark = new THREE.Mesh(new THREE.RingGeometry(.42, .52, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff2d2d, transparent: true, opacity: .8, depthWrite: false })); aimMark.visible = false; scene.add(aimMark);

// ---------- aiming ----------
function gunTargets(){
  const L = [];
  for (const n of npcs) if (n.state !== 'hidden' && n.state !== 'down' && n.g.visible && n.state !== 'held') L.push({ x: n.g.position.x, z: n.g.position.z, y: n.g.position.y, n });
  if (enemy.active && !enemy.ally && enemy.d.downT <= 0) L.push({ x: enemy.pos.x, z: enemy.pos.z, y: enemy.pos.y, enemy: true });
  if (boss.active && wantedD.downT <= 0) L.push({ x: boss.pos.x, z: boss.pos.z, y: boss.pos.y, boss: true });
  for (const c of POL.cops) if (c.on && c.state !== 'down') L.push({ x: c.pos.x, z: c.pos.z, y: c.pos.y, cop: c });
  return L;
}
const isHostile = c => !!c && (c.enemy || c.boss || c.cop || (c.n && (c.n.state === 'fight' || c.n.state === 'stagger' || c.n.thug)));
function aimTarget(range){
  const p = hero.pos, fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
  if (GW.lock && !isHostile(GW.lock)){ const fresh = freshTarget(range, true); if (fresh) GW.lock = fresh; }
  if (GW.lock){ const L = GW.lock; if (L.cop){ L.x = L.cop.pos.x; L.z = L.cop.pos.z; } else if (L.n){ L.x = L.n.g.position.x; L.z = L.n.g.position.z; } else if (L.enemy){ L.x = enemy.pos.x; L.z = enemy.pos.z; } else if (L.boss){ L.x = boss.pos.x; L.z = boss.pos.z; }
    const dx = L.x - p.x, dz = L.z - p.z, d = Math.hypot(dx, dz), ok = (L.cop ? L.cop.on && L.cop.state !== 'down' : L.n ? L.n.state !== 'down' && L.n.state !== 'hidden' : L.enemy ? enemy.active && enemy.d.downT <= 0 : boss.active && wantedD.downT <= 0);
    if (ok && d < range + 4 && (dx * fx + dz * fz) / (d || 1) > .55 && lineOfSight(p.x, p.z, L.x, L.z)) return L;
    GW.lock = null; }
  GW.lock = freshTarget(range, false); return GW.lock;
}
function freshTarget(range, hostileOnly){
  const p = hero.pos, fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
  let best = null, bs = 1e9;
  for (const c of gunTargets()){ if (hostileOnly && !isHostile(c)) continue; const dx = c.x - p.x, dz = c.z - p.z, d = Math.hypot(dx, dz); if (d > range || d < .3) continue; const cos = (dx * fx + dz * fz) / d; if (cos < .82) continue;
    const pri = (c.n && (c.n.state === 'fight' || c.n.thug)) || c.enemy || c.boss ? .6 : 1;   // the ones fighting you first
    const s = d * (2.2 - cos) * pri; if (s < bs && lineOfSight(p.x, p.z, c.x, c.z)){ bs = s; best = c; } }
  return best;
}

// ---------- a bullet: walks along the line, stops at the first person, car or wall ----------
const _bp = new THREE.Vector3(), _bq = new THREE.Vector3();
function traceShot(o, dir, range){
  const step = .3, tg = gunTargets();
  for (let s = .4; s < range; s += step){
    _bp.copy(o).addScaledVector(dir, s);
    for (const c of tg){ if (Math.abs(_bp.x - c.x) < .4 && Math.abs(_bp.z - c.z) < .4 && _bp.y > (c.y || 0) && _bp.y < (c.y || 0) + 1.95) return { who: c, p: _bp.clone(), s }; }
    for (const v of vehicles){ if (v === hero.veh || !v.mesh || !v.mesh.visible) continue; if (Math.hypot(_bp.x - v.pos.x, _bp.z - v.pos.z) < 3 && vehBlockedAt(_bp.x, _bp.z, 0, hero.veh) && _bp.y < 1.6) return { car: v, p: _bp.clone(), s }; }
    if (_bp.y < groundY(_bp.x, _bp.z)) return { ground: true, p: _bp.clone(), s };
    if (staticBlocked(_bp.x, _bp.z, 0, _bp.y)){
      let a = s - step, b = s; for (let k = 0; k < 7; k++){ const m = (a + b) / 2; _bq.copy(o).addScaledVector(dir, m); if (staticBlocked(_bq.x, _bq.z, 0, _bq.y)) b = m; else a = m; }   // find the surface
      _bq.copy(o).addScaledVector(dir, a); _bp.copy(o).addScaledVector(dir, b);
      const nx = staticBlocked(_bp.x, _bq.z, 0, _bp.y) ? -Math.sign(dir.x) : 0, nz = nx ? 0 : -Math.sign(dir.z);
      return { wall: true, p: _bq.clone(), n: new THREE.Vector3(nx, 0, nz), s: a };
    }
  }
  return null;
}
function traceWallOnly(o, dir, range){
  for (let s = .3; s < range; s += .15){ _bp.copy(o).addScaledVector(dir, s); if (staticBlocked(_bp.x, _bp.z, 0, _bp.y)){ _bq.copy(o).addScaledVector(dir, s - .15); const nx = staticBlocked(_bp.x, _bq.z, 0, _bp.y) ? -Math.sign(dir.x) : 0; return { p: _bq.clone(), n: new THREE.Vector3(nx, 0, nx ? 0 : -Math.sign(dir.z)) }; } }
  return null;
}
function shotHits(h, dir, G, big){
  if (!h) return;
  if (h.who){ const c = h.who; bleed(h.p, dir, big);
    if (BLOOD.on){ const w = traceWallOnly(h.p, dir, 2.2); if (w) addMark(FX.marks, 80, splatMat, w.p.clone().addScaledVector(w.n, .02), w.n, .35 + Math.random() * .25, 40); }
    if (c.n){ const n = c.n;
      if (n.mel || n.thug || n.state === 'fight') meleeHitNPC(n, G.dmg / 13, { big: true, heavy: true, push: G.push || 2.5, from: hero.pos });
      else { npcHit(n, 3); n.downT = 11; n.shot = true; }
      if (n.state === 'down' && !(n.poolT > 0)) n.poolT = .5;
    }
    else if (c.enemy) hitEnemy(G.dmg, hero.pos);
    else if (c.boss) bossHit(true);
    else if (c.cop) copHit(c.cop, G.dmg / 13);
  } else if (h.car){ burst('spark', h.p, dir.clone().negate(), 6, 2.5); carDamaged(h.car, 0, 0, 0, h.p); playS('metalm', .45 * sfxVol(h.p.x, h.p.z, 10), 1.2); }
  else if (h.wall){ playS('plate', .3 * sfxVol(h.p.x, h.p.z, 10), 1.4); burst('dust', h.p, h.n, 5, 1.8); burst('spark', h.p, h.n, 2, 2); addMark(FX.marks, 80, holeMat, h.p.clone().addScaledVector(h.n, .02), h.n, .045, 25); }
  else if (h.ground){ playS('plate', .18 * sfxVol(h.p.x, h.p.z, 10), .8); burst('dust', h.p, null, 4, 1.4); }
}

// ---------- firing ----------
function gunPress(){
  if (state !== 'play' || hero.veh || hero.locked || hero.d.downT > 0) return;
  if (WEAP.cur === 'molotov'){ throwMolotov(); return; }
  GW.trigger = true; fireGun();
}
function gunRelease(){ GW.trigger = false; }
function fireGun(){
  const id = WEAP.cur, G = GUN[id], A = AMMO[id]; if (!G || GW.cd > 0 || GW.reloadT > 0 || MEL.dodge) return;
  if (A.mag <= 0){ if (A.res > 0) startReload(); else { playS('dry', .8); banner('مفيش رصاص… اشتري من التليفون', 'bad', 1.4); GW.trigger = false; } return; }
  A.mag--; GW.cd = G.rate; GW.aimT = 2.5; GW.fireT = .12; GW.recoil = Math.min(1.4, GW.recoil + G.recoil);
  const p = hero.pos, aimMode = GW.aimK > .5, tg = aimMode ? crossTarget(G.range) : aimTarget(G.range), d = hero.d;
  const o = new THREE.Vector3(p.x, p.y + 1.38, p.z);
  let dir;
  if (tg){ d.yaw = Math.atan2(tg.x - p.x, tg.z - p.z); dir = new THREE.Vector3(tg.x - p.x, (tg.y || 0) + 1.2 - o.y, tg.z - p.z).normalize(); }
  else if (aimMode){ const f = camForward(), P = camera.position.clone().addScaledVector(f, G.range + camDist); dir = P.sub(o).normalize(); d.yaw = Math.atan2(f.x, f.z); }
  else { dir = new THREE.Vector3(-Math.sin(camYaw), -.02, -Math.cos(camYaw)); d.yaw = Math.atan2(dir.x, dir.z); }
  o.addScaledVector(new THREE.Vector3(dir.x, 0, dir.z).normalize(), .45);
  const right = new THREE.Vector3(Math.cos(d.yaw), 0, -Math.sin(d.yaw));
  const spread = G.spread * (1 + GW.recoil * (G.auto ? 1.6 : .4));
  let firstEnd = null; const byWho = new Map();
  for (let i = 0; i < G.pellets; i++){
    const dd = dir.clone(); dd.x += (Math.random() - .5) * spread * 2; dd.y += (Math.random() - .5) * spread * 1.2; dd.z += (Math.random() - .5) * spread * 2; dd.normalize();
    const h = traceShot(o, dd, G.range);
    if (h && h.who){ const key = h.who.n || h.who.cop || (h.who.enemy ? 'enemy' : 'boss'), e = byWho.get(key); if (e) e.k++; else byWho.set(key, { h, dd, k: 1 }); }
    else shotHits(h, dd, G, false);
    if (!firstEnd) firstEnd = h ? h.p : o.clone().addScaledVector(dd, G.range);
  }
  for (const { h, dd, k } of byWho.values()) shotHits(h, dd, k > 1 ? { ...G, dmg: G.dmg * k } : G, k > 2);
  // flash, tracer, sound, shake, a shell
  flashMat.map = KT[['muzzle01', 'muzzle02', 'muzzle05'][(Math.random() * 3) | 0]]; flashMat.needsUpdate = true; burst('smoke', o.clone().addScaledVector(dir, .1), dir, G.pellets > 1 ? 3 : 1, .4);
  flash3.position.copy(o); flash3.lookAt(camera.position); flash3.rotation.z = Math.random() * 3; flash3.scale.setScalar(G.pellets > 1 ? 2.2 : id === 'ak' ? 1.3 : 1); flash3.visible = true;
  muzzle.position.copy(o); muzzle.intensity = G.pellets > 1 ? 14 : 8;
  tracer.geometry.setFromPoints([o, firstEnd]); tracer.visible = true;
  if (!playGun(id, id === 'ak' ? .85 : 1)){ noise(G.pellets > 1 ? .3 : .16, G.pitch, G.pellets > 1 ? .9 : .65); tone(G.pellets > 1 ? 80 : 120, 50, .18, 'sawtooth', .14); }
  shake = Math.max(shake, G.shake); buzz(G.pellets > 1 ? 45 : 20);
  if (G.pellets > 1 && A.mag > 0) playS('pump', .75, 1, .38);   // rack the next shell
  if (G.pellets > 1) hero.knock.addScaledVector(new THREE.Vector3(dir.x, 0, dir.z).normalize(), -4.5);
  ejectShell(o.clone().addScaledVector(right, .12), right, id === 'pistol' ? '9mm' : id);
  for (const n of npcs) if (n.state === 'walk' && n.g.position.distanceTo(p) < 28){ n.fleeT = 8; if (Math.random() < .25) say(n, rpick(['ضرب نار!!', 'اجروااا!', 'يا ساتر يا رب!']), 1.6, 'angry'); }
  crime('shoot', p, G.stars); shopsPanic(p);
  saveAmmo();
}
function startReload(){
  const id = WEAP.cur, G = GUN[id], A = AMMO[id]; if (!G || !G.reload || GW.reloadT > 0 || A.res <= 0 || A.mag >= G.mag) return;
  GW.reloadT = G.reload; GW.reloadOf = id;
  if (id === 'shotgun'){ for (let i = 0; i < G.mag - A.mag; i++) playS('shell-in', .8, 1, .25 + i * .45); playS('pump', .9, 1, .3 + (G.mag - A.mag) * .45); }
  else playS(id === 'pistol' ? 'reload-pistol' : 'reload-rifle', .9, G.reload < 1.5 ? 1.15 : 1);
}
function finishReload(){ const id = GW.reloadOf, G = GUN[id], A = AMMO[id]; const k = Math.min(G.mag - A.mag, A.res); A.mag += k; A.res -= k; saveAmmo(); }
function buyAmmo(){
  if (!Object.keys(GUN).some(k => k === 'molotov' ? AMMO[k].mag < GUN[k].mag : AMMO[k].res < GUN[k].start - GUN[k].mag)){ banner('الرصاص مليان', 'info', 1.4); return false; }
  if (hero.money < 80){ banner('محتاج ٨٠ جنيه', 'bad', 1.5); return false; }
  hero.money -= 80; for (const k in GUN){ AMMO[k].res = Math.max(AMMO[k].res, GUN[k].start - GUN[k].mag); if (k === 'molotov') AMMO[k].mag = GUN[k].mag; } saveAmmo(); coin(); banner('الرصاص اتملى', 'ok', 1.5); return true;
}

// ---------- molotov ----------
const MOLO = { list: [], fires: [] };
const moloGeo = new THREE.CylinderGeometry(.04, .045, .22, 8), moloMat = new THREE.MeshStandardMaterial({ color: 0x3f7d2e, roughness: .2, transparent: true, opacity: .85 });
function throwMolotov(){
  const A = AMMO.molotov; if (GW.cd > 0) return; if (A.mag <= 0){ banner('خلصوا… اشتري من التليفون', 'bad', 1.4); return; }
  A.mag--; GW.cd = GUN.molotov.rate; saveAmmo();
  const p = hero.pos, tg = aimTarget(14);
  let tx, tz; if (tg){ tx = tg.x; tz = tg.z; } else { tx = p.x - Math.sin(camYaw) * 10; tz = p.z - Math.cos(camYaw) * 10; }
  { const dx = tx - p.x, dz = tz - p.z, dd = Math.hypot(dx, dz) || 1; if (dd < 5){ tx = p.x + dx / dd * 5; tz = p.z + dz / dd * 5; } }   // too close: a bit further, not on yourself
  hero.d.yaw = Math.atan2(tx - p.x, tz - p.z);
  MEL.atk = { kind: 'throw', st: STRIKES.throw, t: 0, hit: true, tg: null, range: 0 };
  GW.throwAt = { t: .26, tx, tz };
}
function launchMolotov(T0){
  const p = hero.pos, { tx, tz } = T0, dist = Math.hypot(tx - p.x, tz - p.z), T = Math.max(.45, dist / 12), m = new THREE.Mesh(moloGeo, moloMat);
  m.position.set(p.x, p.y + 1.6, p.z); scene.add(m);
  const h0 = m.position.y - groundY(tx, tz);
  MOLO.list.push({ m, v: new THREE.Vector3((tx - p.x) / T, (4.9 * T * T - h0) / T, (tz - p.z) / T) });
  punchWhoosh();
}
function igniteAt(x, z){
  const y = groundY(x, z), light = new THREE.PointLight(0xff7a1a, 6, 9, 2); light.position.set(x, y + 1, z); scene.add(light);
  MOLO.fires.push({ x, z, y, r: 2.5, t: 6.5, light });
  noise(.5, 500, .7); noise(.3, 3800, .4); shake = Math.max(shake, .2);
  addMark(FX.pools, 30, scorchMat, new THREE.Vector3(x, y + .025, z), new THREE.Vector3(0, 1, 0), 2.3, 45);
  crime('shoot', new THREE.Vector3(x, 0, z), GUN.molotov.stars);
}
function updateMolotovs(dt){
  for (let i = MOLO.list.length - 1; i >= 0; i--){ const b = MOLO.list[i], m = b.m; b.v.y -= 9.8 * dt; m.position.addScaledVector(b.v, dt); m.rotation.x += dt * 9;
    burst('fire', m.position, null, 1, .4);
    if (m.position.y <= groundY(m.position.x, m.position.z) + .05 || staticBlocked(m.position.x, m.position.z, 0, m.position.y)){ scene.remove(m); MOLO.list.splice(i, 1); noise(.12, 4200, .5); igniteAt(m.position.x, m.position.z); } }
  for (const n of npcs){ if (n.burnT > 0) n.burnT -= dt; if (n.poolT > 0){ n.poolT -= dt; if (n.poolT <= 0) bloodPool(n.g.position.x, n.g.position.z, .55 + Math.random() * .35); } }
  for (let i = MOLO.fires.length - 1; i >= 0; i--){ const f = MOLO.fires[i]; f.t -= dt; f.light.intensity = (f.t < 1 ? f.t : 1) * (5 + Math.random() * 3);
    for (let q = 0; q < 2; q++) if (Math.random() < dt * 45){ const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * f.r * .85; burst('fire', new THREE.Vector3(f.x + Math.cos(a) * r, f.y + .15, f.z + Math.sin(a) * r), null, 1, .5); }
    if (!hero.veh && Math.hypot(hero.pos.x - f.x, hero.pos.z - f.z) < f.r){ f.hurt = (f.hurt || 0) - dt; if (f.hurt <= 0){ f.hurt = .5; heroDamage(6 * DIFF.dmg, 'fire'); } }
    for (const n of npcs){ if (n.state === 'hidden' || n.burnT > 0) continue; if (Math.hypot(n.g.position.x - f.x, n.g.position.z - f.z) < f.r){ n.burnT = 3; if (n.mel || n.thug) meleeHitNPC(n, 1.5, { big: true, heavy: true, push: 3, from: new THREE.Vector3(f.x, 0, f.z) }); else { npcHit(n, 2); n.fleeT = 8; } say(n, rpick(['نار!! نار!!', 'آآآه!']), 1.2, 'angry'); } }
    for (const v of vehicles) if (Math.hypot(v.pos.x - f.x, v.pos.z - f.z) < f.r) v.dmg = (v.dmg || 0) + dt * 4;
    if (f.t <= 0){ scene.remove(f.light); MOLO.fires.splice(i, 1); }
  }
}

// ---------- the weapon wheel ----------
function openWheel(){
  if (GW.wheel || state !== 'play' || hero.veh) return;
  const own = weaponsOwned(), el = document.createElement('div'); el.id = 'wwheel';
  const R = 118; el.innerHTML = `<div class="ww-c"><b id="wwName">${WEAPONS[WEAP.cur].name}</b><small id="wwAmmo"></small></div>` + own.map((k, i) => { const a = i / own.length * Math.PI * 2 - Math.PI / 2; return `<button data-w="${k}" style="transform:translate(${Math.cos(a) * R}px,${Math.sin(a) * R}px)"${k === WEAP.cur ? ' class="on"' : ''}>${icon(WEAPONS[k].icon)}</button>`; }).join('');
  document.body.appendChild(el); GW.wheel = { el, own, pick: WEAP.cur };
  el.querySelectorAll('[data-w]').forEach(b => { b.onclick = () => { wheelHover(b.dataset.w); closeWheel(true); }; });
  wheelHover(WEAP.cur);
}
function wheelHover(k){ const W = GW.wheel; if (!W) return; W.pick = k; W.el.querySelectorAll('[data-w]').forEach(b => b.classList.toggle('on', b.dataset.w === k)); $('wwName').textContent = WEAPONS[k].name; const A = AMMO[k]; $('wwAmmo').textContent = A ? (k === 'molotov' ? `${A.mag} قزايز` : `${A.mag} / ${A.res}`) : ''; }
function wheelPoint(x, y, id){ const W = GW.wheel; if (!W || (W.pid != null && id !== W.pid)) return; const el = document.elementFromPoint(x, y), b = el && el.closest && el.closest('#wwheel [data-w]'); if (b) wheelHover(b.dataset.w); }
function closeWheel(apply){ const W = GW.wheel; if (!W) return; GW.wheel = null; W.el.remove(); if (apply && W.pick !== WEAP.cur) setWeapon(W.pick); }
let wbHold = null;
function weapBtnDown(e){ e.stopPropagation(); if (state !== 'play') return; const pid = e.pointerId; wbHold = setTimeout(() => { wbHold = 'open'; openWheel(); if (GW.wheel) GW.wheel.pid = pid; }, 280); try { e.target.setPointerCapture(e.pointerId); } catch (er){} }
function weapBtnUp(e){ if (wbHold === 'open'){ wbHold = null; closeWheel(true); return; } if (wbHold){ clearTimeout(wbHold); wbHold = null; cycleWeapon(); } }
addEventListener('pointermove', e => { if (GW.wheel) wheelPoint(e.clientX, e.clientY, e.pointerId); });
addEventListener('keydown', e => { if (state !== 'play') return; if (e.code === 'Tab'){ e.preventDefault(); if (!e.repeat) openWheel(); } if (e.code === 'KeyR' && !e.repeat) startReload(); });
addEventListener('keyup', e => { if (e.code === 'Tab') closeWheel(true); });

// ---------- the hero holding a gun: which clips, recoil on top ----------
function gunSetFor(id){ const G = GUN[id]; if (!G || !G.set) return null; return G.set === 'pistol' ? { idle: 'pistolIdle', walk: 'pistolWalk', run: 'run' } : { idle: 'rifleIdle', walk: 'rifleWalk', run: 'rifleRun' }; }
const _gU = new THREE.Vector3(0, 1, 0), _gF = new THREE.Vector3(), _gR = new THREE.Vector3(), _gT = new THREE.Vector3(), _gM = new THREE.Matrix4(), _gQ = new THREE.Quaternion(), _gP = new THREE.Vector3();
const _gX = new THREE.Vector3(), _gY = new THREE.Vector3(), _gZ = new THREE.Vector3(), _gS = new THREE.Vector3(1, 1, 1);
function applyRecoil(d){
  if (d !== hero.d || !d.R) return;
  const id = WEAP.cur, G = GUN[id], holder = WEAP.meshes[id];
  if (!G || !G.set || !holder || !holder.visible || d.fall > .05 || MEL.atk || MEL.dodge) return;
  const R = d.R, B = R.bones, pistol = G.set === 'pistol', aim = GW.aiming > 0 || GW.fireT > 0, rel = GW.reloadT > 0;
  R.mesh.updateMatrixWorld(true);
  _gF.set(Math.sin(d.yaw), 0, Math.cos(d.yaw)); _gR.crossVectors(_gF, _gU);   // forward, his right
  const sR = B.upperArmR.getWorldPosition(new THREE.Vector3()), sL = B.upperArmL.getWorldPosition(new THREE.Vector3());
  const k = GW.fireT > 0 ? GW.fireT / .12 * G.recoil : 0;
  // where the gun hand goes, and where the barrel points
  const bdir = _gT.copy(_gF);
  let grip;
  if (pistol){
    grip = sR.clone().lerp(sL, .35);
    if (aim) grip.addScaledVector(_gF, .48).addScaledVector(_gU, -.04); else { grip.addScaledVector(_gF, .25).addScaledVector(_gU, -.42); bdir.addScaledVector(_gU, -.9); }
  } else {
    grip = sR.clone().addScaledVector(_gF, aim ? .2 : .16).addScaledVector(_gU, aim ? -.1 : -.26).addScaledVector(_gR, -.02);
    if (!aim) bdir.addScaledVector(_gU, -.35);
  }
  if (rel) bdir.addScaledVector(_gU, -.8).addScaledVector(_gR, -.4);
  bdir.normalize();
  grip.addScaledVector(bdir, -k * .07).addScaledVector(_gU, k * .03);
  // the gun: model +Y along the barrel, model -Z up
  _gY.copy(bdir); _gZ.copy(_gU).addScaledVector(bdir, -bdir.dot(_gU)).normalize().negate(); _gX.crossVectors(_gY, _gZ).normalize();
  _gM.makeBasis(_gX, _gY, _gZ); _gQ.setFromRotationMatrix(_gM);
  if (k) _gQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), k * .35));   // the muzzle jumps up
  // the right hand on the grip, the left hand on the gun
  ikArm(R, -1, grip, _gR.clone().multiplyScalar(.6).addScaledVector(_gU, -1));
  const offH = pistol ? grip.clone().addScaledVector(_gR, -.05).addScaledVector(_gU, -.02) : grip.clone().addScaledVector(bdir, .3).addScaledVector(_gU, -.02);
  if (!rel) ikArm(R, 1, offH, _gR.clone().multiplyScalar(-.6).addScaledVector(_gU, -1));
  // place the gun on the right hand in world space (it is a child of the forearm)
  R.mesh.updateMatrixWorld(true);
  const hand = B.handR.getWorldPosition(_gP);
  _gM.compose(hand, _gQ, _gS); const inv = new THREE.Matrix4().copy(holder.parent.matrixWorld).invert(); _gM.premultiply(inv);
  _gM.decompose(holder.position, holder.quaternion, new THREE.Vector3());
  holder.userData.gunPlaced = true;
}
// a melee hit with a blade bleeds (19r calls this)
function meleeLanded(tg, big){
  if (!tg || !BLOOD.on) return; const W = WEAPONS[WEAP.cur];
  const blade = W && W.blade, p = new THREE.Vector3(tg.x, 1.2, tg.z), dir = new THREE.Vector3(tg.x - hero.pos.x, 0, tg.z - hero.pos.z).normalize();
  if (blade){ bleed(p, dir, big || W.heavy); if (tg.n && tg.n.state === 'down' && !(tg.n.poolT > 0)) tg.n.poolT = .4; }
  else if (big && Math.random() < .5) burst('blood', p, dir, 3, 1.6);
}

// ---------- HUD: ammo ----------
const ammoBox = document.createElement('div'); ammoBox.id = 'ammoBox'; ammoBox.hidden = true; document.body.appendChild(ammoBox);
let ammoTxt = '';
function updateAmmoHud(){
  const id = WEAP.cur, A = AMMO[id], show = state === 'play' && !hero.veh && !!A && isGun(id);
  ammoBox.hidden = !show; if (!show) return;
  const t = id === 'molotov' ? `${A.mag}` : GW.reloadT > 0 ? `بيعمّر…` : `${A.mag} <small>/ ${A.res}</small>`;
  if (t !== ammoTxt){ ammoTxt = t; ammoBox.innerHTML = t; }
}
// blood on / off in the settings
function renderBloodBtn(){ const b = $('bloodBtn'); if (!b) return; b.textContent = BLOOD.on ? 'شغال' : 'مقفول'; b.classList.toggle('on', BLOOD.on); }
if ($('bloodBtn')){ $('bloodBtn').onclick = () => { BLOOD.on = !BLOOD.on; store.set('ty_blood', BLOOD.on ? '1' : '0'); renderBloodBtn(); if (!BLOOD.on){ for (const M of FX.pools) M.m.visible = M.m.material !== poolMat; for (const M of FX.marks) if (M.m.material === splatMat) M.m.visible = false; } }; renderBloodBtn(); }

// ---------- weapon models from assets/models/weapons/<id>.glb (when they are there): replace the drawn ones ----------
const WFIT = {}, WMODEL = {};   // per-model fit in the hand: { s: scale, p: [x,y,z], r: [x,y,z] } (filled in after looking at each model)
async function loadWeaponModels(){
  let list; try { list = await (await fetch('assets/models/weapons/list.json')).json(); } catch (e){ return; }
  const fits = list.fit || {}; list = list.ids || list;
  const { GLTFLoader } = await import('three/addons/GLTFLoader.js'); const L = new GLTFLoader();
  for (const id of list){
    try {
      const g = (await L.loadAsync(`assets/models/weapons/${id}.glb`)).scene, F = WFIT[id] || fits[id] || {};
      g.traverse(o => { if (o.isMesh){ o.castShadow = true; } }); WMODEL[id] = g;
      if (F.s) g.scale.setScalar(F.s); if (F.p) g.position.fromArray(F.p); if (F.r) g.rotation.set(F.r[0], F.r[1], F.r[2]);
      delete WEAP.meshes[id]; const holder = weaponMesh(id) || (() => { const h = new THREE.Group(); return h; })();
      if (holder){ holder.children.slice().forEach(c => holder.remove(c)); holder.add(g); holder.visible = WEAP.cur === id; WEAP.meshes[id] = holder; }
    } catch (e){ console.warn('weapon model', id, e); }
  }
}
setTimeout(loadWeaponModels, 1500);

// ---------- every frame ----------
function weaponsUpdate(dt){
  if (AC && !GSND.loading) loadGunSfx();
  if (GW.cd > 0) GW.cd -= dt; if (GW.fireT > 0) GW.fireT -= dt; if (GW.aiming > 0) GW.aiming -= dt;
  if (flash3.visible && GW.fireT < .07){ flash3.visible = false; muzzle.intensity = 0; tracer.visible = false; } if (GW.aimT > 0) GW.aimT -= dt; GW.recoil = Math.max(0, GW.recoil - dt * 3.2);
  if (GW.reloadT > 0){ GW.reloadT -= dt; if (GW.reloadT <= 0) finishReload(); if (WEAP.cur !== GW.reloadOf) GW.reloadT = 0; }
  const d = hero.d, id = WEAP.cur, G = GUN[id], playing = state === 'play' && !hero.veh && !hero.locked;
  if (playing && G && G.auto && GW.trigger) fireGun();
  if (playing && G && G.reload && WEAP.cur === id && AMMO[id].mag === 0 && AMMO[id].res > 0 && GW.reloadT <= 0 && GW.cd <= 0) startReload();   // empty: reload by itself
  if (GW.throwAt){ GW.throwAt.t -= dt; if (GW.throwAt.t <= 0){ const T0 = GW.throwAt; GW.throwAt = null; launchMolotov(T0); } }
  if (WEAP.cur === 'molotov' && AMMO.molotov.mag <= 0 && !GW.throwAt && !MOLO.list.length) setWeapon('none', true);
  // aim mark and the hero's gun pose
  d.gunSet = playing && G && G.set ? gunSetFor(id) : null;
  const wantAim = !!(GW.rmb && playing && G && G.set);
  GW.aimK += ((wantAim ? 1 : 0) - GW.aimK) * damp(10, dt);
  if (GW.aimK > .5){ const f = camForward(); d.aimYaw = Math.atan2(f.x, f.z); d.yaw = d.aimYaw; GW.aiming = .2; } else d.aimYaw = null;
  document.body.classList.toggle('aiming', GW.aimK > .5);
  let tg = null; if (playing && G && G.range && d.gunSet) tg = GW.aimK > .5 ? crossTarget(G.range) : aimTarget(G.range);
  xhair.classList.toggle('on', !!tg && GW.aimK > .5);
  if (tg && !(GW.aimT > 0) && GW.aimK <= .5 && !isHostile(tg)){ tg = null; GW.lock = null; }   // just holding the gun: no lock on people sitting around
  aimMark.visible = !!tg; if (tg){ aimMark.position.set(tg.x, (tg.y || 0) + .05, tg.z); aimMark.rotation.y += dt * 2; }
  if (d.gunSet && d.is3D && CLIPS_READY && hero.vel.lengthSq() < .3 && !MEL.atk){
    if (GW.reloadT <= 0 && (GW.aimT > 0 || tg)){ GW.aiming = .2; if (tg && GW.aimK <= .5) d.yaw = lerpAngle(d.yaw, Math.atan2(tg.x - hero.pos.x, tg.z - hero.pos.z), damp(12, dt)); }
  }
  // time slows while the wheel is open
  if (GW.wheel) MEL.slow = Math.max(MEL.slow, .05);
  updateMolotovs(dt);
  // bits, shells, marks
  for (const b of FX.bits){ if (b.life <= 0) continue; const K = b.K; b.life -= dt; b.v.y -= K.g * dt; b.v.multiplyScalar(Math.exp(-K.drag * dt)); b.m.position.addScaledVector(b.v, dt);
    const gy = groundY(b.m.position.x, b.m.position.z); if (b.m.position.y < gy + .02){ b.m.position.y = gy + .02; b.v.set(0, 0, 0); }
    b.m.scale.multiplyScalar(Math.max(.2, 1 + K.grow * dt)); const k = b.life / b.max; b.m.material.opacity = K.op * Math.min(1, k * 2.2);
    if (b.life <= 0) b.m.visible = false; }
  for (const s of FX.shells){ if (s.life <= 0) continue; s.life -= dt; s.v.y -= 9.8 * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 14;
    const gy = groundY(s.m.position.x, s.m.position.z) + .01; if (s.m.position.y < gy){ s.m.position.y = gy; if (Math.abs(s.v.y) > 1){ s.v.y *= -.35; s.v.x *= .5; s.v.z *= .5; if (!s.clinked){ s.clinked = true; playS('metall', .12 * sfxVol(s.m.position.x, s.m.position.z, 6), 2.3); } } else s.v.set(0, 0, 0); }
    if (s.life <= 0){ s.m.visible = false; s.clinked = false; } }
  for (const list of [FX.marks, FX.pools]) for (const M of list){ if (!M.m.visible) continue; M.life -= dt; if (M.grow && M.m.scale.x < M.grow) M.m.scale.setScalar(Math.min(M.grow, M.m.scale.x + dt * .5)); if (M.life < 3) M.m.material.opacity !== undefined && (M.m.scale.multiplyScalar(1 - dt * .3)); if (M.life <= 0) M.m.visible = false; }
  updateAmmoHud();
}

// ---------- PC: hold the right mouse button to aim (left button fires) ----------
canvas.addEventListener('mousedown', e => { if (e.button === 2) GW.rmb = true; });
addEventListener('mouseup', e => { if (e.button === 2) GW.rmb = false; });
addEventListener('blur', () => { GW.rmb = false; });
const xhair = document.createElement('div'); xhair.id = 'xhair'; document.body.appendChild(xhair);
const _cf = new THREE.Vector3();
function camForward(){ return camera.getWorldDirection(_cf); }
// what is under the crosshair (a small cone around the screen centre)
function crossTarget(range){
  const cp = camera.position, f = camForward(); let best = null, bs = 1e9;
  for (const c of gunTargets()){
    const dx = c.x - cp.x, dy = (c.y || 0) + 1.1 - cp.y, dz = c.z - cp.z, dd = Math.hypot(dx, dy, dz); if (dd > range + 4) continue;
    const cos = (dx * f.x + dy * f.y + dz * f.z) / dd; if (cos < .992) continue;
    const s = (1 - cos) * 50 + dd * .02; if (s < bs && lineOfSight(hero.pos.x, hero.pos.z, c.x, c.z)){ bs = s; best = c; }
  }
  return best;
}

// ---------- real gunshots (The Free Firearm Sound Library, CC0): a Walther 9mm, an AK-47 and a Benelli Nova, close and far ----------
const GSND = { buf: {}, loading: false };
async function loadGunSfx(){
  if (GSND.loading || !AC) return; GSND.loading = true;
  for (const k of ['pistol', 'pistol-far', 'ak', 'ak-far', 'shotgun', 'shotgun-far']){
    try { const ab = await (await fetch(`assets/sfx/guns/${k}.mp3`)).arrayBuffer(); GSND.buf[k] = await AC.decodeAudioData(ab); } catch (e){ console.warn('gun sfx', k, e); }
  }
}
// play one; false = not loaded yet (the drawn sound is used instead)
function playGun(k, vol = 1){
  if (!AC || !GSND.buf[k]){ loadGunSfx(); return true; }   // not loaded yet: silence, never the old drawn sound
  if (muted) return true;
  const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = GSND.buf[k]; s.playbackRate.value = .97 + Math.random() * .06; g.gain.value = vol * 1.35;
  s.connect(g); g.connect(sfx || master); s.start();
  if (!k.endsWith('far')){ const o = AC.createOscillator(), og = AC.createGain(), t0 = AC.currentTime; o.type = 'sine'; o.frequency.setValueAtTime(k === 'shotgun' ? 70 : 85, t0); o.frequency.exponentialRampToValueAtTime(38, t0 + .18); og.gain.setValueAtTime(vol * (k === 'shotgun' ? .9 : .55), t0); og.gain.exponentialRampToValueAtTime(.001, t0 + .22); o.connect(og); og.connect(sfx || master); o.start(t0); o.stop(t0 + .25); }   // the thump in the chest
  return true;
}

