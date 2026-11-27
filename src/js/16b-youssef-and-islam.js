// ================= youssef (food thief) and islam (seated at the domino table) =================
const youssefD = makeCharacter('youssef', CH.youssef, 1.8); youssefD.root.visible = false;
const islamD = makeCharacter('islam', CH.islam, 1.78); islamD.root.visible = false;
if (islamD.is3D){ islamD.seatMove = 'sit'; islamD.hipY = .29 * 1.78 - .06; islamD.faceYaw = islamD.yaw = -Math.PI/2; }   // seated on the chair, facing the domino table
islamD.P.legL.visible = islamD.P.legR.visible = false; islamD.blob.visible = false;
function seatIslam(on){
  islamD.root.visible = on;
  if (on) islamD.root.position.set(SPOT.domino.x + .85, .62 - islamD.hipY + .04, SPOT.domino.z);
}
// الحاج كامل at the domino table with his shisha (3D model when there is one; otherwise the old seated regular stays)
const kamelD = MODELS3D.kamel ? makeDoll3D(MODELS3D.kamel, CH.hero, 1.76) : null;
const HOOKAH = { g: null, smoke: [], bowlT: 0, v: new THREE.Vector3() };
if (kamelD){ kamelD.root.visible = false; kamelD.seatMove = 'shisha'; kamelD.hipY = .29 * 1.76 - .06; kamelD.faceYaw = kamelD.yaw = Math.PI/2; kamelD.P.legL.visible = kamelD.P.legR.visible = false; kamelD.blob.visible = false; }
(async () => { try {
  const { GLTFLoader } = await import('three/addons/GLTFLoader.js');
  const g = (await new GLTFLoader().loadAsync('assets/props/hookah.glb')).scene;
  g.traverse(o => { if (o.isMesh) o.castShadow = !LOW; });
  g.position.set(SPOT.domino.x - 1.32, .15, SPOT.domino.z + .5); g.rotation.y = 2.2; g.visible = !!(kamelD && kamelD.root.visible); scene.add(g); HOOKAH.g = g;
} catch (e){ console.warn('hookah model failed', e); } })();
// smoke: soft sprites that rise, spread and fade
const smokeTex = makeTex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(240,240,240,.6)'); gr.addColorStop(1, 'rgba(240,240,240,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
for (let i = 0; i < 20; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); HOOKAH.smoke.push({ s, life: 0, max: 1, size: .06, v: new THREE.Vector3() }); }
function smokePuff(p0, n, big, dir){
  for (const p of HOOKAH.smoke){ if (n <= 0) break; if (p.life > 0) continue;
    p.life = p.max = big ? R(2.2, 3.2) : R(1.2, 1.8); p.s.position.set(p0.x + R(-.02, .02), p0.y, p0.z + R(-.02, .02));
    p.v.set(R(-.04, .04) + (dir ? dir.x * .25 : 0), big ? R(.12, .22) : R(.15, .25), R(-.04, .04) + (dir ? dir.z * .25 : 0)); p.size = big ? .1 : .05; p.s.visible = true; n--; }
}
function seatKamel(on){ if (!kamelD) return false; kamelD.root.visible = on; if (HOOKAH.g) HOOKAH.g.visible = on; if (on) kamelD.root.position.set(SPOT.domino.x - .85, .62 - kamelD.hipY + .04, SPOT.domino.z); return true; }
function updateKamel(dt, t){
  const on = !!(kamelD && kamelD.root.visible);
  if (on){
    animDoll(kamelD, 0, 0, dt, t);
    // the pose 'shisha' runs a 9-second cycle: hose to the mouth at 0.8s, draws until 2.6s, breathes out at 3.4s
    const c = kamelD.R.t % 9, c0 = c - dt;
    if (c > 1 && c0 <= 1 && !muted) shishaBubbles(sfxVol(SPOT.domino.x, SPOT.domino.z, 3));
    if (c > 3.3 && c0 <= 3.3){ kamelD.R.bones.head.getWorldPosition(HOOKAH.v); const f = kamelD.yaw; HOOKAH.v.x += Math.sin(f) * .12; HOOKAH.v.z += Math.cos(f) * .12; HOOKAH.v.y -= .05; smokePuff(HOOKAH.v, 6, true, { x: Math.sin(f), z: Math.cos(f) }); }
    // a thin wisp from the coal on the bowl
    HOOKAH.bowlT -= dt; if (HOOKAH.g && HOOKAH.bowlT <= 0){ HOOKAH.bowlT = R(.5, .9); HOOKAH.v.set(HOOKAH.g.position.x, HOOKAH.g.position.y + .86, HOOKAH.g.position.z); smokePuff(HOOKAH.v, 1, false); }
  }
  for (const p of HOOKAH.smoke){
    if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0 || !on){ p.life = 0; p.s.visible = false; continue; }
    const k = 1 - p.life / p.max; p.s.position.addScaledVector(p.v, dt); p.v.multiplyScalar(1 - dt * .6);
    const sz = p.size * (1 + k * 4); p.s.scale.set(sz, sz, 1); p.s.material.opacity = Math.min(1, k * 6) * (1 - k) * .55;
  }
}
const thief = { d: youssefD, pos: new THREE.Vector3(), active: false, caught: false, next: 75, dirX: 0, dirZ: 1, retarget: 0, lostT: 0, shoutT: 0, vx: 0, vz: 0 };
function thiefReset(){ thief.active = false; thief.caught = false; thief.next = R(60, 110); youssefD.root.visible = false; }
function thiefStart(at, line, ban){
  thief.active = true; thief.caught = false; thief.lostT = 0; thief.shoutT = 2;
  if (at) thief.pos.copy(at); else thief.pos.set(SPOT.cart.x + 1.6, .15, SPOT.cart.z + 2.4); youssefD.root.visible = true; youssefD.downT = 0; youssefD.P.legL.visible = youssefD.P.legR.visible = true; youssefD.blob.visible = true;
  say(thief, line || 'هوب! ساندوتش ببلاش', 2.5, 'angry');
  banner(ban || 'يوسف إبراهيم خطف ساندوتش من عربية الفول! الحقه', 'bad', 3.5); buzz(40);
}
function thiefCaught(){
  if (!thief.active || thief.caught) return;
  thief.caught = true; youssefD.downT = 2.5; thwack(); coin(); buzz(30); stat('thief');
  say(thief, 'خلاص خلاص… خد الساندوتش', 2.5, 'angry');
  const reward = 40; hero.money += reward; if (modeId === 'story'){ SAVE.rep += 3; SAVE.cnt.thief = (SAVE.cnt.thief||0) + 1; saveStory(); }
  banner(`مسكت يوسف! +${reward} جنيه من صاحب العربية`, 'ok', 3);
  setTimeout(() => { thief.active = false; if (!CUT.idle.has(youssefD)) youssefD.root.visible = false; thief.next = R(150, 240); }, 2600);
}
function updateThief(dt, t){
  if (modeId !== 'story'){ if (thief.active) thiefReset(); return; }
  if (!thief.active){
    thief.next -= dt;
    if (thief.next <= 0 && !modeObj.job && !ST.kind && !JOB.kind && !CUT.on && !HOUSE.inside && storyAllowsThief() && hero.pos.distanceTo(SPOT.cart) < 70) thiefStart();
    return;
  }
  const p = thief.pos; let vx = 0, vz = 0;
  if (!thief.caught){
    const tg = hero.veh ? hero.veh.pos : hero.pos; const dx = p.x - tg.x, dz = p.z - tg.z, dist = Math.hypot(dx, dz);
    thief.retarget -= dt;
    if (thief.retarget <= 0){
      thief.retarget = .35; let best = -1e9, bx = 0, bz = 1; const ax = dx/(dist||1), az = dz/(dist||1);
      for (let i=0;i<16;i++){ const a = i/16*Math.PI*2, cx = Math.sin(a), cz = Math.cos(a); let score = (cx*ax + cz*az)*2 + Math.random()*.4 + (cx*thief.dirX + cz*thief.dirZ)*.6; if (staticBlocked(p.x+cx*3, p.z+cz*3, .5) || staticBlocked(p.x+cx*1.2, p.z+cz*1.2, .4)) score -= 6; if (!inWorld(p.x+cx*8, p.z+cz*8)) score -= 4; if (score > best){ best = score; bx = cx; bz = cz; } }
      thief.dirX = bx; thief.dirZ = bz;
    }
    const sp = 6.4 * DIFF.enemySpd; vx = thief.dirX*sp; vz = thief.dirZ*sp; moveWithSlide(p, vx*dt, vz*dt, .4);
    thief.shoutT -= dt; if (thief.shoutT <= 0){ thief.shoutT = R(4,7); say(thief, rpick(['مش هتلحقني!','جعان يا جدعان!','ده ساندوتش واحد بس!']), 2, 'angry'); }
    if (hero.veh && Math.abs(hero.veh.speed) > 1.5) for (const c of vCircles(hero.veh)) if (Math.hypot(c.x-p.x, c.z-p.z) < c.r + .7){ thiefCaught(); break; }
    if (dist > 60) thief.lostT += dt; else thief.lostT = 0;
    if (thief.lostT > 6){ thief.active = false; youssefD.root.visible = false; thief.next = R(120, 200); banner('يوسف هرب بالساندوتش', 'bad', 2.5); }
  }
  p.y += (groundY(p.x, p.z) - p.y) * damp(15, dt);
  youssefD.root.position.copy(p); thief.vx = vx; thief.vz = vz;
  animDoll(youssefD, vx, vz, dt, t);
}
function updatePhotoSeats(dt, t){ if (islamD.root.visible) animDoll(islamD, 0, 0, dt, t); updateKamel(dt, t); }
// difficulty switch in the menu
function renderDiff(){ $('diffBtn').textContent = diffKey === 'easy' ? 'سهل' : 'عادي'; }
$('diffBtn').onclick = () => { diffKey = diffKey === 'easy' ? 'normal' : 'easy'; DIFF = DIFFS[diffKey]; store.set('ty_diff', diffKey); renderDiff(); };
renderDiff();
