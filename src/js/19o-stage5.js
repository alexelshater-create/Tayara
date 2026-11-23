// ================= stage 5: weapons and the police, طيارة's phone (GPS, missions, people), more activities, the first-time tips =================

// ---------------- weapons ----------------
// Funny ones (slipper, broom, plastic chair) and real ones (club, pistol). No blood: people fall down and get up.
// In the story they come with the story; in the free mode you have them all. Shooting in the street brings the police.
const WEAPONS = {
  none:    { name: 'إيدك', icon: '👊', mult: 1, range: 1.9 },
  slipper: { name: 'شبشب', icon: '🥿', mult: 1.2, range: 2, funny: ['شبشب؟! يا نهار أبيض 😂', 'ده شبشب أمي ده!', 'آآآه… الشبشب لأ!'] },
  broom:   { name: 'مقشة', icon: '🧹', mult: 1.5, range: 2.5, funny: ['مقشة؟! هو انت بتكنس الحتة؟', 'يا عم بالراحة على المقشة!'] },
  chair:   { name: 'كرسي بلاستيك', icon: '🪑', mult: 2.2, range: 2.1, uses: 4, funny: ['الكرسي!! زي الأفلام بالظبط', 'آه يا ضهري!'] },
  stick:   { name: 'شومة', icon: '🏏', mult: 2, range: 2.3 },
  pistol:  { name: 'مسدس', icon: '🔫', mult: 3, range: 24, gun: true },
};
const WEAP = { cur: 'none', meshes: {}, chairUses: 0 };
function weaponsOwned(){
  if (modeId !== 'story') return Object.keys(WEAPONS);
  const m = SAVE.m, I = idx, out = ['none', 'slipper'];
  if (SAVE.ended || m > I('spill')) out.push('broom', 'chair');
  if (SAVE.ended || (m >= I('prepare'))) out.push('stick');
  if (SAVE.ended) out.push('pistol');
  return out;
}
// what is in the right hand
function weaponMesh(id){
  if (WEAP.meshes[id] !== undefined) return WEAP.meshes[id];
  if (!hero.d.is3D || id === 'none'){ WEAP.meshes[id] = null; return null; }
  const R3 = hero.d.R, A = R3.J.armR, dir = A.wr.clone().sub(A.el).normalize(), g = new THREE.Group(); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const p = [];
  if (id === 'slipper'){ box(p, .1, .03, .27, 0, .1, .06, '#2e7dd1'); box(p, .1, .03, .05, 0, .12, .02, '#e8e2d4'); }
  if (id === 'broom'){ cyl(p, .018, .018, 1.3, 0, .55, 0, '#c9a227'); cyl(p, .1, .05, .32, 0, 1.3, 0, '#8a6a3a'); }
  if (id === 'chair'){ box(p, .42, .04, .42, 0, .25, .18, '#e53935'); box(p, .42, .38, .04, 0, .44, -.02, '#e53935'); for (const [x, z] of [[-.18, .35], [.18, .35], [-.18, 0], [.18, 0]]) box(p, .03, .3, .03, x, .08, z, '#e53935'); }
  if (id === 'stick'){ const c = new THREE.CylinderGeometry(.022, .032, .85, 8).translate(0, .32, 0); c.rotateX(1.2); p.push(colored(c, '#6b4423')); }
  if (id === 'pistol'){ box(p, .04, .12, .05, 0, .06, .02, '#1b1b1b'); box(p, .04, .05, .2, 0, .13, .1, '#2a2a2a'); }
  if (!p.length){ WEAP.meshes[id] = null; return null; }
  g.add(new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: id === 'pistol' ? .6 : .1 })));
  g.position.copy(A.wr.clone().sub(R3.bones.lowerArmR.userData.w)); R3.bones.lowerArmR.add(g); WEAP.meshes[id] = g; return g;
}
function setWeapon(id, quiet){
  if (!WEAPONS[id]) id = 'none';
  WEAP.cur = id; hero.weapon = id === 'none' ? null : id; if (id === 'chair') WEAP.chairUses = WEAPONS.chair.uses;
  for (const k of Object.keys(WEAPONS)){ const m = weaponMesh(k); if (m) m.visible = k === id; }
  $('weapBtn').textContent = WEAPONS[id].icon; document.body.classList.toggle('armed', id !== 'none');
  if (!quiet) banner(`${WEAPONS[id].icon} ${WEAPONS[id].name}`, 'info', 1.2);
}
function cycleWeapon(){ const own = weaponsOwned(), i = own.indexOf(WEAP.cur); setWeapon(own[(i + 1) % own.length]); }
// the club in chapter 6 goes through the same hands
function giveStick(on){ STICK.on = !!on; if (on) setWeapon('stick', true); else if (WEAP.cur === 'stick') setWeapon('none', true); }
const weaponRange = () => WEAPONS[WEAP.cur].range;
// a hit with the weapon in hand: how much harder than a fist, a funny line, the plastic chair breaks after a few hits
function weaponHit(target){
  const W = WEAPONS[WEAP.cur]; if (WEAP.cur === 'none') return 1;
  if (W.funny && target && Math.random() < .7) say(target, rpick(W.funny), 1.8, 'angry');
  if (WEAP.cur === 'slipper') noise(.08, 3200, .35);
  if (WEAP.cur === 'chair'){ WEAP.chairUses--; noise(.2, 1400, .4); if (WEAP.chairUses <= 0){ banner('🪑 الكرسي اتكسر!', 'info', 1.4); setWeapon('none', true); } }
  return W.mult;
}
// ---- the pistol: shoots the nearest person in front of the camera; nobody bleeds, they fall and run ----
const muzzle = new THREE.PointLight(0xffd27a, 0, 6, 2); scene.add(muzzle);
const tracer = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: .9 })); tracer.visible = false; scene.add(tracer);
let shotCd = 0;
function shootPistol(){
  if (shotCd > 0 || hero.veh || hero.locked) return; shotCd = .35;
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), p = hero.pos; let best = null, bs = 1e9;
  const cand = [];
  for (const n of npcs) if (n.state !== 'hidden' && n.state !== 'down' && n.g.visible) cand.push({ x: n.g.position.x, z: n.g.position.z, n });
  if (enemy.active && !enemy.ally && enemy.d.downT <= 0) cand.push({ x: enemy.pos.x, z: enemy.pos.z, enemy: true });
  if (boss.active && wantedD.downT <= 0) cand.push({ x: boss.pos.x, z: boss.pos.z, boss: true });
  for (const c of cand){ const dx = c.x - p.x, dz = c.z - p.z, d = Math.hypot(dx, dz); if (d > WEAPONS.pistol.range || d < .3) continue; const cos = (dx * fx + dz * fz) / d; if (cos < .88) continue; const s = d * (2 - cos); if (s < bs && lineOfSight(p.x, p.z, c.x, c.z)){ bs = s; best = c; } }
  hero.d.punchT = .2; hero.d.punchSide = 1; if (best) hero.d.yaw = Math.atan2(best.x - p.x, best.z - p.z);
  noise(.18, 2600, .7); tone(120, 60, .2, 'sawtooth', .15); shake = Math.max(shake, .15); buzz(25);
  muzzle.position.set(p.x + fx * .6, 1.4, p.z + fz * .6); muzzle.intensity = 8; setTimeout(() => { muzzle.intensity = 0; }, 70);
  const end = best ? new THREE.Vector3(best.x, 1.2, best.z) : new THREE.Vector3(p.x + fx * 20, 1.3, p.z + fz * 20);
  tracer.geometry.setFromPoints([new THREE.Vector3(p.x + fx * .6, 1.4, p.z + fz * .6), end]); tracer.visible = true; setTimeout(() => { tracer.visible = false; }, 60);
  if (best){ if (best.n){ npcHit(best.n, 3); if (best.n.thug && !best.n.thugDone){ best.n.thugHits = 3; best.n.thugDone = true; best.n.downT = 999; } } else if (best.enemy) hitEnemy(45, p); else if (best.boss) bossHit(true); }
  // everyone around runs; shooting in the street brings the police
  for (const n of npcs) if (n.state === 'walk' && n.g.position.distanceTo(p) < 25){ n.fleeT = 7; if (Math.random() < .3) say(n, rpick(['ضرب نار!!', 'اجروااا!', 'يا ساتر يا رب!']), 1.6, 'angry'); }
  if (modeId !== 'story' || ST2.phase !== 'active') wantedUp();
}
// ---- the police after shooting: a car comes for you through the streets; get far away or hide, or pay a fine ----
const POL = { on: false, heat: 0, t: 0, lost: 0, repath: 0, path: [], bustT: 0 };
function wantedUp(){
  POL.heat = Math.min(3, POL.heat + 1); POL.t = 0; POL.lost = 0;
  if (!POL.on){ POL.on = true; const p = randomSidewalkPoint(60, hero.pos); chaserCar.position.set(p.x, 0, p.z); chaserCar.visible = true; chaserLight.intensity = 30; banner('🚨 ضرب نار في الشارع… البوليس جاي!', 'police', 3); }
  renderWanted();
}
function polEnd(msg, cls){ POL.on = false; POL.heat = 0; chaserCar.visible = false; chaserLight.intensity = 0; if (sirenGain) sirenGain.gain.value = 0; renderWanted(); if (msg) banner(msg, cls || 'ok', 3); }
function renderWanted(){ const el = $('wantedBox'); el.hidden = !POL.on; el.textContent = '🚨 ' + '⭐'.repeat(POL.heat); }
const snapTo = (list, v) => list.reduce((b, r) => Math.abs(r - v) < Math.abs(b - v) ? r : b, list[0]);
// a path along the road grid: to the nearest east-west road, along it, then up or down the north-south road
function roadPath(from, to){
  const z1 = snapTo(ROADS_Z, from.z), x2 = snapTo(ROADS_X, to.x);
  return [new THREE.Vector3(from.x, 0, z1), new THREE.Vector3(x2, 0, z1), new THREE.Vector3(x2, 0, to.z), new THREE.Vector3(to.x, 0, to.z)];
}
function updatePolice(dt, t){
  if (shotCd > 0) shotCd -= dt;
  if (!POL.on) return;
  if (modeId === 'cash' || state === 'menu'){ polEnd(null); return; }
  const c = chaserCar.position, f = hero.veh ? hero.veh.pos : hero.pos, d = Math.hypot(f.x - c.x, f.z - c.z);
  POL.repath -= dt; if (POL.repath <= 0){ POL.repath = .6; POL.path = d < 18 ? [f.clone()] : roadPath(c, f); }
  const wp = POL.path.find(w => Math.hypot(w.x - c.x, w.z - c.z) > 1) || f, dx = wp.x - c.x, dz = wp.z - c.z, dd = Math.hypot(dx, dz) || 1;
  const sp = (hero.veh ? 18 : 9) + POL.heat * 2; c.x += dx / dd * Math.min(dd, sp * dt); c.z += dz / dd * Math.min(dd, sp * dt); chaserCar.rotation.y = Math.atan2(dx, dz);
  const on = Math.floor(t * 7) % 2 === 0; chaserCar.userData.red.emissiveIntensity = on ? 3 : .2; chaserCar.userData.blue.emissiveIntensity = on ? .2 : 3; if (sirenGain) sirenGain.gain.value = muted ? 0 : .05;
  if (d < 4.2 && (!hero.veh || Math.abs(hero.veh.speed) < 3)){ POL.bustT += dt; if (POL.bustT > .8){ const fine = 40 * POL.heat; hero.money = Math.max(0, hero.money - fine); if (WEAP.cur === 'pistol') setWeapon('none', true); polEnd(`🚔 اتمسكت… دفعت غرامة ${fine} جنيه`, 'bad'); } } else POL.bustT = 0;
  if (d > 130){ POL.lost += dt; if (POL.lost > 5) polEnd('😎 البوليس تاه منك'); } else POL.lost = 0;
  POL.t += dt; if (POL.t > 90) polEnd('😮‍💨 البوليس بطّل يدوّر');
}

// ---------------- طيارة's phone ----------------
const PHONE = { app: 'home' };
const GPS = { on: false, to: null, name: '', path: [], repath: 0 };
function gpsPlaces(){
  const L = [];
  const M = modeId === 'story' ? curM() : null, tg = M && typeof storyTarget === 'function' ? storyTarget() : null;
  if (tg) L.push({ g: 'المهمة', name: `📱 ${M.title}`, pos: tg.clone ? tg.clone() : new THREE.Vector3(tg.x, 0, tg.z) });
  L.push({ g: 'الحتة', name: '☕ قهوة قصر الملوك', pos: PL.cafeOut }, { g: 'الحتة', name: '🏠 بيت طيارة', pos: SPOT.house }, { g: 'الحتة', name: '🏠 بيت شادية', pos: STORY_HOUSES.shadia.door }, { g: 'الحتة', name: '🏠 بيت إسلام', pos: STORY_HOUSES.islam.door }, { g: 'الحتة', name: '🧆 عربية الفول', pos: SPOT.cart });
  for (const s of SHOPS) L.push({ g: 'المحلات', name: `${s.icon} ${s.name}`, pos: s.out });
  L.push({ g: 'إسكندرية', name: '🏰 القلعة', pos: new THREE.Vector3(96, 0, 262) }, { g: 'إسكندرية', name: '🐟 حلقة السمك', pos: new THREE.Vector3(72, 0, 140) }, { g: 'إسكندرية', name: '⚓ الميناء', pos: PORT.door }, { g: 'إسكندرية', name: '🏛️ فيلا الحاج العربي', pos: VILLA.gate }, { g: 'إسكندرية', name: '🚗 معرض العربيات', pos: SHOWROOM.front }, { g: 'إسكندرية', name: '🌊 الكورنيش', pos: PL.corniche }, { g: 'إسكندرية', name: '🔧 ورشة شمس', pos: SPOT.workshop });
  TRAM.stations.forEach((x, i) => L.push({ g: 'إسكندرية', name: `🚋 محطة الترام ${i + 1}`, pos: new THREE.Vector3(x, 0, TRAM.z - 7) }));
  for (const [k, A] of Object.entries(ACTS)) if (A && A.pos && A.label) L.push({ g: 'تسالي', name: A.label, pos: A.pos });
  return L;
}
function gpsSet(p){ GPS.on = true; GPS.to = p.pos.clone(); GPS.name = p.name; GPS.repath = 0; banner(`🗺️ الـ GPS: ${p.name}`, 'info', 2); closePhone(); }
function gpsClear(){ GPS.on = false; GPS.to = null; GPS.path = []; }
function updateGps(dt){
  if (!GPS.on) return; const f = hero.veh ? hero.veh.pos : hero.pos;
  if (Math.hypot(f.x - GPS.to.x, f.z - GPS.to.z) < 7){ banner(`📍 وصلت: ${GPS.name}`, 'ok', 2.2); gpsClear(); return; }
  GPS.repath -= dt; if (GPS.repath <= 0){ GPS.repath = .8; const to = GPS.to; GPS.path = (to.z > NILE_Z + 2) ? [f.clone(), ...roadPath(f, new THREE.Vector3(BRIDGE.x, 0, NILE_Z - 2)).slice(0, 2), new THREE.Vector3(BRIDGE.x, 0, Math.min(to.z, BRIDGE.z1)), to.clone()] : [f.clone(), ...roadPath(f, to)]; }
}
// people in your phone: they appear as you meet them in the story
const CONTACTS = [
  { k: 'moallem', name: 'المعلم عبده', emoji: '🧔', about: 'صاحب قهوة قصر الملوك. بيزعّق كتير… وقلبه أبيض.', calls: ['الوردية يا طيارة!', 'هو انت فين؟ القهوة مليانة!'] },
  { k: 'islam', name: 'إسلام', face: () => CH.islam.img.face, about: 'صاحبك من زمان. دافي، ونفسه في الاستقرار.', calls: ['إيه يا جامد؟ تعالى نلعب دور دومنو.', 'هايدي بتسلّم عليك 😄'], after: 'islamHi' },
  { k: 'kamel', name: 'الحاج كامل', emoji: '👳‍♂️', about: 'قاعد بالشيشة على القهوة من أيام ما الترام كان بتعريفة. هو اللي بيحكي الحكاية.', calls: ['اقعد يا ابني… اقعد.', 'الشاي من غير سكر… زي الدنيا من غير صحاب.'], after: 'domino' },
  { k: 'shadia', name: 'شادية', emoji: '👩', about: 'جارتك. بتصوّر، ونفسها تبقى أشهر مصورة في إسكندرية.', calls: ['الغروب النهارده هيبقى حلو… تيجي؟', 'متنساش تبتسم في الصور 📸'], after: 'laundry' },
  { k: 'landlord', name: 'الحاج محمود', emoji: '👳', about: 'صاحب البيت. الإيجار إيجار.', calls: ['الإيجار يا ابني… الإيجار!'], after: 'wake' },
  { k: 'fathi', name: 'الحاج فتحي', emoji: '🧆', about: 'بتاع الفول والطعمية. علّق يافطة «ممنوع دخول يوسف إبراهيم».', calls: ['الطعمية لسه طالعة من الزيت!'], after: 'foul' },
  { k: 'azzouz', name: 'عزوز', emoji: '👨‍🍳', about: 'صاحب مطعم البيتزا. الطلبات كتير والوقت قليل.', calls: ['عندي طلب مستعجل يا طيارة!'], after: 'azzouz' },
  { k: 'arabi', name: 'العربي', face: () => CH.enemy.img.face, about: 'ابن الحاج العربي. عربية حمرا، ولسان أطول منها.', calls: ['إيه يا صبي القهوة؟ 😏', 'تيجي نتسابق؟'], after: 'arabiArrives' },
  { k: 'youssef', name: 'يوسف إبراهيم', face: () => CH.youssef.img.face, about: 'بيهزر حتى وهو غلطان. ممنوع دخوله نص محلات الحتة.', calls: ['أنا ماخدتش حاجة والله 😅'], after: 'snatch' },
  { k: 'shams', name: 'شمس', face: () => CH.wanted.img.face, about: 'كان أشطر ميكانيكي في المنطقة. دلوقتي… محدش بيشوف وشه.', calls: ['(الرقم مغلق أو غير متاح)'], after: 'poster' },
  { k: 'father', name: 'الحاج العربي', emoji: '🧔', about: 'أبو العربي. عنده نص الميناء ونص سموحة.', calls: ['أهلاً يا طيارة يا ابني.'], after: 'villaFlash' },
  { k: 'officer', name: 'الظابط حسام', emoji: '👮', about: 'ظابط قسم الجمرك. عينه على الحتة.', calls: ['لو شفت حاجة بلّغني على طول.'], after: 'poster' },
  { k: 'haidy', name: 'هايدي', emoji: '👰', about: 'خطيبة إسلام. اتقابلوا في الترام.', calls: ['إسلام بيقول عليك أخوه 😊'], after: 'islamFlash' },
];
const met = c => modeId !== 'story' || SAVE.ended || !c.after || SAVE.m > idx(c.after);
function openPhone(app){
  if (state !== 'play' || CUT.on) return;
  state = 'pause'; for (const k in keys) keys[k] = false; PHONE.app = app || 'home'; renderPhone(); $('phone').hidden = false; tone(880, 1320, .08, 'sine', .05);
}
function closePhone(){ if ($('phone').hidden) return; $('phone').hidden = true; if (state === 'pause') state = 'play'; }
function renderPhone(){
  const P = $('phoneScr'), now = typeof TOD !== 'undefined' ? clockText() : '';
  const top = `<div class="ph-bar"><span>${now}</span><span>📶 🔋 ${egp(hero.money)}</span></div>`;
  const back = t => `<div class="ph-head"><button data-ph="home" aria-label="رجوع">➜</button><b>${t}</b></div>`;
  let h = '';
  if (PHONE.app === 'home'){
    h = top + `<div class="ph-wall"><b>${clockText ? clockText() : ''}</b><small>${DISTRICT_NAMES[districtAt(hero.pos.x, hero.pos.z)] || 'إسكندرية'}</small></div><div class="ph-apps">
      <button data-ph="gps"><span>🗺️</span>الخريطة</button><button data-ph="tasks"><span>📋</span>المهمات</button><button data-ph="people"><span>👥</span>الأسامي</button>
      <button data-ph="ach"><span>🏆</span>الإنجازات</button><button data-ph="cam"><span>📷</span>الكاميرا</button><button data-ph="weap"><span>${WEAPONS[WEAP.cur].icon}</span>السلاح</button></div>`;
  } else if (PHONE.app === 'gps'){
    const L = gpsPlaces(), groups = [...new Set(L.map(p => p.g))];
    h = top + back('🗺️ الخريطة') + (GPS.on ? `<div class="ph-row on"><span>📍 ${GPS.name}</span><button data-gps="clear">شيل</button></div>` : '') + `<div class="ph-list">` + groups.map(g => `<h4>${g}</h4>` + L.map((p, i) => p.g === g ? `<button class="ph-row" data-gpsi="${i}"><span>${p.name}</span><small>${Math.round(hero.pos.distanceTo(p.pos))} م</small></button>` : '').join('')).join('') + `</div>`;
    PHONE.places = L;
  } else if (PHONE.app === 'tasks'){
    const M = modeId === 'story' ? curM() : null;
    h = top + back('📋 المهمات') + `<div class="ph-list">` + (M ? `<div class="ph-card"><small>${CHAPS[M.ch][0]}: ${CHAPS[M.ch][1]}</small><b>📱 ${M.title}</b><p>${storyHud().replace(/<br>.*$/s, '')}</p><button data-gps="mission">🗺️ وديني على المهمة</button></div><div class="ph-card"><small>القصة</small><b>خلّصت ${SAVE.m} من ${MS.length}</b></div>` : modeId === 'story' ? '<div class="ph-card"><b>خلّصت القصة 👑</b></div>' : '<div class="ph-card"><b>لف براحتك</b><p>القصة من القايمة الرئيسية ← كمّل القصة</p></div>')
      + `<h4>تسالي في الحتة</h4>` + Object.values(ACTS).filter(A => A && A.label && A.pos).map(A => `<div class="ph-row"><span>${A.label}</span></div>`).join('') + `</div>`;
  } else if (PHONE.app === 'people'){
    h = top + back('👥 الأسامي') + `<div class="ph-list">` + CONTACTS.map((c, i) => met(c) ? `<div class="ph-contact">${c.face ? `<img src="${c.face()}" alt="">` : `<span class="em">${c.emoji}</span>`}<div><b>${c.name}</b><small>${c.about}</small></div><button data-call="${i}" aria-label="اتصل">📞</button></div>` : `<div class="ph-contact locked"><span class="em">❔</span><div><b>؟؟؟</b><small>لسه ماتعرفتوش</small></div></div>`).join('') + `</div>`;
  } else if (PHONE.app === 'weap'){
    const own = weaponsOwned();
    h = top + back('السلاح') + `<div class="ph-list">` + Object.entries(WEAPONS).map(([k, w]) => own.includes(k) ? `<button class="ph-row${k === WEAP.cur ? ' on' : ''}" data-weap="${k}"><span>${w.icon} ${w.name}</span><small>${w.gun ? 'ضرب نار = بوليس' : w.funny ? 'للهزار' : k === 'none' ? '' : 'ضربة تقيلة'}</small></button>` : `<div class="ph-row locked"><span>🔒 ؟؟؟</span><small>مع القصة</small></div>`).join('') + `<p class="ph-note">الزرار ${WEAPONS[WEAP.cur].icon} جنب 👊 بيبدّل بينهم.</p></div>`;
  }
  P.innerHTML = h;
  P.querySelectorAll('[data-ph]').forEach(b => b.onclick = () => { const a = b.dataset.ph; if (a === 'ach'){ closePhone(); openAch(); return; } if (a === 'cam'){ closePhone(); $('photoBtn').click(); return; } PHONE.app = a; renderPhone(); });
  P.querySelectorAll('[data-gpsi]').forEach(b => b.onclick = () => gpsSet(PHONE.places[+b.dataset.gpsi]));
  P.querySelectorAll('[data-gps]').forEach(b => b.onclick = () => { if (b.dataset.gps === 'clear'){ gpsClear(); renderPhone(); } else { const tg = storyTarget(); if (tg) gpsSet({ name: `📱 ${curM().title}`, pos: tg.clone ? tg.clone() : new THREE.Vector3(tg.x, 0, tg.z) }); else banner('المهمة دي مالهاش مكان', 'info', 1.6); } });
  P.querySelectorAll('[data-call]').forEach(b => b.onclick = () => { const c = CONTACTS[+b.dataset.call]; closePhone(); tone(440, 440, .4, 'sine', .05); setTimeout(() => banner(`📞 ${c.name}: «${rpick(c.calls)}»`, 'info', 3.4), 600); });
  P.querySelectorAll('[data-weap]').forEach(b => b.onclick = () => { setWeapon(b.dataset.weap); renderPhone(); });
}
$('phoneBtn').addEventListener('click', e => { e.stopPropagation(); openPhone(); });
$('phoneClose').onclick = closePhone;
$('weapBtn').addEventListener('pointerdown', e => { e.stopPropagation(); if (state === 'play') cycleWeapon(); });
addEventListener('keydown', e => { if (e.target && e.target.tagName === 'INPUT') return; if (e.code === 'KeyP' && !e.repeat){ if ($('phone').hidden) openPhone(); else closePhone(); } if (e.code === 'KeyG' && !e.repeat && state === 'play') cycleWeapon(); });

// ---------------- more activities (same rules as 19g: one at a time, ✋ to start, ✕ to stop) ----------------
// a meter that runs back and forth; press ✋ while it is in the green
function swing(d, dt, sp){ d.k = (d.k || 0) + dt * sp; return 1 - Math.abs((d.k % 2) - 1); }
const inZone = (v, z) => v >= z[0] && v <= z[1];
const actSigns = [];
function actSign(emoji, label, x, z, y = 3){ const s = signSprite(emoji, label); s.position.set(x, y, z); actSigns.push(s); return s; }
// a ferris wheel on the corniche (ملاهي) and a horse carriage (حنطور)
const WHEEL = { x: -72, z: 133, r: 9, g: null };
{
  const g = new THREE.Group(), p = [];
  for (let i = 0; i < 16; i++){ const a = i / 16 * Math.PI * 2, s = new THREE.CylinderGeometry(.08, .08, WHEEL.r, 6); s.translate(0, WHEEL.r / 2, 0); s.rotateZ(a); p.push(colored(s, '#e0e0e0')); }
  const ring = new THREE.TorusGeometry(WHEEL.r, .18, 6, 40); p.push(colored(ring, '#ffca28'));
  const wheel = new THREE.Mesh(mergeGeometries(p.map(x => x.index ? x.toNonIndexed() : x)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .4, metalness: .4, emissive: 0x332200, emissiveIntensity: .3 })); g.add(wheel); g.userData.wheel = wheel;
  const cabs = []; for (let i = 0; i < 8; i++){ const c = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1, 1.1), new THREE.MeshStandardMaterial({ color: ['#e53935', '#1e88e5', '#43a047', '#fdd835'][i % 4], roughness: .5 })); g.add(c); cabs.push(c); } g.userData.cabs = cabs;
  const legs = []; for (const s of [-1, 1]) for (const dz of [-1, 1]){ const l = new THREE.CylinderGeometry(.15, .2, WHEEL.r + 2.5, 6); l.translate(0, (WHEEL.r + 2.5) / 2, 0); l.rotateZ(s * .32); l.translate(s * 1.8, 0, dz * .6); legs.push(colored(l, '#9e9e9e')); }
  scene.add(new THREE.Mesh(mergeGeometries(legs.map(x => x.index ? x.toNonIndexed() : x)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .5 })).translateX(WHEEL.x).translateZ(WHEEL.z));
  g.position.set(WHEEL.x, WHEEL.r + 2.4, WHEEL.z); scene.add(g); WHEEL.g = g;
  obstacles.push({ minX: WHEEL.x - 4, maxX: WHEEL.x + 4, minZ: WHEEL.z - 1.2, maxZ: WHEEL.z + 1.2 });
  glowSigns.push(signBoard(bigSign('🎡 ملاهي الكورنيش', '#1a237e', '#ffd54f', 640, 120, 60), WHEEL.x, 1.8, WHEEL.z + 1.5, 4, .75, 0, .5));
}
const HANTOUR = { g: null, x0: 20, x1: 230, z: 147.2 };
{
  const g = new THREE.Group(), p = [];
  box(p, 1.6, .8, 2.6, 0, 1.1, -1.2, '#4e342e'); box(p, 1.7, .1, 2.7, 0, 1.55, -1.2, '#ffca28'); box(p, 1.4, .7, .1, 0, 1.9, -2.4, '#4e342e'); box(p, 1.6, .08, 1.4, 0, 2.6, -1.8, '#c62828');
  for (const s of [-1, 1]){ const w = new THREE.CylinderGeometry(.6, .6, .1, 14); w.rotateZ(Math.PI / 2); w.translate(s * .9, .6, -1.4); p.push(colored(w, '#3e2723')); }
  box(p, .5, .7, 1.6, 0, 1.4, 1.2, '#8d6e63'); box(p, .3, .5, .5, 0, 1.95, 2.05, '#8d6e63'); for (const [x, z] of [[-.15, .6], [.15, .6], [-.15, 1.8], [.15, 1.8]]) box(p, .1, 1, .1, x, .55, z, '#6d4c41');
  g.add(new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 }))); g.position.set(HANTOUR.x0, 0, HANTOUR.z); g.rotation.y = Math.PI / 2; scene.add(g); HANTOUR.g = g;
}
// the taxi and the microbus for the passenger jobs (like the tuktuk)
const taxiVeh = addVehicle('taxi', 92, 136.2, Math.PI, '#161616'); taxiVeh.jobOnly = 'taxi'; taxiVeh.home.y = 0;
const microVeh = (() => {
  const g = new THREE.Group(), p = []; box(p, 2.1, 1.9, 4.8, 0, 1.35, 0, '#f4f4f0'); box(p, 2.12, .35, 4.82, 0, .9, 0, '#1e5aa8'); box(p, 2.14, .7, 3.6, 0, 1.75, -.4, '#22313a'); box(p, 1.9, .7, .06, 0, 1.75, 2.42, '#22313a');
  for (const x of [-.95, .95]) for (const z of [-1.6, 1.6]){ const w = new THREE.CylinderGeometry(.38, .38, .26, 12); w.rotateZ(Math.PI / 2); w.translate(x, .38, z); p.push(colored(w, '#141414')); }
  g.add(new THREE.Mesh(mergeGeometries(p.map(x => x.index ? x.toNonIndexed() : x)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5 }))); scene.add(g);
  const x = 116, z = -10.6, v = { type: 'car', mesh: g, pos: g.position, yaw: Math.PI / 2, speed: 0, steer: 0, max: 18, accel: 7, turn: 1.6, circles: [[1.3, 1.15], [-1.3, 1.15]], home: { x, z, yaw: Math.PI / 2, y: 0 }, jobOnly: 'micro' };
  g.position.set(x, 0, z); g.rotation.y = v.yaw; vehicles.push(v); return v;
})();
const JOB_VEH = { tuk: tukVeh, taxi: taxiVeh, micro: microVeh };
const JOB_NAME = { tuk: '🛺 التوكتوك', taxi: '🚕 التاكسي', micro: '🚐 الميكروباص' };
function startPaxJob(kind){ if (JOB.kind) return; JOB.kind = kind; JOB.count = 0; JOB.earned = 0; newPassenger(); if (!hero.veh) enterVehicle(JOB_VEH[kind]); banner(`${JOB_NAME[kind]}: روح خد الزبون من العلامة الصفرا`, 'info', 3); $('jobEnd').hidden = false; }
const FISH = [['🐟 بوري', 25], ['🐠 دنيس', 40], ['🦐 جمبري', 30], ['🐡 سردين', 12], ['🦀 كابوريا', 20], ['👢 جزمة قديمة 😂', 0]];
Object.assign(ACTS, {
  fishing: { pos: AV((PIER.x0 + PIER.x1) / 2, .15, PIER.z1 - 3), r: 3, label: '🎣 اصطاد سمك من على الرصيف',
    start(d){ d.n = 0; d.got = []; d.phase = 'cast'; hero.locked = true; banner('🎣 ارمي السنارة… ولما تشد، دوس في الأخضر', 'info', 3); },
    update(dt, d){
      ACT.cam = { p: AV(hero.pos.x - 4, 3, hero.pos.z - 4), l: AV(hero.pos.x + 2, .5, hero.pos.z + 8) };
      if (d.phase === 'wait'){ d.t -= dt; actUi('مستني السمكة… 🎣', .5); if (d.t <= 0){ d.phase = 'hook'; d.k = 0; d.zone = [R(.2, .6), 0]; d.zone[1] = d.zone[0] + .22; buzz(40); noise(.15, 1800, .3); banner('🐟 شدّت!! دوس في الأخضر', 'ok', 1.2); d.t = 3.5; } }
      else if (d.phase === 'hook'){ d.t -= dt; d.v = swing(d, dt, 1.3); actUi('اسحب! دوس ✋ في الأخضر', d.v, d.zone); if (d.t <= 0){ banner('السمكة هربت 😬', 'bad', 1.4); d.n++; d.phase = d.n >= 5 ? 'done' : 'cast'; } }
      if (d.phase === 'done'){ const sum = d.got.reduce((s, f) => s + f[1], 0); hero.money += sum; stat('fish', d.got.length); return actEnd(`🎣 طلّعت ${d.got.length} من ٥ · +${sum} جنيه`, d.got.length ? 'ok' : 'info'); }
    },
    action(d){ if (d.phase === 'cast') return { text: '🎣 ارمي السنارة', fn: () => { d.phase = 'wait'; d.t = R(1.5, 4); noise(.1, 800, .2); } }; if (d.phase === 'hook') return { text: '✋ اسحب!', fn: () => { if (inZone(d.v, d.zone)){ const f = rpick(FISH); d.got.push(f); banner(`${f[0]}${f[1] ? ' +' + f[1] : ''}`, 'ok', 1.6); coin(); } else banner('بدري أوي… السمكة فلتت', 'bad', 1.4); d.n++; d.phase = d.n >= 5 ? 'done' : 'cast'; } }; return null; },
    hud: d => `🎣 رمية ${Math.min(d.n + 1, 5)} من ٥ · طلّعت ${d.got.length}<br>${d.got.map(f => f[0].split(' ')[0]).join(' ')}` },
  kite: { pos: AV(-29.4, .15, 88.8), r: 2.2, label: '🪁 اطلع السطح وطيّر طيارة ورق',
    start(d){ d.t = 35; d.v = .5; d.in = 0; d.wind = 0; hero.locked = true; kiteShow(true); KITE.g.position.set(-24, 17, 72); SCENE.lockY = true; hero.pos.set(-24.5, 10.2, 79.5); banner('🪁 خلّي الطيارة في الأخضر: دوس ✋ تشد الخيط', 'info', 3); },
    update(dt, d, t){
      ACT.cam = { p: AV(-30, 13.5, 86), l: AV(-24, 14, 74) }; hero.pos.set(-24.5, 10.2, 79.5); hero.vel.set(0, 0, 0);
      d.t -= dt; d.wind += (Math.sin(t * .9) * .6 + Math.sin(t * 2.3) * .4 - d.wind) * dt; d.v = clamp(d.v - dt * (.18 + d.wind * .12), 0, 1);
      if (inZone(d.v, [.45, .8])) d.in += dt; KITE.g.position.y = 12 + d.v * 10; actUi(`الطيارة في الهوا… ${Math.round(d.in)} ثانية في الأخضر`, d.v, [.45, .8]);
      if (d.v <= 0){ return actEnd('🪁 الطيارة وقعت على سطح الجيران 😂', 'bad'); }
      if (d.t <= 0){ const pay = Math.round(d.in * 2); hero.money += pay; if (d.in > 25) stat('kite'); return actEnd(`🪁 طيّرتها ${Math.round(d.in)} ثانية في العالي · +${pay} جنيه`, 'ok'); }
    },
    action(d){ return { text: '🪁 شد الخيط', fn: () => { d.v = Math.min(1, d.v + .09); } }; },
    hud: d => `🪁 فاضل ${Math.max(0, Math.ceil(d.t))} ثانية · شد الخيط وخليها في الأخضر`,
    end(){ kiteShow(false); SCENE.lockY = false; heroTo2(-29.4, 89.4); } },
  arm: { pos: AV(13.6, .15, 33.6), r: 2, label: '💪 مصارعة إيد مع حمادة على الترابيزة',
    start(d){ d.v = .5; d.t = 0; hero.locked = true; helperShow(12, 31.4, 0, 'حمادة'); say(helper, 'هات إيدك يا طيارة 💪', 2); banner('💪 دوس ✋ بسرعة عشان تكسب', 'info', 2.5); },
    update(dt, d){ ACT.cam = { p: AV(16.5, 2.4, 35.5), l: AV(12.5, 1, 32) }; d.t += dt; d.v = clamp(d.v - dt * (.22 + d.t * .012), 0, 1); actUi('اضغط بسرعة! 💪', d.v, [.85, 1]);
      if (d.v >= 1){ hero.money += 20; stat('arm'); heroCheer(); say(helper, 'إيدك حديد يا جدع!', 2.2); return actEnd('💪 كسبت حمادة! +٢٠ جنيه', 'ok'); }
      if (d.v <= 0){ say(helper, 'روح كُل فول الأول 😂', 2.2); return actEnd('💪 حمادة كسبك…', 'bad'); } },
    action(d){ return { text: '💪 اضغط!', fn: () => { d.v = Math.min(1, d.v + .055); buzz(8); } }; },
    hud: () => '💪 مصارعة إيد: دوس بسرعة لحد ما توصل للأخضر',
    end(){ helperHide(); } },
  gym: { pos: AV(196, .15, -9.6), r: 2.4, label: '🏋️ جيم الأبطال: اتمرّن (١٠ جنيه)',
    start(d){ if (hero.money < 10){ actEnd('محتاج ١٠ جنيه للجيم', 'bad'); return; } hero.money -= 10; d.reps = 0; d.miss = 0; d.k = 0; hero.locked = true; banner('🏋️ دوس ✋ لما المؤشر يبقى في الأخضر', 'info', 2.5); },
    update(dt, d){ if (d.reps === undefined) return; d.v = swing(d, dt, 1.4 + d.reps * .12); actUi(`عدّة ${d.reps}/10`, d.v, [.42, .62]);
      if (d.reps >= 10){ const fit = Math.min(5, (+store.get('ty_fit') || 0) + 1); store.set('ty_fit', String(fit)); stat('gym'); heroCheer(); return actEnd(`🏋️ ١٠ عدّات! نَفَسك بقى أطول (لياقة ${fit}/5)`, 'ok'); }
      if (d.miss >= 3) return actEnd('🏋️ تعبت… كفاية النهارده', 'info'); },
    action(d){ return { text: '🏋️ ارفع!', fn: () => { if (inZone(d.v, [.42, .62])){ d.reps++; hero.cheerT = .5; noise(.1, 500, .2); } else { d.miss++; banner('😮‍💨 تقيلة…', 'bad', .8); } } }; },
    hud: d => `🏋️ ارفع ١٠ مرات في الأخضر · غلط ${d.miss || 0}/3` },
  play: { pos: AV(163.5, .15, 40.6), r: 2.2, label: '🎮 بلايستيشن: ماتش فيفا (٥ جنيه)',
    start(d){ if (hero.money < 5){ actEnd('محتاج ٥ جنيه', 'bad'); return; } hero.money -= 5; d.me = 0; d.him = 0; d.shot = 0; d.k = 0; hero.locked = true; banner('🎮 خمس شوطات… دوس في الأخضر عشان تجيب جون', 'info', 2.5); },
    update(dt, d){ if (d.shot === undefined) return; const z = [.4 - d.shot * .02, .58 - d.shot * .03]; d.v = swing(d, dt, 1.5 + d.shot * .2); d.z = z; actUi(`أنت ${d.me} - ${d.him} الكمبيوتر`, d.v, z);
      if (d.shot >= 5){ const win = d.me > d.him; if (win){ hero.money += 15; stat('fifa'); } return actEnd(win ? `🎮 كسبت ${d.me}-${d.him}! +١٥ جنيه` : `🎮 خسرت ${d.me}-${d.him} 😅`, win ? 'ok' : 'bad'); } },
    action(d){ return { text: '⚽ شوط!', fn: () => { if (inZone(d.v, d.z)){ d.me++; banner('جووول 🎮', 'ok', .9); } else banner('برا 😬', 'bad', .9); if (Math.random() < .45) d.him++; d.shot++; } }; },
    hud: d => `🎮 فيفا · شوطة ${Math.min((d.shot || 0) + 1, 5)} من ٥` },
  ferris: { pos: AV(WHEEL.x + 3.2, .15, WHEEL.z + 2.6), r: 2.4, label: '🎡 اركب الملاهي (١٠ جنيه)',
    start(d){ if (hero.money < 10){ actEnd('محتاج ١٠ جنيه', 'bad'); return; } hero.money -= 10; d.t = 0; hero.locked = true; SCENE.hideHero = true; banner('🎡 بص على إسكندرية من فوق', 'ok', 2.5); },
    update(dt, d){ if (d.t === undefined) return; d.t += dt; const a = d.t * .35, r = WHEEL.r, cx = WHEEL.x, cy = WHEEL.r + 2.4;
      const p = AV(cx + Math.sin(-a) * r, cy - Math.cos(-a) * r + 1.4, WHEEL.z + .9); ACT.cam = { p, l: AV(cx + 40 * Math.sin(d.t * .1), 2, WHEEL.z + 60) }; actUi('🎡', (d.t / 18) % 1);
      if (d.t > 18) return actEnd('🎡 أحلى منظر في إسكندرية', 'ok'); },
    hud: () => '🎡 فوق في السما… استمتع بالمنظر', end(){ SCENE.hideHero = false; } },
  souq: { pos: AV(120, .15, -50.4), r: 2.4, label: '🛍️ سوق الجمعة: فاصل واشتري',
    start(d){ const it = rpick([['📻 راديو قديم', 60], ['⌚ ساعة ماركة (؟)', 90], ['🧥 جاكت جلد', 120], ['🎸 عود', 150], ['📷 كاميرا قديمة', 100]]); d.item = it[0]; d.ask = Math.round(it[1] * R(1.3, 1.7)); d.min = Math.round(it[1] * R(.7, .95)); d.worth = Math.round(it[1] * R(.9, 1.4)); d.round = 0; hero.locked = true; helperShow(120, -52.6, 0, 'البيّاع'); souqPanel(d); },
    update(){}, hud: d => `🛍️ ${d.item || ''} · البيّاع عايز ${d.ask || 0} جنيه`, end(){ helperHide(); if (!$('shop').hidden) closePanel(); } },
  hantour: { pos: AV(HANTOUR.x0 + 2.4, .15, HANTOUR.z - 2.6), r: 2.6, label: '🐴 حنطور على الكورنيش (٢٠ جنيه)',
    start(d){ if (hero.money < 20){ actEnd('محتاج ٢٠ جنيه', 'bad'); return; } hero.money -= 20; d.t = 0; hero.locked = true; SCENE.hideHero = true; banner('🐴 لفّة على الكورنيش', 'ok', 2.5); },
    update(dt, d, t){ if (d.t === undefined) return; d.t += dt; const k = Math.min(1, d.t / 30), x = HANTOUR.x0 + (HANTOUR.x1 - HANTOUR.x0) * k; HANTOUR.g.position.x = x; HANTOUR.g.position.y = Math.abs(Math.sin(t * 6)) * .04;
      if (Math.random() < dt * 1.5) noise(.05, 700, .15); ACT.cam = { p: AV(x - 7, 3.2, HANTOUR.z - 5), l: AV(x + 10, 1.5, HANTOUR.z + 8) };
      if (k >= 1){ hero.pos.set(x, .15, HANTOUR.z - 3); return actEnd('🐴 لفة حلوة على الكورنيش', 'ok'); } },
    hud: () => '🐴 الحنطور ماشي على الكورنيش…', end(){ SCENE.hideHero = false; HANTOUR.g.position.set(HANTOUR.x0, 0, HANTOUR.z); } },
  keepie: { pos: AV(6, .15, 44), r: 2.2, label: '⚽ كورة شراب: نطّط الكورة',
    start(d){ d.n = 0; d.k = 0; hero.locked = true; ball.visible = true; banner('⚽ دوس ✋ لما الكورة تبقى في الأخضر', 'info', 2.5); },
    update(dt, d){ d.v = swing(d, dt, 1.2 + d.n * .08); ball.position.set(hero.pos.x + .4, .3 + (1 - d.v) * 1.6, hero.pos.z + .4); actUi(`نطّة ${d.n}`, d.v, [.8, 1]);
      ACT.cam = { p: AV(hero.pos.x + 3, 2, hero.pos.z + 4), l: AV(hero.pos.x, 1, hero.pos.z) }; },
    action(d){ return { text: '⚽ نطّط', fn: () => { if (d.v >= .8){ d.n++; d.k = 0; noise(.05, 1500, .2); } else { const rec = bestOf('keepie', d.n) ? ' · رقم قياسي!' : ''; hero.money += d.n; actEnd(`⚽ نطّطتها ${d.n} مرة · +${d.n} جنيه${rec}`, d.n >= 10 ? 'ok' : 'info'); } } }; },
    hud: d => `⚽ نطّطت ${d.n} · أحسن رقم ${PROG.best.keepie || 0}`, end(){ ball.visible = false; } },
  taxi: { pos: AV(92, .15, 139), r: 3, label: '🚕 اشتغل على التاكسي', start(){ ACT.kind = null; ACT.d = null; $('actQuit').hidden = true; startPaxJob('taxi'); }, update(){} },
  micro: { pos: AV(116, .15, -14), r: 3, label: '🚐 اشتغل على الميكروباص', start(){ ACT.kind = null; ACT.d = null; $('actQuit').hidden = true; startPaxJob('micro'); }, update(){} },
});
function souqPanel(d){
  const offers = [Math.round(d.ask * .5), Math.round(d.ask * .75), d.ask];
  openPanel(`🛍️ ${d.item}`, [
    ...offers.slice(0, 2).map(o => ({ label: `💬 «آخر كلام… ${o} جنيه؟»`, btn: `${o} ج`, fn: () => souqOffer(d, o) })),
    { label: `✅ موافق على ${d.ask} جنيه`, btn: 'اشتري', dim: hero.money < d.ask, fn: () => souqOffer(d, d.ask) },
    { label: '🚶 مش عايز', btn: 'امشي', fn: () => { closePanel(); actEnd('🛍️ مشيت من غير ما تشتري', 'info'); } },
  ], `البيّاع: «${d.round ? 'خلاص… ' : ''}${d.ask} جنيه وده آخر سعر»`);
}
function souqOffer(d, o){
  if (hero.money < o){ $('shopMoney').textContent = 'معاكش الفلوس دي 😅'; return; }
  if (o >= d.min || o >= d.ask){ closePanel(); hero.money -= o; const gain = d.worth - o; hero.money += d.worth; coin(); if (gain > 0) stat('souq'); say(helper, 'مبروك عليك… كسبتها', 2); return actEnd(`🛍️ اشتريتها بـ ${o} وبعتها بـ ${d.worth} · ${gain >= 0 ? 'كسبت' : 'خسرت'} ${Math.abs(gain)} جنيه`, gain >= 0 ? 'ok' : 'bad'); }
  d.round++; if (d.round >= 3){ closePanel(); say(helper, 'ربنا يسهلك… مش هبيع', 2); return actEnd('🛍️ البيّاع زهق ومشّاك 😂', 'bad'); }
  d.ask = Math.max(d.min, Math.round((d.ask + o) / 2 + R(0, 8))); say(helper, rpick(['لا يا باشا… خسران فيها', 'ده بضاعة أصلي!', 'زوّد شوية بس']), 1.8); souqPanel(d);
}
// signs over the new activities
actSign('🎣', 'صيد', ACTS.fishing.pos.x, ACTS.fishing.pos.z); actSign('🪁', 'طيارة ورق', ACTS.kite.pos.x, ACTS.kite.pos.z - .6); actSign('💪', 'مصارعة إيد', ACTS.arm.pos.x, ACTS.arm.pos.z + .4, 2.6);
actSign('🏋️', 'جيم', ACTS.gym.pos.x, ACTS.gym.pos.z); actSign('🎮', 'بلايستيشن', ACTS.play.pos.x, ACTS.play.pos.z); actSign('🛍️', 'سوق الجمعة', ACTS.souq.pos.x, ACTS.souq.pos.z);
actSign('🐴', 'حنطور', ACTS.hantour.pos.x, ACTS.hantour.pos.z); actSign('⚽', 'كورة شراب', ACTS.keepie.pos.x, ACTS.keepie.pos.z); actSign('🚕', 'تاكسي', ACTS.taxi.pos.x, ACTS.taxi.pos.z, 3.4); actSign('🚐', 'ميكروباص', ACTS.micro.pos.x, ACTS.micro.pos.z, 3.4);
ACH.push(
  { id: 'fish', icon: '🎣', name: 'صياد بحري', desc: 'اصطاد ١٠ سمكات', ok: () => (PROG.stats.fish || 0) >= 10 },
  { id: 'kite', icon: '🪁', name: 'في العالي', desc: 'طيّر الطيارة الورق ٢٥ ثانية في الأخضر', ok: () => (PROG.stats.kite || 0) >= 1 },
  { id: 'arm', icon: '💪', name: 'إيد حديد', desc: 'اكسب مصارعة إيد', ok: () => (PROG.stats.arm || 0) >= 1 },
  { id: 'souq', icon: '🛍️', name: 'تاجر شاطر', desc: 'اكسب فلوس من سوق الجمعة', ok: () => (PROG.stats.souq || 0) >= 1 },
);
// النوّات: in the free mode a storm comes now and then (Alexandria winter)
const NAWA = { t: R(240, 420), left: 0 };
function updateNawa(dt){
  if (modeId !== 'free' || state !== 'play'){ if (NAWA.left > 0){ NAWA.left = 0; setRain(false); } return; }
  if (NAWA.left > 0){ NAWA.left -= dt; if (NAWA.left <= 0){ setRain(false); banner('🌤️ النوّة خلصت', 'info', 2); NAWA.t = R(300, 600); } return; }
  NAWA.t -= dt; if (NAWA.t <= 0){ NAWA.left = R(70, 120); setRain(true); banner('🌧️ نوّة! البحر عالي والمطر نازل', 'info', 3); }
}

// ---------------- first-time tips, and buttons that show only when they do something ----------------
const TUT = [
  { el: () => isTouch ? $('joyHint') : null, at: 'left', text: () => isTouch ? 'اسحب بصباعك هنا عشان تمشي. ولو سحبت لآخره هتجري.' : 'امشي بـ WASD، واجري بـ Shift.' },
  { el: () => $('actBtn'), text: () => isTouch ? 'ده زرار ✋: تركب، تتكلم، تدخل المحلات… بيظهر لما يبقى فيه حاجة تتعمل.' : 'زرار E: تركب، تتكلم، تدخل المحلات.' },
  { el: () => $('punchBtn'), text: () => '👊 تضرب. وجنبه زرار السلاح… الشبشب أول سلاح 😂' },
  { el: () => $('phoneBtn'), text: () => '📱 موبايل طيارة: خريطة بالـ GPS، ومهماتك، والأسامي اللي تعرفهم.' },
  { el: () => $('radar'), text: () => 'الخريطة الصغيرة. النجمة ★ مكان مهمتك… دوس عليها تكبر.' },
  { el: () => $('menuBtn'), text: () => '☰ استراحة: الإعدادات، وتعدّي المهمة، والقايمة.' },
];
const TUTS = { i: -1 };
function tutStart(){ if (store.get('ty_tut') === '1' || TUTS.i >= 0) return; TUTS.i = 0; document.body.classList.add('tut'); tutShow(); }
function tutShow(){
  const s = TUT[TUTS.i]; if (!s){ tutEnd(); return; }
  const el = s.el(), box = $('tutBox'), r = el && el.offsetWidth ? el.getBoundingClientRect() : null;
  $('tutText').textContent = s.text(); $('tutN').textContent = `${TUTS.i + 1}/${TUT.length}`; $('tut').hidden = false;
  const hl = $('tutHl'); if (r){ hl.hidden = false; Object.assign(hl.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' }); } else hl.hidden = true;
  const bw = Math.min(320, innerWidth - 32); let x = r ? r.left + r.width / 2 - bw / 2 : innerWidth / 2 - bw / 2, y = r ? (r.top > innerHeight / 2 ? r.top - 120 : r.bottom + 14) : innerHeight / 2 - 50;
  x = clamp(x, 16, innerWidth - bw - 16); y = clamp(y, 10, innerHeight - 130); Object.assign(box.style, { left: x + 'px', top: y + 'px', width: bw + 'px' });
}
function tutEnd(){ TUTS.i = -2; $('tut').hidden = true; document.body.classList.remove('tut'); store.set('ty_tut', '1'); }
$('tutNext').onclick = () => { TUTS.i++; tutShow(); };
$('tutSkip').onclick = tutEnd;
let ctxT = 0;
function updateContextButtons(dt){
  ctxT -= dt; if (ctxT > 0) return; ctxT = .2;
  const b = document.body;
  if (b.classList.contains('tut') || state !== 'play'){ b.classList.remove('no-act', 'no-punch', 'no-run'); return; }
  b.classList.toggle('no-act', !nearAction && !hero.veh);
  const p = hero.pos, foe = WEAP.cur !== 'none' || (enemy.active && !enemy.ally && enemy.pos.distanceTo(p) < 12) || boss.active || (wanted.active && !wanted.caught) || (thief.active && !thief.caught) || npcs.some(n => (n.thug || n.state === 'walk' || n.state === 'idle' || n.state === 'fight') && n.g.visible && n.g.position.distanceTo(p) < 3.2);
  b.classList.toggle('no-punch', !foe && !hero.veh);
  b.classList.toggle('no-run', !hero.veh && joy.id === null && hero.vel.lengthSq() < .3);
}
let ownT = 0;
function updateStage5(dt, t){ updatePolice(dt, t);
  ownT -= dt; if (ownT <= 0){ ownT = 1; if (WEAP.cur !== 'none' && !weaponsOwned().includes(WEAP.cur)) setWeapon('none', true); } updateGps(dt); updateNawa(dt); updateContextButtons(dt);
  if (WHEEL.g){ WHEEL.g.userData.wheel.rotation.z = t * .35; WHEEL.g.userData.cabs.forEach((c, i) => { const a = t * .35 + i / 8 * Math.PI * 2; c.position.set(Math.sin(-a) * WHEEL.r, -Math.cos(-a) * WHEEL.r - .7, .9); }); }
  const show = modeId === 'free' || modeId === 'story'; for (const s of actSigns) s.visible = show;
  if (state === 'play' && !CUT.on && TUTS.i === -1 && (modeId === 'story' || modeId === 'free') && runTime > 1.5 && store.get('ty_tut') !== '1') tutStart();
}
