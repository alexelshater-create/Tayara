// ================= open-world activities: penalties, parking with the سايس, pigeons, stunt ramps, police checkpoints =================
// Activities run in the free mode and in the story (outside cutscenes and jobs). One at a time.
const ACT = { kind: null, d: null, cam: null };
const AV = (x, y, z) => new THREE.Vector3(x, y, z);
const nearXZ = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) < r;
const helper = npcs[39];          // keeper / سايس / officer, one activity at a time
function actAvailable(){ return state === 'play' && (modeId === 'free' || (modeId === 'story' && ST2.phase !== 'intro' && ST2.phase !== 'outro')) && !JOB.kind && !modeObj.job && !CUT.on && !ST.kind && !HOUSE.inside; }
function actUi(label, val, zone){ const u = $('actUi'); u.hidden = false; $('amLabel').textContent = label; $('amMark').style.left = `${clamp(val, 0, 1)*100}%`; const z = $('amZone'); if (zone){ z.hidden = false; z.style.left = `${zone[0]*100}%`; z.style.width = `${(zone[1]-zone[0])*100}%`; } else z.hidden = true; }
function actStart(k){ if (ACT.kind) return; ACT.kind = k; ACT.d = {}; $('actQuit').hidden = false; ACTS[k].start(ACT.d); }
function actEnd(msg, cls='ok'){
  const A = ACTS[ACT.kind]; if (!A) return; A.end && A.end(ACT.d);
  ACT.kind = null; ACT.d = null; ACT.cam = null; hero.locked = false; $('actUi').hidden = true; $('actQuit').hidden = true;
  if (msg) banner(msg, cls, 3.2);
  if (modeId === 'story') saveStory();
}
$('actQuit').onclick = () => actEnd('خلّصت 👋', 'info');
function helperShow(x, z, yaw, name){ const n = helper; n.role = 'act'; n.state = 'idle'; n.g.visible = true; n.g.position.set(x, groundY(x, z), z); n.yaw = yaw; n.g.rotation.set(0, yaw, 0); n.fall = 0; n.downT = 0; n.name = name; }
function helperHide(){ const n = helper; if (n.role !== 'act') return; n.state = 'hidden'; n.g.visible = false; n.role = null; n.g.rotation.x = 0; n.body.position.x = 0; }
const signSprite = (emoji, label) => { const t = makeTex(256, 128, (g, w, h) => { g.fillStyle = 'rgba(20,14,8,.82)'; g.beginPath(); g.roundRect(4, 4, w-8, h-8, 28); g.fill(); g.strokeStyle = '#ffc94a'; g.lineWidth = 5; g.stroke(); g.font = '64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, 52, h/2 + 4); arText(g, label, 160, h/2 + 4, 34, '#ffe08a'); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true })); s.scale.set(2.2, 1.1, 1); scene.add(s); return s; };

// ---------- ⚽ penalties at the stadium ----------
const PITCH_B = blocksInfo.find(b => b.type === 'pitch') || { cx: 216, cz: -24 };
const PEN = { goalX: PITCH_B.cx + 15.2, cz: PITCH_B.cz, spotX: PITCH_B.cx + 8.2 };
const ball = new THREE.Mesh(new THREE.SphereGeometry(.17, 18, 14), new THREE.MeshStandardMaterial({ roughness: .5, map: makeTex(128, 64, (g, w, h) => { g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h); g.fillStyle = '#151515'; for (let i = 0; i < 9; i++){ const x = (i*37) % w, y = (i*23) % h; g.beginPath(); for (let k = 0; k < 5; k++){ const a = k/5*Math.PI*2; g.lineTo(x + Math.cos(a)*8, y + Math.sin(a)*8); } g.fill(); } }) }));
ball.castShadow = true; ball.visible = false; scene.add(ball);
const aimRing = new THREE.Mesh(new THREE.RingGeometry(.22, .3, 24), new THREE.MeshBasicMaterial({ color: 0xffd34d, side: THREE.DoubleSide, transparent: true, opacity: .9, depthTest: false })); aimRing.rotation.y = Math.PI/2; aimRing.renderOrder = 5; aimRing.visible = false; scene.add(aimRing);
const footballSign = signSprite('⚽', 'ضربات جزاء'); footballSign.position.set(PEN.spotX - 2.5, 3, PEN.cz + 4);
function penNext(d){ d.phase = 'aim'; d.t = 0; ball.position.set(PEN.spotX, .35, PEN.cz); ball.visible = true; helperShow(PEN.goalX - .6, PEN.cz, -Math.PI/2, 'الحارس'); helper.body.position.x = 0; helper.g.rotation.x = 0; aimRing.visible = true; }

// ---------- 🅿️ parking with the سايس ----------
const LOT = (() => { const lots = blocksInfo.filter(b => b.type === 'parking'); lots.sort((a, b) => Math.hypot(a.cx - 24, a.cz - 24) - Math.hypot(b.cx - 24, b.cz - 24)); return lots[0] || null; })();
const parkCar = LOT ? addVehicle('car', LOT.cx - 13, LOT.cz, Math.PI/2, '#6a1b9a') : null;
if (parkCar){ parkCar.jobOnly = 'parking'; parkCar.home.y = .19; parkCar.pos.y = .19; }
const slotMark = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 4.8), new THREE.MeshBasicMaterial({ color: 0x3cff6a, transparent: true, opacity: .35, depthWrite: false })); slotMark.rotation.x = -Math.PI/2; slotMark.visible = false; scene.add(slotMark);
const parkSign = LOT ? signSprite('🅿️', 'السايس') : null; if (parkSign) parkSign.position.set(LOT.cx - 16, 3, LOT.cz + 2.4);
const SAIS_POS = LOT ? AV(LOT.cx - 16.2, .15, LOT.cz + 2.2) : null;
function freeSlot(){
  const opts = [];
  for (const row of [-7, 7]) for (let i = 0; i < 10; i++){ const x = LOT.cx - 12.6 + i*2.8, z = LOT.cz + row; if (parkedSpots.some(p => Math.hypot(p.x - x, p.z - z) < 1.2)) continue; if (vehicles.some(v => v !== parkCar && Math.hypot(v.pos.x - x, v.pos.z - z) < 2)) continue; opts.push({ x, z, yaw: row < 0 ? 0 : Math.PI }); }
  return opts.length ? rpick(opts) : null;
}

// ---------- 🕊️ pigeons (غِيّة الحمام) ----------
const COOP = (() => { const parks = blocksInfo.filter(b => b.type === 'park'); parks.sort((a, b) => Math.hypot(a.cx - SPOT.house.x, a.cz - SPOT.house.z) - Math.hypot(b.cx - SPOT.house.x, b.cz - SPOT.house.z)); const b = parks[0]; const [x, z] = freeSpot(b ? b.cx + 6 : -40, b ? b.cz - 6 : 60); return AV(x, .15, z); })();
{ const p = []; for (const [dx, dz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) box(p, .12, 4.2, .12, COOP.x + dx*.9, 2.1, COOP.z + dz*.9, '#6b4a2a');
  box(p, 2.3, 1.4, 2.3, COOP.x, 4.6, COOP.z, '#a5763f'); box(p, 2.7, .12, 2.7, COOP.x, 5.36, COOP.z, '#7a5230'); box(p, 2.5, .08, 2.5, COOP.x, 3.9, COOP.z, '#5a3c22');
  for (let i = 0; i < 4; i++) box(p, .5, .45, .05, COOP.x - .75 + i*.5, 4.6, COOP.z + 1.16, '#2b1d10');
  box(p, .05, 2, .05, COOP.x + 1.1, 6.3, COOP.z + 1.1, '#444'); box(p, .9, .55, .02, COOP.x + 1.55, 6.9, COOP.z + 1.1, '#c62828');
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 })); m.castShadow = true; scene.add(m);
  obstacles.push({ minX: COOP.x - 1.1, maxX: COOP.x + 1.1, minZ: COOP.z - 1.1, maxZ: COOP.z + 1.1 }); }
const coopSign = signSprite('🕊️', 'غِيّة الحمام'); coopSign.position.set(COOP.x, 7.6, COOP.z);
const birdMat = new THREE.MeshStandardMaterial({ color: 0xe9e6de, roughness: .7 }), birdDark = new THREE.MeshStandardMaterial({ color: 0x8a8f98, roughness: .7 });
const birdBody = new THREE.SphereGeometry(.13, 10, 8); birdBody.scale(1, .8, 1.6);
const wingGeo = new THREE.BoxGeometry(.34, .02, .16); wingGeo.translate(.17, 0, 0);
const pigeons = [];
for (let i = 0; i < 8; i++){
  const g = new THREE.Group(); const b = new THREE.Mesh(birdBody, i % 3 ? birdMat : birdDark); g.add(b);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), birdDark); head.position.set(0, .07, .2); g.add(head);
  const wl = new THREE.Mesh(wingGeo, i % 3 ? birdMat : birdDark), wr = wl.clone(); wr.rotation.y = Math.PI; g.add(wl, wr);
  g.scale.setScalar(1.3); scene.add(g);
  pigeons.push({ g, wl, wr, a: i/8*Math.PI*2, r: 6 + (i%3)*2, h: 9 + (i%4), sp: .5 + (i%3)*.12, state: 'circle', pos: AV(0, 0, 0), from: AV(0,0,0), to: AV(0,0,0), k: 0 });
}
function updatePigeons(dt, t){
  for (const p of pigeons){
    let flap = 1;
    if (p.state === 'circle'){ p.a += p.sp*dt; const x = COOP.x + Math.cos(p.a)*p.r, z = COOP.z + Math.sin(p.a)*p.r, y = p.h + Math.sin(t*1.3 + p.r)*.6; p.g.position.set(x, y, z); p.g.rotation.set(0, -p.a, Math.sin(t + p.r)*.15); }
    else if (p.state === 'fly'){ p.k = Math.min(1, p.k + dt / p.dur); const e = p.k; p.g.position.lerpVectors(p.from, p.to, e); p.g.position.y += Math.sin(e*Math.PI) * 7; p.g.rotation.set(0, Math.atan2(p.to.x - p.from.x, p.to.z - p.from.z), 0); if (p.k >= 1){ p.state = p.next; if (p.state === 'ground'){ p.g.position.copy(p.to); } } }
    else if (p.state === 'ground'){ flap = 0; p.g.position.y = groundY(p.to.x, p.to.z) + .12 + Math.abs(Math.sin(t*5 + p.r))*.03; p.g.rotation.y += Math.sin(t*2 + p.r)*dt; }
    const w = flap ? Math.sin(t*18 + p.r)*.9 : -.1; p.wl.rotation.z = w; p.wr.rotation.z = -w;
  }
}
function pigeonFly(p, to, next){ p.from.copy(p.g.position); p.to.copy(to); p.k = 0; p.dur = Math.max(1.5, p.from.distanceTo(to) / 16); p.state = 'fly'; p.next = next; }

// ---------- 🏍️ stunt ramps ----------
const RAMPS = [ { x: 232, z: 3, yaw: Math.PI/2 }, { x: 60, z: 141, yaw: Math.PI/2 }, { x: 99, z: 270, yaw: 0 }, { x: -45, z: -45, yaw: 0 }, { x: 189, z: 99, yaw: -Math.PI/2 } ];
{ const rampMat = new THREE.MeshStandardMaterial({ color: 0xa0703c, roughness: .8, map: makeTex(64, 128, (g, w, h) => { g.fillStyle = '#a0703c'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(60,35,15,.5)'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 3); g.fillStyle = '#ffd200'; g.fillRect(0, h - 10, w, 10); }) });
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(6, 0); shape.lineTo(6, 1.5); shape.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 3.2, bevelEnabled: false }); geo.translate(-3, 0, -1.6); geo.rotateY(-Math.PI/2);
  for (const r of RAMPS){ const m = new THREE.Mesh(geo, rampMat); m.position.set(r.x, 0, r.z); m.rotation.y = r.yaw; m.castShadow = true; m.receiveShadow = true; scene.add(m); r.fx = Math.sin(r.yaw); r.fz = Math.cos(r.yaw); } }
// height of the ramp surface under a point (0 when not on a ramp)
function rampHeight(x, z){ for (const r of RAMPS){ const dx = x - r.x, dz = z - r.z, along = dx*r.fx + dz*r.fz, lat = dx*r.fz - dz*r.fx; if (Math.abs(lat) < 1.6 && along > -3 && along < 3) return { h: (along + 3) / 6 * 1.5, r, along }; } return null; }
// called from driveVehicle every frame
function vehicleAir(v, dt){
  if (v.air){
    v.air.vy -= 13*dt; v.pos.y += v.air.vy*dt; v.air.t += dt; v.mesh.rotation.x = clamp(-v.air.vy*.03, -.35, .35);
    const g = groundY(v.pos.x, v.pos.z);
    if (v.pos.y <= g && v.air.vy < 0){ const t = v.air.t; v.pos.y = g; v.air = null; v.mesh.rotation.x = 0; thwack(); shake = .35; buzz(40); puff(AV(v.pos.x, .3, v.pos.z), .8);
      if (t > .7){ const pay = Math.round(t*12); if (modeId === 'story' || modeId === 'free') hero.money += pay; banner(`🛫 نطّة ${t.toFixed(1)} ثانية! +${pay} جنيه`, 'ok', 2.4); coin(); if (bestOf('air', +t.toFixed(2))) setTimeout(() => banner(`🏆 أطول نطّة: ${t.toFixed(1)} ثانية`, 'ok', 2.4), 2500); if (t >= 2) stat('air2'); } }
    return true;
  }
  const rh = rampHeight(v.pos.x, v.pos.z);
  if (rh){ v.pos.y = rh.h; const fwd = Math.sin(v.yaw)*rh.r.fx + Math.cos(v.yaw)*rh.r.fz; v.mesh.rotation.x = -.24 * Math.sign(fwd);
    if (rh.along > 2.4 && fwd > .7 && v.speed > 9){ v.air = { vy: v.speed * (v.type === 'moto' ? .5 : .38), t: 0 }; tone(200, 500, .4, 'sawtooth', .08); }
    return true; }
  if (v.mesh.rotation.x) v.mesh.rotation.x *= .8;
  return false;
}

// ---------- 🚓 police checkpoint (كمين) while driving ----------
const kameenCar = makeCar('#f4f4f4', 'police'); kameenCar.visible = false;
let kameenT = R(120, 200);
const NO_KAMEEN = new Set(['race','friendRace','chase','returnMoto','checkpoints','sighting','shamsWedding','snatch','pizzaThief','tail','flatTire','thugs','bossFight','spill']);
function ownVehicle(v){ if (!v) return false; if (v === heroMoto || v === heroCar) return modeId !== 'story' || SAVE.owned[v.type === 'moto' ? 'moto' : 'car']; if (v.jobOnly && v.jobOnly === JOB.kind) return true; if (v === copCar) return modeId === 'police'; return false; }
function kameenSpawn(){
  const v = hero.veh, fx = Math.sin(v.yaw), fz = Math.cos(v.yaw); let x = v.pos.x + fx*60, z = v.pos.z + fz*60;
  const alongX = Math.abs(fx) > Math.abs(fz);
  if (alongX){ z = ROADS_Z.reduce((b, r) => Math.abs(r - v.pos.z) < Math.abs(b - v.pos.z) ? r : b, ROADS_Z[0]); }
  else { x = ROADS_X.reduce((b, r) => Math.abs(r - v.pos.x) < Math.abs(b - v.pos.x) ? r : b, ROADS_X[0]); }
  if (!inWorld(x, z) || Math.abs(alongX ? v.pos.z - z : v.pos.x - x) > 7) return false;
  actStart('kameen'); const d = ACT.d; d.pos = AV(x, 0, z); d.alongX = alongX;
  kameenCar.visible = true; kameenCar.position.set(alongX ? x : x + 6.5, 0, alongX ? z + 6.5 : z); kameenCar.rotation.y = alongX ? Math.PI/2 : 0;
  helperShow(alongX ? x : x + 4.2, alongX ? z + 4.2 : z, alongX ? Math.PI : -Math.PI/2, 'أمين الشرطة');
  banner('🚓 كمين قدامك! هدّي ووقف عند الظابط', 'police', 3); return true;
}

// ---------- the activities ----------
const ACTS = {
  football: { pos: AV(PEN.spotX - 1.6, .15, PEN.cz + 2.5), r: 3, label: 'العب ضربات جزاء ⚽',
    start(d){ d.shot = 0; d.goals = 0; d.res = []; hero.locked = true; heroTo2(PEN.spotX - 1.3, PEN.cz); penNext(d); banner('⚽ ٥ ضربات جزاء… وجّه ودوس', 'info', 2.5); },
    update(dt, d, t){
      ACT.cam = { p: AV(PEN.spotX - 4.6, 2.6, PEN.cz + 2.4), l: AV(PEN.goalX, 1.1, PEN.cz - .3) };
      hero.pos.set(PEN.spotX - .9, .15, PEN.cz - .9); hero.vel.set(0, 0, 0);
      d.t += dt; const H = helper;
      if (d.phase === 'aim'){ d.aim = Math.sin(d.t*2.2); aimRing.position.set(PEN.goalX - .1, 1.1, PEN.cz + d.aim*3.2); actUi('وجّه الشوطة ⬅️➡️ ودوس ✋', (d.aim + 1)/2); H.body.position.x = Math.sin(t*3)*.15; }
      else if (d.phase === 'power'){ d.pow = 1 - Math.abs(((d.t*.9) % 2) - 1); aimRing.position.y = .35 + d.pow*2.4; actUi('القوة… دوس تاني ✋ (الأخضر أحسن)', d.pow, [.35, .78]); }
      else if (d.phase === 'fly'){ d.k = Math.min(1, d.k + dt/.55); const e = d.k; ball.position.set(PEN.spotX + (d.tx - PEN.spotX)*e, .35 + (d.ty - .35)*e + Math.sin(e*Math.PI)*.4, PEN.cz + (d.tz - PEN.cz)*e); ball.rotation.x += dt*20;
        const kd = Math.min(1, d.k*1.6); H.g.position.z = PEN.cz + (d.kz - PEN.cz)*kd; H.g.rotation.x = 0; H.g.rotation.z = (d.kz - PEN.cz)*-.35*kd;
        if (d.k >= 1) penResult(d); }
      else if (d.phase === 'result'){ if (d.t > 1.6){ d.shot++; H.g.rotation.z = 0; if (d.shot >= 5) return penEnd(d); penNext(d); } }
    },
    action(d){ if (d.phase === 'aim') return { text: '🎯 ثبّت الاتجاه', fn: () => { d.phase = 'power'; d.t = 0; } }; if (d.phase === 'power') return { text: '⚽ شوط!', fn: () => penShoot(d) }; return null; },
    hud: d => `⚽ ضربة ${Math.min(d.shot + 1, 5)} من ٥ · أهداف: <b style="display:inline;color:#fff">${d.goals}</b><br>${d.res.map(r => r ? '✅' : '❌').join(' ')}`,
    end(){ ball.visible = false; aimRing.visible = false; helperHide(); } },
  parking: LOT ? { pos: SAIS_POS, r: 2.6, label: 'اركن عربية زبون للسايس 🅿️ (بقشيش)',
    start(d){ d.slot = freeSlot(); if (!d.slot){ actEnd('الجراج مليان… تعالى بعدين', 'info'); return; } d.t = 45; d.used = 0; d.hold = 0; d.dmg0 = 0;
      parkCar.pos.set(LOT.cx - 13.5, .19, LOT.cz); parkCar.yaw = Math.PI/2; parkCar.mesh.rotation.set(0, parkCar.yaw, 0); parkCar.dmg = 0; parkCar.broke = false; parkCar.speed = 0;
      slotMark.position.set(d.slot.x, .23, d.slot.z); slotMark.rotation.z = 0; slotMark.visible = true;
      helperShow(SAIS_POS.x, SAIS_POS.z, Math.PI/2, 'السايس'); say(helper, 'تعالى يا باشا… اركنها في المربع الأخضر 👉', 3);
      enterVehicle(parkCar); },
    update(dt, d){
      d.t -= dt; d.used += dt; const v = parkCar;
      if (hero.veh !== v){ return actEnd('سبت العربية… السايس زعلان 😤', 'bad'); }
      const L = carLocal(v.mesh, AV(d.slot.x, 0, d.slot.z)), ang = Math.abs(((v.yaw - d.slot.yaw + Math.PI*3) % (Math.PI*2)) - Math.PI), ok = Math.abs(L.along) < .9 && Math.abs(L.lat) < .5 && (ang < .3 || ang > Math.PI - .3);
      slotMark.material.color.setHex(ok ? 0x3cff6a : 0xffd34d);
      if (ok && Math.abs(v.speed) < .6){ d.hold += dt; if (d.hold > .8) return parkDone(d); } else d.hold = 0;
      if (Math.random() < dt*.25) say(helper, rpick(['شمال شمال…','يمين شوية يا باشا','على مهلك!','كمّل كمّل… كده','اكسر شوية']), 1.8);
      if (d.t <= 0) return actEnd('الوقت خلص… السايس ركنها بنفسه 😅', 'bad');
    },
    hud: d => `🅿️ اركن في المربع الأخضر · فاضل ${Math.max(0, Math.ceil(d.t))} ثانية<br>${Math.round(parkCar.dmg || 0) ? `خبطات: ${Math.round(parkCar.dmg)}٪ (هتتخصم من البقشيش)` : 'من غير خبطات = بقشيش أكبر'}`,
    end(){ slotMark.visible = false; if (hero.veh === parkCar) exitVehicle(true); helperHide(); } } : null,
  pigeons: { pos: AV(COOP.x + 2.2, .15, COOP.z + 1.6), r: 2.8, label: 'طيّر الحمام ورجّعه للغِيّة 🕊️',
    start(d){ d.t = 150; d.back = 0; for (const p of pigeons){ const to = sidewalkFar(COOP, 40, 115); pigeonFly(p, to, 'ground'); p.home = false; } banner('🕊️ الحمام نزل في الشوارع… لِف ورجّعه (النقط البيضا)', 'info', 3.5); },
    update(dt, d){ d.t -= dt; const f = hero.veh ? hero.veh.pos : hero.pos;
      for (const p of pigeons) if (p.state === 'ground' && !p.home && nearXZ(f, p.to, hero.veh ? 4 : 2.6)){ p.home = true; d.back++; const c = AV(COOP.x, 9, COOP.z); pigeonFly(p, c, 'circle'); tone(1200, 1700, .15, 'triangle', .1); banner(`🕊️ ${d.back}/8 رجع`, 'ok', 1.2); }
      if (d.back >= 8){ stat('pigeons'); hero.money += 60; return actEnd('🕊️ الحمام كله رجع الغِيّة! +٦٠ جنيه', 'ok'); }
      if (d.t <= 0) return actEnd(`الوقت خلص… رجّعت ${d.back} من ٨`, 'bad'); },
    hud: d => `🕊️ رجّع الحمام للغِيّة (${d.back}/8)<br>فاضل ${Math.max(0, Math.ceil(d.t))} ثانية · النقط البيضا على الخريطة`,
    marks: () => pigeons.filter(p => p.state === 'ground' && !p.home).map(p => ({ x: p.to.x, z: p.to.z, r: 3.2, c: '#ffffff' })),
    end(){ for (const p of pigeons) if (p.state !== 'circle'){ pigeonFly(p, AV(COOP.x, 9, COOP.z), 'circle'); } } },
  kameen: { pos: null,
    start(d){ d.stopT = 0; d.passed = false; d.flee = 0; d.asked = false; },
    update(dt, d){
      const v = hero.veh, f = v ? v.pos : hero.pos, dist = Math.hypot(f.x - d.pos.x, f.z - d.pos.z);
      if (d.fleeing){ d.flee -= dt; if (sirenGain) sirenGain.gain.value = .05; if (dist > 110){ if (sirenGain) sirenGain.gain.value = 0; return actEnd('😎 هربت من الكمين', 'ok'); } if (d.flee <= 0){ if (sirenGain) sirenGain.gain.value = 0; hero.money = Math.max(0, hero.money - 100); return actEnd('🚓 اتمسكت! مخالفة ١٠٠ جنيه', 'bad'); } return; }
      if (d.asked) return;
      if (dist < 9 && v){ if (Math.abs(v.speed) < 1.5){ d.stopT += dt; if (d.stopT > .7) kameenAsk(d); } else if (Math.abs(v.speed) > 7 && !d.passed){ d.passed = true; kameenRun(d, 'عدّيت من الكمين من غير ما تقف! 🚨'); } }
      if (dist > 140 && !d.passed) return actEnd(null);
      if (!v && dist > 20) return actEnd(null);
    },
    hud: d => d.fleeing ? `🚨 البوليس وراك! ابعد ١١٠ متر · فاضل ${Math.max(0, Math.ceil(d.flee))} ثانية` : '🚓 كمين! هدّي ووقف جنب أمين الشرطة',
    marks: () => ACT.d && ACT.d.pos ? [{ x: ACT.d.pos.x, z: ACT.d.pos.z, r: 5, c: Math.floor(performance.now()/250)%2 ? '#ff2020' : '#3a6bff' }] : [],
    end(){ kameenCar.visible = false; helperHide(); $('shop').hidden = true; kameenT = R(160, 260); } },
};
function heroTo2(x, z){ if (hero.veh) exitVehicle(true); hero.pos.set(x, groundY(x, z), z); hero.vel.set(0, 0, 0); }
function sidewalkFar(c, a, b){ for (let i = 0; i < 80; i++){ const p = randomSidewalkPoint(a, c); const d = p.distanceTo(c); if (d > a && d < b) return p; } return randomSidewalkPoint(a, c); }
function penShoot(d){
  d.phase = 'fly'; d.k = 0; d.t = 0; aimRing.visible = false;
  d.tz = PEN.cz + d.aim*3.2; d.ty = .3 + d.pow*2.4; d.tx = PEN.goalX + .3;
  const zones = [PEN.cz - 2, PEN.cz, PEN.cz + 2], read = Math.random() < (DIFF.pat > 1 ? .25 : .38);
  d.kz = read ? zones.reduce((b, z) => Math.abs(z - d.tz) < Math.abs(b - d.tz) ? z : b, zones[0]) : rpick(zones);
  noise(.12, 900, .6); hero.d.punchT = .28; hero.d.punchSide = 1; buzz(20);
}
function penResult(d){
  d.phase = 'result'; d.t = 0; let goal = true, msg = 'جووووول ⚽🔥';
  if (Math.abs(d.tz - PEN.cz) > 3.05){ goal = false; msg = Math.abs(d.tz - PEN.cz) < 3.3 ? 'في القائم! 😱' : 'برا الجول 😬'; }
  else if (d.ty > 2.3){ goal = false; msg = 'فوق العارضة 😬'; }
  else if (Math.abs(d.kz - d.tz) < 1.25 && d.ty < 2){ goal = false; msg = 'الحارس مسكها 🧤'; }
  d.res.push(goal); if (goal){ d.goals++; heroCheer(); tone(523, 523, .1, 'triangle', .15); tone(784, 1046, .4, 'triangle', .15, .1); noise(.6, 1200, .25); }
  else noise(.2, 400, .4);
  banner(msg, goal ? 'ok' : 'bad', 1.4);
}
function penEnd(d){ const n = d.goals; if (n === 5) stat('penalty5'); const pay = n*10; hero.money += pay; const rec = bestOf('penalties', n) ? ' · رقم قياسي!' : ''; actEnd(`⚽ سجّلت ${n} من ٥ · +${pay} جنيه${rec}`, n >= 3 ? 'ok' : 'info'); }
function parkDone(d){
  const t = d.used, dmg = parkCar.dmg || 0, tip = Math.max(5, Math.round(40 - t*.8 - dmg*.3)); hero.money += tip; coin(); buzz(30);
  if (t < 20) stat('parkFast'); setTimeout(heroCheer, 300); say(helper, rpick(['الله ينور يا باشا 👌','ركنة محترفين!','تسلم إيدك']), 2.5);
  const rec = bestOf('park', +t.toFixed(1), true) ? ' · رقم قياسي!' : '';
  actEnd(`🅿️ ركنتها في ${t.toFixed(1)} ثانية · بقشيش ${tip} جنيه${rec}`, 'ok');
}
function kameenAsk(d){
  d.asked = true; const v = hero.veh; v.speed = 0; say(helper, 'الرخص يا أسطى 🪪', 2.5);
  const own = ownVehicle(v);
  openPanel('🚓 كمين · الرخص يا أسطى', [
    { label: '🪪 ورّي الرخص', btn: 'اتفضل يا باشا', fn: () => { closePanel(); if (own){ stat('kameenOk'); say(helper, 'تمام يا أسطى، اتفضل 👮', 2.5); actEnd('✅ ورقك سليم… اتفضل', 'ok'); } else { hero.money = Math.max(0, hero.money - 50); say(helper, 'العربية دي مش باسمك!', 2.5); actEnd('📝 العربية مش باسمك… مخالفة ٥٠ جنيه', 'bad'); } } },
    { label: '🏃 اهرب بالعربية', btn: 'دوس بنزين', fn: () => { closePanel(); kameenRun(d, 'هربت من الكمين! 🚨'); } },
  ], own ? 'العربية باسمك… مفيش مشكلة' : '⚠️ العربية دي مش باسمك');
}
function kameenRun(d, msg){ d.fleeing = true; d.asked = true; d.flee = 22; banner(`${msg} ابعد بسرعة`, 'police', 3); say(helper, 'وقف عندك!!', 2.5, 'angry'); }
// map marks and in-world prompts
function actMapMarks(t){
  const m = []; const show = modeId === 'free' || modeId === 'story';
  if (!show) return m;
  if (ACT.kind && ACTS[ACT.kind].marks) m.push(...ACTS[ACT.kind].marks());
  if (!ACT.kind){ m.push({ x: PEN.spotX, z: PEN.cz, r: 3, c: '#7be07a' }, { x: COOP.x, z: COOP.z, r: 3, c: '#e9e6de' }); if (LOT) m.push({ x: SAIS_POS.x, z: SAIS_POS.z, r: 3, c: '#5ad1ff' }); }
  return m;
}
function actionNearActivity(p){
  if (!actAvailable() || ACT.kind || hero.veh) return null;
  for (const [k, A] of Object.entries(ACTS)) if (A && A.pos && nearXZ(p, A.pos, A.r)) return { text: A.label, fn: () => actStart(k) };
  return null;
}
function updateActivities(dt, t){
  document.body.classList.toggle('in-act', !!ACT.kind && hero.locked);
  updatePigeons(dt, t); updateGarage(t);
  const showSigns = modeId === 'free' || modeId === 'story';
  footballSign.visible = coopSign.visible = showSigns; if (parkSign) parkSign.visible = showSigns;
  if (ACT.kind){ const A = ACTS[ACT.kind]; if (!actAvailable() && ACT.kind !== 'kameen' && ACT.kind !== 'parking') return actEnd(null); A.update(dt, ACT.d, t); return; }
  if (hero.veh && actAvailable() && Math.abs(hero.veh.speed) > 8 && !(modeId === 'story' && ST2.phase === 'active' && NO_KAMEEN.has(curM() && curM().id))){ kameenT -= dt; if (kameenT <= 0){ kameenT = R(40, 80); kameenSpawn(); } }
}
