// ================= what's round each landmark, as in Alexandria =================
// Squares with palms, benches and lamps; the street sellers; the hantours and the fishermen by Qaitbay and the boats off it;
// the trams at Raml; the taxi rank at Misr and Sidi Gaber stations; the beach cabins by Stanley bridge; pigeons in front of
// el-Mursi. Built when you come near (one merged mesh per landmark), on open ground only (not on a road, not in a building).
const AROUND = {
  qaitbay: { r: [70, 150], cat: 6, palm: 22, bench: 12, lamp: 14, cart: 2, corn: 3, termis: 2, candy: 2, hantour: 3, fisher: 8, boat: 9, people: 1 },
  mursi: { r: [26, 70], cat: 6, palm: 18, bench: 12, lamp: 10, cart: 4, pigeon: 40, stall: 5, people: 1 },
  soldier: { r: [20, 70], palm: 16, bench: 10, lamp: 10, cart: 1, corn: 2, termis: 1, flower: 6, people: 1 },
  saad: { r: [8, 45], cat: 3, hantour: 2, palm: 14, bench: 12, lamp: 8, flower: 8, cart: 1, corn: 2, candy: 1, news: 1, balloon: 2, people: 1 },
  cecil: { r: [18, 50], lamp: 8, cart: 2, stall: 2, news: 1, corn: 1 },
  ramlst: { r: [16, 60], cat: 4, lamp: 10, stall: 5, cart: 2, news: 2, termis: 1, people: 1 },
  library: { r: [60, 120], palm: 20, bench: 14, lamp: 14, corn: 2, candy: 1, people: 1 },
  pompey: { r: [36, 80], cat: 4, palm: 12, bench: 6, kiosk: 1, cart: 2, people: 1 },
  theatre: { r: [26, 60], palm: 10, bench: 6, kiosk: 1, people: 1 },
  misrst: { r: [30, 80], cat: 3, palm: 10, lamp: 10, taxi: 6, stall: 5, cart: 3, news: 1, micro: 6, people: 1 },
  sidigaberst: { r: [70, 120], palm: 10, lamp: 12, taxi: 5, stall: 3, news: 1, micro: 5, people: 1 },
  raseltin: { r: [60, 130], palm: 26, lamp: 12, flag: 4 },
  stadium: { r: [55, 110], lamp: 10, stall: 6, cart: 3, flag: 6, people: 1 },
  stanley: { r: [70, 140], cabin: 40, lamp: 10, bench: 8, corn: 3, candy: 1 },
};
const AR_GEO = (() => {
  const G = {}, m = list => mergeGeometries(list.map(q => q.index ? q.toNonIndexed() : q));
  { const p = []; for (let i = 0; i < 6; i++){ const g = new THREE.CylinderGeometry(.16 - i * .012, .2 - i * .012, 1.4, 6); g.translate(Math.sin(i * .35) * .04 * i, .7 + i * 1.35, 0); p.push(colored(g, i % 2 ? '#7a5a3a' : '#6b4e33')); }
    for (let f = 0; f < 8; f++){ const g = new THREE.SphereGeometry(1, 6, 3); g.scale(.28, .06, 1.9); g.translate(0, 0, 1.6); g.rotateX(.55); g.rotateY(f / 8 * Math.PI * 2); g.translate(.1, 8.4, 0); p.push(colored(g, f % 2 ? '#3f7a2e' : '#4f8f36')); } G.palm = m(p); }
  { const p = []; box(p, 1.8, .08, .5, 0, .48, 0, '#7a4f2c'); box(p, 1.8, .45, .06, 0, .75, -.24, '#7a4f2c'); for (const x of [-.8, .8]) box(p, .08, .48, .45, x, .24, 0, '#333'); G.bench = m(p); }
  { const p = []; cyl(p, .07, .1, 5.2, 0, 2.6, 0, '#2f3336'); box(p, .9, .08, .08, .4, 5.1, 0, '#2f3336'); box(p, .35, .25, .3, .8, 4.95, 0, '#f2e6c4'); G.lamp = m(p); }
  { const p = []; box(p, 1.6, .9, 1, 0, .75, 0, '#c0392b'); box(p, 1.7, .08, 1.1, 0, 1.22, 0, '#e8e4da'); cyl(p, .3, .3, .1, -.85, .3, .55, '#222', Math.PI / 2); cyl(p, .3, .3, .1, -.85, .3, -.55, '#222', Math.PI / 2); cyl(p, .03, .03, 1.4, .7, 1.9, 0, '#444'); { const c = new THREE.ConeGeometry(1, .5, 8); c.translate(.7, 2.7, 0); p.push(colored(c, '#e0a21a')); } G.cart = m(p); }
  { const p = []; box(p, 2.6, 1.9, 1.6, 0, 1.1, 0, '#2a6f9e'); box(p, 2.8, .1, 1.8, 0, 2.1, 0, '#e8e4da'); box(p, 2.4, .9, .06, 0, 1.4, .82, '#f3e3b8'); for (let i = 0; i < 10; i++) box(p, .16, .22, .1, -1 + i * .22, 1.95, .86, ['#c0392b', '#e0a21a', '#2e7d32', '#1f5fa8'][i % 4]); G.stall = m(p); }
  { const p = []; box(p, 2.2, 2.5, 2.2, 0, 1.25, 0, '#c9b48a'); box(p, 2.6, .15, 2.6, 0, 2.58, 0, '#7a5a3a'); box(p, .9, .7, .05, 0, 1.4, 1.11, '#1d2a33'); G.kiosk = m(p); }
  { const p = []; box(p, 2.2, .7, 1.4, 0, 1.0, 0, '#1a1a1a'); box(p, 1.8, .9, .06, -.2, 1.75, .7, '#1a1a1a'); box(p, 1.8, .06, 1.4, -.2, 2.2, 0, '#1a1a1a'); for (const s of [-1, 1]) cyl(p, .55, .55, .06, -.4, .55, s * .74, '#c9a227', Math.PI / 2);
    box(p, 1.9, .9, .55, 2.3, 1.35, 0, '#6d4c41'); box(p, .5, .7, .35, 3.4, 1.75, 0, '#6d4c41'); for (const [x, z] of [[1.6, .2], [1.6, -.2], [3, .2], [3, -.2]]) box(p, .14, .9, .14, x, .45, z, '#5d4037'); box(p, 1.6, .06, .06, 1.1, 1.1, .5, '#3e2a1a'); box(p, 1.6, .06, .06, 1.1, 1.1, -.5, '#3e2a1a'); G.hantour = m(p); }
  { const p = []; cyl(p, .22, .26, .85, 0, .43, 0, '#2d3e50'); cyl(p, .24, .22, .75, 0, 1.25, 0, '#8a5a3a'); { const h = new THREE.SphereGeometry(.15, 8, 6); h.translate(0, 1.8, 0); p.push(colored(h, '#8d5a3a')); } { const r = new THREE.CylinderGeometry(.012, .02, 4, 4); r.rotateX(-1.0); r.translate(0, 2.4, 1.6); p.push(colored(r, '#3a2a1a')); } G.fisher = m(p); }
  // the Eastern Harbour's fishing boats, each painted its own way (blue, green, red, yellow hulls with a white or coloured band)
  [['#1f5fa8', '#f1ead8'], ['#2e7d32', '#f2d35a'], ['#b71c1c', '#f1ead8'], ['#e0a21a', '#1f5fa8'], ['#f1ead8', '#1f5fa8'], ['#0d6e75', '#c62828']].forEach(([hull, band], i) => {
    const p = []; box(p, 2.2, .7, 6.4, 0, .15, 0, hull); box(p, 2.26, .18, 6.5, 0, .55, 0, band); box(p, 1.3, 1.1, 1.4, 0, 1.05, -1.6, '#f4f0e6'); box(p, .1, 4.2, .1, 0, 2.6, .8, '#5a3a1e'); G['boat' + (i || '')] = m(p); });
  { const p = []; box(p, .09, .07, .18, 0, .08, 0, '#8a8f96'); box(p, .06, .06, .06, 0, .14, .09, '#5f646b'); G.pigeon = m(p); }
  { const p = []; cyl(p, 1.3, 1.4, .35, 0, .18, 0, '#c9c1b0', 0, 14); { const g = new THREE.SphereGeometry(1.15, 10, 5, 0, 6.3, 0, 1.3); g.translate(0, .3, 0); p.push(colored(g, '#4f8f36')); } for (let i = 0; i < 9; i++){ const f = new THREE.SphereGeometry(.12, 5, 4); f.translate(Math.sin(i) * .8, .9, Math.cos(i) * .8); p.push(colored(f, ['#e74c3c', '#f1c40f', '#e84393'][i % 3])); } G.flower = m(p); }
  { const p = []; cyl(p, .05, .06, 9, 0, 4.5, 0, '#cfcfcf'); box(p, .04, .4, 1.8, 0, 8.6, .92, '#c62828'); box(p, .04, .4, 1.8, 0, 8.2, .92, '#f2f2f2'); box(p, .04, .4, 1.8, 0, 7.8, .92, '#1a1a1a'); G.flag = m(p); }
  { const p = []; cyl(p, .02, .02, 2.2, 0, 1.1, 0, '#888'); for (let i = 0; i < 7; i++){ const b = new THREE.SphereGeometry(.28, 8, 6); b.scale(1, 1.2, 1); b.translate(Math.sin(i * 1.3) * .35, 2.5 + (i % 3) * .3, Math.cos(i * 1.3) * .35); p.push(colored(b, ['#e74c3c', '#f1c40f', '#3498db', '#e84393', '#2ecc71'][i % 5])); } box(p, .5, 1.6, .3, .45, .8, 0, '#4a5a6a'); G.balloon = m(p); }
  { const p = []; box(p, 2.4, 2.4, 2.4, 0, 1.2, 0, '#f1ead8'); box(p, 2.6, .2, 2.6, 0, 2.5, 0, '#1f5fa8'); box(p, .9, 1.8, .05, 0, .95, 1.21, '#1f5fa8'); G.cabin = m(p); }
  // the corn seller's grill: a little cart with a charcoal tray, the cobs on it, a straw fan
  { const p = []; box(p, 1.3, .7, .7, 0, .55, 0, '#5d4037'); box(p, 1.1, .12, .55, 0, .96, 0, '#2b2b2b'); box(p, 1.0, .04, .45, 0, 1.03, 0, '#d84315');
    for (let i = 0; i < 7; i++){ const c = new THREE.CylinderGeometry(.045, .045, .38, 6); c.rotateX(Math.PI / 2); c.translate(-.42 + i * .14, 1.09, 0); p.push(colored(c, i % 3 ? '#e2b33a' : '#b8862a')); }
    for (const s of [-1, 1]) cyl(p, .2, .2, .06, s * .5, .2, .38, '#222', Math.PI / 2); box(p, .25, .02, .3, .75, 1.1, .2, '#c9a86a'); G.corn = m(p); }
  // the termis cart: a wooden cart, a big brass pot, paper cones
  { const p = []; box(p, 1.6, .55, .9, 0, .75, 0, '#2e7d32'); box(p, 1.7, .06, 1.0, 0, 1.05, 0, '#e8e4da'); cyl(p, .32, .28, .5, -.3, 1.33, 0, '#c9a227', 0, 12); cyl(p, .34, .34, .04, -.3, 1.6, 0, '#a8861e', 0, 12);
    for (let i = 0; i < 5; i++){ const c = new THREE.ConeGeometry(.06, .2, 6); c.rotateX(Math.PI); c.translate(.35 + (i % 3) * .14, 1.2, -.15 + (i >> 1) * .16); p.push(colored(c, '#f1ead8')); }
    for (const s of [-1, 1]) cyl(p, .32, .32, .06, -.5, .32, s * .5, '#3a2a1a', Math.PI / 2); cyl(p, .03, .03, 1.2, .7, .9, 0, '#5d4037', 0, 4); G.termis = m(p); }
  // cotton candy: the seller's pole with the pink bags
  { const p = []; cyl(p, .025, .025, 2.4, 0, 1.2, 0, '#9e9e9e', 0, 5); for (let i = 0; i < 9; i++){ const b = new THREE.SphereGeometry(.17, 7, 5); b.scale(1, 1.4, 1); b.translate(Math.sin(i * 1.7) * .22, 2.0 + (i % 3) * .28, Math.cos(i * 1.7) * .22); p.push(colored(b, i % 3 ? '#f48fb1' : '#f8bbd0')); } G.candy = m(p); }
  // the newspaper kiosk: green, papers hung along its front, magazines on the counter
  { const p = []; box(p, 2.0, 2.3, 1.6, 0, 1.15, 0, '#2e6b3a'); box(p, 2.4, .12, 2.0, 0, 2.36, 0, '#1f4a28'); box(p, 2.0, .1, .5, 0, 1.0, 1.0, '#e8e4da');
    for (let i = 0; i < 9; i++) box(p, .2, .28, .02, -.85 + i * .21, 1.75, .82, ['#f2f2f2', '#e8e0c8', '#c62828', '#1f5fa8'][i % 4]);
    for (let i = 0; i < 6; i++) box(p, .26, .02, .34, -.7 + i * .28, 1.06, 1.02, ['#e0a21a', '#c2185b', '#f2f2f2', '#2e7d32'][i % 4]); G.news = m(p); }
  // the white and blue microbus waiting at the rank (a static one; the one you can drive is the job's)
  { const p = []; box(p, 2.0, 1.85, 4.8, 0, 1.3, 0, '#f4f4f0'); box(p, 2.02, .32, 4.82, 0, .85, 0, '#1e5aa8'); box(p, 2.04, .65, 3.6, 0, 1.75, -.4, '#22313a'); box(p, 1.85, .65, .06, 0, 1.75, 2.41, '#22313a');
    for (const x of [-.95, .95]) for (const z of [-1.6, 1.6]){ const w = new THREE.CylinderGeometry(.36, .36, .24, 10); w.rotateZ(Math.PI / 2); w.translate(x, .36, z); p.push(colored(w, '#141414')); } G.micro = m(p); }
  // the fresca seller on the beach: a man with his glass box of fresca on a strap
  { const p = []; cyl(p, .17, .2, .8, 0, .4, 0, '#2d3e50'); cyl(p, .21, .18, .7, 0, 1.15, 0, '#f2f2f2'); { const h = new THREE.SphereGeometry(.13, 8, 6); h.translate(0, 1.66, 0); p.push(colored(h, '#8d5a3a')); }
    box(p, .45, .3, .25, 0, 1.0, .3, '#cfd8dc'); box(p, .4, .08, .2, 0, 1.1, .3, '#e0a21a'); G.fresca = m(p); }
  return G;
})();
const arMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .75 });
const AR_SOLID = { palm: .3, bench: .5, lamp: .15, cart: .9, corn: .7, termis: .9, candy: .2, news: 1.1, micro: 1.4, fresca: .3, stall: 1.4, kiosk: 1.2, hantour: 1.2, flower: 1.3, flag: .1, balloon: .3, cabin: 1.3 };
const LM_MODEL = CITY ? Object.fromEntries(CITY.landmarks.filter(l => l.model).map(l => [l.k, l.model])) : {};
function arOpen(x, z, pad){ const v = cityR(x, z); return v >= 2 && v < 10 && !staticBlocked(x, z, pad) && !inPatch(x, z); }
function buildAround(L){
  const spec = AROUND[L.k]; if (!spec) return null;
  const c = L.root.position, [r0, r1] = spec.r, R0 = Math.max(r0 * .7, L.r * .55), R1 = Math.max(r1 * .75, R0 + 30), B = L.box.clone().expandByScalar(2);
  const parts = [], used = [], grp = new THREE.Group(), obs = [], inModel = (x, z) => x > B.min.x && x < B.max.x && z > B.min.z && z < B.max.z && L.k !== 'stanley';
  const sfl = {}, SWAP = { palm: () => Math.random() < .5 ? 'palm-trees:palm_a' : 'palm-trees:palm_b', lamp: () => 'street-lamp', stall: () => 'vendor-stall', cart: () => 'foul-cart', cat: () => 'cat', boat: () => Math.random() < .5 ? 'fishing-boat' : null };
  const put = (kind, x, z, ry) => { const sw = SWAP[kind.startsWith('boat') ? 'boat' : kind], sn = sw && sw();
    if (sn && SFM[sn]){ (sfl[sn] = sfl[sn] || []).push([x, kind.startsWith('boat') ? -.25 : .15, z, ry + (kind === 'lamp' ? 0 : Math.PI)]); used.push([x, z]); const sd = AR_SOLID[kind]; if (sd) obs.push({ minX: x - sd, maxX: x + sd, minZ: z - sd, maxZ: z + sd, around: L.k }); return; }
    if (!AR_GEO[kind]) return; const g = AR_GEO[kind].clone(); g.rotateY(ry); g.translate(x, kind.startsWith('boat') ? -1 : .15, z); parts.push(g); used.push([x, z]);
    const sd = AR_SOLID[kind]; if (sd) obs.push({ minX: x - sd, maxX: x + sd, minZ: z - sd, maxZ: z + sd, h: kind === 'bench' || kind === 'flower' ? .6 : undefined, around: L.k }); };
  const free = (x, z, d) => used.every(([a, b]) => Math.hypot(a - x, b - z) > d);
  const face = (x, z) => Math.atan2(c.x - x, c.z - z);
  // the shore: where the open ground round it meets the sea
  const shore = []; for (let a = 0; a < 6.28; a += .05) for (let r = R0; r < R1; r += 3){ const x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r; if (!inModel(x, z) && arOpen(x, z, .5) && cityR(x + Math.sin(a) * 3, z + Math.cos(a) * 3) === 0){ shore.push([x, z, a]); break; } }
  const ground = (n, kind, gap, faceIn = true, cond) => { let k = 0; for (let t = 0; t < n * 30 && k < n; t++){ const a = Math.random() * 6.28, r = R0 + Math.random() * (R1 - R0), x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r;
      if (inModel(x, z) || !arOpen(x, z, 1) || !free(x, z, gap) || (cond && !cond(x, z))) continue; put(kind, x, z, faceIn ? face(x, z) : Math.random() * 6.28); k++; } };
  // palms mostly along the roads (they line Alexandria's squares and the corniche)
  ground(spec.palm || 0, 'palm', 6, false, (x, z) => [3, 5].some(d => cityR(x + d, z) === 1 || cityR(x - d, z) === 1 || cityR(x, z + d) === 1 || cityR(x, z - d) === 1) || Math.random() < .3);
  ground(spec.bench || 0, 'bench', 4); ground(spec.lamp || 0, 'lamp', 9, false); ground(spec.flower || 0, 'flower', 6); ground(spec.flag || 0, 'flag', 8, false);
  ground(spec.cat || 0, 'cat', 3, false); ground(spec.cart || 0, 'cart', 6); ground(spec.corn || 0, 'corn', 6); ground(spec.termis || 0, 'termis', 6); ground(spec.candy || 0, 'candy', 7, false); ground(spec.news || 0, 'news', 10);
  // the microbus rank: in a row on the open ground beside the road, all facing the same way
  if (spec.micro){ let k = 0; for (let t = 0; t < 200 && k < spec.micro; t++){ const a = Math.random() * 6.28, r = R0 + Math.random() * (R1 - R0), x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r;
      if (inModel(x, z) || !arOpen(x, z, 2.6) || !free(x, z, 6) || ![4, 7].some(d => cityR(x + d, z) === 1 || cityR(x - d, z) === 1 || cityR(x, z + d) === 1 || cityR(x, z - d) === 1)) continue;
      const ry = cityR(x + 5, z) === 1 || cityR(x - 5, z) === 1 ? 0 : Math.PI / 2; put('micro', x, z, ry); for (const s of [-1.6, 1.6]){ const ox = x + Math.sin(ry) * s, oz = z + Math.cos(ry) * s; obs.push({ minX: ox - 1.1, maxX: ox + 1.1, minZ: oz - 1.1, maxZ: oz + 1.1, around: L.k }); }
      for (let j = 1; j < 3 && k + j < spec.micro; j++){ const nx = x + Math.sin(ry) * 5.6 * j, nz = z + Math.cos(ry) * 5.6 * j; if (arOpen(nx, nz, 2.6) && free(nx, nz, 4.5)){ put('micro', nx, nz, ry); k++; } } k++; } } ground(spec.stall || 0, 'stall', 5); ground(spec.kiosk || 0, 'kiosk', 8); ground(spec.balloon || 0, 'balloon', 8);
  if (spec.cabin){ for (const [x, z, a] of shore.filter((_, i) => i % 2 === 0).slice(0, spec.cabin)){ const bx = x - Math.sin(a) * 2, bz = z - Math.cos(a) * 2; if (free(bx, bz, 2.8) && arOpen(bx, bz, 1.3)) put('cabin', bx, bz, a + Math.PI); } }
  if (spec.fisher) for (const [x, z, a] of shore.filter((_, i) => i % 5 === 0).slice(0, spec.fisher)) if (free(x, z, 3)) put('fisher', x, z, a);
  if (spec.hantour) for (const [x, z, a] of shore.filter((_, i) => i % 7 === 3).slice(0, spec.hantour)){ const ax = x - Math.sin(a) * 6, az = z - Math.cos(a) * 6; if (arOpen(ax, az, 1.2) && free(ax, az, 5)) put('hantour', ax, az, a + Math.PI / 2); }
  if (spec.boat) for (let i = 0, k = 0; i < 120 && k < spec.boat; i++){ const a = Math.random() * 6.28, r = R0 * .6 + Math.random() * R1, x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r; if (cityR(x, z) === 0 && cityR(x + 4, z) === 0 && cityR(x - 4, z) === 0 && cityR(x, z + 4) === 0 && cityR(x, z - 4) === 0 && free(x, z, 8)){ put('boat' + (Math.random() * 6 | 0 || ''), x, z, Math.random() * 6.28); k++; } }
  if (spec.pigeon) for (let i = 0; i < spec.pigeon; i++){ const a = Math.random() * 6.28, r = R0 + Math.random() * 14, x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r; if (!inModel(x, z) && arOpen(x, z, .1)){ const g = AR_GEO.pigeon.clone(); g.rotateY(Math.random() * 6.28); g.translate(x, .15, z); parts.push(g); } }
  for (const [nm, list] of Object.entries(sfl)){ const g = sfInst(nm, list); if (g) grp.add(g); }
  if (parts.length){ const mesh = new THREE.Mesh(mergeGeometries(parts), arMat); mesh.castShadow = !LOW; mesh.receiveShadow = true; grp.add(mesh); }
  // taxis waiting at the stations (real cars you can take)
  if (spec.taxi){ let k = 0; for (let i = 0; i < 60 && k < spec.taxi; i++){ const q = graphNearest(c.x + (Math.random() - .5) * R1 * 1.4, c.z + (Math.random() - .5) * R1 * 1.4, 30); if (!q || q.e.w < 7) continue; const o = edgeAt(q.e, q.s), side = Math.max(laneOff(q.e) + 1.6, q.e.w / 2 - 1.1), x = q.x - o.fz * side, z = q.z + o.fx * side; if (vehBlockedAt(x, z, 3) || staticBlocked(x, z, 1)) continue; const v = addVehicle('taxi', x, z, Math.atan2(o.fx, o.fz), '#f2f2f2'); v.home.y = 0; k++; } }
  // the yellow trams standing at Raml
  if (spec.tram && LM.tramGLB){ const sx = L.box.max.x - L.box.min.x, sz = L.box.max.z - L.box.min.z, alongX = sx > sz, fx = alongX ? 1 : 0, fz = alongX ? 0 : 1;
    for (let i = 0; i < spec.tram; i++){ const sd = i ? 1 : -1, x = c.x + fz * 2.2 * sd, z = c.z + fx * 2.2 * sd, t = LM.tramGLB.clone(true); t.scale.setScalar(.85); t.position.set(x, .17, z); t.rotation.y = Math.atan2(fx, fz); grp.add(t);
      for (let k = -3; k <= 3; k++) obs.push({ minX: x + fx * k * 2 - 1.2, maxX: x + fx * k * 2 + 1.2, minZ: z + fz * k * 2 - 1.2, maxZ: z + fz * k * 2 + 1.2, around: L.k }); } }
  for (const o of obs) obstacles.push(o); OG.n = -1; scene.add(grp); return grp;
}
// built when you come within 380 m
// one landmark at a time, after the ground round it has loaded
const ARQ = { busy: false };
function updateAround(f){ if (ARQ.busy) return; for (const L of LM.list){ if (L.around || !AROUND[L.k]) continue; if (Math.hypot(L.root.position.x - f.x, L.root.position.z - f.z) < 380){ ARQ.busy = true; L.around = 'loading'; cityPreload(L.root.position.x, L.root.position.z, L.r + 160).then(() => { if (L.k === 'ramlst' && !LM.tramGLB){ L.around = null; ARQ.busy = false; return; } L.around = buildAround(L) || true; ARQ.busy = false; }); return; } } }

// ---------- the real shops of Alexandria (OpenStreetMap) you can walk into ----------
// Each shop of the city has a door on the pavement in front of it; going in opens the shop interior of its kind
// (pharmacy, barber, juice, phones, grocery, food, bakery, café); clothes and gold shops open the clothes shop.
const CSHOP_KIND = { pharmacy: 'pharmacy', barber: 'barber', juice: 'juice', phones: 'phones', market: 'market', butcher: 'market', fish: 'market', books: 'market', food: 'koshari', bakery: 'bakery', sweets: 'bakery', cafe: 'cafe', clothes: 'clothes', gold: 'clothes' };
const CSHOP_NAME = { pharmacy: 'صيدلية', barber: 'حلاق', juice: 'عصير', phones: 'موبايلات', market: 'بقالة', butcher: 'جزارة', fish: 'أسماك', books: 'مكتبة', food: 'مطعم', bakery: 'مخبز', sweets: 'حلواني', cafe: 'قهوة', clothes: 'هدوم', gold: 'جواهرجي' };
const CSHOPS = (CITY && CITY.shops || []).map(([k, x, z, name]) => ({ k, x, z, name: name && /[\u0600-\u06FF]/.test(name) ? name : CSHOP_NAME[k] || 'محل', door: null }));
const CSHOP_GRID = new Map(); CSHOPS.forEach(s => { const key = Math.floor(s.x / 64) * 1000 + Math.floor(s.z / 64); let l = CSHOP_GRID.get(key); if (!l) CSHOP_GRID.set(key, l = []); l.push(s); });
// the door: the nearest pavement in front of the shop's building
function cshopDoor(s){
  if (s.door !== null) return s.door;
  if (!cityReady(s.x, s.z, 10)) return false;   // its ground isn't loaded yet: ask again later
  let best = false, bd = 9;
  for (let a = 0; a < 6.28; a += .26) for (let r = 0; r < 9; r += .8){ const x = s.x + Math.sin(a) * r, z = s.z + Math.cos(a) * r, v = cityR(x, z); if (v === 2 || v === 4){ if (r < bd && cityR(x + Math.sin(a) * 2.5, z + Math.cos(a) * 2.5) !== undefined){ bd = r; best = { x, z, yaw: Math.atan2(Math.sin(a), Math.cos(a)) }; } break; } }
  return s.door = best;
}
function cshopNear(p){
  if (!CITY || inPatch(p.x, p.z)) return null;
  const gx = Math.floor(p.x / 64), gz = Math.floor(p.z / 64); let best = null, bd = 2.3;
  for (let i = gx - 1; i <= gx + 1; i++) for (let k = gz - 1; k <= gz + 1; k++) for (const s of CSHOP_GRID.get(i * 1000 + k) || []){ if (Math.hypot(s.x - p.x, s.z - p.z) > 14) continue; const d = cshopDoor(s); if (!d) continue; const dd = Math.hypot(d.x - p.x, d.z - p.z); if (dd < bd){ bd = dd; best = s; } }
  return best;
}
const CSHOP_PROXY = {};
function enterCityShop(s){
  const kind = CSHOP_KIND[s.k] || 'market';
  if (kind === 'clothes'){ openShop(); return; }
  const base = SHOPS.find(b => b.id === kind); if (!base) return;
  const px = CSHOP_PROXY[kind] ||= Object.create(base);
  px.name = s.name; px.out = new THREE.Vector3(s.door.x, .15, s.door.z); px.outYaw = s.door.yaw;
  enterShop(px);
}
