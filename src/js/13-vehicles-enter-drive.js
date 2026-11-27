// ================= vehicles: enter / drive =================
function enterVehicle(v){
  if (!modeObj.vehicles){ banner('مفيش ركوب في المود ده', 'info', 1.8); return; }
  if (modeObj.canDrive && !modeObj.canDrive(v)){ banner('دي مش بتاعتك', 'info', 1.5); return; }
  hero.veh = v; v.speed = 0; v.slip = 0; CAM.veh = 0; CAM.cy = v.yaw; hero.d.blob.visible = false; splitWheels(v);
  if (v.fallen){ v.fallen = false; v.lean = 0; v.mesh.rotation.set(0, v.yaw, 0); }   // a moto that fell over is picked up
  banner(v.type === 'boat' ? 'ركبت اللانش' : v.type === 'moto' ? 'ركبت الموتوسيكل' : v.type === 'police' ? 'ركبت البوكس' : v.type === 'tuk' ? 'ركبت التوكتوك' : 'ركبت العربية', 'ok', 1.6);
  if (v.type !== 'moto') doorSfx(); engineStart(v.type);
  onSteal(v);
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
  v.speed = 0; v.slip = 0; v.kick = null; v.sp = null; if (v.type === 'moto' && !v.fallen){ v.mesh.rotation.set(0, v.yaw, 0); v.lean = 0; } if (v.type !== 'moto'){ v.mesh.rotation.x = v.mesh.rotation.z = 0; v.pitch = v.roll = 0; } hero.veh = null; CAM.orbit = CAM.orbitSm = camYaw; CAM.veh = 0; hero.d.blob.visible = true; hero.d.doll.visible = true;
  hero.d.P.legL.visible = hero.d.P.legR.visible = true;
}
// how each kind of vehicle handles. grip: how fast a sideways slide dies (high = sticks to the road); slide: the same
// with the handbrake on (low = long drifts); yawK: how quick it turns; roll / pitch: how far the body moves on its
// springs in turns and when speeding up or braking; mass: who pushes whom when two cars meet
const HANDLING = {
  car:    { grip: 9,   slide: 1.4, yawK: 1,    roll: .055, pitch: .04,  mass: 1 },
  taxi:   { grip: 9,   slide: 1.4, yawK: 1,    roll: .055, pitch: .04,  mass: 1 },
  police: { grip: 10,  slide: 1.6, yawK: 1.05, roll: .045, pitch: .035, mass: 1.3 },
  sport:  { grip: 11,  slide: 1.15, yawK: 1.1, roll: .035, pitch: .03,  mass: 1 },
  tuk:    { grip: 6.5, slide: 2.2, yawK: 1.1,  roll: .12,  pitch: .05,  mass: .45 },
  moto:   { grip: 12,  slide: 2.6, yawK: 1,    roll: 0,    pitch: .045, mass: .3 },
  boat:   { grip: 1.5, slide: .7,  yawK: 1,    roll: .07,  pitch: .09,  mass: 1.5 },
};
// dents: the car you crash gets its own copy of its paint shape the first time, then the panels near the hit are pushed in
function dentCar(v, lx, lz, amount){
  const m = v.mesh.children[0]; if (!m || !m.geometry || v.type === 'moto' || v.type === 'boat') return;
  if (!m.userData.dented){ m.geometry = m.geometry.clone(); m.userData.dented = true; }
  const P = m.geometry.attributes.position; let moved = false;
  for (let i = 0; i < P.count; i++){
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), d = Math.hypot(x - lx, z - lz);
    if (d > 1.1 || y < .2) continue;
    const k = (1 - d / 1.1) ** 2 * amount, len = Math.hypot(x, z) || 1;
    P.setX(i, x - x / len * k * .6); P.setZ(i, z - z / len * k); if (y > .9) P.setY(i, y - k * .25); moved = true;
  }
  if (moved){ P.needsUpdate = true; m.geometry.computeVertexNormals(); }
}
// a moto that hits something hard throws its rider
function throwRider(v, imp, already){
  if (hero.veh !== v || v.type !== 'moto') return;
  const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw), sp = Math.max(4, Math.abs(v.speed));
  exitVehicle(true);
  v.fallen = true; v.speed = 0; v.slip = 0; v.mesh.rotation.set(0, v.yaw, (Math.random() < .5 ? -1 : 1) * 1.35);
  hero.knock.set(fx * sp * .55, 0, fz * sp * .55); hero.d.downT = 1.5; MOVE.land = 1.5;
  hero.inv = 0; if (!already) heroDamage(clamp(imp * 1.6, 8, 45) * DIFF.dmg, 'crash'); banner('وقعت من على الموتوسيكل!', 'bad', 1.8);
}
function driveVehicle(v, dt, inX, inZ, brake){
  const H = HANDLING[v.type] || HANDLING.car, boat = v.type === 'boat';
  if (v.mesh.rotation.order !== 'YXZ') v.mesh.rotation.order = 'YXZ';   // heading first, then nose up/down and lean in the car's own frame
  const throttle = -inZ, steer = clamp(-inX + (v.pull || 0), -1, 1);   // a burst tyre pulls to one side
  const vmax = v.max * ((v.dmg||0) >= 100 ? .55 : 1);
  const sp0 = v.speed; v.slip = v.slip || 0;
  const hand = brake && Math.abs(v.speed) > 4;   // the handbrake at speed: the back lets go
  if (brake && !hand){ v.speed *= Math.exp(-dt*4); }
  else if (Math.abs(throttle) > .05){
    if (hand) v.speed *= Math.exp(-dt*.45);   // handbrake + gas: the back slides but the car keeps going (a held drift)
    const target = throttle > 0 ? vmax*throttle : vmax*.35*throttle;
    const braking = Math.sign(target) !== Math.sign(v.speed) && Math.abs(v.speed) > .5;
    // strong pull from a standstill that fades near top speed; braking is always strong
    const rate = braking ? (boat ? 9 : 17) : v.accel * (1.35 - .8 * clamp(Math.abs(v.speed) / vmax, 0, 1)) * (hand ? .6 : 1);
    v.speed += clamp(target - v.speed, -rate*dt, rate*dt);
  } else v.speed *= Math.exp(-dt*(hand ? 1.2 : boat ? .35 : .7));
  // the wheel turns quickly and comes back straight a bit quicker when let go
  v.steer += (steer - v.steer) * damp(Math.abs(steer) > .05 ? 9 : 12, dt);
  let sf = clamp(v.speed/6, -1, 1) * (1 - Math.min(Math.abs(v.speed)/v.max, 1)*.35);
  if (Math.abs(throttle) > .05 && Math.abs(sf) < .4) sf = .4 * Math.sign(throttle);
  // turning: a car that is already sliding turns its nose a little more (oversteer), the handbrake much more
  const slideF = clamp(Math.abs(v.slip) / 6, 0, 1);
  const powerOn = !boat && v.type !== 'moto' && Math.abs(throttle) > .8 && Math.abs(v.steer) > .7 && Math.abs(v.speed) > vmax * .55;
  const yawRate = v.steer * v.turn * H.yawK * sf * (hand ? 1.75 : powerOn ? 1.3 : 1 + slideF * .35);
  const nyaw = v.yaw + yawRate * dt;
  // the car keeps going the way it was going: its speed is split again along the new heading (forward + sideways),
  // and the tyres' grip eats the sideways part. Little grip (handbrake, a boat) = it slides = drifting.
  const fx0 = Math.sin(v.yaw), fz0 = Math.cos(v.yaw), wx = fx0 * v.speed + fz0 * v.slip, wz = fz0 * v.speed - fx0 * v.slip;
  const fx = Math.sin(nyaw), fz = Math.cos(nyaw);
  let fwd = wx * fx + wz * fz, side = wx * fz - wz * fx;
  side *= Math.exp(-dt * (hand ? H.slide : powerOn ? H.grip * .22 : H.grip));
  if (!hand) fwd += Math.abs(side) * (1 - Math.exp(-dt * 2)) * Math.sign(fwd || 1) * .5;   // coming out of a slide, some of it turns back into speed
  v.speed = fwd; v.slip = side;
  const sliding = !boat && Math.abs(v.slip) > 3.2 && Math.abs(v.speed) > 5;
  if (!v.ai) setLoop('skid', sliding ? clamp(Math.abs(v.slip) / 30, .05, .14) : 0, 1700, 'bandpass');
  if (sliding && Math.random() < dt*16){ for (const s of [-1, 1]){ _t.set(v.pos.x - fx*1.7 + fz*s*.8, .2, v.pos.z - fz*1.7 - fx*s*.8); puff(_t, .45); } }
  if (boat && Math.abs(v.speed) > 8 && Math.random() < dt*12){ for (const s of [-1, 1]){ _t.set(v.pos.x + fx*2.6 + fz*s*1.2, -.6, v.pos.z + fz*2.6 - fx*s*1.2); puff(_t, .55); } }   // spray at the bow
  if ((v.dmg||0) > 60 && Math.random() < dt*6){ _t.set(v.pos.x + fx*1.8, 1.1, v.pos.z + fz*1.8); puff(_t, .45); }
  const vx = fx * v.speed + fz * v.slip, vz = fz * v.speed - fx * v.slip;
  const nx = v.pos.x + vx * dt, nz = v.pos.z + vz * dt;
  const poseBlocked = boat ? (x, z, yaw) => vCircles(v, x, z, yaw).some(c => !inSea(c.x, c.z) || vehBlockedAt(c.x, c.z, c.r, v))
    : (x, z, yaw) => vCircles(v, x, z, yaw).some(c => staticBlocked(c.x, c.z, c.r) || vehBlockedAt(c.x, c.z, c.r, v) || tramBlocks(c.x, c.z, c.r) || !inWorld(c.x, c.z));
  // hitting something at an angle: slide along it (keep the free part of the move) instead of bouncing off
  let slid = false;
  const mv = Math.hypot(vx, vz) * dt;
  if (poseBlocked(nx, nz, nyaw)) for (const [tx, tz] of [[nx, v.pos.z], [v.pos.x, nz]]){
    if (Math.hypot(tx - v.pos.x, tz - v.pos.z) < mv * .35) continue;   // almost head-on: that is a crash
    if (!poseBlocked(tx, tz, nyaw)){ v.pos.x = tx; v.pos.z = tz; v.yaw = nyaw; v.speed *= Math.exp(-dt*2.5); v.slip *= Math.exp(-dt*6); slid = true; if (Math.abs(v.speed) > 6 && Math.random() < dt*10) noise(.06, 2400, .05); break; }
  }
  if (slid){ /* moved along the wall */ }
  else if (poseBlocked(nx, nz, nyaw)){
    const imp = Math.hypot(v.speed, v.slip);
    // another vehicle? it gets shoved (a parked car rolls away and turns), and we lose less speed than against a wall
    const other = !boat ? vehicles.find(o => o !== v && vCircles(v, nx, nz, nyaw).some(c => vCircles(o).some(d => Math.hypot(c.x - d.x, c.z - d.z) < c.r + d.r))) : null;
    if (other && other === hero.veh && v.ai && imp > 2 && runTime - (v.pitAt ?? -9) > .9){ v.pitAt = runTime;   // a police car hits your car: shove it sideways; from behind it spins (a PIT)
      const hv = other, hfx = Math.sin(hv.yaw), hfz = Math.cos(hv.yaw), lat = vx * hfz - vz * hfx, behind = ((v.pos.x - hv.pos.x) * hfx + (v.pos.z - hv.pos.z) * hfz) < -.5;
      hv.slip = (hv.slip || 0) + lat * .75; hv.speed += (vx * hfx + vz * hfz) * .3; if (behind) hv.yaw += clamp(lat * .045, -.45, .45);
      dentCar(hv, clamp((v.pos.x - hv.pos.x) * hfz - (v.pos.z - hv.pos.z) * hfx, -1, 1), behind ? -2.2 : 0, Math.min(.25, imp * .015)); hv.dmg = (hv.dmg || 0) + imp * .5;
      if (SFX.crashT <= 0){ crashSfx(imp); SFX.crashT = .5; } shake = Math.min(.6, .2 + imp * .02); heroDamage(clamp(imp * .35, 1, 8) * DIFF.dmg, 'crash');
    }
    // your car against a police car with the gas on: it gets pushed out of the way (slowly), you follow
    if (other && other.ai && v === hero.veh && Math.abs(throttle) > .3 && imp <= 4){
      const pv = Math.sign(throttle) * 2.6, px = Math.sin(v.yaw) * pv * dt, pz = Math.cos(v.yaw) * pv * dt;
      if (!vCircles(other, other.pos.x + px, other.pos.z + pz).some(c => staticBlocked(c.x, c.z, c.r) || !inWorld(c.x, c.z))){ other.pos.x += px; other.pos.z += pz; other.yaw += (Math.random() - .5) * dt * .6; other.mesh.rotation.y = other.yaw; if (!poseBlocked(v.pos.x + px * .9, v.pos.z + pz * .9, v.yaw)){ v.pos.x += px * .9; v.pos.z += pz * .9; } v.pushing = true; }
    }
    if (other && other !== hero.veh && imp > 2){
      const Ho = HANDLING[other.type] || HANDLING.car, share = H.mass / (H.mass + Ho.mass);
      other.kick = { x: vx * share * 1.1, z: vz * share * 1.1, spin: (Math.random() - .5) * imp * .12 };
      if (imp > 5 && (!v.ai || v.pos.distanceTo(camera.position) < 40)){ if (SFX.crashT <= 0){ crashSfx(imp); SFX.crashT = .5; } else thwack(); }
    }
    if (imp > 7){
      if (!v.ai){ if (typeof onVehicleCrash === 'function') onVehicleCrash(v, imp); thwack(); shake = Math.min(.7, .25 + imp * .02);
      heroDamage((imp > 14 ? 10 : 4) * DIFF.dmg, 'crash'); } v.dmg = (v.dmg||0) + imp * (other ? .7 : 1.6);   // shoving a car costs less than a wall
      if (v.dmg >= 100 && !v.broke){ v.broke = true; banner('الموتور اتأثر… العربية بقت بطيئة', 'bad', 2.5); }
      // where it hit, in the car's own frame (front, back or a side): push the panels in there
      const lf = (vx * fx + vz * fz) / (imp || 1), ls = (vx * fz - vz * fx) / (imp || 1);
      dentCar(v, ls * 1.0, lf * 2.2, Math.min(.35, (imp - 6) * .02)); carDamaged(v, imp, ls, lf * 2.2);
      if (other && other.type !== 'boat'){ other.dmg = (other.dmg || 0) + imp * .8; carDamaged(other, imp * .8, -ls, -lf * 2.2); }
      if (v.type === 'moto' && imp > 11){ throwRider(v, imp); return; }
    }
    if (v.pushing){ v.pushing = false; v.speed = clamp(v.speed, -2.6, 2.6); } else v.speed *= other ? .35 : -.25; v.slip *= -.3;
    if (imp > 9 && !other) v.yaw += (Math.random() - .5) * .12;   // a hard hit knocks the nose a little
    // still let the driver turn the nose away from what they hit
    const turnOnly = v.yaw + v.steer * v.turn * .6 * dt * (throttle < 0 ? -1 : 1);
    if (!poseBlocked(v.pos.x, v.pos.z, turnOnly)) v.yaw = turnOnly;
  }
  else { v.pos.x = nx; v.pos.z = nz; v.yaw = nyaw; }
  // up and down: boats ride the waves, cars follow the road and bump on kerbs
  const sp = v.sp || (v.sp = { r: 0, rv: 0, p: 0, pv: 0, g: v.pos.y });
  let ramp = false;
  if (boat) v.pos.y = -.9 + Math.sin(runTime * 1.6) * .07 + Math.sin(runTime * 2.7 + v.pos.x * .3) * .03; else if (vehicleAir(v, dt)) ramp = true; else { const g = groundY(v.pos.x, v.pos.z); if (Math.abs(g - sp.g) > .05 && Math.abs(v.speed) > 2){ sp.pv += (g > sp.g ? -1 : 1) * Math.min(1.6, Math.abs(v.speed) * .12); sp.rv += (Math.random() - .5) * .6; } sp.g = g; v.pos.y += (g - v.pos.y) * damp(12, dt); }
  v.mesh.rotation.y = v.yaw;
  // body on springs: it leans out of turns, dips when braking, lifts when speeding up, and bounces a little after a kerb
  const acc = (v.speed - sp0) / Math.max(dt, 1e-3), latA = v.speed * yawRate;
  if (v.type === 'moto'){
    // a moto leans INTO the turn, as much as the turn needs (and the rider with it)
    const want = clamp(Math.atan(latA / 9.8) * .9, -.75, .75) * clamp(Math.abs(v.speed) / 4, 0, 1);
    v.lean = (v.lean || 0) + (want - (v.lean || 0)) * damp(7, dt);
    sp.pv += ((clamp(-acc * H.pitch * .1, -.08, .06) - sp.p) * 70 - sp.pv * 10) * dt; sp.p += sp.pv * dt;
    if (!ramp) v.mesh.rotation.x = sp.p; v.mesh.rotation.z = -v.lean;
  } else {
    let tr = clamp(-latA * H.roll * .06, -.09, .09), tp = clamp(-acc * H.pitch * .1, -.07, .05);
    if (boat){ tp = -clamp(Math.abs(v.speed) / v.max, 0, 1) * .12 + Math.sin(runTime * 1.7 + v.pos.z * .2) * .03; tr += Math.sin(runTime * 1.3 + v.pos.x * .2) * .045; }
    sp.rv += ((tr - sp.r) * 60 - sp.rv * 8) * dt; sp.r += sp.rv * dt;
    sp.pv += ((tp - sp.p) * 70 - sp.pv * 9) * dt; sp.p += sp.pv * dt;
    v.pitch = sp.p; v.roll = sp.r; if (!ramp) v.mesh.rotation.x = sp.p; v.mesh.rotation.z = sp.r;
  }
  // the wheels spin with the speed and the front ones steer
  if (v.wheels) for (const w of v.wheels){ w.mesh.rotation.x += v.speed / w.r * dt; if (w.front) w.pivot.rotation.y = v.steer * (v.type === 'moto' ? .35 : .5); }
  // traffic bump
  // a traffic car: push the two apart, and hurt only once per bump, by how hard it was (it used to repeat every frame)
  if (v.type !== 'boat'){ v.bumpT = Math.max(0, (v.bumpT || 0) - dt); for (const c of traffic){ const ddx = v.pos.x - c.position.x, ddz = v.pos.z - c.position.z, dd = Math.hypot(ddx, ddz), R0 = v.type === 'moto' ? 2.1 : 2.9; if (dd < R0){ const k = (R0 - dd) / (dd || 1); v.pos.x += ddx * k; v.pos.z += ddz * k;
      if (v.bumpT <= 0 && (Math.abs(v.speed) > 3 || c.userData.speed > 3)){ const imp = Math.abs(v.speed) + c.userData.speed * .5; v.bumpT = .9; if (!v.ai && typeof onVehicleCrash === 'function') onVehicleCrash(v, imp); if (!v.ai || v.pos.distanceTo(camera.position) < 40){ if (SFX.crashT <= 0){ crashSfx(imp); SFX.crashT = .6; } else thwack(); } if (!v.ai) shake = Math.min(.6, .15 + imp * .03); if (imp > 6 && !v.ai) heroDamage(clamp((imp - 6) * (v.type === 'moto' ? 2.2 : .7), 2, v.type === 'moto' ? 30 : 14) * DIFF.dmg, 'car'); v.speed = -Math.sign(v.speed || 1) * Math.min(4, Math.abs(v.speed) * .3); v.slip = 0; c.userData.speed = 0; v.dmg = (v.dmg || 0) + Math.min(20, imp); if (v.type === 'moto' && imp > 10){ throwRider(v, imp, true); return; } } } } }
}
// a vehicle that was shoved (a parked car you rammed) rolls on and turns until it stops or hits something
function vehicleKicks(dt){
  for (const o of vehicles){
    const k = o.kick; if (!k || o === hero.veh) continue;
    const nx = o.pos.x + k.x * dt, nz = o.pos.z + k.z * dt, ny = o.yaw + k.spin * dt;
    const bad = vCircles(o, nx, nz, ny).some(c => staticBlocked(c.x, c.z, c.r) || vehBlockedAt(c.x, c.z, c.r, o) || (o.type === 'boat' ? !inSea(c.x, c.z) : !inWorld(c.x, c.z)));
    if (bad){ k.x *= -.2; k.z *= -.2; k.spin *= -.3; } else { o.pos.x = nx; o.pos.z = nz; o.yaw = ny; o.mesh.rotation.y = ny; }
    const f = Math.exp(-dt * 2.6); k.x *= f; k.z *= f; k.spin *= Math.exp(-dt * 3);
    if (Math.hypot(k.x, k.z) < .15 && Math.abs(k.spin) < .05) o.kick = null;
  }
}
