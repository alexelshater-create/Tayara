// ================= story: طيارة الجامد =================
const STORY_KEY = 'ty_story_v2';
const newStory = () => ({ money: 20, rep: 0, m: 0, time: 9, house: 0, owned: { moto: false, car: false }, acc: {}, wear: {}, up: {}, cnt: {}, ended: false, started: false, introSeen: -1, chSeen: -1, skipped: {} });
function loadStory(){ try { const s = JSON.parse(store.get(STORY_KEY) || 'null'); if (s && typeof s.m === 'number'){ const d = newStory(); return { ...d, ...s, owned: { ...d.owned, ...s.owned }, acc: s.acc || {}, wear: s.wear || {}, up: s.up || {}, cnt: s.cnt || {} }; } } catch(e){} return newStory(); }
let SAVE = loadStory();
const STORY_V = 3;
// replaying a finished mission from the missions screen runs on a copy of the save; the real one is kept in REPLAY.back
const REPLAY = { on: false, back: null, i: -1, last: -1 };
function saveStory(){ if (REPLAY.on) return; SAVE.v = STORY_V; if (modeId === 'story'){ SAVE.money = Math.max(0, Math.round(hero.money)); SAVE.time = TOD.h; } store.set(STORY_KEY, JSON.stringify(SAVE)); }
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
if (hero.d.is3D) Object.assign(ACC, make3DAccessories(hero.d.R));
else {
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
// ---------- story engine ----------
const ST2 = { phase: 'idle', d: { base: {} }, ev: {}, stalkT: 70, npcs: {}, allow: null };
const cnt = k => SAVE.cnt[k] || 0;
const mark = (d, ...ks) => { d.base = d.base || {}; for (const k of ks) d.base[k] = cnt(k); };
const prog = (d, k) => cnt(k) - ((d.base && d.base[k] !== undefined) ? d.base[k] : cnt(k));
function onStoryEvent(type, arg){ if (modeId !== 'story') return; ST2.ev[type] = arg === undefined ? true : arg; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const near = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) < r;
const heroAt = () => hero.veh ? hero.veh.pos : hero.pos;
// named people (low-poly)
const NAMED = { moallem: { i: 40, name: 'المعلم عبده', pos: [24.6, .15, 24.4], yaw: Math.PI }, landlord: { i: 41, name: 'الحاج محمود', pos: [-21.2, .15, 88.6], yaw: 0 }, azzouz: { i: 42, name: 'عزوز', pos: [116.4, .15, 40.6], yaw: 0 }, fathi: { i: 43, name: 'الحاج فتحي', pos: [37.4, .15, 31.8], yaw: -Math.PI/2 }, officer: { i: 44, name: 'الظابط', pos: [34.6, .15, 39.6], yaw: Math.PI }, reda: { i: 45, name: 'الأسطى رضا', pos: [127, .15, -7.6], yaw: Math.PI } };
function setupNamed(){ for (const [k, v] of Object.entries(NAMED)){ const n = npcs[v.i]; if (!n) continue; n.role = 'named'; n.name = v.name; n.state = 'idle'; n.g.visible = true; n.g.position.set(v.pos[0], v.pos[1], v.pos[2]); n.yaw = v.yaw; n.g.rotation.set(0, v.yaw, 0); n.fall = 0; n.downT = 0; ST2.npcs[k] = n; } }
const NP = k => ST2.npcs[k];
// pickups (papers, parts) with a glowing beam
const pickups = [];
const pickMat = new THREE.MeshStandardMaterial({ color: 0xffe082, emissive: 0xffb300, emissiveIntensity: .8, roughness: .4 });
function addPickup(pos, kind='paper'){ const g = new THREE.Group(); const m = new THREE.Mesh(kind === 'part' ? new THREE.TorusGeometry(.22,.08,8,16) : new THREE.BoxGeometry(.4,.04,.3), pickMat); m.position.y = .9; g.add(m); const b = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); b.scale.set(.6, .6, .6); g.add(b); g.position.copy(pos); scene.add(g); const p = { g, m, pos: pos.clone(), got: false }; pickups.push(p); return p; }
function clearPickups(){ for (const p of pickups) scene.remove(p.g); pickups.length = 0; }
function updatePickups(dt, t){ for (const p of pickups){ if (p.got) continue; p.m.rotation.y = t*2; p.m.position.y = .9 + Math.sin(t*3)*.12; if (!hero.veh && near(hero.pos, p.pos, 1.6)){ p.got = true; p.g.visible = false; coin(); buzz(20); banner('✔️ لقيتها', 'ok', 1.2); } } }
// police checkpoints (كمين)
const checkpoints = [];
function addCheckpoint(x, z){ const car = makeCar('#f4f4f4', 'police'); car.position.set(x, 0, z); car.rotation.y = Math.PI/2; const c = { car, pos: V(x, 0, z), r: 10 }; checkpoints.push(c); return c; }
function clearCheckpoints(){ for (const c of checkpoints) scene.remove(c.car); checkpoints.length = 0; }
// wedding decorations
const wedding = new THREE.Group(); wedding.visible = false; scene.add(wedding);
{ const W = V(-72, .15, 33); const p = []; box(p, 8, .5, 3, W.x, .25, W.z + 5.5, '#7b1f3a'); box(p, 8, 3, .1, W.x, 1.8, W.z + 7, '#c2185b'); for (const s of [-1,1]) box(p, .5, 1.6, .5, W.x + s*3.2, 1.3, W.z + 5, '#111');
  for (let r=0;r<3;r++) for (let c=0;c<6;c++) box(p, .44,.5,.44, W.x - 5 + c*2, .25, W.z - 2 - r*1.6, c%2 ? '#f2f0ea' : '#c9302c');
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 })); wedding.add(m);
  const bulbs = []; for (let i=0;i<40;i++){ const x = W.x - 14 + i*.7; bulbs.push({ x, y: 4.2 + Math.sin(i*.45)*.4, z: W.z }); bulbs.push({ x, y: 4.0 + Math.sin(i*.45)*.4, z: W.z - 6 }); }
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.2 }), bulbs.length);
  const c = new THREE.Color(); bulbs.forEach((b, i) => { _m.makeTranslation(b.x, b.y, b.z); bm.setMatrixAt(i, _m); c.setHSL((i*.07)%1, .9, .55); bm.setColorAt(i, c); }); wedding.add(bm); }
// arabi's motorcycle (for chapter 5) and شمس's getaway motorcycle
const arabiMoto = addVehicle('moto', 262, 92.5, -Math.PI/2, '#1565c0'); arabiMoto.jobOnly = 'arabi'; arabiMoto.home.y = 0;
const shamsMoto = makeMoto('#212121'); shamsMoto.visible = false;
// شمس as a fighter for the final fight
const boss = { active: false, pos: V(0,0,0), hp: 160, atk: 0, downs: 0, vx: 0, vz: 0 };
function bossTarget(p){ if (!boss.active || wantedD.downT > 0) return null; const d = boss.pos.distanceTo(p); return d < 1.9 ? { boss: true, x: boss.pos.x, z: boss.pos.z } : null; }
function bossHit(big){ boss.hp -= big ? 34 : 18; wantedD.hitT = .45; thwack(); say(wanted, rpick(['آه!','ماشي يا طيارة!','لسه بدري!']), 1, 'angry'); if (boss.hp <= 0){ boss.downs++; boss.hp = 160; wantedD.downT = 3.5; say(wanted, boss.downs >= 2 ? 'خلاص… خلاص!' : 'قوم يا شمس… قوم', 2, 'angry'); } }
function updateBoss(dt, t){
  if (!boss.active) return;
  const p = boss.pos, tg = hero.pos, dx = tg.x - p.x, dz = tg.z - p.z, dist = Math.hypot(dx, dz); boss.vx = boss.vz = 0;
  if (wantedD.downT <= 0 && !CUT.on){
    if (dist > 1.2){ const sp = 6.2 * DIFF.enemySpd; boss.vx = dx/dist*sp; boss.vz = dz/dist*sp; moveWithSlide(p, boss.vx*dt, boss.vz*dt); }
    else { boss.atk -= dt; if (boss.atk <= 0){ boss.atk = 1.0; wantedD.punchT = .28; setTimeout(() => { if (boss.active && wantedD.downT <= 0 && boss.pos.distanceTo(hero.pos) < 1.8) heroDamage(10 * DIFF.dmg, 'enemy'); }, 130); } }
  }
  wantedD.root.position.copy(p); animDoll(wantedD, boss.vx, boss.vz, dt, t);
}
// arabi: stalks طيارة anywhere (hostile chapters) or walks next to him (ally chapters)
function allyUpdate(dt){
  const p = enemy.pos;
  if (hero.veh || HOUSE.inside){ enemy.d.root.visible = false; enemy.vel.set(0,0,0); return; }
  if (!enemy.d.root.visible){ enemy.d.root.visible = true; p.set(hero.pos.x + 1.6, hero.pos.y, hero.pos.z + .8); }
  const thug = npcs.find(n => n.thug && !n.thugDone && n.state === 'fight' && n.g.position.distanceTo(p) < 14);
  const tg = thug ? thug.g.position : V(hero.pos.x + 1.4, 0, hero.pos.z + .6);
  const dx = tg.x - p.x, dz = tg.z - p.z, d = Math.hypot(dx, dz); let vx = 0, vz = 0;
  if (d > (thug ? 1.1 : 1.8)){ const sp = d > 8 ? 8 : 5.2; vx = dx/d*sp; vz = dz/d*sp; moveWithSlide(p, vx*dt, vz*dt); if (d > 30) p.set(hero.pos.x + 1.4, hero.pos.y, hero.pos.z + .6); }
  else if (thug){ enemy.atk -= dt; if (enemy.atk <= 0){ enemy.atk = 1.1; enemy.d.punchT = .28; setTimeout(() => { if (thug.state === 'fight') npcHit(thug, 0); }, 120); } }
  p.y += (groundY(p.x, p.z) - p.y) * damp(15, dt); enemy.d.root.position.copy(p); enemy.vel.set(vx, 0, vz);
}
function arabiHide(){ enemy.active = false; enemy.d.root.visible = false; enemy.state = 'roam'; }
function arabiAppear(pos, chase=true){ enemy.active = true; enemy.d.root.visible = true; enemy.pos.copy(pos); enemy.hp = enemy.maxHp || 100; enemy.d.downT = 0; enemy.cd = 0; enemy.state = chase ? 'chase' : 'roam'; const bi = blocksInfo.findIndex(b => Math.abs(pos.x-b.cx) < 26 && Math.abs(pos.z-b.cz) < 26); enemy.block = bi < 0 ? 0 : bi; enemy.t = 0; if (chase) say(enemy, rpick(['انت تاني يا طيارة!','لقيتك!','فاكر إنك هتستخبى مني؟']), 2.5, 'angry'); }
function updateStalker(dt){
  if (!storyHostile() || ST2.d.enemyBusy || CUT.on) return;
  const busy = HOUSE.inside || JOB.kind || modeObj.job || ST.kind || hero.locked;
  if (busy){ if (enemy.active && !ST2.d.enemyBusy) arabiHide(); return; }
  const f = heroAt();
  if (enemy.active){
    if (enemy.d.downT > 0){ ST2.downT = (ST2.downT || 0) + dt; if (ST2.downT > 5){ ST2.downT = 0; arabiHide(); ST2.stalkT = R(110, 190); } return; }
    if (enemy.pos.distanceTo(f) > 75){ ST2.lostT = (ST2.lostT || 0) + dt; if (ST2.lostT > 5){ ST2.lostT = 0; arabiHide(); ST2.stalkT = R(60, 110); banner('هربت من العربي 😎', 'ok', 2); } } else ST2.lostT = 0;
    return;
  }
  ST2.stalkT -= dt; if (ST2.stalkT > 0) return;
  ST2.stalkT = R(40, 70); const p = randomSidewalkPoint(32, f); if (p.distanceTo(f) > 60) return;
  arabiAppear(p); banner('⚠️ العربي ظهر! اهرب أو واجهه', 'bad', 2.5);
}
function pickDrink(){ const M = MS[SAVE.m]; if (modeId === 'story' && M && ST2.phase === 'active'){ if (M.id === 'coffee' && Math.random() < .6) return 'قهوة'; if (M.id === 'tea' && Math.random() < .7) return 'شاي'; } return rpick(DRINKS); }
function storyAllowsThief(){ return modeId === 'story' && !SAVE.ended && SAVE.m > idx('islam') && SAVE.m <= idx('ringPhoto') && !ST2.d.noThief && ST2.phase === 'active'; }
function signLevel(){ return SAVE.ended ? .05 : SAVE.m > idx('islam') ? 1 : SAVE.m > idx('pizzaThief') ? .45 : SAVE.m > idx('snatch') ? .15 : 0; }
// ---------- missions: 8 chapters and the ending (about 60 missions), told by الحاج كامل ----------
const CHAPS = [['البداية','الحكاية'], ['الفصل الأول','صباح في بحري'], ['الفصل التاني','لقمة العيش'], ['الفصل التالت','العربي'], ['الفصل الرابع','الساندوتش الطاير'], ['الفصل الخامس','شمس'], ['الفصل السادس','الفخ'], ['الفصل السابع','ليلة الفرح'], ['الفصل التامن','الكوبري والقلعة'], ['الختام','الجامد']];
// the mission order before the story was rewritten (stage 4): old saves are moved to the same place in the new story
const OLD_ORDER = ["wake", "toCafe", "islamHi", "tea", "coffee", "rush", "spill", "domino", "wages", "rent", "foul", "azzouz", "pizza3", "flatTire", "tuk", "buyMoto", "race", "reno1", "snatch", "pizzaThief", "tail", "paper", "islam", "poster", "sayed", "clues", "nightWorkshop", "evidence", "checkpoints", "sighting", "arabiHelp", "parts", "thugs", "returnMoto", "friendRace", "invite", "weddingNight", "dance", "shamsWedding", "plan", "chase", "bossFight", "confess", "epilogue"];
const OLD_TO_NEW = { sayed: 'clues', arabiHelp: 'refuseDeal', parts: 'refuseDeal', thugs: 'refuseDeal', returnMoto: 'refuseDeal', friendRace: 'refuseDeal', tuk: 'buyMoto' };
const L = (who, text) => ({ say: who, text });
const shot = (p, dx=2.6, dy=1.3, dz=3.6, t=1.3) => ({ cam: [p.x+dx, (p.y||0)+dy+.4, p.z+dz], look: [p.x, (p.y||0)+1.45, p.z], t });
function heroTo(x, z){ if (hero.veh) exitVehicle(true); if (!HOUSE.inside) [x, z] = freeSpot(x, z); hero.pos.set(x, groundY(x, z), z); hero.vel.set(0,0,0); hero.knock.set(0,0,0); lookAt.copy(hero.pos); }
const npcAt = k => NP(k) ? NP(k).g.position : V(0,0,0);
const yEnt = { d: youssefD }, sEnt = { d: wantedD }, aEnt = { d: enemyD }, iEnt = { d: islamD };
const PL = { cafeIn: V(22.6,.15,25.4), cafeOut: V(20,.15,39), domino: V(30,.15,27.2), cart: V(35.6,.15,33.4), house: V(-24,.15,90), azz: V(119,.15,42.6), tuk: V(126,.15,-6.4), ws: V(260,.15,90.4), police: V(31,.15,40), wed: V(-72,.15,33), shop: SHOP.pos, corniche: V(168,.15,150) };
const reachU = (p, r=4) => () => near(heroAt(), p(), r);
const talkU = k => () => !!NP(k) && near(heroAt(), npcAt(k), 2.8);
const nPick = (d, n) => `(${pickups.filter(p => p.got).length}/${n})`;
const allPicked = () => pickups.length > 0 && pickups.every(p => p.got);
const nearestPick = () => { const f = heroAt(); let b = null, bd = 1e9; for (const p of pickups){ if (p.got) continue; const dd = p.pos.distanceTo(f); if (dd < bd){ bd = dd; b = p.pos; } } return b; };
const waitNight = (pos, r=14) => (p) => (!isNight() && near(p, pos(), r)) ? { text: '⏳ استنى لحد بالليل', fn: () => fadeTo(() => { applyTimeOfDay(21); SAVE.time = 21; banner('الدنيا ليلت 🌙', 'info', 2); }, .8) } : null;
function sidewalkNear(c, rad){ for (let i=0;i<60;i++){ const a = Math.random()*Math.PI*2, r = rad*(.6 + Math.random()*.6), x = c.x + Math.sin(a)*r, z = c.z + Math.cos(a)*r; if (inWorld(x, z) && !staticBlocked(x, z, .5)) return V(x, groundY(x, z), z); } return c.clone(); }
// --- arabi races on his own motorcycle along a road path ---
function ghostStart(d, moto, doll, path, speed){
  const mesh = moto.mesh || moto; mesh.visible = true; mesh.position.set(path[0][0], 0, path[0][1]);
  doll.root.visible = true; doll.P.legL.visible = doll.P.legR.visible = false; doll.blob.visible = false; doll.downT = 0;
  d.gh = { moto, mesh, doll, path, i: 1, speed, yaw: Math.atan2(path[1][0]-path[0][0], path[1][1]-path[0][1]) }; ghostPose(d.gh, 0);
}
function ghostPose(g, dt){ const p = g.mesh.position; g.mesh.rotation.set(0, g.yaw, 0); if (g.moto.mesh) g.moto.yaw = g.yaw; p.y = groundY(p.x, p.z); g.doll.root.position.set(p.x - Math.sin(g.yaw)*.25, p.y + .86 - g.doll.hipY, p.z - Math.cos(g.yaw)*.25); g.doll.faceYaw = g.yaw; animDoll(g.doll, 0, 0, dt, runTime); }
function ghostStep(g, dt, sp){
  if (g.i < g.path.length){ const p = g.mesh.position, [tx, tz] = g.path[g.i], dx = tx - p.x, dz = tz - p.z, dd = Math.hypot(dx, dz), s = sp*dt;
    if (dd <= s){ p.x = tx; p.z = tz; g.i++; } else { p.x += dx/dd*s; p.z += dz/dd*s; }
    if (dd > .01) g.yaw = lerpAngle(g.yaw, Math.atan2(dx, dz), damp(7, dt)); }
  ghostPose(g, dt); return g.i >= g.path.length;
}
function ghostEnd(d){ const g = d.gh; if (!g) return; g.doll.P.legL.visible = g.doll.P.legR.visible = true; g.doll.blob.visible = true; g.doll.root.visible = false; if (!g.moto.mesh) g.mesh.visible = false; d.gh = null; }
const pathLen = path => path.slice(1).reduce((s, p, i) => s + Math.hypot(p[0]-path[i][0], p[1]-path[i][1]), 0);
function raceM(o){
  return { ...o, spawn: PL.cafeOut,
    text: d => !d.go ? (hero.veh && hero.veh.type === 'moto' ? 'قرّب بالموتوسيكل من العربي… السباق هيبدأ لوحده 🏁' : 'اركب موتوسيكلك وقف جنب العربي قدام القهوة (★)') : `🏁 السباق لـ${o.goalName}! فاضل ${Math.max(0, Math.ceil(d.t))} ثانية`,
    target: d => d.go ? o.goal : arabiMoto.pos,
    start(d){ d.enemyBusy = true; arabiHide(); const sp = 14 * DIFF.enemySpd; d.t = pathLen(o.path) / sp * 1.6; ghostStart(d, arabiMoto, enemyD, o.path, sp); d.go = false; d.cd = null; d.noThief = true; },
    update(dt, d){
      const g = d.gh; if (!g) return;
      if (!d.go){ ghostPose(g, dt);
        if (hero.veh && hero.veh.type === 'moto' && near(hero.veh.pos, g.mesh.position, d.cd == null ? 14 : 40)){ const prev = d.cd ?? 3.99; d.cd = prev - dt; if (Math.ceil(d.cd) !== Math.ceil(prev)){ banner(d.cd > 0 ? `${Math.ceil(d.cd)}…` : '🏁 يلا!!', 'info', 1); tone(d.cd > 0 ? 440 : 880, d.cd > 0 ? 440 : 880, .2, 'square', .09); } if (d.cd <= 0){ d.go = true; say(aEnt, o.taunt, 2.5, 'angry'); } }
        else d.cd = null; return; }
      d.t -= dt; const arrived = ghostStep(g, dt, g.speed);
      if (near(heroAt(), o.goal, 9)) return true;
      if (arrived){ d.failMsg = 'العربي وصل قبلك'; return 'fail'; }
      if (d.t <= 0){ d.failMsg = 'الوقت خلص'; return 'fail'; }
    },
    cleanup(d){ ghostEnd(d); parkArabiMoto(); } };
}
function parkArabiMoto(){
  if (hero.veh === arabiMoto) return; const atWs = false;
  const [x, z, y] = atWs ? [262, 92.5, -Math.PI/2] : [25.6, 43.3, Math.PI/2]; arabiMoto.pos.set(x, 0, z); arabiMoto.yaw = y; arabiMoto.mesh.rotation.set(0, y, 0); arabiMoto.speed = 0;
}
// --- thugs (شمس's men) ---
function spawnThugs(d){
  d.thugs = [36, 37, 38].map(i => { const n = npcs[i]; const p = sidewalkNear(hero.pos, 9); n.role = 'thug'; n.thug = true; n.thugHits = 0; n.thugDone = false; n.g.visible = true; n.g.position.copy(p); n.state = 'fight'; n.fightT = 999; n.downT = 0; n.fall = 0; n.name = 'واحد من رجالة شمس'; return n; });
  d.thugs.forEach((n, k) => npcWear3D(n, k === 1 ? 'soldier' : 'thug'));   // شمس's men in 3D when the models are there
  say(d.thugs[0], 'إنتوا بتعملوا إيه هنا؟!', 2.5, 'angry');
}
function clearThugs(d){ (d.thugs || []).forEach(n => { npcTakeOff3D(n); n.thug = false; n.thugDone = false; n.state = 'hidden'; n.g.visible = false; n.role = null; n.g.rotation.x = 0; }); d.thugs = null; }

// ---- places and people used by the story (Alexandria) ----
const PL2 = { shadia: STORY_HOUSES.shadia.door, shadiaOut: V(-35, .15, 88), houseOut: V(-24, .15, 89), wall: V(60, .15, 152.3), villa: V(VILLA.cx - 4, .15, VILLA.cz + 6), port: V(PORT.door.x, .15, PORT.door.z + 2), portIn: PORT.inside, pier: V((PIER.x0 + PIER.x1) / 2, .15, 160), showroom: SHOWROOM.front, fortGate: V(96, .15, 262), fortIn: V(96, .15, 271), market: V(147, .15, -40), tramStop: V(72, .15, -53.6), wed: V(-72, .15, 33), roof: V(-24, 10.2, 79) };
const shEnt = { d: shadiaD }, fEnt = { d: fatherD }, lEnt = { d: leatherD }, kEnt = { d: kamelD || islamD };
const KN = id => ({ narr: id });
const camAt = (x, y, z, lx, ly, lz, t = 1.3) => ({ cam: [x, y, z], look: [lx, ly, lz], t });
const hideHero = () => ({ do: () => { SCENE.hideHero = true; } });
// before the very first chapter: الحاج كامل at the café starts the story
const PROLOGUE = () => [ hideHero(), camAt(33.5, 2.1, 30.2, 29.2, 1.15, 25.5, 0), { wait: .6 }, KN('kamel_00_1'), KN('kamel_00_2'), KN('kamel_00_3'), { do: () => { SCENE.hideHero = false; } } ];
const CHAP_NARR = { 1: 'kamel_01_1', 2: 'kamel_02_1', 3: 'kamel_03_1', 6: 'kamel_06_1', 8: 'kamel_08_1' };
// a car that drives away along a path, faster when you are near and slower when you fall back (the stolen red car)
function carRunStep(d, dt){
  const g = d.run, v = g.v, p = v.pos, [tx, tz] = g.path[Math.min(g.i, g.path.length - 1)], dx = tx - p.x, dz = tz - p.z, dd = Math.hypot(dx, dz), dist = heroAt().distanceTo(p);
  const sp = (dist > 70 ? 8 : dist > 35 ? 14 : 19) * DIFF.enemySpd, s = sp * dt;
  if (g.i < g.path.length){ if (dd <= s){ p.x = tx; p.z = tz; g.i++; } else { p.x += dx / dd * s; p.z += dz / dd * s; } if (dd > .01) v.yaw = lerpAngle(v.yaw, Math.atan2(dx, dz), damp(6, dt)); }
  v.mesh.rotation.set(0, v.yaw, 0); d.dist = dist; return g.i >= g.path.length;
}
// شمس's launch in the harbour: it runs along a path over the water
function launchRunStep(d, dt){
  const g = d.lr, p = shamsLaunch.position, [tx, tz] = g.path[Math.min(g.i, g.path.length - 1)], dx = tx - p.x, dz = tz - p.z, dd = Math.hypot(dx, dz), dist = heroAt().distanceTo(p);
  const sp = (dist > 60 ? 7 : dist > 25 ? 13 : 15.5) * DIFF.enemySpd, s = sp * dt;
  if (g.i < g.path.length){ if (dd <= s){ p.x = tx; p.z = tz; g.i++; } else { p.x += dx / dd * s; p.z += dz / dd * s; } if (dd > .01) g.yaw = lerpAngle(g.yaw, Math.atan2(dx, dz), damp(4, dt)); }
  shamsLaunch.rotation.set(0, g.yaw, Math.sin(runTime * 3) * .04); p.y = -.9 + Math.sin(runTime * 2) * .08; d.dist = dist; return g.i >= g.path.length;
}

const MS = [
  // ===== الفصل الأول: صباح في بحري =====
  { id: 'wake', ch: 1, title: 'صباح الخير يا طيارة', prologue: true, par: 40,
    intro: () => [ { cam: [-400.4, 2.2, -397.7], look: [-404, .8, -400.6], t: 0 }, { wait: .6 },
      L('phone', '📱 المعلم عبده: انت فين يا طيارة؟! الوردية بدأت من ساعة!'),
      L('tayara', 'يا نهار أبيض… نمت تاني!'),
      { do: () => { noise(.12, 300, .5); setTimeout(() => noise(.12, 300, .5), 250); shake = .25; } },
      L('landlord', '(بيخبط على الباب) يا طيارةةة! الإيجار متأخر شهرين يا ابني!'),
      L('landlord', 'آخر الأسبوع يا ١٠٠ جنيه يا تلم هدومك وتمشي. أنا مش جمعية خيرية!'),
      L('tayara', 'حاضر يا حاج محمود… ربنا يسهلها.'),
      L('tayara', 'يلا يا طيارة… النهارده يوم جديد. هنبقى الجامد 👑') ],
    text: () => 'اخرج من البيت 🚪 (الباب ورا)', target: () => HOUSE.inside ? HOUSE_SPOTS.door : null,
    update: () => !!ST2.ev.exitHouse || !HOUSE.inside },
  { id: 'laundry', ch: 1, title: 'الغسيل', par: 60,
    intro: () => [ { do: () => { heroTo(PL2.houseOut.x, PL2.houseOut.z); const sh = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.1), new THREE.MeshStandardMaterial({ color: 0x5b8fd6, side: THREE.DoubleSide, roughness: .9 })); scene.add(sh); SCENE.shirt = sh; tween(1.6, k => { sh.position.set(-35 + 11 * k, 10 - 8.1 * k * k, 87 + 2 * k); sh.rotation.set(k * 5, k * 3, k * 2); }, () => { sh.position.set(hero.pos.x, 1.9, hero.pos.z); sh.rotation.set(-1.4, 0, 0); noise(.15, 500, .2); }); } },
      camAt(-18, 3.4, 95, -26, 2.6, 87, 1.4), { wait: 1.2 },
      L('tayara', 'إيه ده؟! قميص… نازل عليّا من السما؟'),
      { do: () => showActor(shadiaD, PL2.shadiaOut.x, PL2.shadiaOut.z) }, { walk: [shadiaD, -28.5, 88.6, 2.2] },
      L('shadia', 'يا نهار أبيض! القميص بتاعي… معلش والله، الهوا شاله.'),
      L('tayara', 'ولا يهمك… ده أحلى حاجة وقعت عليّا من شهور 😅'),
      L('shadia', 'انت طيارة؟ اللي بيقولوا عليه في القهوة؟'),
      L('tayara', 'هو بعينه… بس اللي بيقولوه نصه كدب.'),
      L('shadia', 'طب هات القميص… ولا هتاخده تذكار؟ 😄'),
      { do: () => { if (SCENE.shirt){ scene.remove(SCENE.shirt); SCENE.shirt = null; } hideActor(shadiaD); } } ],
    text: () => 'رجّع القميص لشادية عند باب بيتها (★) جنب بيتك', target: () => PL2.shadiaOut, update: reachU(() => PL2.shadiaOut, 2.6),
    outro: () => [ { do: () => showActor(shadiaD, PL2.shadiaOut.x, PL2.shadiaOut.z - .6) }, shot(PL2.shadiaOut, 2.4, 1.1, 3.2),
      L('shadia', 'شكراً يا طيارة. أنا شادية… جارتك من ساعة ما نقلنا.'),
      L('shadia', 'وبصوّر… الكاميرا دي حياتي كلها. يوم من الأيام هبقى أشهر مصورة في إسكندرية.'),
      L('tayara', 'وأنا يوم من الأيام هبقى صاحب القهوة… يبقى نتقابل على القمة 😎'),
      L('shadia', 'روح يا عم القمة… المعلم عبده بيزعّق من الصبح 😂'), { do: () => hideActor(shadiaD) } ] },
  { id: 'toCafe', ch: 1, title: 'على القهوة', par: 70,
    text: () => 'روح قهوة قصر الملوك (★). بعيدة؟ اركب توكتوك من المحطة 🚏 اللي جنب البيت.', target: () => PL.cafeOut,
    update: reachU(() => PL.cafeOut, 6),
    outro: () => [ { do: () => heroTo(PL.cafeIn.x - 1.5, PL.cafeIn.z + .4) }, shot(npcAt('moallem'), -2.6, 1, 3.2),
      L('moallem', 'أهلاً بالبيه! ده لو ميت كان جه بدري 😒'),
      L('tayara', 'معلش يا معلم… المنبه بايظ.'),
      L('moallem', 'المنبه بايظ ولا انت اللي بايظ؟ يلا… سلّم على صاحبك الأول، وبعدين عندي ليك درس.') ] },
  { id: 'islamHi', ch: 1, title: 'إسلام', par: 40,
    text: () => 'إسلام قاعد على ترابيزة الدومنو… سلّم عليه (★)', target: () => SPOT.domino,
    update: reachU(() => SPOT.domino, 2.8),
    outro: () => [ shot(SPOT.domino, 2.4, 1.1, 3),
      L('islam', 'طيارة! أخيراً يا عم 😂 المعلم كان هيعلّق صورتك على الحيطة ومكتوب عليها «مفقود».'),
      L('tayara', 'ههه… إيه الأخبار يا إسلام؟ وشك منوّر كده ليه؟'),
      L('islam', 'عندي خبر حلو أوي… بس مش دلوقتي. اشتغل الأول قبل ما المعلم يرفدك 😄') ] },
  { id: 'tea', ch: 1, title: 'درس الشاي', at: () => SPOT.counter, atR: 6, goText: 'روح للمعلم عبده عند النَصبة (★)', par: 150,
    intro: () => [ shot(npcAt('moallem'), -2.4, 1, 3),
      L('moallem', 'بص يا طيارة… الشاي عندنا ليه أصول، وأنا هقولهالك خطوة خطوة.'),
      L('moallem', '١- ادخل النَصبة. ٢- حط الشاي والميه في البراد وسيبه يغلي. ٣- صب في الكوباية. ٤- حط السكر على مزاج الزبون وقلّب.'),
      L('moallem', 'سادة يعني من غير سكر، مظبوط معلقتين، زيادة تلاتة. وكل زبون فوق راسه طلبه والوقت بتاعه.'),
      L('moallem', 'قدّم ٣ كوبايات شاي… ووريني الشطارة.') ],
    start: d => mark(d, 'tea'), text: d => `اشتغل وردية (E عند النَصبة ☕) وقدّم ٣ شاي (${Math.min(prog(d,'tea'),3)}/3)`, target: () => modeObj.job ? null : SPOT.counter,
    update: (dt, d) => prog(d, 'tea') >= 3,
    outro: () => [ L('moallem', 'ماشي… مش وحش. الشاي اتشرب على الأقل 😏') ] },
  { id: 'coffee', ch: 1, title: 'درس القهوة', par: 150,
    intro: () => [ L('moallem', 'القهوة غير الشاي يا طيارة. البن والسكر في الكنكة مع الميه، وعلى النار.'),
      L('moallem', 'مظبوط يعني معلقة سكر، وزيادة معلقتين. وأول ما توش وتعلى، شيلها قبل ما تفور!'),
      L('moallem', 'قدّم ٢ قهوة.') ],
    start: d => mark(d, 'coffee'), text: d => `قدّم ٢ قهوة ☕ (${Math.min(prog(d,'coffee'),2)}/2) · لو الوردية خلصت ابدأ واحدة جديدة من النَصبة`, target: () => modeObj.job ? null : SPOT.counter,
    update: (dt, d) => prog(d, 'coffee') >= 2 },
  { id: 'domino', ch: 1, title: 'دومنو الحاج كامل', at: () => SPOT.domino, atR: 4, goText: 'الحاج كامل بيناديك على ترابيزة الدومنو (★)', par: 600,
    intro: () => [ shot(SPOT.domino, -2.4, 1.1, 3),
      L('sayed', 'اقعد يا طيارة… الدومنو بيعلّم الصبر، والصبر هو اللي بيعمل الرجالة.'),
      L('sayed', 'اللي معاه الدش يفتح أول دور. اللي يخلّص حجارته ياخد نِمر اللي قصاده… متقرّبة لأقرب عشرة، والماتش لـ ٢٥٠.'),
      L('sayed', 'ولو الدور قفل، اللي نِمره أقل ياخد نِمر التاني. والكسبان هو اللي يفتح اللي بعده.'),
      L('sayed', 'العب لوحدك قصادي، أو انت وإسلام قصاد شمس والعربي… اختار.') ],
    start: d => mark(d, 'dom'), text: () => 'اكسب ماتش دومنو (E عند الترابيزة) 🎲', target: () => SPOT.domino,
    update: (dt, d) => prog(d, 'dom') >= 1,
    outro: () => [ L('sayed', 'برافو عليك… إيدك خفيفة زي أبوك الله يرحمه.'), KN('kamel_01_end') ] },

  // ===== الفصل التاني: لقمة العيش =====
  { id: 'rush', ch: 2, title: 'زحمة الضهر', par: 160,
    intro: () => [ L('moallem', 'الضهر جه والقهوة هتتملي! وصّل ٦ طلبات في وردية واحدة.'), L('moallem', 'ولو ٣ زباين مشيوا زعلانين… هتروّح من غير يومية!') ],
    start: d => { mark(d, 'ahwa'); d.jobSeen = false; }, text: d => `وردية واحدة: وصّل ٦ طلبات (${Math.min(prog(d,'ahwa'),6)}/6) من غير ما ٣ يزعلوا`, target: () => modeObj.job ? null : SPOT.counter,
    update: (dt, d) => { if (modeObj.job === 'ahwa') d.jobSeen = true; if (prog(d, 'ahwa') >= 6) return true; if (d.jobSeen && !modeObj.job){ d.failMsg = 'الوردية خلصت قبل ٦ طلبات'; return 'fail'; } } },
  { id: 'wages', ch: 2, title: 'اليومية', reward: 60, par: 40,
    text: () => 'خد يوميتك من المعلم عبده (★)', target: () => npcAt('moallem'), update: talkU('moallem'),
    outro: () => [ shot(npcAt('moallem'), -2.4, 1, 3),
      L('moallem', 'خد يا سيدي… ٦٠ جنيه يوميتك. تعبت النهارده.'),
      L('tayara', 'تسلم يا معلم… هو صحيح فيه ناس عايزة تشتري القهوة؟ سمعت الزباين بيتكلموا.'),
      L('moallem', 'كلام كتير يا ابني… فيه ناس عندها فلوس وفاكرة إن كل حاجة بتتباع.'),
      L('moallem', 'القهوة دي أبويا فتحها، ومش هتتقفل وأنا عايش. روح شوف رزقك.') ] },
  { id: 'rent', ch: 2, title: 'الإيجار', par: 240,
    text: () => `ادفع الإيجار ١٠٠ جنيه للحاج محمود عند البيت (★) · معاك ${egp(hero.money)}`, target: () => npcAt('landlord'),
    action: (p, d) => near(p, npcAt('landlord'), 2.8) ? { text: 'ادفع الإيجار (١٠٠ جنيه)', fn: () => { if (hero.money < 100){ banner(`محتاج ${egp(100 - hero.money)} كمان… اشتغل في القهوة أو العب دومنو`, 'bad', 3); buzz(40); return; } hero.money -= 100; coin(); d.paid = true; } } : null,
    update: (dt, d) => !!d.paid,
    outro: () => [ shot(npcAt('landlord'), 2.4, 1, 3),
      L('landlord', 'بارك الله فيك يا ابني… كنت عارف إنك راجل.'),
      L('landlord', 'بس البيت ده عايز يتظبط شوية. لو حوّشت، جدّده من الترابيزة اللي جوه.') ] },
  { id: 'foul', ch: 2, title: 'عربية الفول', at: () => PL.cart, atR: 6, goText: 'الحاج فتحي بتاع الفول عايزك (★)', par: 200,
    intro: () => [ shot(npcAt('fathi'), 2.4, 1, 3),
      L('fathi', 'إيه يا طيارة! عايز تزوّد دخلك؟ تعالى ساعدني على العربية.'),
      L('fathi', 'الطلب مكتوب فوق كل زبون. الفول في الطبق وعليه اللي طالبه، والطعمية تتقلي لحد ما تحمر… متسيبهاش تتحرق!'),
      L('fathi', 'بيع ٤ طلبات.') ],
    start: d => mark(d, 'foul'), text: d => `اشتغل على عربية الفول (E) وبيع ٤ طلبات (${Math.min(prog(d,'foul'),4)}/4)`, target: () => modeObj.job ? null : SPOT.cart,
    update: (dt, d) => prog(d, 'foul') >= 4, outro: () => [ L('fathi', 'إيدك تتلف في حرير يا طيارة 🧆') ] },
  { id: 'azzouz', ch: 2, title: 'مطعم عزوز', par: 90,
    text: () => 'عزوز صاحب مطعم البيتزا عايز طيّار ديليفري. روحله في شارع المطاعم (★) — بعيد؟ اركب من المحطة 🚏', target: () => SPOT.azzouz,
    update: reachU(() => SPOT.azzouz, 5),
    outro: () => [ shot(npcAt('azzouz'), 2.4, 1, 3),
      L('azzouz', 'انت طيارة؟ اسم على مسمى والله 😂'),
      L('azzouz', 'الموتوسيكل الأحمر ده للديليفري. البيتزا لازم توصل سخنة… وكل ما تتخبط العلبة بتبوظ.'),
      L('azzouz', 'كل طلب ١٢ جنيه، والبقشيش على حسب السرعة.') ] },
  { id: 'pizza3', ch: 2, title: 'أول ديليفري', par: 240,
    start: d => mark(d, 'pizza'), text: d => `وصّل ٣ طلبات بيتزا 🍕 (ابدأ من عند عزوز E) (${Math.min(prog(d,'pizza'),3)}/3)`, target: () => JOB.kind ? null : SPOT.azzouz,
    update: (dt, d) => prog(d, 'pizza') >= 3 },
  { id: 'buyMoto', ch: 2, title: 'موتوسيكل باسمي', par: 600,
    intro: () => [ L('phone', '📱 إسلام: يا طيارة! فيه موتوسيكل مستعمل للبيع قدام القهوة بـ ٣٠٠ جنيه. حوّش واشتريه… مش هتفضل ماشي على رجلك!') ],
    text: () => `اشتري الموتوسيكل المستعمل قدام القهوة (★) · ${egp(hero.money)} / ٣٠٠<br><small>الفلوس: وردية قهوة ☕ · فول 🧆 · بيتزا 🍕 · توكتوك 🛺 · دومنو 🎲</small>`, target: () => heroMoto.pos,
    update: () => SAVE.owned.moto, outro: () => [ L('tayara', 'أخيراً… موتوسيكل باسمي! 🏍️ اركبه يا طيارة.') ] },
  { id: 'shadiaRide', ch: 2, title: 'توصيلة للكورنيش', par: 120,
    intro: () => [ L('phone', '📱 شادية: طيارة؟ أنا شادية… الشمس هتغرب كمان شوية وعايزة أصوّرها من على الكورنيش.'), L('phone', '📱 شادية: ممكن توصلني بالموتوسيكل؟ هستناك قدام البيت.') ],
    start: d => { d.picked = false; d.t = 0; showIdle(shadiaD, PL2.shadiaOut.x, PL2.shadiaOut.z); },
    text: d => d.picked ? `وصّل شادية للكورنيش (★) قبل الغروب 🌅 · ${Math.max(0, Math.ceil(90 - d.t))} ثانية` : 'اركب موتوسيكلك وروح لشادية قدام بيتها (★)',
    target: d => d.picked ? V(150, 0, 150) : PL2.shadiaOut,
    update(dt, d){
      if (!d.picked){ if (hero.veh && hero.veh.type === 'moto' && near(hero.veh.pos, PL2.shadiaOut, 6)){ d.picked = true; ST2.idle.delete(shadiaD); shadiaD.root.visible = false; banner('شادية ركبت ورا 🏍️', 'ok', 2); } return; }
      d.t += dt; if (d.t > 90){ d.failMsg = 'الشمس غربت قبل ما توصل'; return 'fail'; }
      return near(heroAt(), V(150, 0, 150), 9);
    },
    cleanup: () => { ST2.idle.delete(shadiaD); shadiaD.root.visible = false; },
    outro: () => [ { do: () => { if (hero.veh) exitVehicle(true); heroTo(148, 151); showActor(shadiaD, 150.4, 152.4); applyTimeOfDay(18.2); } }, camAt(143, 2.2, 146, 152, 1.6, 158, 1.4),
      L('shadia', 'بص… بص على البحر! مفيش حاجة في الدنيا أحلى من غروب إسكندرية.'),
      L('tayara', 'أنا بقالي عمري هنا… عمري ما وقفت أبص كده.'),
      L('shadia', 'عشان انت دايماً جري… بين القهوة والفول والبيتزا. استنى ثانية… (تِك) خدتلك صورة 📸'),
      L('tayara', 'صورة ليّا أنا؟ هتعمليها إيه؟'),
      L('shadia', 'هعلّقها… «طيارة وهو واقف مكانه لأول مرة» 😂'), { do: () => hideActor(shadiaD) } ] },
  { id: 'gas', ch: 2, title: 'الأنبوبة', par: 180,
    intro: () => [ shot(npcAt('landlord'), 2.4, 1, 3), L('landlord', 'يا طيارة يا ابني… الأنبوبة خلصت وأم شادية عايزة تطبخ.'), L('landlord', 'هات واحدة مليانة من المستودع اللي عند السوق. وبالراحة! الأنبوبة مش كورة.') ],
    start: d => { addPickup(PL2.market); d.dmg0 = null; },
    text: d => allPicked() ? 'رجّع الأنبوبة لبيت شادية (★) — بالراحة، لو خبطت جامد هتقع!' : 'روح المستودع عند السوق وخد الأنبوبة (★)',
    target: d => allPicked() ? PL2.shadiaOut : nearestPick(),
    update(dt, d){
      if (!allPicked()) return;
      if (hero.veh){ if (d.dmg0 === null || d.veh !== hero.veh){ d.veh = hero.veh; d.dmg0 = hero.veh.dmg || 0; } if ((hero.veh.dmg || 0) - d.dmg0 > 20){ d.failMsg = 'الأنبوبة وقعت واتدحرجت 😬'; return 'fail'; } }
      return near(heroAt(), PL2.shadiaOut, 4);
    },
    outro: () => [ { do: () => { if (hero.veh) exitVehicle(true); showActor(shadiaD, PL2.shadiaOut.x, PL2.shadiaOut.z - .6); } }, shot(PL2.shadiaOut, 2.4, 1.1, 3.2),
      L('mother', 'تسلم إيدك يا ابني… ربنا يكرمك ويجعلك من نصيب اللي تستاهلك.'),
      L('shadia', 'ماما!! 😳'), L('tayara', 'آمين يا رب… آمين 😅'),
      { do: () => hideActor(shadiaD) },
      // meanwhile: يوسف looks for work all day, and nobody takes him
      hideHero(), { do: () => { showActor(youssefD, 33, 40.5); } }, camAt(26, 2.6, 46, 31, 1.4, 40, 1.4), KN('kamel_02_y1'),
      { walk: [youssefD, 25.5, 40, 2] }, L('youssef', 'يا معلم عبده… محتاج حد يشيل صواني؟ أنا سريع والله.'), L('moallem', 'مفيش مكان يا ابني… طيارة مالي الدنيا.'),
      { do: () => showActor(youssefD, 128, -4) }, camAt(122, 2.6, 2, 127, 1.4, -5, 1.2), L('youssef', 'يا أسطى رضا… أي حاجة، حتى أمسح التكاتك.'), L('mechanic', 'تعالى بكرة يا يوسف… بكرة.'),
      { do: () => showActor(youssefD, 118, 41) }, camAt(114, 2.6, 47, 119, 1.4, 40, 1.2), KN('kamel_02_y2'),
      { do: () => { showActor(youssefD, PL2.wall.x, PL2.wall.z); youssefD.forceMove = 'sit'; } }, camAt(55, 2.2, 146, 60, 1.1, 153, 1.6), KN('kamel_02_y3'), KN('kamel_02_end'),
      { do: () => { hideActor(youssefD); SCENE.hideHero = false; } } ] },

  // ===== الفصل التالت: العربي =====
  { id: 'arabiArrives', ch: 3, title: 'العرض', at: () => PL.cafeOut, atR: 9, goText: 'ارجع القهوة (★) — فيه عربية حمرا واقفة قدامها', par: 30,
    intro: () => [ { do: () => { heroTo(19, 38.5); if (arabiCar){ arabiCar.mesh.visible = true; arabiCar.pos.set(70, 0, 51); arabiCar.yaw = -Math.PI / 2; arabiCar.mesh.rotation.set(0, -Math.PI / 2, 0); tween(3, k => { const e = 1 - (1 - k) * (1 - k); arabiCar.pos.set(70 - 44 * e, 0, 51 - 7.8 * Math.min(1, e * 1.6)); }); horn(); } } },
      camAt(16, 2.4, 36.5, 30, 1.2, 46, 1.4), { wait: 2.2 }, { do: () => showActor(enemyD, 25.5, 41.4) }, { walk: [enemyD, 22, 39.6, 1.8] },
      L('arabi', 'مساء الفل يا قصر الملوك 😎 العربية دي؟ هدية صغيرة من أبويا.'),
      L('arabi', 'الحاج العربي الكبير عايز يشتري القهوة… والشارع كله لحد البحر. هيبني برج.'),
      L('moallem', 'القهوة دي مش للبيع يا عربي. لا لأبوك ولا لغيره.'),
      L('arabi', 'كله بيتباع يا معلم… السؤال بكام بس. وانت يا صبي القهوة… هتشتغل عندنا في البرج، تمسح السلالم 😂'),
      L('tayara', 'أنا مش للبيع برضه يا عربي.'),
      L('arabi', 'هنشوف يا طيارة… هنشوف.'), { do: () => hideActor(enemyD) } ],
    update: () => true },
  { id: 'villaFlash', ch: 3, title: 'جوه الفيلا', par: 20,
    intro: () => [ { flash: true }, hideHero(), { do: () => { showActor(fatherD, VILLA.cx - 2, VILLA.cz + 2); showActor(enemyD, VILLA.cx + .4, VILLA.cz + 4.6); fatherD.faceYaw = Math.PI * .8; } },
      camAt(VILLA.cx - 7, 2.8, VILLA.cz + 13, VILLA.cx - 1, 1.4, VILLA.cz + 3, 0), KN('kamel_03_f1'),
      L('father', 'رجعت؟ … ورجعت إيدك فاضية زي كل مرة.'),
      L('arabi', 'يا بابا المعلم عبده دماغه ناشفة… مش راضي يبيع.'),
      L('father', 'خمسة وعشرين سنة وانت مش نافع في حاجة غير العربيات والسهر.'),
      L('father', 'الواد اللي شغال على القهوة ده… طيارة… أجدع منك.'),
      KN('kamel_03_f2'), { do: () => { hideActor(fatherD); hideActor(enemyD); } }, { flash: false } ],
    update: () => true },
  { id: 'spill', ch: 3, title: 'صينية الشاي', at: () => PL.cafeIn, atR: 9, goText: 'المعلم عايزك (★)', par: 90,
    intro: () => [ { do: () => { heroTo(19.4, 36); parkArabiMoto(); showActor(enemyD, 31, 42.5); } }, { cam: [21, 2.3, 34.2], look: [26.5, 1.3, 42], t: 1.2 },
      { walk: [enemyD, 25.2, 40.2, 2.4] },
      L('arabi', 'شاي يا قهوة! ولا هنا الشاي بالحجز؟ 😏'),
      L('moallem', 'يا طيارة! خد الصينية للأستاذ العربي… على حسابي، خلينا نصفّي النفوس.'),
      { do: () => { trayGroup.visible = true; } }, { walk: [hero.d, 24.4, 41.6, 1.8] },
      { do: () => { trayGroup.visible = false; clink(); noise(.3, 900, .5); shake = .35; puff(V(25.6, .8, 43.3), .8); say(aEnt, '😱', 1.5); } }, shot(V(25.6, 0, 43.3), 2.2, .6, 2.6, .6),
      L('arabi', 'انت عملت إيه!!! الشاي على القميص الإيطالي!'),
      L('tayara', 'والله غصب عني يا عربي… رجلي اتكعبلت.'),
      L('arabi', 'غصب عنك؟! أبويا بيقولي كل يوم إنك أجدع مني… أهو الأجدع دلق الشاي عليّا!'),
      L('arabi', 'اسمع يا طيارة… من النهارده هتشوفني في كل حتة تروحها. مش هسيبك!'),
      L('moallem', 'اجري يا طيارة! الواد ده اتجنن!') ],
    start: d => { arabiAppear(sidewalkNear(V(27, 0, 40.5), 3)); enemy.cd = 1.2; }, text: () => 'اهرب من العربي (ابعد عنه لحد ما يتوه) أو وقّعه في خناقة 👊', target: () => null,
    update: () => !enemy.active || enemy.d.downT > 0,
    outro: () => [ L('phone', '📱 إسلام: سمعت اللي حصل! العربي ده أبوه مطلّع عينه… وهو بيطلّعها عليك. خلي بالك منه.') ] },
  { id: 'flatTire', ch: 3, title: 'الكاوتش', at: () => SPOT.azzouz, atR: 7, goText: 'ارجع لعزوز (★)', reward: 40, spawn: PL.azz, par: 90,
    intro: () => [ { do: () => { heroTo(PL.azz.x, PL.azz.z); showActor(enemyD, 126, 44); } }, shot(pizzaMoto.pos, -3, 1, 3.4),
      L('arabi', 'إيه يا طيارة؟ الكاوتش نايم؟ 😂 حظك وحش!'),
      L('tayara', 'انت اللي خرمته يا عربي؟!'),
      L('arabi', 'أثبت! ولو عايزني… تعالى خدني.') ],
    start: d => { d.enemyBusy = true; arabiAppear(sidewalkNear(V(126, 0, 44), 2)); mark(d, 'edown'); }, text: () => 'العربي خرّم الكاوتش! الحقه ووقّعه 👊', target: () => enemy.pos,
    update: (dt, d) => { if (!enemy.active) arabiAppear(sidewalkNear(heroAt(), 25)); return prog(d, 'edown') >= 1; },
    outro: () => [ { do: () => { enemy.active = false; showActor(enemyD, enemy.pos.x, enemy.pos.z); enemyD.downT = 4; } }, shot(enemy.pos, 2.2, 1, 3),
      L('arabi', 'ماشي يا طيارة… دي جولة بس.'), L('azzouz', 'سيبك منه. خد ٤٠ جنيه تمن الكاوتش… وكمّل شغل.') ] },
  raceM({ id: 'race', ch: 3, title: 'سباق الكورنيش', reward: 80, at: () => PL.cafeOut, atR: 8, goText: 'العربي واقف قدام القهوة… ومستنيك (★)', goal: V(150, 0, 144), goalName: 'الكورنيش', time: 50, par: 70,
    path: [[30, 51], [141, 51], [141, 141], [150, 141]], taunt: 'هتاكل تراب يا طيارة!',
    intro: () => [ { do: () => showActor(enemyD, 27, 41) }, shot(V(27, .15, 41), 2.4, 1, 3.2),
      L('arabi', 'عملت فيها صاحب موتوسيكل؟ 😏 العربية الحمرا في التوكيل… هسابقك بالموتوسيكل الأزرق وبرضه هكسبك.'),
      L('arabi', 'نتسابق للكورنيش. اللي يخسر يشيل الصينية قدام الحتة كلها.'), L('tayara', 'اتفقنا… جهّز نفسك للتراب.') ],
    outro: () => [ L('arabi', 'ماشي… المرة الجاية مش هسيبك!') ] }),
  { id: 'flirt', ch: 3, title: 'العربي وشادية', at: () => PL2.shadiaOut, atR: 12, goText: 'فيه دوشة قدام بيت شادية (★)', par: 90,
    intro: () => [ { do: () => { heroTo(-20, 92); showActor(shadiaD, PL2.shadiaOut.x, PL2.shadiaOut.z); showActor(enemyD, -33.2, 89.4); } }, camAt(-25, 2.6, 96, -34, 1.4, 88, 1.2),
      L('arabi', 'تيجي نلف بالعربية الحمرا يا قمر؟ الكورنيش كله هيبص علينا.'),
      L('shadia', 'لا شكراً… أنا بركب ترام.'),
      L('arabi', 'ترام؟! ده أنا أشتريلك الترام باللي فيه 😎'),
      L('tayara', 'سيبها في حالها يا عربي.'),
      L('arabi', 'وانت مالك يا صبي القهوة؟ … ولا الحكاية فيها حاجة؟ 😏'), { do: () => hideActor(shadiaD) } ],
    start: d => { d.enemyBusy = true; arabiAppear(sidewalkNear(V(-33, 0, 89), 2)); mark(d, 'edown'); }, text: () => 'العربي مش راضي يمشي… وقّعه 👊', target: () => enemy.pos,
    update: (dt, d) => { if (!enemy.active) arabiAppear(sidewalkNear(heroAt(), 20)); return prog(d, 'edown') >= 1; },
    outro: () => [ { do: () => { enemy.active = false; showActor(enemyD, enemy.pos.x, enemy.pos.z); enemyD.downT = 4; showActor(shadiaD, PL2.shadiaOut.x, PL2.shadiaOut.z); } }, shot(PL2.shadiaOut, 2.4, 1.1, 3.4),
      L('arabi', 'دي مش آخرتها يا طيارة…'),
      L('shadia', 'شكراً يا طيارة… بس مكانش لازم تتخانق عشاني.'),
      L('tayara', 'أنا ماتخانقتش عشانك… اتخانقت عشان… عشان الحتة يعني 😅'),
      L('shadia', 'آه… الحتة 😄 ماشي يا بتاع الحتة.'), { do: () => { hideActor(shadiaD); hideActor(enemyD); } } ] },
  { id: 'reno1', ch: 3, title: 'نوّر البيت', par: 600,
    text: () => `جدّد البيت أول مرة (٢٥٠ جنيه) من الترابيزة جوه البيت 🏠 (★) · ${egp(hero.money)} / ٢٥٠`, target: () => HOUSE.inside ? HOUSE_SPOTS.table : SPOT.house,
    update: () => SAVE.house >= 1, outro: () => [ L('landlord', 'ما شاء الله يا طيارة! البيت نوّر… ربنا يكرمك يا ابني.'), KN('kamel_03_end') ] },

  // ===== الفصل الرابع: الساندوتش الطاير =====
  { id: 'recruit', ch: 4, title: 'الشغلانة', par: 20,
    intro: () => [ hideHero(), { do: () => { applyTimeOfDay(21.5); showActor(youssefD, PL2.wall.x, PL2.wall.z); youssefD.forceMove = 'sit'; showActor(leatherD, PL2.wall.x - 7, PL2.wall.z - 3); } },
      camAt(54, 2.2, 146, 60, 1.1, 153, 0), KN('kamel_04_y1'), { walk: [leatherD, PL2.wall.x - 1.2, PL2.wall.z - .6, 1.6] },
      L('leather', 'انت يوسف؟ … قاعد هنا كل يوم جعان.'),
      L('leather', 'عايز تشتغل؟ الشغل عندنا سهل… وفلوسه حلوة.'),
      L('youssef', 'شغل إيه بالظبط؟ أنا مبعرفش أعمل حاجة غير إني أجري… وأهزر 😅'),
      L('leather', 'ما هو الجري هو الشغل. متسألش كتير… هتعرف بكرة.'),
      KN('kamel_04_y2'), KN('kamel_04_1'), { do: () => { hideActor(youssefD); hideActor(leatherD); SCENE.hideHero = false; } } ],
    update: () => true },
  { id: 'snatch', ch: 4, title: 'الساندوتش', at: () => PL.cart, atR: 8, goText: 'روح عربية الفول (★)', spawn: V(36, .15, 35.5), par: 60,
    intro: () => [ { do: () => showActor(youssefD, 33.6, 33.8) }, shot(V(34, .15, 33), 2.6, 1.1, 3.4),
      L('fathi', 'يوسف إبراهيم!! حط الساندوتش ده مكانه!'), L('youssef', 'ده ساندوتش واحد يا حاج… مش هتفرق 😅'), L('tayara', 'يوسف! استنى عندك!') ],
    start: d => { d.noThief = true; thiefStart(); }, text: () => 'يوسف خطف ساندوتش! الحقه وامسكه (النقطة الحمرا) 🏃', target: () => thief.pos,
    update: (dt, d) => { if (thief.caught) return true; if (!thief.active){ d.failMsg = 'يوسف هرب'; return 'fail'; } },
    outro: () => [ { do: () => { showActor(youssefD, thief.pos.x, thief.pos.z); } }, shot(thief.pos, 2.2, 1, 3),
      L('youssef', 'خلاص يا طيارة والله جعان… مش هعملها تاني 😅'),
      L('fathi', 'كل يوم نفس الكلمة! أنا هكتب يافطة وأعلقها:'),
      L('fathi', '«ممنوع دخول يوسف إبراهيم» 🚫') ] },
  { id: 'pizzaThief', ch: 4, title: 'البيتزا الطايرة', at: () => SPOT.azzouz, atR: 7, goText: 'عزوز عايزك في المطعم (★)', spawn: PL.azz, par: 60,
    intro: () => [ { do: () => { heroTo(PL.azz.x - 2, PL.azz.z + .8); pizzaBox.visible = true; showActor(youssefD, 113.4, 44.6); } }, shot(pizzaMoto.pos, 3, 1, 3.4),
      { do: () => { pizzaBox.visible = false; noise(.1, 1400, .3); } },
      L('azzouz', 'البيتزا!! يوسف خد البيتزا من على الموتوسيكل!'), L('youssef', 'دي هتبرد يا عزوز… أنا بنقذها 😂') ],
    start: d => { d.noThief = true; thiefStart(V(113.4, .15, 44.6), 'بيتزا ببلاش 🍕', '🚨 يوسف خطف البيتزا! الحقه'); }, text: () => 'يوسف خطف البيتزا! الحقه (النقطة الحمرا) 🍕', target: () => thief.pos,
    update: (dt, d) => { if (thief.caught) return true; if (!thief.active){ d.failMsg = 'يوسف هرب بالبيتزا'; return 'fail'; } },
    outro: () => [ L('azzouz', 'حتى البيتزا يا يوسف؟! اليافطة هتتعلق عندي كمان.'), L('azzouz', 'والمحلات كلها هتعمل زيي… شوف بنفسك.') ] },
  { id: 'cameraThief', ch: 4, title: 'الكاميرا', at: () => V(150, .15, 150), atR: 12, goText: 'شادية بتصوّر على الكورنيش… عدّي عليها (★)', par: 60,
    intro: () => [ { do: () => { heroTo(146, 148); showActor(shadiaD, 151, 152.2); showActor(youssefD, 158, 150); } }, camAt(142, 2.4, 145, 152, 1.3, 152, 1.2),
      L('shadia', 'طيارة! تعالى شوف الصورة دي… البحر النهارده رايق.'),
      { walk: [youssefD, 151.6, 151.4, 5] }, { do: () => { noise(.12, 1500, .3); say(yEnt, '📸😅', 1.5); } },
      L('shadia', 'الكاميرا!!! يوسف خد الكاميرا!'), L('youssef', 'دي كاميرا؟ أنا افتكرتها علبة كشري 😅'), { do: () => hideActor(shadiaD) } ],
    start: d => { d.noThief = true; thiefStart(V(151.6, .15, 151.4), 'دي هتجيب كام دي؟ 📸', '🚨 يوسف خطف كاميرا شادية! الحقه'); }, text: () => 'يوسف خطف كاميرا شادية! الحقه (النقطة الحمرا) 📸', target: () => thief.pos,
    update: (dt, d) => { if (thief.caught) return true; if (!thief.active){ d.failMsg = 'يوسف هرب بالكاميرا'; return 'fail'; } },
    outro: () => [ { do: () => showActor(youssefD, thief.pos.x, thief.pos.z) }, shot(thief.pos, 2.2, 1, 3),
      L('youssef', 'خد يا عم خد… أنا مش عارف أصوّر بيها أصلاً 😅'),
      L('tayara', 'يوسف… انت بتعمل كده ليه؟ انت مكنتش كده.'),
      L('youssef', '(سكت، وبص في الأرض)… أنا لازم أمشي.'), { do: () => hideActor(youssefD) },
      L('tayara', 'فيه حاجة غلط… هامشي وراه.') ] },
  { id: 'tail', ch: 4, title: 'ورا يوسف', spawn: V(124, .15, 41.5), par: 120,
    intro: () => [ L('tayara', 'يوسف ماشي ناحية البحر… وبيبص وراه كل شوية. رايح فين؟'), L('tayara', 'هامشي وراه من بعيد… من غير ما يشوفني.') ],
    start: d => { d.noThief = true; d.path = [[136, 40.6], [240.6, 40.6], [240.6, 126.5], [PORT.door.x, 126.5]]; d.tp = V(136, .15, 40.6); d.i = 1; d.warn = 0; d.lost = 0; d.lookT = 5; youssefD.root.visible = true; youssefD.downT = 0; youssefD.root.position.copy(d.tp); },
    text: d => `امشي ورا يوسف من بعيد (١٠–٤٠ متر) 👀 · المسافة ${Math.round(d.dist || 0)} م · اتشافت ${d.warn || 0}/3`, target: d => d.tp,
    update(dt, d){
      const p = d.tp, [tx, tz] = d.path[Math.min(d.i, d.path.length - 1)], dx = tx - p.x, dz = tz - p.z, dd = Math.hypot(dx, dz), s = 3.1*dt; let vx = 0, vz = 0;
      if (d.i < d.path.length){ if (dd <= s){ p.x = tx; p.z = tz; d.i++; } else { vx = dx/dd*3.1; vz = dz/dd*3.1; p.x += vx*dt; p.z += vz*dt; } }
      youssefD.root.position.set(p.x, groundY(p.x, p.z), p.z); animDoll(youssefD, vx, vz, dt, runTime);
      const f = heroAt(), dist = Math.hypot(f.x - p.x, f.z - p.z); d.dist = dist;
      if (dist < 4){ d.failMsg = 'يوسف شافك'; return 'fail'; }
      d.lookT -= dt; if (d.lookT <= 0){ d.lookT = 3 + Math.random()*3; say(yEnt, '🤨', 1.2); if (dist < (hero.veh ? 18 : 10)){ d.warn++; banner(`👀 يوسف كان هيشوفك! (${d.warn}/3)`, 'bad', 2); buzz(40); if (d.warn >= 3){ d.failMsg = 'يوسف شافك'; return 'fail'; } } }
      if (dist > 55){ d.lost += dt; if (d.lost > 6){ d.failMsg = 'ضيّعت يوسف'; return 'fail'; } } else d.lost = 0;
      return d.i >= d.path.length;
    },
    cleanup: () => { youssefD.root.visible = false; },
    outro: () => [ { do: () => { heroTo(246, 128); showActor(youssefD, PORT.door.x - 1.5, 124); showActor(wantedD, PORT.door.x + 1.5, 123.4); } }, camAt(250, 2.6, 131, PORT.door.x, 1.3, 123.5, 1.2),
      L('shams', 'اتأخرت.'),
      L('youssef', 'كنت بجيب ساندوتش… عشانك والله يا أسطى 😅'),
      L('shams', 'بكرة. الشنطة دي تروح الكورنيش. ولا كلمة لحد.'),
      L('youssef', 'حاضر يا أسطى… (وقعت منه ورقة)'),
      { do: () => { hideActor(youssefD); hideActor(wantedD); } },
      L('tayara', 'شمس؟! … ده مخزن في الميناء. وشمس ده مين أصلاً؟') ] },
  { id: 'paper', ch: 4, title: 'الورقة', par: 40,
    start: d => addPickup(V(PORT.door.x - 1, .15, 125)), text: d => `خد الورقة اللي وقعت من يوسف (★) ${nPick(d, 1)}`, target: () => nearestPick(), update: allPicked,
    outro: () => [ L('tayara', 'ليستة… محلات الحتة ومواعيد قفلها… وعنوان فيلا الحاج العربي!'), L('tayara', 'لازم أحكي لإسلام.') ] },
  { id: 'islam', ch: 4, title: 'الحكاية', par: 120,
    text: () => 'روح احكي لإسلام على ترابيزة الدومنو (★)', target: () => SPOT.domino, update: reachU(() => SPOT.domino, 2.8),
    outro: () => [ shot(SPOT.domino, 2.4, 1.1, 3),
      L('islam', 'شمس؟! ده كان أشطر ميكانيكي في المنطقة… الحتة كلها كانت بتصلّح عنده.'),
      L('islam', 'وبعدين اختفى سنين. واللي بيقولوه إنه رجع… بس مش زي ما كان. ويوسف الغلبان ماشي وراه عشان اللقمة.'),
      { do: () => setNoEntryShown(1) }, { cam: [16, 3.6, 46], look: [21, 2, 36], t: 1.6 },
      L('islam', 'وبص حواليك يا طيارة… كل محل في الحتة علّق اليافطة 😂 «ممنوع دخول يوسف إبراهيم»!') ] },
  { id: 'ringPhoto', ch: 4, title: 'الصورة', par: 120,
    intro: () => [ L('phone', '📱 شادية: طيارة! تعالى بسرعة… لقيت حاجة غريبة في الصور اللي صورتها على الكورنيش.') ],
    text: () => 'روح لشادية عند بيتها (★)', target: () => PL2.shadiaOut, update: reachU(() => PL2.shadiaOut, 2.8),
    outro: () => [ { do: () => showActor(shadiaD, PL2.shadiaOut.x, PL2.shadiaOut.z - .6) }, shot(PL2.shadiaOut, 2.4, 1.1, 3.2),
      L('shadia', 'بص هنا… الصورة دي يوم ما يوسف خطف الكاميرا. ورا يوسف… الراجل ده.'),
      L('shadia', 'لابس خاتم كبير… عليه شمس دهب.'),
      L('tayara', 'خاتم الشمس… ده هو. ده شمس!'),
      L('shadia', 'مين شمس؟'), L('tayara', 'واحد… الحتة كلها لسه مش عارفة هو مين. بس هتعرف.'),
      { do: () => hideActor(shadiaD) }, KN('kamel_04_end') ] },

  // ===== الفصل الخامس: شمس =====
  { id: 'shamsF1', ch: 5, title: 'الميكانيكي', par: 20,
    intro: () => [ { flash: true }, hideHero(), { do: () => { showActor(wantedD, SPOT.workshop.x - 2, SPOT.workshop.z - 1); showActor(fatherD, SPOT.workshop.x + 1.4, SPOT.workshop.z + .4); } },
      camAt(SPOT.workshop.x - 6, 2.4, SPOT.workshop.z + 6, SPOT.workshop.x, 1.2, SPOT.workshop.z - 1, 0), KN('kamel_05_f1'),
      L('father', 'يا أسطى شمس… معاييش فلوس النهارده.'),
      L('shams', 'خد موتوسيكلك يا حاج… ولما ربنا يفرجها.'),
      { do: () => { hideActor(wantedD); hideActor(fatherD); } }, { flash: false } ],
    update: () => true },
  { id: 'poster', ch: 5, title: 'البوستر', at: () => PL.cafeOut, atR: 10, goText: 'فيه دوشة قدام القهوة (★)', par: 20,
    intro: () => [ { do: () => { setPostersShown(true); heroTo(22, 38.6); } }, shot(npcAt('officer'), 2.4, 1, 3.2),
      L('police', 'يا جماعة! المطلوب ده اسمه شمس… عصابة سرقة وتهريب.'),
      L('police', 'المكافأة ١٠٠٠ جنيه لأي حد يساعد في القبض عليه.'),
      L('tayara', 'هو ده… الراجل اللي في صورة شادية. خاتم الشمس.') ],
    update: () => true },
  { id: 'shamsF2', ch: 5, title: 'الديون', par: 20,
    intro: () => [ { flash: true }, hideHero(), { do: () => { showActor(wantedD, SPOT.workshop.x, SPOT.workshop.z - 1); showActor(leatherD, SPOT.workshop.x + 2.2, SPOT.workshop.z + 1.4); } },
      camAt(SPOT.workshop.x - 5, 2.4, SPOT.workshop.z + 6, SPOT.workshop.x + 1, 1.2, SPOT.workshop.z, 0), KN('kamel_05_f2'),
      L('leather', 'الفلوس يا شمس… آخر مرة بنقولها بالذوق.'),
      L('shams', 'استنوا عليا شهر… الورشة هتكبر وهسدد كل حاجة.'),
      L('leather', 'الورشة؟ الورشة بقت بتاعتنا يا أسطى.'),
      { do: () => { hideActor(wantedD); hideActor(leatherD); } }, { flash: false } ],
    update: () => true },
  { id: 'clues', ch: 5, title: 'الأدلة', par: 200,
    start: () => { addPickup(V(219, .15, -7.4)); addPickup(V(147, .15, -47.6)); addPickup(V(153, .15, 151.6)); },
    text: d => `دوّر على ٣ أدلة: عند الملعب، والسوق، والكورنيش (النقط الصفرا) ${nPick(d, 3)}`, target: () => nearestPick(), update: allPicked,
    outro: () => [ L('tayara', 'ورق عربيات… ونِمر متقطعة… ورسومات لأرض على البحر. كله بيروح لورشة شمس.') ] },
  { id: 'nightWorkshop', ch: 5, title: 'الورشة بالليل', par: 200,
    text: () => isNight() ? 'روح ورشة شمس (★) واتسحب من غير ما حد يشوفك 🌙' : 'لازم تروح الورشة بالليل 🌙 — نام في البيت لحد ٩ بالليل، أو روح هناك واستنى.', target: () => SPOT.workshop,
    action: waitNight(() => SPOT.workshop), update: () => isNight() && near(heroAt(), SPOT.workshop, 9),
    outro: () => [ { do: () => { heroTo(250, 84.5); showActor(wantedD, 263, 89.4); showActor(youssefD, 268, 90.6); } }, { cam: [252, 2.6, 84], look: [262, 1.3, 89.4], t: 1.2 },
      L('shams', 'البضاعة تطلع من الميناء على اللانش. الليلة.'),
      L('shams', 'يوسف. عينك على الشارع.'), L('youssef', 'حاضر يا أسطى… عيني على الشارع، والتانية على الساندوتشات 😅'),
      { do: () => { hideActor(wantedD); hideActor(youssefD); } },
      L('tayara', 'لازم أصوّر الحاجات اللي هناك قبل ما يرجعوا.') ] },
  { id: 'evidence', ch: 5, title: 'الصور', par: 90,
    start: () => { addPickup(V(255.4, .15, 88.6)); addPickup(V(272.6, .15, 88.6)); }, text: d => `صوّر الدليلين 📸 (النقط الصفرا) ${nPick(d, 2)}`, target: () => nearestPick(), update: allPicked,
    outro: () => [ L('youssef', '🎵 (صفّارة عالية)'), L('shams', 'مين هناك؟! الحقوه!'), L('tayara', 'يلا يا طيارة… اجري!') ] },
  { id: 'shamsF3', ch: 5, title: 'ليلة الميناء', par: 20,
    intro: () => [ { flash: true }, hideHero(), { do: () => { applyTimeOfDay(23); showActor(wantedD, PL2.pier.x, PL2.pier.z + 6); showActor(leatherD, PL2.pier.x + .4, PL2.pier.z + 9); } },
      camAt(PL2.pier.x - 7, 3, PL2.pier.z + 1, PL2.pier.x, 1.2, PL2.pier.z + 7, 0), KN('kamel_05_f3'),
      L('leather', 'شيل الصندوق ده من اللانش… ومتسألش فيه إيه.'),
      L('shams', '(ساكت… وشال الصندوق)'),
      KN('kamel_05_f4'), { do: () => { hideActor(wantedD); hideActor(leatherD); } }, { flash: false } ],
    update: () => true },
  { id: 'checkpoints', ch: 5, title: 'الكماين', reward: 150, spawn: PL.ws, par: 120,
    intro: () => [ L('police', '📱 الظابط: طيارة؟ عرفت إن معاك أدلة. البوليس عامل كماين في الطرق… لو وقفوك بيها هيفتكروك منهم!'),
      L('police', 'تعالى القسم جنب القهوة (★) من غير ما تعدي على أي كمين (النقط الحمرا والزرقا على الخريطة).') ],
    start: d => { addCheckpoint(192, 48); addCheckpoint(96, 48); addCheckpoint(144, 96); d.grace = 2; },
    text: () => 'وصّل الأدلة للظابط جنب القهوة (★)… ولف من بعيد عن الكماين 🚓', target: () => PL.police,
    update(dt, d){ d.grace -= dt; const f = heroAt(); if (d.grace <= 0 && checkpoints.some(c => near(f, c.pos, c.r))){ d.failMsg = 'الكمين وقفك'; return 'fail'; } return near(f, PL.police, 5); },
    outro: () => [ shot(npcAt('officer'), 2.4, 1, 3.2), L('police', 'الأدلة دي تقيلة يا طيارة… برافو عليك.'), L('police', 'بس من غير شمس نفسه منقدرش نعمل حاجة. خليك صاحي.') ] },
  { id: 'sighting', ch: 5, title: 'شمس في السوق', par: 90,
    intro: () => [ L('police', '📱 الظابط: شمس اتشاف في السوق دلوقتي! الحقه قبل ما يختفي!') ],
    start: () => { spawnWanted(); wanted.pos.set(148, .15, -47.6); }, text: () => 'الحق شمس في السوق (النقطة الحمرا) وامسكه 🏃', target: () => wanted.pos,
    update: () => !!ST2.ev.arrest,
    outro: () => [ { do: () => { wanted.active = false; showActor(wantedD, wanted.pos.x, wanted.pos.z); heroTo(wanted.pos.x + 1.4, wanted.pos.z + .6); } }, shot(wanted.pos, 2.2, 1, 3),
      L('shams', 'طيارة بتاع القهوة.'),
      L('shams', 'الأرض اللي على البحر دي… بتاعتي. والبرج اللي العربي عايز يبنيه؟ ستارة. ومن وراها أنا.'),
      L('tayara', 'يعني الحاج العربي شغال معاك؟!'),
      L('shams', 'هو لسه مايعرفش.'),
      { do: () => { flash(); thwack(); shake = .5; hero.d.downT = 2; } }, { fade: () => hideActor(wantedD) },
      L('tayara', 'آه… هرب. بس دلوقتي عرفت هو عايز إيه.') ] },
  { id: 'awning', ch: 5, title: 'التندة', par: 70,
    intro: () => [ { do: () => { applyTimeOfDay(22); heroTo(20, 38); awningFire(true); } }, camAt(14, 3, 40, 18, 3.4, 23, 1.2),
      L('crowd', 'الحقوا!! تندة القهوة بتولع!!'), L('moallem', 'يا طيارة!! الميه! هات جرادل الميه من عند عربية الفول!') ],
    start: d => { awningFire(true); for (const [x, z] of [[37.4, 33.6], [34, 30], [38.4, 29.6]]) addPickup(V(x, .15, z)); d.t = 0; d.got = 0; },
    text: d => `هات ٣ جرادل ميه وطفّي النار 🔥 (${pickups.filter(p => p.got).length}/3) · ${Math.max(0, Math.ceil(75 - d.t))} ثانية`, target: () => nearestPick() || PL.cafeIn,
    update(dt, d){ d.t += dt; const g = pickups.filter(p => p.got).length; while (FIRES.length > 3 - g){ const f = FIRES.pop(); scene.remove(f.g); puff(f.g.position, 1.4); noise(.4, 800, .3); }
      if (allPicked()) return true; if (d.t > 75){ d.failMsg = 'النار مسكت في التندة كلها'; return 'fail'; } },
    cleanup: () => { clearFires(); },
    outro: () => [ { do: () => { awningBurnt(true); } }, shot(PL.cafeIn, -2.2, 1.4, 4),
      L('moallem', 'الحمد لله إنها جت على قد التندة…'),
      L('tayara', 'يا معلم… فيه ورقة متعلقة على العمود.'),
      L('phone', '«سيبوا الأرض اللي على البحر. — ش»'), KN('kamel_05_end') ] },

  // ===== الفصل السادس: الفخ =====
  { id: 'refuseDeal', ch: 6, title: 'الصفقة', par: 20,
    intro: () => [ hideHero(), { do: () => { showActor(fatherD, VILLA.cx - 2, VILLA.cz + 2); showActor(leatherD, VILLA.cx + 1.6, VILLA.cz + 4); } },
      camAt(VILLA.cx - 7, 2.8, VILLA.cz + 13, VILLA.cx, 1.4, VILLA.cz + 3, 0),
      L('leather', 'الحاج العربي… الناس بتاعتي مستعجلة على أرض البحر.'),
      L('father', 'الصفقة اتلغت. عرفت مين اللي ورا الفلوس دي. أنا مبشتغلش مع ناس زيكم.'),
      L('leather', 'انت متأكد يا حاج؟ … الحاجات الغالية بتتحرق بسرعة.'),
      { do: () => { hideActor(fatherD); hideActor(leatherD); SCENE.hideHero = false; } } ],
    update: () => true },
  { id: 'carStolen', ch: 6, title: 'العربية الحمرا', at: () => PL.cafeOut, atR: 10, goText: 'ارجع القهوة (★)', par: 120,
    intro: () => [ hideHero(), { do: () => { applyTimeOfDay(21.5); showroomFire(true); } }, camAt(SHOWROOM.cx - 12, 7, SHOWROOM.cz + 20, SHOWROOM.cx, 3, SHOWROOM.cz - 2, 0), KN('kamel_06_fire'),
      { do: () => { SCENE.hideHero = false; heroTo(19, 38.5); if (arabiCar){ arabiCar.mesh.visible = true; arabiCar.pos.set(26, 0, 43.2); arabiCar.yaw = Math.PI / 2; arabiCar.mesh.rotation.set(0, Math.PI / 2, 0); } showActor(enemyD, 22, 40); } }, camAt(17, 2.4, 36, 27, 1.2, 44, 1.2),
      { do: () => { noise(.3, 200, .5); horn(); } }, L('arabi', 'العربية!!! حد ركب عربيتي!!'), L('tayara', 'اركب يا طيارة… مش هيبعد!') ],
    start: d => { if (!arabiCar) return; d.run = { v: arabiCar, i: 1, path: [[34, 51], [240.6, 51], [240.6, 141], [258, 141], [PORT.door.x, 127]] }; d.far = 0; showroomFire(false); },
    text: d => `الحق العربية الحمرا (النقطة الحمرا) ومتسيبهاش تبعد 🚗 · ${Math.round(d.dist || 0)} م`, target: d => arabiCar ? arabiCar.pos : null,
    update(dt, d){ if (!d.run) return true; const done = carRunStep(d, dt); ST2.d.shamsPos = arabiCar.pos; if (d.dist > 95){ d.far += dt; if (d.far > 7){ d.failMsg = 'العربية اختفت'; return 'fail'; } } else d.far = 0; return done; },
    cleanup: d => { ST2.d.shamsPos = null; hideActor(enemyD); },
    outro: () => [ camAt(PORT.door.x - 8, 3, PORT.door.z + 9, PORT.door.x, 1.3, PORT.door.z - 2, 1.2),
      { do: () => { if (arabiCar){ arabiCar.pos.copy(PORT.inside); arabiCar.mesh.rotation.set(0, Math.PI, 0); } } },
      L('tayara', 'دخلت مخزن الميناء… نفس المخزن اللي يوسف كان رايحه.'), L('tayara', 'لوحدي مش هعرف أعمل حاجة. لازم أستنى.') ] },
  { id: 'papers', ch: 6, title: 'الورق', par: 20,
    intro: () => [ hideHero(), { do: () => { showActor(fatherD, VILLA.cx - 2, VILLA.cz + 2); showActor(enemyD, VILLA.cx + 1.4, VILLA.cz + 5); } },
      camAt(VILLA.cx - 6, 2.6, VILLA.cz + 12, VILLA.cx - 1, 1.3, VILLA.cz + 3, 0),
      L('phone', '📱 صوت ناشف: المعرض اتحرق… والعربية الحمرا عندنا. ولسه.'),
      L('phone', '📱 صوت ناشف: عندنا ورق بإمضتك إنك بتهرّب في عربياتك. يا تكمّل الصفقة… يا الورق ده يروح للبوليس.'),
      L('father', '(قعد على الكرسي… ومردّش)'),
      KN('kamel_06_fear'),
      L('arabi', 'بابا… انت كويس؟'),
      L('father', 'روح يا ابني… روح.'),
      { do: () => { hideActor(fatherD); hideActor(enemyD); SCENE.hideHero = false; } } ],
    update: () => true },
  { id: 'needYou', ch: 6, title: 'نص الليل', par: 200,
    text: () => isNight() ? 'روح البيت (★)… الدنيا ليلت' : 'روح البيت ونام لحد بالليل 🌙 (★)', target: () => SPOT.house,
    action: waitNight(() => SPOT.house, 6), update: () => isNight() && near(heroAt(), SPOT.house, 6),
    outro: () => [ { do: () => { if (hero.veh) exitVehicle(true); applyTimeOfDay(0.2); heroTo(PL2.houseOut.x, PL2.houseOut.z - .4); showActor(enemyD, PL2.houseOut.x + 1.6, PL2.houseOut.z + 2.2); noise(.12, 300, .5); setTimeout(() => noise(.12, 300, .5), 260); } },
      camAt(-18, 2.2, 94, -24, 1.4, 88.6, 1.2),
      L('tayara', 'العربي؟! الساعة ١٢ بالليل… جاي تكمّل الخناقة؟'),
      L('arabi', 'أنا مش جاي أتخانق يا طيارة.'),
      L('arabi', 'أبويا… الراجل اللي الحتة كلها بتخاف منه… شفته النهارده خايف.'),
      KN('kamel_06_2'),
      L('arabi', 'محتاجك.'),
      L('tayara', '… يلا بينا.') ] },
  { id: 'prepare', ch: 6, title: 'الشومة', koFail: true, par: 120,
    intro: () => [ { do: () => { heroTo(PL2.port.x - 8, PL2.port.z + 10); showActor(enemyD, PL2.port.x - 6.5, PL2.port.z + 10.5); } }, camAt(PL2.port.x - 13, 2.4, PL2.port.z + 15, PL2.port.x - 7, 1.2, PL2.port.z + 10, 1.2),
      L('arabi', 'خد دي.'), { do: () => giveStick(true) },
      L('tayara', 'شومة؟! هو احنا رايحين نتخانق ولا نتفسح؟'),
      L('arabi', 'رجالة شمس مش هيقابلونا بالورد. واقفين على باب الميناء.'),
      L('tayara', 'كتف في كتف يا عربي.') ],
    start: d => spawnThugs(d), text: d => `اضرب حرس الميناء مع العربي 👊 الشومة بتوقّعهم أسرع (${(d.thugs||[]).filter(n => n.thugDone).length}/3)`, target: () => null,
    update(dt, d){ if (!d.thugs) return; for (const n of d.thugs){ if (!n.thugDone && (n.state === 'walk' || n.state === 'goto') && !hero.veh){ n.state = 'fight'; n.fightT = 999; } } return d.thugs.every(n => n.thugDone); },
    cleanup: d => clearThugs(d), outro: () => [ L('arabi', 'هاهاها! شفت؟ إحنا الاتنين مع بعض محدش يقف قدامنا.') ] },
  { id: 'nawaRaid', ch: 6, title: 'ليلة النوّة', koFail: true, par: 180,
    intro: () => [ { rain: true }, { do: () => { applyTimeOfDay(1); } }, camAt(PL2.port.x + 10, 5, PL2.port.z + 12, PL2.port.x, 1.5, PL2.port.z - 4, 1.4), KN('kamel_06_nawa'),
      L('arabi', 'نوّة المكنسة… محدش هيسمعنا وسط الرعد ده.'), L('tayara', 'جوه المخزن: الورق الأصلي… ومفتاح عربيتك.') ],
    start: d => { setRain(true); addPickup(V(PORT.shed.x0 + 4, .15, PORT.shed.z0 + 12)); addPickup(V(PORT.shed.x1 - 4, .15, PORT.shed.z0 + 3)); spawnThugs(d); },
    text: d => `ادخل المخزن وهات الورق والمفتاح ${nPick(d, 2)} · رجالة شمس جوه 👊`, target: () => nearestPick(), update: allPicked,
    cleanup: d => clearThugs(d),
    outro: () => [ L('tayara', 'الورق أهو… بس ده نسخة! فين الأصل؟'),
      { do: () => { shamsLaunch.visible = true; shamsLaunch.position.set(PIER.x1 + 4, -.9, 168); } }, camAt(PL2.pier.x - 6, 3.2, PL2.pier.z - 6, PL2.pier.x + 4, 1, 168, 1.2),
      L('shams', '(بيركب اللانش ومعاه الشنطة) الأصل معايا يا طيارة. الحقني لو تعرف.'),
      L('arabi', 'اللانشات على الرصيف! يلا!') ] },
  { id: 'launchChase', ch: 6, title: 'مطاردة اللانشات', par: 120,
    start: d => { setRain(true); d.boatOK = true; shamsLaunch.visible = true; shamsLaunch.position.set(PIER.x1 + 4, -.9, 168); d.lr = { i: 1, yaw: 0, path: [[PIER.x1 + 6, 190], [250, 214], [200, 232], [170, 238], [150, 300], [180, 360], [240, 380]] }; d.close = 0; d.far = 0; },
    text: d => !(hero.veh && hero.veh.type === 'boat') ? 'اركب لانش من على الرصيف (★)' : `الحق لانش شمس 🚤 · قرّب منه ٣ ثواني (${d.close.toFixed(1)}/3) · ${Math.round(d.dist || 0)} م`,
    target: d => !(hero.veh && hero.veh.type === 'boat') ? launches[0].pos : shamsLaunch.position,
    update(dt, d){
      if (!(hero.veh && hero.veh.type === 'boat')) return;
      const done = launchRunStep(d, dt); ST2.d.shamsPos = shamsLaunch.position;
      if (d.dist < 16){ d.close += dt; if (d.close >= 3) return true; } else d.close = Math.max(0, d.close - dt * .5);
      if (d.dist > 110){ d.far += dt; if (d.far > 6){ d.failMsg = 'لانش شمس اختفى في الضلمة'; return 'fail'; } } else d.far = 0;
      if (done){ d.failMsg = 'شمس هرب في البحر'; return 'fail'; }
    },
    cleanup: d => { ST2.d.shamsPos = null; },
    outro: () => [ camAt(shamsLaunch.position.x - 10, 3, shamsLaunch.position.z - 8, shamsLaunch.position.x, 1, shamsLaunch.position.z, 1),
      L('shams', '(رمى الشنطة في اللانش بتاعك) خدوا ورقكم… اللعبة لسه في أولها.'),
      L('shams', 'هرجع يا طيارة… في أحلى ليلة في الحتة.'),
      { do: () => { tween(4, k => { shamsLaunch.position.z += .6; }, () => { shamsLaunch.visible = false; }); } }, { wait: 2 },
      L('tayara', 'الورق الأصلي… معانا! يلا نرجّع عربيتك يا عربي.') ] },
  { id: 'carBack', ch: 6, title: 'رجّع العربية', par: 160,
    start: d => { d.arabiCar = true; setRain(true); if (hero.veh && hero.veh.type === 'boat') exitVehicle(true); if (arabiCar){ arabiCar.mesh.visible = true; arabiCar.pos.copy(PORT.inside); } },
    text: () => hero.veh === arabiCar ? 'سوق عربية العربي الحمرا لحد القهوة (★)' : 'اركب العربية الحمرا اللي في المخزن (★)', target: () => hero.veh === arabiCar ? PL.cafeOut : (arabiCar ? arabiCar.pos : PL.cafeOut),
    update: () => !arabiCar || (hero.veh === arabiCar && near(arabiCar.pos, PL.cafeOut, 9)),
    cleanup: () => { setRain(false); giveStick(false); },
    outro: () => [ { rain: false }, { do: () => { if (hero.veh) exitVehicle(true); applyTimeOfDay(7); heroTo(19, 38.5); if (arabiCar){ arabiCar.pos.set(26, 0, 43.2); arabiCar.yaw = Math.PI / 2; arabiCar.mesh.rotation.set(0, Math.PI / 2, 0); } showActor(enemyD, 22.2, 40.2); showActor(fatherD, 24, 39.4); } }, camAt(16, 2.4, 36, 23, 1.3, 40, 1.4),
      L('father', 'العربية… والورق. انتوا الاتنين عملتوها؟'),
      L('arabi', 'طيارة هو اللي…'),
      L('tayara', 'إحنا الاتنين يا حاج. كتف في كتف.'),
      L('father', 'يا طيارة… أنا غلطت لما قارنتك بابني. انتوا الاتنين رجالة.'),
      L('arabi', 'من النهارده… أنا وانت إخوات.'), KN('kamel_06_end'),
      { do: () => { hideActor(fatherD); hideActor(enemyD); } } ] },

  // ===== الفصل السابع: ليلة الفرح =====
  { id: 'islamFlash', ch: 7, title: 'الترام', par: 20,
    intro: () => [ { flash: true }, hideHero(), { do: () => { tram.x = TRAM.stations[1]; tram.stopT = 99; tram.at = tram.x; showActor(islamD, tram.x - 1.4, TRAM.z - 2.2); showActor(haidyD, tram.x + .6, TRAM.z - 2.2); haidyD.faceYaw = -Math.PI / 2; islamD.faceYaw = Math.PI / 2; } },
      camAt(TRAM.stations[1] - 3, 2.2, TRAM.z - 8, TRAM.stations[1], 1.3, TRAM.z - 2, 0), KN('kamel_07_f1'),
      L('islam', 'لو سمحتي… هي المحطة الجاية إيه؟'),
      L('haidy', 'هي المحطة اللي انت كان المفروض تنزل فيها من ساعة 😄'),
      L('islam', 'آه… ما أنا… بحب الترام أوي يعني.'),
      KN('kamel_07_f2'), { do: () => { hideActor(islamD); hideActor(haidyD); tram.stopT = 2; } }, { flash: false } ],
    update: () => true },
  { id: 'invite', ch: 7, title: 'الخبر الحلو', at: () => SPOT.domino, atR: 4, goText: 'إسلام عايزك على الدومنو (★)', par: 240,
    intro: () => [ shot(SPOT.domino, 2.4, 1.1, 3),
      L('islam', 'طيارة! فاكر الخبر الحلو اللي قلتلك عليه من أول يوم؟'),
      L('islam', 'أنا وهايدي هنتجوز!! 💍 والفرح في الساحة، وانت أول واحد لازم يبقى جنبي.'),
      L('tayara', 'ألف مبروك يا إسلام!! ده أحلى خبر سمعته من سنين!'),
      L('islam', 'بس لازم تبقى شيك… هات حاجة حلوة من محل الأناقة 😎') ],
    text: () => 'اشتري حاجة شيك للفرح من محل الأناقة (★) — ساعة أو سلسلة أو نضارة', target: () => SHOP.pos,
    update: () => !!(SAVE.acc.watch || SAVE.acc.chain || SAVE.acc.glasses), outro: () => [ L('tayara', 'كده تمام… طيارة الجامد جاهز للفرح 😎') ] },
  { id: 'prep', ch: 7, title: 'تجهيز الفرح', par: 150,
    intro: () => [ L('phone', '📱 إسلام: يا طيارة… الكراسي والزينة والإضاءة لسه في الساحة متكومة! تعالى ساعدني.') ],
    start: () => { for (const [x, z] of [[-80, 28], [-64, 28], [-80, 38], [-64, 38]]) addPickup(V(x, .15, z), 'part'); },
    text: d => `رتّب الفرح: لم ٤ حاجات من الساحة (النقط الصفرا) ${nPick(d, 4)}`, target: () => nearestPick(), update: allPicked,
    outro: () => [ L('islam', 'الله ينوّر عليك! الساحة بقت تجنن.') ] },
  { id: 'weddingNight', ch: 7, title: 'ليلة الفرح', par: 200,
    text: () => isNight() ? 'روح الفرح في الساحة (★) 🎉' : 'الفرح بالليل 🌙 — نام في البيت لحد بالليل، أو روح الساحة (★) واستنى.', target: () => PL.wed,
    action: waitNight(() => PL.wed), update: () => isNight() && near(heroAt(), PL.wed, 10),
    outro: () => [ { do: () => { heroTo(-72, 30.5); showActor(islamD, -76, 42); showActor(haidyD, -75.3, 42); } }, { cam: [-64, 4, 26], look: [-72, 1.6, 36], t: 1.6 }, KN('kamel_07_1'),
      { walk: [islamD, -72.4, 36.6, 1.1], noWait: true }, { walk: [haidyD, -71.7, 36.6, 1.1] },
      L('crowd', 'ززززغرررررطة!! 🎉'),
      L('islam', 'منوّر يا طيارة! هايدي… ده طيارة اللي كلمتك عنه.'),
      L('haidy', 'أهلاً يا طيارة! إسلام بيحكي عنك أكتر ما بيحكي عني 😄'),
      L('arabi', 'الدي جي شغّال مهرجانات… انزل يا طيارة!'),
      L('crowd', 'طيارة! طيارة! طيارة! 👏') ] },
  { id: 'dance', ch: 7, title: 'الرقصة', par: 120,
    start: d => { heroTo(-72, 34.4); d.res = null; d.dancing = true; playWedding().then(r => { d.res = r; }); },
    text: () => 'ارقص على المزيكا! دوس على الخانة لما النوتة توصل للخط 💃', target: () => null,
    update: (dt, d) => { if (!d.res) return; const need = DIFF.pat > 1 ? .4 : .55; if (d.res.pct >= need) return true; d.failMsg = `الرقص مكانش حلو (${Math.round(d.res.pct*100)}%)`; return 'fail'; },
    outro: () => [ L('islam', 'إيه الرقص ده يا طيارة!! الحتة كلها هتتكلم عليك بكرة 😂') ] },
  { id: 'shamsWedding', ch: 7, title: 'هجوم على الفرح', par: 120,
    intro: () => [ { do: () => showActor(shadiaD, -66, 31) }, L('shadia', 'طيارة!! حد خد الكاميرا من إيدي… فيها كل صور شمس!'), L('crowd', 'الحقوا!! شمس!!'), L('tayara', 'شمس!! في فرح إسلام؟! مش هسيبه المرة دي.'), { do: () => hideActor(shadiaD) } ],
    start: () => { spawnWanted(); wanted.pos.set(-57, .15, 41); }, text: () => 'الحق شمس في حواري بحري (النقطة الحمرا) وامسكه 🏃', target: () => wanted.pos,
    update: () => !!ST2.ev.arrest,
    outro: () => [ { do: () => { wanted.active = false; showActor(wantedD, wanted.pos.x, wanted.pos.z); heroTo(wanted.pos.x + 1.4, wanted.pos.z + .6); } }, shot(wanted.pos, 2.2, 1, 3),
      L('shams', 'وعدتك بأحلى ليلة في الحتة يا طيارة.'), { do: () => { flash(); thwack(); shake = .4; hero.d.downT = 1.5; } }, { fade: () => hideActor(wantedD) },
      L('tayara', 'آه… الكاميرا لسه معاه. وهرب في الحواري.') ] },
  { id: 'youssefStand', ch: 7, title: 'يوسف', par: 20,
    intro: () => [ { do: () => { heroTo(-50, 46); showActor(wantedD, -46, 49.6); showActor(youssefD, -47.6, 48.2); } }, camAt(-53, 2.4, 44, -46.5, 1.3, 49, 1.2),
      L('youssef', 'كفاية يا أسطى… سيب الكاميرا. سيبهم في حالهم.'),
      L('shams', 'انت؟ … انت بتقف قصادي؟'),
      L('youssef', 'أيوه. أول مرة… بس أيوه.'),
      { do: () => { noise(.2, 700, .3); } }, L('shams', '(رمى الكاميرا على الأرض ومشي)'), { do: () => hideActor(wantedD) },
      L('youssef', 'خد يا طيارة… الكاميرا. وفيه حاجة تانية لازم تعرفها.'),
      L('youssef', 'مخبأ شمس جوه القلعة… في البرج القديم. وبكرة بالليل آخر شحنة… هيهرب بعدها.'),
      L('tayara', 'شكراً يا يوسف. والله ما هنساها.'), { do: () => hideActor(youssefD) } ],
    update: () => true },
  { id: 'plan', ch: 7, title: 'الخطة', par: 120,
    text: () => 'روح للظابط جنب القهوة (★) واحكيله', target: () => PL.police, update: reachU(() => PL.police, 4),
    outro: () => [ { do: () => showActor(enemyD, PL.police.x + 1.6, PL.police.z + 1.2) }, shot(npcAt('officer'), 2.4, 1, 3.4),
      L('police', 'القلعة… آخر شحنة. يبقى دي آخر فرصة.'),
      L('police', 'إحنا هنقفل الكوبري من ناحية القلعة. انت امشي وراه من الكورنيش بالموتوسيكل، وماتسيبوش.'),
      L('arabi', 'وأنا معاك يا طيارة. المرة دي سوا.'),
      L('phone', '📱 إسلام: وأنا هدعيلك… لسه عريس جديد 😅'), KN('kamel_07_end') ] },

  // ===== الفصل التامن: الكوبري والقلعة =====
  { id: 'chase', ch: 8, title: 'مطاردة الكورنيش', at: () => PL.corniche, atR: 10, goText: 'روح الكورنيش (★) — شمس هيعدي من هناك', spawn: PL.corniche, par: 120,
    intro: () => [ { do: () => { applyTimeOfDay(22); SAVE.time = 22; heroTo(PL.corniche.x, PL.corniche.z); if (SAVE.owned.moto){ heroMoto.pos.set(164, 0, 147); heroMoto.yaw = -Math.PI/2; heroMoto.mesh.rotation.set(0, -Math.PI/2, 0); } } },
      { cam: [176, 4, 156], look: [196, 1, 141], t: 1.6 },
      L('shams', '(بيعدي بالموتوسيكل) محدش هيوقفني النهارده!'), L('tayara', 'لا يا شمس… النهارده آخرها. اركب يا طيارة!') ],
    start: d => { d.noThief = true; ghostStart(d, shamsMoto, wantedD, [[214, 141], [150, 141], [99, 141], [96, 160], [96, 262]], 12); d.far = 0; },
    text: d => `الحق شمس (النقطة الحمرا) ومتسيبوش يبعد 🏍️ · المسافة ${Math.round(d.dist || 0)} م`, target: d => d.gh ? d.gh.mesh.position : null,
    update(dt, d){ const g = d.gh; if (!g) return; const dist = heroAt().distanceTo(g.mesh.position); d.dist = dist; ST2.d.shamsPos = g.mesh.position;
      const sp = (dist > 60 ? 7 : dist > 30 ? 13 : 19) * DIFF.enemySpd; const done = ghostStep(g, dt, sp);
      if (dist > 95){ d.far += dt; if (d.far > 6){ d.failMsg = 'شمس هرب'; return 'fail'; } } else d.far = 0;
      return done; },
    cleanup: d => { ghostEnd(d); ST2.d.shamsPos = null; } },
  { id: 'bossFight', ch: 8, title: 'جوه القلعة', reward: 1000, koFail: true, spawn: V(92, 0, 270), par: 120,
    intro: () => [ { do: () => { if (hero.veh) exitVehicle(true); heroTo(92, 270); showActor(wantedD, 100, 276); } }, camAt(86, 3, 264, 97, 1.4, 274, 1.4),
      L('shams', 'وصلت لحد هنا؟ … القلعة دي شافت ناس أجمد منك يا طيارة.'),
      L('tayara', 'مش عايز أكسبك يا شمس… عايزك ترجع الميكانيكي اللي كان بيصلّح ببلاش.'),
      L('shams', 'الميكانيكي مات.') ],
    start: () => { heroTo(92, 270); boss.active = true; boss.hp = DIFF.dmg < 1 ? 120 : 160; boss.downs = 0; boss.atk = 1.2; boss.pos.set(100, 0, 276); wantedD.root.visible = true; wantedD.P.legL.visible = wantedD.P.legR.visible = true; wantedD.blob.visible = true; wantedD.downT = 0; },
    text: () => `وقّع شمس مرتين 👊 (${boss.downs}/2) · ${'❤️'.repeat(Math.ceil(boss.hp / 40))}`, target: () => null,
    update: () => boss.downs >= 2, cleanup: () => { boss.active = false; } },
  { id: 'policeArrive', ch: 8, title: 'الصور', par: 20,
    intro: () => [ { do: () => { showActor(wantedD, boss.pos.x || 100, boss.pos.z || 276); wantedD.downT = 30; showActor(shadiaD, 94, 266.5); copCar.pos.set(96, 0, 256); copCar.yaw = 0; copCar.mesh.rotation.set(0, 0, 0); } }, camAt(88, 2.6, 268, 97, 1.3, 273, 1.2),
      L('police', 'محدش يتحرك!'),
      L('shadia', 'الصور دي فيها كل حاجة يا باشا… الشحنات، والعربيات، والميناء.'),
      L('police', 'شمس… انت مقبوض عليك.'),
      { do: () => { wantedD.downT = 0; } },
      L('shams', 'ابني عنده خمس سنين… قولوله إن أبوه كان ميكانيكي شاطر.'),
      L('tayara', 'هقوله يا شمس… وهقوله إنك سلّمت نفسك.'),
      { do: () => { hideActor(wantedD); hideActor(shadiaD); } } ],
    update: () => true },
  { id: 'confess', ch: 8, title: 'يوسف لاقى نفسه', at: () => PL.cart, atR: 7, goText: 'يوسف مستنيك عند عربية الفول (★)', par: 200,
    intro: () => [ { do: () => showActor(youssefD, 33.4, 34.4) }, shot(V(34, .15, 34), 2.4, 1, 3.2),
      L('youssef', 'طيارة… أنا رايح القسم. هقول كل حاجة عملتها.'),
      L('youssef', 'بس عمري ما سرقت غير ساندوتشات وبيتزا… وكاميرا واحدة 😅 والله العظيم.'),
      L('tayara', 'وأنا هقف جنبك. ولما تخرج… تعالى اشتغل معايا عند عزوز بدل اللف ده.'),
      L('youssef', 'بجد؟! … طب واليافطات؟'),
      L('fathi', 'لو اتعدلت يا يوسف، أشيلها بإيدي.'), KN('kamel_08_y') ],
    update: () => true },

  // ===== الختام: الجامد =====
  { id: 'epilogue', ch: 9, title: 'الجامد', at: () => PL.cafeIn, atR: 12, goText: 'ارجع قهوة قصر الملوك (★)… الكل مستنيك', par: 60,
    intro: () => [ { do: () => { awningBurnt(false); showroomBurnt(false); heroTo(21.4, 30); showActor(enemyD, 19.4, 24.8); showActor(youssefD, 25.6, 29.4); setNoEntryShown(.05); } }, { cam: [17, 3, 37], look: [22, 1.3, 27], t: 1.8 },
      KN('kamel_09_1'),
      L('moallem', 'طيارة… القهوة اتجددت، والتندة رجعت أحسن من الأول، والحتة كلها بتتكلم عليك.'),
      L('moallem', 'ومن النهارده انت مش قهوجي بس… انت شريكي في قصر الملوك 🤝'),
      L('arabi', 'وأنا مسؤول الوردية الليلي… وبرضه هفضل أتريق عليك 😏'),
      L('youssef', 'واليافطات اتشالت كلها… إلا واحدة 😅'),
      L('fathi', 'دي للذكرى يا يوسف 😂'),
      shot(SPOT.domino, 2.4, 1.1, 3),
      L('islam', 'طيارة الجامد… الحتة من غيرك ماتحلاش.'),
      // the roof: a kite, and شادية taking a picture
      { do: () => { hideActor(enemyD); hideActor(youssefD); hero.pos.set(PL2.roof.x - .8, PL2.roof.y, PL2.roof.z); showActor(shadiaD, PL2.roof.x + .8, PL2.roof.z); shadiaD.root.position.y = PL2.roof.y; kiteShow(true); } },
      camAt(PL2.roof.x - 5, PL2.roof.y + 2.2, PL2.roof.z + 7, PL2.roof.x, PL2.roof.y + 2.5, PL2.roof.z - 3, 1.8), KN('kamel_09_2'),
      L('shadia', 'اثبت يا طيارة… الطيارة الورق ورا راسك بالظبط 📸'),
      L('tayara', 'إحنا كلنا الجامدين 👑'), KN('kamel_09_3'),
      { do: () => { kiteShow(false); hideActor(shadiaD); heroTo(21.4, 30); } } ],
    update: () => true },
];

const idx = id => MS.findIndex(m => m.id === id);
const curM = () => MS[SAVE.m] || null;
const unlocked = id => SAVE.m > idx(id) || (SAVE.m === idx(id) && ST2.phase === 'active');
const storyHostile = () => modeId === 'story' && !SAVE.ended && SAVE.m >= idx('spill') && SAVE.m < idx('refuseDeal') && !(SAVE.m === idx('spill') && ST2.phase !== 'active');
const storyAlly = () => modeId === 'story' && SAVE.m >= idx('prepare') && SAVE.m <= idx('carBack') && !(SAVE.m === idx('prepare') && ST2.phase !== 'active');
// an old save (before the rewrite) continues from the same point of the new story
if (SAVE.v !== STORY_V && (SAVE.started || SAVE.m > 0)){
  if (!SAVE.ended){ const old = OLD_ORDER[SAVE.m], id = OLD_TO_NEW[old] || old; SAVE.m = Math.max(0, idx(id)); }
  SAVE.introSeen = -1; SAVE.chSeen = -1; SAVE.v = STORY_V; store.set(STORY_KEY, JSON.stringify(SAVE));
}
// ---------- mission runner ----------
// phases: idle → goto (walk to the start point) → intro (cutscene) → active → outro (cutscene) → wait → next mission
ST2.idle = new Set();
function chapterCardBig(ch){ const el = $('chap'); if (ch === false || ch == null){ el.classList.remove('big'); el.hidden = true; return; } const c = CHAPS[ch] || CHAPS[0]; el.querySelector('small').textContent = c[0]; el.querySelector('b').textContent = c[1]; el.classList.add('big'); el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); tone(392, 392, .25, 'triangle', .1); tone(523, 523, .35, 'triangle', .08, .2); }
function chapterCard(ch){ const el = $('chap'), c = CHAPS[ch] || CHAPS[0]; el.querySelector('small').textContent = c[0]; el.querySelector('b').textContent = c[1]; el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); tone(392, 392, .25, 'triangle', .12); tone(523, 523, .35, 'triangle', .12, .25); clearTimeout(chapterCard.t); chapterCard.t = setTimeout(() => { el.hidden = true; }, 3600); }
async function cut(steps){ await playCut(steps); for (const d of [...CUT.idle]) hideActor(d); for (const d of [hero.d, enemyD, wantedD, youssefD]) d.downT = Math.min(d.downT, 0); applyStoryWorld(); }
function beginMission(){
  const M = curM(); if (!M) return;
  ST2.d = { base: {} }; ST2.ev = {};
  const seen = SAVE.introSeen === SAVE.m;
  if (!seen && M.at){ ST2.phase = 'goto'; return; }
  playIntro(M, seen);
}
async function playIntro(M, seen){
  ST2.phase = 'intro';
  const steps = (!seen && M.intro) ? M.intro() : [];
  if (!seen && SAVE.chSeen !== M.ch){ SAVE.chSeen = M.ch; const pre = M.prologue ? PROLOGUE() : []; pre.push({ card: M.ch }, CHAP_NARR[M.ch] ? KN(CHAP_NARR[M.ch]) : { wait: 2.6 }, { card: false }); steps.unshift(...pre); }
  if (steps.length) await cut(steps);
  if (curM() !== M || modeId !== 'story' || state !== 'play') return;
  SAVE.introSeen = SAVE.m; saveStory();
  startActive(M);
  banner(`📱 ${M.title}`, 'info', 2.6);
}
function startActive(M){ ST2.d = { base: {} }; ST2.ev = {}; ST2.phase = 'active'; ST2.t0 = runTime; applyStoryWorld(); if (M.start) M.start(ST2.d); }
async function finishMission(){
  const M = curM(); ST2.phase = 'outro';
  if (M.cleanup) M.cleanup(ST2.d);
  if (modeObj.job) endJob(false); if (JOB.kind) endJob2(true);
  if (RHY.on) { RHY.t = RHY.dur + 2; }
  storyReset();
  const steps = M.outro ? M.outro(ST2.d) : [];
  if (steps.length) await cut(steps);
  if (modeId !== 'story') return;
  easyOff(); ST2.fails = 0; ST2.asked = false;
  if (REPLAY.on){ coin(); buzz(40); heroCheer(); banner(`✅ ${M.title}`, 'ok', 2.5); setTimeout(() => endReplay(M), 1600); return; }
  if (M.reward) hero.money += M.reward;
  if (!ST2.skipping) missionCard(M, runTime - (ST2.t0 ?? runTime), ST2.fails || 0, M.reward); ST2.skipping = false;
  SAVE.rep += 5; SAVE.m++; coin(); buzz(40);
  banner(`✅ ${M.title}${M.reward ? ' · +' + M.reward + ' جنيه' : ''}`, 'ok', 3); heroCheer();
  ST2.d = { base: {} }; parkArabiMoto(); applyStoryWorld();
  if (SAVE.m >= MS.length){ SAVE.ended = true; saveStory(); ST2.phase = 'done'; applyStoryWorld(); setTimeout(showStoryEnd, 1200); return; }
  saveStory(); ST2.phase = 'wait'; ST2.waitT = 2.2;
}
function failMission(msg){
  const M = curM(); ST2.phase = 'failed'; ST2.waitT = 3;
  if (ST2.failsFor !== M.id){ ST2.failsFor = M.id; ST2.fails = 0; ST2.asked = false; }
  ST2.fails++;
  if (M.cleanup) M.cleanup(ST2.d);
  if (modeObj.job) endJob(true); if (JOB.kind) endJob2(true);
  storyReset(); parkArabiMoto(); applyStoryWorld();
  banner(`❌ ${msg || 'المهمة فشلت'} · هتتعاد تاني`, 'bad', 3.5); buzz(60);
}
function retryMission(){
  const M = curM(); if (!M) return;
  if (M.spawn && heroAt().distanceTo(M.spawn) > 30) fadeTo(() => { heroTo(M.spawn.x, M.spawn.z); startActive(M); }, .3);
  else startActive(M);
}
function storyReset(){
  clearPickups(); clearCheckpoints(); boss.active = false; ghostEnd(ST2.d); clearThugs(ST2.d); ST2.d.shamsPos = null;
  if (wanted.active){ wanted.active = false; wantedD.root.visible = false; }
  if (thief.active && !thief.caught){ thief.active = false; youssefD.root.visible = false; thief.next = R(90, 160); }
  race.active = false; shamsMoto.visible = false; copCar.pos.set(copCar.home.x, copCar.home.y || 0, copCar.home.z); copCar.yaw = copCar.home.yaw; copCar.mesh.rotation.set(0, copCar.yaw, 0);
}
function showIdle(d, x, z){ d.root.visible = true; d.root.position.set(x, groundY(x, z), z); d.P.legL.visible = d.P.legR.visible = true; d.blob.visible = true; d.downT = 0; ST2.idle.add(d); }
// places and props that change with the story (Alexandria stage 4)
function storyWorld2(m, I){
  awningBurnt(m > I('awning') && m < I('epilogue'));
  showroomBurnt(m >= I('carStolen') && m < I('epilogue'));
  setRain(m >= I('nawaRaid') && m <= I('carBack') && ST2.phase === 'active');
  giveStick(m >= I('prepare') && m <= I('carBack') && ST2.phase === 'active');
  if (arabiCar && hero.veh !== arabiCar){
    const away = m < I('arabiArrives'), inPort = m > I('carStolen') && m <= I('carBack');
    arabiCar.mesh.visible = !away;
    if (away) arabiCar.pos.set(-600, 0, -600); else if (inPort) arabiCar.pos.copy(PORT.inside); else if (!(m === I('carStolen') && ST2.phase === 'active')){ arabiCar.pos.set(26, 0, 43.2); arabiCar.yaw = Math.PI / 2; }
    arabiCar.mesh.rotation.set(0, arabiCar.yaw, 0);
  }
  ST2.idle.delete(shadiaD);
  if (m > I('laundry') && !(m >= I('weddingNight') && m <= I('shamsWedding')) && ST2.phase !== 'intro' && ST2.phase !== 'outro' && !(curM() && curM().id === 'shadiaRide')) showIdle(shadiaD, -36.4, 87.6);
  else if (!CUT.on) shadiaD.root.visible = false;
}
function applyStoryWorld(){
  if (modeId !== 'story') return;
  const m = SAVE.m, I = idx;
  setNoEntryShown(signLevel()); setPostersShown(m > I('poster') && m <= I('bossFight'));
  wedding.visible = m >= I('weddingNight') && m <= I('plan');
  const atWed = m >= I('weddingNight') && m <= I('shamsWedding');
  ST2.idle.clear();
  if (atWed){ showIdle(islamD, -72, 38.4); ST2.idle.delete(islamD); }
  else { islamD.P.legL.visible = islamD.P.legR.visible = false; islamD.blob.visible = false; seatIslam(true); }
  const off = NP('officer'); if (off) off.g.visible = m >= I('poster');
  arabiMoto.mesh.visible = m >= I('spill');
  if (!thief.active) youssefD.root.visible = false;
  // العربي: enemy (chapters 1–4), ally (chapter 5), then a friend working at the café
  if (storyAlly()){ enemy.ally = true; enemy.active = true; enemy.state = 'roam'; enemy.d.downT = 0; enemy.hp = 100; }
  else { enemy.ally = false; if (!storyHostile()) arabiHide(); else if (enemy.active && !ST2.d.enemyBusy && ST2.phase !== 'active') arabiHide(); }
  storyWorld2(m, I);
  if (!storyAlly() && !storyHostile() && m > I('carBack')){ if (atWed) showIdle(enemyD, -68.6, 33.6); else showIdle(enemyD, 19.2, 24.8); }
  if (m > I('confess') && !thief.active) showIdle(youssefD, 118.4, 41.4);
  if (m > I('bossFight') || SAVE.ended){ wantedD.root.visible = boss.active; }
}
function storyTarget(){
  const M = curM();
  if (JOB.kind) return jobTarget();
  if (!M) return null;
  if (ST2.phase === 'goto') return M.at();
  if (ST2.phase === 'active' && M.target) return M.target(ST2.d);
  return null;
}
function storyMapMarks(t){
  if (modeId !== 'story') return [];
  const out = [], tg = storyTarget(); if (tg) out.push({ x: tg.x, z: tg.z, star: true });
  for (const p of pickups) if (!p.got) out.push({ x: p.pos.x, z: p.pos.z, r: 3.5, c: '#ffd34d' });
  for (const c of checkpoints) out.push({ x: c.pos.x, z: c.pos.z, r: 5, c: Math.floor(t*4)%2 ? '#ff2020' : '#3a6bff' });
  const sp = ST2.d.shamsPos || (boss.active ? boss.pos : null); if (sp) out.push({ x: sp.x, z: sp.z, r: 4.5, c: Math.floor(t*4)%2 ? '#ff2020' : '#ffffff' });
  if (ST2.d.tp && youssefD.root.visible) out.push({ x: ST2.d.tp.x, z: ST2.d.tp.z, r: 4, c: '#ffd34d' });
  return out;
}
function storyTick(dt){
  const M = curM(); if (!M || state !== 'play') return;
  if (ST2.phase === 'idle') return beginMission();
  if (ST2.phase === 'goto'){ if (!CUT.on && !hero.locked && near(heroAt(), M.at(), M.atR || 5)) playIntro(M, false); return; }
  if (ST2.phase === 'wait'){ ST2.waitT -= dt; if (ST2.waitT <= 0) ST2.phase = 'idle'; return; }
  if (ST2.phase === 'failed'){ ST2.waitT -= dt; if (ST2.waitT <= 0){ if (ST2.fails >= 3 && !ST2.asked && !EASY.on){ ST2.asked = true; ST2.phase = 'asking'; openFailAsk(); } else { ST2.phase = 'retrying'; retryMission(); } } return; }
  if (ST2.phase !== 'active' || CUT.on) return;
  const r = M.update ? M.update(dt, ST2.d) : false;
  if (r === true) finishMission(); else if (r === 'fail') failMission(ST2.d.failMsg);
}
function showStoryEnd(){ if (modeId !== 'story') return; hero.locked = true; $('storyEnd').hidden = false; tone(523,523,.15,'triangle',.2); tone(659,659,.15,'triangle',.2,.15); tone(784,1046,.5,'triangle',.22,.3); }
$('storyEndBtn').onclick = () => { $('storyEnd').hidden = true; hero.locked = false; };
// small talk with the named people
const NAMED_LINES = {
  moallem: ['الشغل مش عيب يا طيارة','الشاي التقيل لزبون الصبح','فين الصينية يا ابني؟','القهوة دي بيتي التاني'],
  landlord: ['البيت بيتك يا ابني… بس الإيجار إيجار 😄','ربنا يكرمك يا طيارة','شد حيلك يا ابني'],
  azzouz: ['البيتزا بتبرد يا طيارة!','عندي طلبات كتير النهارده','أحسن بيتزا في مصر عند عزوز 🍕'],
  fathi: ['الفول بالزيت الحار؟','الطعمية لسه طالعة من الزيت','يوسف لو جه قولي'],
  officer: ['عينك على الشارع يا طيارة','لو شفت حاجة غريبة بلّغني','المكافأة لسه موجودة'],
  reda: ['التوكتوك مستنيك','اللي يطلع من الشغل نصين','حافظ عليه زي عينيك'],
};
function storyAction(){
  const p = hero.pos, m = modeObj, M = curM(), d = ST2.d;
  if (ST2.phase === 'active' && M && M.action){ const a = M.action(p, d); if (a) return a; }
  if (m.job === 'ahwa'){
    if (p.distanceTo(SPOT.counter) < 2.6) return { text: 'ادخل النَصبة وحضّر الطلبات', fn: () => enterStation('ahwa') };
    const c = m.patrons.find(n => n.state === 'customer' && n.order && Math.hypot(n.g.position.x-p.x, n.g.position.z-p.z) < 2);
    if (c) return { text: `قدّم ${c.order.drink} ${c.order.sugar} لـ ${c.name}`, fn: () => serveAhwa(c) };
    return null;
  }
  if (m.job === 'foul') return Math.hypot(p.x-SPOT.cart.x, p.z-SPOT.cart.z) < 2.8 ? { text: 'ارجع لعربية الفول', fn: () => enterStation('foul') } : null;
  if (JOB.kind) return null;
  if (p.distanceTo(SHOP.pos) < 2.6) return { text: 'ادخل محل الأناقة', fn: openShop };
  for (const [v, kind] of [[heroMoto,'moto'],[heroCar,'car']]) if (!SAVE.owned[kind] && Math.hypot(v.pos.x-p.x, v.pos.z-p.z) < 3.2) return { text: `اشتري ${kind === 'moto' ? 'الموتوسيكل' : 'العربية'} (${PRICE[kind]} جنيه)`, fn: () => buyVehicle(kind) };
  if (near(p, SPOT.house, 2.4)) return { text: 'ادخل البيت 🏠', fn: enterHouse };
  if (unlocked('tea') && p.distanceTo(SPOT.counter) < 2.6) return { text: 'اشتغل وردية قهوجي ☕', fn: () => startJob('ahwa') };
  if (unlocked('foul') && Math.hypot(p.x-SPOT.cart.x, p.z-SPOT.cart.z) < 2.8) return { text: 'اشتغل على عربية الفول 🧆', fn: () => startJob('foul') };
  if (unlocked('pizza3') && near(p, SPOT.azzouz, 3.2)) return { text: 'اشتغل ديليفري بيتزا 🍕', fn: startPizzaJob };
  if (unlocked('pizza3') && near(p, tukVeh.pos, 4.4)) return { text: 'اشتغل على التوكتوك 🛺', fn: startTukJob };
  for (const [k, n] of Object.entries(ST2.npcs)) if (n.g.visible && n.state === 'idle' && near(p, n.g.position, 2.2)) return { text: `كلّم ${n.name}`, fn: () => { say(n, rpick(NAMED_LINES[k] || ['أهلاً يا طيارة']), 2.6); n.yaw = Math.atan2(p.x - n.g.position.x, p.z - n.g.position.z); } };
  return null;
}
function storyHudTitle(){ const m = modeObj; if (m.job === 'ahwa') return 'وردية قهوجي ☕'; if (m.job === 'foul') return 'شغل الفول 🧆'; if (JOB.kind === 'pizza') return 'ديليفري عزوز 🍕'; if (JOB.kind === 'tuk') return 'سواق توكتوك 🛺'; const M = curM(); return M ? `📱 ${M.title}` : 'طيارة الجامد 👑'; }
function storyHud(){
  const m = modeObj, M = curM(); let s;
  if (m.job) s = `الوقت: <b style="display:inline;color:#fff">${fmtTime(m.time||0)}</b> · بعت: ${m.served} · زعلانين: <b style="display:inline;color:#ff9a9a">${m.angry}/٣</b><br>كسبت: ${egp(m.earned)}${m.job === 'ahwa' ? '<br>روح النَصبة (E) ووزّع على الزباين.' : ''}`;
  else if (JOB.kind) s = jobHud();
  else if (!M) s = 'خلصت القصة! لف في الحتة براحتك: اشتغل، العب دومنو، وجدّد البيت.';
  else if (ST2.phase === 'goto') s = M.goText || 'روح للعلامة (★)';
  else if (ST2.phase === 'active') s = M.text ? M.text(ST2.d) : '…';
  else s = '…';
  if (M && ST2.phase === 'active' && (m.job || JOB.kind) && M.text) s += `<br><small style="color:#ffd98a">📱 ${M.text(ST2.d)}</small>`;
  const c = CHAPS[M ? M.ch : 8];
  return s + `<br><small style="color:#c2b7a3">🕐 ${clockText()} · ${c[0]}: ${c[1]}</small>`;
}
function updateStory(dt){
  motoTag.visible = !SAVE.owned.moto && !CUT.on; carTag.visible = !SAVE.owned.car && !CUT.on;
  motoTag.position.set(heroMoto.pos.x, 2.1, heroMoto.pos.z); carTag.position.set(heroCar.pos.x, 2.6, heroCar.pos.z);
  storyTick(dt);
  // the clock: one game hour every 40 seconds
  TOD.h = (TOD.h + dt/40) % 24; ST2.todT = (ST2.todT || 0) - dt; if (ST2.todT <= 0){ ST2.todT = .5; applyTimeOfDay(TOD.h); }
  updatePickups(dt, runTime); updateStalker(dt); updateBoss(dt, runTime);
  for (const d of ST2.idle) if (d.root.visible && !CUT.idle.has(d)) animDoll(d, 0, 0, dt, runTime);
  const tgt = storyTarget();
  missionMark.visible = !!tgt && !ST.kind && !HOUSE.inside && !CUT.on;
  if (tgt){ missionMark.position.set(tgt.x, 0, tgt.z); missionMark.children[1].rotation.z += dt; }
  const m = modeObj; m.saveT = (m.saveT || 0) - dt; if (m.saveT <= 0){ m.saveT = 5; saveStory(); }
}

function resetWorld(){
  clearBubbles();
  if (JOB.kind) endJob2(true); if (CUT.on) CUT.skip = true; if (ACT.kind) actEnd(null);
  if (RHY.on){ RHY.on = false; RHY.res = null; $('rhy').hidden = true; $('rhyNotes').innerHTML = ''; document.body.classList.remove('in-rhythm'); }
  leavePlaces();
  if (HOUSE.inside){ HOUSE.inside = false; if (HOUSE.prevCam) camTarget = HOUSE.prevCam; }
  storyReset(); wedding.visible = false; ST2.idle.clear(); ST2.phase = 'off'; enemy.ally = false; pizzaBox.visible = false; $('chap').hidden = true;
  for (const d of [youssefD, enemyD, wantedD]){ d.root.visible = false; d.P.legL.visible = d.P.legR.visible = true; d.blob.visible = true; d.downT = 0; }
  islamD.P.legL.visible = islamD.P.legR.visible = false; islamD.blob.visible = false;
  vehicles.forEach(v => { v.pos.set(v.home.x, v.home.y||0, v.home.z); v.yaw = v.home.yaw; v.mesh.rotation.set(0, v.yaw, 0); v.speed = 0; v.dmg = 0; v.broke = false; });
  seatIslam(false); seatKamel(false); thiefReset();
  motoTag.visible = carTag.visible = false; missionMark.visible = false; race.active = false; enemy.boss = false; enemy.maxHp = 100; $('shop').hidden = true; $('storyEnd').hidden = true;
  npcs.forEach(n => { if (n.thug) npcTakeOff3D(n); n.state = 'hidden'; n.g.visible = false; n.role = null; n.onArrive = null; n.thug = false; n.thugDone = false; n.g.rotation.x = 0; });
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
  seatNPC(a, SPOT.domino.x-.85, SPOT.domino.z, Math.PI/2); a.state = 'domino'; a.name = 'الحاج كامل';
  if (seatKamel(true)){ a.state = 'hidden'; a.g.visible = false; }   // the 3D الحاج كامل takes the seat
  seatNPC(b, SPOT.domino.x+.85, SPOT.domino.z, -Math.PI/2); b.state = 'hidden'; b.g.visible = false; seatIslam(true);
  let k = start+2; [0,3,5,8,10].forEach(si => { const s = SEATS[si]; seatNPC(npcs[k], s.x, s.z, s.ry); k++; });
  const v = npcs[k]; seatNPC(v, SPOT.cartHero.x, SPOT.cartHero.z, 0); v.state = 'idle'; v.g.position.y = .15; k++;
  return k;
}

function startMode(id){
  initAudio(); if (arabiCar && id !== 'story'){ arabiCar.mesh.visible = true; } setRain(false); giveStick(false); clearFires(); if (isTouch && !document.fullscreenElement) goFull();
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
    tawla: () => { const r = M_.free(); hero.pos.set(TAWLA_SPOT.x, .15, TAWLA_SPOT.z + 1.6); setTimeout(openTawla, 200); return r; },
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
      seatNPC(a, SPOT.domino.x-.85, SPOT.domino.z, Math.PI/2); a.state = 'domino'; a.name = 'الحاج كامل';
      if (seatKamel(true)){ a.state = 'hidden'; a.g.visible = false; }
      seatNPC(b, SPOT.domino.x+.85, SPOT.domino.z, -Math.PI/2); b.state = 'hidden'; b.g.visible = false; seatIslam(true);
      decoGlasses.forEach(g => g.visible = false);
      setupNamed(); arabiHide(); enemy.boss = false; enemy.maxHp = 100; hero.pos.copy(SPOT.spawn);
      ST2.phase = SAVE.m >= MS.length ? 'done' : 'idle'; ST2.d = { base: {} }; ST2.ev = {}; ST2.stalkT = 45; SAVE.started = true;
      const M = curM();
      if (SAVE.m === 0 && SAVE.introSeen !== 0){ HOUSE.inside = true; HOUSE.prevCam = camTarget; camTarget = Math.min(camTarget, 3.4); camDist = camTarget; hero.pos.set(-403.6, 0, -399.6); CAM.orbit = CAM.orbitSm = 0; }
      else if (M && M.spawn && SAVE.introSeen === SAVE.m) hero.pos.copy(M.spawn);
      houseVisual(); TOD.h = SAVE.time ?? 9; applyTimeOfDay(TOD.h); parkArabiMoto(); applyStoryWorld();
      const patrons = npcs.slice(free+2, free+14), pool = npcs.slice(free+14, free+20);
      return { vehicles: true, cafe: true, story: true, title: 'القصة', job: null, patrons, pool, tray: [], seatsTaken: new Set(), queue: [], served: 0, angry: 0, earned: 0, spawnT: 1, domBet: 20,
        canDrive: v => (v === heroMoto && SAVE.owned.moto) || (v === heroCar && SAVE.owned.car) || (!!v.jobOnly && v.jobOnly === JOB.kind) || (v === arabiMoto && !!ST2.d.arabiMoto) || (!!v.jobOnly && v.jobOnly === ACT.kind) || (v === arabiCar && !!ST2.d.arabiCar) || (v.type === 'boat' && !!ST2.d.boatOK),
        hud: storyHud, hudTitle: storyHudTitle, action: storyAction,
        onServe: (kind, drink) => { SAVE.cnt[kind] = (SAVE.cnt[kind]||0) + 1; if (drink === 'شاي') SAVE.cnt.tea = (SAVE.cnt.tea||0) + 1; if (drink === 'قهوة') SAVE.cnt.coffee = (SAVE.cnt.coffee||0) + 1; },
        onDomino: w => { const bet = Math.min(modeObj.domBet, Math.max(0, Math.floor(hero.money))); if (w){ hero.money += bet; SAVE.cnt.dom = (SAVE.cnt.dom||0) + 1; } else hero.money -= bet; saveStory(); return bet; },
        onEnemyDown: () => { SAVE.cnt.edown = (SAVE.cnt.edown||0) + 1; saveStory(); },
        onArrest: () => { onStoryEvent('arrest'); coin(); },
        onKO: why => { knockout(why); const M = curM(); if (M && ST2.phase === 'active' && M.koFail){ hero.hp = 100; failMission('اتبهدلت'); } },
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
  if (id !== 'story' || !REPLAY.on) REPLAY.last = -1;
  if (id !== 'story'){ const h0 = PROG.ramadan && (id === 'free' || id === 'domino') ? 21 : 15; TOD.h = h0; applyTimeOfDay(h0); setNoEntryShown(1); setPostersShown(true); }
  modeObj = M_[id](); if (modeObj.init) modeObj.init();
  
  setObjective(modeObj.title, '');
  camera.position.set(hero.pos.x, 4, hero.pos.z + 6); lookAt.copy(hero.pos);
  refreshTray(); updateHud(); if (id === 'foul') enterStation('foul');
  banner({ story: SAVE.started && SAVE.m ? 'رجعت الحتة يا ' + heroName + ' 👑' : 'يلا يا ' + heroName + '… نبقى الجامد 👑', free:'أهلاً بيك في الحتة يا ' + heroName, police:'المطلوب في الحتة… اركب البوكس 🚓', cash:'دوّر على رزم الفلوس 💵', ahwa:'الزباين جايين… جهّز النَصبة ☕', foul:'افتح العربية… الزباين جايين 🧆', domino:'اقعد يا ' + heroName, tawla:'عم رجب مستنيك على الطاولة 🎯' }[id], 'info', 2.6);
}
function bestScore(key, v){ const b = parseFloat(store.get('ty_best_'+key)||'0'); if (v > b){ store.set('ty_best_'+key, String(v)); return 'رقم قياسي جديد! 🏆'; } return `أحسن غلة: ${egp(b)}`; }
function endMode(title, text, best=''){
  if (state !== 'play') return; state = 'end';
  if (sirenGain) sirenGain.gain.value = 0;
  $('endTitle').textContent = title; $('endText').textContent = text; $('endBest').textContent = best;
  exitStation(true); $('domino').hidden = true; document.body.classList.remove('in-domino'); hero.locked = false;
  setTimeout(() => { $('hud').hidden = true; $('end').hidden = false; }, 700);
}
function openMenu(){ if (REPLAY.on) stopReplay(); else saveStory(); easyOff(); REPLAY.last = -1; mmPage('mmMain'); closePause(); renderModes(); state = 'menu'; $('hud').hidden = true; $('domino').hidden = true; $('end').hidden = true; $('menu').hidden = false; clearBubbles(); exitStation(true); document.body.classList.remove('in-domino'); if (sirenGain) sirenGain.gain.value = 0; try { speechSynthesis.cancel(); } catch(e){} }
$('againBtn').onclick = () => REPLAY.last >= 0 && modeId === 'story' ? startReplay(REPLAY.last) : startMode(modeId);
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
  const pay = 5 + tip + cb; modeObj.served++; modeObj.earned += pay; hero.money += pay; if (modeObj.onServe) modeObj.onServe('ahwa', item.drink); stat('drinks');
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
      n.onArrive = n2 => { seatNPC(n2, s.x, s.z, s.ry); n2.state = 'customer'; const rg = REGULARS[n2.name]; n2.order = rg && Math.random() < .75 ? { ...rg, reg: true } : { drink: pickDrink(), sugar: rpick(SUGARS) }; n2.maxPat = 120*DIFF.pat; n2.patience = n2.maxPat; n2.bubble = orderBubble(n2); say(n2, n2.order.reg ? `زي العادة يا ${heroName}! ${n2.order.drink} ${n2.order.sugar}` : `واحد ${n2.order.drink} ${n2.order.sugar} يا ريس!`, 0); buzz(15); };
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
// on short (landscape phone) screens the mission card is clamped; tap it to read all of it
document.querySelector('.card.obj').addEventListener('pointerdown', e => { e.stopPropagation(); e.currentTarget.classList.toggle('open'); });
