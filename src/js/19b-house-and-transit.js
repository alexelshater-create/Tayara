// ================= طيارة's house (interior, renovation) and public transport =================
function fadeTo(fn, hold=.25){ return new Promise(res => { const f = $('fade'); f.classList.add('on'); setTimeout(() => { try { fn && fn(); } catch(e){ console.error(e); } setTimeout(() => { f.classList.remove('on'); setTimeout(res, 380); }, hold*1000); }, 380); }); }
// ---- interior ----
const HOUSE_C = new THREE.Vector3(5597, 0, 5600);
const RENO = [
  { lvl: 0, name: 'على قد الحال', price: 0, text: 'مرتبة على الأرض ولمبة عريانة' },
  { lvl: 1, name: 'دهان وسرير', price: 250, text: 'دهان جديد، سرير، ستارة ونور' },
  { lvl: 2, name: 'أنتريه وتلفزيون', price: 600, text: 'سجادة، كنبة، تلفزيون وزرعة' },
  { lvl: 3, name: 'بيت الجامد', price: 1200, text: 'تكييف، بلايستيشن، تلاجة وبرواز ليك' },
];
const roomTex = {
  wall0: makeTex(256,256,(g,w,h)=>{ g.fillStyle='#a89a84'; g.fillRect(0,0,w,h); grain(g,w,h,6000,.18); g.strokeStyle='rgba(40,30,20,.45)'; g.lineWidth=1.5; for (let i=0;i<7;i++){ g.beginPath(); let x=Math.random()*w, y=Math.random()*h; g.moveTo(x,y); for (let k=0;k<6;k++){ x+=Math.random()*30-15; y+=Math.random()*30; g.lineTo(x,y); } g.stroke(); } g.fillStyle='rgba(70,60,40,.25)'; g.fillRect(0,h*.8,w,h*.2); }, [3,1]),
  wall1: makeTex(256,256,(g,w,h)=>{ g.fillStyle='#f1d9c0'; g.fillRect(0,0,w,h); grain(g,w,h,3000,.05); g.fillStyle='#e0bfa0'; g.fillRect(0,h*.82,w,h*.18); }, [3,1]),
  wall3: makeTex(256,256,(g,w,h)=>{ g.fillStyle='#e8eef2'; g.fillRect(0,0,w,h); for (let x=0;x<w;x+=32){ g.fillStyle='rgba(120,150,170,.12)'; g.fillRect(x,0,14,h*.82); } g.fillStyle='#6d8796'; g.fillRect(0,h*.82,w,h*.18); }, [3,1]),
  floor0: makeTex(256,256,(g,w,h)=>{ g.fillStyle='#8a8580'; g.fillRect(0,0,w,h); grain(g,w,h,9000,.2); }, [3,3]),
  floor1: makeTex(256,256,(g,w,h)=>{ for (let y=0;y<4;y++) for (let x=0;x<4;x++){ g.fillStyle=(x+y)%2?'#e9e4da':'#cfc8ba'; g.fillRect(x*64,y*64,64,64); } g.strokeStyle='rgba(0,0,0,.15)'; for (let i=0;i<=4;i++){ g.beginPath(); g.moveTo(i*64,0); g.lineTo(i*64,h); g.stroke(); g.beginPath(); g.moveTo(0,i*64); g.lineTo(w,i*64); g.stroke(); } }, [4,4]),
};
const room = new THREE.Group(); room.position.copy(HOUSE_C); scene.add(room);
const wallMat = new THREE.MeshStandardMaterial({ map: roomTex.wall0, roughness: .95 });
const floorMat = new THREE.MeshStandardMaterial({ map: roomTex.floor0, roughness: .9 });
{ const fl = new THREE.Mesh(new THREE.BoxGeometry(7, .1, 6), floorMat); fl.position.y = -.05; fl.receiveShadow = true; room.add(fl);
  for (const [w, d, x, z] of [[7, .15, 0, -3], [.15, 6, -3.5, 0], [.15, 6, 3.5, 0]]){ const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), wallMat); m.position.set(x, 1.5, z); m.receiveShadow = true; room.add(m); }
  for (const x of [-2.4, 2.4]){ const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3, .15), wallMat); m.position.set(x, 1.5, 3); room.add(m); }
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1), new THREE.MeshStandardMaterial({ color: 0x9fc4e0, emissive: 0x6f9ec0, emissiveIntensity: .6 })); win.position.set(1.6, 1.8, -2.91); room.add(win);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.3), new THREE.MeshStandardMaterial({ map: doorTex, roughness: .8, side: THREE.DoubleSide })); door.position.set(0, 1.15, 3.05); room.add(door); }
const lvlGroups = [0,1,2,3].map(() => { const g = new THREE.Group(); room.add(g); return g; });
const mergedMesh = (parts) => { const m = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 })); m.castShadow = true; m.receiveShadow = true; return m; };
{ // level 0: mattress, crate, bare bulb, rusty wardrobe
  const p = []; box(p, 1.1,.25,2,  -2.6,.13,-1.7, '#9c9a8c'); box(p, .5,.06,.4, -2.6,.28,-2.5, '#d8d4c4'); box(p, .7,.5,.6, -.2,.25,-1.5, '#8a6a3a'); box(p, 1.1,2.1,.6, 2.8,1.05,-2.55, '#5a5048'); box(p, .02,.9,.02, 0,2.55,-.2, '#222'); lvlGroups[0].add(mergedMesh(p));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.08,10,8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 2 })); bulb.position.set(0, 2.05, -.2); lvlGroups[0].add(bulb); }
{ // level 1: bed, wooden wardrobe, table, curtain, lamp
  const p = []; box(p, 1.3,.45,2.1, -2.6,.23,-1.7, '#7a4f2c'); box(p, 1.2,.2,2, -2.6,.55,-1.7, '#e8e4f4'); box(p, 1.3,.9,.1, -2.6,.9,-2.75, '#6a3f20'); box(p, .5,.12,.35, -2.6,.72,-2.4, '#f4f0e0');
  box(p, 1.2,2.2,.6, 2.8,1.1,-2.55, '#8a5a32'); box(p, .02,.25,.02, 2.75,1.1,-2.24, '#d4a62a'); box(p, .9,.06,.7, -.2,.75,-1.5, '#8a5a32'); for (const [x,z] of [[-.6,-1.8],[.2,-1.8],[-.6,-1.2],[.2,-1.2]]) box(p, .05,.72,.05, x,.36,z, '#6a3f20');
  box(p, 1.7,1.3,.04, 1.6,1.85,-2.86, '#b3121f'); lvlGroups[1].add(mergedMesh(p));
  const lamp = new THREE.Mesh(new THREE.ConeGeometry(.22,.25,16,1,true), new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffe2a0, emissiveIntensity: 1.4, side: THREE.DoubleSide })); lamp.position.set(0, 2.6, -.2); lvlGroups[1].add(lamp); }
{ // level 2: carpet, sofa, TV, plant
  const p = []; box(p, 3,.02,2.2, .2,.012,-.2, '#8e2a2a'); box(p, .8,.45,2.2, 2.9,.23,.3, '#3d5a80'); box(p, .25,.5,2.2, 3.2,.6,.3, '#334c6c');
  box(p, 1.4,.5,.45, .2,.25,-2.65, '#3a2a1e'); box(p, 1.5,.85,.08, .2,1.05,-2.72, '#111'); cyl(p, .22,.18,.4, -1.6,.2,-2.5, '#8a5a32'); { const g = new THREE.SphereGeometry(.4,10,8); g.translate(-1.6,.75,-2.5); p.push(colored(g,'#3f7a2e')); }
  lvlGroups[2].add(mergedMesh(p));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.35, .72), new THREE.MeshStandardMaterial({ color: 0x223, emissive: 0x4a7ab8, emissiveIntensity: .9 })); screen.position.set(.2, 1.05, -2.67); lvlGroups[2].add(screen); room.userData.screen = screen; }
{ // level 3: AC, PlayStation, fridge, framed poster of طيارة
  const p = []; box(p, 1,.35,.25, -.5,2.5,-2.8, '#f4f4f0'); box(p, .4,.08,.3, .7,.55,-2.6, '#111'); box(p, .8,1.8,.7, 2.85,.9,1.8, '#e8ecef'); box(p, .03,.6,.03, 2.45,1.2,1.5, '#888');
  lvlGroups[3].add(mergedMesh(p));
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.1), new THREE.MeshStandardMaterial({ map: dataTex(CH.hero.img.face) })); frame.position.set(-3.38, 1.7, 0); frame.rotation.y = Math.PI/2; lvlGroups[3].add(frame);
  const fb = new THREE.Mesh(new THREE.BoxGeometry(.04, 1.2, 1.0), new THREE.MeshStandardMaterial({ color: 0xd4a62a, metalness: .7, roughness: .3 })); fb.position.set(-3.42, 1.7, 0); lvlGroups[3].add(fb); }
const HOUSE_SPOTS = { bed: new THREE.Vector3(5595.4, 0, 5599), wardrobe: new THREE.Vector3(5599.8, 0, 5598.2), table: new THREE.Vector3(5597.6, 0, 5599.6), tv: new THREE.Vector3(5597.2, 0, 5598.4), door: new THREE.Vector3(5597, 0, 5602.4) };
obstacles.push({ minX: 5593.6, maxX: 5595.5, minZ: 5597.1, maxZ: 5599.4 }, { minX: 5599.1, maxX: 5600.4, minZ: 5597.1, maxZ: 5597.9 }, { minX: 5596.3, maxX: 5597.3, minZ: 5598, maxZ: 5599 });
function houseLevel(){ return (typeof SAVE !== 'undefined' && SAVE.house) || 0; }
function houseVisual(){
  const L = houseLevel();
  lvlGroups.forEach((g, i) => { g.visible = i === 0 ? L === 0 : i <= L; });
  wallMat.map = L >= 3 ? roomTex.wall3 : L >= 1 ? roomTex.wall1 : roomTex.wall0; wallMat.needsUpdate = true;
  floorMat.map = L >= 1 ? roomTex.floor1 : roomTex.floor0; floorMat.needsUpdate = true;
}
lvlGroups.forEach((g, i) => g.visible = i === 0);
const roomLight = new THREE.PointLight(0xffe2b0, 0, 9, 1.4); roomLight.position.set(0, 2.5, -.2); room.add(roomLight);
function enterHouse(){
  if (hero.veh) return;
  fadeTo(() => { HOUSE.inside = true; roomLight.intensity = 9; HOUSE.prevCam = camTarget; camTarget = Math.min(camTarget, 3.4); camDist = camTarget; hero.pos.set(HOUSE_SPOTS.door.x, 0, HOUSE_SPOTS.door.z - .6); CAM.orbit = CAM.orbitSm = 0; CAM.tilt = .55; houseVisual(); lookAt.copy(hero.pos); hero.vel.set(0,0,0); });
}
function exitHouse(){
  fadeTo(() => { HOUSE.inside = false; roomLight.intensity = 0; camTarget = HOUSE.prevCam || 5; { const [fx, fz] = freeSpot(SPOT.house.x + 1.4, SPOT.house.z + 1.1); hero.pos.set(fx, .15, fz); } CAM.orbit = CAM.orbitSm = 0; lookAt.copy(hero.pos); hero.vel.set(0,0,0); if (typeof onStoryEvent === 'function') onStoryEvent('exitHouse'); });
}
function houseAction(){
  const p = hero.pos, near = (v, r=1.4) => Math.hypot(p.x - v.x, p.z - v.z) < r;
  if (near(HOUSE_SPOTS.door, 1.3)) return { text: 'اخرج من البيت', fn: exitHouse };
  if (near(HOUSE_SPOTS.bed, 1.7)) return { text: 'نام', fn: openSleep };
  if (near(HOUSE_SPOTS.wardrobe, 1.5)) return { text: 'افتح الدولاب', fn: openWardrobe };
  if (houseLevel() >= 2 && near(HOUSE_SPOTS.tv, 1.4)) return { text: 'اتفرج على التلفزيون', fn: () => fadeTo(() => { advanceTime(2); banner('اتفرجت على ماتش الأهلي والزمالك', 'info', 2.5); }) };
  if (near(HOUSE_SPOTS.table, 1.5) && !(modeId === 'story' && SAVE.m === 0)) return { text: 'جدد البيت', fn: openRenovate };
  return null;
}
// overlays reuse the shop panel
function openPanel(title, rows, note=''){
  hero.locked = true; $('shop').hidden = false; $('shopTitle').textContent = title; $('shopMoney').textContent = note || `معاك ${egp(hero.money)}`;
  $('shopItems').innerHTML = rows.map((r, i) => `<div class="sitem"><span>${r.label}</span>${r.btn ? `<button data-row="${i}" ${r.dim ? 'class="poor"' : ''}>${r.btn}</button>` : `<span class="owned">${r.tag || ''}</span>`}</div>`).join('');
  $('shopItems').querySelectorAll('[data-row]').forEach(b => b.onclick = () => rows[+b.dataset.row].fn());
}
function closePanel(){ $('shop').hidden = true; hero.locked = false; }
function openSleep(){
  openPanel('تنام لحد إمتى؟', [
    { label: 'لحد الصبح (٨ الصبح)', btn: 'نام', fn: () => sleepTo(8) },
    { label: 'لحد بالليل (٩ بالليل)', btn: 'نام', fn: () => sleepTo(21) },
  ], `الساعة دلوقتي ${clockText()}`);
}
function sleepTo(h){ closePanel(); fadeTo(() => { SAVE.time = h; applyTimeOfDay(h); hero.hp = 100; saveStory(); banner(h < 12 ? 'صباح الفل يا طيارة' : 'الدنيا ليلت', 'info', 2.5); if (typeof onStoryEvent === 'function') onStoryEvent('slept', h); }, .8); }
function advanceTime(hours){ if (typeof SAVE === 'undefined') return; SAVE.time = ((SAVE.time ?? 15) + hours) % 24; applyTimeOfDay(SAVE.time); }
function openWardrobe(){
  const owned = SHOP.items.filter(i => i.kind === 'acc' && SAVE.acc[i.id]);
  if (!owned.length) return openPanel('الدولاب', [{ label: 'الدولاب فاضي… اشتري حاجات من محل الأناقة', tag: '' }]);
  const rows = owned.map(it => ({ label: it.name, btn: SAVE.wear[it.id] !== false ? 'اقلعها' : 'البسها', fn: () => { SAVE.wear[it.id] = SAVE.wear[it.id] === false; applyAccessories(); saveStory(); openWardrobe(); } }));
  openPanel('الدولاب', rows);
}
function openRenovate(){
  const L = houseLevel();
  const rows = RENO.slice(1).map(r => r.lvl <= L ? { label: `${r.name}`, tag: 'خلص' } : r.lvl === L + 1 ? { label: `${r.name} · ${r.text}`, btn: `جدد · ${r.price} ج`, dim: hero.money < r.price, fn: () => buyReno(r) } : { label: `${r.name}`, tag: `${r.price} ج` });
  openPanel('تجديد البيت', rows);
}
function buyReno(r){
  if (hero.money < r.price){ $('shopMoney').textContent = `محتاج ${egp(r.price - hero.money)} كمان`; buzz(40); return; }
  hero.money -= r.price; SAVE.house = r.lvl; saveStory(); coin(); buzz(30);
  closePanel(); fadeTo(() => { houseVisual(); banner(`البيت اتجدد: ${r.name}`, 'ok', 3); if (typeof onStoryEvent === 'function') onStoryEvent('renovated', r.lvl); }, .6);
}
// ---- public transport ----
function nearestStop(p, r=2.6){ return STOPS.find(s => Math.hypot(s.pos.x - p.x, s.pos.z - p.z) < r); }
function openTransit(from){
  const rows = STOPS.filter(s => s !== from).map(s => {
    const d = Math.hypot(s.pos.x - from.pos.x, s.pos.z - from.pos.z), fare = Math.max(3, Math.round(d / 30)), kind = d > 140 ? 'ميكروباص' : 'توكتوك';
    return { label: `${kind} ← ${s.name}`, btn: `${fare} ج`, dim: hero.money < fare, fn: () => ride(s, fare, kind) };
  });
  openPanel('رايح فين؟', rows);
}
function ride(to, fare, kind){
  if (hero.money < fare){ $('shopMoney').textContent = 'مفيش أجرة كفاية'; buzz(40); return; }
  closePanel(); hero.money -= fare;
  fadeTo(() => { { const [fx, fz] = freeSpot(to.pos.x + 1.4, to.pos.z + (to.pos.z > ZMAX ? -1.2 : 1.2)); hero.pos.set(fx, .15, fz); } lookAt.copy(hero.pos); hero.vel.set(0,0,0); advanceTime(.4); banner(`${kind.split(' ')[0]} وصلت ${to.name}`, 'info', 2.4); if (typeof onStoryEvent === 'function') onStoryEvent('rode', to.id); }, .9);
}
