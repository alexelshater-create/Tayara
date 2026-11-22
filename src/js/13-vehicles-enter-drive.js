// ================= vehicles: enter / drive =================
function enterVehicle(v){
  if (!modeObj.vehicles){ banner('مفيش ركوب في المود ده', 'info', 1.8); return; }
  if (modeObj.canDrive && !modeObj.canDrive(v)){ banner('دي مش بتاعتك', 'info', 1.5); return; }
  hero.veh = v; v.speed = 0; CAM.veh = 0; hero.d.blob.visible = false;
  banner(v.type === 'moto' ? 'ركبت الموتوسيكل 🏍️' : v.type === 'police' ? 'ركبت البوكس 🚓' : 'ركبت العربية 🚗', 'ok', 1.6);
  tone(90, 140, .4, 'sawtooth', .12);
}
function exitVehicle(force){
  const v = hero.veh; if (!v) return;
  const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw); const rx = fz, rz = -fx;
  const opts = [[rx*2.1, rz*2.1], [-rx*2.1, -rz*2.1], [-fx*3.2, -fz*3.2], [fx*3.2, fz*3.2]];
  let placed = false;
  for (const [ox,oz] of opts){ const x = v.pos.x+ox, z = v.pos.z+oz; if (!staticBlocked(x,z) && !vehBlockedAt(x,z,PR,null)){ hero.pos.set(x, groundY(x,z), z); placed = true; break; } }
  if (!placed && !force) { banner('مفيش مكان تنزل فيه', 'info', 1.4); return; }
  if (!placed) hero.pos.set(v.pos.x + 2.5, 0, v.pos.z);
  v.speed = 0; hero.veh = null; CAM.orbit = CAM.orbitSm = camYaw; CAM.veh = 0; hero.d.blob.visible = true; hero.d.doll.visible = true;
  hero.d.P.legL.visible = hero.d.P.legR.visible = true;
}
function driveVehicle(v, dt, inX, inZ, brake){
  const throttle = -inZ, steer = -inX;
  const drift = brake && Math.abs(v.speed) > 7; const vmax = v.max * ((v.dmg||0) >= 100 ? .55 : 1);
  if (brake){ v.speed *= Math.exp(-dt*(drift ? 1.1 : 4)); }
  else if (Math.abs(throttle) > .05){
    const target = throttle > 0 ? vmax*throttle : vmax*.35*throttle;
    const rate = (Math.sign(target) !== Math.sign(v.speed) && Math.abs(v.speed) > .5) ? 22 : v.accel;
    v.speed += clamp(target - v.speed, -rate*dt, rate*dt);
  } else v.speed *= Math.exp(-dt*.7);
  v.steer += (steer - v.steer) * damp(8, dt);
  let sf = clamp(v.speed/6, -1, 1) * (1 - Math.min(Math.abs(v.speed)/v.max, 1)*.35);
  if (Math.abs(throttle) > .05 && Math.abs(sf) < .4) sf = .4 * Math.sign(throttle);
  const nyaw = v.yaw + v.steer * v.turn * (drift ? 1.9 : 1) * sf * dt;
  setLoop('skid', drift ? .1 : 0, 1700, 'bandpass');
  if (drift && Math.random() < dt*14){ _t.set(v.pos.x - Math.sin(v.yaw)*1.8, .2, v.pos.z - Math.cos(v.yaw)*1.8); puff(_t, .5); }
  if ((v.dmg||0) > 60 && Math.random() < dt*6){ _t.set(v.pos.x + Math.sin(v.yaw)*1.8, 1.1, v.pos.z + Math.cos(v.yaw)*1.8); puff(_t, .45); }
  const nx = v.pos.x + Math.sin(nyaw)*v.speed*dt, nz = v.pos.z + Math.cos(nyaw)*v.speed*dt;
  const poseBlocked = (x, z, yaw) => vCircles(v, x, z, yaw).some(c => staticBlocked(c.x, c.z, c.r) || vehBlockedAt(c.x, c.z, c.r, v) || Math.abs(c.x) > LIMIT+3 || Math.abs(c.z) > LIMIT+3);
  if (poseBlocked(nx, nz, nyaw)){
    if (Math.abs(v.speed) > 7){ thwack(); shake = .4; heroDamage((Math.abs(v.speed) > 14 ? 10 : 4) * DIFF.dmg, 'crash'); v.dmg = (v.dmg||0) + Math.abs(v.speed)*1.6; if (v.dmg >= 100 && !v.broke){ v.broke = true; banner('العربية اتبهدلت… بقت بطيئة 💨', 'bad', 2.5); } }
    v.speed *= -.25;
    // still let the driver turn the nose away from what they hit
    const turnOnly = v.yaw + v.steer * v.turn * .6 * dt * (throttle < 0 ? -1 : 1);
    if (!poseBlocked(v.pos.x, v.pos.z, turnOnly)) v.yaw = turnOnly;
  }
  else { v.pos.x = nx; v.pos.z = nz; v.yaw = nyaw; }
  v.pos.y += (groundY(v.pos.x, v.pos.z) - v.pos.y) * damp(12, dt);
  v.mesh.rotation.y = v.yaw;
  if (v.type === 'moto') v.mesh.rotation.z = -v.steer * .35 * clamp(Math.abs(v.speed)/10, 0, 1);
  // traffic bump
  for (const c of traffic){ if (Math.hypot(c.position.x - v.pos.x, c.position.z - v.pos.z) < (v.type==='moto' ? 2.1 : 2.9)){ if (Math.abs(v.speed) > 3 || c.userData.speed > 3){ thwack(); shake = .5; heroDamage((v.type==='moto' ? 18 : 6) * DIFF.dmg, 'car'); v.speed = -v.speed*.3 - 2; c.userData.speed = 0; v.dmg = (v.dmg||0) + 12; } } }
}
