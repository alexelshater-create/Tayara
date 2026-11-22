// ================= world layout =================
const PITCH = 48, N = 4, HALF = PITCH*N/2;
const ROADS = [...Array(N+1)].map((_,i) => -HALF + i*PITCH);
const BLOCKS = [...Array(N)].map((_,i) => -HALF + PITCH/2 + i*PITCH);
const BW = PITCH - 12, LIMIT = HALF + 5.5;
const CAFE = { cx: 24, cz: 24 };
const SPOT = {
  spawn: new THREE.Vector3(17, 0, 36.5), counter: new THREE.Vector3(21, 0, 22.6), domino: new THREE.Vector3(30, 0, 25.5),
  cart: new THREE.Vector3(34.5, 0, 31), cartHero: new THREE.Vector3(34.5, 0, 29.7), policeSpawn: new THREE.Vector3(32, 0, 40.2),
};
const TABLES = [[12,26.5],[17,26.5],[22,26.5],[12,32],[17,32],[22,32]];
const SEATS = TABLES.flatMap(([x,z],ti) => [{x:x-.85,z,ry:Math.PI/2,ti},{x:x+.85,z,ry:-Math.PI/2,ti}]);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(900,900), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
ground.rotation.x = -Math.PI/2; ground.position.y = -0.02; ground.receiveShadow = true; scene.add(ground);
const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(2*HALF+14, 2*HALF+14), new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: .93, envMapIntensity: .3 }));
asphalt.rotation.x = -Math.PI/2; asphalt.receiveShadow = true; scene.add(asphalt);

const obstacles = [], buildings = [], blocksInfo = [];
const treeList = [], lampList = [], whiteMarks = [], yellowMarks = [], parkedSpots = [];
const doors = [], noEntry = [], posters = [], signs = shopNames.map(() => []);
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
    if (!opts.noSign && along > 6.5) signs[Math.floor(rng()*signs.length)].push(place(R(-along/2+3, along/2-3), 3.32, .12));
  }
  return b;
}

for (let j=0;j<N;j++) for (let k=0;k<N;k++){
  const cx = BLOCKS[j], cz = BLOCKS[k];
  let type = 'city'; const r = rng();
  if (j===2 && k===2) type = 'cafe'; else if (r < .1) type = 'park'; else if (r < .17) type = 'parking';
  blocksInfo.push({ cx, cz, type });
  const slab = new THREE.Mesh(slabGeo, slabMats); slab.position.set(cx, .075, cz); slab.receiveShadow = true; scene.add(slab);
  if (type === 'park'){
    const g = new THREE.Mesh(new THREE.BoxGeometry(BW-6, .06, BW-6), new THREE.MeshStandardMaterial({ map: parkTex, roughness: 1 })); g.position.set(cx, .18, cz); g.receiveShadow = true; scene.add(g);
    for (let i=0;i<12;i++) treeList.push({ x: cx+R(-12,12), z: cz+R(-12,12), s: R(.9,1.5) });
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
    const cb = addBuilding(17.5, 15.5, 16, 12, 5, 1, { bandTex: cafeBand, faces:['pz','nz','nx'], doorU: 0, noSign: true, noPoster: true });
    void cb;
    addBuilding(33, 15.5, 11.5, 12, 7, 2, { faces:['pz','nz','px'] });
    const sgn = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.9), new THREE.MeshStandardMaterial({ map: cafeSignTex, emissive: 0xffffff, emissiveMap: cafeSignTex, emissiveIntensity: .35, roughness: .6 }));
    sgn.position.set(17.5, 3.0, 21.65); scene.add(sgn);
    // awning
    const aw = new THREE.Mesh(new THREE.BoxGeometry(14, .08, 2.6), new THREE.MeshStandardMaterial({ color: 0x1d6b44, roughness: .8 })); aw.position.set(17.5, 3.75, 22.9); aw.rotation.x = .18; aw.castShadow = true; aw.name = 'cafeAwning'; scene.add(aw);
  } else {
    const rows = [[cz-15, cz-.3], [cz+.3, cz+15]];
    rows.forEach(([z0,z1], ri) => {
      const n = rng() < .55 ? 2 : 3; let x = cx - 15; const widths = [];
      let rem = 30; for (let i=0;i<n;i++){ const wv = i===n-1 ? rem : R(8, rem - 8*(n-1-i)); widths.push(wv); rem -= wv; }
      widths.forEach((wv, i) => {
        const bw = wv - .5, bd = (z1-z0) - R(0, 1.5);
        const bz = ri === 0 ? z0 + bd/2 : z1 - bd/2;
        const faces = [ri === 0 ? 'nz' : 'pz']; if (i===0) faces.push('nx'); if (i===n-1) faces.push('px');
        addBuilding(x + wv/2, bz, bw, bd, Math.floor(R(4, 11)), Math.floor(rng()*FSTY.length), { faces });
        x += wv;
      });
    });
    for (const side of [[0,1],[0,-1],[1,0],[-1,0]]) for (let t=-12;t<=12;t+=8) if (rng()<.4){ const off = BW/2 - 1.5; treeList.push(side[0] ? { x: cx+side[0]*off, z: cz+t, s:R(.75,1.05) } : { x: cx+t, z: cz+side[1]*off, s:R(.75,1.05) }); }
  }
}

// road markings, lamps, street parking
for (let i=0;i<=N;i++){
  for (let s=0;s<N;s++){
    const a = ROADS[s]+7.5, b = ROADS[s+1]-7.5, mid=(a+b)/2, len=b-a, r=ROADS[i];
    for (let q=a; q<b-2; q+=6){ whiteMarks.push({ x:q+1.5, y:.012, z:r, sx:3, sy:1, sz:.14 }); whiteMarks.push({ x:r, y:.012, z:q+1.5, sx:.14, sy:1, sz:3 }); }
    void mid; void len;
    for (const side of [-1,1]){
      const blockSide = r + side*7;
      if (blockSide < -HALF || blockSide > HALF) continue;
      for (const t of [12,24,36]){
        lampList.push({ x: ROADS[s]+t, z: r+side*6.7, ry: side>0 ? Math.PI : 0 });
        lampList.push({ x: r+side*6.7, z: ROADS[s]+t, ry: side>0 ? -Math.PI/2 : Math.PI/2 });
      }
      const nP = Math.floor(rng()*3);
      for (let p=0;p<nP;p++){
        const t = R(a+3, b-3);
        if (rng()<.5) parkedSpots.push({ x: t, z: r+side*5, ry: side>0 ? -Math.PI/2 : Math.PI/2, y:0 });
        else parkedSpots.push({ x: r+side*5, z: t, ry: side>0 ? Math.PI : 0, y:0 });
      }
    }
  }
}
for (const xi of ROADS) for (const zi of ROADS) for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const ex = xi+dx*8.2, ez = zi+dz*8.2;
  if (Math.abs(ex) > HALF+1 || Math.abs(ez) > HALF+1) continue;
  for (let q=-5;q<=5;q+=1.1){ if (dx) whiteMarks.push({ x: ex, y:.013, z: zi+q, sx: 2.6, sy:1, sz:.55 }); else whiteMarks.push({ x: xi+q, y:.013, z: ez, sx:.55, sy:1, sz:2.6 }); }
}
// speed bumps near the cafe
for (const x of [6, 42]) yellowMarks.push({ x, y:.05, z:48, sx:.6, sy:5, sz:10 });

const markGeo = new THREE.BoxGeometry(1, .02, 1);
instanced(markGeo, new THREE.MeshStandardMaterial({ color: 0xe8e6df, roughness: .8 }), whiteMarks, false);
instanced(markGeo, new THREE.MeshStandardMaterial({ color: 0xe3b23c, roughness: .8 }), yellowMarks, false);
const planeGeo = new THREE.PlaneGeometry(1,1);
instanced(planeGeo, new THREE.MeshStandardMaterial({ map: doorTex, roughness: .8 }), doors, false, t => ({ ...t, sx:1.3, sy:2.2 }));
instanced(planeGeo, new THREE.MeshStandardMaterial({ map: noEntryTex, roughness: .6, emissive: 0xffffff, emissiveMap: noEntryTex, emissiveIntensity: .12 }), noEntry, false, t => ({ ...t, sx:1.45, sy:.48 }));
instanced(planeGeo, new THREE.MeshStandardMaterial({ map: posterTex, roughness: .9 }), posters, false, t => ({ ...t, sx:.85, sy:1.13 }));
signs.forEach((list,i) => instanced(planeGeo, new THREE.MeshStandardMaterial({ map: signTex[i], roughness: .6, emissive: 0xffffff, emissiveMap: signTex[i], emissiveIntensity: .1 }), list, false, t => ({ ...t, sx:5.2, sy:.82 })));

// trees + lamps
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
const poleGeo = new THREE.CylinderGeometry(.07, .1, 6.2, 8); poleGeo.translate(0, 3.25, 0);
const armGeo = new THREE.BoxGeometry(.12, .12, 1.6); armGeo.translate(0, 6.35, .7);
const headGeo = new THREE.BoxGeometry(.32, .14, .7); headGeo.translate(0, 6.25, 1.35);
instanced(mergeGeometries([poleGeo, armGeo]), new THREE.MeshStandardMaterial({ color: 0x3a3d40, metalness: .7, roughness: .45 }), lampList);
instanced(headGeo, new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff2cc, emissiveIntensity: .35 }), lampList, false);
lampList.forEach(l => obstacles.push({ minX:l.x-.15, maxX:l.x+.15, minZ:l.z-.15, maxZ:l.z+.15 }));

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
