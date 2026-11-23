// ================= places you can walk into, and the tram =================
// Each shop has a door on a building in town (a glass door and a sign) and a room far away (like طيارة's house).
// Walking through the door fades into the room; the shopkeeper sells a few things; the door inside takes you back out.
const SHOP_DEFS = [
  { id: 'pharmacy', name: 'صيدلية الشفاء', icon: '💊', color: '#1e5aa8', block: [2, 1], keeper: 'دكتور مجدي', wall: '#eef3f5', floor: '#d9e2e6',
    items: [{ label: '💊 مسكّن وفيتامين (الصحة كلها)', price: 30, hp: 100, say: 'ألف سلامة يا ابني' }, { label: '🩹 بلاستر وشاش', price: 6, hp: 20, say: 'خلي بالك من نفسك' }] },
  { id: 'barber', name: 'حلاق الجامد', icon: '💈', color: '#7a1f2b', block: [3, 2], keeper: 'الأسطى حمو', wall: '#f1e4d0', floor: '#cfc6b8',
    items: [{ label: '✂️ حلاقة وتظبيط دقن', price: 25, say: 'نعيماً يا جامد… بقيت عريس', fx: 'cut' }, { label: '🧴 جيل وبرفان', price: 10, say: 'ريحتك بقت فل', fx: 'cut' }] },
  { id: 'juice', name: 'عصير قصب الحرية', icon: '🥤', color: '#2d7a1f', block: [3, 1], keeper: 'عم سيد العصّار', wall: '#e9f0d8', floor: '#bdb39d',
    items: [{ label: '🥤 كوباية قصب', price: 5, hp: 25, run: true, say: 'قصب ساقع يرد الروح' }, { label: '🥭 مانجا فريش', price: 12, hp: 45, run: true, say: 'مانجا عويس على أصولها' }] },
  { id: 'phones', name: 'موبايلات طيارة', icon: '📱', color: '#202a6e', block: [1, 2], keeper: 'ميدو', wall: '#e6e8f2', floor: '#d5d7de',
    items: [{ label: '🔋 اشحن موبايلك', price: 0, say: 'اشحن براحتك يا معلم', fx: 'charge' }, { label: '📲 كارت شحن ٢٠', price: 20, say: 'الكارت أهو… كلّم الحبايب', fx: 'card' }] },
  { id: 'market', name: 'سوبر ماركت الأمانة', icon: '🛒', color: '#1f6f43', block: [2, 3], keeper: 'الحاج رمضان', wall: '#f4f1e8', floor: '#e2ddd2',
    items: [{ label: '🥫 ساندوتش جبنة وبيبسي', price: 8, hp: 30, say: 'بالهنا والشفا' }, { label: '💧 مية ساقعة', price: 3, hp: 10, run: true, say: 'اتفضل' }, { label: '🍫 شوكولاتة', price: 5, hp: 15, say: 'حلّي بقك' }] },
  { id: 'koshari', name: 'كشري أبو طارق', icon: '🍲', color: '#a33a12', block: [5, 2], keeper: 'أبو طارق', wall: '#f3e0c4', floor: '#b9a48a',
    items: [{ label: '🍲 طبق كشري وسط', price: 20, hp: 70, say: 'زوّد الدقة والشطة' }, { label: '🍮 أرز بلبن', price: 8, hp: 20, say: 'حلو الختام' }] },
  { id: 'bakery', name: 'مخبز العيش البلدي', icon: '🍞', color: '#8a5a12', block: [1, 1], keeper: 'الريّس عبده', wall: '#ead8b8', floor: '#9c8c74',
    items: [{ label: '🍞 خمس أرغفة سخنة', price: 2, hp: 15, say: 'العيش لسه طالع من الفرن' }, { label: '🥐 فينو وجبنة', price: 6, hp: 25, say: 'بالهنا' }] },
  { id: 'police', name: 'قسم شرطة الجمرك', icon: '🚓', color: '#0d3b66', block: [3, 3], keeper: 'الظابط حسام', wall: '#dde3e8', floor: '#b8bfc4',
    items: [{ label: '🗣️ اسأل الظابط على حاجة', price: 0, say: 'الحتة أمان طول ما إحنا هنا… ولو شفت حاجة بلّغ', fx: 'talk' }] },
  { id: 'cafe', name: 'قهوة قصر الملوك (جوه)', icon: '☕', color: '#5a3a1e', door: { x: 12.2, z: 21.66, face: 'pz' }, keeper: 'المعلم عبده', wall: '#d9b98a', floor: '#8a6a4a',
    items: [{ label: '🍵 شاي كشري', price: 5, hp: 20, say: 'تقيل ومظبوط' }, { label: '☕ قهوة مظبوط', price: 8, hp: 25, say: 'على وشها' }, { label: '💨 حجر شيشة تفاح', price: 15, say: 'اشرب يا جامد', fx: 'shisha' }] },
  { id: 'azzouz', name: 'مطعم عزوز (جوه)', icon: '🍕', color: '#b3121f', door: { x: 125.4, z: 39.07, face: 'pz' }, keeper: 'عزوز', wall: '#f2d6b0', floor: '#a0705c',
    items: [{ label: '🍕 بيتزا سوبر سوبريم', price: 40, hp: 100, say: 'أحسن بيتزا في إسكندرية' }, { label: '🍕 حتة مارجريتا', price: 12, hp: 35, say: 'بالهنا يا طيارة' }] },
];
const SHOPS = [];
const ROOM = { W: 10, D: 8, H: 3.4 };
const shopLight = new THREE.PointLight(0xffe8c8, 0, 14, 1.3); scene.add(shopLight);
// ---- doors in town ----
{
  const used = new Set();
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x2a3540, emissive: 0xffd9a0, emissiveIntensity: .35, roughness: .2, metalness: .3 });
  SHOP_DEFS.forEach((def, i) => {
    let door = def.door ? { x: def.door.x, z: def.door.z, ry: def.door.face === 'pz' ? 0 : Math.PI } : null;
    if (!door){
      const [j, k] = def.block, cx = X0 + PITCH / 2 + j * PITCH, cz = Z0 + PITCH / 2 + k * PITCH;
      const b = buildings.filter(b => b.faces && Math.abs(b.cx - cx) < BW / 2 && Math.abs(b.cz - cz) < BW / 2 && b.w >= 6.5 && !used.has(b) && b.faces.some(f => f === 'pz' || f === 'nz')).sort((a, c) => c.w - a.w)[0];
      if (!b){ console.warn('no building for', def.id); return; }
      used.add(b); const f = b.faces.includes('pz') ? 'pz' : 'nz', s = f === 'pz' ? 1 : -1;
      door = { x: b.cx + (b.w > 9 ? -b.w / 4 : 0), z: b.cz + s * (b.d / 2 + .09), ry: s > 0 ? 0 : Math.PI };
    }
    const out = Math.cos(door.ry) > 0 ? 1 : -1;
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.4), doorMat); dm.position.set(door.x, 1.35, door.z + out * .01); dm.rotation.y = door.ry; scene.add(dm);
    glowSigns.push(signBoard(bigSign(`${def.icon} ${def.name}`, def.color, '#fff8e0', 768, 140, 62), door.x, 3.15, door.z + out * .04, 3.9, .72, door.ry, .45));
    const shop = { ...def, out: new THREE.Vector3(door.x, .15, door.z + out * 1.1), outYaw: door.ry, room: { x: -560 + i * 30, z: -560 }, keeperN: null };
    SHOPS.push(shop);
    buildRoom(shop);
  });
}
function nearShopDoor(p){ return SHOPS.find(s => Math.hypot(s.out.x - p.x, s.out.z - p.z) < 1.5); }
// ---- rooms ----
function buildRoom(s){
  const { W, D, H } = ROOM, ox = s.room.x, oz = s.room.z, p = [], glow = [];
  const B = (w, h, d, x, y, z, c, ry) => box(p, w, h, d, ox + x, y, oz + z, c, ry), C = (rt, rb, h, x, y, z, c) => cyl(p, rt, rb, h, ox + x, y, oz + z, c);
  B(W, .1, D, 0, -.05, 0, s.floor);
  B(W, H, .15, 0, H / 2, -D / 2, s.wall); B(.15, H, D, -W / 2, H / 2, 0, s.wall); B(.15, H, D, W / 2, H / 2, 0, s.wall);
  B(W / 2 - .9, H, .15, -(W / 4 + .45), H / 2, D / 2, s.wall); B(W / 2 - .9, H, .15, W / 4 + .45, H / 2, D / 2, s.wall); B(1.8, H - 2.5, .15, 0, 2.5 + (H - 2.5) / 2, D / 2, s.wall);
  B(W, .12, .2, 0, .06, -D / 2 + .1, '#5a4a3a');
  const solid = (w, d, x, z) => obstacles.push({ minX: ox + x - w / 2, maxX: ox + x + w / 2, minZ: oz + z - d / 2, maxZ: oz + z + d / 2 });
  const counter = (x, z, w = 4.6, c = '#7a4f2c') => { B(w, 1, .8, x, .5, z, c); B(w + .1, .06, .9, x, 1.03, z, '#d8d0c0'); solid(w, .8, x, z); };
  const shelves = (z, cols, w = W - 1.2) => { B(w, 2.6, .45, 0, 1.3, z, '#8a6a4a'); solid(w, .45, 0, z); for (let r = 0; r < 4; r++){ B(w, .05, .45, 0, .35 + r * .62, z, '#6a4a2a'); for (let x = -w / 2 + .3; x < w / 2 - .2; x += .34) if (rng() < .85) B(.26, .36, .3, x, .55 + r * .62, z + .02, pick(cols)); } };
  const table = (x, z) => { C(.5, .5, .05, x, .74, z, '#e8e2d4'); C(.05, .05, .72, x, .36, z, '#444'); for (const a of [0, Math.PI]) B(.42, .45, .42, x + Math.sin(a) * .85, .23, z + Math.cos(a) * .85, '#5a7a5a'); };
  s.counter = new THREE.Vector3(ox, 0, oz - 1.6); s.keeperAt = new THREE.Vector3(ox, .15, oz - 2.5);
  switch (s.id){
    case 'pharmacy': counter(0, -1.6, 5, '#f4f4f0'); shelves(-3.6, ['#ffffff', '#cfe3f5', '#2e7dd1', '#e8f4e8', '#d32f2f']); glow.push(['+', '#1faa59', 0, 2.9, -3.35, 1, 1]); break;
    case 'barber':
      for (const z of [-1.5, 1]){ B(.9, .5, .9, -3.6, .45, z, '#b3121f'); B(.9, .9, .15, -4.0, 1.1, z, '#b3121f'); B(.1, 1.2, 1.4, -4.85, 1.7, z, '#bfe3f2'); }
      counter(2.4, -2.4, 2.4); B(.8, .5, 2.6, 3.9, .25, 1.5, '#3a3a3a'); s.counter.set(ox + 2.4, 0, oz - 2.4); s.keeperAt.set(ox - 3, .15, oz - .4); break;
    case 'juice':
      counter(0, -1.6); for (let i = 0; i < 6; i++) B(.6, .4, .5, -4 + i * .5, .2, 2.6 - (i % 2) * .6, pick(['#f28c28', '#ffcc33', '#7bbf3a']));
      for (let i = 0; i < 8; i++) C(.05, .05, 2.4, 3.7 + (i % 3) * .15, 1.2, -3.4 + Math.floor(i / 3) * .15, '#8aa04a');
      B(.8, .9, .6, -1.5, 1.5, -1.6, '#c0c4c8'); for (let i = 0; i < 6; i++) C(.09, .09, .3, .3 + i * .25, 1.2, -1.6, pick(['#f28c28', '#ffcc33', '#7bbf3a', '#c0392b'])); break;
    case 'phones':
      for (const [x, z] of [[-1.8, -1.6], [1.8, -1.6]]){ B(3, .9, .8, x, .45, z, '#e8ecf0'); B(3, .3, .8, x, 1.05, z, '#9ad7f0'); } s.counter.set(ox, 0, oz - 1.6);
      B(W - 1.2, 2.2, .1, 0, 1.6, -3.85, '#1d2340'); for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) B(.4, .7, .06, -4 + i * 1, 1 + r * .8, -3.75, pick(['#111', '#e8e8e8', '#2e7dd1', '#c9a227'])); break;
    case 'market':
      counter(3, 2.4, 2.6); s.counter.set(ox + 3, 0, oz + 2.4); s.keeperAt.set(ox + 3, .15, oz + 1.5);
      for (const x of [-3.6, -1.3]){ B(.6, 1.8, 4.5, x, .9, -1, '#c8c2b4'); solid(1.4, 4.5, x, -1); for (let r = 0; r < 3; r++) for (let z = -3.1; z < 1.2; z += .32) for (const sx of [-1, 1]) if (rng() < .8) B(.2, .3, .25, x + sx * .38, .4 + r * .55, z, pick(['#d32f2f', '#ffca28', '#2e7d32', '#1565c0', '#f57c00', '#ffffff'])); }
      B(2, 2.2, .9, 3.6, 1.1, -3.3, '#dfe6ea'); B(1.8, 1.8, .05, 3.6, 1.2, -2.83, '#a8d8ea'); break;
    case 'koshari':
      counter(0, -1.6, 5); for (let i = 0; i < 4; i++) C(.4, .35, .6, -1.8 + i * 1.2, 1.35, -1.7, '#b0b4b8'); table(-2.5, 1.6); table(2.5, 1.6); break;
    case 'bakery':
      B(4, 2.4, 1.4, -2, 1.2, -3.2, '#9a4a2a'); glow.push(['oven', '#ff7a1a', -2, 1, -2.48, 1.6, .7]); counter(2.2, -1, 3, '#8a6a4a'); s.counter.set(ox + 2.2, 0, oz - 1); s.keeperAt.set(ox + 2.2, .15, oz - 2);
      for (let r = 0; r < 4; r++) for (let i = 0; i < 5; i++) C(.18, .18, .04, 3.4 + (i % 2) * .2, .5 + r * .5, -3.3 + i * .35, '#d9a35a'); B(1.2, 2.2, .5, 3.6, 1.1, -2.6, '#6a4a2a'); break;
    case 'police':
      counter(0, -1.4, 3.6, '#5a6470'); s.counter.set(ox, 0, oz - 1.4);
      for (const x of [-3.2, 3.2]){ B(1.6, .75, .8, x, .38, -2.4, '#7a5a3a'); B(.5, .02, .4, x, .77, -2.4, '#f4f4f0'); }
      C(.03, .03, 2.6, 4.3, 1.3, -3.3, '#888'); B(.9, .2, .02, 4.75, 2.45, -3.3, '#c62828'); B(.9, .2, .02, 4.75, 2.25, -3.3, '#ffffff'); B(.9, .2, .02, 4.75, 2.05, -3.3, '#111111');
      for (let i = 0; i < 7; i++) B(.05, 2.2, .05, -4.6 + i * .18, 1.1, 2.6, '#444'); B(2.2, 3, .1, -3.9, 1.5, 3.6, '#5a6470'); B(3, .45, .5, 2.8, .23, 3.4, '#5a4a3a'); break;
    case 'cafe':
      counter(-2.5, -2.4, 3.6, '#5a3a1e'); s.counter.set(ox - 2.5, 0, oz - 2.4); s.keeperAt.set(ox - 2.5, .15, oz - 3.2);
      table(-2.2, .9); table(1.8, .9); table(2.8, -1.8); B(1.8, 1, .1, 3.2, 2.2, -3.85, '#111'); glow.push(['tv', '#4a7ab8', 3.2, 2.2, -3.79, 1.6, .85]);
      C(.15, .25, .8, 4.2, .4, 2.7, '#2e7dd1'); C(.03, .03, .7, 4.2, 1.15, 2.7, '#888'); break;
    case 'azzouz':
      B(2.6, 2.2, 1.6, 3.2, 1.1, -3.1, '#9a4a2a'); glow.push(['oven', '#ff7a1a', 3.2, .9, -2.28, 1.2, .6]); counter(-1.4, -1.8, 4.2, '#b3121f'); s.counter.set(ox - 1.4, 0, oz - 1.8); s.keeperAt.set(ox - 1.4, .15, oz - 2.7);
      table(-2.8, 1.6); table(1.6, 1.4); break;
  }
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .75 })); m.receiveShadow = true; scene.add(m);
  for (const [kind, c, x, y, z, w, h] of glow){ const g = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: kind === 'oven' ? 1.6 : 1 })); g.position.set(ox + x, y, oz + z); scene.add(g); }
  const sign = signBoard(bigSign(`${s.icon} ${s.name}`, s.color, '#fff8e0', 768, 140, 62), ox, 2.95, oz - D / 2 + .09, 4.2, .77, 0, .4); void sign;
  s.doorIn = new THREE.Vector3(ox, 0, oz + D / 2 - .6);
}
// ---- going in and out ----
const SHOPIN = { s: null };
function enterShop(s){
  if (hero.veh) return;
  fadeTo(() => {
    SHOPIN.s = s; HOUSE.inside = true; HOUSE.shop = s; HOUSE.homeRoom ||= HOUSE.room;
    HOUSE.room = { x0: s.room.x - ROOM.W / 2, x1: s.room.x + ROOM.W / 2, z0: s.room.z - ROOM.D / 2, z1: s.room.z + ROOM.D / 2 + .2 };
    HOUSE.prevCam = camTarget; camTarget = Math.min(camTarget, 3.8); camDist = camTarget;
    hero.pos.set(s.doorIn.x, 0, s.room.z + .4); hero.vel.set(0, 0, 0); CAM.orbit = CAM.orbitSm = 0; CAM.tilt = .5; lookAt.copy(hero.pos);
    shopLight.position.set(s.room.x, 2.9, s.room.z); shopLight.intensity = 4;
    if (!s.keeperN){ s.keeperN = makeNPC(); }
    const n = s.keeperN; n.role = 'keeper'; n.name = s.keeper; n.state = 'idle'; n.g.visible = true; n.g.position.copy(s.keeperAt); n.yaw = 0; n.g.rotation.set(0, 0, 0); n.downT = 0; n.fall = 0;
    banner(`${s.icon} ${s.name}`, 'info', 1.8);
  }, .2).then(() => { if (SHOPIN.s === s && s.keeperN) say(s.keeperN, rpick(['أهلاً يا ' + heroName, 'نورت يا جامد', 'اتفضل يا معلم', 'أؤمر']), 2.2); });
}
function exitShop(){
  const s = SHOPIN.s; if (!s) return;
  fadeTo(() => {
    HOUSE.inside = false; HOUSE.shop = null; HOUSE.room = HOUSE.homeRoom || HOUSE.room; SHOPIN.s = null; shopLight.intensity = 0;
    if (s.keeperN){ s.keeperN.state = 'hidden'; s.keeperN.g.visible = false; }
    camTarget = HOUSE.prevCam || 5; hero.pos.set(s.out.x, .15, s.out.z); hero.vel.set(0, 0, 0); CAM.orbit = CAM.orbitSm = s.outYaw; lookAt.copy(hero.pos);
  });
}
function shopAction(){
  const s = SHOPIN.s, p = hero.pos;
  if (Math.hypot(p.x - s.doorIn.x, p.z - s.doorIn.z) < 1.4) return { text: `اخرج من ${s.name}`, fn: exitShop };
  if (Math.hypot(p.x - s.counter.x, p.z - s.counter.z) < 2.4) return { text: s.id === 'police' ? `كلّم ${s.keeper}` : `اشتري من ${s.keeper} ${s.icon}`, fn: () => openShopMenu(s) };
  return null;
}
function openShopMenu(s){
  openPanel(`${s.icon} ${s.name}`, s.items.map(it => ({ label: it.label, btn: it.price ? `${it.price} ج` : 'يلا', dim: hero.money < it.price, fn: () => buyAt(s, it) })));
}
function buyAt(s, it){
  if (hero.money < it.price){ $('shopMoney').textContent = `محتاج ${egp(it.price - hero.money)} كمان`; buzz(40); return; }
  hero.money -= it.price; closePanel(); if (it.price) coin(); else clink();
  if (it.hp) hero.hp = Math.min(100, hero.hp + it.hp);
  if (it.run){ hero.stamina = 1; hero.tired = false; }
  const fx = { cut: 'شكلك بقى جامد ✂️', charge: 'الموبايل اتشحن 🔋', card: 'الرصيد اتشحن 📲', shisha: 'دماغك رايقة 💨', talk: '' }[it.fx];
  banner(fx || (it.hp ? `${it.label.split(' ')[0]} +${it.hp} صحة` : 'تمام'), 'ok', 2.2);
  if (s.keeperN) say(s.keeperN, it.say, 2.6);
}

// ================= the tram: one yellow two-car tram runs along the market road, stops at the three stops, and you can ride it =================
const tram = { x: TRAM.x0 + 30, dir: 1, speed: 0, stopT: 0, at: null, bellT: 0, mesh: null };
const TRAMR = { on: false, from: null };
{
  const p = [], gl = [];
  for (const off of [5.2, -5.4]){
    box(p, 10, 1.5, 2.5, off, 1.15, 0, '#e8b419'); box(p, 10, .95, 2.46, off, 2.35, 0, '#f3ead2'); box(p, 10.1, .12, 2.56, off, 1.9, 0, '#7a5a12');
    box(p, 9.6, .35, 2.3, off, 3.0, 0, '#9aa0a6'); box(p, 8, .4, 1.8, off, .3, 0, '#2b2b2b');
    for (let i = -4; i <= 4; i++) for (const s of [-1, 1]) box(p, .8, .7, .04, off + i * 1.05, 2.35, s * 1.25, '#2a3a44');
    for (const e of [-1, 1]) box(p, .06, .7, 2, off + e * 5.02, 2.35, 0, '#2a3a44');
  }
  box(p, .6, .9, 2.2, -.1, 1.6, 0, '#3a3a3a');
  // the trolley pole up to the wire
  { const g = new THREE.CylinderGeometry(.04, .04, 3.2, 6); g.rotateZ(-1.1); g.translate(4.6, 4.3, 0); p.push(colored(g, '#2b2f33')); }
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .45, metalness: .2 })); body.castShadow = true; mesh.add(body);
  for (const e of [-1, 1]){ const l = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .3), new THREE.MeshStandardMaterial({ color: 0xfff4d0, emissive: 0xfff0c0, emissiveIntensity: .8 })); l.position.set(e * 10.23, 1.2, 0); l.rotation.y = e * Math.PI / 2; mesh.add(l); }
  const sign = signBoard(bigSign('🚋 بحري ⇄ الرمل', '#2a1700', '#ffd34d', 512, 100, 52), 0, 0, 0, 3, .6, 0, .5); scene.remove(sign); sign.position.set(5.2, 2.95, 1.29); mesh.add(sign);
  mesh.position.set(tram.x, 0, TRAM.z); scene.add(mesh); tram.mesh = mesh;
}
const TRAM_HALF = 10.4;
function tramBlocks(x, z, pad = PR){ return !TRAMR.on && Math.abs(x - tram.x) < TRAM_HALF + pad && Math.abs(z - TRAM.z) < 1.3 + pad; }
function tramBell(){ tone(1320, 1320, .12, 'triangle', .09); tone(1320, 1320, .12, 'triangle', .09, .18); }
function updateTram(dt, t, playing){
  const T = tram;
  if (T.stopT > 0){ T.stopT -= dt; T.speed = 0; if (T.stopT <= 0){ T.lastStop = T.at; T.at = null; if (playing && Math.abs(T.x - hero.pos.x) < 60) tramBell(); } }
  else {
    let target = 7;
    // something in front: the player, the player's car, a car crossing
    const front = T.x + T.dir * TRAM_HALF;
    const ahead = (x, z, lat) => { const a = (x - front) * T.dir; return a > -1 && a < 11 && Math.abs(z - TRAM.z) < lat; };
    if (!TRAMR.on && (hero.veh ? ahead(hero.veh.pos.x, hero.veh.pos.z, 2.6) : ahead(hero.pos.x, hero.pos.z, 1.9))){ target = 0; T.bellT -= dt; if (T.bellT <= 0 && playing){ T.bellT = 2.5; tramBell(); } }
    for (const c of traffic) if (ahead(c.position.x, c.position.z, 2.4)){ target = 0; break; }
    // the next stop in the way it is going: slow down and stop exactly there
    const next = TRAM.stations.filter(s => (s - T.x) * T.dir > .05 && s !== T.lastStop).sort((a, b) => Math.abs(a - T.x) - Math.abs(b - T.x))[0];
    if (next !== undefined){ const d = Math.abs(next - T.x); target = Math.min(target, Math.sqrt(2 * 1.4 * d) + .2); if (d < .25){ T.x = next; T.at = next; T.stopT = 7; T.speed = 0; } }
    // the ends of the line (off the map): turn round
    if ((T.dir > 0 && T.x > TRAM.x1) || (T.dir < 0 && T.x < TRAM.x0)){ T.dir *= -1; T.lastStop = null; T.stopT = 3; }
    T.speed += (target - T.speed) * damp(T.speed > target ? 4 : 1.2, dt);
    if (T.stopT <= 0) T.x += T.speed * T.dir * dt;
  }
  T.mesh.position.x = T.x; T.mesh.rotation.y = T.dir > 0 ? 0 : Math.PI;
  // riding: you stand inside; at a stop you can get off
  if (TRAMR.on){ hero.pos.set(T.x - T.dir * 2, .15, TRAM.z); hero.vel.set(0, 0, 0); }
  // walking in front of it
  else if (playing && !hero.veh && hero.inv <= 0 && T.speed > 2 && tramBlocks(hero.pos.x, hero.pos.z, .1)){ heroDamage(30 * DIFF.dmg, 'car'); hero.inv = 1.6; hero.knock.set(T.dir * 6, 0, hero.pos.z < TRAM.z ? -9 : 9); tramBell(); }
}
function tramAction(p){
  if (hero.veh || TRAMR.on || tram.stopT <= .8) return null;
  if (Math.abs(p.x - tram.x) < TRAM_HALF + 1 && Math.abs(p.z - TRAM.z) < 3.6) return { text: '🚋 اركب الترام (٢ جنيه)', fn: () => {
    if (hero.money < 2) return banner('مفيش ٢ جنيه للتذكرة 😅', 'bad', 1.8);
    hero.money -= 2; TRAMR.on = true; TRAMR.from = tram.at; TRAMR.cam = camTarget; camTarget = 11; CAM.tilt = .5; hero.locked = true; tramBell(); banner('ركبت الترام 🚋 · هتنزل في المحطة الجاية', 'ok', 2.4);
  } };
  return null;
}
function tramRideAction(){
  if (tram.stopT > .5 && tram.at !== null && tram.at !== TRAMR.from) return { text: 'انزل من الترام 🚋', fn: () => endTramRide() };
  return { text: '🚋 الترام ماشي… استنى المحطة الجاية', fn: () => {} };
}
// a new mode / the menu: out of any shop, off the tram
function leavePlaces(){
  if (TRAMR.on){ TRAMR.on = false; hero.locked = false; if (TRAMR.cam) camTarget = TRAMR.cam; }
  if (SHOPIN.s){ if (SHOPIN.s.keeperN){ SHOPIN.s.keeperN.state = 'hidden'; SHOPIN.s.keeperN.g.visible = false; } SHOPIN.s = null; HOUSE.shop = null; HOUSE.inside = false; shopLight.intensity = 0; }
  if (HOUSE.homeRoom) HOUSE.room = HOUSE.homeRoom;
}
function endTramRide(){
  if (!TRAMR.on) return; TRAMR.on = false; hero.locked = false; if (TRAMR.cam) camTarget = TRAMR.cam;
  const [fx, fz] = freeSpot(tram.x, TRAM.z - 6.9); hero.pos.set(fx, .15, fz); hero.vel.set(0, 0, 0); lookAt.copy(hero.pos);
}
