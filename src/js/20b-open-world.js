// ================= stage 13: the open world =================
// Five people you can play (switch from the menu, or in the street with the wheel like GTA V: the camera flies up
// and comes down on the other one), each with his own money, place and weapon; the last 5 cars you left stay
// where they are; 3 garages (2 cars each) where a car you bring becomes yours; story missions start when YOU
// choose at their marker; 3 save slots; and the «خلّصت قد إيه» page. Everything is kept inside the story save (SAVE.ow).

const tayaraD = hero.d;
const PCHARS = {
  tayara:  { name: 'طيارة', color: '#ffc94a', d: () => tayaraD, face: () => CH.hero.img.face, home: () => SPOT.spawn, money: 50 },
  arabi:   { name: 'العربي', color: '#e0457b', d: () => enemyD, face: () => CH.enemy.img.face, home: () => VILLA.gate, money: 5000 },
  islam:   { name: 'إسلام', color: '#12a39a', d: () => islamD, face: () => CH.islam.img.face, home: () => STORY_HOUSES.islam.door, money: 300 },
  youssef: { name: 'يوسف إبراهيم', color: '#f4a300', d: () => youssefD, face: () => CH.youssef.img.face, home: () => PL2.wall, money: 15 },
  shams:   { name: 'شمس', color: '#c62828', d: () => wantedD, face: () => CH.wanted.img.face, home: () => SPOT.workshop, money: 2000 },
};
const PC_ORDER = ['tayara', 'arabi', 'islam', 'youssef', 'shams'];
let OW_PICK = null;   // the menu's choice for «لف في البلد»
function OWS(){
  if (!SAVE.ow) SAVE.ow = {};
  const o = SAVE.ow;
  o.cur = PCHARS[o.cur] ? o.cur : 'tayara'; o.chars = o.chars || {}; o.left = o.left || []; o.gar = o.gar || { home: [], corniche: [], port: [] };
  for (const k of PC_ORDER) if (!o.chars[k]) o.chars[k] = { money: PCHARS[k].money };
  return o;
}
const owOn = () => modeId === 'story' || modeId === 'free';
const curChar = () => (SAVE.ow && SAVE.ow.cur) || 'tayara';

// ---------- whose money: طيارة's is the story's (SAVE.money), the others keep their own ----------
function owStoreCur(){
  if (!owOn() || REPLAY.on) return; const o = OWS(), k = o.cur, c = o.chars[k];
  if (k === 'tayara') SAVE.money = Math.max(0, Math.round(hero.money)); else c.money = Math.max(0, Math.round(hero.money));
  if (!hero.veh && !HOUSE.inside && inWorld(hero.pos.x, hero.pos.z)){ c.x = +hero.pos.x.toFixed(1); c.z = +hero.pos.z.toFixed(1); c.yaw = +(hero.d.yaw || 0).toFixed(2); }
  c.weap = WEAP.cur;
}
const _owSave = saveStory;
saveStory = function(){ owStoreCur(); _owSave(); };

// ---------- the people the others are while you aren't them: they don't run their own story / chase / theft ----------
const _owSpawnEnemy = spawnEnemy; spawnEnemy = function(){ if (hero.d === enemyD) return; _owSpawnEnemy(); };
const _owSeatIslam = seatIslam; seatIslam = function(on){ if (on && hero.d === islamD) return false; return _owSeatIslam(on); };
const _owThief = thiefStart; thiefStart = function(...a){ if (hero.d === youssefD) return; return _owThief(...a); };
const _owTick = storyTick; storyTick = function(dt){ if (hero.d !== tayaraD) return; _owTick(dt); };
const _owStalk = updateStalker; updateStalker = function(dt){ if (hero.d !== tayaraD) return; _owStalk(dt); };
// the one you left stands where you left him, breathing
const OW_STANDING = new Set();

// ---------- become someone ----------
function clearWeaponMeshes(){ for (const k in WEAP.meshes){ const m = WEAP.meshes[k]; if (m && m.parent) m.parent.remove(m); } WEAP.meshes = {}; }
function playAs(k, opt = {}){
  const P = PCHARS[k]; if (!P) return; const o = OWS();
  if (hero.veh) exitVehicle(true);
  if (!opt.fresh) owStoreCur();
  const old = hero.d, nd = P.d();
  setWeapon('none', true); clearWeaponMeshes(); nd.gunSet = null; old.gunSet = null;
  // the old one stays in the street (but not in a place / the house)
  if (old !== nd){ old.holdMove = null; old.aimYaw = null; old.root.visible = !opt.hideOld && !HOUSE.inside; if (old.root.visible) OW_STANDING.add(old); }
  // the new one: out of any scene / seat / chase it was in
  if (k === 'arabi'){ enemy.active = false; enemy.state = 'roam'; }
  if (k === 'islam') _owSeatIslam(false);
  if (k === 'youssef' && thief.active){ thief.active = false; }
  if (k === 'shams') wanted.active = false;
  ST2.idle.delete(nd); CUT.idle.delete(nd); OW_STANDING.delete(nd);
  nd.P.legL.visible = nd.P.legR.visible = true; nd.blob.visible = true; nd.doll.visible = true; nd.root.visible = true; nd.downT = 0; nd.fall = 0; nd.holdMove = null; nd.forceMove = null; nd.aimYaw = null;
  hero.d = nd; o.cur = k; heroName = k === 'tayara' ? ($('nameIn').value.trim() || 'طيارة') : P.name;
  const c = o.chars[k];
  hero.money = k === 'tayara' ? SAVE.money : c.money;
  hero.hp = 100; hero.vel.set(0, 0, 0); hero.knock.set(0, 0, 0); hero.locked = false;
  if (opt.at) hero.pos.copy(opt.at);
  else { const h = c.x != null && inWorld(c.x, c.z) ? { x: c.x, z: c.z } : P.home(); const [fx, fz] = freeSpot(h.x, h.z); hero.pos.set(fx, groundY(fx, fz), fz); }
  const fresh = opt.at || c.x == null || !inWorld(c.x, c.z), ca = openCamAngle(hero.pos, fresh ? null : (c.yaw || 0) + Math.PI);
  nd.yaw = ca + Math.PI; nd.root.position.copy(hero.pos); nd.root.rotation.y = nd.yaw;
  setWeapon(weaponsOwned().includes(c.weap) ? c.weap : 'none', true);
  document.querySelectorAll('[data-face]').forEach(e => e.style.backgroundImage = `url(${P.face()})`);
  $('hudName').textContent = heroName;
  CAM.orbit = CAM.orbitSm = ca;
  updateHud();
}
// where the camera can stand: the way with nothing solid for 6 m (walls, poles), closest to the wanted way
function openCamAngle(p, want){
  const free = a => [1.5, 3, 4.5, 6].every(r => !staticBlocked(p.x + Math.sin(a) * r, p.z + Math.cos(a) * r, .35));
  if (want != null && free(want)) return want;
  let best = want ?? 0, bd = 9;
  for (let i = 0; i < 16; i++){ const a = i / 16 * Math.PI * 2; if (!free(a)) continue; const d = want == null ? i * .01 : Math.abs(Math.atan2(Math.sin(a - want), Math.cos(a - want))); if (d < bd){ bd = d; best = a; } }
  return best;
}
// when a mode starts, everyone goes back to their own doll first (the mode builds its world for طيارة)
function owBackToTayara(){
  if (hero.d === tayaraD) return;
  setWeapon('none', true); clearWeaponMeshes(); hero.d.gunSet = null;
  hero.d.root.visible = false; hero.d = tayaraD; tayaraD.root.visible = true; heroName = $('nameIn').value.trim() || 'طيارة';
  document.querySelectorAll('[data-face]').forEach(e => e.style.backgroundImage = `url(${CH.hero.img.face})`);
}
// can you switch now? (like GTA: not in a mission, a chase, a car scene, a job, a game)
function switchBlock(){
  if (!owOn() || state !== 'play') return 'مش دلوقتي';
  if (CUT.on || DSC.on || CARANIM.on || hero.locked) return 'مش دلوقتي';
  if (modeId === 'story' && !['goto', 'done', 'idle', 'wait', 'off'].includes(ST2.phase)) return 'خلّص المهمة الأول';
  if (JOB.kind || ACT.kind || ST.kind || RHY.on) return 'خلّص اللي في إيدك الأول';
  if (POL.on) return 'البوليس وراك';
  if (HOUSE.inside || TRAMR.on) return 'اطلع للشارع الأول';
  if (MOVE.pipe || MOVE.climb || CMOVE.hide.car) return 'مش دلوقتي';
  return null;
}

// ---------- the switch: up into the sky, across, and down on the other one (like GTA V) ----------
const SW = { on: false, t: 0, phase: 0, from: new THREE.Vector3(), to: null, k: null };
function switchTo(k){
  closeWheel2(); if (k === curChar()) return;
  const why = switchBlock(); if (why){ banner(why, 'info', 1.6); return; }
  if (hero.veh) exitVehicle(true);
  SW.on = true; SW.t = 0; SW.phase = 1; SW.k = k; SW.from.copy(camera.position); hero.locked = true; whooshSw(); document.body.classList.add('switching');
}
function whooshSw(){ if (AC && !muted) noise(.6, 600, .25); }
function switchCam(dt){
  SW.t += dt; const p = hero.pos, ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  if (SW.phase === 1){
    const k = ease(Math.min(1, SW.t / .75)); _t.set(p.x, p.y + 55, p.z + 8);
    camera.position.lerpVectors(SW.from, _t, k); lookAt.lerp(_t.set(p.x, p.y, p.z), damp(8, dt));
    if (SW.t >= .75){ SW.phase = 2; fadeTo(() => {
      playAs(SW.k); hero.locked = true; const q = hero.pos;
      camera.position.set(q.x, q.y + 55, q.z + 8); lookAt.set(q.x, q.y, q.z); SW.from.copy(camera.position); SW.phase = 3; SW.t = 0; whooshSw();
    }, .15); }
  } else if (SW.phase === 3){
    const k = ease(Math.min(1, SW.t / .95)), o = CAM.orbitSm;
    _t.set(p.x + Math.sin(o) * camDist, p.y + 1.1 + .4 + camDist * CAM.tilt, p.z + Math.cos(o) * camDist);
    camera.position.lerpVectors(SW.from, _t, k); lookAt.lerp(_t.set(p.x, p.y + 1.2, p.z), damp(10, dt));
    if (k >= 1){ SW.on = false; hero.locked = false; document.body.classList.remove('switching'); banner(PCHARS[curChar()].name, 'info', 1.4); saveStory(); }
  } else { lookAt.lerp(_t.set(p.x, p.y, p.z), damp(8, dt)); }
}

// ---------- the wheel ----------
const swWheel = document.createElement('div'); swWheel.id = 'swWheel'; swWheel.hidden = true; document.body.appendChild(swWheel);
function openWheel2(){
  if (!owOn() || state !== 'play' || SW.on) return;
  const why = switchBlock(); const o = OWS(), cur = o.cur;
  swWheel.innerHTML = `<div class="sw-c"><b>${why ? AR(why) : 'تلعب بمين؟'}</b></div>` + PC_ORDER.map((k, i) => {
    const P = PCHARS[k], a = i / PC_ORDER.length * Math.PI * 2 - Math.PI / 2, m = k === cur ? hero.money : k === 'tayara' ? SAVE.money : o.chars[k].money;
    return `<button data-sw="${k}" class="${k === cur ? 'on' : ''}" style="--c:${P.color};transform:translate(${(Math.cos(a) * 128).toFixed(0)}px,${(Math.sin(a) * 118).toFixed(0)}px)"><img src="${P.face()}" alt=""><b>${P.name}</b><small>${egp(m)}</small></button>`;
  }).join('');
  swWheel.classList.toggle('blocked', !!why);
  swWheel.querySelectorAll('[data-sw]').forEach(b => b.onclick = e => { e.stopPropagation(); switchTo(b.dataset.sw); });
  swWheel.hidden = false; state = 'pause'; for (const k in keys) keys[k] = false;
}
function closeWheel2(){ if (swWheel.hidden) return; swWheel.hidden = true; if (state === 'pause') state = 'play'; }
swWheel.addEventListener('pointerdown', e => { if (e.target === swWheel) closeWheel2(); });
addEventListener('keydown', e => { if (e.code !== 'KeyV' || e.repeat || (e.target && e.target.tagName === 'INPUT')) return; if (swWheel.hidden) openWheel2(); else closeWheel2(); });

// ---------- cars: the last 5 you left stay; garages keep 2 each and make them yours ----------
const COL_NAMES = [['أحمر', '#c62828'], ['أصفر', '#e8b21a'], ['أزرق', '#1565c0'], ['أسود', '#1b1d20'], ['أبيض', '#f2f2f2'], ['أخضر', '#2e7d32'], ['بنفسجي', '#6a1b9a'], ['برتقالي', '#ff6f00'], ['فضي', '#9aa0a6'], ['لبني', '#00838f'], ['بمبي', '#c2185b'], ['بني', '#6d4c41']];
function colName(hex){
  if (!hex) return ''; const h = parseInt(String(hex).slice(1), 16), r = h >> 16 & 255, g = h >> 8 & 255, b = h & 255;
  let best = '', bd = 1e9; for (const [n, c] of COL_NAMES){ const q = parseInt(c.slice(1), 16), d = (r - (q >> 16 & 255)) ** 2 + (g - (q >> 8 & 255)) ** 2 + (b - (q & 255)) ** 2; if (d < bd){ bd = d; best = n; } } return best;
}
const TYPE_NAME = { car: 'عربية', taxi: 'تاكسي', police: 'بوكس', tuk: 'توكتوك', moto: 'موتوسيكل' };
const carName = d => `${TYPE_NAME[d.type] || 'عربية'} ${colName(d.col)}`.trim();
const SPECIAL = () => ({ heroMoto, heroCar, arabiCar });
function specialKey(v){ for (const [k, s] of Object.entries(SPECIAL())) if (s && s === v) return k; return null; }
// cars that can be kept: not a job's, not a boat, not the police car of the police game, not one driven by the AI
const keepable = v => v && !specialKey(v) && !v.jobOnly && v.type !== 'boat' && !v.ai && !v.wrecked && v !== copCar && !(v.type === 'moto' && v === arabiMoto);
const OW_MADE = [];   // vehicles this file made (left cars / taken out of a garage): removed and made again on a mode start
function owMakeCar(d, x, z, yaw){
  const sp = d.sp && SPECIAL()[d.sp];
  if (sp){ sp.hidden = false; sp.mesh.visible = true; sp.pos.set(x, sp.home.y || 0, z); sp.yaw = yaw; sp.mesh.rotation.set(0, yaw, 0); sp.speed = 0; return sp; }
  const v = addVehicle(['car', 'taxi', 'police', 'tuk', 'moto'].includes(d.type) ? d.type : 'car', x, z, yaw, d.col || '#9aa0a6');
  v.col = d.col; v.home.y = v.mesh.position.y; if (d.owned) v.owned = true; OW_MADE.push(v); return v;
}
function owRemoveCar(v){ const i = vehicles.indexOf(v); if (i >= 0) vehicles.splice(i, 1); scene.remove(v.mesh); const j = OW_MADE.indexOf(v); if (j >= 0) OW_MADE.splice(j, 1); }
const descOf = v => ({ type: v.type, col: v.col || (v.mesh.userData && v.mesh.userData.col) || '#9aa0a6', sp: specialKey(v), owned: !!v.owned });
// you got out of a car: it joins your last 5
const OW_LEFT = [];
function owLeftCar(v){
  if (!owOn() || !keepable(v)) return;
  const i = OW_LEFT.indexOf(v); if (i >= 0) OW_LEFT.splice(i, 1); OW_LEFT.unshift(v);
  while (OW_LEFT.length > 5){
    const old = OW_LEFT.pop();
    if (old.owned && garagePut(descOf(old), old.garFrom)){ if (specialKey(old)) resetHome(old); else owRemoveCar(old); continue; }
    if (specialKey(old) || !OW_MADE.includes(old) && !old.jacked) resetHome(old); else owRemoveCar(old);
  }
  owSaveLeft();
}
function hideSpecial(s){ s.pos.set(5000, -50, 5000); s.mesh.visible = false; s.hidden = true; s.speed = 0; }
function resetHome(v){ v.pos.set(v.home.x, v.home.y || 0, v.home.z); v.yaw = v.home.yaw; v.mesh.rotation.set(0, v.yaw, 0); v.speed = 0; }
function owSaveLeft(){ const o = OWS(); o.left = OW_LEFT.filter(v => vehicles.includes(v)).map(v => ({ ...descOf(v), vi: !OW_MADE.includes(v) && !v.jacked ? vehicles.indexOf(v) : null, x: +v.pos.x.toFixed(1), z: +v.pos.z.toFixed(1), yaw: +v.yaw.toFixed(2), g: v.garFrom || null })); }
const _owExit = exitVehicle;
exitVehicle = function(force){ const v = hero.veh; _owExit(force); if (v && !hero.veh) owLeftCar(v); };
// a stolen car brought into your garage is yours: no more theft
const _owIsTheft = isTheft; isTheft = v => !v.owned && _owIsTheft(v);

// ---- the 3 garages ----
const GARAGES = [
  { k: 'home', name: 'جراج البيت', at: RELOC(-14, 96) },
  { k: 'corniche', name: 'جراج الكورنيش', at: [PL.corniche.x + 10, PL.corniche.z - 6] },
  { k: 'port', name: 'جراج الميناء', at: [PORT.door.x - 10, PORT.door.z + 6] },
];
const garRingMat = new THREE.MeshBasicMaterial({ color: 0x7fd3ff, transparent: true, opacity: .45, depthWrite: false, side: THREE.DoubleSide });
for (const G of GARAGES){
  const [x, z] = freeSpot(G.at[0], G.at[1]); G.pos = new THREE.Vector3(x, 0, z);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.7, 40), garRingMat); ring.rotation.x = -Math.PI / 2; ring.position.set(x, .06, z); scene.add(ring); G.ring = ring;
  const s = signSprite('', G.name); s.position.set(x, 3, z); G.sign = s; WORLD_MARKS[WORLD_MARKS.length - 1].ic = 'car-garage';
}
const garNear = (p, r = 3.2) => GARAGES.find(G => Math.hypot(G.pos.x - p.x, G.pos.z - p.z) < r);
function garagePut(d, pref){
  const o = OWS(), list = [pref, ...GARAGES.map(G => G.k)].filter(Boolean);
  for (const k of list) if (o.gar[k] && o.gar[k].length < 2){ o.gar[k].push({ type: d.type, col: d.col, sp: d.sp }); return k; }
  return null;
}
function storeCar(G){
  const v = hero.veh, o = OWS(); if (!v) return;
  if (!keepable(v)) return banner('العربية دي مينفعش تتركن هنا', 'info', 1.6);
  if (POL.on) return banner('البوليس وراك', 'bad', 1.4);
  if (o.gar[G.k].length >= 2) return banner(`${G.name} مليان`, 'info', 1.6);
  if (Math.abs(v.speed) > 3) return banner('هدّي الأول', 'info', 1.2);
  fadeTo(() => {
    const d = descOf(v); exitVehicle(true);
    o.gar[G.k].push({ type: d.type, col: d.col, sp: d.sp });
    const i = OW_LEFT.indexOf(v); if (i >= 0) OW_LEFT.splice(i, 1);
    if (d.sp){ hideSpecial(SPECIAL()[d.sp]); } else owRemoveCar(v);
    const [fx, fz] = freeSpot(G.pos.x + 3.5, G.pos.z); hero.pos.set(fx, groundY(fx, fz), fz);
    if (!POL.on) POL.pending.length = 0;   // the theft report is dropped: it's your car now
    owSaveLeft(); saveStory(); coin();
    banner(`${carName(d)} في ${G.name}${v.stolen && !v.owned ? ' | بقت بتاعتك' : ''}`, 'ok', 2.4);
  });
}
function openGarageBox(G){
  const o = OWS(), list = o.gar[G.k];
  openPanel(`${G.name} (${AR(list.length)}/٢)`, list.length ? list.map((d, i) => ({ label: carName(d), btn: 'طلّعها', fn: () => { closePanel(); takeOut(G, i); } })) : [{ label: 'فاضي', btn: 'تمام', fn: closePanel }],
    'دخّل أي عربية بتسوقها جوه الدايرة علشان تركنها هنا. اللي تدخل هنا بتبقى بتاعتك.');
}
function takeOut(G, i){
  const o = OWS(), d = o.gar[G.k].splice(i, 1)[0]; if (!d) return;
  fadeTo(() => {
    const v = owMakeCar({ ...d, owned: true }, G.pos.x, G.pos.z, 0); v.owned = true; v.stolen = false; v.garFrom = G.k; if (v.hidden) v.hidden = false;
    saveStory(); enterVehicle(v);
  });
}
function owVehAction(){
  if (!owOn()) return null; const v = hero.veh, G = garNear(v.pos, 3);
  if (G) return { text: `دخّلها ${G.name}`, fn: () => storeCar(G) };
  return owMissionAction();
}
function owFootAction(p){
  if (!owOn()) return null; const G = garNear(p, 2.8);
  if (G) return { text: `افتح ${G.name}`, fn: () => openGarageBox(G) };
  return owMissionAction();
}
// ---- story missions: their marker waits for you; you press to start (only طيارة's for now) ----
function owMissionAction(){
  if (modeId !== 'story' || ST2.phase !== 'goto' || CUT.on || hero.locked) return null;
  const M = curM(); if (!M) return null; const at = M.at(); if (!at || !near(heroAt(), at, M.atR || 5)) return null;
  if (hero.d !== tayaraD) return { text: `مهمة طيارة: ${M.title}`, fn: () => banner('بدّل لطيارة علشان تبدأها', 'info', 1.8) };
  return { text: `ابدأ: ${M.title}`, fn: () => playIntro(M, false) };
}

// ---------- every mode start: the world for طيارة first, then your cars, then who you are ----------
const _owStart = startMode;
startMode = function(id){
  SW.on = false; document.body.classList.remove('switching'); closeWheel2(); if (owOn() && state !== 'menu') owStoreCur(); const wasOther = hero.d !== tayaraD; owBackToTayara(); if (wasOther) hero.money = SAVE.money; OW_STANDING.clear();
  for (const v of [...OW_MADE]) owRemoveCar(v); OW_LEFT.length = 0;
  const pick = OW_PICK; OW_PICK = null;
  _owStart(id);
  $('swBtn').hidden = !owOn();
  if (!owOn()) return;
  const o = OWS();
  for (const s of Object.values(SPECIAL())) if (s && s.hidden){ s.hidden = false; s.mesh.visible = true; resetHome(s); }
  // the garages' special cars stay hidden
  for (const k in o.gar) for (const d of o.gar[k]) if (d.sp && SPECIAL()[d.sp]) hideSpecial(SPECIAL()[d.sp]);
  for (const L of o.left){ if (!inWorld(L.x, L.z)) continue;
    const f = L.vi != null ? vehicles[L.vi] : null;   // one of the town's own cars: move it, don't make a second
    const v = f && f.type === L.type && f.col === L.col && !OW_MADE.includes(f) ? (f.pos.set(L.x, f.home.y || 0, L.z), f.yaw = L.yaw, f.mesh.rotation.set(0, L.yaw, 0), f) : owMakeCar(L, L.x, L.z, L.yaw); if (L.g) v.garFrom = L.g; if (L.owned) v.owned = true; OW_LEFT.push(v); }
  if (id === 'free') hero.money = SAVE.money;
  const k = pick || o.cur;
  if (k !== 'tayara' && !HOUSE.inside){ playAs(k, { fresh: true }); banner(id === 'free' ? `أهلاً بيك يا ${PCHARS[k].name}` : `رجعت يا ${PCHARS[k].name}`, 'info', 2.4); }
  else { o.cur = 'tayara'; hero.money = SAVE.money; }
};
// the world each frame: the ones you left keep breathing; the switch camera
function updateOpenWorld(dt, t){
  if (!owOn()) return;
  for (const d of OW_STANDING){ if (d === hero.d || !d.root.visible){ OW_STANDING.delete(d); continue; } if (d.root.position.distanceTo(hero.pos) > 160){ d.root.visible = false; OW_STANDING.delete(d); continue; } animDoll(d, 0, 0, dt, t); }
  for (const G of GARAGES){ G.ring.visible = !HOUSE.inside; }
  garRingMat.opacity = .3 + Math.sin(t * 3) * .15;
  if (modeId === 'free'){ OW.saveT = (OW.saveT || 0) - dt; if (OW.saveT <= 0){ OW.saveT = 6; saveStory(); } }
}
const OW = { saveT: 0 };

// ---------- the radar and the map: your garages and your left cars ----------
function owPins(){
  if (!owOn()) return [];
  const out = GARAGES.map(G => ({ x: G.pos.x, z: G.pos.z, ic: 'car-garage', col: '#7fd3ff' }));
  for (const v of OW_LEFT) if (v !== hero.veh && vehicles.includes(v)) out.push({ x: v.pos.x, z: v.pos.z, ic: v.type === 'moto' ? 'motorbike' : 'car', col: v.owned ? '#7be07a' : '#d6dbe0' });
  return out;
}
function owPlaces(){
  if (!owOn()) return [];
  const L = GARAGES.map(G => ({ cat: 'cars', g: 'عربياتك', name: `${G.name} (${AR(OWS().gar[G.k].length)}/٢)`, ic: 'car-garage', pos: G.pos.clone() }));
  for (const v of OW_LEFT) if (v !== hero.veh && vehicles.includes(v)) L.push({ cat: 'cars', g: 'عربياتك', name: carName(descOf(v)), ic: v.type === 'moto' ? 'motorbike' : 'car', pos: v.pos.clone() });
  return L;
}

// ---------- save slots: the game saves itself into the slot you're on; «احفظ» copies it into a slot you choose ----------
const SLOT_KEY = i => i === 0 ? 'ty_story_v2' : `ty_story_v2_s${i}`;
function slotInfo(i){
  try { const s = JSON.parse(store.get(SLOT_KEY(i)) || 'null'); if (!s || typeof s.m !== 'number') return null;
    const M = MS[Math.min(s.m, MS.length - 1)], inRoom = s.m === 0 && s.introSeen !== 0, who = PCHARS[inRoom ? 'tayara' : (s.ow && s.ow.cur) || 'tayara'];
    const ck = inRoom ? 'tayara' : (s.ow && s.ow.cur) || 'tayara';
    return { ch: s.ended ? 'خلّصت القصة' : `${CHAPS[M.ch][0]}: ${M.title}`, who: who.name, money: ck === 'tayara' ? s.money || 0 : (s.ow.chars && s.ow.chars[ck] ? s.ow.chars[ck].money : 0), when: s.savedAt || 0, pct: completion(s).total };
  } catch (e){ return null; }
}
let SLOT = +(store.get('ty_slot') || 0) || 0;
function setSlot(i){ SLOT = i; store.set('ty_slot', String(i)); STORY_KEY = SLOT_KEY(i); }
STORY_KEY = SLOT_KEY(SLOT); if (SLOT) SAVE = loadStory();
const _owSave2 = saveStory; saveStory = function(){ SAVE.savedAt = Date.now(); _owSave2(); };
const saveOv = document.createElement('div'); saveOv.id = 'saveOv'; saveOv.className = 'overlay'; saveOv.hidden = true; document.body.appendChild(saveOv);
function openSaves(mode){   // 'save' (from the house / phone) or 'load' (from the menu)
  const rows = [0, 1, 2].map(i => { const s = slotInfo(i), cur = i === SLOT;
    return `<button data-slot="${i}" class="sv${cur ? ' cur' : ''}${s ? '' : ' empty'}"><b>${AR('خانة ' + (i + 1))}${cur ? ' | اللي شغال' : ''}</b>${s ? `<span>${s.ch}</span><small>${s.who} | ${egp(s.money)} | ${AR(s.pct + '٪')}${s.when ? ' | ' + new Date(s.when).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : ''}</small>` : '<span>فاضية</span>'}</button>`; }).join('');
  saveOv.innerHTML = `<div class="panel svp"><div class="maptop"><b>${mode === 'save' ? 'احفظ اللعبة' : 'كمّل من حفظ'}</b><button class="ghost" data-x>قفل</button></div><div class="sv-list">${rows}</div><p class="sv-note">${mode === 'save' ? 'اللعبة بتحفظ لوحدها بعد كل مهمة. هنا تقدر تحفظ نسخة في خانة تانية.' : 'اختار الخانة اللي تكمّل منها.'}</p></div>`;
  saveOv.querySelector('[data-x]').onclick = () => { saveOv.hidden = true; resumeIfFree(); };
  saveOv.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => {
    const i = +b.dataset.slot;
    if (mode === 'save'){ saveStory(); const data = store.get(STORY_KEY); setSlot(i); store.set(STORY_KEY, data); banner(AR(`اتحفظت في خانة ${i + 1}`), 'ok', 1.8); saveOv.hidden = true; resumeIfFree(); }
    else { if (!slotInfo(i)){ banner('الخانة دي فاضية', 'info', 1.4); return; } setSlot(i); SAVE = loadStory(); saveOv.hidden = true; startMode('story'); }
  });
  saveOv.hidden = false; if (state === 'play') state = 'pause';
}

// ---------- «خلّصت قد إيه» ----------
function completion(S = SAVE){
  const story = S.ended ? 1 : clamp((S.m || 0) / MS.length, 0, 1);
  const actKeys = ['fish', 'kite', 'arm', 'gym', 'fifa', 'souq', 'penalty5', 'parkFast', 'pigeons', 'kameenOk', 'air2', 'tawlaWin', 'domWin'];
  const st = PROG.stats || {}, acts = actKeys.filter(k => (st[k] || 0) > 0).length / actKeys.length;
  const glasses = clamp((PROG.glasses || []).length / 20, 0, 1), ach = ACH.filter(a => PROG.ach[a.id]).length / ACH.length;
  const g = S.ow && S.ow.gar ? Object.values(S.ow.gar).reduce((n, l) => n + l.length, 0) : 0, gar = clamp(g / 6, 0, 1);
  const total = Math.round((story * .5 + acts * .15 + glasses * .1 + ach * .2 + gar * .05) * 100);
  return { story, acts, glasses, ach, gar, total, gcount: g };
}
const doneOv = document.createElement('div'); doneOv.id = 'doneOv'; doneOv.className = 'overlay'; doneOv.hidden = true; document.body.appendChild(doneOv);
function openDone(){
  const c = completion(), o = OWS(), pct = x => AR(Math.round(x * 100) + '٪');
  const bar = (name, x, note) => `<div class="dn-row"><span>${name}</span><i><b style="width:${Math.round(x * 100)}%"></b></i><em>${pct(x)}</em>${note ? `<small>${note}</small>` : ''}</div>`;
  doneOv.innerHTML = `<div class="panel dnp"><div class="maptop"><b>خلّصت قد إيه</b><button class="ghost" data-x>قفل</button></div>
    <div class="dn-total"><b>${AR(c.total + '٪')}</b><span>من اللعبة كلها</span></div>
    ${bar('القصة', c.story, AR(`${SAVE.ended ? MS.length : SAVE.m} من ${MS.length} مهمة`))}${bar('التسالي', c.acts)}${bar('الكوبايات الدهب', c.glasses, AR(`${(PROG.glasses || []).length} من ٢٠`))}${bar('الإنجازات', c.ach, AR(`${ACH.filter(a => PROG.ach[a.id]).length} من ${ACH.length}`))}${bar('الجراجات', c.gar, AR(`${c.gcount} من ٦ عربيات`))}
    <div class="dn-money">${PC_ORDER.map(k => `<span style="--c:${PCHARS[k].color}"><b>${PCHARS[k].name}</b>${egp(k === 'tayara' ? (o.cur === 'tayara' && owOn() ? hero.money : SAVE.money) : (o.cur === k && owOn() ? hero.money : o.chars[k].money))}</span>`).join('')}</div></div>`;
  doneOv.querySelector('[data-x]').onclick = () => { doneOv.hidden = true; resumeIfFree(); };
  doneOv.hidden = false; if (state === 'play') state = 'pause';
}

// ---------- buttons ----------
$('mmFree').onclick = () => mmPage('mmCharsPage');
document.querySelectorAll('#mmCharsPage [data-pc]').forEach(b => b.onclick = () => { OW_PICK = b.dataset.pc; BOOT.S.nextArt = OW_PICK; startMode('free'); });
$('mmSaves').onclick = () => openSaves('load');
$('mmDone').onclick = () => { if (!SAVE.ow) OWS(); openDone(); };
$('psSave').onclick = () => { closePause(); openSaves('save'); };
$('swBtn').onclick = e => { e.stopPropagation(); openWheel2(); };
