// ================= world layout =================
// The map is a grid of 48 m blocks: 8 across (x) and 5 down (z).
// Columns 0-3 / rows 0-3 are «الحتة», columns 4-5 the market (north) and restaurants (south),
// columns 6-7 the stadium area (north) and workshops (south). Row 4 is the corniche, then the Nile with the bridge.
const PITCH = 48, NXB = 8, NZB = 5, X0 = -96, Z0 = -96;
const ROADS_X = [...Array(NXB+1)].map((_,i) => X0 + i*PITCH);   // north-south roads: -96 … 288
const ROADS_Z = [...Array(NZB+1)].map((_,k) => Z0 + k*PITCH);   // east-west roads:  -96 … 144
const XMAX = ROADS_X[NXB], ZMAX = ROADS_Z[NZB];
const N = 4, HALF = 96, ROADS = ROADS_X.slice(0, 5);             // legacy names used by the old cash mode
const BW = PITCH - 12, LIMIT = HALF + 5.5;
const NILE_Z = ZMAX + 10;                                        // the river bank (promenade railing)
const BRIDGE = { x: 96, z1: 262, w: 13 };
const FAR = { x0: 30, x1: 162, z0: 258, z1: 296 };
function inWorld(x, z){
  if (x > X0 - 5.5 && x < XMAX + 5.5 && z > Z0 - 5.5 && z < NILE_Z - .4) return true;
  if (Math.abs(x - BRIDGE.x) < BRIDGE.w/2 - .6 && z >= NILE_Z - 1 && z <= BRIDGE.z1 + 1) return true;
  if (x > FAR.x0 && x < FAR.x1 && z > FAR.z0 && z < FAR.z1) return true;
  return false;
}
const DISTRICT_NAMES = { hara: 'الحتة', market: 'السوق', food: 'شارع المطاعم', stadium: 'الملعب', works: 'منطقة الورش', corniche: 'الكورنيش', bridge: 'كوبري النيل', bank: 'البر التاني' };
function blockDistrict(i, k){ if (k === 4) return 'corniche'; if (i <= 3) return 'hara'; if (i <= 5) return k <= 1 ? 'market' : 'food'; return k <= 1 ? 'stadium' : 'works'; }
function districtAt(x, z){
  if (z > FAR.z0 - 2) return 'bank'; if (z >= NILE_Z - 1) return 'bridge';
  const i = clamp(Math.floor((x - X0)/PITCH), 0, NXB-1), k = clamp(Math.floor((z - Z0)/PITCH), 0, NZB-1); return blockDistrict(i, k);
}
const CAFE = { cx: 24, cz: 24 };
const SPOT = {
  spawn: new THREE.Vector3(17, 0, 36.5), counter: new THREE.Vector3(21, 0, 22.6), domino: new THREE.Vector3(30, 0, 25.5),
  cart: new THREE.Vector3(34.5, 0, 31), cartHero: new THREE.Vector3(34.5, 0, 29.7), policeSpawn: new THREE.Vector3(32, 0, 40.2),
  house: new THREE.Vector3(-24, .15, 88.4), azzouz: new THREE.Vector3(120, .15, 40.4), workshop: new THREE.Vector3(264, .15, 88.4),
  stadium: new THREE.Vector3(216, .15, -7.6), wedding: new THREE.Vector3(-72, .15, 33), cornicheView: new THREE.Vector3(150, .15, 152),
  bridgeMid: new THREE.Vector3(96, 0, 205), market: new THREE.Vector3(144, .15, -48),
};
const STOPS = [
  { id: 'hara', name: 'الحتة · قهوة قصر الملوك', pos: new THREE.Vector3(40.4, .15, 40.4) },
  { id: 'house', name: 'بيت طيارة', pos: new THREE.Vector3(-8.4, .15, 88.4) },
  { id: 'market', name: 'السوق', pos: new THREE.Vector3(120, .15, -7.6) },
  { id: 'food', name: 'شارع المطاعم · عزوز', pos: new THREE.Vector3(136.4, .15, 40.4) },
  { id: 'stadium', name: 'الملعب', pos: new THREE.Vector3(232, .15, -7.6) },
  { id: 'works', name: 'منطقة الورش', pos: new THREE.Vector3(248, .15, 88.4) },
  { id: 'corniche', name: 'الكورنيش', pos: new THREE.Vector3(170, .15, 151.6) },
];
const TABLES = [[12,26.5],[17,26.5],[22,26.5],[12,32],[17,32],[22,32]];
const SEATS = TABLES.flatMap(([x,z],ti) => [{x:x-.85,z,ry:Math.PI/2,ti},{x:x+.85,z,ry:-Math.PI/2,ti}]);

// ground, asphalt and the river
const groundMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 });
{ const g = new THREE.Mesh(new THREE.PlaneGeometry(1600, 900), groundMat); g.rotation.x = -Math.PI/2; g.position.set(96, -.02, NILE_Z - 450); g.receiveShadow = true; scene.add(g);
  const g2 = new THREE.Mesh(new THREE.PlaneGeometry(1600, 700), groundMat); g2.rotation.x = -Math.PI/2; g2.position.set(96, -.02, FAR.z0 + 350); g2.receiveShadow = true; scene.add(g2); }
asphaltTex.repeat.set((XMAX - X0 + 14)/10, (ZMAX - Z0 + 14)/10);
const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(XMAX - X0 + 14, ZMAX - Z0 + 13), new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: .93, envMapIntensity: .3 }));
asphalt.rotation.x = -Math.PI/2; asphalt.position.set((X0 + XMAX)/2, 0, (Z0 + ZMAX)/2 + .5); asphalt.receiveShadow = true; scene.add(asphalt);
const waterTex = makeTex(256,256,(g,w,h)=>{ g.fillStyle='#2f6470'; g.fillRect(0,0,w,h); for (let i=0;i<1400;i++){ g.strokeStyle=`rgba(${180+Math.random()*60|0},${210+Math.random()*40|0},230,${.05+Math.random()*.12})`; g.lineWidth=1+Math.random()*2; const x=Math.random()*w, y=Math.random()*h; g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(x+8,y-3,x+16+Math.random()*14,y); g.stroke(); } }, [60, 12]);
const water = new THREE.Mesh(new THREE.PlaneGeometry(1600, FAR.z0 - NILE_Z + 4), new THREE.MeshStandardMaterial({ map: waterTex, color: 0x9fc8cf, roughness: .12, metalness: .35, envMapIntensity: 1.2 }));
water.rotation.x = -Math.PI/2; water.position.set(96, -1.1, (NILE_Z + FAR.z0)/2); water.receiveShadow = true; scene.add(water);
{ const bankMat = new THREE.MeshStandardMaterial({ color: 0x8f8573, roughness: .95 });
  for (const z of [NILE_Z + .2, FAR.z0 - .2]){ const wall = new THREE.Mesh(new THREE.BoxGeometry(1600, 1.4, .6), bankMat); wall.position.set(96, -.55, z); scene.add(wall); } }

const obstacles = [], buildings = [], blocksInfo = [];
const treeList = [], lampList = [], whiteMarks = [], yellowMarks = [], parkedSpots = [];
const doors = [], noEntry = [], posters = [], signs = shopNames.map(() => []);
const palmList = [], benchList = [], stallLists = [[], [], []], tireList = [], drumList = [], outTables = [];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function instanced(geo, mat, list, cast=true, fn){
  if (!list.length) return null;
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach((t,i)=>{ const tr = fn ? fn(t) : t; _e.set(tr.rx||0, tr.ry||0, 0); _q.setFromEuler(_e); _m.compose(_v.set(tr.x, tr.y||0, tr.z), _q, _s.set(tr.sx??1, tr.sy??1, tr.sz??1)); im.setMatrixAt(i, _m); });
  im.castShadow = cast; im.receiveShadow = true; scene.add(im); return im;
}
const slabMats = (() => { const side = new THREE.MeshStandardMaterial({ map: curbTex, roughness: .8 }); const top = new THREE.MeshStandardMaterial({ map: paveTex, roughness: .95, envMapIntensity: .3 }); return [side, side, top, top, side, side]; })();
const slabGeo = new THREE.BoxGeometry(BW, .15, BW);

// ---- merged-geometry helper with vertex colors ----
const _col = new THREE.Color();
function colored(geo, color){ _col.set(color); const n = geo.attributes.position.count, a = new Float32Array(n*3); for (let i=0;i<n;i++){ a[i*3]=_col.r; a[i*3+1]=_col.g; a[i*3+2]=_col.b; } geo.setAttribute('color', new THREE.BufferAttribute(a,3)); return geo; }
function box(list, w,h,d, x,y,z, color, ry=0){ const g = new THREE.BoxGeometry(w,h,d); if (ry) g.rotateY(ry); g.translate(x,y,z); list.push(colored(g,color)); }
function cyl(list, rt,rb,h, x,y,z, color, rx=0, seg=12){ const g = new THREE.CylinderGeometry(rt,rb,h,seg); if (rx) g.rotateX(rx); g.translate(x,y,z); list.push(colored(g,color)); }

const BAND_H = 3.6, BASE = .15 + BAND_H;
function addBuilding(cx, cz, w, d, floors, styleIdx, opts={}){
  const S = FSTY[styleIdx], h = floors*3.2;
  const grp = new THREE.Group(); grp.position.set(cx, 0, cz); scene.add(grp);
  // upper floors
  const geo = new THREE.BoxGeometry(w, h, d); const uv = geo.attributes.uv;
  for (let i=0;i<24;i++){ let a=1,b=1; if (i<8){ a=d/16; b=h/12.8; } else if (i<16){ a=w/10; b=d/10; } else { a=w/16; b=h/12.8; } uv.setXY(i, uv.getX(i)*a, uv.getY(i)*b); }
  const fm = new THREE.MeshStandardMaterial({ map: facadeTex[styleIdx], roughness: .9, envMapIntensity: .3 });
  const rm = new THREE.MeshStandardMaterial({ map: roofTex, roughness: .95, envMapIntensity: .25 });
  const main = new THREE.Mesh(geo, [fm,fm,rm,rm,fm,fm]); main.position.y = BASE + h/2; main.castShadow = main.receiveShadow = true; grp.add(main);
  // shop band
  const bgeo = new THREE.BoxGeometry(w+.14, BAND_H, d+.14); const buv = bgeo.attributes.uv; const off = Math.floor(rng()*3)/3;
  for (let i=0;i<24;i++){ let a=1; if (i<8) a=d/12; else if (i<16) a=0; else a=w/12; buv.setXY(i, buv.getX(i)*a + off, buv.getY(i)); }
  const bm = new THREE.MeshStandardMaterial({ map: opts.bandTex || bandTex, roughness: .85, envMapIntensity: .3 });
  const band = new THREE.Mesh(bgeo, bm); band.position.y = .15 + BAND_H/2; band.castShadow = band.receiveShadow = true; grp.add(band);
  // details: balconies, AC units, tanks, dishes, parapet
  const parts = [];
  const trimC = new THREE.Color(S.wall).multiplyScalar(.82).getStyle();
  box(parts, w+.3, .3, d+.3, 0, BASE + h + .15, 0, trimC);
  box(parts, w+.2, .18, d+.2, 0, BASE - .05, 0, '#3b342d');
  for (const fz of [1,-1]){
    const nb = Math.floor((w-1)/4);
    for (let f=1; f<floors; f++) for (let i=0;i<nb;i++){
      const bx = fz>0 ? -w/2 + 2 + 4*i : w/2 - 2 - 4*i;
      if (rng() < .42){
        const y = BASE + f*3.2 + .45, zz = fz*(d/2 + .5);
        box(parts, 2.9, .14, 1.0, bx, y, zz, trimC);
        box(parts, 2.9, .9, .06, bx, y+.5, fz*(d/2+.98), rng()<.5 ? '#2b2b2b' : S.trim);
        box(parts, .06, .9, 1.0, bx-1.42, y+.5, zz, '#2b2b2b'); box(parts, .06, .9, 1.0, bx+1.42, y+.5, zz, '#2b2b2b');
      } else if (rng() < .3){
        box(parts, .8, .5, .4, bx + 1.4, BASE + f*3.2 + 2.75 - 3.2*(rng()<.5?0:0), fz*(d/2+.2), '#e8e6e0');
      }
    }
  }
  for (const fx of [1,-1]) for (let f=1; f<floors; f++) if (rng()<.35) box(parts, .4, .5, .8, fx*(w/2+.2), BASE + f*3.2 + 2.6, R(-d/2+2, d/2-2), '#e8e6e0');
  const nt = 1 + Math.floor(rng()*3);
  for (let i=0;i<nt;i++) cyl(parts, .55, .55, 1.2, R(-w/2+1.5, w/2-1.5), BASE+h+.75, R(-d/2+1.5, d/2-1.5), rng()<.5?'#1d1d1d':'#2f5c8a');
  const nd = 1 + Math.floor(rng()*4);
  for (let i=0;i<nd;i++){ const g = new THREE.CylinderGeometry(.5,.08,.16,14); g.rotateX(-.9); g.translate(R(-w/2+1, w/2-1), BASE+h+.7, R(-d/2+1, d/2-1)); parts.push(colored(g,'#dcdad4')); }
  for (let i=0;i<2;i++) box(parts, R(1,2.2), R(.6,1.4), R(1,2.2), R(-w/2+1.5,w/2-1.5), BASE+h+.6, R(-d/2+1.5,d/2-1.5), '#8f8a80');
  const dm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, envMapIntensity: .3 });
  const det = new THREE.Mesh(mergeGeometries(parts), dm); det.castShadow = true; det.receiveShadow = true; grp.add(det);
  grp.updateMatrixWorld(true);
  const b = { grp, mats:[fm,rm,bm,dm], box:new THREE.Box3().setFromObject(grp), opacity:1 };
  buildings.push(b);
  obstacles.push({ minX:cx-w/2-.1, maxX:cx+w/2+.1, minZ:cz-d/2-.1, maxZ:cz+d/2+.1, building:true });
  // street-facing faces: doors + "no entry" plates, posters, shop signs
  const faces = opts.faces || [];
  for (const f of faces){
    const along = (f==='pz'||f==='nz') ? w : d;
    const ry = { pz:0, nz:Math.PI, px:Math.PI/2, nx:-Math.PI/2 }[f];
    const place = (u, y, out) => {
      const o = out ?? .08;
      if (f==='pz') return { x:cx+u, y, z:cz+d/2+o+.07, ry };
      if (f==='nz') return { x:cx-u, y, z:cz-d/2-o-.07, ry };
      if (f==='px') return { x:cx+w/2+o+.07, y, z:cz-u, ry };
      return { x:cx-w/2-o-.07, y, z:cz+u, ry };
    };
    const du = opts.doorU ?? R(-along/2+1.5, along/2-1.5);
    if (!opts.noDoor){ doors.push(place(du, .15+1.12)); noEntry.push(place(du, 2.62, .1)); }
    if (rng() < .75 && !opts.noPoster){ let pu = du + (rng()<.5?-2.2:2.2); if (Math.abs(pu) > along/2-.8) pu = du - Math.sign(pu)*2.2; posters.push(place(pu, 1.75, .1)); }
    const pool = opts.signPool || signs; if (!opts.noSign && along > 6.5) pool[Math.floor(rng()*pool.length)].push(place(R(-along/2+3, along/2-3), 3.32, .12));
  }
  return b;
}

// district textures
const foodNames = [['مطعم عزوز للبيتزا','#b3121f'],['كبابجي الملك','#5a2d0c'],['حلواني النور','#c2185b'],['شاورما الريس','#1b5e20'],['فطاطري السلطان','#e65100'],['كشري أبو طارق','#4e342e'],['مطعم فول وطعمية','#827717'],['عصير قصب الحرية','#2e7d32']];
const foodSignTex = foodNames.map(([t,c]) => { const tx = makeTex(640,100,(g,w,h)=>{ g.fillStyle=c; g.fillRect(0,0,w,h); g.strokeStyle='#fff3b0'; g.lineWidth=6; g.strokeRect(4,4,w-8,h-8); arText(g, t, w/2, h/2+3, 50, '#fffbe8'); }); tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; return tx; });
const foodSigns = foodNames.map(() => []);
const garageBand = makeTex(768,232,(g,w,h)=>{
  g.fillStyle='#4a4540'; g.fillRect(0,0,w,h); grain(g,w,h,9000,.18);
  for (let b=0;b<3;b++){ const x=b*256;
    if (b===1){ g.fillStyle='#16130f'; g.fillRect(x+8,40,240,182); g.fillStyle='#3a3a3a'; g.fillRect(x+40,150,170,60); g.fillStyle='#222'; g.beginPath(); g.arc(x+70,212,18,0,7); g.arc(x+180,212,18,0,7); g.fill(); g.fillStyle='rgba(255,200,80,.25)'; g.fillRect(x+8,40,240,30); }
    else { g.fillStyle='#7a7d80'; g.fillRect(x+8,40,240,182); g.strokeStyle='rgba(0,0,0,.35)'; for (let y=44;y<222;y+=7){ g.beginPath(); g.moveTo(x+8,y); g.lineTo(x+248,y); g.stroke(); } g.fillStyle='rgba(90,60,30,.35)'; g.fillRect(x+30+Math.random()*80,120,60,90); }
  }
  g.fillStyle='#2a2622'; g.fillRect(0,0,w,36);
});
const azzouzBand = makeTex(768,232,(g,w,h)=>{
  g.fillStyle='#3b1a12'; g.fillRect(0,0,w,h);
  const gr=g.createLinearGradient(0,50,0,232); gr.addColorStop(0,'#ffcf7a'); gr.addColorStop(1,'#b04a1e'); g.fillStyle=gr; g.fillRect(10,48,w-20,174);
  g.fillStyle='#5a2a14'; g.beginPath(); g.arc(384,200,90,Math.PI,0); g.fill(); g.fillStyle='#ff7a1a'; g.beginPath(); g.arc(384,200,60,Math.PI,0); g.fill();
  for (let i=0;i<6;i++){ g.fillStyle='#f2e2c0'; g.beginPath(); g.arc(70+i*42,150,16,0,7); g.fill(); g.fillStyle='#c0392b'; g.beginPath(); g.arc(70+i*42,150,11,0,7); g.fill(); }
  g.fillStyle='#2a120a'; g.fillRect(0,0,w,46);
});
const houseBand = makeTex(768,232,(g,w,h)=>{ g.fillStyle='#8a5a40'; g.fillRect(0,0,w,h); grain(g,w,h,12000,.2); g.strokeStyle='rgba(50,22,12,.35)'; for (let y=0;y<h;y+=9){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); } g.fillStyle='rgba(30,20,10,.35)'; g.fillRect(120,90,90,70); g.fillRect(560,90,90,70); g.fillStyle='#6b6f73'; g.fillRect(124,94,82,62); g.fillRect(564,94,82,62); });
const bigSign = (text, bg, fg, w=1024, h=180, size=86) => { const t = makeTex(w,h,(g)=>{ g.fillStyle=bg; g.fillRect(0,0,w,h); g.strokeStyle=fg; g.lineWidth=10; g.strokeRect(8,8,w-16,h-16); arText(g, text, w/2, h/2+6, size, fg); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
function signBoard(tex, x, y, z, w, h, ry=0, glow=.35){ const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: glow, roughness: .6 })); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; }
const glowSigns = [];

// ---- blocks ----
for (let j=0;j<NXB;j++) for (let k=0;k<NZB;k++){
  const cx = X0 + PITCH/2 + j*PITCH, cz = Z0 + PITCH/2 + k*PITCH, dist = blockDistrict(j, k);
  let type = 'city'; const r = rng();
  if (dist === 'hara'){ if (j===2 && k===2) type = 'cafe'; else if (j===1 && k===3) type = 'house'; else if (j===0 && k===2) type = 'wedding'; else if (r < .1) type = 'park'; else if (r < .17) type = 'parking'; }
  else if (dist === 'stadium' && j === 6 && k === 1) type = 'pitch';
  else if (dist === 'works' && j === 7 && k === 3) type = 'workshop';
  else if (dist === 'food' && j === 4 && k === 2) type = 'azzouz';
  else if (dist === 'corniche') type = 'corniche';
  else type = dist;
  blocksInfo.push({ cx, cz, type, dist, j, k });
  const slab = new THREE.Mesh(slabGeo, slabMats); slab.position.set(cx, .075, cz); slab.receiveShadow = true; scene.add(slab);
  const rowsOf = (floorsMin, floorsMax, styles, extra={}) => {
    const rows = [[cz-15, cz-.3], [cz+.3, cz+15]];
    rows.forEach(([z0,z1], ri) => {
      if (extra.skipRow === ri) return;
      const n = rng() < .55 ? 2 : 3; let x = cx - 15; const widths = [];
      let rem = 30; for (let i=0;i<n;i++){ const wv = i===n-1 ? rem : R(8, rem - 8*(n-1-i)); widths.push(wv); rem -= wv; }
      widths.forEach((wv, i) => {
        const bw = wv - .5, bd = (z1-z0) - R(0, 1.5);
        const bz = ri === 0 ? z0 + bd/2 : z1 - bd/2;
        const faces = [ri === 0 ? 'nz' : 'pz']; if (i===0) faces.push('nx'); if (i===n-1) faces.push('px');
        addBuilding(x + wv/2, bz, bw, bd, Math.floor(R(floorsMin, floorsMax)), pick(styles), { faces, ...extra });
        x += wv;
      });
    });
  };
  const ALL = [0,1,2,3,4,5];
  const sidewalkRing = (fn, step=5, prob=.6) => { const off = BW/2 - 1.6; for (const side of [[0,1],[0,-1],[1,0],[-1,0]]) for (let t=-14; t<=14; t+=step) if (rng() < prob) fn(side[0] ? { x: cx+side[0]*off, z: cz+t, ry: side[0] > 0 ? Math.PI/2 : -Math.PI/2 } : { x: cx+t, z: cz+side[1]*off, ry: side[1] > 0 ? 0 : Math.PI }); };
  if (type === 'park'){
    const g = new THREE.Mesh(new THREE.BoxGeometry(BW-6, .06, BW-6), new THREE.MeshStandardMaterial({ map: parkTex, roughness: 1 })); g.position.set(cx, .18, cz); g.receiveShadow = true; scene.add(g);
    for (let i=0;i<12;i++) treeList.push({ x: cx+R(-12,12), z: cz+R(-12,12), s: R(.9,1.5) });
    for (let i=0;i<4;i++) benchList.push({ x: cx + R(-10,10), z: cz + R(-10,10), ry: pick([0, Math.PI/2, Math.PI, -Math.PI/2]), y: .2 });
  } else if (type === 'parking'){
    const g = new THREE.Mesh(new THREE.BoxGeometry(BW-6, .04, BW-6), new THREE.MeshStandardMaterial({ map: lotTex, roughness: .9 })); g.position.set(cx, .17, cz); g.receiveShadow = true; scene.add(g);
    for (const row of [-7, 7]){
      for (let i=0;i<10;i++){ const x = cx - 12.6 + i*2.8; whiteMarks.push({ x: x-1.4, y:.2, z: cz+row, sx:.12, sy:1, sz:5 }); if (rng() < .55) parkedSpots.push({ x, z: cz+row, ry: row<0 ? 0 : Math.PI, y:.19 }); }
      whiteMarks.push({ x: cx + 12.6 + 1.4, y:.2, z: cz+row, sx:.12, sy:1, sz:5 });
    }
  } else if (type === 'cafe'){
    const cafeBand = makeTex(768,232,(g,w,h)=>{
      g.fillStyle='#3a2a1c'; g.fillRect(0,0,w,h);
      const gr=g.createLinearGradient(0,50,0,232); gr.addColorStop(0,'#ffd88a'); gr.addColorStop(1,'#a4642a'); g.fillStyle=gr; g.fillRect(10,50,w-20,172);
      for (let i=0;i<9;i++){ g.fillStyle='#5a3a1e'; g.fillRect(30+i*82,120,46,100); g.fillStyle='#2a1a0e'; g.fillRect(40+i*82,100,26,26); }
      for (let i=0;i<14;i++){ g.fillStyle='rgba(255,240,200,.9)'; g.beginPath(); g.arc(30+i*52,62,6,0,7); g.fill(); }
      g.fillStyle='#2a1d12'; g.fillRect(0,0,w,46);
    });
    addBuilding(17.5, 15.5, 16, 12, 5, 1, { bandTex: cafeBand, faces:['pz','nz','nx'], doorU: 0, noSign: true, noPoster: true });
    addBuilding(33, 15.5, 11.5, 12, 7, 2, { faces:['pz','nz','px'] });
    glowSigns.push(signBoard(cafeSignTex, 17.5, 3.0, 21.65, 11, 1.9));
    const aw = new THREE.Mesh(new THREE.BoxGeometry(14, .08, 2.6), new THREE.MeshStandardMaterial({ color: 0x1d6b44, roughness: .8 })); aw.position.set(17.5, 3.75, 22.9); aw.rotation.x = .18; aw.castShadow = true; aw.name = 'cafeAwning'; scene.add(aw);
  } else if (type === 'house'){
    // طيارة's run-down house in the middle of the south row, with neighbours either side
    addBuilding(-24, 80.5, 9, 11, 2, 5, { bandTex: houseBand, faces: [], noDoor: true });
    addBuilding(-35, 79.5, 12.5, 13, 5, 4, { faces: ['pz','nx'] });
    addBuilding(-13, 79.5, 12.5, 13, 6, 1, { faces: ['pz','px'] });
    rowsOf(4, 9, ALL, { skipRow: 1 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.3), new THREE.MeshStandardMaterial({ map: doorTex, roughness: .8, color: 0xb8a48c })); door.position.set(-24, 1.3, 86.08); scene.add(door);
    glowSigns.push(signBoard(bigSign('بيت طيارة','#f3ecd8','#5a2a14',512,120,64), -24, 2.85, 86.1, 2.2, .52, 0, .15));
  } else if (type === 'wedding'){
    // the street where إسلام's wedding happens: open square with buildings on the north row
    rowsOf(4, 9, ALL, { skipRow: 1 });
    const g = new THREE.Mesh(new THREE.BoxGeometry(BW-6, .04, 14), new THREE.MeshStandardMaterial({ color: 0x9c6b4c, roughness: .9 })); g.position.set(cx, .17, cz + 8); g.receiveShadow = true; scene.add(g);
    for (let i=0;i<6;i++) treeList.push({ x: cx - 13 + i*5.2, z: cz + 15.5, s: .85 });
  } else if (type === 'market'){
    rowsOf(3, 6, [0,1,3,5]);
    sidewalkRing(p => stallLists[Math.floor(rng()*3)].push({ ...p, y: .15 }), 4.2, .7);
  } else if (type === 'food' || type === 'azzouz'){
    if (type === 'azzouz'){
      addBuilding(120, 33.5, 13, 11, 4, 3, { bandTex: azzouzBand, faces: ['pz'], doorU: 0, noSign: true, noPoster: true });
      glowSigns.push(signBoard(bigSign('🍕 مطعم عزوز للبيتزا','#b3121f','#fff3c4'), 120, 3.1, 39.12, 11, 1.9, 0, .5));
      addBuilding(106.5, 33.5, 12.5, 11, 6, 0, { faces: ['pz','nx'], signPool: foodSigns });
      addBuilding(133.5, 33.5, 12.5, 11, 5, 2, { faces: ['pz','px'], signPool: foodSigns });
      rowsOf(4, 9, ALL, { skipRow: 1, signPool: foodSigns });
    } else rowsOf(4, 9, ALL, { signPool: foodSigns });
    sidewalkRing(p => outTables.push(p), 6, .35);
  } else if (type === 'works' || type === 'workshop'){
    if (type === 'workshop'){
      addBuilding(264, 79, 18, 14, 2, 4, { bandTex: garageBand, faces: ['pz'], noDoor: true, noSign: true, noPoster: true });
      glowSigns.push(signBoard(bigSign('ورشة الأسطى شمس 🔧','#20262c','#ffb74d'), 264, 3.1, 86.2, 10, 1.75, 0, .3));
      rowsOf(1, 3, [3,4,5], { bandTex: garageBand, skipRow: 1, noSign: true });
    } else rowsOf(1, 3, [3,4,5], { bandTex: garageBand, noSign: true });
    sidewalkRing(p => (rng() < .5 ? tireList : drumList).push({ ...p, y: .15 }), 3.5, .5);
  } else if (type === 'pitch'){
    const pt = makeTex(512,340,(g,w,h)=>{ for (let i=0;i<10;i++){ g.fillStyle = i%2 ? '#3f8f3a' : '#4aa244'; g.fillRect(i*w/10,0,w/10,h); } g.strokeStyle='rgba(255,255,255,.9)'; g.lineWidth=5; g.strokeRect(14,14,w-28,h-28); g.beginPath(); g.moveTo(w/2,14); g.lineTo(w/2,h-14); g.stroke(); g.beginPath(); g.arc(w/2,h/2,44,0,7); g.stroke(); g.strokeRect(14,h/2-70,70,140); g.strokeRect(w-84,h/2-70,70,140); });
    pt.wrapS = pt.wrapT = THREE.ClampToEdgeWrapping;
    const f = new THREE.Mesh(new THREE.BoxGeometry(32, .06, 22), new THREE.MeshStandardMaterial({ map: pt, roughness: .95 })); f.position.set(cx, .18, cz); f.receiveShadow = true; scene.add(f);
    const gp = []; for (const s of [-1,1]){ const gx = cx + s*15.2; box(gp, .14,2.2,.14, gx,1.25,cz-3, '#ffffff'); box(gp, .14,2.2,.14, gx,1.25,cz+3, '#ffffff'); box(gp, .14,.14,6.1, gx,2.35,cz, '#ffffff'); }
    for (let t=-16; t<=16; t+=2){ box(gp, .08,1.6,.08, cx+t,.95,cz-12, '#556'); box(gp, .08,1.6,.08, cx+t,.95,cz+12, '#556'); }
    for (const [x,z] of [[-17,-12],[17,-12],[-17,12],[17,12]]){ box(gp, .3,9,.3, cx+x,4.65,cz+z, '#666'); box(gp, 1.6,.8,.4, cx+x,9.2,cz+z, '#eee'); }
    const gm = new THREE.Mesh(mergeGeometries(gp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .3 })); gm.castShadow = true; scene.add(gm);
    obstacles.push({ minX: cx-16, maxX: cx+16, minZ: cz-12.2, maxZ: cz-11.8 });
  } else if (type === 'corniche'){
    // tall nicer buildings on the north half, a palm promenade on the south half
    const n = 3; let x = cx - 15; for (let i=0;i<n;i++){ const wv = 10; addBuilding(x + wv/2, cz - 8.5, wv - .6, 12, Math.floor(R(8, 15)), pick([0,2,3,4]), { faces: ['nz', ...(i===0?['nx']:[]), ...(i===n-1?['px']:[])], noPoster: true }); x += wv; }
    for (let t=-14; t<=14; t+=7){ palmList.push({ x: cx+t, z: cz+5, s: R(.9,1.15) }); palmList.push({ x: cx+t+3.5, z: cz+13, s: R(.9,1.15) }); benchList.push({ x: cx+t+1.8, z: cz+9, ry: Math.PI, y: .15 }); }
  } else {
    rowsOf(4, 11, ALL);
    for (const side of [[0,1],[0,-1],[1,0],[-1,0]]) for (let t=-12;t<=12;t+=8) if (rng()<.4){ const off = BW/2 - 1.5; treeList.push(side[0] ? { x: cx+side[0]*off, z: cz+t, s:R(.75,1.05) } : { x: cx+t, z: cz+side[1]*off, s:R(.75,1.05) }); }
  }
}

// river promenade, palms and benches along the Nile, and the bridge
{ const pv = paveTex.clone(); pv.needsUpdate = true; pv.repeat.set((XMAX - X0 + 12)/3, (NILE_Z - ZMAX - 6)/3); const pm = new THREE.MeshStandardMaterial({ map: pv, roughness: .95 }); const sideM = slabMats[0];
  for (const [xa, xb] of [[X0 - 6, BRIDGE.x - BRIDGE.w/2], [BRIDGE.x + BRIDGE.w/2, XMAX + 6]]){ const pr = new THREE.Mesh(new THREE.BoxGeometry(xb - xa, .15, NILE_Z - ZMAX - 6), [sideM, sideM, pm, pm, sideM, sideM]); pr.position.set((xa+xb)/2, .075, (ZMAX + 6 + NILE_Z)/2); pr.receiveShadow = true; scene.add(pr); } }
for (let x = X0 - 4; x <= XMAX + 4; x += 9){ if (Math.abs(x - BRIDGE.x) < 9) continue; palmList.push({ x, z: NILE_Z - 2.4, s: R(.95,1.2) }); if (rng() < .5) benchList.push({ x: x + 4.5, z: NILE_Z - 1.6, ry: 0, y: 0 }); }
{
  const rp = [];
  for (let x = X0 - 6; x <= XMAX + 6; x += 2.4){ if (Math.abs(x - BRIDGE.x) < BRIDGE.w/2) continue; box(rp, .1,1,.1, x,.5,NILE_Z - .5, '#2b2f33'); }
  box(rp, (BRIDGE.x - BRIDGE.w/2) - (X0 - 6), .08,.08, ((X0-6) + (BRIDGE.x - BRIDGE.w/2))/2, 1.0, NILE_Z - .5, '#2b2f33');
  box(rp, (XMAX + 6) - (BRIDGE.x + BRIDGE.w/2), .08,.08, ((XMAX+6) + (BRIDGE.x + BRIDGE.w/2))/2, 1.0, NILE_Z - .5, '#2b2f33');
  // bridge deck, kerbs, rails and pillars
  const len = BRIDGE.z1 - NILE_Z + 4, mid = (NILE_Z - 2 + BRIDGE.z1 + 2)/2;
  box(rp, BRIDGE.w, .8, len, BRIDGE.x, -.4, mid, '#8a8780');
  for (const s of [-1,1]){
    box(rp, .7, .35, len, BRIDGE.x + s*(BRIDGE.w/2 - .35), .17, mid, '#cfcac0');
    box(rp, .12, 1.1, len, BRIDGE.x + s*(BRIDGE.w/2 - .1), .9, mid, '#3c4652');
    for (let z = NILE_Z; z < BRIDGE.z1; z += 3) box(rp, .14, 1.1, .14, BRIDGE.x + s*(BRIDGE.w/2 - .1), .55, z, '#3c4652');
    obstacles.push({ minX: BRIDGE.x + s*(BRIDGE.w/2) - .5, maxX: BRIDGE.x + s*(BRIDGE.w/2) + .5, minZ: NILE_Z - 1, maxZ: BRIDGE.z1 });
  }
  for (let z = NILE_Z + 12; z < BRIDGE.z1 - 4; z += 22) for (const s of [-1,1]) box(rp, 1.6, 2.4, 1.6, BRIDGE.x + s*4, -1.6, z, '#7a776f');
  for (let z = NILE_Z + 4; z < BRIDGE.z1; z += 2.5) whiteMarks.push({ x: BRIDGE.x, y: .012, z, sx: .14, sy: 1, sz: 1.3 });
  for (let z = NILE_Z + 10; z < BRIDGE.z1; z += 24) for (const s of [-1,1]) lampList.push({ x: BRIDGE.x + s*(BRIDGE.w/2 - .4), z, ry: s > 0 ? -Math.PI/2 : Math.PI/2 });
  // far bank
  const fb = new THREE.Mesh(new THREE.BoxGeometry(FAR.x1 - FAR.x0, .15, FAR.z1 - FAR.z0), slabMats); fb.position.set((FAR.x0+FAR.x1)/2, .075, (FAR.z0+FAR.z1)/2); fb.receiveShadow = true; scene.add(fb);
  for (let i=0;i<26;i++) treeList.push({ x: R(FAR.x0 + 3, FAR.x1 - 3), z: R(FAR.z0 + 8, FAR.z1 - 2), s: R(.9, 1.5) });
  const rm = new THREE.Mesh(mergeGeometries(rp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, metalness: .2 })); rm.receiveShadow = true; rm.castShadow = true; scene.add(rm);
  glowSigns.push(signBoard(bigSign('كوبري النيل','#0d3b66','#f4d35e',768,140,70), BRIDGE.x, 5.2, NILE_Z - 1.2, 6, 1.1, 0, .3));
  const gantry = []; for (const s of [-1,1]) box(gantry, .25, 5.4, .25, BRIDGE.x + s*3.2, 2.7, NILE_Z - 1.3, '#3c4652'); box(gantry, 6.8, .25, .25, BRIDGE.x, 4.6, NILE_Z - 1.3, '#3c4652');
  scene.add(new THREE.Mesh(mergeGeometries(gantry), new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .5, roughness: .4 })));
}
// feluccas on the Nile
const feluccas = [];
for (let i=0;i<5;i++){
  const g = new THREE.Group(); const p = [];
  box(p, 1.6,.5,5.2, 0,.1,0, '#f1ead8'); box(p, 1.3,.12,4.6, 0,.38,0, '#8a5a32'); box(p, .1,5.2,.1, 0,2.9,.4, '#5a3a1e');
  const hull = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 })); g.add(hull);
  const sail = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,.7,.5), new THREE.Vector3(0,5.6,.4), new THREE.Vector3(0,.9,-2.2)]), new THREE.MeshStandardMaterial({ color: 0xfaf6ea, side: THREE.DoubleSide, roughness: .8 }));
  sail.geometry.computeVertexNormals(); g.add(sail);
  g.position.set(R(-60, 260), -1.0, R(NILE_Z + 20, FAR.z0 - 20)); g.rotation.y = Math.PI/2 * (rng() < .5 ? 1 : -1); scene.add(g); feluccas.push({ g, sp: R(.8, 1.6) * (rng() < .5 ? 1 : -1), ph: R(0, 6) });
}

// road markings, lamps and street parking
const blockAt = (x, z) => blocksInfo.find(b => Math.abs(x-b.cx) < BW/2 + .5 && Math.abs(z-b.cz) < BW/2 + .5);
for (let k=0;k<ROADS_Z.length;k++) for (let s=0;s<NXB;s++){       // east-west roads
  const z = ROADS_Z[k], a = ROADS_X[s]+7.5, b = ROADS_X[s+1]-7.5;
  for (let q=a; q<b-2; q+=6) whiteMarks.push({ x:q+1.5, y:.012, z, sx:3, sy:1, sz:.14 });
  for (const side of [-1,1]){
    if (!blockAt((a+b)/2, z + side*24)) continue;
    for (const t of [12,24,36]) lampList.push({ x: ROADS_X[s]+t, z: z+side*6.7, ry: side>0 ? Math.PI : 0 });
    const nP = Math.floor(rng()*3); for (let p=0;p<nP;p++) parkedSpots.push({ x: R(a+3, b-3), z: z+side*5, ry: side>0 ? -Math.PI/2 : Math.PI/2, y:0 });
  }
}
for (let i=0;i<ROADS_X.length;i++) for (let s=0;s<NZB;s++){       // north-south roads
  const x = ROADS_X[i], a = ROADS_Z[s]+7.5, b = ROADS_Z[s+1]-7.5;
  for (let q=a; q<b-2; q+=6) whiteMarks.push({ x, y:.012, z:q+1.5, sx:.14, sy:1, sz:3 });
  for (const side of [-1,1]){
    if (!blockAt(x + side*24, (a+b)/2)) continue;
    for (const t of [12,24,36]) lampList.push({ x: x+side*6.7, z: ROADS_Z[s]+t, ry: side>0 ? -Math.PI/2 : Math.PI/2 });
    const nP = Math.floor(rng()*3); for (let p=0;p<nP;p++) parkedSpots.push({ x: x+side*5, z: R(a+3, b-3), ry: side>0 ? Math.PI : 0, y:0 });
  }
}
for (const xi of ROADS_X) for (const zi of ROADS_Z) for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const ex = xi+dx*8.2, ez = zi+dz*8.2;
  if (ex < X0-1 || ex > XMAX+1 || ez < Z0-1 || ez > ZMAX+1) continue;
  for (let q=-5;q<=5;q+=1.1){ if (dx) whiteMarks.push({ x: ex, y:.013, z: zi+q, sx: 2.6, sy:1, sz:.55 }); else whiteMarks.push({ x: xi+q, y:.013, z: ez, sx:.55, sy:1, sz:2.6 }); }
}
for (const x of [6, 42]) yellowMarks.push({ x, y:.05, z:48, sx:.6, sy:5, sz:10 });

const markGeo = new THREE.BoxGeometry(1, .02, 1);
instanced(markGeo, new THREE.MeshStandardMaterial({ color: 0xe8e6df, roughness: .8 }), whiteMarks, false);
instanced(markGeo, new THREE.MeshStandardMaterial({ color: 0xe3b23c, roughness: .8 }), yellowMarks, false);
const planeGeo = new THREE.PlaneGeometry(1,1);
instanced(planeGeo, new THREE.MeshStandardMaterial({ map: doorTex, roughness: .8 }), doors, false, t => ({ ...t, sx:1.3, sy:2.2 }));
// the «ممنوع دخول يوسف إبراهيم» plates and the wanted posters appear as the story goes on (count is changed later)
const noEntryIM = instanced(planeGeo, new THREE.MeshStandardMaterial({ map: noEntryTex, roughness: .6, emissive: 0xffffff, emissiveMap: noEntryTex, emissiveIntensity: .12 }), noEntry, false, t => ({ ...t, sx:1.45, sy:.48 }));
const posterIM = instanced(planeGeo, new THREE.MeshStandardMaterial({ map: posterTex, roughness: .9 }), posters, false, t => ({ ...t, sx:.85, sy:1.13 }));
signs.forEach((list,i) => instanced(planeGeo, new THREE.MeshStandardMaterial({ map: signTex[i], roughness: .6, emissive: 0xffffff, emissiveMap: signTex[i], emissiveIntensity: .1 }), list, false, t => ({ ...t, sx:5.2, sy:.82 })));
foodSigns.forEach((list,i) => instanced(planeGeo, new THREE.MeshStandardMaterial({ map: foodSignTex[i], roughness: .6, emissive: 0xffffff, emissiveMap: foodSignTex[i], emissiveIntensity: .18 }), list, false, t => ({ ...t, sx:5.2, sy:.82 })));
// order the plates so that the ones near the café/foul cart come first
{ const o = noEntry.map((p,i) => ({ i, d: Math.hypot(p.x - 30, p.z - 30) })).sort((a,b) => a.d - b.d); const m4 = new THREE.Matrix4(), tmp = []; o.forEach(({i}) => { noEntryIM.getMatrixAt(i, m4); tmp.push(m4.clone()); }); tmp.forEach((m,i) => noEntryIM.setMatrixAt(i, m)); noEntryIM.instanceMatrix.needsUpdate = true; }
function setNoEntryShown(f){ noEntryIM.count = Math.round(noEntry.length * clamp(f, 0, 1)); }
function setPostersShown(on){ posterIM.visible = on; }

// trees, palms, lamps
const trunkGeo = new THREE.CylinderGeometry(.11, .18, 2.6, 7); trunkGeo.translate(0, 1.3, 0);
const leafGeo = new THREE.IcosahedronGeometry(1, 2);
{ const p = leafGeo.attributes.position; for (let i=0;i<p.count;i++){ _v.fromBufferAttribute(p,i); _v.multiplyScalar(1 + (Math.sin(_v.x*5.1)+Math.cos(_v.y*4.3+_v.z*3.7))*.07); p.setXYZ(i,_v.x,_v.y,_v.z); } leafGeo.computeVertexNormals(); }
instanced(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 1 }), treeList, true, t => ({ x:t.x, y:.15, z:t.z, sx:t.s, sy:t.s, sz:t.s }));
const leaves = [];
treeList.forEach(t=>{
  leaves.push({ x:t.x, y:.15+2.9*t.s, z:t.z, sx:1.6*t.s, sy:1.25*t.s, sz:1.6*t.s });
  leaves.push({ x:t.x+.6*t.s, y:.15+2.4*t.s, z:t.z+.3*t.s, sx:1.05*t.s, sy:.95*t.s, sz:1.05*t.s });
  leaves.push({ x:t.x-.5*t.s, y:.15+3.5*t.s, z:t.z-.3*t.s, sx:1.0*t.s, sy:.9*t.s, sz:1.0*t.s });
  obstacles.push({ minX:t.x-.25, maxX:t.x+.25, minZ:t.z-.25, maxZ:t.z+.25 });
});
const leafIM = instanced(leafGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95 }), leaves);
{ const c = new THREE.Color(); for (let i=0;i<leaves.length;i++){ c.setHSL(.22+Math.random()*.07, .42+Math.random()*.15, .24+Math.random()*.1); leafIM.setColorAt(i,c); } }
{ // palms: a tall trunk and drooping fronds
  const pp = []; for (let i=0;i<6;i++){ const g = new THREE.CylinderGeometry(.16 - i*.012, .2 - i*.012, 1.4, 7); g.translate(Math.sin(i*.35)*.12*i*.3, .7 + i*1.35, 0); pp.push(colored(g, i%2 ? '#7a5a3a' : '#6b4e33')); }
  for (let f=0; f<8; f++){ const g = new THREE.SphereGeometry(1, 8, 4); g.scale(.28, .06, 1.9); g.translate(0, 0, 1.6); g.rotateX(.55); g.rotateY(f/8*Math.PI*2); g.translate(.25, 8.4, 0); pp.push(colored(g, f%2 ? '#3f7a2e' : '#4f8f36')); }
  instanced(mergeGeometries(pp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 }), palmList, true, t => ({ x: t.x, y: .15, z: t.z, sx: t.s, sy: t.s, sz: t.s, ry: t.x*1.7 }));
  palmList.forEach(t => obstacles.push({ minX:t.x-.3, maxX:t.x+.3, minZ:t.z-.3, maxZ:t.z+.3 }));
}
{ // benches
  const bp = []; box(bp, 1.8,.08,.5, 0,.48,0, '#7a4f2c'); box(bp, 1.8,.45,.06, 0,.75,-.24, '#7a4f2c'); for (const x of [-.8,.8]) box(bp, .08,.48,.45, x,.24,0, '#333');
  instanced(mergeGeometries(bp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 }), benchList);
}
{ // market stalls: fruit, vegetables, clothes
  const mk = (top) => { const sp = []; box(sp, 1.9,.85,1.0, 0,.43,0, '#7a5230'); box(sp, 2.0,.06,1.1, 0,.88,0, '#a07040'); for (const x of [-.9,.9]) box(sp, .07,1.9,.07, x,1.8,-.45, '#5a3a20');
    const cv = new THREE.BoxGeometry(2.3,.05,1.5); cv.rotateX(-.25); cv.translate(0,2.7,.05); sp.push(colored(cv, top.awn));
    for (let i=0;i<10;i++){ const g = top.kind === 'clothes' ? new THREE.BoxGeometry(.28,.06,.34) : new THREE.SphereGeometry(.09,8,6); g.translate(-.75 + (i%5)*.37, .97 + (top.kind==='clothes' ? Math.floor(i/5)*.07 : .02), -.2 + Math.floor(i/5)*.38); sp.push(colored(g, top.cols[i % top.cols.length])); }
    return mergeGeometries(sp); };
  const kinds = [{ kind:'fruit', awn:'#d84315', cols:['#ff8f00','#e53935','#fdd835','#7cb342'] }, { kind:'veg', awn:'#2e7d32', cols:['#c62828','#66bb6a','#8d6e63','#fafafa'] }, { kind:'clothes', awn:'#1565c0', cols:['#ab47bc','#26c6da','#ef5350','#ffee58','#212121'] }];
  stallLists.forEach((list, i) => { instanced(mk(kinds[i]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 }), list); list.forEach(p => obstacles.push({ minX:p.x-1.05, maxX:p.x+1.05, minZ:p.z-1.05, maxZ:p.z+1.05 })); });
}
{ // workshop yards: tyre stacks and oil drums
  const tp = []; for (let i=0;i<4;i++){ const g = new THREE.TorusGeometry(.34,.13,8,16); g.rotateX(Math.PI/2); g.translate(0, .14 + i*.26, 0); tp.push(colored(g, '#1c1c1c')); }
  instanced(mergeGeometries(tp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 }), tireList);
  const dr = new THREE.CylinderGeometry(.32,.32,.9,14); dr.translate(0,.45,0);
  const dIM = instanced(dr, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6, metalness: .4 }), drumList);
  if (dIM){ const c = new THREE.Color(); drumList.forEach((d,i) => { c.set(pick(['#1e5fa8','#b71c1c','#2e7d32','#f9a825'])); dIM.setColorAt(i, c); }); }
  [...tireList, ...drumList].forEach(p => obstacles.push({ minX:p.x-.45, maxX:p.x+.45, minZ:p.z-.45, maxZ:p.z+.45 }));
}
{ // restaurant pavement tables
  const tp = []; cyl(tp, .45,.45,.04, 0,.78,0, '#e8e2d4', 0, 16); cyl(tp, .04,.04,.72, 0,.4,0, '#555'); box(tp, .4,.05,.4, .75,.45,0, '#c0392b'); box(tp, .4,.05,.4, -.75,.45,0, '#f2f0ea');
  instanced(mergeGeometries(tp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 }), outTables, true, t => ({ ...t, y: .15 }));
  outTables.forEach(p => obstacles.push({ minX:p.x-.5, maxX:p.x+.5, minZ:p.z-.5, maxZ:p.z+.5 }));
}
const poleGeo = new THREE.CylinderGeometry(.07, .1, 6.2, 8); poleGeo.translate(0, 3.25, 0);
const armGeo = new THREE.BoxGeometry(.12, .12, 1.6); armGeo.translate(0, 6.35, .7);
const headGeo = new THREE.BoxGeometry(.32, .14, .7); headGeo.translate(0, 6.25, 1.35);
instanced(mergeGeometries([poleGeo, armGeo]), new THREE.MeshStandardMaterial({ color: 0x3a3d40, metalness: .7, roughness: .45 }), lampList);
const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff2cc, emissiveIntensity: .35 });
instanced(headGeo, lampHeadMat, lampList, false);
lampList.forEach(l => obstacles.push({ minX:l.x-.15, maxX:l.x+.15, minZ:l.z-.15, maxZ:l.z+.15 }));
// warm light pools under the street lamps (seen at night)
const glowTex = makeTex(128,128,(g)=>{ const gr = g.createRadialGradient(64,64,0,64,64,64); gr.addColorStop(0,'rgba(255,214,150,.85)'); gr.addColorStop(1,'rgba(255,214,150,0)'); g.fillStyle=gr; g.fillRect(0,0,128,128); });
const lampPoolMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
const poolGeo = new THREE.PlaneGeometry(1,1); poolGeo.rotateX(-Math.PI/2);
const lampPools = instanced(poolGeo, lampPoolMat, lampList, false, l => ({ x: l.x + Math.sin(l.ry)*1.4, y: .2, z: l.z + Math.cos(l.ry)*1.4, sx: 9, sy: 1, sz: 9 }));
if (lampPools) lampPools.receiveShadow = false;
// transit stops (موقف)
const stopSignTex = makeTex(256,256,(g,w,h)=>{ g.fillStyle='#0d47a1'; g.beginPath(); g.arc(128,128,124,0,7); g.fill(); g.fillStyle='#fff'; g.beginPath(); g.roundRect(56,70,144,96,14); g.fill(); g.fillStyle='#0d47a1'; g.fillRect(70,84,52,34); g.fillRect(134,84,52,34); g.fillStyle='#222'; g.beginPath(); g.arc(88,172,14,0,7); g.arc(168,172,14,0,7); g.fill(); arText(g,'موقف',128,222,34,'#fff'); });
stopSignTex.wrapS = stopSignTex.wrapT = THREE.ClampToEdgeWrapping;
STOPS.forEach(s => {
  const g = new THREE.Group(); g.position.copy(s.pos);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,2.8,8), new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: .6 })); pole.position.y = 1.4;
  const sg = new THREE.Mesh(new THREE.CircleGeometry(.5, 24), new THREE.MeshStandardMaterial({ map: stopSignTex, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: stopSignTex, emissiveIntensity: .2 })); sg.position.y = 2.9;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6,.08,1.2), new THREE.MeshStandardMaterial({ color: 0x0d47a1, roughness: .6 })); roof.position.set(1.4, 2.35, 0);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2,.08,.45), new THREE.MeshStandardMaterial({ color: 0xb0b6bd, metalness: .4 })); bench.position.set(1.4, .5, 0);
  g.add(pole, sg, roof, bench); g.userData.sign = sg; scene.add(g); s.g = g;
  obstacles.push({ minX: s.pos.x - .15, maxX: s.pos.x + .15, minZ: s.pos.z - .15, maxZ: s.pos.z + .15 });
});

// ---- cafe furniture ----
const tableList = TABLES.map(([x,z]) => ({ x, z })).concat([{ x: SPOT.domino.x, z: SPOT.domino.z }]);
{
  const top = new THREE.CylinderGeometry(.55,.55,.05,20); top.translate(0,.88,0);
  const leg = new THREE.CylinderGeometry(.05,.05,.72,8); leg.translate(0,.5,0);
  const foot = new THREE.CylinderGeometry(.3,.3,.04,14); foot.translate(0,.17,0);
  instanced(mergeGeometries([top]), new THREE.MeshStandardMaterial({ color: 0xd9d4c7, roughness: .5, metalness: .2 }), tableList);
  instanced(mergeGeometries([leg, foot]), new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: .6, roughness: .4 }), tableList);
  tableList.forEach(t => obstacles.push({ minX:t.x-.5, maxX:t.x+.5, minZ:t.z-.5, maxZ:t.z+.5 }));
  const chairParts = []; box(chairParts, .44,.05,.44, 0,.47,0, '#ffffff'); box(chairParts, .44,.48,.05, 0,.72,-.2, '#ffffff');
  for (const [a,b] of [[-.19,-.19],[.19,-.19],[-.19,.19],[.19,.19]]) box(chairParts, .04,.47,.04, a,.235,b, '#ffffff');
  const chairGeo = mergeGeometries(chairParts);
  const chairs = SEATS.map(s => ({ x:s.x, z:s.z, ry:s.ry, y:.15 })).concat([{ x:SPOT.domino.x-.85, z:SPOT.domino.z, ry:Math.PI/2, y:.15 }, { x:SPOT.domino.x+.85, z:SPOT.domino.z, ry:-Math.PI/2, y:.15 }]);
  const chairIM = instanced(chairGeo, new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xffffff, roughness: .6 }), chairs);
  const cc = new THREE.Color(); chairs.forEach((c,i) => { cc.set(i%3===0 ? '#c9302c' : '#f2f0ea'); chairIM.setColorAt(i, cc); });
  // dominoes on the domino table
  const dp = []; for (let i=0;i<9;i++) box(dp, .09,.025,.18, SPOT.domino.x - .36 + i*.095, 1.04, SPOT.domino.z + (i%2?.05:-.05), '#f4f0e6');
  for (let i=0;i<5;i++) box(dp, .09,.18,.025, SPOT.domino.x - .2 + i*.1, 1.11, SPOT.domino.z - .38, '#f4f0e6');
  const dmesh = new THREE.Mesh(mergeGeometries(dp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .4 })); dmesh.position.y = -.12; scene.add(dmesh);
  // counter (النَصبة)
  const cp = []; box(cp, 3.2,.95,.8, 0,.62,0, '#6b4528'); box(cp, 3.3,.06,.9, 0,1.12,0, '#c7b9a0');
  const counter = new THREE.Mesh(mergeGeometries(cp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 })); counter.position.set(SPOT.counter.x, 0, SPOT.counter.z); counter.castShadow = true; scene.add(counter);
  obstacles.push({ minX:SPOT.counter.x-1.6, maxX:SPOT.counter.x+1.6, minZ:SPOT.counter.z-.4, maxZ:SPOT.counter.z+.4 });
  // foul cart
  const fp = []; box(fp, 2.4,.9,1.1, 0,.95,0, '#2f6fa8'); box(fp, 2.5,.06,1.2, 0,1.42,0, '#d9d2c2');
  for (const x of [-1,1]){ const g = new THREE.CylinderGeometry(.32,.32,.1,16); g.rotateX(Math.PI/2); g.rotateY(Math.PI/2); g.translate(x*.8,.32,.58); fp.push(colored(g,'#222')); }
  { const up = []; box(up, .06,1.8,.06, 0,2.3,0, '#555'); const g = new THREE.ConeGeometry(1.5,.6,8,1,true); g.translate(0,3.3,0); up.push(colored(g,'#e4572e')); const um = new THREE.Mesh(mergeGeometries(up), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, side: THREE.DoubleSide })); um.position.set(SPOT.cart.x + 1.1, 0, SPOT.cart.z + .45); um.castShadow = true; um.name = 'cartUmbrella'; scene.add(um); }
  const cart = new THREE.Mesh(mergeGeometries(fp), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, side: THREE.DoubleSide })); cart.position.copy(SPOT.cart); cart.castShadow = true; scene.add(cart);
  const fs = new THREE.Mesh(new THREE.PlaneGeometry(2.3,.55), new THREE.MeshStandardMaterial({ map: foulSignTex, roughness: .6 })); fs.position.set(SPOT.cart.x, .95, SPOT.cart.z + .57); scene.add(fs);
  obstacles.push({ minX:SPOT.cart.x-1.25, maxX:SPOT.cart.x+1.25, minZ:SPOT.cart.z-.6, maxZ:SPOT.cart.z+.6 });
}
// tea glass meshes (شاي في كوباية)
const glassGeo = new THREE.CylinderGeometry(.045,.035,.11,12, 1, true);
const teaGeo = new THREE.CylinderGeometry(.04,.032,.08,12);
const saucerGeo = new THREE.CylinderGeometry(.075,.06,.012,16);
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .35, roughness: .05, transmission: 0, side: THREE.DoubleSide, depthWrite: false });
const teaMat = new THREE.MeshStandardMaterial({ color: 0x8a2a08, roughness: .2, emissive: 0x3a0a00, emissiveIntensity: .3 });
const coffeeMat = new THREE.MeshStandardMaterial({ color: 0x2a1508, roughness: .3 });
const greenMat = new THREE.MeshStandardMaterial({ color: 0x9aa84a, roughness: .3 });
const milkMat = new THREE.MeshStandardMaterial({ color: 0xe9dcb8, roughness: .4 });
const saucerMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: .3 });
const DRINK_MAT = { 'شاي': teaMat, 'قهوة': coffeeMat, 'ينسون': greenMat, 'حلبة': milkMat };
function makeGlass(drink='شاي'){
  const g = new THREE.Group();
  const s = new THREE.Mesh(saucerGeo, saucerMat); s.position.y = .006; g.add(s);
  const t = new THREE.Mesh(teaGeo, DRINK_MAT[drink]); t.position.y = .052; g.add(t);
  const gl = new THREE.Mesh(glassGeo, glassMat); gl.position.y = .066; gl.renderOrder = 2; g.add(gl);
  g.scale.setScalar(1.6); return g;
}
const decoGlasses = [];
TABLES.forEach(([x,z],i) => { const n = 1 + (i%3); for (let k=0;k<n;k++){ const g = makeGlass(k===1?'قهوة':'شاي'); g.position.set(x + R(-.3,.3), 1.04-.12+.03, z + R(-.3,.3)); scene.add(g); decoGlasses.push(g); } });
