// ================= vehicles =================
const carGeo = (() => {
  const ws = []; for (const x of [-.86,.86]) for (const z of [-1.38,1.38]){ const g = new THREE.CylinderGeometry(.36,.36,.26,18); g.rotateZ(Math.PI/2); g.translate(x,.36,z); ws.push(g); }
  const hub = []; for (const x of [-.99,.99]) for (const z of [-1.38,1.38]){ const g = new THREE.CylinderGeometry(.2,.2,.02,14); g.rotateZ(Math.PI/2); g.translate(x,.36,z); hub.push(g); }
  const lights = (z, y) => { const a = new THREE.BoxGeometry(.42,.13,.06), b = a.clone(); a.translate(-.62,y,z); b.translate(.62,y,z); return mergeGeometries([a,b]); };
  const bar = new THREE.BoxGeometry(.55,.13,.28);
  return {
    body: (() => { const g = new RoundedBoxGeometry(1.9,.62,4.4,3,.16); g.translate(0,.66,0); return g; })(),
    cabin: (() => { const g = new RoundedBoxGeometry(1.64,.56,2.3,3,.2); g.translate(0,1.2,-.2); return g; })(),
    roof: (() => { const g = new RoundedBoxGeometry(1.5,.06,1.9,2,.03); g.translate(0,1.49,-.25); return g; })(),
    wheels: mergeGeometries(ws), hubs: mergeGeometries(hub), head: lights(2.21,.74), tail: lights(-2.21,.78),
    stripe: (() => { const g = new THREE.BoxGeometry(1.93,.24,3.4); g.translate(0,.62,0); return g; })(),
    barL: (() => { const g = bar.clone(); g.translate(-.3,1.59,-.2); return g; })(),
    barR: (() => { const g = bar.clone(); g.translate(.3,1.59,-.2); return g; })(),
    taxiSign: (() => { const g = new THREE.BoxGeometry(.7,.2,.3); g.translate(0,1.62,-.2); return g; })(),
  };
})();
const carGlass = new THREE.MeshPhysicalMaterial({ color: 0x0b1218, metalness: .3, roughness: .06, envMapIntensity: 1.6 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .9 });
const hubMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: .9, roughness: .3 });
const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: .7 });
const tailMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2020, emissiveIntensity: .7 });
const COLORS = ['#a3132b','#efefef','#1b1d20','#27458a','#878c93','#d39b17','#0f5d4e','#4d2a7a','#c4561a','#5e6b3a'];
const paintCache = {};
const paint = c => paintCache[c] ||= new THREE.MeshPhysicalMaterial({ color: c, metalness: .55, roughness: .3, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: 1.2 });
const checkerMat = new THREE.MeshStandardMaterial({ map: checkerTex, roughness: .5 });
function makeCar(color, kind='car'){
  const g = new THREE.Group();
  const add = (geo, mat, cast=true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; g.add(m); return m; };
  add(carGeo.body, paint(color)); add(carGeo.cabin, carGlass); add(carGeo.roof, paint(color), false);
  add(carGeo.wheels, tireMat); add(carGeo.hubs, hubMat, false); add(carGeo.head, headMat, false); add(carGeo.tail, tailMat, false);
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
function makeMoto(color){
  const g = new THREE.Group(); const p = [];
  box(p, .32,.42,1.3, 0,.62,0, color); box(p, .36,.3,.6, 0,.92,.25, color); box(p, .34,.12,.7, 0,.86,-.3, '#151515');
  box(p, .7,.05,.05, 0,1.2,.72, '#222'); box(p, .06,.55,.06, 0,.92,.68, '#666'); box(p, .22,.18,.12, 0,1.0,.85, '#eeeeee');
  for (const z of [-.72,.72]){ const w = new THREE.CylinderGeometry(.33,.33,.12,18); w.rotateZ(Math.PI/2); w.translate(0,.33,z); p.push(colored(w,'#151515')); }
  box(p, .12,.1,.4, .18,.42,-.55, '#999');
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .4, metalness: .3 })); m.castShadow = true; g.add(m);
  scene.add(g); return g;
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
    circles: type==='moto' ? [[0,.6]] : type==='tuk' ? [[.7,.85],[-.6,.85]] : [[1.25,1.05],[-1.25,1.05]], home: { x, z, yaw } };
  vehicles.push(v); return v;
}
const reserved = [[11,43.3],[19,43],[32,43]];
const heroMoto = addVehicle('moto', 11, 43.3, Math.PI/2, '#b3121f');
const heroCar = addVehicle('car', 19, 43, Math.PI/2, '#e8b21a');
const copCar = addVehicle('police', 32, 43, Math.PI/2, '#f4f4f4');
parkedSpots.forEach(p => { if (reserved.some(([x,z]) => Math.hypot(p.x-x, p.z-z) < 7)) return; addVehicle(rng()<.3 ? 'taxi' : 'car', p.x, p.z, p.ry, rng()<.3 ? '#f2f2f2' : pick(COLORS)).mesh.position.y = p.y; });
vehicles.forEach(v => v.home.y = v.mesh.position.y);
function vCircles(v, x=v.pos.x, z=v.pos.z, yaw=v.yaw){ const fx=Math.sin(yaw), fz=Math.cos(yaw); return v.circles.map(([o,r]) => ({ x:x+fx*o, z:z+fz*o, r })); }

// traffic
const traffic = [];
for (let i=0;i<30;i++){
  const kind = i%5===0 ? 'tuk' : i%3===0 ? 'taxi' : 'car';
  const c = kind==='tuk' ? makeTuktuk(pick(['#b3121f','#1f4fa8','#e0a21a'])) : makeCar(kind==='taxi' ? '#f2f2f2' : pick(COLORS), kind);
  const ax = i%5 === 0 ? 'z' : 'x'; c.userData = { kind, axis: ax, road: ax === 'x' ? pick(ROADS_Z) : BRIDGE.x, dir: rng()<.5 ? 1 : -1, s: ax === 'x' ? R(X0-15, XMAX+15) : R(Z0, BRIDGE.z1), base: kind==='tuk' ? R(6,8) : R(8,12.5), speed: 9, len: kind==='tuk' ? 1.4 : 2.45 };
  traffic.push(c);
}
function placeTraffic(c){ const u = c.userData; if (u.axis==='x'){ c.position.set(u.s, 0, u.road + 3*u.dir); c.rotation.y = u.dir>0 ? Math.PI/2 : -Math.PI/2; } else { c.position.set(u.road - 3*u.dir, 0, u.s); c.rotation.y = u.dir>0 ? 0 : Math.PI; } }
traffic.forEach(placeTraffic);
// chaser for the cash mode
const chaserCar = makeCar('#f4f4f4', 'police'); chaserCar.visible = false;
const chaserLight = new THREE.PointLight(0xff2040, 0, 22, 1.6); chaserLight.position.set(0, 2.2, 0); chaserCar.add(chaserLight);
