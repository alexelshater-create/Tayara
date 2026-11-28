// ================= stage 17: the city's streetlights — posts along the bigger streets, warm heads and pools of light at night =================
const SLIGHT = {
  post: (() => { const p = []; cyl(p, .06, .09, 6.2, 0, 3.1, 0, '#2c3136', 0, 6); box(p, .06, .06, 1.6, 0, 6.1, .78, '#2c3136'); return mergeGeometries(p.map(q => q.index ? q.toNonIndexed() : q)); })(),
  head: (() => { const g = new THREE.BoxGeometry(.32, .14, .55); g.translate(0, 6.02, 1.5); return g; })(),
  pool: (() => { const g = new THREE.PlaneGeometry(9, 9); g.rotateX(-Math.PI / 2); g.translate(0, .2, 2.2); return g; })(),
  postMat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: .4 }),
  headMat: new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc77a, emissiveIntensity: .2, roughness: .4 }),
  poolMat: new THREE.MeshBasicMaterial({ map: makeTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,194,122,.75)'); r.addColorStop(.45, 'rgba(255,180,105,.28)'); r.addColorStop(1, 'rgba(255,160,90,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -3, fog: true }),
  done: new Set(),
};
function cityStreetlights(grp, ox, oz){
  if (!RG.E.length) return;
  const C = CITY.chunk, list = [], seen = new Set();
  for (let i = Math.floor(ox / RG.cell) - 1; i <= Math.floor((ox + C) / RG.cell) + 1; i++) for (let k = Math.floor(oz / RG.cell) - 1; k <= Math.floor((oz + C) / RG.cell) + 1; k++){
    const l = RG.grid.get(i * 100000 + k); if (!l) continue;
    for (const ei of l){ if (seen.has(ei)) continue; seen.add(ei); const e = RG.E[ei]; if (e.w < 4 || e.cls === 'service') continue; const step = e.w >= 8 ? 30 : 24;
      for (let s = 8; s < e.L - 5; s += step){
        const o = edgeAt(e, s); if (o.x < ox || o.x >= ox + C || o.z < oz || o.z >= oz + C) continue;
        for (const side of e.ow || e.w >= 12 ? [1, -1] : [((ei + Math.round(s)) & 1) ? 1 : -1]){
          const off = e.w / 2 + .7, x = o.x - o.fz * off * side, z = o.z + o.fx * off * side, v = cityR(x, z);
          if (v < 2 || v >= 10 || inPatch(x, z)) continue;
          list.push([x, z, Math.atan2(o.fz * side, -o.fx * side)]);   // the arm reaches over the road
          const key = Math.round(x) + ',' + Math.round(z); if (!SLIGHT.done.has(key)){ SLIGHT.done.add(key); ogAdd({ minX: x - .12, maxX: x + .12, minZ: z - .12, maxZ: z + .12 }); }
        }
      }
    }
  }
  if (!list.length) return;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
  const mk = (geo, mat, shadow) => { const im = new THREE.InstancedMesh(geo, mat, list.length); im.castShadow = shadow; list.forEach(([x, z, ry], i) => { Q.setFromAxisAngle(Y, ry); M.compose(P.set(x, .15, z), Q, S); im.setMatrixAt(i, M); }); im.computeBoundingSphere(); grp.add(im); return im; };
  mk(SLIGHT.post, SLIGHT.postMat, !LOW); mk(SLIGHT.head, SLIGHT.headMat, false); const pool = mk(SLIGHT.pool, SLIGHT.poolMat, false); pool.renderOrder = 2;
}
if (CITY){ const _bl2 = cityBaseLayer; cityBaseLayer = function(grp, ox, oz){ _bl2(grp, ox, oz); try { cityStreetlights(grp, ox, oz); } catch (e){} }; }
{ const _todSL = applyTimeOfDay; applyTimeOfDay = function(h){ _todSL(h); const n = nightAmount(TOD.h); SLIGHT.headMat.emissiveIntensity = .2 + n * 3.2; SLIGHT.poolMat.opacity = n * .56; SLIGHT.poolMat.visible = n > .05; }; }
