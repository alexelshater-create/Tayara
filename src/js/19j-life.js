// ================= life in the streets: lit windows, stars and moon, cats, gestures, cheering, Ramadan night =================
// ---- lit windows at night (same 4×4 window grid as the facade textures) ----
const litTex = makeTex(512, 512, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let fy = 0; fy < 4; fy++) for (let bx = 0; bx < 4; bx++){ if (Math.random() > .38) continue; const x = bx*128 + 30, y = fy*128 + 26; const gr = g.createLinearGradient(x, y, x, y + 80); gr.addColorStop(0, Math.random() < .3 ? '#cfe3ff' : '#ffd79a'); gr.addColorStop(1, '#a8682a'); g.fillStyle = gr; g.fillRect(x, y, 68, 80); } });
const litMats = [];
for (const b of buildings) for (const m of b.mats) if (facadeTex.includes(m.map)){ m.emissiveMap = litTex; m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = 0; m.needsUpdate = true; litMats.push(m); }
// ---- stars and moon ----
const stars = (() => { const n = 700, pos = new Float32Array(n*3); for (let i = 0; i < n; i++){ const a = Math.random()*Math.PI*2, e = Math.acos(1 - Math.random()*.9); pos[i*3] = Math.sin(e)*Math.cos(a)*700; pos[i*3+1] = Math.cos(e)*700; pos[i*3+2] = Math.sin(e)*Math.sin(a)*700; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); p.frustumCulled = false; scene.add(p); return p; })();
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeTex(128, 128, g => { const gr = g.createRadialGradient(64, 64, 20, 64, 64, 64); gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(.45, 'rgba(255,250,230,1)'); gr.addColorStop(.5, 'rgba(255,240,200,.35)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(200,190,170,.35)'; for (const [x, y, r] of [[52, 50, 8], [74, 70, 6], [58, 78, 5]]){ g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }), transparent: true, opacity: 0, fog: false, depthWrite: false }));
moon.scale.setScalar(60); scene.add(moon);
let lifeNight = -1;
function nightVisuals(){
  const n = nightAmount(TOD.h); if (Math.abs(n - lifeNight) < .01) return; lifeNight = n;
  for (const m of litMats) m.emissiveIntensity = n * 1.05;
  // dim the image-based (reflection) light at night, otherwise the city stays lit like daytime
  const env = 1 - n*.78; scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : null; if (!ms) return; for (const m of ms){ if (m.envMapIntensity === undefined) continue; if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity; m.envMapIntensity = m.userData.env0 * env; } });
  stars.material.opacity = Math.max(0, n - .25) * 1.2; moon.material.opacity = n;
}
// ---- street cats ----
const catMat = [0x2b2b2b, 0xd98c3a, 0xeeeeee, 0x7a6a5a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .8 }));
const cats = [];
{ const body = new THREE.BoxGeometry(.2, .2, .5), head = new THREE.BoxGeometry(.18, .17, .17), leg = new THREE.BoxGeometry(.06, .2, .06), tail = new THREE.BoxGeometry(.04, .04, .35), ear = new THREE.ConeGeometry(.04, .08, 4);
  const hara = blocksInfo.filter(b => b.dist === 'hara' || b.dist === 'market' || b.dist === 'food');
  for (let i = 0; i < 9; i++){ const g = new THREE.Group(), m = catMat[i % 4];
    const b = new THREE.Mesh(body, m); b.position.y = .3; g.add(b); const h = new THREE.Mesh(head, m); h.position.set(0, .42, .3); g.add(h);
    for (const s of [-1, 1]){ const e = new THREE.Mesh(ear, m); e.position.set(s*.06, .53, .3); g.add(e); }
    const legs = [[-.07, .18], [.07, .18], [-.07, -.18], [.07, -.18]].map(([x, z]) => { const l = new THREE.Mesh(leg, m); l.position.set(x, .1, z); g.add(l); return l; });
    const t = new THREE.Mesh(tail, m); t.position.set(0, .45, -.38); t.rotation.x = .7; g.add(t);
    scene.add(g); const blk = pick(hara);
    cats.push({ g, legs, tail: t, b: blk, t: R(0, 4), dir: rng() < .5 ? 1 : -1, sp: R(.5, 1), run: 0, sit: R(2, 8), ph: R(0, 6) }); } }
function updateCats(dt, t){
  const f = hero.pos;
  for (const c of cats){
    const p = c.g.position, d = Math.hypot(p.x - f.x, p.z - f.z);
    if (d > 120){ c.g.visible = false; continue; } c.g.visible = !HOUSE.inside;
    if (d < 3.2 && !hero.veh && c.run <= 0){ c.run = 2.2; c.dir = -c.dir; if (Math.random() < .6) tone(900, 600, .18, 'sawtooth', .025); }
    let sp = 0;
    if (c.run > 0){ c.run -= dt; sp = 4.2; }
    else if (c.sit > 0){ c.sit -= dt; if (c.sit <= 0) c.walk = R(3, 9); }
    else { sp = c.sp; c.walk -= dt; if (c.walk <= 0) c.sit = R(3, 10); }
    if (sp){ const r = 15.6, old = perimPos({ cx: c.b.cx, cz: c.b.cz }, c.t); c.t += c.dir * sp * dt / 31.2; const q = perimPos({ cx: c.b.cx, cz: c.b.cz }, c.t); const k = (16.6 - r); p.set(q[0] + Math.sign(c.b.cx - q[0])*k*0, .15, q[1]); c.g.rotation.y = Math.atan2(q[0] - old[0], q[1] - old[1]); }
    const s = Math.sin(t*sp*5 + c.ph)*(sp ? .5 : 0); c.legs[0].rotation.x = c.legs[3].rotation.x = s; c.legs[1].rotation.x = c.legs[2].rotation.x = -s;
    c.tail.rotation.z = Math.sin(t*2 + c.ph)*.4; c.g.position.y = .15 + (c.sit > 0 ? -.06 : 0);
  }
}
// ---- hero cheering (arms up and a hop) ----
function heroCheer(){ hero.cheerT = 1.3; }
function cheerPose(dt){ if (!(hero.cheerT > 0) || hero.veh) return; hero.cheerT -= dt; if (hero.d.is3D){ hero.d.forceMove = 'cheer'; return; } const d = hero.d, k = Math.min(1, hero.cheerT*3), hop = Math.abs(Math.sin(hero.cheerT*8))*.25*k; d.P.armL.rotation.z = -2.6*k; d.P.armR.rotation.z = 2.6*k; d.doll.position.y += hop; }
// ---- Ramadan night (فوانيس، زينة، مسحراتي) ----
PROG.ramadan = !!PROG.ramadan;
const ramadan = new THREE.Group(); ramadan.visible = false; scene.add(ramadan);
const lanternGeo = (() => { const p = []; const body = new THREE.CylinderGeometry(.22, .17, .5, 8); body.translate(0, 0, 0); p.push(body); const top = new THREE.ConeGeometry(.24, .28, 8); top.translate(0, .39, 0); p.push(top); const bot = new THREE.ConeGeometry(.17, .14, 8); bot.rotateX(Math.PI); bot.translate(0, -.32, 0); p.push(bot); const ring = new THREE.TorusGeometry(.06, .015, 6, 10); ring.translate(0, .58, 0); p.push(ring); return mergeGeometries(p); })();
const RAM_STRINGS = [];
{ // bulb strings and lanterns zig-zag across the streets around قصر الملوك
  const bulbs = [], lanterns = [];
  const addRun = (ax, az, bx, bz, side) => { const n = 7; for (let i = 0; i < n; i++){ const t0 = i/n, t1 = (i + 1)/n; const p0 = [ax + (bx - ax)*t0, az + (bz - az)*t0], p1 = [ax + (bx - ax)*t1, az + (bz - az)*t1];
      const a = new THREE.Vector3(p0[0] + side[0]*(i % 2 ? 6.5 : -6.5), 5.4, p0[1] + side[1]*(i % 2 ? 6.5 : -6.5)), b = new THREE.Vector3(p1[0] + side[0]*(i % 2 ? -6.5 : 6.5), 5.4, p1[1] + side[1]*(i % 2 ? -6.5 : 6.5));
      RAM_STRINGS.push(a, b); for (let k = 1; k < 9; k++){ const q = a.clone().lerp(b, k/9); q.y -= Math.sin(k/9*Math.PI)*.8; bulbs.push(q); } const mid = a.clone().lerp(b, .5); mid.y -= 1.3; lanterns.push(mid); } };
  addRun(-40, 48, 90, 48, [0, 1]); addRun(48, -40, 48, 96, [1, 0]); addRun(0, 0, 0, 96, [1, 0]); addRun(-40, 0, 90, 0, [0, 1]);
  const lg = new THREE.BufferGeometry().setFromPoints(RAM_STRINGS); ramadan.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x222222 })));
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), bulbs.length);
  const c = new THREE.Color(); bulbs.forEach((q, i) => { _m.makeTranslation(q.x, q.y, q.z); bm.setMatrixAt(i, _m); c.setHSL([.08, .14, .0, .55, .33][i % 5], 1, .55); bm.setColorAt(i, c); }); ramadan.add(bm);
  const lm = new THREE.InstancedMesh(lanternGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), lanterns.length);
  lanterns.forEach((q, i) => { _m.makeScale(1.7, 1.7, 1.7).setPosition(q.x, q.y, q.z); lm.setMatrixAt(i, _m); c.setHSL([.02, .1, .6, .33][i % 4], .95, .5); lm.setColorAt(i, c); }); ramadan.add(lm);
  // a big lantern and a crescent over the café
  const big = new THREE.Mesh(lanternGeo, new THREE.MeshStandardMaterial({ color: 0xffc94a, emissive: 0xff9a2a, emissiveIntensity: 1.6, metalness: .4, roughness: .35 })); big.scale.setScalar(3.2); big.position.set(21, 7.2, 38.6); ramadan.add(big);
  const cres = new THREE.Mesh(new THREE.TorusGeometry(1.1, .18, 8, 30, Math.PI*1.3), new THREE.MeshStandardMaterial({ color: 0xfff1b0, emissive: 0xffe28a, emissiveIntensity: 1.6 })); cres.position.set(28, 8.6, 38.6); cres.rotation.z = -.9; ramadan.add(cres);
}
const mesa = makeNPC(); mesa.name = 'المسحراتي';
{ const drum = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .16, 14), new THREE.MeshStandardMaterial({ color: 0xc69a5a, roughness: .7 })); drum.rotation.x = Math.PI/2; drum.position.set(-.28, 1.05, .2); mesa.body.add(drum); }
const MESA_LINES = ['اصحى يا نايم… وحّد الدايم 🥁', 'سحور يا عباد الله 🌙', `قوم يا ${'طيارة'}… السحور!`, 'رمضان كريم يا حتة 🏮'];
function ramadanOn(){ return PROG.ramadan && (modeId === 'free' || modeId === 'story' || modeId === 'domino') && (modeId !== 'story' || isNight()); }
function updateRamadan(dt, t){
  const on = ramadanOn(); ramadan.visible = on && !HOUSE.inside;
  if (!on){ if (mesa.role === 'mesa'){ mesa.state = 'hidden'; mesa.g.visible = false; mesa.role = null; } return; }
  if (mesa.role !== 'mesa'){ setWalker(mesa); mesa.role = 'mesa'; mesa.block = blocksInfo.findIndex(b => b.type === 'cafe'); mesa.speed = .9; mesa.beat = 0; mesa.lineT = 3; }
  const d = mesa.g.position.distanceTo(hero.pos);
  mesa.beat -= dt; if (mesa.beat <= 0){ mesa.beat = .45; if (d < 32 && !muted) noise(.09, 160, clamp(.5 - d*.014, .05, .5)); mesa.arms[0].rotation.x = -1.4; setTimeout(() => { mesa.arms[0].rotation.x = -.4; }, 120); }
  mesa.lineT -= dt; if (mesa.lineT <= 0 && d < 30){ mesa.lineT = R(7, 11); say(mesa, rpick(MESA_LINES).replace('طيارة', heroName), 3); }
  RAM.time += dt; if (RAM.time > 20 && !RAM.counted){ RAM.counted = true; stat('ramadan'); }
}
const RAM = { time: 0, counted: false };
function renderRamadanBtn(){ const b = $('ramBtn'); if (b){ b.textContent = PROG.ramadan ? '🌙 ليلة رمضان: شغالة' : '🌙 ليلة رمضان: مقفولة'; b.classList.toggle('on', PROG.ramadan); } }
$('ramBtn').onclick = () => { PROG.ramadan = !PROG.ramadan; saveProg(); renderRamadanBtn(); };
renderRamadanBtn();
// ---- per frame ----
let lifeT = 0;
function updateLife(dt, t){
  lifeT -= dt; if (lifeT <= 0){ lifeT = .5; nightVisuals(); }
  stars.position.copy(camera.position); moon.position.set(camera.position.x - 380, camera.position.y + 330, camera.position.z - 420);
  updateCats(dt, t); updateRamadan(dt, t);
}
