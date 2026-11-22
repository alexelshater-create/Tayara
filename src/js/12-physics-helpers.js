// ================= physics helpers =================
const PR = .35;
function staticBlocked(x, z, pad=PR){ for (const o of obstacles) if (x > o.minX-pad && x < o.maxX+pad && z > o.minZ-pad && z < o.maxZ+pad) return true; return false; }
function vehBlockedAt(x, z, pad, skip){ for (const v of vehicles){ if (v === skip) continue; for (const c of vCircles(v)) if (Math.hypot(c.x-x, c.z-z) < c.r + pad) return true; } return false; }
function blocked(x, z){ return staticBlocked(x, z) || vehBlockedAt(x, z, PR, hero.veh); }
function groundY(x, z){ for (const b of blocksInfo) if (Math.abs(x-b.cx) < BW/2 && Math.abs(z-b.cz) < BW/2) return .15; return 0; }
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
function moveWithSlide(pos, dx, dz, pad=PR){ let moved = false; if (!staticBlocked(pos.x+dx, pos.z, pad)){ pos.x += dx; moved = true; } if (!staticBlocked(pos.x, pos.z+dz, pad)){ pos.z += dz; moved = true; } pos.x = clamp(pos.x, -LIMIT, LIMIT); pos.z = clamp(pos.z, -LIMIT, LIMIT); return moved; }
function randomSidewalkPoint(minD, from){ for (let i=0;i<200;i++){ const b = pick(blocksInfo); const p = perimPos(b, R(0,4)); if (!from || Math.hypot(p[0]-from.x, p[1]-from.z) > minD) return new THREE.Vector3(p[0], .15, p[1]); } return new THREE.Vector3(-80,.15,-80); }
