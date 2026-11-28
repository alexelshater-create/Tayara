// ================= cash-mode chaser =================
const chaser = { active: false, mode: 'grid', node: [0,0], lostT: 0, flashT: 0, spawnT: 0 };
function spawnChaser(){
  const p = hero.pos; const opts = [];
  for (let i=0;i<=N;i++) for (let k=0;k<=N;k++){ const d = Math.hypot(ROADS[i]-p.x, ROADS[k]-p.z); if (d > 45 && d < 90) opts.push([i,k]); }
  const n = opts.length ? rpick(opts) : [0,0];
  chaserCar.position.set(ROADS[n[0]], 0, ROADS[n[1]]); Object.assign(chaser, { node: n, mode: 'grid', active: true, lostT: 0, spawnT: 0 });
  chaserCar.visible = true; chaserLight.intensity = 30; banner('البوليس وراك! اجري', 'police', 3);
}
function updateChaser(dt){
  if (!chaser.active) return;
  const pc = chaserCar.position, p = hero.pos, dx = p.x - pc.x, dz = p.z - pc.z, dist = Math.hypot(dx, dz); chaserLight.position.set(pc.x, 2.2, pc.z);
  chaser.spawnT += dt;
  const sees = dist < 42 && lineOfSight(pc.x, pc.z, p.x, p.z);
  const speed = 6.9 + Math.min(modeObj.got||0, 10)*.13 + (chaser.mode === 'grid' ? .9 : 0);
  let tx, tz;
  if (sees){ chaser.mode = 'direct'; tx = p.x; tz = p.z; chaser.lostT = 0; }
  else {
    if (chaser.mode === 'direct'){ chaser.mode = 'grid'; chaser.node = nearestNode(pc.x, pc.z); }
    tx = ROADS[chaser.node[0]]; tz = ROADS[chaser.node[1]];
    if (Math.hypot(tx-pc.x, tz-pc.z) < .9){ const o = [[1,0],[-1,0],[0,1],[0,-1]].map(([a,b]) => [chaser.node[0]+a, chaser.node[1]+b]).filter(([i,k]) => i>=0 && k>=0 && i<=N && k<=N); o.sort((A,B) => Math.hypot(ROADS[A[0]]-p.x, ROADS[A[1]]-p.z) - Math.hypot(ROADS[B[0]]-p.x, ROADS[B[1]]-p.z)); chaser.node = o[0]; tx = ROADS[chaser.node[0]]; tz = ROADS[chaser.node[1]]; }
    if (dist > 48) chaser.lostT += dt; else chaser.lostT = Math.max(0, chaser.lostT - dt*.5);
  }
  let vx = tx - pc.x, vz = tz - pc.z; const vl = Math.hypot(vx, vz) || 1; vx = vx/vl*speed; vz = vz/vl*speed;
  const nx = pc.x + vx*dt, nz = pc.z + vz*dt;
  if (chaser.mode === 'direct' && obstacles.some(o => o.building && nx > o.minX-1.1 && nx < o.maxX+1.1 && nz > o.minZ-1.1 && nz < o.maxZ+1.1)){ chaser.mode = 'grid'; chaser.node = nearestNode(pc.x, pc.z); }
  else { pc.x = nx; pc.z = nz; }
  chaserCar.rotation.y = lerpAngle(chaserCar.rotation.y, Math.atan2(vx, vz), damp(6, dt));
  chaser.flashT += dt; const on = Math.floor(chaser.flashT*7) % 2 === 0;
  chaserCar.userData.red.emissiveIntensity = on ? 3 : .2; chaserCar.userData.blue.emissiveIntensity = on ? .2 : 3; chaserLight.color.setHex(on ? 0xff2040 : 0x2050ff);
  if (sirenGain) sirenGain.gain.value = clamp(.08 - dist*.001, .012, .08);
  const L = carLocal(chaserCar, p);
  if (chaser.spawnT > 1 && Math.abs(L.along) < 2.6 && Math.abs(L.lat) < 1.35) endMode('اتمسكت!', `البوليس لحق ${heroName} بعد ما لم ${egp(modeObj.money||0)}.`);
  else if (chaser.lostT > 7){ chaser.active = false; chaserCar.visible = false; chaserLight.intensity = 0; if (sirenGain) sirenGain.gain.value = 0; banner('هربت منهم', 'ok', 2.5); }
}
