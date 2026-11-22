// ================= story: طيارة الجامد =================
const STORY_KEY = 'ty_story_v1';
const newStory = () => ({ money: 20, rep: 0, step: 0, owned: { moto: false, car: false }, acc: {}, wear: {}, up: {}, cnt: {}, ended: false });
function loadStory(){ try { const s = JSON.parse(store.get(STORY_KEY) || 'null'); if (s && typeof s.step === 'number'){ const d = newStory(); return { ...d, ...s, owned: { ...d.owned, ...s.owned }, acc: s.acc || {}, wear: s.wear || {}, up: s.up || {}, cnt: s.cnt || {} }; } } catch(e){} return newStory(); }
let SAVE = loadStory();
function saveStory(){ if (modeId === 'story') SAVE.money = Math.max(0, Math.round(hero.money)); store.set(STORY_KEY, JSON.stringify(SAVE)); }
const trayCap = () => SAVE.up.tray4 ? 4 : 3;
const SHOP = { pos: new THREE.Vector3(7.7, .15, 30), name: 'محل الأناقة', items: [
  { id: 'glasses', kind: 'acc', name: '🕶️ نضارة شمس', price: 120 },
  { id: 'cap', kind: 'acc', name: '🧢 كاب', price: 90 },
  { id: 'chain', kind: 'acc', name: '📿 سلسلة دهب', price: 250 },
  { id: 'watch', kind: 'acc', name: '⌚ ساعة', price: 180 },
  { id: 'tray4', kind: 'up', name: '🍽️ صينية كبيرة (٤ طلبات)', price: 150 },
  { id: 'fastpour', kind: 'up', name: '⚡ براد أسرع في الصب', price: 100 },
] };
const PRICE = { moto: 300, car: 1500 };
// shop sign + markers
{
  const tex = makeTex(512,160,(g,w,h)=>{ g.fillStyle='#2a1b3d'; g.fillRect(0,0,w,h); g.strokeStyle='#f0c24a'; g.lineWidth=8; g.strokeRect(6,6,w-12,h-12); arText(g,'محل الأناقة',w/2,62,64,'#ffe08a'); arText(g,'نضارات · ساعات · سلاسل',w/2,122,30,'#e9dcff',700); });
  const sg = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,2.4,8), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: .6 })); pole.position.y = 1.2; const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2,.7), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .25, side: THREE.DoubleSide })); board.position.y = 2.5; sg.add(pole, board); sg.position.copy(SHOP.pos); sg.position.x -= .6; scene.add(sg);
}
const priceTag = (txt) => { const t = makeTex(256,96,(g,w,h)=>{ g.fillStyle='#fff3c4'; g.fillRect(0,0,w,h); g.strokeStyle='#b4431f'; g.lineWidth=6; g.strokeRect(3,3,w-6,h-6); arText(g,txt,w/2,h/2+3,38,'#7a1f0e'); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true })); s.scale.set(1.7,.64,1); scene.add(s); return s; };
const motoTag = priceTag('للبيع ٣٠٠ جنيه'), carTag = priceTag('للبيع ١٥٠٠ جنيه');
const missionMark = new THREE.Group(); { const b = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); b.scale.set(1.3,1.4,1.3); const r = new THREE.Mesh(new THREE.RingGeometry(1.1,1.4,40), new THREE.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: .7, depthWrite: false, side: THREE.DoubleSide })); r.rotation.x = -Math.PI/2; r.position.y = .25; missionMark.add(b, r); missionMark.visible = false; scene.add(missionMark); }
const race = { active: false, t: 0, goal: new THREE.Vector3(-48, 0, -96) };
const ENEMY_WAIT = new THREE.Vector3(28, .15, 40.2);
// accessories drawn on top of the hero photo
const ACC = {};
{
  const d = hero.d, S = d.S, c = d.c;
  const plane = (tex, cx, cy, w, h, key, order=13) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w*S, h*S), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .05, side: THREE.DoubleSide, toneMapped: false })); m.renderOrder = order; const piv = key ? c.piv[key] : [c.FX, c.FY]; m.position.set((cx - piv[0])*S, (piv[1] - cy)*S, .035); (key ? d.P[key] : d.P.body).add(m); m.visible = false; return m; };
  const tx = (w,h,draw) => { const t = makeTex(w,h,draw); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
  ACC.glasses = plane(tx(256,90,(g,w,h)=>{ const lens = x => { const gr = g.createLinearGradient(x,10,x+20,80); gr.addColorStop(0,'#3a4a5a'); gr.addColorStop(1,'#05070a'); g.fillStyle = gr; g.beginPath(); g.roundRect(x,14,100,62,26); g.fill(); g.strokeStyle='#111'; g.lineWidth=7; g.stroke(); g.fillStyle='rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(x+30,32,18,7,-.4,0,7); g.fill(); }; lens(8); lens(148); g.strokeStyle='#111'; g.lineWidth=8; g.beginPath(); g.moveTo(108,34); g.quadraticCurveTo(128,22,148,34); g.stroke(); }), 512, 136, 168, 58);
  ACC.cap = plane(tx(256,160,(g,w,h)=>{ g.fillStyle='#c0392b'; g.beginPath(); g.ellipse(128,112,108,98,0,Math.PI,0); g.fill(); g.fillStyle='#a93226'; g.beginPath(); g.ellipse(128,118,124,20,0,0,Math.PI*2); g.fill(); g.strokeStyle='rgba(0,0,0,.25)'; g.lineWidth=3; g.beginPath(); g.moveTo(128,14); g.lineTo(128,110); g.stroke(); g.fillStyle='#fff'; g.font='900 46px Georgia'; g.textAlign='center'; g.fillText('T',128,92); }), 507, 52, 200, 124);
  ACC.chain = plane(tx(256,128,(g,w,h)=>{ g.strokeStyle='#e3b23c'; g.lineWidth=7; g.setLineDash([9,5]); g.beginPath(); g.moveTo(14,12); g.quadraticCurveTo(128,150,242,12); g.stroke(); g.setLineDash([]); g.fillStyle='#f6c945'; g.beginPath(); g.arc(128,92,15,0,7); g.fill(); g.strokeStyle='#a87a12'; g.lineWidth=3; g.stroke(); }), 512, 282, 128, 64);
  ACC.watch = plane(tx(64,64,(g)=>{ g.fillStyle='#1a1a1a'; g.fillRect(18,0,28,64); g.fillStyle='#d4a62a'; g.beginPath(); g.arc(32,32,18,0,7); g.fill(); g.fillStyle='#fffbe8'; g.beginPath(); g.arc(32,32,13,0,7); g.fill(); g.strokeStyle='#222'; g.lineWidth=2; g.beginPath(); g.moveTo(32,32); g.lineTo(32,22); g.moveTo(32,32); g.lineTo(39,35); g.stroke(); }), 122, 782, 46, 46, 'armL');
}
function applyAccessories(){ for (const k of Object.keys(ACC)) ACC[k].visible = !!(SAVE.acc[k] && SAVE.wear[k] !== false); }
applyAccessories();
// shop overlay
function openShop(){
  hero.locked = true; $('shop').hidden = false; renderShop();
}
function renderShop(){
  $('shopTitle').textContent = SHOP.name; $('shopMoney').textContent = `معاك ${egp(hero.money)}`;
  $('shopItems').innerHTML = SHOP.items.map(it => {
    const own = it.kind === 'acc' ? SAVE.acc[it.id] : SAVE.up[it.id];
    const wear = own && it.kind === 'acc' && SAVE.wear[it.id] !== false;
    const btn = !own ? `<button data-buy="${it.id}" ${hero.money < it.price ? 'class="poor"' : ''}>اشتري · ${it.price} ج</button>` : it.kind === 'acc' ? `<button data-wear="${it.id}">${wear ? 'اقلعها' : 'البسها'}</button>` : '<span class="owned">✓ عندك</span>';
    return `<div class="sitem"><span>${it.name}</span>${btn}</div>`;
  }).join('');
  $('shopItems').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const it = SHOP.items.find(i => i.id === b.dataset.buy); if (hero.money < it.price){ $('shopMoney').textContent = `محتاج ${egp(it.price - hero.money)} كمان`; buzz(40); return; } hero.money -= it.price; (it.kind === 'acc' ? SAVE.acc : SAVE.up)[it.id] = true; if (it.kind === 'acc') SAVE.wear[it.id] = true; coin(); buzz(20); applyAccessories(); saveStory(); renderShop(); });
  $('shopItems').querySelectorAll('[data-wear]').forEach(b => b.onclick = () => { const id = b.dataset.wear; SAVE.wear[id] = SAVE.wear[id] === false; applyAccessories(); saveStory(); renderShop(); });
}
$('shopClose').onclick = () => { $('shop').hidden = true; hero.locked = false; };
function buyVehicle(kind){
  const p = PRICE[kind]; if (hero.money < p){ banner(`محتاج ${egp(p - hero.money)} كمان… اشتغل في القهوة أو الفول`, 'bad', 2.5); buzz(40); return; }
  hero.money -= p; SAVE.owned[kind] = true; saveStory(); coin(); buzz(30);
  banner(kind === 'moto' ? '🏍️ الموتوسيكل بقى بتاعك!' : '🚗 العربية بقت بتاعتك!', 'ok', 3);
}
// missions
const MISSIONS = [
  { title: 'أول يوم شغل', text: s => `روح قهوة قصر الملوك (☕) واشتغل وردية: وصّل ٥ طلبات. (${Math.min(s.cnt.ahwa||0,5)}/٥)`, target: () => SPOT.counter, done: s => (s.cnt.ahwa||0) >= 5, reward: 40, onStart: s => { s.cnt.ahwa = 0; } },
  { title: 'عم سيد عايزك', text: () => 'اقعد على ترابيزة الدومنو واكسب ماتش مع عم سيد. الرهان ٢٠ جنيه.', target: () => SPOT.domino, done: s => (s.cnt.dom||0) >= 1, reward: 30, onStart: s => { s.cnt.dom = 0; } },
  { title: 'الموتوسيكل', text: () => `الموتوسيكل الأحمر للبيع بـ ٣٠٠ جنيه قدام القهوة. اشتغل في القهوة أو على عربية الفول لحد ما تحوّش. (${egp(hero.money)} / ٣٠٠)`, target: () => heroMoto.pos, done: s => s.owned.moto, reward: 0 },
  { title: 'سباق', text: () => race.active ? `سوق على العلامة الصفرا! فاضل ${Math.ceil(race.t)} ثانية` : 'اللي بيكرهك واقف جنب الموتوسيكلات وعايز سباق. اركب الموتوسيكل وروحله (E).', target: () => race.active ? race.goal : enemy.pos, done: s => (s.cnt.race||0) >= 1, reward: 80, onStart: s => { s.cnt.race = 0; enemyWait(); } },
  { title: 'رد الاعتبار', text: () => 'اللي بيكرهك بيقول عليك خسيس في الحتة… وقّعه في خناقة.', target: () => enemy.pos, done: s => (s.cnt.edown||0) >= 1, reward: 60, onStart: s => { s.cnt.edown = 0; enemyFree(); } },
  { title: 'المطلوب في الحتة', text: () => 'المطلوب اتشاف في الحتة والمكافأة ١٠٠٠ جنيه! دوّر عليه (النقطة الحمرا) وامسكه.', target: () => wanted.pos, done: s => (s.cnt.arrest||0) >= 1, reward: 1000, onStart: s => { s.cnt.arrest = 0; spawnWanted(); } },
  { title: 'العربية', text: () => `العربية الصفرا للبيع بـ ١٥٠٠ جنيه قدام القهوة. (${egp(hero.money)} / ١٥٠٠)`, target: () => heroCar.pos, done: s => s.owned.car, reward: 0 },
  { title: 'الأستايل', text: s => `روح محل الأناقة واشتري نضارة وسلسلة دهب. (${(s.acc.glasses?1:0)+(s.acc.chain?1:0)}/٢)`, target: () => SHOP.pos, done: s => s.acc.glasses && s.acc.chain, reward: 0 },
  { title: 'المواجهة الأخيرة', text: s => `اللي بيكرهك جاي ومعاه كلام كبير. وقّعه مرتين. (${Math.min(s.cnt.fdown||0,2)}/٢)`, target: () => enemy.pos, done: s => (s.cnt.fdown||0) >= 2, reward: 300, onStart: s => { s.cnt.fdown = 0; enemyBoss(true); } },
];
function curMission(){ return MISSIONS[SAVE.step] || null; }
function enemyWait(){ enemy.active = true; enemy.d.root.visible = true; enemy.state = 'wait'; enemy.pos.copy(ENEMY_WAIT); enemy.d.downT = 0; }
function enemyFree(){ if (enemy.state === 'wait') enemy.state = 'roam'; enemy.cd = 3; }
function enemyBoss(on){ enemy.boss = on; enemy.maxHp = on ? 160 : 100; enemy.hp = enemy.maxHp; if (on){ enemy.state = 'roam'; enemy.cd = 2; banner('⚠️ المواجهة الأخيرة!', 'bad', 3); } }
function completeMission(){
  const M = curMission(); if (!M) return;
  if (M.reward){ hero.money += M.reward; }
  SAVE.rep += 10; SAVE.step++; coin(); buzz(40);
  banner(`✅ ${M.title}${M.reward ? ' · +' + M.reward + ' جنيه' : ''}`, 'ok', 3.5);
  const N = curMission();
  if (N){ N.onStart && N.onStart(SAVE); setTimeout(() => { if (modeId === 'story' && state === 'play') banner(`📱 مهمة جديدة: ${N.title}`, 'info', 3); }, 3600); }
  else { enemyBoss(false); enemy.cd = 9999; enemy.state = 'roam'; SAVE.ended = true; setTimeout(showStoryEnd, 1500); }
  saveStory();
}
function showStoryEnd(){ if (modeId !== 'story') return; hero.locked = true; $('storyEnd').hidden = false; tone(523,523,.15,'triangle',.2); tone(659,659,.15,'triangle',.2,.15); tone(784,1046,.5,'triangle',.22,.3); }
$('storyEndBtn').onclick = () => { $('storyEnd').hidden = true; hero.locked = false; };
// jobs inside the story
function startJob(kind){
  const m = modeObj; m.job = kind; m.served = 0; m.angry = 0; m.earned = 0; m.combo = 0; m.lastServe = -99;
  if (kind === 'ahwa'){ m.time = 150; m.tray = []; m.spawnT = .5; m.seatsTaken = new Set(); m.patrons.forEach(n => { n.state = 'hidden'; n.g.visible = false; n.leaving = false; n.seat = undefined; n.order = null; }); resetAhwaStation(); refreshTray(); banner('☕ الوردية بدأت! (دقيقتين ونص)', 'info', 2.5); }
  if (kind === 'foul'){ m.time = 150; m.queue = []; m.spawnT = 1; m.pool.forEach(n => { n.state = 'hidden'; n.g.visible = false; }); FL.fry.forEach(f => f.mesh.parent && f.mesh.parent.remove(f.mesh)); Object.assign(FL, { fry: [], sF: [], sP: [], sand: null, bag: [] }); foulVisual(); hero.pos.copy(SPOT.cartHero); hero.pos.y = .15; enterStation('foul'); }
}
function endJob(fail){
  const m = modeObj; const kind = m.job; if (!kind) return;
  m.job = null; m.time = undefined; exitStation(true);
  if (kind === 'ahwa'){ m.patrons.forEach(n => { if (n.bubble){ removeBubble(n.bubble); n.bubble = null; } if (n.glass){ scene.remove(n.glass); n.glass = null; } if (n.state !== 'hidden'){ n.order = null; leaveSeat(n); } }); m.tray = []; refreshTray(); }
  if (kind === 'foul'){ (m.queue||[]).forEach(c => { c.n.state = 'goto'; c.n.tx = SPOT.cart.x + 10; c.n.tz = SPOT.cart.z + 8; c.n.onArrive = n2 => { n2.state = 'hidden'; n2.g.visible = false; }; }); m.queue = []; hero.pos.set(SPOT.cart.x, .15, SPOT.cart.z + 2); }
  banner(fail ? `المعلم مشّاك من الشغل 😬 · كسبت ${egp(m.earned)}` : `خلصت الشغل 👏 · كسبت ${egp(m.earned)}`, fail ? 'bad' : 'ok', 3.5);
  saveStory();
}
function storyAction(){
  const p = hero.pos, m = modeObj;
  if (p.distanceTo(SHOP.pos) < 2.6) return { text: 'ادخل محل الأناقة', fn: openShop };
  for (const [v, kind] of [[heroMoto,'moto'],[heroCar,'car']]) if (!SAVE.owned[kind] && Math.hypot(v.pos.x-p.x, v.pos.z-p.z) < 3.2) return { text: `اشتري ${kind === 'moto' ? 'الموتوسيكل' : 'العربية'} (${PRICE[kind]} جنيه)`, fn: () => buyVehicle(kind) };
  if (enemy.state === 'wait' && p.distanceTo(enemy.pos) < 3) return { text: 'اركب الموتوسيكل الأول عشان السباق', fn: () => say(enemy, 'هتسابق برجليك؟ هاهاها', 2, 'angry') };
  if (m.job === 'ahwa'){
    if (p.distanceTo(SPOT.counter) < 2.6) return { text: 'ادخل النَصبة وحضّر الطلبات', fn: () => enterStation('ahwa') };
    const c = m.patrons.find(n => n.state === 'customer' && n.order && Math.hypot(n.g.position.x-p.x, n.g.position.z-p.z) < 2);
    if (c) return { text: `قدّم ${c.order.drink} ${c.order.sugar} لـ ${c.name}`, fn: () => serveAhwa(c) };
    return null;
  }
  if (m.job === 'foul' && Math.hypot(p.x-SPOT.cart.x, p.z-SPOT.cart.z) < 2.8) return { text: 'ارجع لعربية الفول', fn: () => enterStation('foul') };
  if (!m.job){
    if (p.distanceTo(SPOT.counter) < 2.6) return { text: 'اشتغل وردية قهوجي ☕', fn: () => startJob('ahwa') };
    if (Math.hypot(p.x-SPOT.cart.x, p.z-SPOT.cart.z) < 2.8) return { text: 'اشتغل على عربية الفول 🧆', fn: () => startJob('foul') };
  }
  return null;
}
function storyVehAction(){
  const M = curMission();
  if (M && M.title === 'سباق' && !race.active && hero.veh && hero.veh.pos.distanceTo(enemy.pos) < 9) return { text: '🏁 ابدأ السباق', fn: startRace };
  return null;
}
function startRace(){ race.active = true; race.t = 40*DIFF.race; say(enemy, 'هتاكل تراب!', 2.5, 'angry'); banner('🏁 يلا! وصل للعلامة الصفرا قبل ما الوقت يخلص', 'info', 3); tone(440,440,.15,'square',.08); tone(440,440,.15,'square',.08,.5); tone(880,880,.3,'square',.1,1); }
function updateStory(dt){
  const m = modeObj;
  motoTag.visible = !SAVE.owned.moto; carTag.visible = !SAVE.owned.car;
  motoTag.position.set(heroMoto.pos.x, 2.1, heroMoto.pos.z); carTag.position.set(heroCar.pos.x, 2.6, heroCar.pos.z);
  if (race.active){
    race.t -= dt;
    const f = hero.veh ? hero.veh.pos : hero.pos;
    if (Math.hypot(f.x - race.goal.x, f.z - race.goal.z) < 8){ race.active = false; SAVE.cnt.race = 1; banner('🏆 سبقته!', 'ok', 3); enemyFree(); enemy.pos.copy(randomSidewalkPoint(10, race.goal)); say(enemy, 'ماشي… المرة الجاية', 2.5, 'angry'); }
    else if (race.t <= 0){ race.active = false; banner('⏱️ خسرت السباق… ارجعله وجرّب تاني', 'bad', 3); enemyWait(); }
  }
  const M = curMission();
  if (M && !m.job && M.done(SAVE)) completeMission();
  // mission marker
  const tgt = M && M.target ? M.target() : null;
  missionMark.visible = !!tgt && !ST.kind && !(M.title === 'المطلوب في الحتة' && wanted.caught);
  if (tgt){ missionMark.position.set(tgt.x, 0, tgt.z); missionMark.children[1].rotation.z += dt; missionMark.scale.setScalar(race.active ? 2.2 : 1); }
  m.saveT = (m.saveT || 0) - dt; if (m.saveT <= 0){ m.saveT = 5; saveStory(); }
}
function storyHudTitle(){ const m = modeObj; if (m.job === 'ahwa') return 'وردية قهوجي ☕'; if (m.job === 'foul') return 'شغل الفول 🧆'; const M = curMission(); return M ? `📱 ${M.title}` : 'طيارة الجامد 👑'; }
function storyHud(){
  const m = modeObj, M = curMission();
  if (m.job) return `الوقت: <b style="display:inline;color:#fff">${fmtTime(m.time||0)}</b> · بعت: ${m.served} · زعلانين: <b style="display:inline;color:#ff9a9a">${m.angry}/٣</b><br>كسبت: ${egp(m.earned)}${m.job === 'ahwa' ? '<br>روح النَصبة (E) ووزّع على الزباين.' : ''}`;
  if (!M) return 'خلصت القصة! لف في الحتة براحتك واشتغل والعب دومنو.';
  return M.text(SAVE) + `<br><small style="color:#c2b7a3">السمعة: ${SAVE.rep} ⭐</small>`;
}

function resetWorld(){
  clearBubbles();
  vehicles.forEach(v => { v.pos.set(v.home.x, v.home.y||0, v.home.z); v.yaw = v.home.yaw; v.mesh.rotation.set(0, v.yaw, 0); v.speed = 0; v.dmg = 0; v.broke = false; });
  seatIslam(false); thiefReset();
  motoTag.visible = carTag.visible = false; missionMark.visible = false; race.active = false; enemy.boss = false; enemy.maxHp = 100; $('shop').hidden = true; $('storyEnd').hidden = true;
  npcs.forEach(n => { n.state = 'hidden'; n.g.visible = false; n.role = null; n.onArrive = null; });
  let i = 0;
  for (; i<WALKERS; i++) setWalker(npcs[i]);
  enemy.active = false; enemy.d.root.visible = false; wanted.active = false; wanted.d.root.visible = false;
  chaser.active = false; chaserCar.visible = false; chaserLight.intensity = 0; if (sirenGain) sirenGain.gain.value = 0;
  cash.forEach(c => { c.g.visible = false; c.taken = false; });
  copCar.mesh.userData.red.emissiveIntensity = .3; copCar.mesh.userData.blue.emissiveIntensity = .3;
  hero.veh = null; hero.locked = false; hero.hp = 100; hero.stamina = 1; hero.tired = false; hero.inv = 0; hero.knock.set(0,0,0); hero.vel.set(0,0,0);
  hero.d.root.visible = true; hero.d.doll.visible = true; hero.d.blob.visible = true; hero.d.P.legL.visible = hero.d.P.legR.visible = true; hero.d.downT = 0;
  trayGroup.visible = false; $('tray').hidden = true; exitStation(true);
  decoGlasses.forEach(g => g.visible = true);
  return i;
}
function seatDeco(start){
  // domino friends + café regulars (decor in free modes)
  const a = npcs[start], b = npcs[start+1];
  seatNPC(a, SPOT.domino.x-.85, SPOT.domino.z, Math.PI/2); a.state = 'domino'; a.name = 'عم سيد';
  seatNPC(b, SPOT.domino.x+.85, SPOT.domino.z, -Math.PI/2); b.state = 'hidden'; b.g.visible = false; seatIslam(true);
  let k = start+2; [0,3,5,8,10].forEach(si => { const s = SEATS[si]; seatNPC(npcs[k], s.x, s.z, s.ry); k++; });
  const v = npcs[k]; seatNPC(v, SPOT.cartHero.x, SPOT.cartHero.z, 0); v.state = 'idle'; v.g.position.y = .15; k++;
  return k;
}

function startMode(id){
  initAudio(); if (isTouch && !document.fullscreenElement) goFull();
  heroName = $('nameIn').value.trim() || 'طيارة'; store.set('ty_name', heroName); $('hudName').textContent = heroName;
  modeId = id; runTime = 0; state = 'play';
  $('menu').hidden = true; $('end').hidden = true; $('domino').hidden = true; $('hud').hidden = false;
  const free = resetWorld();
  hero.money = id === 'story' ? SAVE.money : id === 'free' || id === 'domino' ? Math.max(hero.money, 50) : 0;
  const M_ = {
    free: () => { const k = seatDeco(free); void k; spawnEnemy(); hero.pos.copy(SPOT.spawn);
      return { vehicles: true, cafe: true, enemyOn: true, title: 'حر في الحتة',
        hud: () => `اركب الموتوسيكل أو العربية اللي جنب القهوة.<br>${enemy.d.downT > 0 ? 'وقّعته 💪' : enemy.state === 'chase' ? '<b style="color:#ff7a7a;display:inline">اللي بيكرهك جاي عليك!</b>' : 'خلي بالك… فيه واحد بيكرهك في الحتة.'}<br>اشرب شاي أو كُل فلافل عشان صحتك.` }; },
    domino: () => { const r = M_.free(); hero.pos.set(SPOT.domino.x, .15, SPOT.domino.z + 1.6); setTimeout(openDomino, 200); return r; },
    police: () => { seatDeco(free); hero.pos.copy(SPOT.policeSpawn); spawnWanted();
      return { vehicles: true, cafe: false, title: 'ظابط مباحث 🚓', time: 240,
        hud: () => { const d = wanted.pos.distanceTo(hero.veh ? hero.veh.pos : hero.pos); return `اقبض على المطلوب (النقطة الحمرا على الخريطة).<br>المسافة: <b style="display:inline;color:#fff">${Math.round(d)} م</b> · الوقت: <b style="display:inline;color:#fff">${fmtTime(modeObj.time)}</b><br>اخبطه بالبوكس أو اقرب منه واضربه.`; },
        onArrest: () => { const t = 240 - modeObj.time; const best = parseFloat(store.get('ty_best_police')||'0'); let bt=''; if (!best || t < best){ store.set('ty_best_police', String(t)); bt = 'رقم قياسي جديد! 🏆'; } else bt = `أحسن وقت: ${fmtTime(best)}`; coin(); setTimeout(() => endMode('قبضت على المطلوب! 🚔', `الظابط ${heroName} قبض عليه في ${fmtTime(t)}.`, bt), 1200); },
        onTime: () => endMode('المطلوب هرب 😤', 'الوقت خلص قبل ما تقبض عليه. جرّب تاني وخد البوكس على طول.') }; },
    cash: () => { hero.pos.copy(SPOT.spawn); cash.forEach(c => { c.g.visible = true; c.g.scale.setScalar(1); c.g.position.y = 0; });
      return { vehicles: false, cafe: false, title: 'فلوس الشارع 💵', got: 0, money: 0,
        hud: () => `لميت ${modeObj.got} من ١٥ رزمة (${egp(modeObj.money)}).<br>${chaser.active ? '<b style="color:#ff7a7a;display:inline">البوليس وراك!</b>' : 'دوّر على النور الأصفر.'}`,
        onKO: () => endMode('العربيات بهدلتك 🚗', `${heroName} لم ${egp(modeObj.money)} قبل ما يقع.`) }; },
    story: () => {
      hero.money = SAVE.money; const a = npcs[free], b = npcs[free+1];
      seatNPC(a, SPOT.domino.x-.85, SPOT.domino.z, Math.PI/2); a.state = 'domino'; a.name = 'عم سيد';
      seatNPC(b, SPOT.domino.x+.85, SPOT.domino.z, -Math.PI/2); b.state = 'hidden'; b.g.visible = false; seatIslam(true);
      decoGlasses.forEach(g => g.visible = false);
      spawnEnemy(); enemyBoss(false); hero.pos.copy(SPOT.spawn); race.active = false;
      const M = curMission();
      if (!SAVE.started){ SAVE.started = true; if (M && M.onStart) M.onStart(SAVE); }
      if (M && M.title === 'سباق') enemyWait();
      if (M && M.title === 'المطلوب في الحتة') spawnWanted();
      if (M && M.title === 'المواجهة الأخيرة') enemyBoss(true);
      if (SAVE.ended) enemy.cd = 9999;
      const patrons = npcs.slice(free+2, free+14), pool = npcs.slice(free+14, free+20);
      return { vehicles: true, cafe: true, story: true, title: 'القصة', job: null, patrons, pool, tray: [], seatsTaken: new Set(), queue: [], served: 0, angry: 0, earned: 0, spawnT: 1, domBet: 20,
        canDrive: v => (v === heroMoto && SAVE.owned.moto) || (v === heroCar && SAVE.owned.car),
        hud: storyHud, hudTitle: storyHudTitle, action: storyAction, vehAction: storyVehAction,
        onServe: kind => { SAVE.cnt[kind] = (SAVE.cnt[kind]||0) + 1; },
        onDomino: w => { const bet = Math.min(modeObj.domBet, Math.max(0, Math.floor(hero.money))); if (w){ hero.money += bet; SAVE.cnt.dom = (SAVE.cnt.dom||0) + 1; } else hero.money -= bet; saveStory(); return bet; },
        onEnemyDown: () => { SAVE.cnt.edown = (SAVE.cnt.edown||0) + 1; if (enemy.boss) SAVE.cnt.fdown = (SAVE.cnt.fdown||0) + 1; saveStory(); },
        onArrest: () => { SAVE.cnt.arrest = 1; coin(); setTimeout(() => { wanted.active = false; wanted.d.root.visible = false; }, 3500); },
        onTime: () => endJob(false), onFail: () => endJob(true) };
    },
    ahwa: () => { hero.pos.set(SPOT.counter.x, .15, SPOT.counter.z + 1.5); decoGlasses.forEach(g => g.visible = false);
      const patrons = npcs.slice(free, free+12); patrons.forEach(n => { n.leaving = false; n.seat = undefined; });
      return { vehicles: false, cafe: false, title: 'قهوجي في قصر الملوك ☕', time: 240, tray: [], served: 0, angry: 0, earned: 0, spawnT: .5, patrons, seatsTaken: new Set(), init: () => resetAhwaStation(),
        hud: () => `وصّلت: <b style="display:inline;color:#fff">${modeObj.served}</b> · زعلانين: <b style="display:inline;color:#ff9a9a">${modeObj.angry} / ٣</b><br>الوقت: ${fmtTime(modeObj.time)} · الغلة: ${egp(modeObj.earned)}<br>${(modeObj.tray||[]).length ? 'وزّع اللي على الصينية (E جنب الزبون).' : 'روح للنَصبة (E) وحضّر الطلبات.'}`,
        action: () => {
          if (hero.pos.distanceTo(SPOT.counter) < 2.6) return { text: 'ادخل النَصبة وحضّر الطلبات', fn: () => enterStation('ahwa') };
          const c = modeObj.patrons.find(n => n.state === 'customer' && n.order && Math.hypot(n.g.position.x-hero.pos.x, n.g.position.z-hero.pos.z) < 2);
          if (c) return { text: `قدّم ${c.order.drink} ${c.order.sugar} لـ ${c.name}`, fn: () => serveAhwa(c) };
          return null;
        },
        onTime: () => endMode('الوردية خلصت ☕', `${heroName} وصّل ${modeObj.served} طلب وكسب ${egp(modeObj.earned)}.`, bestScore('ahwa', modeObj.earned)) }; },
    foul: () => { hero.pos.copy(SPOT.cartHero); hero.pos.y = .15;
      const q = npcs.slice(free, free+6);
      return { vehicles: false, cafe: false, title: 'عربية الفول 🧆', time: 210, queue: [], pool: q, served: 0, angry: 0, earned: 0, spawnT: 2,
        init: () => { FL.fry.forEach(f => f.mesh.parent && f.mesh.parent.remove(f.mesh)); Object.assign(FL, { fry: [], sF: [], sP: [], sand: null, bag: [] }); foulVisual(); },
        hud: () => `بعت: <b style="display:inline;color:#fff">${modeObj.served}</b> · زعلانين: <b style="display:inline;color:#ff9a9a">${modeObj.angry} / ٣</b><br>الوقت: ${fmtTime(modeObj.time)} · الغلة: ${egp(modeObj.earned)}`,
        onTime: () => endMode('خلّصت الفول 🧆', `${heroName} باع ${modeObj.served} طلب وكسب ${egp(modeObj.earned)}.`, bestScore('foul', modeObj.earned)) }; },
  };
  modeObj = M_[id](); if (modeObj.init) modeObj.init();
  if (id === 'free' || id === 'domino' || id === 'police') { /* walkers already out */ }
  setObjective(modeObj.title, '');
  camera.position.set(hero.pos.x, 4, hero.pos.z + 6); lookAt.copy(hero.pos);
  refreshTray(); updateHud(); if (id === 'foul') enterStation('foul');
  banner({ story: SAVE.started && SAVE.step ? 'رجعت الحتة يا ' + heroName + ' 👑' : 'يلا يا ' + heroName + '… نبقى الجامد 👑', free:'أهلاً بيك في الحتة يا ' + heroName, police:'المطلوب في الحتة… اركب البوكس 🚓', cash:'دوّر على رزم الفلوس 💵', ahwa:'الزباين جايين… جهّز النَصبة ☕', foul:'افتح العربية… الزباين جايين 🧆', domino:'اقعد يا ' + heroName }[id], 'info', 2.6);
}
function bestScore(key, v){ const b = parseFloat(store.get('ty_best_'+key)||'0'); if (v > b){ store.set('ty_best_'+key, String(v)); return 'رقم قياسي جديد! 🏆'; } return `أحسن غلة: ${egp(b)}`; }
function endMode(title, text, best=''){
  if (state !== 'play') return; state = 'end';
  if (sirenGain) sirenGain.gain.value = 0;
  $('endTitle').textContent = title; $('endText').textContent = text; $('endBest').textContent = best;
  exitStation(true); $('domino').hidden = true; document.body.classList.remove('in-domino'); hero.locked = false;
  setTimeout(() => { $('hud').hidden = true; $('end').hidden = false; }, 700);
}
function openMenu(){ saveStory(); renderModes(); state = 'menu'; $('hud').hidden = true; $('domino').hidden = true; $('end').hidden = true; $('menu').hidden = false; clearBubbles(); exitStation(true); document.body.classList.remove('in-domino'); if (sirenGain) sirenGain.gain.value = 0; try { speechSynthesis.cancel(); } catch(e){} }
$('againBtn').onclick = () => startMode(modeId);
$('toMenuBtn').onclick = openMenu;

function resetAhwaStation(){ AH.vessel = null; Object.assign(AH.pot, { coffee:0, sugar:0, heat:0, onFire:false, ruined:false, foam:false }); ahwaVisual(); ahwaPotVisual(); ahwaTrayVisual(); }
function serveAhwa(c){
  const tr = modeObj.tray, o = c.order, need = sugarSpoons(o.drink, o.sugar);
  let i = tr.findIndex(t => t.drink === o.drink && t.spoons === need), wrongSugar = false;
  if (i < 0){ i = tr.findIndex(t => t.drink === o.drink); wrongSugar = i >= 0; }
  if (i < 0){ say(c, 'مش ده اللي طلبته!', 1.6, 'angry'); buzz(30); return; }
  const item = tr.splice(i,1)[0]; refreshTray(); ahwaTrayVisual(); clink(); buzz(15);
  const f = clamp(c.patience/c.maxPat, 0, 1);
  const tip = wrongSugar ? 0 : Math.max(0, Math.round(4 + 10*f) + (o.reg ? 5 : 0) - (item.good ? 0 : 3) - (item.stirred ? 0 : 3));
  const now = runTime; modeObj.combo = (now - (modeObj.lastServe ?? -99) < 25) ? (modeObj.combo||0) + 1 : 1; modeObj.lastServe = now; const cb = modeObj.combo >= 3 && !wrongSugar ? Math.min(modeObj.combo - 2, 4) * 3 : 0;
  const pay = 5 + tip + cb; modeObj.served++; modeObj.earned += pay; hero.money += pay; if (modeObj.onServe) modeObj.onServe('ahwa');
  if (wrongSugar) say(c, item.spoons > need ? 'إيه السكر ده كله!' : 'ده مر يا معلم!', 2.2, 'angry');
  else if (!item.stirred) say(c, 'السكر لسه تحت يا ريس', 2);
  else if (!item.good) say(c, 'الكوباية مش مليانة!', 2);
  else say(c, rpick(['تسلم إيدك يا معلم','الله ينور','شاي ولا أروع','مظبوط زي ما بحبه']), 2);
  const s = SEATS[c.seat]; let g;
  if (item.drink === 'قهوة'){ g = cupModel(); g.add(disc(.029, coffeeMat, .065)); g.scale.setScalar(1.6); } else g = makeGlass(item.drink);
  g.position.set(TABLES[s.ti][0] + (s.x < TABLES[s.ti][0] ? -.25 : .25), .93, TABLES[s.ti][1]); scene.add(g);
  if (c.bubble){ removeBubble(c.bubble); c.bubble = null; }
  c.order = null; c.state = 'drinking'; c.leaveT = 9; c.glass = g;
  banner(`+${pay} جنيه${tip ? ' (بقشيش ' + tip + ')' : ''}${cb ? ' · كومبو ×' + modeObj.combo + ' 🔥' : ''}`, wrongSugar ? 'bad' : 'ok', 1.6);
}
function updateAhwa(dt){
  const m = modeObj;
  m.spawnT -= dt;
  const waiting = m.patrons.filter(n => (n.state === 'customer' && n.order) || n.state === 'goto' && n.onArrive && n.seat !== undefined && !n.leaving).length;
  if (m.spawnT <= 0 && waiting < 4){
    m.spawnT = (m.served + m.angry < 1 && m.seatsTaken.size < 2) ? 3 : R(11, 17) * (m.time < 100 ? .8 : 1);
    const free = SEATS.map((s,i) => i).filter(i => !m.seatsTaken.has(i));
    const n = m.patrons.find(n => n.state === 'hidden');
    if (free.length && n){
      const si = rpick(free); m.seatsTaken.add(si); const s = SEATS[si];
      n.leaving = false; n.g.visible = true; n.g.position.set(s.x + R(-3,3), .15, 40.5); n.state = 'goto'; n.speed = R(1.6, 2.1); n.tx = s.x + (s.x < TABLES[s.ti][0] ? -.25 : .25); n.tz = s.z + .6; n.seat = si;
      n.onArrive = n2 => { seatNPC(n2, s.x, s.z, s.ry); n2.state = 'customer'; const rg = REGULARS[n2.name]; n2.order = rg && Math.random() < .75 ? { ...rg, reg: true } : { drink: rpick(DRINKS), sugar: rpick(SUGARS) }; n2.maxPat = 120*DIFF.pat; n2.patience = n2.maxPat; n2.bubble = orderBubble(n2); say(n2, n2.order.reg ? `زي العادة يا ${heroName}! ${n2.order.drink} ${n2.order.sugar}` : `واحد ${n2.order.drink} ${n2.order.sugar} يا ريس!`, 0); buzz(15); };
    } else m.spawnT = 2;
  }
  for (const n of m.patrons){
    if (n.state === 'customer' && n.order){
      n.patience -= dt; const f = clamp(n.patience/n.maxPat, 0, 1);
      if (n.bubble) n.bubble.el.innerHTML = `${orderLabel(n.order)}<div class="pat"><i style="width:${f*100}%;background:${f<.3?'#d33':'#3aa84a'}"></i></div>`;
      if (n.patience <= 0){ m.angry++; removeBubble(n.bubble); n.bubble = null; n.order = null; say(n, 'إيه القهوة دي! ماشي', 2, 'angry'); leaveSeat(n); if (m.angry >= 3){ if (m.onFail) m.onFail(); else endMode('الزباين زعلوا 😤', `${heroName} وصّل ${m.served} طلب بس ٣ زباين مشيوا زعلانين.`, bestScore('ahwa', m.earned)); } }
    } else if (n.state === 'drinking'){ n.leaveT -= dt; if (n.leaveT <= 0){ if (n.glass){ scene.remove(n.glass); n.glass = null; } leaveSeat(n); } }
  }
}
function leaveSeat(n){ modeObj.seatsTaken && modeObj.seatsTaken.delete(n.seat); n.leaving = true; n.state = 'goto'; n.g.position.y = .15; n.tx = rpick([7.5, 40.5]); n.tz = R(36, 40); n.onArrive = n2 => { n2.state = 'hidden'; n2.g.visible = false; n2.leaving = false; }; }
