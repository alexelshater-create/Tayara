// ================= story effects: narration, flashbacks, rain, fire, the club, launches, mission end card =================

// ---- الحاج كامل narrates: assets/voices/kamel/<id>.mp3 (made in ElevenLabs), texts in lines.json ----
const NARR = {};
fetch('assets/voices/kamel/lines.json').then(r => r.ok ? r.json() : {}).then(j => Object.assign(NARR, j)).catch(() => {});
Object.assign(CAST, {
  kamel: { name: () => 'الحاج كامل', emoji: '👳‍♂️' }, shadia: { name: () => 'شادية', emoji: '👩' }, haidy: { name: () => 'هايدي', emoji: '👰' },
  father: { name: () => 'الحاج العربي', emoji: '🧔' }, leather: { name: () => 'راجل بجاكت جلد', emoji: '🧥' }, mother: { name: () => 'أم شادية', emoji: '👵' },
});
// play one narration line (returns false when the file is missing, then the line is only shown)
function playNarr(id){ if (muted) return false; stopVoice(); const a = startAudio(`assets/voices/kamel/${id}.mp3`); a.onerror = () => { if (VOICE.cur === a) VOICE.cur = null; }; return true; }

// what a scene changes for a moment: طيارة hidden (flashbacks), طيارة kept on a roof (the ending)
const SCENE = { hideHero: false, lockY: false };
// the café awning on fire (chapter 5), then burnt until the café is renewed in the ending
function awningFire(on){ clearFires(); if (on) for (const x of [12, 17.5, 23]) fireAt(x, 3.6, 23.3, .85); }
function awningBurnt(on){ const aw = scene.getObjectByName('cafeAwning'); if (aw) aw.material.color.set(on ? 0x2a2622 : 0x1d6b44); }
// الحاج العربي's showroom on fire (chapter 6)
function showroomFire(on){ clearFires(); if (on){ for (const dx of [-9, -3, 3, 9]) fireAt(SHOWROOM.cx + dx, 6.9, SHOWROOM.cz - 2, 1.4); fireAt(SHOWROOM.cx, .2, SHOWROOM.cz + 2, 1.2); showroomBurnt(true); } }
// the kite over طيارة's roof in the ending
const KITE = { g: null };
function kiteShow(on){
  if (!KITE.g){ const g = new THREE.Group(); const k = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, .6, 0), new THREE.Vector3(.45, 0, 0), new THREE.Vector3(0, -.8, 0), new THREE.Vector3(0, .6, 0), new THREE.Vector3(0, -.8, 0), new THREE.Vector3(-.45, 0, 0)]), new THREE.MeshStandardMaterial({ color: 0xe8b419, side: THREE.DoubleSide, emissive: 0x553300, emissiveIntensity: .3 })); k.geometry.computeVertexNormals(); g.add(k); const tail = new THREE.Mesh(new THREE.BoxGeometry(.04, 1.4, .02).translate(0, -1.5, 0), new THREE.MeshStandardMaterial({ color: 0xc0392b })); g.add(tail); scene.add(g); KITE.g = g; }
  KITE.g.visible = !!on; if (on) KITE.g.position.set(-24, 17, 72); SCENE.lockY = !!on;
}
// ---- extra people: شادية, هايدي, الحاج العربي (العربي's father), the man in the leather jacket ----
const shadiaD = makeCharacter('shadia', CH.hero, 1.64); shadiaD.root.visible = false;
const haidyD = makeCharacter('haidy', CH.hero, 1.62); haidyD.root.visible = false;
const fatherD = MODELS3D.npc ? makeDoll3D(cloneRig(MODELS3D.npc), CH.enemy, 1.78) : makeDoll(CH.enemy, 1.78); fatherD.root.visible = false;
const leatherD = MODELS3D.thug ? makeDoll3D(cloneRig(MODELS3D.thug), CH.wanted, 1.82) : makeDoll(CH.wanted, 1.82); leatherD.root.visible = false;
Object.assign(CAST_DOLLS, { shadia: shadiaD, haidy: haidyD, father: fatherD, leather: leatherD });

// ---- flashback look: old film colours, a vignette, «زمان…» ----
document.body.insertAdjacentHTML('beforeend', '<div id="fbOv"><i></i><b>زمان…</b></div><div id="rainOv"></div><div id="mEnd" class="mend" hidden></div>');
function setFlashback(on){ document.body.classList.toggle('flashback', !!on); canvas.style.filter = on ? 'sepia(.7) saturate(.8) contrast(1.06) brightness(.94)' : ''; }

// ---- small tweens for scenes (a falling shirt, a car rolling away…) ----
const TWEENS = [];
function tween(dur, fn, done){ TWEENS.push({ t: 0, dur, fn, done }); }

// ---- rain (نوّة المكنسة): falling streaks round the camera, darker and foggier, thunder now and then ----
const RAIN = { on: false, mesh: null, flashT: 6 };
{
  const n = GFX === 'low' ? 500 : 1100, pos = new Float32Array(n * 6);
  for (let i = 0; i < n; i++){ const x = R(-30, 30), y = R(0, 26), z = R(-30, 30); pos.set([x, y, z, x + .18, y - 1.4, z], i * 6); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  RAIN.mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xdfeaf6, transparent: true, opacity: .7, fog: false })); RAIN.mesh.visible = false; RAIN.mesh.frustumCulled = false; scene.add(RAIN.mesh);
}
function setRain(on){ RAIN.on = !!on; RAIN.mesh.visible = RAIN.on; document.body.classList.toggle('raining', RAIN.on); if (!on) setLoop('rain', 0, 2600, 'highpass'); }
function rainTick(dt){
  if (!RAIN.on) return;
  const p = RAIN.mesh.geometry.attributes.position, a = p.array;
  for (let i = 0; i < a.length; i += 6){ a[i+1] -= dt * 26; a[i+4] -= dt * 26; if (a[i+4] < 0){ a[i+1] += 26; a[i+4] += 26; } }
  p.needsUpdate = true; RAIN.mesh.position.set(camera.position.x, 0, camera.position.z);
  scene.fog.near = Math.min(scene.fog.near, 18); scene.fog.far = Math.min(scene.fog.far, 95);
  setLoop('rain', muted ? 0 : .09, 2600, 'highpass');
  RAIN.flashT -= dt; if (RAIN.flashT <= 0){ RAIN.flashT = R(5, 11); const f = $('rainOv'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 120); setTimeout(() => { noise(1.6, 120, .5); }, R(300, 1200)); }
}

// ---- fire: flickering flames with a light and smoke ----
const FIRES = [];
const fireMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false });
function fireAt(x, y, z, size = 1){
  const g = new THREE.Group(); g.position.set(x, y, z);
  for (let i = 0; i < 4; i++){ const c = new THREE.Mesh(new THREE.ConeGeometry(.45 * size, 1.6 * size, 7, 1, true), fireMat); c.position.set(R(-.5, .5) * size, .8 * size, R(-.5, .5) * size); g.add(c); }
  const light = new THREE.PointLight(0xff7a2a, 6 * size, 10 * size, 1.6); light.position.y = 1.2 * size; g.add(light);
  scene.add(g); const f = { g, light, size, ph: R(0, 6), smokeT: 0 }; FIRES.push(f); return f;
}
function clearFires(){ for (const f of FIRES) scene.remove(f.g); FIRES.length = 0; }
function fireTick(dt, t){
  for (const f of FIRES){ f.g.children.forEach((c, i) => { if (c.isMesh){ const k = 1 + Math.sin(t * 13 + i * 2 + f.ph) * .18; c.scale.set(k, k + Math.sin(t * 9 + i) * .25, k); } }); f.light.intensity = (5 + Math.sin(t * 17 + f.ph) * 1.6) * f.size;
    f.smokeT -= dt; if (f.smokeT <= 0){ f.smokeT = .25; _t.set(f.g.position.x + R(-.4, .4), f.g.position.y + 1.8 * f.size, f.g.position.z + R(-.4, .4)); puff(_t, .9 * f.size); } }
}

// ---- the club (شومة): the first weapon, in chapter 6. In the hand, and hits count double on شمس's men ----
const STICK = { on: false };   // the club: giveStick() is in 19o-stage5.js with the other weapons
// ---- launches (لانشات) in the harbour: you can drive one in chapter 6 ----
function inSea(x, z){
  if (z < NILE_Z + 2 || z > NILE_Z + 260 || x < X0 - 60 || x > XMAX + 60) return false;
  if (Math.abs(x - BRIDGE.x) < BRIDGE.w / 2 + 1.5 && z < BRIDGE.z1 + 2) return false;                   // the bridge
  if (x > FAR.x0 - 3 && x < FAR.x1 + 3 && z > FAR.z0 - 3) return false;                                // the fort
  if (x > PIER.x0 - .6 && x < PIER.x1 + .6 && z < PIER.z1 + .6) return false;                            // the pier
  return true;
}
function makeLaunch(color){
  const g = new THREE.Group(), p = [];
  box(p, 2.4, .9, 6, 0, .2, 0, color); box(p, 2.46, .2, 6.1, 0, .7, 0, '#f4f0e6'); { const bow = new THREE.ConeGeometry(1.2, 1.8, 4); bow.rotateX(Math.PI / 2); bow.rotateZ(Math.PI / 4); bow.scale(1, .5, 1); bow.translate(0, .25, 3.85); p.push(colored(bow, color)); }
  box(p, 1.6, 1, 1.4, 0, 1.2, -.6, '#e8eef2'); box(p, 1.5, .5, .06, 0, 1.45, .12, '#2a3a44'); box(p, .5, .7, .6, 0, .7, -2.7, '#222');
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5 })); m.castShadow = true; g.add(m); scene.add(g); return g;
}
const launches = [];
for (const [x, z, c] of [[PIER.x0 - 2.4, 172, '#1f5fa8'], [PIER.x1 + 2.4, 178, '#c0392b']]){
  const mesh = makeLaunch(c); mesh.position.set(x, -.9, z);
  const v = { type: 'boat', mesh, pos: mesh.position, yaw: 0, speed: 0, steer: 0, max: 21, accel: 8, turn: 1.35, circles: [[1.6, 1.25], [-1.6, 1.25]], home: { x, z, yaw: 0, y: -.9 }, jobOnly: 'boat' };
  vehicles.push(v); launches.push(v);
}
const shamsLaunch = makeLaunch('#212121'); shamsLaunch.visible = false;

// ---- end of a mission: what you earned, how long it took, stars ----
function missionCard(M, secs, fails, reward){
  const par = M.par || 150, stars = fails ? (fails > 1 ? 1 : 2) : secs <= par ? 3 : secs <= par * 1.6 ? 2 : 1;
  const quip = rpick(stars === 3 ? ['جامد يا طيارة', 'إيدك تتلف في حرير', 'كده الشغل!'] : stars === 2 ? ['مش وحش… بس الحتة مستنية أحسن', 'كويس… شد حيلك شوية'] : ['المهم إنها خلصت', 'المرة الجاية تبقى أحسن']);
  const el = $('mEnd'); el.innerHTML = `<b>${M.title}</b><span class="st">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span><small>${reward ? `+${reward} جنيه · ` : ''}${fmtTime(secs)}</small><i>${quip}</i>`;
  el.innerHTML = ARH(el.innerHTML); el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(missionCard.t); missionCard.t = setTimeout(() => { el.hidden = true; }, 3400);
  (SAVE.stars ||= {})[M.id] = Math.max(SAVE.stars[M.id] || 0, stars);
}

const KAMEL_T = { t: 8 };
function storyFxTick(dt, t){
  for (let i = TWEENS.length - 1; i >= 0; i--){ const w = TWEENS[i]; w.t += dt; const k = Math.min(1, w.t / w.dur); w.fn(k); if (k >= 1){ TWEENS.splice(i, 1); if (w.done) w.done(); } }
  rainTick(dt); fireTick(dt, t);
  if (KITE.g && KITE.g.visible){ KITE.g.position.x = -24 + Math.sin(t * .7) * 2.2; KITE.g.position.y = 17 + Math.sin(t * 1.3) * .8; KITE.g.rotation.z = Math.sin(t * 1.1) * .35; }
  // الحاج كامل says something now and then when you sit near him at the café
  if (state === 'play' && kamelD && kamelD.root.visible && !CUT.on && (modeId === 'story' || modeId === 'free') && hero.pos.distanceTo(SPOT.domino) < 3.4){
    KAMEL_T.t -= dt; if (KAMEL_T.t <= 0){ KAMEL_T.t = R(35, 60); const id = rpick(['kamel_r1', 'kamel_r2', 'kamel_r3', 'kamel_r4', 'kamel_r5']); if (NARR[id]){ say({ d: kamelD }, NARR[id], 5); playNarr(id); } }
  }
  for (const v of launches) if (v !== hero.veh){ v.pos.y = -.9 + Math.sin(t * 1.3 + v.home.x) * .06; v.mesh.rotation.z = Math.sin(t * 1.1 + v.home.z) * .03; }
}
