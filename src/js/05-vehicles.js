// ================= vehicles =================
// the street cars: assets/props/auta-cars.glb (tools/make_auta.py). A sedan (parked cars, traffic, the black-and-yellow
// Alexandria taxi) and a police car in Egyptian colours. If the file is missing the boxy cars below are used.
const AUTA = await (async () => {
  try {
    const { GLTFLoader } = await import('three/addons/GLTFLoader.js');
    const g = (await new GLTFLoader().loadAsync('assets/props/auta-cars.glb')).scene; g.updateMatrixWorld(true);
    const o = {}; g.traverse(m => { if (m.isMesh){ const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); geo.applyMatrix4(m.matrixWorld); if (!geo.attributes.normal) geo.computeVertexNormals(); o[m.name] = geo; } });
    if (!o.sedan_rest || !o.police_rest) return null;
    o.sedanTop = new THREE.Box3().setFromBufferAttribute(o.sedan_roof.attributes.position).max.y;
    return o;
  } catch (e){ console.warn('street cars failed, using the boxy ones', e); return null; }
})();
const carGeo = (() => {
  const ws = []; for (const x of [-.86,.86]) for (const z of [-1.38,1.38]){ const g = new THREE.CylinderGeometry(.36,.36,.26,12); g.rotateZ(Math.PI/2); g.translate(x,.36,z); ws.push(g); }
  const hub = []; for (const x of [-.99,.99]) for (const z of [-1.38,1.38]){ const g = new THREE.CylinderGeometry(.2,.2,.02,10); g.rotateZ(Math.PI/2); g.translate(x,.36,z); hub.push(g); }
  const lights = (z, y) => { const a = new THREE.BoxGeometry(.42,.13,.06), b = a.clone(); a.translate(-.62,y,z); b.translate(.62,y,z); return mergeGeometries([a,b]); };
  const bar = new THREE.BoxGeometry(.55,.13,.28);
  return {
    body: (() => { const g = new RoundedBoxGeometry(1.9,.62,4.4,2,.16); g.translate(0,.66,0); return g; })(),
    cabin: (() => { const g = new RoundedBoxGeometry(1.64,.56,2.3,2,.2); g.translate(0,1.2,-.2); return g; })(),
    roof: (() => { const g = new RoundedBoxGeometry(1.5,.06,1.9,2,.03); g.translate(0,1.49,-.25); return g; })(),
    wheels: mergeGeometries(ws), hubs: mergeGeometries(hub), head: lights(2.21,.74), tail: lights(-2.21,.78),
    stripe: (() => { const g = new THREE.BoxGeometry(1.93,.24,3.4); g.translate(0,.62,0); return g; })(),
    barL: (() => { const g = bar.clone(); g.translate(-.3,1.59,-.2); return g; })(),
    barR: (() => { const g = bar.clone(); g.translate(.3,1.59,-.2); return g; })(),
    taxiSign: (() => { const g = new THREE.BoxGeometry(.7,.2,.3); g.translate(0,1.62,-.2); return g; })(),
  };
})();
if (AUTA){
  // the sedan's wheels (for the gold hubs from the garage) and the taxi sign on its roof
  const hub = []; for (const x of [-1.03, 1.03]) for (const z of [1.44, -1.53]){ const g = new THREE.CylinderGeometry(.19,.19,.02,10); g.rotateZ(Math.PI/2); g.translate(x,.3,z); hub.push(g); }
  carGeo.hubs = mergeGeometries(hub);
  carGeo.taxiSign = new THREE.BoxGeometry(.7,.2,.3).translate(0, AUTA.sedanTop + .08, -.3);
}
const carGlass = new THREE.MeshPhysicalMaterial({ color: 0x0b1218, metalness: .3, roughness: .06, envMapIntensity: 1.6 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .9 });
const hubMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: .9, roughness: .3 });
const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: .7 });
const tailMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2020, emissiveIntensity: .7 });
const COLORS = ['#a3132b','#efefef','#1b1d20','#27458a','#878c93','#d39b17','#0f5d4e','#4d2a7a','#c4561a','#5e6b3a'];
const paintCache = {};
const paint = c => paintCache[c] ||= new THREE.MeshPhysicalMaterial({ color: c, metalness: .55, roughness: .3, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: 1.2, side: AUTA ? THREE.DoubleSide : THREE.FrontSide });
const checkerMat = new THREE.MeshStandardMaterial({ map: checkerTex, roughness: .5 });
// a car is drawn in 3 pieces instead of 8 (phones are slow with many separate pieces): the paint (body + roof),
// the rest (glass, tyres, hubs, coloured per vertex) and the lights (one glowing material, tinted per vertex)
const carParts = (() => {
  const ni = g => g.index ? g.toNonIndexed() : g.clone();          // rounded boxes and cylinders store their triangles differently: make them alike
  const cl = (geo, c) => colored(ni(geo), c);
  if (AUTA) return {
    paint: mergeGeometries([AUTA.sedan_body, AUTA.sedan_roof]), rest: AUTA.sedan_rest, lights: AUTA.sedan_lights,
    taxi: mergeGeometries([cl(AUTA.sedan_body, '#161616'), cl(AUTA.sedan_roof, '#f5b800')]),     // Alexandria: black below, yellow on top
  };
  return {
    paint: mergeGeometries([ni(carGeo.body), ni(carGeo.roof)]),
    rest: mergeGeometries([cl(carGeo.cabin, '#0b1218'), cl(carGeo.wheels, '#141414'), cl(carGeo.hubs, '#b8bcc0')]),
    lights: mergeGeometries([cl(carGeo.head, '#fffaf0'), cl(carGeo.tail, '#ff1a1a')]),
  };
})();
const carRestMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .45, roughness: .32, envMapIntensity: 1.3 });
const carLightMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: .7, roughness: .4 });
carLightMat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor.rgb;'); };
const taxiMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: .5, roughness: .3, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: 1.2 });
// some faces of the street-car model point inwards (roof, windows): draw both sides of those materials
const autaSide = m => { if (AUTA) m.side = THREE.DoubleSide; return m; };
autaSide(taxiMat); autaSide(carRestMat);
// «شرطة» on both front doors of the police car
const policeWord = (() => {
  if (!AUTA) return null;
  const tex = makeTex(256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = '900 44px Cairo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl'; g.fillText('شرطة', w/2, h/2 + 2); });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const p = AUTA.police_rest.attributes.position; let half = 0;
  for (let i = 0; i < p.count; i++){ const y = p.getY(i), z = p.getZ(i); if (y > .55 && y < .8 && Math.abs(z) < .4) half = Math.max(half, Math.abs(p.getX(i))); }
  const a = new THREE.PlaneGeometry(1.1, .28).rotateY(Math.PI/2).translate(half + .015, .62, .15), b = new THREE.PlaneGeometry(1.1, .28).rotateY(-Math.PI/2).translate(-half - .015, .62, .15);
  return { geo: mergeGeometries([a, b]), mat };
})();
function makeCar(color, kind='car'){
  const g = new THREE.Group();
  const add = (geo, mat, cast=true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; g.add(m); return m; };
  if (AUTA){
    if (kind === 'police'){
      add(AUTA.police_rest, carRestMat); add(AUTA.police_lights, carLightMat, false); add(policeWord.geo, policeWord.mat, false);
      const red = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff1030, emissiveIntensity: .3 });
      const blue = new THREE.MeshStandardMaterial({ color: 0x000040, emissive: 0x1040ff, emissiveIntensity: .3 });
      add(AUTA.police_red, red, false); add(AUTA.police_blue, blue, false); g.userData.red = red; g.userData.blue = blue;
    } else {
      add(kind === 'taxi' ? carParts.taxi : carParts.paint, kind === 'taxi' ? taxiMat : paint(color)); add(carParts.rest, carRestMat, false); add(carParts.lights, carLightMat, false);
      if (kind === 'taxi') add(carGeo.taxiSign, new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffb000, emissiveIntensity: .3 }), false);
    }
    scene.add(g); return g;
  }
  add(carParts.paint, paint(color)); add(carParts.rest, carRestMat, false); add(carParts.lights, carLightMat, false);
  if (kind === 'police'){
    add(carGeo.stripe, paint('#173a7a'), false);
    const red = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff1030, emissiveIntensity: .3 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x000040, emissive: 0x1040ff, emissiveIntensity: .3 });
    add(carGeo.barL, red, false); add(carGeo.barR, blue, false); g.userData.red = red; g.userData.blue = blue;
  } else if (kind === 'taxi'){
    add(carGeo.stripe, checkerMat, false); add(carGeo.taxiSign, new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffb000, emissiveIntensity: .3 }), false);
  }
  scene.add(g); return g;
}
const motoWheelGeo = (() => { const w = new THREE.CylinderGeometry(.33,.33,.12,18); w.rotateZ(Math.PI/2); const s = new THREE.CylinderGeometry(.18,.18,.13,8); s.rotateZ(Math.PI/2); return mergeGeometries([colored(w.toNonIndexed(),'#151515'), colored(s.toNonIndexed(),'#9a9a9a')]); })();
function makeMoto(color){
  const g = new THREE.Group(); const p = [];
  box(p, .32,.42,1.3, 0,.62,0, color); box(p, .36,.3,.6, 0,.92,.25, color); box(p, .34,.12,.7, 0,.86,-.3, '#151515');
  box(p, .7,.05,.05, 0,1.2,.72, '#222'); box(p, .06,.55,.06, 0,.92,.68, '#666'); box(p, .22,.18,.12, 0,1.0,.85, '#eeeeee');
  box(p, .12,.1,.4, .18,.42,-.55, '#999');
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .4, metalness: .3 });
  const m = new THREE.Mesh(mergeGeometries(p), mat); m.castShadow = true; g.add(m);
  // the two wheels are separate so they can spin (and the front one steer)
  for (const z of [.72, -.72]){ const pv = new THREE.Object3D(); pv.position.set(0, .33, z); pv.userData.wheelPivot = true; pv.userData.front = z > 0; const w = new THREE.Mesh(motoWheelGeo, mat); w.castShadow = true; pv.add(w); g.add(pv); }
  scene.add(g); return g;
}
// The car you drive gets wheels that spin and steer: the first time you get in, its tyres are cut out of the shared
// street-car model (parked and passing cars keep one piece each; 4 more pieces for the 1 car you drive is cheap).
const WHEEL_AXLES = { sedan: { x: .78, r: .335, y: .3, z: [1.43, -1.53] }, police: { x: .74, r: .335, y: .3, z: [1.48, -1.57] } };
const wheelSets = {};
function wheelSet(kind, geo){
  if (wheelSets[kind]) return wheelSets[kind];
  const A = WHEEL_AXLES[kind], P = geo.attributes.position, keep = [], parts = [[], [], [], []];
  for (let t = 0; t < P.count; t += 3){
    let w = -1;
    for (let q = 0; q < 4 && w < 0; q++){
      const sx = q < 2 ? 1 : -1, zc = A.z[q % 2]; let all = true;
      for (let k = 0; k < 3 && all; k++){ const x = P.getX(t + k), y = P.getY(t + k), z = P.getZ(t + k); all = x * sx > A.x && Math.hypot(y - A.y, z - zc) < A.r; }
      if (all) w = q;
    }
    (w < 0 ? keep : parts[w]).push(t);
  }
  const pick = (tris, c) => { const g = new THREE.BufferGeometry(); for (const name in geo.attributes){ const a = geo.attributes[name], s = a.itemSize, out = new a.array.constructor(tris.length * 3 * s); tris.forEach((t, i) => { for (let k = 0; k < 3 * s; k++) out[i * 3 * s + k] = a.array[t * s + k]; }); g.setAttribute(name, new THREE.BufferAttribute(out, s, a.normalized)); } if (c) g.translate(-c.x, -c.y, -c.z); return g; };
  const wheels = parts.map((tris, q) => { let sx = 0; tris.forEach(t => { for (let k = 0; k < 3; k++) sx += P.getX(t + k); }); const c = { x: tris.length ? sx / (tris.length * 3) : (q < 2 ? 1 : -1) * .95, y: A.y, z: A.z[q % 2] }; return { geo: pick(tris, c), c, front: c.z > 0 }; });
  return wheelSets[kind] = { rest: pick(keep), wheels };
}
function splitWheels(v){
  if (!v.mesh) return;
  if (v.type === 'moto'){ v.wheels = v.mesh.children.filter(c => c.userData.wheelPivot).map(pv => ({ pivot: pv, mesh: pv.children[0], front: pv.userData.front, r: .33 })); return; }
  if (!AUTA || !['car', 'taxi', 'police'].includes(v.type)) return;
  const have = v.mesh.children.filter(c => c.userData.wheelPivot); if (have.length){ v.wheels = have.map(pv => ({ pivot: pv, mesh: pv.children[0], front: pv.userData.front, r: .31 })); return; }
  const kind = v.type === 'police' ? 'police' : 'sedan', geo = kind === 'police' ? AUTA.police_rest : carParts.rest;
  const restMesh = v.mesh.children.find(c => c.geometry === geo); if (!restMesh) return;
  const S = wheelSet(kind, geo); restMesh.geometry = S.rest;
  v.wheels = S.wheels.map(w => { const pv = new THREE.Object3D(); pv.position.set(w.c.x, w.c.y, w.c.z); pv.userData.wheelPivot = true; pv.userData.front = w.front; const m = new THREE.Mesh(w.geo, restMesh.material); pv.add(m); v.mesh.add(pv); return { pivot: pv, mesh: m, front: w.front, r: .31 }; });
}
function makeTuktuk(color){
  const g = new THREE.Group(); const p = [];
  box(p, 1.25,.55,2.2, 0,.62,0, color); box(p, 1.3,.08,2.0, 0,1.82,-.1, color);
  for (const [x,z] of [[-.6,.85],[.6,.85],[-.6,-1],[.6,-1]]) box(p, .06,1.2,.06, x,1.25,z, '#222');
  box(p, .9,.5,.5, 0,1.05,1.0, '#1b1b1b'); box(p, 1.1,.1,.6, 0,1.0,-.5, '#3a2a1a');
  for (const [x,z] of [[0,1.05],[-.6,-.75],[.6,-.75]]){ const w = new THREE.CylinderGeometry(.26,.26,.16,14); w.rotateZ(Math.PI/2); w.translate(x,.26,z); p.push(colored(w,'#111')); }
  box(p, .9,.08,.03, 0,1.3,1.27, '#cfe0ea');
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .2 })); m.castShadow = true; g.add(m);
  scene.add(g); return g;
}

const vehicles = [];
function addVehicle(type, x, z, yaw, color){
  const mesh = type==='moto' ? makeMoto(color) : type==='tuk' ? makeTuktuk(color) : makeCar(color, type);
  mesh.position.set(x, 0, z); mesh.rotation.y = yaw;
  const v = { type, mesh, pos: mesh.position, yaw, speed: 0, steer: 0,
    max: type==='moto' ? 26 : type==='police' ? 25 : type==='tuk' ? 15 : 22, accel: type==='moto' ? 12 : type==='tuk' ? 8 : 10, turn: type==='moto' ? 2.5 : type==='tuk' ? 2.3 : 1.9,
    circles: type==='moto' ? [[0,.6]] : type==='tuk' ? [[.7,.85],[-.6,.85]] : [[1.25,1.05],[-1.25,1.05]], home: { x, z, yaw }, col: color };
  vehicles.push(v); return v;
}
const reserved = [[11,43.3],[19,53],[32,43],[26,43.2],[78,139],[114,-5]].map(([x, z]) => RELOC(x, z));   // 26,43.2: العربي's sports car (05c); 78,139 / 114,-5: the taxi and microbus jobs (19o)
const heroMoto = addVehicle('moto', ...RELOC(11, 43.3), -Math.PI/2, '#b3121f');
const heroCar = addVehicle('car', ...RELOC(19, 53), Math.PI/2, '#e8b21a');
const copCar = addVehicle('police', ...RELOC(32, 43), Math.PI/2, '#f4f4f4');
const parkedAt = [];
parkedSpots.forEach((p, pi) => { if (reserved.some(([x,z]) => Math.hypot(p.x-x, p.z-z) < 7)) return; if (GFX === 'low' && pi % 3 === 1) return; /* weak phones: a third fewer parked cars */ if (parkedAt.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < 5.6)) return; parkedAt.push([p.x, p.z]); const pv = addVehicle(rng()<.3 ? 'taxi' : 'car', p.x, p.z, p.ry, rng()<.3 ? '#f2f2f2' : pick(COLORS)); pv.mesh.position.y = p.y; FAR_CULL.push({ v: pv, mesh: pv.mesh }); });
vehicles.forEach(v => v.home.y = v.mesh.position.y);
function vCircles(v, x=v.pos.x, z=v.pos.z, yaw=v.yaw){ const fx=Math.sin(yaw), fz=Math.cos(yaw); return v.circles.map(([o,r]) => ({ x:x+fx*o, z:z+fz*o, r })); }

// traffic
const traffic = [];
const TRAFFIC_N = GFX === 'low' ? 18 : GFX === 'mid' ? 24 : 30;   // fewer moving cars on weak phones
for (let i=0;i<TRAFFIC_N;i++){
  const kind = i%5===0 ? 'tuk' : i%3===0 ? 'taxi' : 'car';
  const col = kind==='tuk' ? pick(['#b3121f','#1f4fa8','#e0a21a']) : kind==='taxi' ? '#f2f2f2' : pick(COLORS), c = kind==='tuk' ? makeTuktuk(col) : makeCar(col, kind);
  const ax = i%3 === 0 ? 'z' : 'x', road = ax === 'x' ? pick(ROADS_Z) : (i%6 === 0 ? BRIDGE.x : pick(ROADS_X));
  c.userData = { kind, col, axis: ax, road, dir: rng()<.5 ? 1 : -1, s: ax === 'x' ? R(X0-15, XMAX+15) : road === BRIDGE.x ? R(Z0, BRIDGE.z1) : R(Z0+8, ZMAX-8), base: kind==='tuk' ? R(6,8) : R(8,12.5), speed: 9, len: kind==='tuk' ? 1.4 : 2.45, turn: null, next: null, waitT: 0, ghostT: 0, honkT: 0 };
  traffic.push(c); FAR_CULL.push({ mesh: c });
}
// traffic drives on the right of the road grid. At a crossing a car sometimes turns (a smooth curve); roads that end
// (the north-south streets at the sea and at the south edge) always turn. The bridge road and the east-west roads run off the map and come back.
const LANE = 3;
const lanePt = (axis, road, dir, s, out) => axis === 'x' ? out.set(s, 0, road + LANE*dir) : out.set(road - LANE*dir, 0, s);
function placeTraffic(c){ const u = c.userData; if (u.turn) return; lanePt(u.axis, u.road, u.dir, u.s, c.position); c.rotation.y = u.axis === 'x' ? (u.dir > 0 ? Math.PI/2 : -Math.PI/2) : (u.dir > 0 ? 0 : Math.PI); }
traffic.forEach(placeTraffic);
// the next crossing ahead of a car (and whether it has to turn there)
function nextCrossing(u){
  const list = u.axis === 'x' ? ROADS_X : ROADS_Z;
  let J = null; for (const v of list){ if ((v - u.s) * u.dir > 6.5 && (J === null || Math.abs(v - u.s) < Math.abs(J - u.s))) J = v; }
  if (J === null) return null;
  const endOfRoad = u.axis === 'z' && u.road !== BRIDGE.x && (J === ZMAX || J === Z0);
  return { J, must: endOfRoad, decided: false, turn: false };
}
function startTurn(c, J){
  const u = c.userData, R = u.road, d = u.dir;
  // where to: the other axis, either way, but not off a north-south street's end
  let nd = rng() < .5 ? 1 : -1;
  if (u.axis === 'x'){ const ok = x => !((R === ZMAX && x > 0 && J !== BRIDGE.x) || (R === Z0 && x < 0)); if (!ok(nd)) nd = -nd; if (!ok(nd)) return false; }
  const p0 = c.position.clone(), p2 = new THREE.Vector3(), p1 = new THREE.Vector3();
  if (u.axis === 'x'){ lanePt('z', J, nd, R + 6*nd, p2); p1.set(J - LANE*nd, 0, R + LANE*d); }
  else { lanePt('x', J, nd, R + 6*nd, p2); p1.set(R - LANE*d, 0, J + LANE*nd); }
  u.turn = { p0, p1, p2, t: 0, len: (p0.distanceTo(p1) + p1.distanceTo(p2)) * .85, to: { axis: u.axis === 'x' ? 'z' : 'x', road: J, dir: nd, s: R + 6*nd } };
  return true;
}
const _tq = new THREE.Vector3(), _tq2 = new THREE.Vector3();
function trafficStep(c, dt, t, playing){
  const u = c.userData; if (u.off || u.jackHold) return; let target = u.turn ? Math.min(u.base, 6.5) : u.base;
  if (u.paradeT > 0) target = Math.min(target, 4.5);   // a match parade: slow, together, honking
  u.ghostT -= dt; u.honkT -= dt; u.held = false; u.qheld = false;
  if (u.rude === undefined) u.rude = rng() < .07;   // a few drivers don't stop at red
  if (u.ghostT <= 0){
    // whatever is just in front: another car, the player's car, the player on foot
    for (const o of traffic){ if (o === c) continue; const L = carLocal(c, o.position); if (L.along > 0 && L.along < 8 && Math.abs(L.lat) < 1.7 && (o.userData.held || o.userData.qheld)) u.qheld = true; if (L.along > 0 && L.along < 8 && Math.abs(L.lat) < 1.7) target = Math.min(target, L.along < 5 ? 0 : o.userData.speed); }
    for (const tx of [tram.x - 9, tram.x, tram.x + 9]){ const L = carLocal(c, _tq2.set(tx, 0, TRAM.z)); if (L.along > 0 && L.along < 9 && Math.abs(L.lat) < 2.4){ target = 0; break; } }
    if (hero.veh){ const L = carLocal(c, hero.veh.pos); if (L.along > 0 && L.along < 9 && Math.abs(L.lat) < 1.9){ target = 0; u.held = true; } }
    else if (!HOUSE.inside){ const L = carLocal(c, hero.pos); if (L.along > 0 && L.along < 7.5 && Math.abs(L.lat) < 1.5){ target = 0; u.held = true; if (playing && u.honkT <= 0 && L.along < 6){ u.honkT = R(2.5, 5); if (c.position.distanceTo(hero.pos) < 25) horn(); } } }
    // the light at the next crossing: stop at the line on red, and on yellow if there is still room to stop
    if (!u.turn && u.next && !u.rude && typeof TL !== 'undefined'){ const ahead = (u.next.J - u.s) * u.dir; if (ahead > 6.5 && ahead < 30 && !(u.goJ === u.next.J && ahead < 10.5)){ const L = TL.map.get(u.axis === 'x' ? tlKey(u.next.J, u.road) : tlKey(u.road, u.next.J)); if (L){ const s = tlFor(L, u.axis);
      if (s === 'g') u.goJ = null;
      else if (s === 'y' && u.goJ === undefined || s === 'y' && u.goJ === null) u.goJ = ahead - 10.5 < u.speed * u.speed / 12 + 1 ? u.next.J : false;   // at the yellow: too close to stop = go through, else stop
      if (s === 'r' || (s === 'y' && u.goJ !== u.next.J)){ target = Math.min(target, Math.max(0, (ahead - 10.5) * 1.3)); u.held = true; } } } }
    // people crossing in front
    if (typeof CROSSERS !== 'undefined') for (const n of CROSSERS){ const L = carLocal(c, n.g.position); if (L.along > 0 && L.along < 10 && Math.abs(L.lat) < 2.4){ target = 0; u.held = true; break; } }
    // wait while another car is in the middle of the crossing ahead
    if (!u.turn && u.next){ const ahead = (u.next.J - u.s) * u.dir; if (ahead > 0 && ahead < 11){ const cx = u.axis === 'x' ? u.next.J : u.road, cz = u.axis === 'x' ? u.road : u.next.J; for (const o of traffic){ if (o !== c && (o.userData.turn || o.userData.axis !== u.axis) && Math.abs(o.position.x - cx) < 6 && Math.abs(o.position.z - cz) < 6){ target = 0; break; } } } }
  }
  // stuck behind each other for a while (two cars waiting for one another): this one goes anyway
  if (target === 0 && u.speed < .3 && !u.held && !u.qheld){ u.waitT += dt; if (u.waitT > 3.5){ u.ghostT = 1.6; u.waitT = 0; } } else u.waitT = 0;
  u.speed += (target - u.speed) * damp(target < u.speed - 1 ? 5.5 : 3, dt);   // brake harder than it speeds up
  if (u.turn){
    const T = u.turn; T.t = Math.min(1, T.t + u.speed * dt / T.len); const k = T.t, a = (1-k)*(1-k), b = 2*(1-k)*k, e = k*k;
    c.position.set(a*T.p0.x + b*T.p1.x + e*T.p2.x, 0, a*T.p0.z + b*T.p1.z + e*T.p2.z);
    _tq.set(2*(1-k)*(T.p1.x - T.p0.x) + 2*k*(T.p2.x - T.p1.x), 0, 2*(1-k)*(T.p1.z - T.p0.z) + 2*k*(T.p2.z - T.p1.z));
    if (_tq.lengthSq() > 1e-6) c.rotation.y = Math.atan2(_tq.x, _tq.z);
    if (T.t >= 1){ Object.assign(u, T.to); u.turn = null; u.next = null; placeTraffic(c); }
    return;
  }
  u.s += u.speed * u.dir * dt;
  if (!u.next) u.next = nextCrossing(u);
  const n = u.next;
  if (n && !n.decided && (n.J - u.s) * u.dir <= 6){ n.decided = true; if ((n.must || rng() < .3) && startTurn(c, n.J)) return; u.next = null; }
  if (n && (u.s - n.J) * u.dir > 1) u.next = null;
  const onBridge = u.axis === 'z' && Math.abs(u.road - BRIDGE.x) < 8;
  const lo = u.axis === 'x' ? X0 - 30 : Z0 - 30, hi = u.axis === 'x' ? XMAX + 30 : onBridge ? BRIDGE.z1 - 12 : BRIDGE.z1 + 45;
  if (u.dir > 0 && u.s > hi){ u.s = lo; u.next = null; } else if (u.dir < 0 && u.s < lo){ u.s = hi; u.next = null; }
  placeTraffic(c);
}
// chaser for the cash mode
const chaserCar = makeCar('#f4f4f4', 'police'); chaserCar.visible = false;
const chaserLight = new THREE.PointLight(0xff2040, 0, 22, 1.6); scene.add(chaserLight);   // in the scene, following the car (a light inside a hidden car would come and go: a shader rebuild)
