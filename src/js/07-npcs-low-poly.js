// ================= NPCs (low-poly) =================
const SKIN = ['#c68a5d','#a86b45','#d9a57a','#8d5a3b','#e0b48d','#b27a52'];
const SHIRTS = ['#2b4a8b','#8a1f2b','#e8e2d0','#3b6b3a','#c47a1a','#555a60','#1f1f1f','#7a5a3a','#3f7fa8','#a8a39a'];
const PANTS = ['#1f2530','#3a3226','#2a2a2a','#4a4f5a','#5a4a36'];
const GALA = ['#e8e2d0','#8a8a80','#3b5a7a','#5a4a3a','#cfc6b0','#2f3b30'];
const HAIR = ['#14100c','#2a1d15','#3b2b20','#6e6e6e','#1b1410'];
const matCache = {}; const M = c => matCache[c] ||= new THREE.MeshStandardMaterial({ color: c, roughness: .85 });
const NG = { leg: new THREE.BoxGeometry(.15,.9,.17), arm: new THREE.BoxGeometry(.11,.6,.12), hand: new THREE.SphereGeometry(.06,8,6), torso: new THREE.BoxGeometry(.46,.62,.26), gala: new THREE.BoxGeometry(.5,1.22,.3), head: new THREE.SphereGeometry(.13,14,10), hair: new THREE.SphereGeometry(.137,12,8,0,Math.PI*2,0,Math.PI/2), mus: new THREE.BoxGeometry(.12,.025,.02) };
const npcs = [];
const NAMES = ['حمادة','كريم','عم سيد','الحاج محمود','زيزو','أبو علي','شيكو','مصطفى','عم رجب','بيبو','حسن','تامر'];
function makeNPC(){
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const gal = rng() < .3;
  const skin = M(pick(SKIN)), shirt = M(gal ? pick(GALA) : pick(SHIRTS)), pants = M(pick(PANTS));
  const legs = [], arms = [];
  for (const sx of [-1,1]){
    const lg = new THREE.Group(); lg.position.set(sx*.1, .9, 0); const lm = new THREE.Mesh(NG.leg, gal ? M('#4a3c30') : pants); lm.position.y = -.45; lg.add(lm); body.add(lg); legs.push(lg);
    const ar = new THREE.Group(); ar.position.set(sx*.3, 1.47, 0); const am = new THREE.Mesh(NG.arm, shirt); am.position.y = -.3; ar.add(am); const hd = new THREE.Mesh(NG.hand, skin); hd.position.y = -.63; ar.add(hd); body.add(ar); arms.push(ar);
  }
  const torso = new THREE.Mesh(gal ? NG.gala : NG.torso, shirt); torso.position.y = gal ? .93 : 1.2; torso.castShadow = true; body.add(torso);
  const head = new THREE.Mesh(NG.head, skin); head.position.y = 1.66; body.add(head);
  const hair = new THREE.Mesh(NG.hair, M(pick(HAIR))); hair.position.y = 1.69; body.add(hair);
  if (rng() < .45){ const mu = new THREE.Mesh(NG.mus, M('#1b1410')); mu.position.set(0, 1.62, .125); body.add(mu); }
  const sc = R(.93, 1.06); g.scale.setScalar(sc);
  scene.add(g);
  const n = { g, body, legs, arms, state: 'hidden', phase: R(0,6), speed: R(1.1,1.6), yaw: 0, t: 0, dir: 1, block: 0, downT: 0, fall: 0, fleeT: 0, name: pick(NAMES), role: null, head: 2.05*sc };
  g.visible = false; npcs.push(n); return n;
}
for (let i=0;i<40;i++) makeNPC();
const walkBlocks = blocksInfo.map((b,i) => i);
function perimPos(b, t){ const r = 16.6, c = [[b.cx-r,b.cz-r],[b.cx+r,b.cz-r],[b.cx+r,b.cz+r],[b.cx-r,b.cz+r]]; const s = ((Math.floor(t)%4)+4)%4, f = t - Math.floor(t); const a = c[s], e = c[(s+1)%4]; return [a[0]+(e[0]-a[0])*f, a[1]+(e[1]-a[1])*f]; }
function setWalker(n){ n.state = 'walk'; n.role = 'walker'; n.block = pick(walkBlocks); n.t = R(0,4); n.dir = rng()<.5 ? 1 : -1; n.g.visible = true; n.g.rotation.set(0,0,0); n.body.position.y = 0; n.fall = 0; n.downT = 0; }
function seatNPC(n, x, z, ry){ n.state = 'sit'; n.g.visible = true; n.g.position.set(x, .15, z); n.yaw = ry; n.g.rotation.set(0, ry, 0); n.fall = 0; n.downT = 0; }
function npcHit(n, power=1){
  if (n.state === 'hidden') return;
  n.prevState = n.state === 'down' ? n.prevState : n.state; n.state = 'down'; n.downT = 2.6 + power; n.fleeT = 5;
  n.fightT = ((n.prevState === 'walk' || n.prevState === 'fight') && Math.random() < .35) ? 7 : 0;
  say(n, rpick(['آه يا عم!','إيه ده يا جدع!','هبلغ عنك!','يا ساتر!','حرام عليك!']), 2, 'angry'); thwack();
}
function updateNPC(n, dt){
  if (n.state === 'hidden') return;
  let moving = 0;
  if (n.state === 'walk'){
    const b = blocksInfo[n.block]; const sp = n.speed * (n.fleeT > 0 ? 3.2 : 1);
    if (n.fleeT > 0) n.fleeT -= dt;
    const old = perimPos(b, n.t); n.t += n.dir * sp * dt / 33.2; const p = perimPos(b, n.t);
    n.g.position.set(p[0], .15, p[1]); const dx = p[0]-old[0], dz = p[1]-old[1];
    if (dx || dz) n.yaw = Math.atan2(dx, dz); moving = sp;
  } else if (n.state === 'goto'){
    const dx = n.tx - n.g.position.x, dz = n.tz - n.g.position.z, d = Math.hypot(dx, dz);
    if (d < .15){ n.g.position.x = n.tx; n.g.position.z = n.tz; if (n.onArrive) { const f = n.onArrive; n.onArrive = null; f(n); } }
    else { const s = Math.min(d, n.speed*1.2*dt); n.g.position.x += dx/d*s; n.g.position.z += dz/d*s; n.yaw = Math.atan2(dx, dz); moving = n.speed; }
    n.g.position.y = groundY(n.g.position.x, n.g.position.z);
  } else if (n.state === 'down'){
    n.downT -= dt; if (n.downT <= 0){ if (n.fightT > 0){ n.state = 'fight'; say(n, rpick(['تعالى هنا!','انت فاكر نفسك مين؟','هوريك!']), 2, 'angry'); } else if (n.prevState === 'walk' || n.prevState === 'down' || n.prevState === 'fight' || !n.prevState) { n.state = 'walk'; } else n.state = n.prevState; }
  } else if (n.state === 'fight'){
    n.fightT -= dt; const tp = hero.pos; const dx = tp.x - n.g.position.x, dz = tp.z - n.g.position.z, d = Math.hypot(dx, dz);
    if (n.fightT <= 0 || d > 25 || hero.veh){ const bp = perimPos(blocksInfo[n.block], n.t); n.state = 'goto'; n.tx = bp[0]; n.tz = bp[1]; n.onArrive = n2 => { n2.state = 'walk'; }; }
    else if (d > 1.1){ const s = 4*dt; moveWithSlide(n.g.position, dx/d*s, dz/d*s, .3); n.yaw = Math.atan2(dx, dz); moving = 4; }
    else { n.yaw = Math.atan2(dx, dz); n.atkT = (n.atkT||0) - dt; if (n.atkT <= 0){ n.atkT = 1.2; n.arms[1].rotation.x = -1.6; setTimeout(() => { n.arms[1].rotation.x = 0; if (n.state === 'fight' && n.g.position.distanceTo(hero.pos) < 1.7) heroDamage(5, 'npc'); }, 150); } }
    n.g.position.y = groundY(n.g.position.x, n.g.position.z);
  }
  // animation
  n.fall += ((n.state === 'down' ? 1 : 0) - n.fall) * damp(n.state === 'down' ? 10 : 4, dt);
  const sitting = n.state === 'sit' || n.state === 'customer' || n.state === 'domino';
  if (moving){ n.phase += dt * moving * 5.2; const s = Math.sin(n.phase); n.legs[0].rotation.x = s*.6; n.legs[1].rotation.x = -s*.6; n.arms[0].rotation.x = -s*.5; n.arms[1].rotation.x = s*.5; n.body.position.y = Math.abs(Math.cos(n.phase))*.03; }
  else if (sitting){ n.legs[0].rotation.x = n.legs[1].rotation.x = -1.45; n.arms[0].rotation.x = n.arms[1].rotation.x = -.5; n.body.position.y = -.43; }
  else { n.legs[0].rotation.x *= .8; n.legs[1].rotation.x *= .8; n.arms[0].rotation.x *= .8; n.arms[1].rotation.x *= .8; n.body.position.y *= .8; }
  n.g.rotation.y = lerpAngle(n.g.rotation.y, n.yaw, damp(10, dt));
  n.g.rotation.x = -n.fall * 1.5; n.g.position.y += 0;
}
