// ================= vehicles: enter / drive =================
function enterVehicle(v){
  if (!modeObj.vehicles){ banner('مفيش ركوب في المود ده', 'info', 1.8); return; }
  if (modeObj.canDrive && !modeObj.canDrive(v)){ banner('دي مش بتاعتك', 'info', 1.5); return; }
  hero.veh = v; v.speed = 0; CAM.veh = 0; CAM.cy = v.yaw; hero.d.blob.visible = false;
  banner(v.type === 'boat' ? 'ركبت اللانش ⚓' : v.type === 'moto' ? 'ركبت الموتوسيكل 🏍️' : v.type === 'police' ? 'ركبت البوكس 🚓' : v.type === 'tuk' ? 'ركبت التوكتوك 🛺' : 'ركبت العربية 🚗', 'ok', 1.6);
  if (v.type !== 'moto') doorSfx(); engineStart(v.type);
}
function exitVehicle(force){
  const v = hero.veh; if (!v) return;
  const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw); const rx = fz, rz = -fx;
  const opts = [[rx*2.1, rz*2.1], [-rx*2.1, -rz*2.1], [-fx*3.2, -fz*3.2], [fx*3.2, fz*3.2]];
  let placed = false;
  if (v.type === 'boat') opts.push([PIER.x0 + 3 - v.pos.x, 0], [(PIER.x0 + PIER.x1) / 2 - v.pos.x, Math.min(PIER.z1 - 1, Math.max(PIER.z0 + 1, v.pos.z)) - v.pos.z]);
  for (const [ox,oz] of opts){ const x = v.pos.x+ox, z = v.pos.z+oz; if (inWorld(x, z) && !staticBlocked(x,z) && !vehBlockedAt(x,z,PR,null) && Math.hypot(ox, oz) < 7){ hero.pos.set(x, groundY(x,z), z); placed = true; break; } }
  if (!placed && !force) { banner('مفيش مكان تنزل فيه', 'info', 1.4); return; }
  if (!placed) hero.pos.set(v.pos.x + 2.5, 0, v.pos.z);
  if (v.type !== 'moto') doorSfx(); else noise(.08, 900, .2);
  v.speed = 0; if (v.type !== 'moto'){ v.mesh.rotation.x = v.mesh.rotation.z = 0; v.pitch = v.roll = 0; } hero.veh = null; CAM.orbit = CAM.orbitSm = camYaw; CAM.veh = 0; hero.d.blob.visible = true; hero.d.doll.visible = true;
  hero.d.P.legL.visible = hero.d.P.legR.visible = true;
}
function driveVehicle(v, dt, inX, inZ, brake){
  const throttle = -inZ, steer = -inX;
  const drift = brake && Math.abs(v.speed) > 7; const vmax = v.max * ((v.dmg||0) >= 100 ? .55 : 1);
  const sp0 = v.speed;
  if (brake){ v.speed *= Math.exp(-dt*(drift ? 1.1 : 4)); }
  else if (Math.abs(throttle) > .05){
    const target = throttle > 0 ? vmax*throttle : vmax*.35*throttle;
    const braking = Math.sign(target) !== Math.sign(v.speed) && Math.abs(v.speed) > .5;
    // strong pull from a standstill that fades near top speed; braking is always strong
    const rate = braking ? 28 : v.accel * (1.35 - .8 * clamp(Math.abs(v.speed) / vmax, 0, 1));
    v.speed += clamp(target - v.speed, -rate*dt, rate*dt);
  } else v.speed *= Math.exp(-dt*.7);
  // the wheel turns quickly and comes back straight a bit quicker when let go
  v.steer += (steer - v.steer) * damp(Math.abs(steer) > .05 ? 9 : 12, dt);
  let sf = clamp(v.speed/6, -1, 1) * (1 - Math.min(Math.abs(v.speed)/v.max, 1)*.35);
  if (Math.abs(throttle) > .05 && Math.abs(sf) < .4) sf = .4 * Math.sign(throttle);
  const nyaw = v.yaw + v.steer * v.turn * (drift ? 1.9 : 1) * sf * dt;
  setLoop('skid', drift ? .1 : 0, 1700, 'bandpass');
  if (drift && Math.random() < dt*14){ _t.set(v.pos.x - Math.sin(v.yaw)*1.8, .2, v.pos.z - Math.cos(v.yaw)*1.8); puff(_t, .5); }
  if ((v.dmg||0) > 60 && Math.random() < dt*6){ _t.set(v.pos.x + Math.sin(v.yaw)*1.8, 1.1, v.pos.z + Math.cos(v.yaw)*1.8); puff(_t, .45); }
  const nx = v.pos.x + Math.sin(nyaw)*v.speed*dt, nz = v.pos.z + Math.cos(nyaw)*v.speed*dt;
  const poseBlocked = v.type === 'boat' ? (x, z, yaw) => vCircles(v, x, z, yaw).some(c => !inSea(c.x, c.z) || vehBlockedAt(c.x, c.z, c.r, v))
    : (x, z, yaw) => vCircles(v, x, z, yaw).some(c => staticBlocked(c.x, c.z, c.r) || vehBlockedAt(c.x, c.z, c.r, v) || tramBlocks(c.x, c.z, c.r) || !inWorld(c.x, c.z));
  // hitting something at an angle: slide along it (keep the free part of the move) instead of bouncing off
  let slid = false;
  if (poseBlocked(nx, nz, nyaw)) for (const [tx, tz] of [[nx, v.pos.z], [v.pos.x, nz]]){
    if (Math.hypot(tx - v.pos.x, tz - v.pos.z) < Math.abs(v.speed) * dt * .35) continue;   // almost head-on: that is a crash
    if (!poseBlocked(tx, tz, nyaw)){ v.pos.x = tx; v.pos.z = tz; v.yaw = nyaw; v.speed *= Math.exp(-dt*2.5); slid = true; if (Math.abs(v.speed) > 6 && Math.random() < dt*10) noise(.06, 2400, .05); break; }
  }
  if (slid){ /* moved along the wall */ }
  else if (poseBlocked(nx, nz, nyaw)){
    if (Math.abs(v.speed) > 7){ if (typeof onVehicleCrash === 'function') onVehicleCrash(v, Math.abs(v.speed)); thwack(); shake = .4; heroDamage((Math.abs(v.speed) > 14 ? 10 : 4) * DIFF.dmg, 'crash'); v.dmg = (v.dmg||0) + Math.abs(v.speed)*1.6; if (v.dmg >= 100 && !v.broke){ v.broke = true; banner('العربية اتبهدلت… بقت بطيئة 💨', 'bad', 2.5); } }
    v.speed *= -.25;
    // still let the driver turn the nose away from what they hit
    const turnOnly = v.yaw + v.steer * v.turn * .6 * dt * (throttle < 0 ? -1 : 1);
    if (!poseBlocked(v.pos.x, v.pos.z, turnOnly)) v.yaw = turnOnly;
  }
  else { v.pos.x = nx; v.pos.z = nz; v.yaw = nyaw; }
  if (v.type === 'boat') v.pos.y = -.9 + Math.sin(runTime * 1.6) * .07;
  else if (!vehicleAir(v, dt)) v.pos.y += (groundY(v.pos.x, v.pos.z) - v.pos.y) * damp(12, dt);
  v.mesh.rotation.y = v.yaw;
  if (v.type === 'moto') v.mesh.rotation.z = -v.steer * .35 * clamp(Math.abs(v.speed)/10, 0, 1);
  else {
    // the body leans out of turns and dips when braking / lifts when speeding up
    const acc = (v.speed - sp0) / Math.max(dt, 1e-3);
    v.pitch = (v.pitch || 0) + (clamp(-acc * .0035, -.045, .03) - (v.pitch || 0)) * damp(6, dt);
    v.roll = (v.roll || 0) + (-v.steer * .045 * clamp(Math.abs(v.speed) / 14, 0, 1) - (v.roll || 0)) * damp(5, dt);
    v.mesh.rotation.x = v.pitch; v.mesh.rotation.z = v.roll;
  }
  // traffic bump
  if (v.type !== 'boat') for (const c of traffic){ if (Math.hypot(c.position.x - v.pos.x, c.position.z - v.pos.z) < (v.type==='moto' ? 2.1 : 2.9)){ if (Math.abs(v.speed) > 3 || c.userData.speed > 3){ if (typeof onVehicleCrash === 'function') onVehicleCrash(v, Math.abs(v.speed) + 6); if (SFX.crashT <= 0){ crashSfx(Math.abs(v.speed) + 6); SFX.crashT = .6; } else thwack(); shake = .5; heroDamage((v.type==='moto' ? 18 : 6) * DIFF.dmg, 'car'); v.speed = -v.speed*.3 - 2; c.userData.speed = 0; v.dmg = (v.dmg||0) + 12; } } }
}
