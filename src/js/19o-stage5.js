// ================= stage 5: weapons and the police, طيارة's phone (GPS, missions, people), more activities, the first-time tips =================

// ---------------- weapons ----------------
// Funny ones (slipper, broom, plastic chair) and real ones (club, pistol). No blood: people fall down and get up.
// In the story they come with the story; in the free mode you have them all. Shooting in the street brings the police.
const WEAPONS = {
  none:    { name: 'إيدك', icon: 'fist', mult: 1, range: 1.9 },
  slipper: { name: 'شبشب', icon: 'shoe', mult: 1.2, range: 2, funny: ['إيه ده؟!', 'آه… بالراحة!'] },
  broom:   { name: 'مقشة', icon: 'stick', mult: 1.5, range: 2.5, funny: ['آه!', 'بالراحة يا عم!'] },
  chair:   { name: 'كرسي بلاستيك', icon: 'armchair', mult: 2.2, range: 2.1, uses: 4, funny: ['آه يا ضهري!', 'سيبه من إيدك!'] },
  stick:   { name: 'شومة', icon: 'stick', mult: 2, range: 2.3 },
  pistol:  { name: 'مسدس', icon: 'crosshair', mult: 3, range: 24, gun: true },
  bottle:  { name: 'قزازة', icon: 'bottle', mult: 2.6, range: 1.9, uses: 1, prop: true, funny: ['قزازة؟!', 'آه يا راسي!'] },
  bin:     { name: 'صفيحة زبالة', icon: 'trash', mult: 2.4, range: 2.1, uses: 2, prop: true, funny: ['آه!', 'إيه ده؟!'] },
};
const WEAP = { cur: 'none', meshes: {}, chairUses: 0 };
function weaponsOwned(){
  if (modeId !== 'story') return Object.keys(WEAPONS).filter(k => !WEAPONS[k].prop);
  const m = SAVE.m, I = idx, out = ['none', 'slipper'];
  if (SAVE.ended || m > I('spill')) out.push('broom', 'chair');
  if (SAVE.ended || (m >= I('prepare'))) out.push('stick');
  if (SAVE.ended || m >= I('prepare')) out.push('knife');
  if (SAVE.ended) out.push('machete', 'pistol', 'shotgun', 'ak', 'molotov');
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
  if (id === 'knife'){ box(p, .025, .1, .03, 0, .02, .02, '#2b2b2b'); box(p, .006, .17, .035, 0, .15, .03, '#d9dde0'); }
  if (id === 'machete'){ box(p, .03, .12, .035, 0, .02, .02, '#4a2f1b'); box(p, .008, .5, .07, 0, .33, .04, '#c7ccd1'); }
  if (id === 'shotgun'){ box(p, .05, .14, .07, 0, .02, -.02, '#5a3a22'); cyl(p, .018, .018, .42, -.018, .26, .05, '#222'); cyl(p, .018, .018, .42, .018, .26, .05, '#222'); }
  if (id === 'ak'){ box(p, .045, .14, .06, 0, .02, -.03, '#6b4423'); box(p, .05, .3, .07, 0, .2, .03, '#2a2a2a'); cyl(p, .012, .012, .3, 0, .47, .05, '#1b1b1b'); box(p, .035, .12, .05, 0, .17, -.06, '#2a2a2a'); }
  if (id === 'molotov'){ cyl(p, .04, .045, .2, 0, .14, 0, '#3f7d2e'); box(p, .02, .08, .02, 0, .28, 0, '#e8e2d4'); }
  if (id === 'bottle'){ cyl(p, .04, .04, .2, 0, .14, 0, '#2e7d32'); cyl(p, .014, .035, .09, 0, .28, 0, '#2e7d32'); }
  if (id === 'bin'){ cyl(p, .2, .17, .55, 0, .3, 0, '#78909c'); }
  if (id === 'pistol'){ box(p, .04, .12, .05, 0, .06, .02, '#1b1b1b'); box(p, .04, .05, .2, 0, .13, .1, '#2a2a2a'); }
  if (!p.length){ WEAP.meshes[id] = null; return null; }
  g.add(new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: id === 'pistol' ? .6 : .1 })));
  g.position.copy(A.wr.clone().sub(R3.bones.lowerArmR.userData.w)); R3.bones.lowerArmR.add(g); WEAP.meshes[id] = g; return g;
}
function setWeapon(id, quiet){
  if (!WEAPONS[id]) id = 'none';
  WEAP.cur = id; hero.weapon = id === 'none' ? null : id; if (WEAPONS[id].uses) WEAP.chairUses = WEAPONS[id].uses; if (id !== WEAP.picked) WEAP.picked = null;
  for (const k of Object.keys(WEAPONS)){ const m = weaponMesh(k); if (m) m.visible = k === id; }
  $('weapBtn').innerHTML = icon(WEAPONS[id].icon || 'sword'); document.body.classList.toggle('armed', id !== 'none');
  if (!quiet) banner(WEAPONS[id].name, 'info', 1.2);
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
  { const mat = { stick: 'wood', broom: 'wood', chair: 'block', bottle: 'glass', bin: 'metalm', machete: 'metall' }[WEAP.cur]; if (mat) playS(mat, .8); }
  if (W.uses || WEAP.picked === WEAP.cur){ WEAP.chairUses--; noise(.2, WEAP.cur === 'bottle' ? 4200 : 1400, .4); if (WEAP.chairUses <= 0){ banner(`${W.name} اتكسر${WEAP.cur === 'chair' ? '' : 'ت'}!`, 'info', 1.4); setWeapon('none', true); } }
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
  crime('shoot', p); shopsPanic(p);
}
// ---- the police: see 19q-police.js (one wanted level for the whole game) ----
const snapTo = (list, v) => list.reduce((b, r) => Math.abs(r - v) < Math.abs(b - v) ? r : b, list[0]);
// a path along the road grid: to the nearest east-west road, along it, then up or down the north-south road
function roadPath(from, to){
  const z1 = snapTo(ROADS_Z, from.z), x2 = snapTo(ROADS_X, to.x);
  return [new THREE.Vector3(from.x, 0, z1), new THREE.Vector3(x2, 0, z1), new THREE.Vector3(x2, 0, to.z), new THREE.Vector3(to.x, 0, to.z)];
}
// ---------------- طيارة's phone ----------------
const PHONE = { app: 'home' };
const GPS = { on: false, to: null, name: '', path: [], repath: 0 };
const SHOP_IC = { pharmacy: 'pill', barber: 'scissors', juice: 'glass-full', phones: 'device-mobile', market: 'basket', koshari: 'soup', bakery: 'bread', police: 'shield-star', cafe: 'coffee', azzouz: 'pizza' };
const ACT_MAP = { football: ['ضربات جزاء', 'ball-football'], parking: ['السايس', 'parking'], pigeons: ['غية الحمام', 'feather'], fishing: ['صيد السمك', 'fish-hook'], kite: ['طيارة ورق', 'wind'], arm: ['مصارعة إيد', 'fist'], gym: ['جيم الأبطال', 'barbell'], play: ['بلايستيشن', 'device-gamepad-2'], ferris: ['الملاهي', 'star'], souq: ['سوق الجمعة', 'shopping-bag'], hantour: ['حنطور', 'horse-toy'], keepie: ['كورة شراب', 'ball-football'], taxi: ['شغل التاكسي', 'car'], micro: ['شغل الميكروباص', 'bus'] };
function gpsPlaces(){
  const L = [], P = (cat, g, name, ic, pos) => { if (pos) L.push({ cat, g, name, ic, pos: pos.clone ? pos.clone() : new THREE.Vector3(pos.x, 0, pos.z) }); };
  const M = modeId === 'story' ? curM() : null, tg = M && typeof storyTarget === 'function' ? storyTarget() : null;
  if (tg) P('mission', 'المهمة', M.title, 'star', tg);
  P('home', 'الحتة', 'قهوة قصر الملوك', 'coffee', PL.cafeOut); P('home', 'الحتة', 'بيت طيارة', 'home', SPOT.house); P('home', 'الحتة', 'بيت شادية', 'home', STORY_HOUSES.shadia.door); P('home', 'الحتة', 'بيت إسلام', 'home', STORY_HOUSES.islam.door); P('home', 'الحتة', 'عربية الفول', 'flame', SPOT.cart);
  for (const s of SHOPS) if (s.id !== 'cafe') P('shops', 'المحلات', s.name.replace(/\s*\(جوه\)/, ''), SHOP_IC[s.id] || 'building-store', s.out);
  if (CITY) for (const l of CITY.landmarks) P('places', 'إسكندرية', l.name, l.k === 'qaitbay' ? 'building-castle' : l.k.includes('st') ? 'train' : 'map-pin', new THREE.Vector3(l.k === 'qaitbay' ? QAIT_GATE[0] : l.x, 0, l.k === 'qaitbay' ? QAIT_GATE[1] : l.z)); else P('places', 'إسكندرية', 'القلعة', 'building-castle', new THREE.Vector3(96, 0, 262)); P('places', 'إسكندرية', 'حلقة السمك', 'fish', new THREE.Vector3(72, 0, 140)); P('places', 'إسكندرية', 'الميناء', 'anchor', PORT.door); P('places', 'إسكندرية', 'فيلا الحاج العربي', 'building-estate', VILLA.gate); P('places', 'إسكندرية', 'معرض العربيات', 'car', SHOWROOM.front); P('places', 'إسكندرية', 'الكورنيش', 'ship', PL.corniche); P('places', 'إسكندرية', 'ورشة شمس', 'tool', SPOT.workshop);
  if (typeof GARAGE_POS !== 'undefined') P('places', 'إسكندرية', 'ورشة رضا', 'car-garage', GARAGE_POS);
  if (!MERGED) TRAM.stations.forEach((x, i) => P('transit', 'مواصلات', `محطة الترام ${AR(i + 1)}`, 'train', new THREE.Vector3(x, 0, TRAM.z - 7)));
  for (const s of STOPS) P('transit', 'مواصلات', `موقف ${s.name}`, 'bus', s.pos);
  L.push(...owPlaces());
  for (const [k, A] of Object.entries(ACTS)) if (A && A.pos && A.label){ const m = ACT_MAP[k]; P('fun', 'تسالي', m ? m[0] : A.label.replace(/[^\u0600-\u06FF\s()٠-٩0-9:]/g, '').trim(), m ? m[1] : 'star', A.pos); }
  return L;
}
function gpsSet(p){ GPS.on = true; GPS.to = p.pos.clone(); GPS.name = p.name; GPS.repath = 0; hudHint(`الطريق على الرادار: <b>${p.name}</b>`, true); closePhone(); }
function gpsClear(){ GPS.on = false; GPS.to = null; GPS.path = []; }
function updateGps(dt){
  if (!GPS.on) return; const f = hero.veh ? hero.veh.pos : hero.pos;
  if (Math.hypot(f.x - GPS.to.x, f.z - GPS.to.z) < 7){ hudHint(`وصلت <b>${GPS.name}</b>`, true); gpsClear(); return; }
  GPS.repath -= dt; if (GPS.repath <= 0){ const to = GPS.to; const off = GPS.path.length ? Math.min(...GPS.path.slice(0, 12).map(q => Math.hypot(q.x - f.x, q.z - f.z))) : 1e9; GPS.repath = 1; if (off > 18 || !GPS.path.length || GPS.full !== to){ GPS.full = to; GPS.path = [f.clone(), ...roadPath(f, to)]; } else { while (GPS.path.length > 2 && Math.hypot(GPS.path[1].x - f.x, GPS.path[1].z - f.z) < 12) GPS.path.shift(); GPS.path[0] = f.clone(); } }   // stage 14: real streets (A*), re-planned only when you leave the route
}
// people in your phone: they appear as you meet them in the story
const CONTACTS = [
  { k: 'moallem', name: 'المعلم عبده', emoji: '🧔', about: 'صاحب قهوة قصر الملوك. بيزعّق كتير… وقلبه أبيض.', calls: ['الوردية يا طيارة!', 'هو انت فين؟ القهوة مليانة!'] },
  { k: 'islam', name: 'إسلام', face: () => CH.islam.img.face, about: 'صاحبك من زمان. دافي، ونفسه في الاستقرار.', calls: ['إيه يا جامد؟ تعالى نلعب دور دومنو.', 'هايدي بتسلّم عليك'], after: 'islamHi' },
  { k: 'kamel', name: 'الحاج كامل', emoji: '👳‍♂️', about: 'قاعد بالشيشة على القهوة من أيام ما الترام كان بتعريفة. هو اللي بيحكي الحكاية.', calls: ['اقعد يا ابني… اقعد.', 'الشاي من غير سكر… زي الدنيا من غير صحاب.'], after: 'domino' },
  { k: 'shadia', name: 'شادية', emoji: '👩', about: 'جارتك. بتصوّر، ونفسها تبقى أشهر مصورة في إسكندرية.', calls: ['الغروب النهارده هيبقى حلو… تيجي؟', 'متنساش تبتسم في الصور'], after: 'laundry' },
  { k: 'landlord', name: 'الحاج محمود', emoji: '👳', about: 'صاحب البيت. الإيجار إيجار.', calls: ['الإيجار يا ابني… الإيجار!'], after: 'wake' },
  { k: 'fathi', name: 'الحاج فتحي', emoji: '🧆', about: 'بتاع الفول والطعمية. علّق يافطة «ممنوع دخول يوسف إبراهيم».', calls: ['الطعمية لسه طالعة من الزيت!'], after: 'foul' },
  { k: 'azzouz', name: 'عزوز', emoji: '👨‍🍳', about: 'صاحب مطعم البيتزا. الطلبات كتير والوقت قليل.', calls: ['عندي طلب مستعجل يا طيارة!'], after: 'azzouz' },
  { k: 'arabi', name: 'العربي', face: () => CH.enemy.img.face, about: 'ابن الحاج العربي. عربية حمرا، ولسان أطول منها.', calls: ['إيه يا صبي القهوة؟', 'تيجي نتسابق؟'], after: 'arabiArrives' },
  { k: 'youssef', name: 'يوسف إبراهيم', face: () => CH.youssef.img.face, about: 'بيهزر حتى وهو غلطان. ممنوع دخوله نص محلات الحتة.', calls: ['أنا ماخدتش حاجة والله'], after: 'snatch' },
  { k: 'shams', name: 'شمس', face: () => CH.wanted.img.face, about: 'كان أشطر ميكانيكي في المنطقة. دلوقتي… محدش بيشوف وشه.', calls: ['(الرقم مغلق أو غير متاح)'], after: 'poster' },
  { k: 'father', name: 'الحاج العربي', emoji: '🧔', about: 'أبو العربي. عنده نص الميناء ونص سموحة.', calls: ['أهلاً يا طيارة يا ابني.'], after: 'villaFlash' },
  { k: 'officer', name: 'الظابط حسام', emoji: '👮', about: 'ظابط قسم الجمرك. عينه على الحتة.', calls: ['لو شفت حاجة بلّغني على طول.'], after: 'poster' },
  { k: 'haidy', name: 'هايدي', emoji: '👰', about: 'خطيبة إسلام. اتقابلوا في الترام.', calls: ['إسلام بيقول عليك أخوه'], after: 'islamFlash' },
];
const met = c => modeId !== 'story' || SAVE.ended || !c.after || SAVE.m > idx(c.after);
function openPhone(app){
  if (state !== 'play' || CUT.on) return;
  state = 'pause'; for (const k in keys) keys[k] = false; PHONE.app = app || 'home'; renderPhone(); $('phone').hidden = false; tone(880, 1320, .08, 'sine', .05);
}
function closePhone(){ if ($('phone').hidden) return; $('phone').hidden = true; if (state === 'pause') state = 'play'; }
function renderPhone(){
  const P = $('phoneScr'), now = typeof TOD !== 'undefined' ? clockText() : '';
  const top = `<div class="ph-bar"><span>${now}</span><span>${egp(hero.money)}</span></div>`;
  const back = t => `<div class="ph-head"><button data-ph="home" aria-label="رجوع">${icon('arrow-right')}</button><b>${t}</b></div>`;
  let h = '';
  if (PHONE.app === 'home'){
    h = top + `<div class="ph-wall"><b>${clockText ? clockText() : ''}</b><small>${DISTRICT_NAMES[districtAt(hero.pos.x, hero.pos.z)] || 'إسكندرية'}</small></div><div class="ph-apps">
      <button data-ph="gps"><span>${icon('map-2')}</span>الخريطة</button><button data-ph="tasks"><span>${icon('book-2')}</span>المهمات</button><button data-ph="people"><span>${icon('users')}</span>الأسامي</button>
      <button data-ph="ach"><span>${icon('trophy')}</span>الإنجازات</button><button data-ph="cam"><span>${icon('camera')}</span>الكاميرا</button><button data-ph="weap"><span>${icon(WEAPONS[WEAP.cur].icon)}</span>السلاح</button><button data-ph="swap"><span>${icon('users')}</span>الشلة</button><button data-ph="done"><span>${icon('check')}</span>خلّصت قد إيه</button><button data-ph="save"><span>${icon('book-2')}</span>احفظ</button></div>`;
  } else if (PHONE.app === 'gps'){
    const L = gpsPlaces(), groups = [...new Set(L.map(p => p.g))];
    h = top + back('الخريطة') + (GPS.on ? `<div class="ph-row on"><span>${GPS.name}</span><button data-gps="clear">شيل</button></div>` : '') + `<div class="ph-list">` + groups.map(g => `<h4>${g}</h4>` + L.map((p, i) => p.g === g ? `<button class="ph-row" data-gpsi="${i}"><span>${p.name}</span><small>${Math.round(hero.pos.distanceTo(p.pos))} م</small></button>` : '').join('')).join('') + `</div>`;
    PHONE.places = L;
  } else if (PHONE.app === 'tasks'){
    const M = modeId === 'story' ? curM() : null;
    h = top + back('المهمات') + `<div class="ph-list">` + (M ? `<div class="ph-card"><small>${CHAPS[M.ch][0]}: ${CHAPS[M.ch][1]}</small><b>${M.title}</b><p>${storyHud().replace(/<br>.*$/s, '')}</p><button data-gps="mission">وديني على المهمة</button></div><div class="ph-card"><small>القصة</small><b>خلّصت ${SAVE.m} من ${MS.length}</b></div>` : modeId === 'story' ? '<div class="ph-card"><b>خلّصت القصة</b></div>' : '<div class="ph-card"><b>لف براحتك</b><p>القصة من القايمة الرئيسية ← كمّل القصة</p></div>')
      + `<h4>تسالي في الحتة</h4>` + Object.values(ACTS).filter(A => A && A.label && A.pos).map(A => `<div class="ph-row"><span>${A.label}</span></div>`).join('') + `</div>`;
  } else if (PHONE.app === 'people'){
    h = top + back('الأسامي') + `<div class="ph-list">` + CONTACTS.map((c, i) => met(c) ? `<div class="ph-contact">${c.face ? `<img src="${c.face()}" alt="">` : `<span class="em">${icon('user')}</span>`}<div><b>${c.name}</b><small>${c.about}</small></div><button data-call="${i}" aria-label="اتصل">${icon('phone')}</button></div>` : `<div class="ph-contact locked"><span class="em">${icon('user')}</span><div><b>؟؟؟</b><small>لسه ماتعرفتوش</small></div></div>`).join('') + `</div>`;
  } else if (PHONE.app === 'weap'){
    const own = weaponsOwned();
    h = top + back('السلاح') + `<div class="ph-list">` + Object.entries(WEAPONS).filter(([k, w]) => !w.prop || own.includes(k)).map(([k, w]) => own.includes(k) ? `<button class="ph-row${k === WEAP.cur ? ' on' : ''}" data-weap="${k}"><span>${icon(w.icon)} ${w.name}</span><small>${AMMO[k] ? (k === 'molotov' ? AMMO[k].mag + ' قزايز' : AMMO[k].mag + ' / ' + AMMO[k].res) + ' · ' : ''}${w.thrown ? 'بيولّع نار، والبوليس هيجي' : w.gun ? 'ضرب النار بيجيب البوليس' : w.funny ? 'ضربة خفيفة' : k === 'none' ? '' : 'ضربة تقيلة'}</small></button>` : `<div class="ph-row locked"><span>؟؟؟</span><small>مع القصة</small></div>`).join('') + `<p class="ph-note">زرار السلاح فوق على اليمين بيبدّل بينهم، ولو دوست عليه كتير بتطلع العجلة.</p></div>`;
  }
  P.innerHTML = ARH(h);
  P.querySelectorAll('[data-ph]').forEach(b => b.onclick = () => { const a = b.dataset.ph; if (a === 'gps'){ closePhone(); setTimeout(openMap, 30); return; } if (a === 'swap'){ closePhone(); setTimeout(openWheel2, 30); return; } if (a === 'done'){ closePhone(); setTimeout(openDone, 30); return; } if (a === 'save'){ closePhone(); setTimeout(() => openSaves('save'), 30); return; } if (a === 'ach'){ closePhone(); openAch(); return; } if (a === 'cam'){ closePhone(); $('photoBtn').click(); return; } PHONE.app = a; renderPhone(); });
  P.querySelectorAll('[data-gpsi]').forEach(b => b.onclick = () => gpsSet(PHONE.places[+b.dataset.gpsi]));
  P.querySelectorAll('[data-gps]').forEach(b => b.onclick = () => { if (b.dataset.gps === 'clear'){ gpsClear(); renderPhone(); } else { const tg = storyTarget(); if (tg) gpsSet({ name: curM().title, pos: tg.clone ? tg.clone() : new THREE.Vector3(tg.x, 0, tg.z) }); else banner('المهمة دي مالهاش مكان', 'info', 1.6); } });
  P.querySelectorAll('[data-call]').forEach(b => b.onclick = () => { const c = CONTACTS[+b.dataset.call]; closePhone(); tone(440, 440, .4, 'sine', .05); setTimeout(() => banner(`${c.name}: «${rpick(c.calls)}»`, 'info', 3.4), 600); });
  P.querySelectorAll('[data-weap]').forEach(b => b.onclick = () => { setWeapon(b.dataset.weap); renderPhone(); });
  if (PHONE.app === 'weap' && weaponsOwned().some(k => AMMO[k])){ const bb = document.createElement('button'); bb.className = 'ph-row'; bb.innerHTML = '<span>اشتري رصاص ومولوتوف</span><small>٨٠ جنيه</small>'; bb.onclick = () => { if (buyAmmo()) renderPhone(); }; const lst = P.querySelector('.ph-list'); if (lst) lst.appendChild(bb); }
}
$('phoneBtn').addEventListener('click', e => { e.stopPropagation(); openPhone(); });
$('phoneClose').onclick = closePhone;
$('weapBtn').addEventListener('pointerdown', e => weapBtnDown(e));   // tap = next weapon, hold = the wheel (19s)
['pointerup', 'pointercancel'].forEach(ev => $('weapBtn').addEventListener(ev, e => weapBtnUp(e)));
addEventListener('keydown', e => { if (e.target && e.target.tagName === 'INPUT') return; if (e.code === 'KeyP' && !e.repeat){ if ($('phone').hidden) openPhone(); else closePhone(); } if (e.code === 'KeyX' && !e.repeat && state === 'play') cycleWeapon(); });

// ---------------- more activities (same rules as 19g: one at a time, to start, ✕ to stop) ----------------
// a meter that runs back and forth; press while it is in the green
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
  WHEEL.legs = new THREE.Mesh(mergeGeometries(legs.map(x => x.index ? x.toNonIndexed() : x)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .5 })).translateX(WHEEL.x).translateZ(WHEEL.z); scene.add(WHEEL.legs);
  g.position.set(WHEEL.x, WHEEL.r + 2.4, WHEEL.z); scene.add(g); WHEEL.g = g;
  WHEEL.ob = { minX: WHEEL.x - 4, maxX: WHEEL.x + 4, minZ: WHEEL.z - 1.2, maxZ: WHEEL.z + 1.2 }; obstacles.push(WHEEL.ob);
  glowSigns.push(WHEEL.sign = signBoard(bigSign('ملاهي الكورنيش', '#1a237e', '#ffd54f', 640, 120, 60), WHEEL.x, 1.8, WHEEL.z + 1.5, 4, .75, 0, .5));
}
const HANTOUR = { g: null, x0: -84, x1: 90, z: 147.2 };   // along the «حتة» corniche
{
  const g = new THREE.Group(), p = [];
  box(p, 1.6, .8, 2.6, 0, 1.1, -1.2, '#4e342e'); box(p, 1.7, .1, 2.7, 0, 1.55, -1.2, '#ffca28'); box(p, 1.4, .7, .1, 0, 1.9, -2.4, '#4e342e'); box(p, 1.6, .08, 1.4, 0, 2.6, -1.8, '#c62828');
  for (const s of [-1, 1]){ const w = new THREE.CylinderGeometry(.6, .6, .1, 14); w.rotateZ(Math.PI / 2); w.translate(s * .9, .6, -1.4); p.push(colored(w, '#3e2723')); }
  box(p, .5, .7, 1.6, 0, 1.4, 1.2, '#8d6e63'); box(p, .3, .5, .5, 0, 1.95, 2.05, '#8d6e63'); for (const [x, z] of [[-.15, .6], [.15, .6], [-.15, 1.8], [.15, 1.8]]) box(p, .1, 1, .1, x, .55, z, '#6d4c41');
  g.add(new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 }))); g.position.set(HANTOUR.x0, 0, HANTOUR.z); g.rotation.y = Math.PI / 2; scene.add(g); HANTOUR.g = g;
}
// the taxi and the microbus for the passenger jobs (like the tuktuk)
const taxiVeh = addVehicle('taxi', ...RELOC(78, 139), Math.PI / 2, '#161616'); taxiVeh.jobOnly = 'taxi'; taxiVeh.home.y = 0;
const microVeh = (() => {
  const g = new THREE.Group(), p = []; box(p, 2.1, 1.9, 4.8, 0, 1.35, 0, '#f4f4f0'); box(p, 2.12, .35, 4.82, 0, .9, 0, '#1e5aa8'); box(p, 2.14, .7, 3.6, 0, 1.75, -.4, '#22313a'); box(p, 1.9, .7, .06, 0, 1.75, 2.42, '#22313a');
  for (const x of [-.95, .95]) for (const z of [-1.6, 1.6]){ const w = new THREE.CylinderGeometry(.38, .38, .26, 12); w.rotateZ(Math.PI / 2); w.translate(x, .38, z); p.push(colored(w, '#141414')); }
  g.add(new THREE.Mesh(mergeGeometries(p.map(x => x.index ? x.toNonIndexed() : x)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5 }))); scene.add(g);
  const x = 114, z = -5, v = { type: 'car', mesh: g, pos: g.position, yaw: Math.PI / 2, speed: 0, steer: 0, max: 18, accel: 7, turn: 1.6, circles: [[1.3, 1.15], [-1.3, 1.15]], home: { x, z, yaw: Math.PI / 2, y: 0 }, jobOnly: 'micro' };
  g.position.set(x, 0, z); g.rotation.y = v.yaw; vehicles.push(v); return v;
})();
const JOB_VEH = { tuk: tukVeh, taxi: taxiVeh, micro: microVeh };
const JOB_NAME = { tuk: 'التوكتوك', taxi: 'التاكسي', micro: 'الميكروباص' };
function startPaxJob(kind){ if (JOB.kind) return; JOB.kind = kind; JOB.count = 0; JOB.earned = 0; newPassenger(); if (!hero.veh) enterVehicle(JOB_VEH[kind]); banner(`${JOB_NAME[kind]}: روح خد الزبون من العلامة الصفرا`, 'info', 3); $('jobEnd').hidden = false; }
const FISH = [['بوري', 25], ['دنيس', 40], ['جمبري', 30], ['سردين', 12], ['كابوريا', 20], ['جزمة قديمة', 0]];
Object.assign(ACTS, {
  fishing: { pos: AV((PIER.x0 + PIER.x1) / 2, .15, PIER.z1 - 3), r: 3, label: 'اصطاد سمك من على الرصيف',
    start(d){ d.n = 0; d.got = []; d.phase = 'cast'; hero.locked = true; banner('ارمي السنارة… ولما تشد، دوس في الأخضر', 'info', 3); },
    update(dt, d){
      ACT.cam = { p: new THREE.Vector3(hero.pos.x - 4, 3, hero.pos.z - 4), l: new THREE.Vector3(hero.pos.x + 2, .5, hero.pos.z + 8) };
      if (d.phase === 'wait'){ d.t -= dt; actUi('مستني السمكة…', .5); if (d.t <= 0){ d.phase = 'hook'; d.k = 0; d.zone = [R(.2, .6), 0]; d.zone[1] = d.zone[0] + .22; buzz(40); noise(.15, 1800, .3); banner('شدّت!! دوس في الأخضر', 'ok', 1.2); d.t = 3.5; } }
      else if (d.phase === 'hook'){ d.t -= dt; d.v = swing(d, dt, 1.3); actUi('اسحب! دوس في الأخضر', d.v, d.zone); if (d.t <= 0){ banner('السمكة هربت', 'bad', 1.4); d.n++; d.phase = d.n >= 5 ? 'done' : 'cast'; } }
      if (d.phase === 'done'){ const sum = d.got.reduce((s, f) => s + f[1], 0); hero.money += sum; stat('fish', d.got.length); return actEnd(`طلّعت ${d.got.length} من ٥ · +${sum} جنيه`, d.got.length ? 'ok' : 'info'); }
    },
    action(d){ if (d.phase === 'cast') return { text: 'ارمي السنارة', fn: () => { d.phase = 'wait'; d.t = R(1.5, 4); noise(.1, 800, .2); } }; if (d.phase === 'hook') return { text: 'اسحب!', fn: () => { if (inZone(d.v, d.zone)){ const f = rpick(FISH); d.got.push(f); banner(`${f[0]}${f[1] ? ' +' + f[1] : ''}`, 'ok', 1.6); coin(); } else banner('بدري أوي… السمكة فلتت', 'bad', 1.4); d.n++; d.phase = d.n >= 5 ? 'done' : 'cast'; } }; return null; },
    hud: d => `رمية ${Math.min(d.n + 1, 5)} من ٥ · طلّعت ${d.got.length}<br>${d.got.map(f => f[0].split(' ')[0]).join(' ')}` },
  kite: { pos: AV(-29.4, .15, 88.8), r: 2.2, label: 'اطلع السطح وطيّر طيارة ورق',
    start(d){ d.t = 35; d.v = .5; d.in = 0; d.wind = 0; hero.locked = true; kiteShow(true); KITE.g.position.copy(AV(-24, 17, 72)); SCENE.lockY = true; hero.pos.copy(AV(-24.5, 10.2, 79.5)); banner('خلّي الطيارة في الأخضر: دوس تشد الخيط', 'info', 3); },
    update(dt, d, t){
      ACT.cam = { p: AV(-30, 13.5, 86), l: AV(-24, 14, 74) }; hero.pos.copy(AV(-24.5, 10.2, 79.5)); hero.vel.set(0, 0, 0);
      d.t -= dt; d.wind += (Math.sin(t * .9) * .6 + Math.sin(t * 2.3) * .4 - d.wind) * dt; d.v = clamp(d.v - dt * (.18 + d.wind * .12), 0, 1);
      if (inZone(d.v, [.45, .8])) d.in += dt; KITE.g.position.y = 12 + d.v * 10; actUi(`الطيارة في الهوا… ${Math.round(d.in)} ثانية في الأخضر`, d.v, [.45, .8]);
      if (d.v <= 0){ return actEnd('الطيارة وقعت على سطح الجيران', 'bad'); }
      if (d.t <= 0){ const pay = Math.round(d.in * 2); hero.money += pay; if (d.in > 25) stat('kite'); return actEnd(`طيّرتها ${Math.round(d.in)} ثانية في العالي · +${pay} جنيه`, 'ok'); }
    },
    action(d){ return { text: 'شد الخيط', fn: () => { d.v = Math.min(1, d.v + .09); } }; },
    hud: d => `فاضل ${Math.max(0, Math.ceil(d.t))} ثانية · شد الخيط وخليها في الأخضر`,
    end(){ kiteShow(false); SCENE.lockY = false; heroTo2(-29.4, 89.4); } },
  arm: { pos: AV(13.6, .15, 33.6), r: 2, label: 'مصارعة إيد مع كريم على الترابيزة',
    start(d){ d.v = .5; d.t = 0; hero.locked = true; helperShow(12, 31.4, 0, 'كريم'); say(helper, 'هات إيدك يا طيارة', 2); banner('دوس بسرعة عشان تكسب', 'info', 2.5); },
    update(dt, d){ ACT.cam = { p: AV(16.5, 2.4, 35.5), l: AV(12.5, 1, 32) }; d.t += dt; d.v = clamp(d.v - dt * (.22 + d.t * .012), 0, 1); actUi('اضغط بسرعة!', d.v, [.85, 1]);
      if (d.v >= 1){ hero.money += 20; stat('arm'); heroCheer(); say(helper, 'إيدك حديد يا جدع!', 2.2); return actEnd('كسبت كريم! +٢٠ جنيه', 'ok'); }
      if (d.v <= 0){ say(helper, 'روح كُل فول الأول', 2.2); return actEnd('كريم كسبك…', 'bad'); } },
    action(d){ return { text: 'اضغط!', fn: () => { d.v = Math.min(1, d.v + .055); buzz(8); } }; },
    hud: () => 'مصارعة إيد: دوس بسرعة لحد ما توصل للأخضر',
    end(){ helperHide(); } },
  gym: { pos: AV(196, .15, -9.6), r: 2.4, label: 'جيم الأبطال: اتمرّن (١٠ جنيه)',
    start(d){ if (hero.money < 10){ actEnd('محتاج ١٠ جنيه للجيم', 'bad'); return; } hero.money -= 10; d.reps = 0; d.miss = 0; d.k = 0; hero.locked = true; banner('دوس لما المؤشر يبقى في الأخضر', 'info', 2.5); },
    update(dt, d){ if (d.reps === undefined) return; d.v = swing(d, dt, 1.4 + d.reps * .12); actUi(`عدّة ${d.reps}/10`, d.v, [.42, .62]);
      if (d.reps >= 10){ const fit = Math.min(5, (+store.get('ty_fit') || 0) + 1); store.set('ty_fit', String(fit)); stat('gym'); heroCheer(); return actEnd(`١٠ عدّات! نَفَسك بقى أطول (لياقة ${fit}/5)`, 'ok'); }
      if (d.miss >= 3) return actEnd('تعبت… كفاية النهارده', 'info'); },
    action(d){ return { text: 'ارفع!', fn: () => { if (inZone(d.v, [.42, .62])){ d.reps++; hero.cheerT = .5; noise(.1, 500, .2); } else { d.miss++; banner('تقيلة…', 'bad', .8); } } }; },
    hud: d => `ارفع ١٠ مرات في الأخضر · غلط ${d.miss || 0}/3` },
  play: { pos: AV(163.5, .15, 40.6), r: 2.2, label: 'بلايستيشن: ماتش فيفا (٥ جنيه)',
    start(d){ if (hero.money < 5){ actEnd('محتاج ٥ جنيه', 'bad'); return; } hero.money -= 5; d.me = 0; d.him = 0; d.shot = 0; d.k = 0; hero.locked = true; banner('خمس شوطات… دوس في الأخضر عشان تجيب جون', 'info', 2.5); },
    update(dt, d){ if (d.shot === undefined) return; const z = [.4 - d.shot * .02, .58 - d.shot * .03]; d.v = swing(d, dt, 1.5 + d.shot * .2); d.z = z; actUi(`أنت ${d.me} - ${d.him} الكمبيوتر`, d.v, z);
      if (d.shot >= 5){ const win = d.me > d.him; if (win){ hero.money += 15; stat('fifa'); } return actEnd(win ? `كسبت ${d.me}-${d.him}! +١٥ جنيه` : `خسرت ${d.me}-${d.him}`, win ? 'ok' : 'bad'); } },
    action(d){ return { text: 'شوط!', fn: () => { if (inZone(d.v, d.z)){ d.me++; banner('جووول', 'ok', .9); } else banner('برا', 'bad', .9); if (Math.random() < .45) d.him++; d.shot++; } }; },
    hud: d => `فيفا · شوطة ${Math.min((d.shot || 0) + 1, 5)} من ٥` },
  ferris: { pos: AV(WHEEL.x + 3.2, .15, WHEEL.z + 2.6), r: 2.4, label: 'اركب الملاهي (١٠ جنيه)',
    start(d){ if (hero.money < 10){ actEnd('محتاج ١٠ جنيه', 'bad'); return; } hero.money -= 10; d.t = 0; hero.locked = true; SCENE.hideHero = true; banner('بص على إسكندرية من فوق', 'ok', 2.5); },
    update(dt, d){ if (d.t === undefined) return; d.t += dt; const a = d.t * .35, r = WHEEL.r, cx = WHEEL.x, cy = WHEEL.r + 2.4;
      const p = AV(cx + Math.sin(-a) * r, cy - Math.cos(-a) * r + 1.4, WHEEL.z + .9); ACT.cam = { p, l: AV(cx + 40 * Math.sin(d.t * .1), 2, WHEEL.z + 60) }; actUi('الملاهي', (d.t / 18) % 1);
      if (d.t > 18) return actEnd('أحلى منظر في إسكندرية', 'ok'); },
    hud: () => 'فوق في السما… استمتع بالمنظر', end(){ SCENE.hideHero = false; } },
  souq: { pos: AV(120, .15, -50.4), r: 2.4, label: 'سوق الجمعة: فاصل واشتري',
    start(d){ const it = rpick([['راديو قديم', 60], ['ساعة ماركة (؟)', 90], ['جاكت جلد', 120], ['عود', 150], ['كاميرا قديمة', 100]]); d.item = it[0]; d.ask = Math.round(it[1] * R(1.3, 1.7)); d.min = Math.round(it[1] * R(.7, .95)); d.worth = Math.round(it[1] * R(.9, 1.4)); d.round = 0; hero.locked = true; helperShow(120, -52.6, 0, 'البيّاع'); souqPanel(d); },
    update(){}, hud: d => `${d.item || ''} · البيّاع عايز ${d.ask || 0} جنيه`, end(){ helperHide(); if (!$('shop').hidden) closePanel(); } },
  hantour: { pos: AV(HANTOUR.x0 + 2.4, .15, HANTOUR.z - 2.6), r: 2.6, label: 'حنطور على الكورنيش (٢٠ جنيه)',
    start(d){ if (hero.money < 20){ actEnd('محتاج ٢٠ جنيه', 'bad'); return; } hero.money -= 20; d.t = 0; hero.locked = true; SCENE.hideHero = true; banner('لفّة على الكورنيش', 'ok', 2.5); },
    update(dt, d, t){ if (d.t === undefined) return; d.t += dt; const k = Math.min(1, d.t / 30), x = HANTOUR.x0 + (HANTOUR.x1 - HANTOUR.x0) * k; HANTOUR.g.position.x = x; HANTOUR.g.position.y = Math.abs(Math.sin(t * 6)) * .04;
      if (Math.random() < dt * 1.5) noise(.05, 700, .15); ACT.cam = { p: AV(x - 7, 3.2, HANTOUR.z - 5), l: AV(x + 10, 1.5, HANTOUR.z + 8) };
      if (k >= 1){ hero.pos.set(x, .15, HANTOUR.z - 3); return actEnd('لفة حلوة على الكورنيش', 'ok'); } },
    hud: () => 'الحنطور ماشي على الكورنيش…', end(){ SCENE.hideHero = false; HANTOUR.g.position.set(HANTOUR.x0, 0, HANTOUR.z); } },
  keepie: { pos: AV(6, .15, 44), r: 2.2, label: 'كورة شراب: نطّط الكورة',
    start(d){ d.n = 0; d.k = 0; hero.locked = true; ball.visible = true; banner('دوس لما الكورة تبقى في الأخضر', 'info', 2.5); },
    update(dt, d){ d.v = swing(d, dt, 1.2 + d.n * .08); ball.position.set(hero.pos.x + .4, .3 + (1 - d.v) * 1.6, hero.pos.z + .4); actUi(`نطّة ${d.n}`, d.v, [.8, 1]);
      ACT.cam = { p: new THREE.Vector3(hero.pos.x + 3, 2, hero.pos.z + 4), l: new THREE.Vector3(hero.pos.x, 1, hero.pos.z) }; },
    action(d){ return { text: 'نطّط', fn: () => { if (d.v >= .8){ d.n++; d.k = 0; noise(.05, 1500, .2); } else { const rec = bestOf('keepie', d.n) ? ' · رقم قياسي!' : ''; hero.money += d.n; actEnd(`نطّطتها ${d.n} مرة · +${d.n} جنيه${rec}`, d.n >= 10 ? 'ok' : 'info'); } } }; },
    hud: d => `نطّطت ${d.n} · أحسن رقم ${PROG.best.keepie || 0}`, end(){ ball.visible = false; } },
  taxi: { pos: AV(78, .15, 141.6), r: 3, label: 'اشتغل على التاكسي', start(){ ACT.kind = null; ACT.d = null; $('actQuit').hidden = true; startPaxJob('taxi'); }, update(){} },
  micro: { pos: AV(114, .15, -2.6), r: 3, label: 'اشتغل على الميكروباص', start(){ ACT.kind = null; ACT.d = null; $('actQuit').hidden = true; startPaxJob('micro'); }, update(){} },
});
function souqPanel(d){
  const offers = [Math.round(d.ask * .5), Math.round(d.ask * .75), d.ask];
  openPanel(`${d.item}`, [
    ...offers.slice(0, 2).map(o => ({ label: `«آخر كلام… ${o} جنيه؟»`, btn: `${o} ج`, fn: () => souqOffer(d, o) })),
    { label: `موافق على ${d.ask} جنيه`, btn: 'اشتري', dim: hero.money < d.ask, fn: () => souqOffer(d, d.ask) },
    { label: 'مش عايز', btn: 'امشي', fn: () => { closePanel(); actEnd('مشيت من غير ما تشتري', 'info'); } },
  ], `البيّاع: «${d.round ? 'خلاص… ' : ''}${d.ask} جنيه وده آخر سعر»`);
}
function souqOffer(d, o){
  if (hero.money < o){ $('shopMoney').textContent = 'معاكش الفلوس دي'; return; }
  if (o >= d.min || o >= d.ask){ closePanel(); hero.money -= o; const gain = d.worth - o; hero.money += d.worth; coin(); if (gain > 0) stat('souq'); say(helper, 'مبروك عليك… كسبتها', 2); return actEnd(`اشتريتها بـ ${o} وبعتها بـ ${d.worth} · ${gain >= 0 ? 'كسبت' : 'خسرت'} ${Math.abs(gain)} جنيه`, gain >= 0 ? 'ok' : 'bad'); }
  d.round++; if (d.round >= 3){ closePanel(); say(helper, 'ربنا يسهلك… مش هبيع', 2); return actEnd('البيّاع زهق ومشّاك', 'bad'); }
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
  if (NAWA.left > 0){ NAWA.left -= dt; if (NAWA.left <= 0){ setRain(false); banner('النوّة خلصت', 'info', 2); NAWA.t = R(300, 600); } return; }
  NAWA.t -= dt; if (NAWA.t <= 0){ NAWA.left = R(70, 120); setRain(true); banner('نوّة! البحر عالي والمطر نازل', 'info', 3); }
}

// ---------------- first-time tips, and buttons that show only when they do something ----------------
const TUT = [
  { el: () => isTouch ? $('joyHint') : null, at: 'left', text: () => isTouch ? 'اسحب بصباعك هنا عشان تمشي. ولو سحبت لآخره هتجري.' : 'امشي بـ WASD، واجري بـ Shift.' },
  { el: () => $('actBtn'), text: () => isTouch ? 'ده زرار: تركب، تتكلم، تدخل المحلات… بيظهر لما يبقى فيه حاجة تتعمل.' : 'زرار E: تركب، تتكلم، تدخل المحلات.' },
  { el: () => $('punchBtn'), text: () => 'تضرب. وجنبه زرار السلاح… الشبشب أول سلاح' },
  { el: () => $('phoneBtn'), text: () => 'موبايل طيارة: خريطة بالـ GPS، ومهماتك، والأسامي اللي تعرفهم.' },
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
  ownT -= dt; if (ownT <= 0){ ownT = 1; if (WEAP.cur !== 'none' && WEAP.cur !== WEAP.picked && !weaponsOwned().includes(WEAP.cur)) setWeapon('none', true); } updateGps(dt); updateNawa(dt); updateContextButtons(dt);
  if (WHEEL.g){ WHEEL.g.userData.wheel.rotation.z = t * .35; WHEEL.g.userData.cabs.forEach((c, i) => { const a = t * .35 + i / 8 * Math.PI * 2; c.position.set(Math.sin(-a) * WHEEL.r, -Math.cos(-a) * WHEEL.r - .7, .9); }); }
  const show = (modeId === 'free' || modeId === 'story') && !CUT.on; for (const s of actSigns) s.visible = show;
  if (state === 'play' && !CUT.on && TUTS.i === -1 && (modeId === 'story' || modeId === 'free') && runTime > 1.5 && store.get('ty_tut') !== '1') tutStart();
}
