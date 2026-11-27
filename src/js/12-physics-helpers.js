// ================= physics helpers =================
const PR = .35;
// obstacles are looked up in a grid of 8 m cells (there are well over a thousand of them). The grid is rebuilt when
// the list grows. An obstacle with a height h (a table, a bench, a drum) doesn't block someone whose feet are above it.
const OG = { n: -1, cell: 8, map: new Map(), big: [] };
function ogBuild(){
  OG.map.clear(); OG.big.length = 0; const c = OG.cell;
  for (const o of obstacles){
    const x0 = Math.floor(o.minX / c), x1 = Math.floor(o.maxX / c), z0 = Math.floor(o.minZ / c), z1 = Math.floor(o.maxZ / c);
    if ((x1 - x0 + 1) * (z1 - z0 + 1) > 300){ OG.big.push(o); continue; }
    for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++){ const k = gx * 4096 + gz; let l = OG.map.get(k); if (!l) OG.map.set(k, l = []); l.push(o); }
  }
  OG.n = obstacles.length;
}
// calls fn(o) for each obstacle within pad of (x, z); stops early if fn returns true
function ogQuery(x, z, pad, fn){
  if (OG.n !== obstacles.length) ogBuild();
  const c = OG.cell, x0 = Math.floor((x - pad) / c), x1 = Math.floor((x + pad) / c), z0 = Math.floor((z - pad) / c), z1 = Math.floor((z + pad) / c);
  for (const o of OG.big) if (x > o.minX-pad && x < o.maxX+pad && z > o.minZ-pad && z < o.maxZ+pad && fn(o)) return true;
  for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++){ const l = OG.map.get(gx * 4096 + gz); if (l) for (const o of l) if (x > o.minX-pad && x < o.maxX+pad && z > o.minZ-pad && z < o.maxZ+pad && fn(o)) return true; }
  return false;
}
function staticBlocked(x, z, pad=PR, feet){ return ogQuery(x, z, pad, o => !(feet !== undefined && o.h !== undefined && feet >= o.h - .05)); }
function vehBlockedAt(x, z, pad, skip){ for (const v of vehicles){ if (v === skip) continue; for (const c of vCircles(v)) if (Math.hypot(c.x-x, c.z-z) < c.r + pad) return true; } return false; }
function blocked(x, z){ if (HOUSE.inside) return !HOUSE.inRoom(x, z) || staticBlocked(x, z); return !inWorld(x, z) || staticBlocked(x, z) || vehBlockedAt(x, z, PR, hero.veh) || tramBlocks(x, z); }
function freeSpot(x, z){ if (!staticBlocked(x, z, .5) && inWorld(x, z)) return [x, z]; for (let r = .6; r < 6; r += .4) for (let a = 0; a < 6.28; a += .4){ const nx = x + Math.sin(a)*r, nz = z + Math.cos(a)*r; if (inWorld(nx, nz) && !staticBlocked(nx, nz, .5)) return [nx, nz]; } return [x, z]; }
function groundY(x, z){ if (HOUSE.inside) return 0; for (const b of blocksInfo) if (Math.abs(x-b.cx) < BW/2 && Math.abs(z-b.cz) < BW/2) return .15; if (z > ZMAX + 6 && z < NILE_Z && Math.abs(x - BRIDGE.x) > BRIDGE.w/2) return .15; if (z > FAR.z0 && x > FAR.x0 && x < FAR.x1) return .15; if (x > PIER.x0 && x < PIER.x1 && z >= PIER.z0 && z < PIER.z1) return .15; return 0; }
function segHitsBox(ax, az, bx, bz, o, pad){
  let t0 = 0, t1 = 1; const dx = bx-ax, dz = bz-az;
  for (const [p,d,mn,mx] of [[ax,dx,o.minX-pad,o.maxX+pad],[az,dz,o.minZ-pad,o.maxZ+pad]]){
    if (Math.abs(d) < 1e-9){ if (p < mn || p > mx) return false; }
    else { let ta = (mn-p)/d, tb = (mx-p)/d; if (ta > tb) [ta,tb] = [tb,ta]; t0 = Math.max(t0,ta); t1 = Math.min(t1,tb); if (t0 > t1) return false; }
  }
  return true;
}
function lineOfSight(ax, az, bx, bz){ for (const o of obstacles) if (o.building && segHitsBox(ax,az,bx,bz,o,.3)) return false; return true; }
function carLocal(car, p){ const h = car.rotation.y, fx = Math.sin(h), fz = Math.cos(h); const dx = p.x - car.position.x, dz = p.z - car.position.z; return { along: dx*fx + dz*fz, lat: dx*fz - dz*fx }; }
function nearestNode(x, z){ let best = [0,0], bd = 1e9; for (let i=0;i<=N;i++) for (let k=0;k<=N;k++){ const d = (ROADS[i]-x)**2 + (ROADS[k]-z)**2; if (d < bd){ bd = d; best = [i,k]; } } return best; }
function moveWithSlide(pos, dx, dz, pad=PR){ let moved = false; if (inWorld(pos.x+dx, pos.z) && !staticBlocked(pos.x+dx, pos.z, pad)){ pos.x += dx; moved = true; } if (inWorld(pos.x, pos.z+dz) && !staticBlocked(pos.x, pos.z+dz, pad)){ pos.z += dz; moved = true; } return moved; }
function randomSidewalkPoint(minD, from){ for (let i=0;i<200;i++){ const b = pick(blocksInfo); const p = perimPos(b, R(0,4)); if (!from || Math.hypot(p[0]-from.x, p[1]-from.z) > minD) return new THREE.Vector3(p[0], .15, p[1]); } return new THREE.Vector3(-80,.15,-80); }
