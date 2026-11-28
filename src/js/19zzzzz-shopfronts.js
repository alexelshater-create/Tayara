// ================= stage 18½: what stands outside each real shop (near you only) =================
// the butcher's meat hanging on hooks, the fish on ice, the café's tables and chairs on the pavement, the bakery's
// bread racks, the falafel tray, the cane bundles of the juice shop, the grocer's racks and crates.
const SFR = { on: new Map(), t: 0, R: LOW ? 45 : 70, max: LOW ? 10 : 24 };
const sfrM = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? .7, metalness: o.m ?? 0 });
const SFRM = { meat: sfrM(0xa8322a, { r: .45 }), fat: sfrM(0xeadcc8, { r: .5 }), steel: sfrM(0x9aa0a6, { r: .3, m: .8 }), wood: sfrM(0x6b4a2a), ice: sfrM(0xe8f4f8, { r: .2 }),
  fish: sfrM(0x9fb0bb, { r: .25, m: .4 }), red: sfrM(0xc23a2a), plastic: sfrM(0xd8d4c8, { r: .5 }), bread: sfrM(0xc99a58), cane: sfrM(0x6f9a32), crate: sfrM(0x2e66b0, { r: .6 }),
  tin: sfrM(0xb8bcc0, { r: .4, m: .6 }), table: sfrM(0x8a6a48) };
const SFRG = { lump: (() => { const g = new THREE.SphereGeometry(.16, 10, 8); g.scale(1, 2.6, .8); return g; })(), hook: new THREE.CylinderGeometry(.006, .006, .25, 4),
  rail: new THREE.CylinderGeometry(.02, .02, 1, 6), leg: new THREE.CylinderGeometry(.02, .02, .75, 5), fish: (() => { const g = new THREE.SphereGeometry(.12, 8, 5); g.scale(1, .3, .35); return g; })(),
  loaf: (() => { const g = new THREE.SphereGeometry(.11, 10, 5); g.scale(1, .28, 1); return g; })(), chairSeat: new THREE.BoxGeometry(.42, .04, .42), chairBack: new THREE.BoxGeometry(.42, .42, .03),
  tableTop: new THREE.CylinderGeometry(.36, .36, .03, 16), cane: new THREE.CylinderGeometry(.018, .022, 2.1, 5), crateG: new THREE.BoxGeometry(.5, .28, .36), ball: new THREE.SphereGeometry(.03, 6, 4) };
const sfrMesh = (g, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = GFX === 'high'; return o; };
// built in the shop's frame: x along the facade, +z out to the street, the facade at z = 0
function shopFront(k){
  const g = new THREE.Group();
  if (k === 'butcher'){
    const r = sfrMesh(SFRG.rail, SFRM.steel, 0, 2.35, .45); r.rotation.z = Math.PI / 2; r.scale.y = 2.2; g.add(r);
    for (let i = 0; i < 5; i++){ const x = -.85 + i * .42; g.add(sfrMesh(SFRG.hook, SFRM.steel, x, 2.22, .45)); const m = sfrMesh(SFRG.lump, SFRM.meat, x, 1.68, .45, Math.random()); m.rotation.z = (Math.random() - .5) * .15; g.add(m);
      const f = sfrMesh(SFRG.fish, SFRM.fat, x - .05, 1.85, .55); f.scale.set(.5, 3, .5); g.add(f); }
    const blk = sfrMesh(new THREE.CylinderGeometry(.32, .36, .8, 12), SFRM.wood, 1.25, .4, .7); g.add(blk);   // the قرمة
  } else if (k === 'fish'){
    const t = sfrMesh(new THREE.BoxGeometry(1.8, .08, .9), SFRM.ice, 0, .85, .75); t.rotation.x = -.18; g.add(t);
    for (const x of [-.8, .8]) for (const z of [.35, 1.15]) g.add(sfrMesh(SFRG.leg, SFRM.steel, x, .42, z));
    for (let i = 0; i < 16; i++){ const f = sfrMesh(SFRG.fish, i % 5 === 2 ? SFRM.red : SFRM.fish, -.75 + (i % 8) * .21, .92 + Math.floor(i / 8) * .07, .55 + Math.floor(i / 8) * .35, (Math.random() - .5) * .6); g.add(f); }
    for (let i = 0; i < 2; i++) g.add(sfrMesh(SFRG.crateG, SFRM.crate, 1.3, .14 + i * .28, .5));
  } else if (k === 'cafe'){
    for (let t = 0; t < 2; t++){ const tx = -1 + t * 2;
      g.add(sfrMesh(SFRG.tableTop, SFRM.tin, tx, .72, 1.3)); g.add(sfrMesh(SFRG.leg, SFRM.tin, tx, .36, 1.3));
      for (const s of [-1, 1]){ const c = new THREE.Group(); c.position.set(tx + s * .55, 0, 1.3); c.rotation.y = s * Math.PI / 2;
        c.add(sfrMesh(SFRG.chairSeat, SFRM.wood, 0, .45, 0)); c.add(sfrMesh(SFRG.chairBack, SFRM.wood, 0, .68, -.2));
        for (const lx of [-.18, .18]) for (const lz of [-.18, .18]){ const l = sfrMesh(SFRG.leg, SFRM.wood, lx, .22, lz); l.scale.y = .6; c.add(l); } g.add(c); } }
  } else if (k === 'bakery' || k === 'sweets'){
    for (let s = 0; s < 4; s++){ const sh = sfrMesh(new THREE.BoxGeometry(1.2, .03, .45), SFRM.wood, 0, .5 + s * .38, .35); g.add(sh); for (let i = 0; i < 5; i++) g.add(sfrMesh(SFRG.loaf, SFRM.bread, -.48 + i * .24, .55 + s * .38, .35 + (i % 2) * .08)); }
    for (const x of [-.6, .6]){ const l = sfrMesh(SFRG.leg, SFRM.wood, x, .9, .35); l.scale.y = 2.4; g.add(l); }
  } else if (k === 'food'){
    if (SFM['falafel-tray']){ const p = SFM['falafel-tray']; const t = new THREE.Group(); for (const q of p){ const m = new THREE.Mesh(q.geo, q.mat); m.castShadow = GFX === 'high'; t.add(m); } t.position.set(0, .9, .6); g.add(t); }
    const c = sfrMesh(new THREE.BoxGeometry(1.4, .9, .7), SFRM.tin, 0, .45, .6); g.add(c);
  } else if (k === 'juice'){
    for (let i = 0; i < 18; i++){ const c = sfrMesh(SFRG.cane, SFRM.cane, -.9 + i * .1, 1.02, .2 + (i % 3) * .05); c.rotation.z = -.12 + (i % 4) * .02; g.add(c); }
  } else if (k === 'market'){
    for (let i = 0; i < 4; i++) g.add(sfrMesh(SFRG.crateG, [SFRM.crate, SFRM.red, SFRM.crate, SFRM.plastic][i], -.9 + (i % 2) * .55, .14 + Math.floor(i / 2) * .28, .45));
    if (SFM['fruit-veg-cart'] && Math.random() < .5){ const t = new THREE.Group(); for (const q of SFM['fruit-veg-cart']){ const m = new THREE.Mesh(q.geo, q.mat); m.castShadow = GFX === 'high'; t.add(m); } t.position.set(-.4, 0, 2.2); t.rotation.y = Math.PI / 2; g.add(t); }
    if (SFM['grocery-rack']){ const t = new THREE.Group(); for (const q of SFM['grocery-rack']){ const m = new THREE.Mesh(q.geo, q.mat); m.castShadow = GFX === 'high'; t.add(m); } t.position.set(.8, 0, .4); g.add(t); }
  } else return null;
  return g;
}
function updateShopFronts(f){
  if (typeof CSHOP_GRID === 'undefined') return;
  SFR.t -= 1 / 60; if (SFR.t > 0) return; SFR.t = .5;
  for (const [s, o] of SFR.on) if (Math.hypot(s.x - f.x, s.z - f.z) > SFR.R + 15){ scene.remove(o); SFR.on.delete(s); }
  if (SFR.on.size >= SFR.max) return;
  const gx = Math.floor(f.x / 64), gz = Math.floor(f.z / 64);
  for (let i = gx - 1; i <= gx + 1; i++) for (let k = gz - 1; k <= gz + 1; k++) for (const s of CSHOP_GRID.get(i * 1000 + k) || []){
    if (SFR.on.has(s) || SFR.on.size >= SFR.max || Math.hypot(s.x - f.x, s.z - f.z) > SFR.R) continue;
    const d = cshopDoor(s); if (!d) continue;
    const g = shopFront(s.k); if (!g){ SFR.on.set(s, new THREE.Group()); continue; }
    // the door spot is on the pavement; the props stand between it and the shop, facing the street
    const bx = -Math.sin(d.yaw), bz = -Math.cos(d.yaw), x = d.x + bx * .2, z = d.z + bz * .2;
    g.position.set(x, groundY(x, z), z); g.rotation.y = Math.atan2(-bx, -bz); scene.add(g); SFR.on.set(s, g);
  }
}
{ const _ua = updateAround; updateAround = function(f){ _ua(f); try { updateShopFronts(f); } catch (e){} }; }
