// ================= the police: one wanted level (0–5 stars) for the whole game =================
// Crimes raise the stars (a cop seeing it = at once, people seeing it = «حد بلّغ» a few seconds later). Police cars are real
// cars with the same physics as yours: they take the roads, come straight at you when they see you, ram the back corner
// of your car (PIT), skid, crash and back up when stuck. Officers get out when you are on foot or stop: 1–2 stars they come
// to arrest you, 3+ they shoot. 3+ stars: road blocks ahead of you; 4+: a helicopter. Out of sight, a search circle shows on
// the map: get out of it and stay unseen for a few seconds (more stars = longer) and they lose you. Missions don't count crimes.
const POL = { on: false, heat: 0, t: 0, trackT: 0, seen: false, losT: 0, lastSeen: new THREE.Vector3(), unseenT: 0, zoneR: 0, units: [], cops: [], bustT: 0, bustSaid: false, panel: false, pending: [], ramT: 0, blockT: 12, heli: null, checkT: 0 };
const POL_STATION = new THREE.Vector3(60.5, .15, 92.5);
const POL_CARS = [0, 1, 2, 3, 4, 5], POL_BLOCK = [6, 7];   // chase cars by stars; two more for a road block
// a police car is a real car (05-vehicles + driveVehicle in 13): it skids, crashes, rams and gets stuck like yours
function polUnit(i){
  if (!POL.units[i]){ const v = addVehicle('police', -4000 - i * 30, -4000, 0, '#f4f4f4'); v.ai = true; v.mesh.visible = false; POL.units[i] = { v, pos: v.pos, active: false, path: [], repath: 0, stuckT: 0, revT: 0, crewOut: false, block: false, side: i % 2 ? 1 : -1, searchPt: null }; }
  return POL.units[i];
}
function crimeAllowed(){ return state === 'play' && modeId !== 'cash' && !!modeObj.vehicles && !(modeId === 'story' && ST2.phase === 'active') && !CUT.on && !ST.kind && !HOUSE.inside; }
function crime(kind, pos, stars = 1, victim = null){
  streetDrama(pos, 2);
  if (!crimeAllowed()) return;
  const copSees = POL.on && (POL.units.some(u => u.active && u.pos.distanceTo(pos) < 45) || POL.cops.some(c => c.on && c.state !== 'down' && c.pos.distanceTo(pos) < 35));
  if (copSees || kind === 'shoot' || kind === 'copHit'){ wantedUp(stars); return; }
  const witness = npcs.some(n => n !== victim && n.state !== 'hidden' && n.state !== 'down' && n.g.visible && n.g.position.distanceTo(pos) < 22);
  if (witness && !POL.pending.some(c => c.t > 0)) POL.pending.push({ t: 2.5 + Math.random() * 2, stars });
}
function wantedUp(n = 1){
  POL.heat = Math.min(5, POL.heat + n); POL.t = 0; POL.unseenT = 0; POL.seen = true; POL.lastSeen.copy(heroAt()); POL.trackT = 10 + POL.heat * 3;   // the radio: for a while they know where you are
  if (!POL.on){ POL.on = true; banner('البوليس جاي!', 'police', 2.5); }
  spawnUnits(); renderWanted();
}
// ---- where a police car can come from: a road, out of sight, preferably ahead of where you are going ----
const _pFr = new THREE.Frustum(), _pPm = new THREE.Matrix4(), _pV = new THREE.Vector3();
function onScreen(x, z){ _pPm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _pFr.setFromProjectionMatrix(_pPm); _pV.set(x, 1.2, z); return _pFr.containsPoint(_pV) && camera.position.distanceTo(_pV) < 140; }
function spawnPoint(minR, maxR, ahead){
  const f = POL.on && !POL.seen ? POL.lastSeen : heroAt(), dirA = hero.veh ? hero.veh.yaw : Math.atan2(hero.vel.x, hero.vel.z);
  for (let k = 0; k < 60; k++){
    const a = ahead && k < 36 ? dirA + (Math.random() - .5) * 1.5 : Math.random() * 6.28, r = minR + Math.random() * (maxR - minR);
    let px = clamp(f.x + Math.sin(a) * r, X0 + 3, XMAX - 3), pz = clamp(f.z + Math.cos(a) * r, Z0 + 3, ZMAX - 3);
    const sx = snapTo(ROADS_X, px), sz = snapTo(ROADS_Z, pz); let yaw;
    if (Math.abs(px - sx) < Math.abs(pz - sz)){ px = sx; yaw = pz > f.z ? Math.PI : 0; } else { pz = sz; yaw = px > f.x ? -Math.PI / 2 : Math.PI / 2; }
    if (Math.hypot(px - f.x, pz - f.z) < minR * .75 || !inWorld(px, pz)) continue;
    if (POL.on && !POL.seen && Math.hypot(px - heroAt().x, pz - heroAt().z) < 75) continue;   // searching: never right next to you
    if (onScreen(px, pz) && Math.hypot(px - f.x, pz - f.z) < 150 && lineOfSight(heroAt().x, heroAt().z, px, pz)) continue;   // in plain view: no
    if (vehBlockedAt(px, pz, 2.6) || staticBlocked(px, pz, 1.6)) continue;
    return { x: px, z: pz, yaw };
  }
  return null;
}
function activateUnit(u, P){
  const v = u.v; v.pos.set(P.x, groundY(P.x, P.z), P.z); v.yaw = P.yaw; v.mesh.rotation.set(0, P.yaw, 0); v.speed = P.speed || 0; v.slip = 0; v.steer = 0; v.dmg = 0; v.broke = false; v.kick = null;
  v.max = 19.5 + POL.heat * .6; v.mesh.visible = true; u.active = true; u.path = []; u.repath = 0; u.stuckT = 0; u.revT = 0; u.crewOut = false; u.searchPt = null;
}
function parkUnit(u){ u.active = false; u.block = false; const v = u.v; v.mesh.visible = false; v.speed = 0; v.pos.set(-4000 - POL.units.indexOf(u) * 30, 0, -4000); }
function spawnUnits(){
  const want = Math.min(POL_CARS.length, POL.heat);
  for (let i = 0; i < want; i++){ const u = polUnit(POL_CARS[i]); if (u.active) continue; const P = spawnPoint(75, 140, i % 2 === 0); if (P){ P.speed = 12; activateUnit(u, P); } }
}
function polEnd(msg, cls){
  if (POL.panel){ POL.panel = false; hero.locked = false; const b = $('bustBox'); if (b) b.hidden = true; document.body.classList.remove('in-bust'); }
  POL.on = false; POL.heat = 0; POL.pending.length = 0; POL.bustT = 0; POL.bustSaid = false;
  POL.units.forEach(u => { if (hero.veh !== u.v) parkUnit(u); else u.active = false; });
  POL.cops.forEach(c => copHide(c)); heliHide();
  if (sirenGain && !chaser.active) sirenGain.gain.value = 0; setLoop('heli', 0, 90, 'lowpass');
  renderWanted(); if (msg) banner(msg, cls || 'ok', 3);
}
function renderWanted(){ const el = $('wantedBox'); el.hidden = !POL.on; el.innerHTML = '<b class="st-on">' + '★'.repeat(POL.heat) + '</b><b class="st-off">' + '★'.repeat(5 - POL.heat) + '</b>'; el.classList.toggle('search', POL.on && !POL.seen); }

// a route along the road grid starting from the road the car is on (north-south or east-west), to the road beside the target
function polRoute(from, to){
  const xr = snapTo(ROADS_X, from.x), zr = snapTo(ROADS_Z, from.z), tx = snapTo(ROADS_X, to.x), tz = snapTo(ROADS_Z, to.z);
  const onX = Math.abs(from.x - xr) < 7, onZ = Math.abs(from.z - zr) < 7, V3 = (x, z) => new THREE.Vector3(x, 0, z);
  const pts = [];
  if (onX && (!onZ || Math.abs(from.x - xr) <= Math.abs(from.z - zr))) pts.push(V3(xr, from.z), V3(xr, tz), V3(tx, tz));
  else if (onZ) pts.push(V3(from.x, zr), V3(tx, zr), V3(tx, tz));
  else return roadPath(from, to);
  if (Math.abs(to.x - tx) < Math.abs(to.z - tz)) pts.push(V3(tx, to.z)); else pts.push(V3(to.x, tz));
  pts.push(to.clone());
  return pts.filter((p, i) => i === 0 || p.distanceTo(pts[i - 1]) > .5);
}
// a game screen is open (domino, tawla, the phone, a shop, a station, a dance): the police wait
function uiBusy(){
  const b = document.body.classList;
  return b.contains('in-domino') || b.contains('in-station') || b.contains('in-rhythm') || b.contains('in-act') || CUT.on
    || ['domino', 'tawla', 'phone', 'shop', 'missions', 'pause', 'settings'].some(id => { const e = $(id); return e && !e.hidden; });
}

// ---- the driver: follows the roads, comes straight at you when it can see you, rams (PIT) your car from the back corner ----
function aiDrive(u, dt, t, i){
  const v = u.v; if (hero.veh === v){ v.ai = false; u.active = false; delete POL.units[POL.units.indexOf(u)]; POL.cops.forEach(c => { if (c.unit === u) c.unit = null; }); return; }   // you took it: yours now
  const f = heroAt(), d = Math.hypot(f.x - v.pos.x, f.z - v.pos.z), seen = POL.seen;
  let tgt;
  if (seen){
    tgt = f.clone();
    if (hero.veh){
      const hv = hero.veh, hfx = Math.sin(hv.yaw), hfz = Math.cos(hv.yaw), lead = clamp(d / 28, 0, 1.3);
      tgt.x += hfx * hv.speed * lead; tgt.z += hfz * hv.speed * lead;
      if (d < 14){ tgt.set(hv.pos.x - hfx * 1.5 + hfz * u.side * .9 + hfx * hv.speed * .25, 0, hv.pos.z - hfz * 1.5 - hfx * u.side * .9 + hfz * hv.speed * .25); }   // the back corner: a PIT
    }
  } else {
    // searching: drive to where you were seen, then around it
    if (!u.searchPt || Math.hypot(u.searchPt.x - v.pos.x, u.searchPt.z - v.pos.z) < 9){ const a = Math.random() * 6.28, r = Math.random() * POL.zoneR * .8; u.searchPt = new THREE.Vector3(POL.lastSeen.x + Math.sin(a) * r, 0, POL.lastSeen.z + Math.cos(a) * r); }
    tgt = u.searchPt;
  }
  u.repath -= dt;
  if (u.repath <= 0){ u.repath = .45; const dt2 = Math.hypot(tgt.x - v.pos.x, tgt.z - v.pos.z); u.path = dt2 < 38 && lineOfSight(v.pos.x, v.pos.z, tgt.x, tgt.z) ? [tgt.clone()] : polRoute(v.pos, tgt); }
  const D2 = w => Math.hypot(w.x - v.pos.x, w.z - v.pos.z); let wp = tgt, wi = -1;
  for (let k = 0; k < u.path.length; k++){ const w = u.path[k], nx2 = u.path[k + 1]; if (D2(w) < 6) continue; if (nx2 && D2(nx2) < Math.hypot(nx2.x - w.x, nx2.z - w.z) - .5) continue; wp = w; wi = k; break; }
  const ang = lerpAngle(0, Math.atan2(wp.x - v.pos.x, wp.z - v.pos.z) - v.yaw, 1);
  let steer = clamp(ang * 2.4, -1, 1);
  let want = v.max * (POL.heat >= 3 ? 1 : .9);
  if (Math.abs(ang) > .45) want = Math.min(want, 22 - 14 * clamp((Math.abs(ang) - .45) / 1.1, 0, 1));
  // slow down before a corner of the route
  if (wi >= 0 && u.path[wi + 1]){ const n2 = u.path[wi + 1], a1 = Math.atan2(wp.x - v.pos.x, wp.z - v.pos.z), a2 = Math.atan2(n2.x - wp.x, n2.z - wp.z), turn = Math.abs(lerpAngle(0, a2 - a1, 1)), dw = D2(wp); if (turn > .7 && dw < 24) want = Math.min(want, 9 + dw * .55); }
  if (!hero.veh && seen && d < 26) want = d > 13 ? 9 : 0;              // you are on foot: pull up, the officers get out
  if (hero.veh && seen && d < 16) want = Math.abs(hero.veh.speed) < 3 ? (d > 10 ? 4 : 0) : Math.max(Math.abs(hero.veh.speed) + 6, 11);   // catch up and hit; you stopped: block, don't grind
  if (!seen && D2(tgt) < 10) want = Math.min(want, 6);
  if (u.crewOut) want = 0;
  let thr = clamp((want - v.speed) / 4, -1, 1), hand = false;
  if (want < v.speed - 1.5) thr = v.speed > 2 ? -1 : 0;
  if (Math.abs(ang) > 2.1 && v.speed > 9 && !u.crewOut){ hand = true; thr = .6; }                      // a handbrake turn
  if (Math.abs(ang) > 2.3 && v.speed < 5 && want > 0){ thr = -1; steer = -steer; }                     // too sharp: back up and turn
  if (thr > .3 && Math.abs(v.speed) < 1.2) u.stuckT += dt; else u.stuckT = Math.max(0, u.stuckT - dt * 2);
  if (u.stuckT > 1){ u.revT = 1.1; u.stuckT = 0; }
  if (u.revT > 0){ u.revT -= dt; thr = -1; steer = -steer; hand = false; }
  driveVehicle(v, dt, -steer, -thr, hand);
  const on = Math.floor(t * 7 + i) % 2 === 0; v.mesh.userData.red.emissiveIntensity = on ? 3 : .2; v.mesh.userData.blue.emissiveIntensity = on ? .2 : 3;
}

// ---- officers on foot: 1–2 stars they come to arrest you, 3+ they shoot ----
const COP_MAX = 8;
function copMake(){
  const d = makeCharacter('soldier', CH.hero, 1.8); d.root.visible = false;
  return { d, pos: d.root.position, on: false, state: 'out', hp: 100, gunCd: 1, unit: null, vel: new THREE.Vector3(), hit: false, downT: 0 };
}
function copSpawn(unit, side){
  let c = POL.cops.find(c => !c.on); if (!c){ if (POL.cops.length >= COP_MAX) return null; c = copMake(); POL.cops.push(c); }
  const v = unit.v, rx = Math.cos(v.yaw), rz = -Math.sin(v.yaw);
  let x = v.pos.x + rx * side * 1.7, z = v.pos.z + rz * side * 1.7; if (staticBlocked(x, z, .3)){ x = v.pos.x - rx * side * 1.7; z = v.pos.z - rz * side * 1.7; }
  c.pos.set(x, groundY(x, z), z); c.on = true; c.state = 'out'; c.hp = 100; c.unit = unit; c.gunCd = .8 + Math.random(); c.hit = false; c.downT = 0;
  c.d.root.visible = true; c.d.downT = 0; c.d.fall = 0; c.d.hitT = 0; return c;
}
function copHide(c){ c.on = false; c.d.root.visible = false; c.unit = null; }
function copHit(c, power){
  if (!c.on || c.state === 'down') return;
  c.hp -= power * 22; c.d.hitT = .45; thwack();
  if (!c.hit){ c.hit = true; crime('copHit', c.pos, 1); }
  if (c.hp <= 0){ c.state = 'down'; c.d.downT = 999; c.downT = 40; crime('copHit', c.pos, 1); }
}
const copTracers = [0, 1, 2, 3].map(() => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: .8 })); l.visible = false; scene.add(l); return { l, t: 0 }; });
function copShoot(c){
  const f = heroAt(), o = new THREE.Vector3(c.pos.x, c.pos.y + 1.4, c.pos.z), d = o.distanceTo(f);
  const moving = hero.veh ? Math.abs(hero.veh.speed) : hero.vel.length();
  const hitP = clamp(.62 - d * .016 + POL.heat * .05 - moving * .018 - (hero.veh ? .1 : 0), .08, .85);
  const hit = Math.random() < hitP, end = new THREE.Vector3(f.x + (hit ? 0 : (Math.random() - .5) * 3), (hero.veh ? f.y + .9 : hero.pos.y + 1.2) + (hit ? 0 : (Math.random() - .3) * 1.5), f.z + (hit ? 0 : (Math.random() - .5) * 3));
  const T = copTracers.find(T => T.t <= 0) || copTracers[0]; T.l.geometry.setFromPoints([o, end]); T.l.visible = true; T.t = .06;
  burst('smoke', o, null, 1, .3); { const vol = clamp(1 - d / 70, .12, .8); if (!playGun(d < 18 ? 'pistol' : 'pistol-far', vol)) noise(.14, 2200, clamp(.5 - d * .008, .08, .5)); } c.d.strike = { clip: 'pistolShoot', t: 1.0 }; c.fireT = .15;
  if (hit){
    if (hero.veh){ hero.veh.dmg = (hero.veh.dmg || 0) + 3; if (Math.random() < .4) heroDamage(3 * DIFF.dmg, 'cop'); burst('spark', end, null, 3, 2); }
    else { heroDamage((5 + POL.heat) * DIFF.dmg, 'cop'); bleed(new THREE.Vector3(hero.pos.x, hero.pos.y + 1.2, hero.pos.z), new THREE.Vector3(f.x - c.pos.x, 0, f.z - c.pos.z).normalize(), false); }
  } else if (Math.random() < .5) burst('dust', new THREE.Vector3(end.x, groundY(end.x, end.z) + .05, end.z), null, 2, 1);
}
function copStep(c, dt, t){
  const d0 = c.d;
  if (c.state === 'down'){ c.downT -= dt; if (c.downT <= 0 && Math.hypot(c.pos.x - hero.pos.x, c.pos.z - hero.pos.z) > 40) copHide(c); animDoll(d0, 0, 0, dt, t); return; }
  const f = heroAt(), dx = f.x - c.pos.x, dz = f.z - c.pos.z, d = Math.hypot(dx, dz) || 1;
  const armed = POL.heat >= 3, los = lineOfSight(c.pos.x, c.pos.z, f.x, f.z);
  let vx = 0, vz = 0, sp = 0;
  const away = hero.veh && Math.abs(hero.veh.speed) > 4;
  if (c.state === 'back'){ c.backT = (c.backT || 0) + dt; if (c.backT > 3.5){ copHide(c); return; } } else c.backT = 0;   // can't reach the car in time: he jumps in anyway
  if (c.state === 'back' || away){
    // back into the car
    c.state = 'back'; const v = c.unit && c.unit.active ? c.unit.v : null;
    if (!v){ copHide(c); return; }
    const ex = v.pos.x - c.pos.x, ez = v.pos.z - c.pos.z, e = Math.hypot(ex, ez) || 1;
    if (e < 2.4){ copHide(c); return; }
    sp = 5.6; vx = ex / e * sp; vz = ez / e * sp;
    if (!away && (!hero.veh || Math.abs(hero.veh.speed) < 3) && d < 30) c.state = 'run';
  } else if (armed){
    c.state = 'run';
    if (d > 15 || !los){ sp = 5.4; vx = dx / d * sp; vz = dz / d * sp; }
    else if (d < 6){ sp = 2; vx = -dx / d * sp; vz = -dz / d * sp; }
    c.gunCd -= dt;
    if (c.gunCd <= 0 && los && d < 32){ c.gunCd = 1.15 + Math.random() * .8 - POL.heat * .08; copShoot(c); }
    if (sp < 3) d0.strike = { clip: 'pistolShoot', t: 1.0 };
  } else {
    c.state = 'run';
    if (d > 1.15){ sp = d > 4 ? 5.6 : 3; vx = dx / d * sp; vz = dz / d * sp; }
  }
  if (sp){ moveWithSlide(c.pos, vx * dt, vz * dt, .3); c.pos.y = groundY(c.pos.x, c.pos.z); }
  // apart from each other
  for (const o of POL.cops) if (o !== c && o.on){ const ex = c.pos.x - o.pos.x, ez = c.pos.z - o.pos.z, e = Math.hypot(ex, ez); if (e < .8 && e > .01){ c.pos.x += ex / e * (.8 - e) * .5; c.pos.z += ez / e * (.8 - e) * .5; } }
  animDoll(d0, vx, vz, dt, t);
}

// ---- the helicopter (4+ stars): follows you from above, sees over the roofs, a searchlight at night ----
function heliMake(){
  const g = new THREE.Group(), p = [];
  box(p, 1.5, 1.3, 3.2, 0, 0, 0, '#1d3a6b'); box(p, 1.3, .9, 1.2, 0, .1, 1.5, '#9fc4e8'); box(p, .35, .35, 3.2, 0, .2, -3, '#1d3a6b'); box(p, .1, .9, .6, 0, .6, -4.4, '#e8e8e8');
  box(p, .12, .12, 2.4, -.65, -.85, 0, '#222'); box(p, .12, .12, 2.4, .65, -.85, 0, '#222');
  const body = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .3 })); g.add(body);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.5, .05, .28), new THREE.MeshStandardMaterial({ color: 0x222222 })); rotor.position.y = .85; g.add(rotor);
  const rotor2 = rotor.clone(); rotor2.rotation.y = Math.PI / 2; rotor.add(rotor2);
  const spot = new THREE.SpotLight(0xfff4d0, 0, 70, .32, .6, 1.2); spot.position.set(0, -.6, .5); g.add(spot); g.add(spot.target);
  g.visible = false; scene.add(g);
  return { g, rotor, spot, pos: g.position, on: false, ang: 0 };
}
function heliHide(){ if (POL.heli){ POL.heli.on = false; POL.heli.g.visible = false; POL.heli.spot.intensity = 0; } }
function heliStep(dt, t){
  const H = POL.heli || (POL.heli = heliMake()); const f = heroAt();
  if (!H.on){ H.on = true; H.g.visible = true; const a = Math.random() * 6.28; H.pos.set(f.x + Math.sin(a) * 90, 30, f.z + Math.cos(a) * 90); banner('هليكوبتر البوليس!', 'police', 2); }
  H.ang += dt * .35; const tx = f.x + Math.sin(H.ang) * 14, tz = f.z + Math.cos(H.ang) * 14;
  const ex = tx - H.pos.x, ez = tz - H.pos.z, e = Math.hypot(ex, ez) || 1, sp = Math.min(e, 22 * dt);
  H.pos.x += ex / e * sp; H.pos.z += ez / e * sp; H.pos.y += (24 - H.pos.y) * damp(1, dt);
  H.g.rotation.y = Math.atan2(f.x - H.pos.x, f.z - H.pos.z); H.g.rotation.z = clamp(-ex * .01, -.2, .2);
  H.rotor.rotation.y += dt * 38;
  const night = typeof TOD !== 'undefined' && (TOD.h < 6.5 || TOD.h > 18.5); H.spot.intensity = night ? 60 : 0; H.spot.target.position.set(f.x - H.pos.x, -H.pos.y, f.z - H.pos.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -H.g.rotation.y);
  const near = Math.hypot(f.x - H.pos.x, f.z - H.pos.z); setLoop('heli', muted ? 0 : clamp(.09 - near * .0008, 0, .09) * (.75 + .25 * Math.sin(t * 34)), 90, 'lowpass');
  return near < 75;   // it sees you
}

// ---- a road block (3+ stars): two cars across the road ahead of you, officers beside them ----
function roadBlock(){
  if (!hero.veh || Math.abs(hero.veh.speed) < 9) return false;
  const hv = hero.veh, fx = Math.sin(hv.yaw), fz = Math.cos(hv.yaw), alongX = Math.abs(fx) > Math.abs(fz);
  let px = hv.pos.x + fx * 125, pz = hv.pos.z + fz * 125;
  if (alongX){ pz = snapTo(ROADS_Z, hv.pos.z); } else { px = snapTo(ROADS_X, hv.pos.x); }
  if (!inWorld(px, pz) || (onScreen(px, pz) && lineOfSight(hv.pos.x, hv.pos.z, px, pz) && Math.hypot(px - hv.pos.x, pz - hv.pos.z) < 115)) return false;
  POL_BLOCK.forEach((k, j) => { const u = polUnit(k), s = j ? 1 : -1, P = alongX ? { x: px, z: pz + s * 2.6, yaw: 0 } : { x: px + s * 2.6, z: pz, yaw: Math.PI / 2 };
    if (vehBlockedAt(P.x, P.z, 1.5) || staticBlocked(P.x, P.z, 1.2)) return; activateUnit(u, P); u.block = true; u.blockAt = runTime; u.crewOut = true; copSpawn(u, s); });
  return true;
}

// ---- every frame ----
function updatePolice(dt, t){
  if (shotCd > 0) shotCd -= dt;
  for (const T of copTracers) if (T.t > 0){ T.t -= dt; if (T.t <= 0) T.l.visible = false; }
  for (let i = POL.pending.length - 1; i >= 0; i--){ const c = POL.pending[i]; c.t -= dt; if (c.t <= 0){ POL.pending.splice(i, 1); if (crimeAllowed()){ banner('حد بلّغ البوليس!', 'police', 2); wantedUp(c.stars); } } }
  if (!POL.on) return;
  if (modeId === 'cash' || state === 'menu' || (modeId === 'story' && (ST2.phase === 'active' || ST2.phase === 'intro'))){ polEnd(null); return; }
  if (uiBusy() && !POL.panel) return;
  if (HOUSE.inside){   // in a shop: if they saw you go in they wait outside a long while; if not, a few seconds
    if (!(POL.inT > 0)){ POL.inT = 0; POL.inSeen = POL.seen; banner(POL.inSeen ? 'البوليس شافك داخل… استنى جوه لحد ما يزهقوا' : 'محدش شافك… استنى ثواني', 'info', 2.4); }
    POL.inT += dt; if (POL.inT > (POL.inSeen ? 28 + POL.heat * 4 : 6)){ POL.inT = 0; polEnd('استخبّيت… البوليس مشي'); } return; }
  POL.inT = 0;
  if (POL.panel) return;
  const f = heroAt(); POL.ramT -= dt; POL.t += dt;
  POL.stopT = hero.veh && Math.abs(hero.veh.speed) < 2 ? (POL.stopT || 0) + dt : 0;
  // who sees you: police cars (70 m), officers (45 m), the helicopter
  let heliSees = false; if (POL.heat >= 4) heliSees = heliStep(dt, t); else heliHide();
  POL.losT -= dt; if (POL.trackT > 0) POL.trackT -= dt;
  if (POL.losT <= 0){ POL.losT = .3; const was = POL.seen;
    const carSees = u => { if (!u.active || u.v === hero.veh) return false; const ex = f.x - u.pos.x, ez = f.z - u.pos.z, e = Math.hypot(ex, ez); if (e > polSightR(55)) return false; if (e > 18 && (Math.sin(u.v.yaw) * ex + Math.cos(u.v.yaw) * ez) / e < -.2) return false; return polLOS(u.pos.x, u.pos.z, f.x, f.z); };
    const direct = heliSees || POL.units.some(u => u && carSees(u))
      || POL.cops.some(c => c.on && c.state !== 'down' && Math.hypot(c.pos.x - f.x, c.pos.z - f.z) < polSightR(45) && polLOS(c.pos.x, c.pos.z, f.x, f.z));
    if (direct && POL.trackT < 2.5) POL.trackT = 2.5;   // a car that sees you tells the others for a moment
    POL.seen = direct || POL.trackT > 0;
    if (was !== POL.seen) renderWanted(); }
  // losing them: get out of the search circle and stay out of sight (or hide long enough inside it)
  POL.zoneR = 45 + POL.heat * 18;
  if (POL.seen){ POL.unseenT = 0; POL.lastSeen.copy(f); }
  else { POL.unseenT += dt; const out = Math.hypot(f.x - POL.lastSeen.x, f.z - POL.lastSeen.z) > POL.zoneR;
    if ((out && POL.unseenT > 3 + POL.heat * 1.2) || POL.unseenT > 22 + POL.heat * 6){ polEnd('البوليس تاه منك'); return; } }
  // keep the right number of cars around: far / lost ones come back ahead of you
  POL.checkT -= dt;
  if (POL.checkT <= 0){ POL.checkT = 1.5; spawnUnits();
    for (const k of POL_CARS){ const u = POL.units[k]; if (!u || !u.active || u.crewOut || hero.veh === u.v) continue; const dd = Math.hypot(u.pos.x - f.x, u.pos.z - f.z); if (POL.trackT > 0 && dd > 125 && !onScreen(u.pos.x, u.pos.z)){ const P = spawnPoint(80, 140, true); if (P){ P.speed = 14; activateUnit(u, P); } } }
    for (const k of POL_BLOCK){ const u = POL.units[k]; if (u && u.active && hero.veh !== u.v && runTime - u.blockAt > 40 && !onScreen(u.pos.x, u.pos.z)){ POL.cops.forEach(c => { if (c.unit === u) copHide(c); }); parkUnit(u); } }
  }
  if (POL.heat >= 3){ POL.blockT -= dt; if (POL.blockT <= 0) POL.blockT = roadBlock() ? 35 : 4; }
  // the cars drive; a car near you on foot (or when you stop) lets its officers out
  POL.units.forEach((u, i) => {
    if (!u.active) return;
    if (u.block){ u.v.speed *= Math.exp(-dt * 4); const on = Math.floor(t * 7 + i) % 2 === 0; u.v.mesh.userData.red.emissiveIntensity = on ? 3 : .2; u.v.mesh.userData.blue.emissiveIntensity = on ? .2 : 3; return; }
    aiDrive(u, dt, t, i);
    const dd = Math.hypot(u.pos.x - f.x, u.pos.z - f.z), stopped = Math.abs(u.v.speed) < 2.5, youSlow = !hero.veh || POL.stopT > 2.5;
    if (!u.crewOut && POL.seen && dd < 24 && stopped && youSlow){ u.crewOut = true; copSpawn(u, -1); if (POL.heat >= 2) copSpawn(u, 1); }
    if (u.crewOut && !POL.cops.some(c => c.on && c.unit === u && c.state !== 'down')) u.crewOut = false;   // everyone back in (or down): drive again
  });
  for (const c of POL.cops) if (c.on) copStep(c, dt, t);
  // the siren: as loud as the nearest car
  const near = Math.min(...POL.units.filter(u => u.active).map(u => Math.hypot(u.pos.x - f.x, u.pos.z - f.z)), 999);
  if (sirenGain && !chaser.active) sirenGain.gain.value = muted ? 0 : .07 * clamp(1 - near / 130, 0, 1);
  // ramming a police car with yours is another crime (them hitting you is not)
  if (hero.veh && Math.abs(hero.veh.speed) > 8 && POL.ramT <= 0) for (const u of POL.units.filter(Boolean)){ if (!u.active || u.v === hero.veh) continue; const ex = u.pos.x - hero.veh.pos.x, ez = u.pos.z - hero.veh.pos.z, e = Math.hypot(ex, ez); if (e < 3.4 && (Math.sin(hero.veh.yaw) * ex + Math.cos(hero.veh.yaw) * ez) / (e || 1) > .6 && Math.abs(hero.veh.speed) > Math.abs(u.v.speed) + 3){ POL.ramT = 1.5; wantedUp(1); banner('خبطت عربية البوليس!', 'bad', 1.6); break; } }
  // caught: an officer gets hold of you (1–2 stars), or pulls you out of a car that is not moving
  const grab = POL.heat <= 2 && !heroUpHigh() && !CMOVE.hide.car && POL.cops.some(c => c.on && c.state === 'run' && Math.hypot(c.pos.x - f.x, c.pos.z - f.z) < (hero.veh ? 2.8 : 1.4));
  const still = hero.veh ? Math.abs(hero.veh.speed) < 1.5 : hero.vel.length() < 2.5;
  if (grab && still && !MOVE.swim){ POL.bustT += dt; if (!POL.bustSaid){ POL.bustSaid = true; subtitle('ارفع إيدك… متتحركش', 'الظابط', 'main', 1.6); } if (POL.bustT > (hero.veh ? 1.8 : 1.3)) busted(); }
  else { POL.bustT = Math.max(0, POL.bustT - dt * 2); if (POL.bustT === 0) POL.bustSaid = false; }
}

// ---- caught: «حق الشاي» or a night at the police station ----
function busted(){   // «اتمسكت» first (19x), then the officer decides
  if (POL.panel) return; POL.panel = true; POL.bustT = 0; hero.locked = true; POL.units.forEach(u => { if (u) u.v.speed = 0; });
  deathScene('busted', null, bustedPanel);
}
function bustedPanel(){
  POL.panel = true; hero.locked = true;
  const bribe = POL.heat <= 3 ? 50 * POL.heat + 30 : 0, fine = 60 * POL.heat;
  const box = $('bustBox') || (() => { const d = document.createElement('div'); d.id = 'bustBox'; document.body.appendChild(d); return d; })();
  const can = bribe && hero.money >= bribe;
  box.innerHTML = `<div class="bb-in"><h3>اتمسكت</h3><p>${bribe ? 'الظابط باصصلك ومستني' : 'الموضوع كبير ومفيش كلام'}</p>
    ${bribe ? `<button id="bbBribe" ${can ? '' : 'disabled'}>ادفع حق الشاي (${AR(bribe)} جنيه)${can ? '' : ' · مش معاك'}</button>` : ''}
    <button id="bbJail">روح القسم (غرامة ${AR(fine)} جنيه)</button></div>`;
  box.hidden = false; document.body.classList.add('in-bust');
  const close = () => { box.hidden = true; document.body.classList.remove('in-bust'); POL.panel = false; hero.locked = false; };
  if (can) $('bbBribe').onclick = () => { hero.money -= bribe; coin(); close(); polEnd('الظابط: «ماشي… امشي من هنا»', 'ok'); };
  $('bbJail').onclick = () => {
    const paid = Math.min(hero.money, fine); hero.money -= paid; if (typeof setWeapon === 'function') setWeapon('none', true);
    if (hero.veh) exitVehicle(true); close(); polEnd(null);
    fadeTo(() => { hero.pos.copy(POL_STATION); hero.vel.set(0, 0, 0); resetMotion(); lookAt.copy(hero.pos); }).then(() => banner(`طلعت من قسم الجمرك · دفعت ${AR(paid)} جنيه والسلاح اتاخد`, 'bad', 3.2));
  };
}

// ---- stealing ----
// a car that isn't yours, a job's, or someone in the story's: taking it is a crime (and some have an alarm)
let isTheft = v => !((modeId === 'police' && v === copCar && !v.ai) || v === heroMoto || v === heroCar || v.jobOnly || v === arabiMoto || v === arabiCar || v.stolen || false);
function carAlarm(v){ for (let i = 0; i < 10; i++) tone(i % 2 ? 780 : 980, i % 2 ? 780 : 980, .2, 'square', .045, i * .32); }
function onSteal(v){ if (!isTheft(v) || !crimeAllowed()) return; crime('steal', v.pos, v === copCar || v.type === 'police' ? 2 : 1); if (v !== copCar && Math.random() < .35){ carAlarm(v); banner('الإنذار بتاع العربية اشتغل!', 'bad', 1.6); } v.stolen = true; }
// pulling a driver out of a car in the traffic: it becomes a car you drive, and the driver runs off shouting
function carjackTarget(p){ let best = null, bd = 2.9; for (const c of traffic){ const u = c.userData; if (u.off || u.speed > 4.5) continue; const d = Math.hypot(c.position.x - p.x, c.position.z - p.z); if (d < bd){ bd = d; best = c; } } return best; }
function carjack(c){
  const u = c.userData, i = traffic.indexOf(c); if (i < 0) return; traffic.splice(i, 1);
  const tuk = u.kind === 'tuk', type = tuk ? 'tuk' : u.kind === 'taxi' ? 'taxi' : 'car';
  const v = { type, mesh: c, pos: c.position, yaw: c.rotation.y, speed: 0, steer: 0, max: tuk ? 15 : 22, accel: tuk ? 8 : 10, turn: tuk ? 2.3 : 1.9,
    circles: tuk ? [[.7, .85], [-.6, .85]] : [[1.25, 1.05], [-1.25, 1.05]], home: { x: c.position.x, z: c.position.z, yaw: c.rotation.y, y: 0 }, stolen: true, jacked: true, col: u.col };
  vehicles.push(v);
  const dr = npcs.find(n => n.state === 'hidden' && !n.role && !n.crowd && !n.thug);
  if (dr){
    const rx = Math.cos(v.yaw), rz = -Math.sin(v.yaw), sp = sidewalkNear(c.position, 6);
    dr.role = 'jacked'; dr.g.visible = true; dr.g.position.set(c.position.x + rx * 1.4, .15, c.position.z + rz * 1.4); dr.state = 'goto'; dr.tx = sp.x; dr.tz = sp.z; dr.speed = 3.2;
    dr.onArrive = n => { n.state = 'hidden'; n.g.visible = false; n.role = null; };
    say(dr, rpick(['عربيتي!! حرامي!', 'يا ناس الحقوني!', 'هبلغ البوليس!']), 2.2, 'angry');
    thiefChase(dr);
  }
  crime('carjack', c.position, 1); thwack(); doorSfx();
  enterVehicle(v);
}
