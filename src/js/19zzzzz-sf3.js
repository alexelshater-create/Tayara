// ================= stage 18½: the third batch of real models (assets/props/sf3, CC BY / CC0, credits in CREDITS.md) =================
// The police Elantra and the «بوكس» pickup, a clean black-and-white Lada taxi (the old one had inside-out faces), the Lada
// fixed, both trams, the hantour and its horse, falafel trays, a PS2, the football court and goals, the shop's racks.
// Also: damage now lands on the real model (dents, burnt shell), not on the hidden old box car.
const SF3_NAMES = ['police-elantra', 'police-box', 'taxi', 'lada-car', 'tram-yellow', 'tram-blue', 'hantour', 'hantour-carriage', 'horse', 'falafel-tray', 'falafel-balls',
  'football-court', 'football-goal', 'ps2', 'grocery-rack', 'shop-counter', 'shop-shelf', 'kiosk', 'newspaper-stand', 'beach-chair-white', 'beach-chair-blue', 'beach-umbrella', 'beach-cabin', 'beach-cabins-row',
  'fruit-veg-cart', 'termis-cart', 'corn-grill-cart', 'fresca-box', 'cotton-candy-pole', 'electric-cabinet', 'bench', 'tetrapod', 'tetrapod-pile', 'fishing-boat-eg', 'goods-wagon', 'footbridge',
  'petrol-station', 'scrapyard', 'substation', 'bank-facade', 'villa-palace'];
// the small ones the streets need at once load with the game; the big, rarer ones (trams, hantour, the set pieces, the
// court…) come in afterwards, while you play (until then the old drawn ones stand in)
const SF3_LATER = new Set(['tram-yellow', 'tram-blue', 'hantour', 'hantour-carriage', 'horse', 'football-court', 'football-goal', 'ps2', 'shop-counter', 'shop-shelf', 'goods-wagon', 'footbridge',
  'petrol-station', 'scrapyard', 'substation', 'bank-facade', 'villa-palace', 'police-box', 'cotton-candy-pole', 'electric-cabinet']);
async function sf3Load(list){
  try {
    const { GLTFLoader } = await import('three/addons/GLTFLoader.js'); const ld = new GLTFLoader();
    const got = await Promise.all(list.map(n => ld.loadAsync(`assets/props/sf3/${n}.glb`).catch(() => null)));
    got.forEach((g, i) => {
      if (!g) return; const n = list[i]; g.scene.updateMatrixWorld(true);
      const parts = []; g.scene.traverse(o => { if (!o.isMesh) return; const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld);
        for (const m of (Array.isArray(o.material) ? o.material : [o.material])){ m.side = THREE.FrontSide; if (m.map) m.map.anisotropy = 4; }
        parts.push({ name: o.name, geo, mat: o.material }); });
      SFM[n] = parts;
    });
  } catch (e){ console.warn('sf3 models', e); }
}
await sf3Load(SF3_NAMES.filter(n => !SF3_LATER.has(n)));
const SF3_READY = new Promise(res => setTimeout(() => sf3Load(SF3_NAMES.filter(n => SF3_LATER.has(n))).then(res), 2500));

// put a different model on a car that already wears one
function sfReskin(v, model, tint){
  const g = v.mesh || v; if (!SFM[model] || !g) return false;
  if (g.userData.sf){ for (const c of g.children.slice()) if (c.visible && !c.userData.fx && !c.isLight && !c.userData.keep) g.remove(c); g.userData.sf = null; }
  if (!sfSkin(g, model, tint)) return false;
  if (v.mesh) v.wheels = g.children.filter(c => c.userData.wheelPivot && c.visible).map(pv => ({ pivot: pv, mesh: pv.children[0], front: pv.userData.front, r: .31 }));
  return true;
}
const sfCarFor0 = sfCarFor;
sfCarFor = function(kind){ if (kind === 'taxi' && SFM.taxi) return ['taxi', null]; return sfCarFor0(kind); };
// the taxis already in the street and the parked ones, the hero's taxi
for (const c of traffic) if (c.userData.sf === 'lada-taxi' && SFM.taxi) sfReskin(c, 'taxi');
for (const v of vehicles) if (v.mesh && v.mesh.userData.sf === 'lada-taxi' && SFM.taxi) sfReskin(v, 'taxi');
for (const v of vehicles) if (v.mesh && v.mesh.userData.sf === 'lada-car' && SFM['lada-car']) sfReskin(v, 'lada-car', pick(SF_PAINT));
for (const c of traffic) if (c.userData.sf === 'lada-car') sfReskin(c, 'lada-car', pick(SF_PAINT));

// ---------- police cars: the white Elantra with the blue stripe; the «بوكس» pickup from 4 stars ----------
const LBAR = { geo: new THREE.BoxGeometry(.5, .12, .22), r: () => new THREE.MeshStandardMaterial({ color: 0x400008, emissive: 0xff1030, emissiveIntensity: .2, roughness: .3 }), b: () => new THREE.MeshStandardMaterial({ color: 0x000840, emissive: 0x1040ff, emissiveIntensity: .2, roughness: .3 }) };
function policeSkin(v, model){
  if (!SFM[model] || !sfReskin(v, model)) return;
  for (const c of v.mesh.children.slice()) if (c.userData.keep) v.mesh.remove(c);   // a light bar from an earlier skin
  const g = v.mesh, box = new THREE.Box3(); for (const c of g.children) if (c.visible && c.isMesh) box.expandByObject(c);
  const top = (box.max.y - g.position.y) / (g.scale.y || 1), zc = model === 'police-box' ? .35 : -.1;
  const red = LBAR.r(), blue = LBAR.b(), base = new THREE.Mesh(new THREE.BoxGeometry(1.15, .07, .3), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: .5 }));
  base.position.set(0, top + .03, zc); const mr = new THREE.Mesh(LBAR.geo, red), mb = new THREE.Mesh(LBAR.geo, blue); mr.position.set(.3, top + .12, zc); mb.position.set(-.3, top + .12, zc);
  for (const m of [base, mr, mb]){ m.userData.keep = true; m.castShadow = !LOW; g.add(m); }
  g.userData.red = red; g.userData.blue = blue;
}
{ const _pu = polUnit; polUnit = function(i){ const fresh = !POL.units[i], u = _pu(i); if (fresh && u) policeSkin(u.v, i >= 3 && i <= 5 && SFM['police-box'] ? 'police-box' : 'police-elantra'); return u; }; }
SF3_READY.then(() => { for (const i of [3, 4, 5]){ const u = POL.units[i]; if (u && !u.active && SFM['police-box'] && u.v.mesh.userData.sf !== 'police-box') policeSkin(u.v, 'police-box'); } });
policeSkin(copCar, 'police-elantra');

// ---------- damage on the real model ----------
const sfBodyOf = v => v.mesh && v.mesh.userData.sf ? v.mesh.children.find(c => c.isMesh && c.visible && !c.userData.fx && !c.userData.keep && c.geometry && c.geometry.attributes.position.count > 200) : null;
{ const _dc = dentCar; dentCar = function(v, lx, lz, amount){
  const b = sfBodyOf(v); if (!b){ _dc(v, lx, lz, amount); return; }
  if (!b.userData.dented){ b.geometry = b.geometry.clone(); b.userData.dented = true; }
  const P = b.geometry.attributes.position; let moved = false;
  for (let i = 0; i < P.count; i++){
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), d = Math.hypot(x - lx, z - lz);
    if (d > 1.1 || y < .25) continue;
    const k = (1 - d / 1.1) ** 2 * amount, len = Math.hypot(x, z) || 1;
    P.setX(i, x - x / len * k * .6); P.setZ(i, z - z / len * k); if (y > .9) P.setY(i, y - k * .25); moved = true;
  }
  if (moved){ P.needsUpdate = true; b.geometry.computeVertexNormals(); }
}; }
{ const _ex = explode; explode = function(v){ _ex(v);
  if (v.mesh && v.mesh.userData.sf) v.mesh.traverse(c => { if (!c.isMesh || c.userData.fx || !c.visible) return;
    c.material = (Array.isArray(c.material) ? c.material : [c.material]).map(m => { m = m.clone(); if (m.color) m.color.multiplyScalar(.1); if (m.map) m.map = null; m.roughness = 1; if (m.emissive) m.emissiveIntensity = 0; return m; });
    if (c.material.length === 1) c.material = c.material[0]; }); }; }

// ---------- the trams: Alexandria's yellow city tram and the blue Raml tram, real models ----------
function sfGroup(name, len){
  const parts = SFM[name]; if (!parts) return null; const g = new THREE.Group();
  for (const p of parts){ const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = !LOW; m.receiveShadow = true; g.add(m); }
  if (len){ const b = new THREE.Box3().setFromObject(g), L = b.max.z - b.min.z; if (L > 1) g.scale.setScalar(len / L); }
  return g;
}
(async () => {
  await SF3_READY;
  for (let i = 0; i < 240 && !CTRAM.ready; i++) await new Promise(r => setTimeout(r, 500));
  const y = sfGroup('tram-yellow', CT_CAR - .3), b = sfGroup('tram-blue', CT_CAR - .3);
  if (!y && !b) return;
  if (y) CTRAM.glb.yellow = y; CTRAM.glb.blue = b || y;
  for (const T of CTRAM.trams) if (T.cars){ for (const c of T.cars) scene.remove(c.obj); T.cars = null; }   // rebuilt with the new ones when next seen
  CTRAM.ready = true;
})();

// many copies of a real model, gathered while building and put down at the end in one go (one InstancedMesh per piece)
function sfPush(map, name, x, y, z, ry){ if (!name || !SFM[name]) return false; (map[name] = map[name] || []).push([x, y, z, ry]); return true; }
function sfFlush(grp, map){ for (const [nm, l] of Object.entries(map)){ const g = sfInst(nm, l); if (g) grp.add(g); } }

// ---------- more of the likes in their places ----------
// the fishing boats at anchor: the Egyptian wooden boat
{ const fb = SFM['fishing-boat-eg']; if (fb && typeof feluccas !== 'undefined') for (const F of feluccas){ for (const c of F.g.children) c.visible = false; const m = sfGroup('fishing-boat-eg'); m.position.y = -.35; m.rotation.y = Math.PI; F.g.add(m); } }
// the corniche's concrete blocks: the real tetrapod (one piece, centred, a little bigger than the model's 1.6 m)
{ const tp = SFM.tetrapod; if (tp && tp.length === 1 && typeof COAST !== 'undefined'){ const g = tp[0].geo.clone(); g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3()); g.translate(-c.x, -c.y, -c.z); g.scale(1.45, 1.45, 1.45); COAST.tetra = g; COAST.mat = tp[0].mat; } }
SF3_READY.then(() => {
  // the PlayStation 2 on the TV stand in طيارة's room (from level 3)
  if (SFM.ps2 && typeof lvlGroups !== 'undefined' && lvlGroups[3]){ const g = sfGroup('ps2'); g.position.set(.72, .5, -2.58); lvlGroups[3].add(g); }
  // the stadium's pitch: real goals with nets
  const gear = scene.getObjectByName('pitchGear');
  if (SFM['football-goal'] && typeof PITCH_B !== 'undefined' && PITCH_B.cx !== undefined && gear){ gear.visible = false;
    for (const s of [-1, 1]){ const g = sfGroup('football-goal'); g.position.set(PITCH_B.cx + s * 15.2, .18, PITCH_B.cz); g.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(g); } }
  // بنك الثغر and قصر الشاطر: the real buildings over the drawn ones (same footprint; their walls stay the solid parts)
  for (const [k, m] of [['bank', 'bank-facade'], ['palace', 'villa-palace']]){ const S = typeof SETS !== 'undefined' && SETS[k]; if (!S || !SFM[m]) continue;
    const old = S.grp.children.find(c => c.isMesh); if (old) old.visible = false;
    const g = sfGroup(m); g.scale.setScalar(1 / SET_K); g.rotation.y = Math.PI; S.grp.add(g); S.grp.updateMatrixWorld(true); }
});
