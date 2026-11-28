// ================= stage 18: palms and trees across the city =================
// Palms along the corniche (طريق الجيش) on the sea side; ficus / shade trees along the big avenues and the side streets of the
// leafier districts (Raml, Smouha, Sidi Gaber, Shatby…). Near you the real models (Sketchfab palms; the ficus when it's there),
// further away a light stand-in, so a whole avenue of trees costs little.
const TREES = {
  far: {
    palm: (() => { const p = []; for (let i = 0; i < 4; i++){ const g = new THREE.CylinderGeometry(.16 - i * .02, .2 - i * .02, 2.2, 5); g.translate(0, 1.1 + i * 2.2, 0); p.push(colored(g, '#6b5038')); }
      for (let f = 0; f < 6; f++){ const g = new THREE.ConeGeometry(.5, 3.6, 3); g.rotateX(Math.PI / 2 + .55); g.translate(0, .2, 1.7); g.rotateY(f / 6 * Math.PI * 2); g.translate(0, 8.6, 0); p.push(colored(g, f % 2 ? '#4d7a37' : '#5a8a3f')); }
      return mergeGeometries(p.map(q => q.index ? q.toNonIndexed() : q)); })(),
    tree: (() => { const p = []; { const g = new THREE.CylinderGeometry(.18, .28, 3.2, 6); g.translate(0, 1.6, 0); p.push(colored(g, '#5b4636')); }
      for (const [x, y, z, s] of [[0, 5.0, 0, 3.0], [1.7, 4.4, .7, 2.2], [-1.6, 4.6, -.6, 2.3], [.3, 6.2, -.9, 2.0]]){ const g = new THREE.IcosahedronGeometry(s, 0); g.scale(1, .78, 1); g.translate(x, y, z); p.push(colored(g, ['#3f6b2f', '#4a7a35', '#365f2a', '#557f3a'][(x * 3 + 4 | 0) & 3])); }
      return mergeGeometries(p.map(q => q.index ? q.toNonIndexed() : q)); })(),
  },
  mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 }),
  LEAFY: new Set(['raml', 'smouha', 'sidigaber', 'shatby', 'corniche', 'moharram']),
  groups: [], obs: new Set(),
};
// which model near you: the ficus from the stage-18 batch if it arrived, else the palms
const treeNear = kind => kind === 'palm' ? (Math.random() < .5 ? 'palm-trees:palm_a' : 'palm-trees:palm_b') : (SFM['ficus'] ? 'ficus' : SFM['street-tree'] ? 'street-tree' : null);
function cityTrees(grp, ox, oz){
  if (!RG.E.length) return;
  const C = CITY.chunk, palms = [], trees = [], seen = new Set();
  for (let i = Math.floor(ox / RG.cell) - 1; i <= Math.floor((ox + C) / RG.cell) + 1; i++) for (let k = Math.floor(oz / RG.cell) - 1; k <= Math.floor((oz + C) / RG.cell) + 1; k++){
    const l = RG.grid.get(i * 100000 + k); if (!l) continue;
    for (const ei of l){ if (seen.has(ei)) continue; seen.add(ei); const e = RG.E[ei]; if (e.cls === 'service') continue;
      const corniche = /الجيش|كورنيش/.test(e.name || ''), mid = edgeAt(e, e.L / 2), dist = cityDistrict(mid.x, mid.z), leafy = dist && TREES.LEAFY.has(dist.h);
      const kind = corniche ? 'palm' : (e.cls === 'major' && e.w >= 10) ? 'tree' : (leafy && e.w >= 4.5) ? 'tree' : null; if (!kind) continue;
      const step = corniche ? 20 : e.cls === 'major' ? 17 : 21;
      for (let s = step / 2 + (ei % 5); s < e.L - 4; s += step){
        const o = edgeAt(e, s); if (o.x < ox || o.x >= ox + C || o.z < oz || o.z >= oz + C) continue;
        for (const side of corniche ? [1, -1] : e.cls === 'major' ? [1, -1] : [((ei + Math.round(s)) & 1) ? 1 : -1]){
          const off = e.w / 2 + (corniche ? 1.6 : 1.1), x = o.x - o.fz * off * side, z = o.z + o.fx * off * side, v = cityR(x, z);
          if (v < 2 || v >= 10 || inPatch(x, z) || staticBlocked(x, z, .6)) continue;
          if (corniche && ![3, 6, 9].some(d => cityR(x - o.fz * d * side, z + o.fx * d * side) === 0)) continue;   // the palms stand on the sea side
          (kind === 'palm' ? palms : trees).push([x, .15, z, (x * 13 + z * 7) % 6.28, .85 + ((x * 31 + z * 17) % 1 + 1) % 1 * .35]);
          const key = Math.round(x) + ',' + Math.round(z); if (!TREES.obs.has(key)){ TREES.obs.add(key); ogAdd({ minX: x - .3, maxX: x + .3, minZ: z - .3, maxZ: z + .3 }); }
        }
      }
    }
  }
  if (!palms.length && !trees.length) return;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), V = new THREE.Vector3(), S = new THREE.Vector3();
  const inst = (geo, mat, L) => { const im = new THREE.InstancedMesh(geo, mat, L.length); im.castShadow = GFX === 'high'; im.receiveShadow = true; L.forEach(([x, y, z, ry, s], i) => { Q.setFromAxisAngle(Y, ry); M.compose(V.set(x, y, z), Q, S.set(s, s, s)); im.setMatrixAt(i, M); }); im.computeBoundingSphere(); return im; };
  const far = new THREE.Group(), near = new THREE.Group();
  if (palms.length) far.add(inst(TREES.far.palm, TREES.mat, palms));
  if (trees.length) far.add(inst(TREES.far.tree, TREES.mat, trees));
  // near: the real models (split the palms between the two palm shapes)
  const addNear = (name, L) => { if (!L.length || !SFM[name]) return false; const g = sfInst(name, L.map(([x, y, z, ry, s]) => [x, y, z, ry, s]), GFX === 'high'); if (g) near.add(g); return true; };
  // the palms: the two Sketchfab palms and the date palm, mixed; the street trees: big ficus and a smaller Mediterranean tree
  const sc = (L, k) => L.map(([x, y, z, ry, s]) => [x, y, z, ry, s * k]);
  addNear('palm-trees:palm_a', palms.filter((_, i) => i % 3 === 0)); addNear('palm-trees:palm_b', palms.filter((_, i) => i % 3 === 1));
  if (!addNear('date-palm', sc(palms.filter((_, i) => i % 3 === 2), 1.15))) addNear('palm-trees:palm_a', palms.filter((_, i) => i % 3 === 2));
  const tA = trees.filter((_, i) => i % 5 < 3), tB = trees.filter((_, i) => i % 5 >= 3);
  const okA = addNear('ficus-tree', sc(tA, .72)), okB = addNear('mediterranean-tree', sc(tB, .9));
  if (!okA && tA.length) near.add(inst(TREES.far.tree, TREES.mat, tA)); if (!okB && tB.length) near.add(inst(TREES.far.tree, TREES.mat, tB));
  const hasNear = near.children.length > 0;
  far.userData.c = near.userData.c = [ox + C / 2, oz + C / 2]; grp.add(far); if (hasNear) grp.add(near);
  TREES.groups.push({ far, near: hasNear ? near : null, c: far.userData.c, grp });
}
if (CITY){ const _blT = cityBaseLayer; cityBaseLayer = function(grp, ox, oz){ _blT(grp, ox, oz); try { cityTrees(grp, ox, oz); } catch (e){ console.warn('trees', e); } }; }
{ const _ucT = updateCity; let tT = 0;
  updateCity = function(px, pz){ _ucT(px, pz); const now = performance.now(); if (now - tT < 300) return; tT = now;
    const R = LOW ? 0 : GFX === 'high' ? 140 : 60;   // «خفيف»: the light stand-ins only
    for (let i = TREES.groups.length - 1; i >= 0; i--){ const T = TREES.groups[i]; if (!T.grp.parent){ TREES.groups.splice(i, 1); continue; }
      const d = Math.hypot(T.c[0] - px, T.c[1] - pz), nearOn = !!T.near && d < R; if (T.near) T.near.visible = nearOn; T.far.visible = !nearOn; } }; }
