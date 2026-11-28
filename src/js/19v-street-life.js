// ================= stage 10 (2): the street reacts =================
// People film you on their phones when something happens, run into each other / get knocked over, fly when a car hits
// them, hide when there's shooting, and the shops pull their shutters down. Two buttons with anyone near: «سلّم» (greet)
// and «استفز» (provoke: he answers back, walks off, or fights). The man whose car you took may run after you.
// Random street events: a fight, an accident, a street wedding, a funeral tent, a car parade after a match, the
// musaharati in Ramadan nights. Fruit carts and plastic café chairs get knocked over.
const LIFE = { filmCd: 0, eventT: 50, ev: null, bumpCd: 0, hAnim: null, near: null };
const isQuiet = () => !(modeId === 'story' && (ST2.phase === 'active' || ST2.phase === 'intro')) && !CUT.on && !HOUSE.inside && state === 'play';
const freeRole = n => !n.role || n.role === 'walker';
const clipDur = c => (CLIPS[c] && CLIPS[c].dur) || 2;

// ---------- a short move of the hero's (greeting, provoking): [clip, from, to, rate] ----------
function heroMove(clip, s0, s1, rate, onEnd){
  if (!hero.d.is3D || !CLIPS_READY || !CLIPS[clip]){ if (onEnd) onEnd(); return; }
  LIFE.hAnim = { clip, s0, s1: Math.min(s1, clipDur(clip)), rate, t: 0, onEnd }; hero.locked = true; hero.vel.set(0, 0, 0);
}
function heroMoveUpdate(dt){
  const A = LIFE.hAnim; if (!A) return;
  if (hero.veh || MEL.atk || state !== 'play'){ LIFE.hAnim = null; hero.locked = false; return; }
  A.t += dt; const ct = A.s0 + A.t * A.rate;
  hero.d.strike = { clip: A.clip, t: Math.min(ct, A.s1) };
  if (ct >= A.s1){ LIFE.hAnim = null; hero.locked = false; if (A.onEnd) A.onEnd(); }
}
// an NPC's move (the 3D people; the low-poly ones wave their arm while they talk)
function npcMove(n, clip, s0, s1, rate){ if (n.r3 && CLIPS[clip]) n.lifeAnim = { clip, s0, s1: Math.min(s1, clipDur(clip)), rate, t: 0 }; }

// ---------- people film you ----------
const phoneGeo = new THREE.BoxGeometry(.075, .15, .012), phoneMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x7090ff, emissiveIntensity: .7, roughness: .3 });
function streetDrama(p, howMany = 3){
  if (LIFE.filmCd > 0 || !isQuiet()) return; LIFE.filmCd = 4;
  let k = 0;
  for (const n of npcs){
    if (k >= howMany) break; if (n.state !== 'walk' || !n.g.visible || !freeRole(n)) continue;
    const d = n.g.position.distanceTo(p); if (d < 7 || d > 40 || (n.fleeT > 0 && d < 16) || !lineOfSight(n.g.position.x, n.g.position.z, p.x, p.z) || Math.random() < .4) continue;
    n.fleeT = 0; startFilming(n, p, 6 + Math.random() * 5); k++; filmSay(n);
  }
  // nobody around: a couple of passers-by come out of the side streets and film from a safe distance
  for (let i = k; i < Math.min(2, howMany); i++){
    const n = npcs.find(m => m.state === 'hidden' && !m.role && !m.crowd && !m.thug); if (!n) break;
    let s = null; for (let j = 0; j < 12 && !s; j++){ const c = sidewalkNear(p, 14 + Math.random() * 10); if (c && lineOfSight(c.x, c.z, p.x, p.z) && c.distanceTo(p) > 9) s = c; } if (!s) break;
    n.role = 'onlook'; n.g.visible = true; n.g.position.set(s.x, groundY(s.x, s.z), s.z); n.g.rotation.set(0, 0, 0); n.fall = 0; n.downT = 0; n.fly = null;
    startFilming(n, p, 7 + Math.random() * 5); filmSay(n);
  }
}
const filmSay = n => { if (Math.random() < .4) say(n, rpick(['بصوّر!', 'نزّلها لايف!', 'يا نهار أبيض!', 'شوفوا بيعمل إيه!', 'هتبقى تريند!']), 1.8); };
function startFilming(n, p, T){
  n.state = 'film'; n.filmT = T; n.filmAt = p.clone ? p.clone() : p;
  if (!n.phone){ n.phone = new THREE.Mesh(phoneGeo, phoneMat); n.phone.position.set(0, -.68, .07); n.arms[1].add(n.phone); }
  n.phone.visible = !n.r3;
  if (n.r3 && !n.phone3){ const hb = n.r3.bones && n.r3.bones.handR; if (hb){ n.phone3 = new THREE.Mesh(phoneGeo, phoneMat); n.phone3.position.set(0, .08, .03); hb.add(n.phone3); } }
  if (n.phone3) n.phone3.visible = true;
}
function stopFilming(n){ n.state = 'walk'; n.mstrike = null;
  if (n.role === 'onlook'){ const s = sidewalkNear(n.g.position, 25); n.state = 'goto'; n.tx = s.x; n.tz = s.z; n.onArrive = m => { m.state = 'hidden'; m.g.visible = false; m.role = null; }; } if (n.phone) n.phone.visible = false; if (n.phone3) n.phone3.visible = false; n.arms[1].rotation.set(0, 0, 0); }
function filmUpdate(n, dt){
  n.filmT -= dt; n.yaw = Math.atan2(n.filmAt.x - n.g.position.x, n.filmAt.z - n.g.position.z);
  if (!n.r3){ n.arms[1].rotation.x = -1.45; n.arms[1].rotation.z = .15; n.arms[0].rotation.x = -.9; }
  else n.mstrike = { clip: 'filming', t: 1 + (n.filmT % 5.5) };
  if (n.filmT <= 0) stopFilming(n);
}

// ---------- shooting: people hide, the shops pull their shutters down ----------
const shutterTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'); for (let y = 0; y < 128; y += 8){ g.fillStyle = y % 16 ? '#8f969c' : '#a9b0b6'; g.fillRect(0, y, 64, 8); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y + 6, 64, 2); } g.fillStyle = 'rgba(60,40,20,.35)'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 64, Math.random() * 128, 2 + Math.random() * 5, 1 + Math.random() * 3); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2); return t; })();
const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTex, metalness: .55, roughness: .5 });
function shopsPanic(p){
  for (const s of SHOPS){
    const out = Math.cos(s.outYaw) > 0 ? 1 : -1, dx = s.out.x, dz = s.out.z - out * 1.1;
    if (Math.hypot(dx - p.x, dz - p.z) > 40) continue;
    if (!s.shutter){ const m = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.9), shutterMat); m.position.set(dx, 2.9, dz + out * .05); m.rotation.y = s.outYaw; m.scale.y = .01; m.visible = false; scene.add(m); s.shutter = m; }
    if (!(s.closedT > 0)) playS('metalm', .55 * sfxVol(dx, dz, 12), .6, .3 + Math.random() * .8);
    s.closedT = 50;
  }
  // people close by drop and cover; the rest run (the old code makes the walkers run)
  for (const n of npcs){
    if (n.state !== 'walk' || !freeRole(n) || !n.g.visible) continue; const d = n.g.position.distanceTo(p);
    if (d < 13 && Math.random() < .4){ n.state = 'cover'; n.coverT = 4 + Math.random() * 4; n.yaw = Math.atan2(n.g.position.x - p.x, n.g.position.z - p.z); if (Math.random() < .4) say(n, rpick(['يا ساتر يا رب!', 'انزلوا في الأرض!', 'يا ماما!']), 1.5); }
  }
}
function coverUpdate(n, dt){
  n.coverT -= dt;
  if (n.r3) n.mstrike = { clip: n.coverT % 4 < 2 ? 'terrified' : 'coverIdle', t: .6 + (n.coverT % 2) * .5 };
  else { n.body.position.y = -.28; n.legs[0].rotation.x = n.legs[1].rotation.x = -1.05; n.arms[0].rotation.x = n.arms[1].rotation.x = -2.25; n.arms[0].rotation.z = -.75; n.arms[1].rotation.z = .75; }
  if (n.coverT <= 0){ n.state = 'walk'; n.fleeT = 6; n.mstrike = null; n.arms[0].rotation.z = n.arms[1].rotation.z = 0; }
}
function shuttersUpdate(dt){
  for (const s of SHOPS){ if (!s.shutter) continue; if (s.closedT > 0){ s.closedT -= dt; if (s.closedT <= 0) playS('metalm', .4 * sfxVol(s.out.x, s.out.z, 12), .55); }
    const want = s.closedT > 0 ? 1 : .01, m = s.shutter; m.scale.y += (want - m.scale.y) * damp(s.closedT > 0 ? 2.2 : 1.2, dt); m.position.y = 2.9 - 1.45 * m.scale.y; m.visible = m.scale.y > .02; }
}

// ---------- bumping into people, cars throwing them ----------
function bumpUpdate(dt){
  if (LIFE.bumpCd > 0) LIFE.bumpCd -= dt;
  if (hero.veh || hero.locked || LIFE.bumpCd > 0) return;
  const sp = Math.hypot(hero.vel.x, hero.vel.z); if (sp < 4) return;
  for (const n of npcs){
    if (n.state !== 'walk' || !n.g.visible) continue;
    const dx = n.g.position.x - hero.pos.x, dz = n.g.position.z - hero.pos.z, d = Math.hypot(dx, dz); if (d > .8) continue;
    LIFE.bumpCd = .8; playS('block', .65);
    if (sp > 6.2 && Math.random() < .6){ n.prevState = 'walk'; n.state = 'down'; n.downT = 1.6; n.fightT = Math.random() < .2 ? 6 : 0; n.fleeT = 0; playS('fall', .55, 1, .15); say(n, rpick(['يا عم حاسب!', 'إيه يا جدع؟!', 'أعمى انت؟!', 'مش تبص قدامك؟!']), 1.6, 'angry'); }
    else { if (n.r3) npcMove(n, Math.random() < .5 ? 'stumbleBack' : 'shoved', .1, 1.4, 1.5); say(n, rpick(['حاسب!', 'براحة يا كابتن!', 'خلي بالك!']), 1.3, 'angry'); }
    hero.vel.multiplyScalar(.45); hero.knock.x -= dx / d * 1.5; hero.knock.z -= dz / d * 1.5; break;
  }
}
// a car hit someone: he flies with the car's speed (the thrown-body flight in 19r carries him), spinning, and lies there
function npcLaunch(n, v){
  const sp = Math.abs(v.speed); if (sp < 6) return;
  const fx = Math.sin(v.yaw) * Math.sign(v.speed), fz = Math.cos(v.yaw) * Math.sign(v.speed), ox = n.g.position.x - v.pos.x, oz = n.g.position.z - v.pos.z, ol = Math.hypot(ox, oz) || 1;
  n.fly = { vx: fx * sp * 1.05 + ox / ol * 1.8, vz: fz * sp * 1.05 + oz / ol * 1.8, vy: 3 + sp * .22, y: n.g.position.y + .5 };
  v.speed *= .8; shake = Math.max(shake, .25); playS('metal', .5, 1.3); if (v.mesh) dentCar(v, 0, 2.1, .12);
  n.spinZ = (Math.random() < .5 ? -1 : 1) * (4 + sp * .25); n.downT = Math.max(n.downT, 4.5 + sp * .1); n.fightT = 0;
  if (sp > 14) burst('blood', n.g.position.clone().setY(1), null, 8, 2);
}

// ---------- the man whose car you took runs after you ----------
function thiefChase(dr){
  if (!dr || Math.random() > .45) return;
  dr.chaseT = 22; dr.onArrive = null; dr.speed = 3.7;
  say(dr, rpick(['استنى يا حرامي!!', 'انزل من عربيتي!', 'والله ما هسيبك!']), 2.2, 'angry');
}
function chaseUpdate(n, dt){
  n.chaseT -= dt; const p = heroAt(), d = n.g.position.distanceTo(p);
  if (n.state === 'down' || n.state === 'held' || n.state === 'stagger') return;
  if (n.chaseT <= 0 || d > 45){ n.chaseT = 0; n.state = 'goto'; n.speed = 1.4; const s = sidewalkNear(n.g.position, 8); n.tx = s.x; n.tz = s.z; n.onArrive = m => { m.state = 'hidden'; m.g.visible = false; m.role = null; }; if (d < 30) say(n, rpick(['ماشي… هبلغ عنك!', 'منك لله!']), 2, 'angry'); return; }
  if (!hero.veh && d < 1.8){ n.chaseT = 0; n.role = 'walker'; n.block = nearestBlock(n.g.position); n.state = 'fight'; n.fightT = 14; n.mel = true; n.mhp = undefined; n.fstyle = 'rusher'; say(n, 'هات عربيتي يا حرامي!', 1.8, 'angry'); return; }
  n.state = 'goto'; const dx = n.g.position.x - p.x, dz = n.g.position.z - p.z, l = Math.hypot(dx, dz) || 1, stop = hero.veh ? 2.2 : 1.2;
  n.tx = p.x + dx / l * stop; n.tz = p.z + dz / l * stop;
  if (hero.veh && d < 3.2 && Math.abs(hero.veh.speed) < 1.5 && Math.random() < dt * 1.5){ playS('plate', .6, .8); shake = Math.max(shake, .08); say(n, rpick(['افتح!!', 'انزل يا جبان!', 'دي عربيتي!']), 1.2, 'angry'); }
}
const nearestBlock = p => { let bi = 0, bd = 1e9; blocksInfo.forEach((b, i) => { const d = Math.hypot(b.cx - p.x, b.cz - p.z); if (d < bd){ bd = d; bi = i; } }); return bi; };

// ---------- greet / provoke ----------
function lifeNear(){
  if (hero.veh || hero.locked || MEL.grab || MEL.atk || !isQuiet() || GW.aimK > .5) return null;
  let best = null, bd = 2.3;
  for (const n of npcs){ if (!n.g.visible || !freeRole(n) || n.thug || n.fly || !['walk', 'customer', 'sit', 'talkTo'].includes(n.state)) continue; const d = n.g.position.distanceTo(hero.pos); if (d < bd){ bd = d; best = n; } }
  return best;
}
const seated = n => n.state === 'sit' || n.state === 'customer';
function greet(){
  const n = LIFE.near; if (!n || LIFE.hAnim) return;
  hero.d.yaw = Math.atan2(n.g.position.x - hero.pos.x, n.g.position.z - hero.pos.z);
  if (!seated(n)){ n.state = 'talkTo'; n.talkT = 2.6; n.yaw = Math.atan2(hero.pos.x - n.g.position.x, hero.pos.z - n.g.position.z); }
  const hand = !seated(n) && Math.random() < .55;
  heroMove(hand ? 'handshake' : 'greet', hand ? .4 : .6, hand ? 2.8 : 2.6, 1.3);
  if (!seated(n)) npcMove(n, hand ? 'handshake' : 'greet', hand ? .4 : .6, hand ? 2.8 : 2.6, 1.3);
  say(n, rpick(['أهلاً يا باشا', 'إزيك يا طيارة!', 'منوّر الحتة!', 'يا مرحب يا مرحب', 'الله يسلّمك يا حبيبي', 'عامل إيه يا جامد؟']), 2);
  stat('greet');
}
function provoke(){
  const n = LIFE.near; if (!n || LIFE.hAnim) return;
  hero.d.yaw = Math.atan2(n.g.position.x - hero.pos.x, n.g.position.z - hero.pos.z);
  if (!seated(n)){ n.state = 'talkTo'; n.talkT = 3; n.yaw = Math.atan2(hero.pos.x - n.g.position.x, hero.pos.z - n.g.position.z); }
  const ins = Math.random() < .5;
  heroMove(ins ? 'insult' : 'taunt', ins ? .2 : 0, ins ? 2.4 : 1.95, 1.25, () => {
    const r = Math.random(), walker = n.role === 'walker' && !seated(n);
    if (r < .42 && walker){ n.state = 'fight'; n.fightT = 14; n.mel = true; n.mhp = undefined; n.fstyle = Math.random() < .3 ? 'brute' : 'rusher'; say(n, rpick(['انت بتكلمني أنا؟!', 'تعالى بقى!', 'هعلّمك الأدب!']), 2, 'angry'); npcMove(n, 'angry', 0, 1.6, 1.3); }
    else if (r < .85){ say(n, rpick(['روح يا عم الله يسهلك', 'مش فاضيلك', 'ماشي يا عم… ماشي', 'أنا مش هرد عليك', 'اتلم يا جدع']), 2, 'angry'); npcMove(n, 'angry', 0, 1.8, 1.2); if (!seated(n)){ n.state = 'talkTo'; n.talkT = 2.4; } }
    else { say(n, rpick(['خلاص خلاص!', 'أنا ماليش دعوة!', 'سيبني في حالي!']), 1.8); if (!seated(n)){ n.state = 'walk'; n.fleeT = 6; } }
  });
  stat('provoke');
}
const lifeBtns = document.createElement('div'); lifeBtns.id = 'lifeBtns';
lifeBtns.innerHTML = '<button id="greetBtn" aria-label="سلّم"><small data-k="Y">سلّم</small></button><button id="tauntBtn" aria-label="استفز"><small data-k="N">استفز</small></button>';
document.body.appendChild(lifeBtns);
$('greetBtn').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); greet(); });
$('tauntBtn').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); provoke(); });
addEventListener('keydown', e => { if (state !== 'play' || e.repeat) return; if (e.code === 'KeyY') greet(); if (e.code === 'KeyN') provoke(); });

// ---------- breakable things: fruit carts, plastic chairs ----------
const BREAK = { carts: [], chairs: [], bits: [] };
const fruitGeo = new THREE.SphereGeometry(.075, 8, 6), fruitMats = [0xff8f00, 0xe53935, 0xfdd835, 0x7cb342, 0xfb8c00].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .55 }));
function makeFruitCart(x, z, yaw){
  const g = new THREE.Group(), p = [];
  box(p, 1.6, .06, .9, 0, .82, 0, '#8d6e4f'); box(p, 1.7, .22, .05, 0, .94, .45, '#6d4c33'); box(p, 1.7, .22, .05, 0, .94, -.45, '#6d4c33'); box(p, .05, .22, .9, .82, .94, 0, '#6d4c33'); box(p, .05, .22, .9, -.82, .94, 0, '#6d4c33');
  for (const [lx, lz] of [[-.72, .38], [.72, .38], [-.72, -.38], [.72, -.38]]) box(p, .06, .8, .06, lx, .4, lz, '#5d4037');
  box(p, .05, .05, 1.1, -.95, .8, 0, '#5d4037');   // the handle
  const body = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 })); body.castShadow = true; g.add(body);
  const fruit = [];
  for (let i = 0; i < 28; i++){ const m = new THREE.Mesh(fruitGeo, fruitMats[i % fruitMats.length]); m.position.set((Math.random() - .5) * 1.4, .92 + Math.random() * .12, (Math.random() - .5) * .7); m.castShadow = i % 3 === 0; g.add(m); fruit.push(m); }
  g.position.set(x, groundY(x, z), z); g.rotation.y = yaw; scene.add(g);
  const C = { g, fruit, x, z, yaw, broken: false, back: 0 }; BREAK.carts.push(C); return C;
}
function breakCart(C, from){
  if (C.broken) return; C.broken = true; C.back = 90;
  const p = C.g.position, dir = new THREE.Vector3(p.x - from.x, 0, p.z - from.z).normalize();
  for (const m of C.fruit){ const w = new THREE.Vector3(); m.getWorldPosition(w); C.g.remove(m); m.position.copy(w); scene.add(m); BREAK.bits.push({ m, v: dir.clone().multiplyScalar(2 + Math.random() * 4).add(new THREE.Vector3((Math.random() - .5) * 3, 2 + Math.random() * 3, (Math.random() - .5) * 3)), life: 25, home: C }); }
  C.g.rotation.z = (Math.random() < .5 ? -1 : 1) * 1.3; C.g.position.y = groundY(p.x, p.z) + .4;
  playS('wood', .9); playS('wood', .6, .8, .12);
  const owner = npcs.find(n => n.g.visible && n.state !== 'hidden' && n.g.position.distanceTo(p) < 14);
  if (owner) say(owner, rpick(['يا نهار أسود! الفاكهة!', 'عربيتي!! هتدفع تمنها!', 'حرام عليك يا ابني!']), 2.2, 'angry');
  crime('assault', p, 1); streetDrama(p, 2);
}
function resetCart(C){ C.broken = false; C.g.rotation.set(0, C.yaw, 0); C.g.position.y = groundY(C.x, C.z); for (const m of C.fruit){ if (m.parent === scene) scene.remove(m); m.position.set((Math.random() - .5) * 1.4, .92 + Math.random() * .12, (Math.random() - .5) * .7); C.g.add(m); } BREAK.bits = BREAK.bits.filter(b => b.home !== C); }
// plastic café chairs (4 colours from Sketchfab) by the pavement tables: cars send them flying, you knock them over running
const CHAIRM = {};
(async () => { try { const { GLTFLoader } = await import('three/addons/GLTFLoader.js'); const L = new GLTFLoader();
  for (const c of ['red', 'cyan', 'white', 'green']){ const g = (await L.loadAsync(`assets/models/props/plastic-chair-${c}.glb`)).scene; g.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    const bb = new THREE.Box3().setFromObject(g), h = bb.max.y - bb.min.y || 1, s = .84 / h; const w = new THREE.Group(); g.scale.setScalar(s); g.position.y = -bb.min.y * s; w.add(g); CHAIRM[c] = w; }
  placeChairs(); } catch (e){ console.warn('chairs', e); } })();
function placeChairs(){
  const cols = Object.keys(CHAIRM); if (!cols.length) return;
  for (const t of outTables){ for (let s = 0; s < 2; s++){ const a = (s ? -Math.PI / 2 : Math.PI / 2) + (Math.random() - .5) * .4, x = t.x + Math.sin(a) * .8, z = t.z + Math.cos(a) * .8; const m = CHAIRM[cols[(Math.random() * cols.length) | 0]].clone(); m.position.set(x, groundY(x, z), z); m.rotation.y = a + Math.PI; scene.add(m); BREAK.chairs.push({ m, x, z, yaw: m.rotation.y, v: null, spin: null, back: 0 }); } }
}
function knockChair(Ch, from, power){
  if (Ch.v) return; const p = Ch.m.position, d = new THREE.Vector3(p.x - from.x, 0, p.z - from.z).normalize();
  Ch.v = d.multiplyScalar(power).setY(Math.max(1.6, power * .45)); Ch.spin = new THREE.Vector3((Math.random() - .5) * 10, (Math.random() - .5) * 8, (Math.random() < .5 ? -1 : 1) * (5 + Math.random() * 5)); Ch.back = 60; playS('block', .5, 1.35);
}
function breakablesUpdate(dt){
  const hv = hero.veh, sp0 = hv ? Math.abs(hv.speed) : Math.hypot(hero.vel.x, hero.vel.z), sp = Math.max(sp0, LIFE.lastSp || 0), hp = hv ? hv.pos : hero.pos, r = hv ? 2.3 : .75, VC = hv ? vCircles(hv) : null;
  LIFE.lastSp = sp0;
  for (const C of BREAK.carts){
    if (C.broken){ C.back -= dt; if (C.back <= 0 && C.g.position.distanceTo(hp) > 30) resetCart(C); continue; }
    if (hv && sp > 4 && C.g.position.distanceTo(hp) < r + .9){ breakCart(C, hp); hv.speed *= .8; shake = Math.max(shake, .15); }
  }
  for (const Ch of BREAK.chairs){
    const m = Ch.m;
    if (!Ch.v){ if (sp > (hv ? 3 : 4.5) && Math.abs(m.position.x - hp.x) < 4 && Math.abs(m.position.z - hp.z) < 4 && (hv ? VC.some(c => Math.hypot(m.position.x - c.x, m.position.z - c.z) < c.r + .55) : Math.hypot(m.position.x - hp.x, m.position.z - hp.z) < r)) knockChair(Ch, hp, hv ? 3 + sp * .45 : 3.2); continue; }
    const gy = groundY(m.position.x, m.position.z);
    if (m.position.y > gy + .01 || Ch.v.y > 0){ Ch.v.y -= 9.8 * dt; m.position.addScaledVector(Ch.v, dt); m.rotation.x += Ch.spin.x * dt; m.rotation.y += Ch.spin.y * dt; m.rotation.z += Ch.spin.z * dt;
      if (m.position.y < gy){ m.position.y = gy; Ch.v.multiplyScalar(.4); Ch.v.y = Math.abs(Ch.v.y) > 1 ? -Ch.v.y * .3 : 0; Ch.spin.multiplyScalar(.35); playS('block', .25 * sfxVol(m.position.x, m.position.z, 8), 1.5); if (!Ch.v.y){ m.rotation.x = Math.round(m.rotation.x / (Math.PI / 2)) * Math.PI / 2; m.rotation.z = Math.round(m.rotation.z / (Math.PI / 2)) * Math.PI / 2; if (!m.rotation.x && !m.rotation.z){ m.rotation.z = Ch.spin.z < 0 ? -Math.PI / 2 : Math.PI / 2; } if (m.rotation.x || m.rotation.z) m.position.y = gy + .22; } } }
    Ch.back -= dt; if (Ch.back <= 0 && m.position.distanceTo(hp) > 30){ m.position.set(Ch.x, groundY(Ch.x, Ch.z), Ch.z); m.rotation.set(0, Ch.yaw, 0); Ch.v = null; }
  }
  for (const b of BREAK.bits){ if (b.life <= 0) continue; b.life -= dt; const m = b.m, gy = groundY(m.position.x, m.position.z) + .07;
    if (m.position.y > gy || b.v.y > 0){ b.v.y -= 9.8 * dt; m.position.addScaledVector(b.v, dt); if (m.position.y < gy){ m.position.y = gy; b.v.y *= -.35; b.v.x *= .6; b.v.z *= .6; } }
    else if (Math.abs(b.v.x) + Math.abs(b.v.z) > .02){ b.v.x *= .92; b.v.z *= .92; m.position.x += b.v.x * dt; m.position.z += b.v.z * dt; } }
}
// a few fruit carts by the market stalls
(() => { let k = 0; for (const L of stallLists) for (let i = 3; i < L.length && k < 8; i += 5){ const s = L[i];   // an open bit of pavement next to the stall, where a car can get at it
  for (let a = 0; a < 8; a++){ const x = s.x + Math.sin(a * .785) * 3, z = s.z + Math.cos(a * .785) * 3; if (!inWorld(x, z) || staticBlocked(x, z, 1.1)) continue; makeFruitCart(x, z, a * .785 + Math.PI / 2); k++; break; } } })();

// ---------- random street events ----------
const EVENTS = ['fight', 'accident', 'wedding', 'funeral', 'parade', 'musaharati'];
function eventSpot(minR, maxR){ const p = heroAt(); for (let k = 0; k < 40; k++){ const a = Math.random() * 6.28, r = minR + Math.random() * (maxR - minR), x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r; if (!inWorld(x, z) || staticBlocked(x, z, 3) || onScreen(x, z) || !areaClear(x, z, 6.3)) continue; return new THREE.Vector3(x, groundY(x, z), z); } return null; }
const areaClear = (x, z, r) => { for (let i = 0; i < 12; i++){ const a = i / 12 * 6.28; for (const k of [.55, 1]) if (staticBlocked(x + Math.sin(a) * r * k, z + Math.cos(a) * r * k, .5) || !lineOfSight(x, z, x + Math.sin(a) * r * k, z + Math.cos(a) * r * k)) return false; } return true; };
function takeNPCs(k){ const L = []; for (const n of npcs){ if (L.length >= k) break; if (n.state === 'hidden' && !n.role && !n.crowd && !n.thug) L.push(n); } return L.length === k ? L : null; }
function placeNPC(n, x, z, yaw){ n.role = 'ev'; n.g.visible = true; n.g.position.set(x, groundY(x, z), z); n.yaw = yaw; n.g.rotation.set(0, yaw, 0); n.state = 'event'; n.fall = 0; n.downT = 0; n.fly = null; }
const faceTo = (n, p) => Math.atan2(p.x - n.g.position.x, p.z - n.g.position.z);
function startEvent(kind){
  endEvent();
  const ramadan = PROG.ramadan, night = isNight();
  if (kind === 'musaharati' && !(ramadan && night)) kind = rpick(['fight', 'accident', 'wedding']);
  if (kind === 'parade' && night) kind = 'wedding';
  const P = kind === 'parade' ? heroAt().clone() : eventSpot(28, 65); if (!P) return false;   // the parade is made of passing cars: no open spot needed
  const E = { kind, P, t: 0, life: 80, ppl: [], props: [], cars: [], cars2: [] };
  const crowd = (L, from, r, z0) => { for (let i = from; i < L.length; i++){ const a = (i - from) / (L.length - from) * 6.28 + .4, x = P.x + Math.sin(a) * r, z = P.z + z0 + Math.cos(a) * r; placeNPC(L[i], x, z, 0); L[i].yaw = faceTo(L[i], P); if (i % 2) startFilming(L[i], P, 999); else L[i].watch = true; } };
  if (kind === 'fight'){ const L = takeNPCs(6); if (!L) return false; placeNPC(L[0], P.x, P.z - .7, 0); placeNPC(L[1], P.x, P.z + .7, Math.PI); crowd(L, 2, 4.2, 0); E.ppl = L; }
  else if (kind === 'accident'){
    const L = takeNPCs(5); if (!L) return false;
    const a = addVehicle('car', P.x - 1.4, P.z, .55, rpick(COLORS)), b = addVehicle('taxi', P.x + 1.7, P.z + .5, -1.95, '#f2f2f2');
    for (const v of [a, b]){ v.dmg = 80; v.evCar = true; dentCar(v, 0, 2.2, .35); carDamaged(v, 14, 0, 2.2); }
    E.cars = [a, b]; placeNPC(L[0], P.x - .9, P.z + 2.6, 0); placeNPC(L[1], P.x + .9, P.z + 2.6, 0); L[0].yaw = faceTo(L[0], L[1].g.position); L[1].yaw = faceTo(L[1], L[0].g.position); crowd(L, 2, 6, 1); E.ppl = L;
  }
  else if (kind === 'wedding'){
    const L = takeNPCs(7); if (!L) return false;
    for (let i = 0; i < 7; i++){ const a = i / 7 * 6.28; placeNPC(L[i], P.x + Math.sin(a) * 2.2, P.z + Math.cos(a) * 2.2, 0); L[i].yaw = faceTo(L[i], P); }
    const lights = new THREE.Group(), cols = [0xff4060, 0xffd040, 0x40c0ff, 0x60ff80], bulb = new THREE.SphereGeometry(.06, 6, 4), mats = cols.map(c => new THREE.MeshBasicMaterial({ color: c }));
    const poleM = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: .8 }), wireM = new THREE.LineBasicMaterial({ color: 0x222222 });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, 4), poleM); mast.position.set(P.x, P.y + 2, P.z); lights.add(mast);
    for (let j = 0; j < 6; j++){ const a = j / 6 * 6.28 + .3, px = P.x + Math.sin(a) * 4.5, pz = P.z + Math.cos(a) * 4.5;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, 3), poleM); pole.position.set(px, P.y + 1.5, pz); lights.add(pole);
      const pts = []; for (let s = 0; s <= 8; s++){ const k = s / 8, x = P.x + (px - P.x) * k, z = P.z + (pz - P.z) * k, y = P.y + 3.95 - 1 * k - Math.sin(k * Math.PI) * .35; pts.push(new THREE.Vector3(x, y, z)); if (s > 0 && s < 8){ const m = new THREE.Mesh(bulb, mats[(s + j) % 4]); m.position.set(x, y - .07, z); lights.add(m); } }
      lights.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireM)); }
    scene.add(lights); E.props.push(lights);
    const L2 = lightGet(0xffb060, night ? 6 : 2, 16, 2); L2.position.set(P.x, 3, P.z); E.props.push(L2); E.ppl = L;
  }
  else if (kind === 'funeral'){
    const L = takeNPCs(6); if (!L) return false;
    const tent = new THREE.Group(), p = []; box(p, 6.4, .08, 4.2, 0, 3.1, 0, '#a31515'); box(p, 6.4, 3.1, .04, 0, 1.55, -2.1, '#b71c1c'); box(p, .04, 3.1, 4.2, -3.2, 1.55, 0, '#0d47a1'); box(p, .04, 3.1, 4.2, 3.2, 1.55, 0, '#0d47a1');
    for (let i = 0; i < 4; i++) box(p, .06, 3.1, .06, i < 2 ? -3.15 : 3.15, 1.55, i % 2 ? 2.05 : -2.05, '#888');
    tent.add(new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, side: THREE.DoubleSide })));
    tent.position.set(P.x, P.y, P.z); scene.add(tent); E.props.push(tent);
    if (CHAIRM.white) for (let i = 0; i < 10; i++){ const c = CHAIRM.white.clone(), x = P.x - 2.4 + (i % 5) * 1.2, z = P.z - 1.2 + Math.floor(i / 5) * 1.3; c.position.set(x, P.y, z - .1); c.rotation.y = 0; scene.add(c); E.props.push(c); }
    for (let i = 0; i < 5; i++){ seatNPC(L[i], P.x - 2.4 + i * 1.2, P.z - 1.2, 0); L[i].g.position.y = P.y + .05; L[i].role = 'ev'; }
    placeNPC(L[5], P.x + 3.8, P.z + 2.6, 0); L[5].yaw = faceTo(L[5], P); E.ppl = L;
  }
  else if (kind === 'parade'){
    const near = traffic.filter(c => !c.userData.off && c.position.distanceTo(heroAt()) < 180).sort((a, b) => a.position.distanceTo(heroAt()) - b.position.distanceTo(heroAt())).slice(0, 5); if (near.length < 2) return false;
    for (const c of near){ const f = new THREE.Mesh(new THREE.PlaneGeometry(.8, .5), new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide })); f.position.set(.98, 1.95, -.95); f.rotation.y = Math.PI / 2; f.userData.flag = true; c.add(f); E.props.push(f); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, 1.1), new THREE.MeshBasicMaterial({ color: 0x333333 })); pole.position.set(.9, 1.6, -.55); pole.rotation.z = -.25; c.add(pole); E.props.push(pole); c.userData.paradeT = 70; }
    E.cars2 = near; E.P = near[0].position;
  }
  else if (kind === 'musaharati'){ const L = takeNPCs(1); if (!L) return false; const n = L[0]; placeNPC(n, P.x, P.z, 0); n.state = 'walk'; n.block = nearestBlock(P); n.t = Math.random() * 4; n.speed = .8; n.dir = 1; E.ppl = L; E.drum = 0; E.P = n.g.position; }
  LIFE.ev = E; return true;
}
const flagTex = (() => { const c = document.createElement('canvas'); c.width = 60; c.height = 40; const g = c.getContext('2d'); g.fillStyle = '#ce1126'; g.fillRect(0, 0, 60, 14); g.fillStyle = '#fff'; g.fillRect(0, 13, 60, 14); g.fillStyle = '#000'; g.fillRect(0, 26, 60, 14); g.fillStyle = '#c09300'; g.beginPath(); g.arc(30, 20, 4, 0, 7); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
function endEvent(){
  const E = LIFE.ev; if (!E) return; LIFE.ev = null;
  for (const n of E.ppl){ if (n.role !== 'ev') continue; n.role = null; n.state = 'hidden'; n.g.visible = false; n.mstrike = null; n.watch = false; n.speed = 1.1 + Math.random() * .5; if (n.phone) n.phone.visible = false; if (n.phone3) n.phone3.visible = false; }
  for (const o of E.props){ if (o.userData && o.userData.pooled){ lightPut(o); continue; } if (o.parent) o.parent.remove(o); }
  for (const v of E.cars){ const i = vehicles.indexOf(v); if (i >= 0 && hero.veh !== v){ vehicles.splice(i, 1); scene.remove(v.mesh); } }
  for (const c of E.cars2) c.userData.paradeT = 0;
}
function eventUpdate(dt, t){
  if (!LIFE.ev){ LIFE.eventT -= dt; if (LIFE.eventT <= 0){ LIFE.eventT = 60 + Math.random() * 60; if (isQuiet() && !POL.on && modeObj.vehicles) startEvent(rpick(EVENTS)); } return; }
  const E = LIFE.ev; E.t += dt; const far = heroAt().distanceTo(E.P);
  if ((E.t > E.life && far > 60) || E.t > 240 || !isQuiet() || POL.on && far > 80){ endEvent(); return; }
  for (const n of E.ppl) if (n.watch && n.state === 'event'){ if (n.r3) n.mstrike = { clip: 'cheer', t: (t * .8 + n.phase) % 2.8 }; }
  if (E.kind === 'fight'){
    const [a, b] = E.ppl;
    if (a.state === 'event' && b.state === 'event') for (const [x, y] of [[a, b], [b, a]]){
      x.yaw = faceTo(x, y.g.position); x.atkT = (x.atkT ?? Math.random()) - dt;
      if (x.r3 && !x.punchT) x.mstrike = { clip: 'fightIdle', t: (t + x.phase) % 1.5 };
      if (x.atkT <= 0){ x.atkT = .7 + Math.random() * .9; x.punchT = .3; x.mstrike = null; x.arms[1].rotation.x = -1.6; if (far < 35) playS('punch', .5 * sfxVol(x.g.position.x, x.g.position.z, 10), 1, .12); if (Math.random() < .35) say(x, rpick(['تعالى هنا!', 'انت فاكر نفسك مين؟!', 'هموّتك!', 'سيبوني عليه!']), 1.3, 'angry'); if (Math.random() < .25) npcMove(y, 'hit', 0, .8, 1.3); }
      if (x.punchT > 0) x.punchT = Math.max(0, x.punchT - dt);
    }
    if (Math.random() < dt * .25 && E.ppl[2]) say(E.ppl[2], rpick(['فضّوها يا جماعة!', 'خلاص يا رجالة!', 'صلّوا على النبي!']), 1.6);
  }
  if (E.kind === 'accident') for (const n of E.ppl.slice(0, 2)){ if (n.state !== 'event') continue; if (n.r3) n.mstrike = { clip: 'argue', t: (t * .9 + n.phase) % 3 }; else n.gestT = Math.max(n.gestT || 0, .5); if (Math.random() < dt * .5) say(n, rpick(['انت اللي غلطان!', 'مين اللي هيدفع؟!', 'الرخصة يا عم!', 'بص عملت إيه في عربيتي!', 'انت سايق ولا نايم؟!']), 1.8, 'angry'); }
  if (E.kind === 'wedding'){
    E.ppl.forEach((n, i) => { if (n.state !== 'event') return; if (n.r3) n.mstrike = { clip: i % 3 === 2 ? 'clap' : i % 2 ? 'dance1' : 'dance2', t: (t * .9 + i) % 5 };
      else { n.body.position.y = Math.abs(Math.sin(t * 6 + i)) * .12; n.arms[0].rotation.x = -2.6 + Math.sin(t * 6 + i) * .3; n.arms[1].rotation.x = -2.6 - Math.sin(t * 6 + i) * .3; } });
    if (Math.random() < dt * .35) say(E.ppl[(Math.random() * E.ppl.length) | 0], rpick(['مبروووك!', 'لولولولوليييي', 'عقبال عندك يا طيارة!', 'يا حلاوة يا حلاوة!']), 1.6);
  }
  if (E.kind === 'funeral'){ const n = E.ppl[5]; if (n && n.state === 'event' && far < 12 && Math.random() < dt * .2) say(n, rpick(['البقاء لله', 'شد حيلك', 'إنا لله وإنا إليه راجعون']), 2.2); }
  if (E.kind === 'parade') for (const c of E.cars2){ const u = c.userData; if (!(u.paradeT > 0)) continue; u.paradeT -= dt; for (const o of c.children) if (o.userData.flag) o.rotation.x = Math.sin(t * 9 + c.id) * .25; if (Math.random() < dt * .8 && c.position.distanceTo(heroAt()) < 35) horn(); }
  if (E.kind === 'musaharati'){ const n = E.ppl[0]; if (n.state !== 'walk' && n.state !== 'event') return; E.drum -= dt; if (E.drum <= 0){ E.drum = .55; const v = sfxVol(n.g.position.x, n.g.position.z, 12); playS('block', .55 * v, .55); playS('block', .35 * v, .7, .27); if (Math.random() < .12) say(n, rpick(['اصحى يا نايم… وحّد الدايم', 'السحور يا عباد الله', 'رمضان كريم!']), 2.6); } }
}

// ---------- every frame (after the people have moved) ----------
function streetLifeUpdate(dt, t){
  if (LIFE.filmCd > 0) LIFE.filmCd -= dt;
  heroMoveUpdate(dt);
  for (const n of npcs){
    if (n.state === 'hidden') continue;
    if (n.fly && n.spinZ) n.g.rotation.z += n.spinZ * dt;
    else { n.spinZ = 0; if (n.g.rotation.z) n.g.rotation.z *= 1 - damp(3, dt); }
    if (n.state === 'film') filmUpdate(n, dt);
    else if (n.state === 'cover') coverUpdate(n, dt);
    else if (n.state === 'talkTo'){ n.talkT -= dt; n.yaw = Math.atan2(hero.pos.x - n.g.position.x, hero.pos.z - n.g.position.z); if (n.talkT <= 0) n.state = 'walk'; }
    if (n.chaseT > 0) chaseUpdate(n, dt);
    if (n.lifeAnim){ const A = n.lifeAnim; A.t += dt; const ct = A.s0 + A.t * A.rate; n.mstrike = { clip: A.clip, t: Math.min(ct, A.s1) }; if (ct >= A.s1){ n.lifeAnim = null; n.mstrike = null; } }
  }
  if (state === 'play'){ bumpUpdate(dt); shuttersUpdate(dt); breakablesUpdate(dt); eventUpdate(dt, t); }
  LIFE.near = lifeNear(); document.body.classList.toggle('near-npc', !!LIFE.near);
  // something loud going on near you: people film it
  if (state === 'play' && ((MEL.atk && fightNear()) || GW.fireT > 0 || EXPL.list.length)) streetDrama(heroAt(), 3);
}
const fightNear = () => npcs.some(n => (n.state === 'fight' || n.state === 'stagger' || n.state === 'down') && n.g.visible && n.g.position.distanceTo(hero.pos) < 6);
