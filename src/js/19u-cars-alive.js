// ================= stage 10 (1): getting in and out of cars, cars that break and burn =================
// Getting in: walk to the driver's door, the Mixamo «Entering Car» move, then you drive. A locked parked car: the window
// gets smashed first. A car with a driver: you pull him out («Removing Driver»). Getting out: «Exiting Car» from the seat.
// Any of it can be skipped by pressing again. Motos, tuk-tuks and boats stay quick.
// Damage: dents (13), cracked windows, broken lights, parts flying off, burst tyres (shot), smoke, fire, an explosion
// that leaves a burnt wreck and hurts everyone around.
const CARANIM = { on: false };
const carLeft = v => new THREE.Vector3(Math.cos(v.yaw), 0, -Math.sin(v.yaw));
const carFwd = v => new THREE.Vector3(Math.sin(v.yaw), 0, Math.cos(v.yaw));
const animatedCar = v => v && hero.d.is3D && CLIPS_READY && CLIPS.carEnter && (v.type === 'car' || v.type === 'taxi' || v.type === 'police') && !v.wrecked;
// the seat and the spot by the driver's door
// side: 1 = the driver's door (left), -1 = the passenger's (right; the move is played mirrored)
function seatPos(v, side = 1){ return v.pos.clone().addScaledVector(carLeft(v), .42 * side).addScaledVector(carFwd(v), -.15); }
function doorStand(v, side = 1){ return seatPos(v, side).addScaledVector(carLeft(v), 1.72 * side); }
const doorFree = (v, P) => !staticBlocked(P.x, P.z, .3) && !vehBlockedAt(P.x, P.z, .2, v) && inWorld(P.x, P.z);
function animEnter(v){
  if (v.wrecked){ banner('العربية دي اتحرقت… خلاص', 'bad', 1.6); return; }
  if (!animatedCar(v) || CARANIM.on){ enterVehicle(v); return; }
  let side = 1, S = doorStand(v, 1); if (!doorFree(v, S)){ side = -1; S = doorStand(v, -1); if (!doorFree(v, S)){ enterVehicle(v); return; } }
  const locked = !!v.locked && !v.broke && !v.glassOut && isTheft(v);
  Object.assign(CARANIM, { on: true, kind: locked ? 'smash' : 'enter', v, t: 0, from: hero.pos.clone(), S, side, yaw: v.yaw - side * Math.PI / 2, doorDone: false, hitDone: false });
  hero.locked = true; hero.vel.set(0, 0, 0);
}
function animJack(c){
  if (!hero.d.is3D || !CLIPS_READY || !CLIPS.pullDriver || CARANIM.on){ carjack(c); return; }
  const yaw = c.rotation.y, L = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), S = c.position.clone().addScaledVector(L, 1.7);
  if (staticBlocked(S.x, S.z, .3)){ carjack(c); return; }
  c.userData.speed = 0; c.userData.jackHold = true;
  Object.assign(CARANIM, { on: true, kind: 'jack', c, t: 0, from: hero.pos.clone(), S, yaw: yaw - Math.PI / 2 });
  hero.locked = true; hero.vel.set(0, 0, 0);
}
function animExit(){
  const v = hero.veh; if (!v) return;
  if (!animatedCar(v) || Math.abs(v.speed) > 4 || CARANIM.on){ exitVehicle(false); return; }
  let side = 1, endP = doorStand(v, 1); if (!doorFree(v, endP)){ side = -1; endP = doorStand(v, -1); if (!doorFree(v, endP)){ exitVehicle(false); return; } }
  const seat = seatPos(v, side);
  exitVehicle(true);
  Object.assign(CARANIM, { on: true, kind: 'exit', v, t: 0, seat, endP, side, yaw: v.yaw, doorDone: false });
  hero.pos.copy(seat); hero.locked = true;
}
// clip pieces: [clip, start s, end s, playback rate]
const CA_PART = { enter: ['carEnter', 0, 5.4, 2.4], exit: ['carExit', 0, 5.7, 2.5], jack: ['pullDriver', .2, 3.4, 1.9], smash: ['cross', .7, 1.5, 1.5] };
function carAnimUpdate(dt){
  const A = CARANIM; if (!A.on) return;
  const d = hero.d;
  // the walk up to the door (quick)
  if (A.kind !== 'exit' && !A.atDoor){
    const k = Math.min(1, (A.walkT = (A.walkT || 0) + dt) / .35); hero.pos.lerpVectors(A.from, A.S, k); hero.pos.y = groundY(hero.pos.x, hero.pos.z);
    d.yaw = lerpAngle(d.yaw, A.yaw, damp(14, dt)); if (k >= 1){ A.atDoor = true; A.t = 0; } return;
  }
  const [clip, s0, s1, rate] = CA_PART[A.kind];
  A.t += dt; const ct = s0 + A.t * rate;
  d.yaw = A.yaw; d.strike = { clip, t: Math.min(ct, s1), mirror: A.side === -1 };
  if (A.kind !== 'exit') { hero.pos.set(A.S.x, groundY(A.S.x, A.S.z), A.S.z); } else { hero.pos.copy(A.seat); }
  if ((A.kind === 'enter' || A.kind === 'exit') && !A.doorDone && A.t > .35){ A.doorDone = true; doorSfx(false); }
  if (A.kind === 'smash' && !A.hitDone && ct > 1.13){ A.hitDone = true; smashWindow(A.v, A.side); }
  if (A.kind === 'jack' && !A.hitDone && ct > 1.6){ A.hitDone = true; thwack(); }
  if (ct >= s1) carAnimEnd();
}
function carAnimEnd(skip){
  const A = CARANIM; if (!A.on) return; A.on = false; hero.locked = false; A.atDoor = false; A.walkT = 0;
  if (A.kind === 'enter') enterVehicle(A.v);
  else if (A.kind === 'smash'){ Object.assign(CARANIM, { on: true, kind: 'enter', t: 0, atDoor: true, doorDone: false }); hero.locked = true; if (skip) carAnimEnd(true); }
  else if (A.kind === 'jack'){ A.c.userData.jackHold = false; carjack(A.c); }
  else if (A.kind === 'exit'){ hero.pos.copy(A.endP); hero.pos.y = groundY(A.endP.x, A.endP.z); hero.d.yaw = A.yaw + A.side * Math.PI / 2; }
}
// pressing the action again (or the gas) skips it
function carAnimSkip(){ if (CARANIM.on) carAnimEnd(true); }
function smashWindow(v, side = 1){
  v.glassOut = true; v.locked = false; crackGlass(v, side === 1 ? 'side' : 'side2', true);
  playS('glass', .9); burst('spark', seatPos(v, side).addScaledVector(carLeft(v), .9 * side).setY(1.2), carLeft(v).multiplyScalar(side), 6, 1.5);
  if (typeof carAlarm === 'function' && Math.random() < .7){ carAlarm(v); }
}

// ---------- damage you can see ----------
// a cracked-glass picture drawn once (white cracks from a point)
const crackTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256); g.strokeStyle = 'rgba(235,245,255,.85)'; g.lineWidth = 1.6;
  const ox = 128, oy = 118;
  for (let i = 0; i < 16; i++){ const a = i / 16 * Math.PI * 2 + Math.random() * .3; let x = ox, y = oy; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 6; s++){ x += Math.cos(a + (Math.random() - .5) * .5) * 22; y += Math.sin(a + (Math.random() - .5) * .5) * 22; g.lineTo(x, y); } g.stroke(); }
  for (let r = 18; r < 130; r += 26){ g.beginPath(); for (let i = 0; i <= 16; i++){ const a = i / 16 * Math.PI * 2, rr = r * (.85 + Math.random() * .3); const x = ox + Math.cos(a) * rr, y = oy + Math.sin(a) * rr; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(ox, oy, 7, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const crackMat = new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
const holeGlassMat = new THREE.MeshBasicMaterial({ color: 0x0b0d10, transparent: true, opacity: .82, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
// where the windows are, in the car's own frame (x right… the car faces +z)
const GLASS_AT = { front: { p: [0, 1.22, .62], r: [-.95, 0, 0], s: [1.3, .62] }, back: { p: [0, 1.2, -1.02], r: [.95, Math.PI, 0], s: [1.25, .55] }, side: { p: [.88, 1.2, -.15], r: [0, Math.PI / 2, 0], s: [1.5, .42] }, side2: { p: [-.88, 1.2, -.15], r: [0, -Math.PI / 2, 0], s: [1.5, .42] } };
function crackGlass(v, where, out){
  v.glass = v.glass || {}; const G = GLASS_AT[where]; if (!G || v.glass[where] === 'out') return;
  let m = v.glass[where + 'M'];
  if (!m){ m = new THREE.Mesh(new THREE.PlaneGeometry(G.s[0], G.s[1]), crackMat); m.userData.fx = true; m.position.fromArray(G.p); m.rotation.set(G.r[0], G.r[1], G.r[2]); v.mesh.add(m); v.glass[where + 'M'] = m; v.glass[where] = 'cracked'; }
  if (out){ m.material = holeGlassMat; v.glass[where] = 'out'; }
}
function breakLights(v, front){
  if (v.lightsOut) return;
  for (const c of v.mesh.children) if (c.material === carLightMat){ c.material = carLightMat.clone(); c.material.emissiveIntensity = 0; c.material.color = new THREE.Color(0x222222); }
  v.lightsOut = true; playS('glass', .5, 1.3);
}
const DEBRIS = [];
function flyPart(v, lx, lz, imp){
  if ((v.partsLost || 0) >= 3) return; v.partsLost = (v.partsLost || 0) + 1;
  const paintM = v.mesh.children[0] && v.mesh.children[0].material, col = paintM && paintM.color ? paintM.color.getHex() : 0x888888;
  const front = Math.abs(lz) > Math.abs(lx), m = new THREE.Mesh(new THREE.BoxGeometry(front ? 1.6 : .1, .25, front ? .18 : 1.1), new THREE.MeshStandardMaterial({ color: col, metalness: .5, roughness: .4 }));
  const L = carLeft(v), F = carFwd(v), p = v.pos.clone().addScaledVector(F, clamp(lz, -2.1, 2.1)).addScaledVector(L, -clamp(lx, -1, 1)).setY(.45);
  m.position.copy(p); m.castShadow = true; scene.add(m);
  const dir = F.clone().multiplyScalar(Math.sign(lz || 1) * (front ? 1 : 0)).addScaledVector(L, front ? 0 : -Math.sign(lx || 1));
  DEBRIS.push({ m, v: dir.multiplyScalar(2 + imp * .25).setY(2.5 + Math.random() * 2), spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8), life: 40 });
  if (DEBRIS.length > 14){ const o = DEBRIS.shift(); scene.remove(o.m); }
  playS('metalm', .6);
}
// called when a car is hit (a crash from 13, a bullet from 19s). lx/lz = where, in the car's frame
function carDamaged(v, imp, lx, lz, bullet){
  if (!v || v.type === 'moto' || v.type === 'boat' || v.wrecked) return;
  if (bullet){   // bullet = the world point hit
    v.dmg = (v.dmg || 0) + 3;
    const Lp = v.mesh.worldToLocal(bullet.clone());
    const w = Lp.y < .75 && v.wheels ? v.wheels.find(w => !w.flat && Math.hypot(w.pivot.position.x - Lp.x, w.pivot.position.z - Lp.z) < .65) : null;
    if (w){ w.flat = true; w.pivot.scale.y = .72; w.pivot.position.y -= .07; v.max *= .78; v.pull = (v.pull || 0) + (w.pivot.position.x > 0 ? .1 : -.1); noise(.35, 600, .7); playS('fall', .4, 1.6); if (hero.veh === v) banner('الكاوتش فرقع!', 'bad', 1.2); }
    else if (Lp.y > 1) crackGlass(v, Lp.z > .4 ? 'front' : Lp.z < -.6 ? 'back' : Lp.x > 0 ? 'side' : 'side2', Math.random() < .35);
    return;
  }
  if (imp > 9){
    if (Math.abs(lz) > Math.abs(lx)) crackGlass(v, lz > 0 ? 'front' : 'back', imp > 18);
    else crackGlass(v, lx > 0 ? 'side2' : 'side', imp > 16);
  }
  if (imp > 11 && lz > .8) breakLights(v, true);
  if (imp > 15) flyPart(v, lx, lz, imp);
}
// ---------- fire and the explosion ----------
const EXPL = { list: [] };
const explTex = new THREE.TextureLoader().load('assets/fx/k-explosion-atlas.png'); explTex.colorSpace = THREE.SRGBColorSpace;
function explode(v){
  v.wrecked = true; v.burnT = 0; v.fireT = 14; v.speed = 0; v.max = 0;
  const p = v.pos.clone().setY(1.2);
  // the burnt shell
  for (const c of v.mesh.children){ if (c.material && c.material.color && !c.userData.fx){ c.material = c.material.clone(); c.material.color.multiplyScalar(.12); if (c.material.emissive) c.material.emissiveIntensity = 0; } }
  for (const k of Object.keys(GLASS_AT)) crackGlass(v, k, true);
  // the fireball: the explosion frames on a sprite, a flash of light
  const sm = new THREE.SpriteMaterial({ map: explTex.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); sm.map.needsUpdate = true; sm.map.repeat.set(1 / 3, 1 / 3);
  const s = new THREE.Sprite(sm); s.position.copy(p).setY(2); s.scale.setScalar(7); scene.add(s);
  const L = new THREE.PointLight(0xffa040, 40, 30, 2); L.position.copy(p).setY(3); scene.add(L);
  EXPL.list.push({ s, L, t: 0 }); shopsPanic(p);
  burst('fire', p, null, 14, 5); burst('soot', p, null, 6, 2); burst('spark', p, null, 12, 9);
  flyPart(v, 0, 2.2, 30); flyPart(v, 1, -.5, 30);
  playS('metal', 1, .6); playS('fall', 1, .5); noise(.9, 260, 1); shake = Math.max(shake, .9); buzz(80);
  // everyone around gets hurt / thrown
  const R = 7;
  if (hero.veh === v){ exitVehicle(true); heroDamage(120, 'car'); }
  else { const d = hero.pos.distanceTo(p); if (d < R){ heroDamage((1 - d / R) * 70 * DIFF.dmg, 'car'); hero.knock.addScaledVector(hero.pos.clone().sub(p).setY(0).normalize(), 9 * (1 - d / R)); hero.d.downT = 1.2; } }
  for (const n of npcs){ if (n.state === 'hidden' || !n.g.visible) continue; const d = n.g.position.distanceTo(p); if (d < R){ npcHit(n, 4); n.downT = 12; n.fly = { vx: (n.g.position.x - p.x) / d * 7, vz: (n.g.position.z - p.z) / d * 7, vy: 5, y: n.g.position.y + .3 }; } }
  for (const c of POL.cops) if (c.on && c.state !== 'down' && c.pos.distanceTo(p) < R) copHit(c, 6);
  for (const o of vehicles) if (o !== v && !o.wrecked && o.pos.distanceTo(p) < R){ o.dmg = (o.dmg || 0) + 70 * (1 - o.pos.distanceTo(p) / R); o.kick = { x: (o.pos.x - p.x) * 1.2, z: (o.pos.z - p.z) * 1.2, spin: (Math.random() - .5) * 2 }; }
}
function carsAliveUpdate(dt, t){
  carAnimUpdate(dt);
  // flying parts
  for (const D of DEBRIS){ if (D.life <= 0) continue; D.life -= dt; const m = D.m, gy = groundY(m.position.x, m.position.z) + .1;
    if (m.position.y > gy || D.v.y > 0){ D.v.y -= 9.8 * dt; m.position.addScaledVector(D.v, dt); m.rotation.x += D.spin.x * dt; m.rotation.y += D.spin.y * dt; m.rotation.z += D.spin.z * dt; if (m.position.y < gy){ m.position.y = gy; D.v.y *= -.3; D.v.x *= .5; D.v.z *= .5; D.spin.multiplyScalar(.5); if (Math.abs(D.v.y) < .6) D.v.set(0, 0, 0); } } }
  // explosions: play the 9 frames, fade the light
  for (let i = EXPL.list.length - 1; i >= 0; i--){ const E = EXPL.list[i]; E.t += dt; const f = Math.min(8, Math.floor(E.t / .07)); E.s.material.map.offset.set((f % 3) / 3, 1 - (Math.floor(f / 3) + 1) / 3); E.s.scale.setScalar(7 + E.t * 6); E.L.intensity = Math.max(0, 40 * (1 - E.t / .8)); if (E.t > .75){ scene.remove(E.s); scene.remove(E.L); EXPL.list.splice(i, 1); } }
  // smoke → fire → boom
  for (const v of vehicles){
    if (v.type === 'boat' || v.type === 'moto') continue; const dmg = v.dmg || 0;
    if (v.wrecked){ if (v.fireT > 0){ v.fireT -= dt; if (Math.random() < dt * 30) burst('fire', v.pos.clone().addScaledVector(carFwd(v), (Math.random() - .5) * 3).setY(1 + Math.random() * .5), null, 1, .6); if (Math.random() < dt * 6) burst('soot', v.pos.clone().setY(1.8), null, 1, .4); } continue; }
    if (dmg > 140){
      v.burnT = (v.burnT || 0) + dt;
      if (Math.random() < dt * 22) burst('fire', v.pos.clone().addScaledVector(carFwd(v), 1.7).setY(1.05), null, 1, .5);
      if (Math.random() < dt * 5) burst('soot', v.pos.clone().addScaledVector(carFwd(v), 1.5).setY(1.4), null, 1, .4);
      if (hero.veh === v && !v.warned){ v.warned = true; banner('العربية ولّعت! انزل بسرعة', 'bad', 2.5); }
      if (v.burnT > 7 || dmg > 230) explode(v);
    }
  }
}

// parked cars: about half are locked (you smash the window to take one)
for (const v of vehicles) if ((v.type === 'car' || v.type === 'taxi') && v !== heroCar && v !== copCar) v.locked = Math.random() < .55;
