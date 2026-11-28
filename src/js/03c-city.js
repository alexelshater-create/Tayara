// ================= the real city (stages 14-16): Alexandria's streets and buildings around the old «حتة» =================
// tools/city/build_city.py turns OpenStreetMap into assets/city: 128 m chunks (roads, sidewalks, parks, kerbs, buildings),
// a 1 m raster (0 sea, 1 road, 2 land, 3 park, 4 plaza, 10+ building of height (v-10)/2 m) for walking / driving / roofs,
// and the road graph. The real map is turned 180° (real north = +z) so the sea stays on +z like the old map; positions are
// half size, road widths and building heights are human size. The old «حتة» (x -102..102, z -102..156) is the old game's own.
const CITY = await fetch('assets/city/index.json').then(r => r.ok ? r.json() : null).catch(() => null);
const CGRAPH = CITY ? await fetch('assets/city/graph.json').then(r => r.json()).catch(() => ({ nodes: [], edges: [] })) : { nodes: [], edges: [] };
const CPATCH = CITY ? CITY.patch : [-102, -102, 102, 156];
const inPatch = (x, z) => x > CPATCH[0] && x < CPATCH[2] && z > CPATCH[1] && z < CPATCH[3];

// ---------- the raster ----------
const CR = { tiles: new Map(), want: new Set() };
function crTile(ti, tk){
  const key = ti * 1000 + tk; let t = CR.tiles.get(key);
  if (t !== undefined) return t;
  if (CITY && CITY.tiles && !CITY.tilesSet) CITY.tilesSet = new Set(CITY.tiles);
  if (CITY && CITY.tilesSet && !CITY.tilesSet.has(ti + '_' + tk)){ t = { a: null }; CR.tiles.set(key, t); return t; }   // open sea: no tile to load
  CR.tiles.set(key, null);   // loading
  const img = new Image(); img.decoding = 'async';
  img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data, a = new Uint8Array(img.width * img.height); for (let i = 0; i < a.length; i++) a[i] = d[i * 4];
    CR.tiles.set(key, { a, w: img.width, h: img.height }); };
  img.onerror = () => CR.tiles.set(key, { a: null });   // no tile = all sea
  img.src = `assets/city/r/${ti}_${tk}.png`;
  return null;
}
// the raster value at a point (2 = land while its tile is still loading, so nothing falls into the sea)
function cityR(x, z){
  if (!CITY) return 2;
  const lx = x - CITY.x0, lz = z - CITY.z0; if (lx < 0 || lz < 0 || x >= CITY.x1 || z >= CITY.z1) return 0;
  const ti = Math.floor(lx / 256), tk = Math.floor(lz / 256), t = crTile(ti, tk);
  if (t === null) return 2; if (!t.a) return 0;
  const px = Math.floor(lx - ti * 256), pz = Math.floor(lz - tk * 256); if (px >= t.w || pz >= t.h) return 0;
  return t.a[pz * t.w + px];
}
// are the raster tiles round a point loaded (so cityR there is real, not the 'still loading' default)?
function cityReady(x, z, r = 0){ if (!CITY) return true; for (const [dx, dz] of [[0, 0], [r, r], [-r, r], [r, -r], [-r, -r]]){ const lx = x + dx - CITY.x0, lz = z + dz - CITY.z0; if (lx < 0 || lz < 0) continue; const t = crTile(Math.floor(lx / 256), Math.floor(lz / 256)); if (t === null) return false; } return true; }
const cityH = v => v >= 10 ? (v - 10) * .5 : 0;
// is there a city building at (x, z) within pad (for feet above its roof it isn't)?
function cityBlocked(x, z, pad = PR, feet){
  if (!CITY || inPatch(x, z)) return false;
  for (const [ox, oz] of [[0, 0], [pad, 0], [-pad, 0], [0, pad], [0, -pad]]){ const v = cityR(x + ox, z + oz); if (v >= 10 && !(feet !== undefined && feet >= cityH(v) + .15 - .05)) return true; }
  return false;
}
// preload the raster around a point (used at the start and when teleporting)
function cityPreload(x, z, r = 420){
  if (!CITY) return Promise.resolve();
  const out = [];
  for (let xx = x - r; xx <= x + r + 255; xx += 128) for (let zz = z - r; zz <= z + r + 255; zz += 128){ const ti = Math.floor((xx - CITY.x0) / 256), tk = Math.floor((zz - CITY.z0) / 256); if (ti >= 0 && tk >= 0) crTile(ti, tk); }
  return new Promise(res => { const t0 = performance.now(); const w = () => { let busy = false; for (const v of CR.tiles.values()) if (v === null) busy = true; if (!busy || performance.now() - t0 > 6000) res(); else setTimeout(w, 50); }; w(); });
}
if (CITY) await cityPreload(0, 0, 700);

// ---------- shopfronts: one picture with 8 rows (each a strip of 3 shops), so every street can have its own trades ----------
// 0 mixed, 1 fish, 2 cafés, 3 clothes, 4 food, 5 pharmacy / grocery, 6 phones, 7 closed shutters
const SHOP_ROWS = [
  [['بقالة', '#2f6b3a'], ['خردوات', '#5a4a2a'], ['مكتبة', '#1f4f7a']],
  [['أسماك الأنفوشي', '#0d4f7a'], ['سمك بحري طازة', '#11657e'], ['مطعم أسماك الريس', '#0b3f63']],
  [['قهوة الحاج', '#5a3a1e'], ['قهوة الشباب', '#6b4a22'], ['قهوة المعلم', '#4a2e18']],
  [['ملابس الشباب', '#6a1b4d'], ['بوتيك سارة', '#8a1f3a'], ['أحذية النجمة', '#3a2a6a']],
  [['فول وفلافل', '#a33a12'], ['حلواني', '#b06a12'], ['شاورما', '#8a2a12']],
  [['صيدلية', '#1e7a4a'], ['سوبر ماركت', '#1f6f43'], ['عطارة', '#6b5a1e']],
  [['موبايلات', '#202a6e'], ['إلكترونيات', '#1a3f8a'], ['صيانة موبايل', '#2a2a5a']],
  [['', '#3a3530'], ['', '#3a3530'], ['', '#3a3530']],
  [['ورشة ميكانيكا', '#3a3a3a'], ['قطع غيار', '#7a1f1f'], ['ورشة نجارة', '#6b4a22']],
  [['أنتيكات', '#4a3420'], ['موبيليا', '#5a3a20'], ['تحف وأنتيكات', '#3a2a18']],
  [['كبدة إسكندراني', '#8a2a12'], ['سمك وجمبري', '#0d4f7a'], ['فطاطري', '#a35a12']],
  [['أقمشة', '#6a1b4d'], ['خردوات', '#5a4a2a'], ['عصير قصب', '#2d7a1f']],
  [['قهوة البحر', '#5a3a1e'], ['قهوة الصيادين', '#6b4a22'], ['كافيه على البحر', '#0d4f7a']],
];
const SHOP_N = SHOP_ROWS.length;
const shopAtlas = makeTex(1024, 2048, (g, W, H) => {
  const RH = H / SHOP_N;
  SHOP_ROWS.forEach((row, r) => {
    const y0 = r * RH; g.save(); g.translate(0, y0); g.scale(1, RH / 256); { const y0 = 0, RH = 256; g.fillStyle = '#5b544b'; g.fillRect(0, y0, W, RH);
    row.forEach(([name, col], b) => {
      const x = b * (W / 3), bw = W / 3;
      g.fillStyle = '#3a332c'; g.fillRect(x + 8, y0 + 56, bw - 16, RH - 60);
      const kind = r === 7 ? 0 : (b + r) % 3;
      if (kind === 0){ g.fillStyle = '#8d8f91'; g.fillRect(x + 12, y0 + 60, bw - 24, RH - 66); g.strokeStyle = 'rgba(0,0,0,.35)'; for (let y = y0 + 64; y < y0 + RH - 6; y += 6){ g.beginPath(); g.moveTo(x + 12, y); g.lineTo(x + bw - 12, y); g.stroke(); } }
      else if (kind === 1){ const gr = g.createLinearGradient(0, y0 + 60, 0, y0 + RH); gr.addColorStop(0, '#f3e3b8'); gr.addColorStop(1, '#a8895a'); g.fillStyle = gr; g.fillRect(x + 12, y0 + 60, bw - 24, RH - 66);
        for (let s = 0; s < 4; s++){ g.fillStyle = '#6b4a2a'; g.fillRect(x + 16, y0 + 96 + s * 40, bw - 32, 5); for (let k = 0; k < 18; k++){ g.fillStyle = `hsl(${(r * 47 + k * 23) % 360},55%,${40 + (k * 7) % 25}%)`; g.fillRect(x + 20 + k * 17, y0 + 76 + s * 40, 12, 19); } } }
      else { g.fillStyle = '#24323a'; g.fillRect(x + 12, y0 + 60, bw - 24, RH - 66); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(x + 30, y0 + 60); g.lineTo(x + 100, y0 + 60); g.lineTo(x + 40, y0 + RH - 6); g.lineTo(x + 12, y0 + RH - 6); g.fill(); g.fillStyle = '#c9c1b0'; g.fillRect(x + bw / 2 - 2, y0 + 60, 4, RH - 66); }
      // the sign over the shop
      g.fillStyle = name ? col : '#2b2723'; g.fillRect(x + 4, y0 + 4, bw - 8, 48);
      if (name){ g.strokeStyle = 'rgba(255,240,200,.5)'; g.lineWidth = 2; g.strokeRect(x + 7, y0 + 7, bw - 14, 42); arText(g, name, x + bw / 2, y0 + 29, 30, '#fff6dc', 800); }
    }); } g.restore();
  });
});
// ---------- materials ----------
const cityTex = (src, rep) => { const t = src.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); t.needsUpdate = true; return t; };
const cityPaveTex = makeTex(256, 256, (g, w, h) => {
  g.fillStyle = '#b9b3a6'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++){ const v = 165 + (Math.random() * 30 | 0) - (((x + y) % 2) * 10); g.fillStyle = `rgb(${v + 12},${v + 8},${v})`; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); }
  grain(g, w, h, 6000, .12); for (let i = 0; i < 14; i++){ g.fillStyle = 'rgba(60,55,45,.12)'; g.fillRect(Math.random() * w, Math.random() * h, 12 + Math.random() * 30, 3 + Math.random() * 6); }
});
const cityCurbTex = makeTex(64, 16, (g) => { g.fillStyle = '#efede6'; g.fillRect(0, 0, 32, 16); g.fillStyle = '#1d1d1d'; g.fillRect(32, 0, 32, 16); });
// the city facades get Alexandria's balconies painted on (a slab, wrought-iron or concrete railing, the shadow under it)
function balconyTex(src, i){
  if (!LOW) return src;   // stage 18: real 3D balconies above «خفيف» (19zzzzz-buildings3d.js); the painted ones stay on weak phones
  const S = FSTY[i], im = src.image, c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const bw = 128, fh = 128, iron = i % 3 !== 0;
  for (let fy = 0; fy < 4; fy++) for (let bx = 0; bx < 4; bx++){
    if (Math.random() < .35) continue;
    const x = bx * bw + 14, w = bw - 28, y = fy * fh + fh - 30;
    const sh = g.createLinearGradient(0, y + 12, 0, y + 30); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(x, y + 12, w, 18);
    g.fillStyle = new THREE.Color(S.trim).multiplyScalar(.85).getStyle(); g.fillRect(x - 4, y + 6, w + 8, 7);
    if (iron){ g.strokeStyle = 'rgba(25,25,25,.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 20); g.lineTo(x + w, y - 20); g.stroke(); for (let k = 0; k <= w; k += 7){ g.beginPath(); g.moveTo(x + k, y - 20); g.lineTo(x + k, y + 6); g.stroke(); } }
    else { g.fillStyle = S.trim; g.fillRect(x, y - 18, w, 24); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, y - 18, w, 3); }
    if (Math.random() < .25){ g.fillStyle = ['#c0392b', '#2e6fbf', '#e8e4da', '#e0a21a'][Math.floor(Math.random() * 4)]; g.fillRect(x + 6, y - 30, 26, 22); }   // washing on the line
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = src.anisotropy; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; return tex;
}
const CMAT = {
  road: new THREE.MeshStandardMaterial({ map: cityTex(asphaltTex), roughness: .93, envMapIntensity: .3 }),
  walk: new THREE.MeshStandardMaterial({ map: cityTex(cityPaveTex), roughness: .9, envMapIntensity: .25 }),
  park: new THREE.MeshStandardMaterial({ map: cityTex(parkTex), roughness: 1 }),
  plaza: new THREE.MeshStandardMaterial({ map: cityTex(paveTex), color: 0xe9dcc4, roughness: .85 }),
  mark: new THREE.MeshBasicMaterial({ color: 0xe8e4d8, polygonOffset: true, polygonOffsetFactor: -2 }),
  curb: new THREE.MeshStandardMaterial({ map: (() => { const x = cityCurbTex.clone(); x.wrapS = x.wrapT = THREE.RepeatWrapping; x.repeat.set(.7, 1); x.needsUpdate = true; return x; })(), roughness: .85, side: THREE.DoubleSide }),
  seawall: new THREE.MeshStandardMaterial({ color: 0x8c8172, roughness: .95, side: THREE.DoubleSide }),
  parapet: new THREE.MeshStandardMaterial({ color: 0xb9ad97, roughness: .9, side: THREE.DoubleSide }),
  roof: new THREE.MeshStandardMaterial({ map: cityTex(roofTex), roughness: .95, envMapIntensity: .25 }),
  band: new THREE.MeshStandardMaterial({ map: (() => { const x = shopAtlas.clone(); x.wrapS = THREE.RepeatWrapping; x.wrapT = THREE.ClampToEdgeWrapping; x.needsUpdate = true; return x; })(), roughness: .85, envMapIntensity: .3 }),
  fac: facadeTex.map((t, i) => new THREE.MeshStandardMaterial({ map: cityTex(balconyTex(t, i)), roughness: .9, envMapIntensity: .3 })),
};
// which facade styles each part of town uses (the old city: arched windows and shutters; the newer parts: plain blocks)
const DSTYLE = { bahary: [6, 0, 1, 3, 9, 6, 1, 7], manshiya: [6, 1, 3, 0, 9, 2], attarin: [6, 0, 3, 1, 2, 5], raml: [6, 1, 3, 9, 1, 3], corniche: [3, 1, 3, 1, 6, 4], smouha: [4, 1, 3, 4, 1, 5], karmouz: [0, 2, 5, 0, 3, 8], moharram: [0, 2, 3, 4, 1, 9], sidigaber: [1, 3, 4, 1, 9], shatby: [1, 3, 4, 6, 1, 9] };
const DKEY_LIST = ['', 'bahary', 'manshiya', 'raml', 'corniche', 'smouha', 'karmouz', 'moharram', 'sidigaber', 'shatby', 'attarin'];

// ---------- chunks ----------
const CCH = { map: new Map(), queue: [], loading: 0, built: 0, done: [] };
const BAND = 3.6;
function cityParse(buf){
  const dv = new DataView(buf); let o = 4; const ox = dv.getFloat32(o, true), oz = dv.getFloat32(o + 4, true); o += 8;
  const mesh = () => { const nv = dv.getUint32(o, true), ni = dv.getUint32(o + 4, true); o += 8; const v = new Int16Array(buf, o, nv * 2); o += nv * 4; const i = new Uint16Array(buf, o, ni); o += ni * 2; if (ni % 2) o += 2; return { v, i }; };
  const lines = () => { const n = dv.getUint32(o, true); o += 4; const s = new Int16Array(buf, o, n * 4); o += n * 8; return s; };
  const r = { ox, oz, road: mesh(), walk: mesh(), park: mesh(), plaza: mesh(), mark: mesh(), sea: lines(), curb: lines(), b: [] };
  const nb = dv.getUint32(o, true); o += 4;
  for (let k = 0; k < nb; k++){
    const sb = dv.getUint8(o), style = sb & 15, band = sb >> 4, dist = dv.getUint8(o + 1), h = dv.getUint16(o + 2, true) / 10, n = dv.getUint16(o + 4, true); o += 6;
    const ring = new Int16Array(buf, o, n * 2); o += n * 4; const ni = dv.getUint16(o, true); o += 2; const idx = new Uint16Array(buf, o, ni); o += ni * 2;
    r.b.push({ style, band, dist, h, ring, idx });
  }
  return r;
}
function flatGeo(m, ox, oz, y, uvS){
  if (!m.i.length) return null;
  const n = m.v.length / 2, pos = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let k = 0; k < n; k++){ const x = ox + m.v[k * 2] / 10, z = oz + m.v[k * 2 + 1] / 10; pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = x / uvS; uv[k * 2 + 1] = z / uvS; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  // earcut's winding: make the faces point up
  const idx = Array.from(m.i); for (let k = 0; k < idx.length; k += 3){ const a = idx[k], b = idx[k + 1], c = idx[k + 2]; const ax = pos[a * 3], az = pos[a * 3 + 2]; const cr = (pos[b * 3] - ax) * (pos[c * 3 + 2] - az) - (pos[b * 3 + 2] - az) * (pos[c * 3] - ax); if (cr > 0){ idx[k + 1] = c; idx[k + 2] = b; } }
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
// vertical strips along line segments (kerbs, the sea wall)
function wallGeo(segs, ox, oz, y0, y1){
  const n = segs.length / 4; if (!n) return null;
  const pos = new Float32Array(n * 18), uv = new Float32Array(n * 12);
  for (let k = 0; k < n; k++){
    const ax = ox + segs[k * 4] / 10, az = oz + segs[k * 4 + 1] / 10, bx = ox + segs[k * 4 + 2] / 10, bz = oz + segs[k * 4 + 3] / 10, L = Math.hypot(bx - ax, bz - az);
    const q = [ax, y1, az, bx, y1, bz, bx, y0, bz, ax, y1, az, bx, y0, bz, ax, y0, az]; pos.set(q, k * 18);
    uv.set([0, 1, L, 1, L, 0, 0, 1, L, 0, 0, 0], k * 12);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
function cityBuildings(list, ox, oz, grp){
  // collect: band strips, facade per style, roofs
  const band = { p: [], u: [] }, roof = { p: [], u: [] }, fac = new Map();
  for (const b of list){
    const n = b.ring.length / 2; if (n < 3) continue;
    const pts = []; for (let k = 0; k < n; k++) pts.push([ox + b.ring[k * 2] / 10, oz + b.ring[k * 2 + 1] / 10]);
    let A = 0; for (let k = 0; k < n; k++){ const [x1, z1] = pts[k], [x2, z2] = pts[(k + 1) % n]; A += x1 * z2 - x2 * z1; }
    const sgn = A > 0 ? 1 : -1, top = .15 + b.h, pool = DSTYLE[DKEY_LIST[b.dist]] || [0, 1, 2, 3, 4], st = b.style >= 6 ? (b.style === 6 ? 3 : 4) : pool[b.style % pool.length];
    let F = fac.get(st); if (!F){ F = { p: [], u: [] }; fac.set(st, F); }
    let run = 0;
    for (let k = 0; k < n; k++){
      const [x1, z1] = pts[k], [x2, z2] = pts[(k + 1) % n], L = Math.hypot(x2 - x1, z2 - z1); if (L < .05) continue;
      // outward = right of travel for a positive (counter-clockwise in x,z) ring → order the quad so its face looks out
      const quad = (T, ya, yb, u0, u1, va, vb) => { if (sgn > 0){ T.p.push(x1, ya, z1, x2, yb, z2, x2, ya, z2, x1, ya, z1, x1, yb, z1, x2, yb, z2); T.u.push(u0, va, u1, vb, u1, va, u0, va, u0, vb, u1, vb); } else { T.p.push(x1, ya, z1, x2, ya, z2, x2, yb, z2, x1, ya, z1, x2, yb, z2, x1, yb, z1); T.u.push(u0, va, u1, va, u1, vb, u0, va, u1, vb, u0, vb); } };
      const yb = Math.min(top, .15 + BAND);
      const v0 = 1 - (b.band + 1) / SHOP_N + .002, v1 = 1 - b.band / SHOP_N - .002; quad(band, .15, yb, run / 12, (run + L) / 12, v0, v0 + (v1 - v0) * (yb - .15) / BAND);
      if (top > .15 + BAND) quad(F, .15 + BAND, top, run / 16, (run + L) / 16, 0, (top - .15 - BAND) / 12.8);
      run += L;
    }
    // roof (earcut triangles from the pipeline), facing up
    for (let k = 0; k + 2 < b.idx.length; k += 3){
      let a = pts[b.idx[k]], c = pts[b.idx[k + 1]], d = pts[b.idx[k + 2]]; if (!a || !c || !d) continue;
      const cr = (c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0]); if (cr > 0){ const t = c; c = d; d = t; }
      roof.p.push(a[0], top, a[1], c[0], top, c[1], d[0], top, d[1]); roof.u.push(a[0] / 8, a[1] / 8, c[0] / 8, c[1] / 8, d[0] / 8, d[1] / 8);
    }
  }
  const mk = (T, mat, shadow) => { if (!T.p.length) return; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(T.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(T.u, 2)); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = shadow; m.receiveShadow = !LOW; grp.add(m); };
  mk(band, CMAT.band, !LOW); mk(roof, CMAT.roof, false); for (const [st, F] of fac) mk(F, CMAT.fac[st], !LOW);
}
function cityBuildChunk(key, d){
  const grp = new THREE.Group(); grp.name = 'city ' + key;
  const add = (g, mat, rs = true) => { if (!g) return; const m = new THREE.Mesh(g, mat); m.receiveShadow = rs && !LOW; grp.add(m); };
  add(flatGeo(d.road, d.ox, d.oz, 0, 10), CMAT.road);
  add(flatGeo(d.walk, d.ox, d.oz, .15, 4), CMAT.walk);
  add(flatGeo(d.park, d.ox, d.oz, .16, 6), CMAT.park);
  add(flatGeo(d.plaza, d.ox, d.oz, .155, 4), CMAT.plaza);
  add(flatGeo(d.mark, d.ox, d.oz, .02, 1), CMAT.mark, false);
  add(wallGeo(d.curb, d.ox, d.oz, -.05, .15), CMAT.curb, false);
  add(wallGeo(d.sea, d.ox, d.oz, -2.4, .15), CMAT.seawall, false);
  add(wallGeo(d.sea, d.ox, d.oz, .15, .8), CMAT.parapet, false);   // the corniche's low stone wall people sit on
  cityBuildings(d.b, d.ox, d.oz, grp);
  grp.matrixAutoUpdate = false; grp.updateMatrixWorld(true);
  scene.add(grp); return grp;
}
function cityDrop(c){ if (!c.grp) return; scene.remove(c.grp); c.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); }); c.grp = null; }
const CITY_CH = CITY ? new Map(CITY.chunks.map(([i, k, sz]) => [i + '_' + k, { i, k }])) : new Map();
// keep the chunks near the camera built; build at most one per frame (no hitches), drop far ones
function updateCity(px, pz){
  if (!CITY) return;
  const C = CITY.chunk, R = (LOW ? 230 : GFX === 'mid' ? 300 : 360), R2 = R + 140;
  const now = performance.now(), moved = Math.hypot(px - (CCH.px ?? 1e9), pz - (CCH.pz ?? 1e9));
  if (now - (CCH.scanT || 0) > 250 || moved > 40){ CCH.scanT = now; CCH.px = px; CCH.pz = pz;   // which chunks to keep: 4 times a second
  for (const [key, c] of CITY_CH){
    const cx = CITY.x0 + c.i * C + C / 2, cz = CITY.z0 + c.k * C + C / 2, d = Math.hypot(cx - px, cz - pz);
    if (d < R && !c.grp && !c.busy && !c.bad){ c.busy = true; c.d = d; CCH.queue.push([key, c]); }
    else if (d > R2 && c.grp){ cityDrop(c); }
  } }
  // load the nearest first, two at a time
  if (CCH.loading < 2 && CCH.queue.length){
    for (const q of CCH.queue){ const c = q[1]; c.d = Math.hypot(CITY.x0 + c.i * C + C / 2 - px, CITY.z0 + c.k * C + C / 2 - pz); }
    CCH.queue.sort((a, b) => a[1].d - b[1].d);
    const [key, c] = CCH.queue.shift(); CCH.loading++;
    c.key = key; fetch(`assets/city/c/${key}.bin`).then(r => r.arrayBuffer()).then(r => r).then(buf => { c.data = cityParse(buf); }).catch(() => { c.data = null; c.bad = true; }).finally(() => { CCH.loading--; CCH.done.push(c); });
  }
  for (const c of CCH.done.splice(0, 1)){ const key = c.key; c.busy = false; c.ready = false; if (c.data){ const cx = CITY.x0 + c.i * C + C / 2, cz = CITY.z0 + c.k * C + C / 2; if (Math.hypot(cx - px, cz - pz) < R2) c.grp = cityBuildChunk(key, c.data); } c.data = null; break; }
}
// the districts: nearest centre (the old «حتة» keeps its own names)
// a real place (lat, lon) in the game: x to the real west, z to the real north, half size
const cityLL = (lat, lon) => CITY ? [-(lon - CITY.anchor[1]) * CITY.kx * CITY.S, (lat - CITY.anchor[0]) * CITY.ky * CITY.S] : [0, 0];
function cityDistrict(x, z){ if (!CITY) return null; let best = null, bd = 1e18; for (const d of CITY.districts){ const q = (d.x - x) ** 2 + (d.z - z) ** 2; if (q < bd){ bd = q; best = d; } } return best; }

// ---------- the old map's places in the real city ----------
// A position written for the old map (x -96..288, z -96..154, the fort out at z ~266) → where that place is now:
// the moved blocks (CITY.remote) keep their insides and the streets round them; the old corniche east of the «حتة» →
// the real corniche at محطة الرمل; the old bridge and fort → the way along Anfoushi bay to the real Qaitbay; the open sea
// east of the old port → Anfoushi bay. Everything inside the «حتة», the interiors far away and real-city positions stay put.
const CLM = CITY ? Object.fromEntries((CITY.landmarks || []).map(l => [l.k, l])) : {};
const QAIT_GATE = CITY && CLM.qaitbay ? [CLM.qaitbay.x + 16.4, CLM.qaitbay.z - 43.4] : [0, 0];   // on the causeway road, at the main gate (south side)
// the way from the «حتة» corniche to Qaitbay along the real streets (worked out once from the road graph)
const QAIT_WAY = [[-96, 144], [-103, 144], [-125, 108.8], [-135.7, 115.2], [-157.3, 131], [-173.5, 146.9], [-181.7, 156.4], [-196.3, 179], [-203.1, 191.9], [-208.2, 203.9], [-212.7, 217.6], [-219.1, 240.9], [-223.1, 259.1], [-227.4, 284.9], [-231.3, 315.4], [-231.6, 351.9], [-228.5, 374.1], [-226, 388.8], [-228.2, 395.4], [-234.7, 399.4], [-240.6, 401.8], [-258.9, 407.2], [-265.7, 407.9], [-283, 408.1], [-321.3, 443.1], [-328.5, 445.8], [-371.1, 441.6], [-381.4, 481.2], [-384.9, 487], [-390.4, 493.8], [-414.4, 522.5], [-420.8, 529.2], [-428.9, 534.7], [-480.1, 559.6], [-509.9, 573.1]];
function alongWay(t){ const W = QAIT_WAY, cum = [0]; for (let i = 1; i < W.length; i++) cum.push(cum[i - 1] + Math.hypot(W[i][0] - W[i - 1][0], W[i][1] - W[i - 1][1])); const s = clamp(t, 0, 1) * cum[cum.length - 1]; let i = 1; while (i < W.length - 1 && cum[i] < s) i++; const f = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return [W[i - 1][0] + (W[i][0] - W[i - 1][0]) * f, W[i - 1][1] + (W[i][1] - W[i - 1][1]) * f]; }
function RELOC(x, z){
  if (!CITY) return [x, z];
  if (x < -110 || x > 310 || z < -110 || z > 430) return [x, z];      // not an old-map position
  if (x > 86 && x < 106 && z > 157 && z < 252) return alongWay((z - 156) / 96);   // the old bridge → the real streets to Qaitbay
  if (x <= 102 && z <= 236) return [x, z];                            // the «حتة», its pier and its bit of the bay
  for (const r of CITY.remote || []){
    const x0 = -96 + r.j0 * 48 - 6.5, x1 = -96 + (r.j1 + 1) * 48 + 6.5, z0 = -96 + r.k0 * 48 - 6.5, z1 = -96 + (r.k1 + 1) * 48 + 6.5;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return [x + r.dx, z + r.dz];
  }
  if (z <= 156){   // the old corniche east of the «حتة»: the real corniche at Raml
    const a = CITY.anchors.corniche; return [a[0] + (x - 190) * .3, a[1] + (z - 150) * .5];
  }
  if (x > 40 && x < 152 && z >= 252){ const q = CLM.qaitbay; return [q.x + (x - 96) * .55, q.z - 30 + (z - 266) * .7]; }   // the old fort → inside the real Qaitbay
  return [x - 326, z];   // the open sea east of the old port → Anfoushi bay
}
// Shams's launch on نوّة night: from the «حتة» pier out round the open sea north-west of Anfoushi (all water)
const LAUNCH_PATH = [[-64, 196], [-50, 250], [-20, 320], [30, 390], [70, 450], [40, 520], [-30, 580], [-110, 630], [-220, 670], [-330, 690]];
const RLV = (x, y, z) => { const [a, b] = RELOC(x, z); return new THREE.Vector3(a, y, b); };
const relocV = v => { if (v){ const [a, b] = RELOC(v.x, v.z); v.x = a; v.z = b; } return v; };
