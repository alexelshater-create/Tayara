// ================= the hero on foot: how he speeds up and stops, collisions, jumping, falling, stairs, swimming =================
// The sea's surface is at WATER_Y. Two public stairs go down from the corniche into the water (SEA_STAIRS, 04-world-layout).
// You can jump over the railing (corniche, bridge, pier) into the sea, swim anywhere along the city, and climb out
// onto the corniche, the pier or the bridge by pressing jump close to them.
const WATER_Y = -1.1;
const MOVE = { air: false, vy: 0, peak: 0, land: 0, swim: false, swimK: 0, climb: null, vault: null, jumpReq: 0, lx: undefined, lz: undefined, pitch: 0, tipT: 0 };
function wantJump(){ MOVE.jumpReq = .2; }

// past the sea wall, everything that isn't the bridge deck, the pier, the fort or a stair is water
function overWater(x, z){ return z > NILE_Z + .5 && !inWorld(x, z) && !stairAt(x, z); }
function stairAt(x, z){ for (const s of SEA_STAIRS) if (Math.abs(x - s.x) < s.hw && z > s.z0 && z < s.z1 + 1.2) return s; return null; }
function stairY(s, z){ return s.y0 + (s.y1 - s.y0) * clamp((z - s.z0) / (s.z1 - s.z0), 0, 1); }
// the floor under the hero: the street, a stair, or the top of something low he has jumped onto (a table, a bench, a drum)
function heroGround(x, z, feet){
  const s = stairAt(x, z); if (s) return stairY(s, z);
  if (!HOUSE.inside && overWater(x, z)) return WATER_Y - 4;   // the sea (also the strips beside the bridge): deep
  const g0 = groundY(x, z); let g = g0;
  if (feet !== undefined) ogQuery(x, z, feet > g0 + 2 ? .32 : .05, o => { if (o.h !== undefined && feet >= g0 + o.h - .25) g = Math.max(g, g0 + o.h); });   // up on the roofs the feet are wider than the gaps between them
  return g;
}
// where a swimmer may be: open sea, but not inside the rocks along the corniche (except at the stairs)
function swimOK(x, z){
  if (stairAt(x, z)) return true;
  if (!inSea(x, z)) return false;
  if (z < NILE_Z + 3.4 && !SEA_STAIRS.some(s => Math.abs(x - s.x) < 2.4)) return false;
  return true;
}
function heroBlockedAt(x, z, feet){
  const M = MOVE;
  if (HOUSE.inside) return !HOUSE.inRoom(x, z) || staticBlocked(x, z, PR, feet);
  if (M.vault) return false;                                    // diving over the railing: nothing stops it
  if (M.swim) return !swimOK(x, z) || vehBlockedAt(x, z, PR, hero.veh);
  if (!(inWorld(x, z) || stairAt(x, z) || (M.air && inSea(x, z)))) return true;
  const g0 = groundY(x, z);
  if (staticBlocked(x, z, PR, feet - g0) || vehBlockedAt(x, z, PR, hero.veh) || tramBlocks(x, z)) return true;
  if (!M.air && heroGround(x, z, feet) - feet > .45) return true;   // a step higher than a stair is a wall
  return false;
}
// jumping against a railing that has the sea behind it: a dive
function vaultDir(p, wx, wz){
  if (HOUSE.inside) return null;
  if (p.z > NILE_Z - 1.6 && p.z < NILE_Z && wz > .35 && Math.abs(p.x - BRIDGE.x) > BRIDGE.w / 2 + 6 && !(p.x > PIER.x0 - 1.5 && p.x < PIER.x1 + 1.5) && !SEA_STAIRS.some(s => Math.abs(p.x - s.x) < 2.2)) return { dx: 0, dz: 1, sp: 7.6 };
  const bx = p.x - BRIDGE.x;
  if (Math.abs(bx) < BRIDGE.w / 2 && p.z > NILE_Z + 3 && p.z < BRIDGE.z1 - 3 && Math.abs(bx) > BRIDGE.w / 2 - 1.9 && wx * Math.sign(bx) > .35) return { dx: Math.sign(bx), dz: 0, sp: 4.6 };
  if (p.x > PIER.x0 && p.x < PIER.x1 && p.z > NILE_Z + 2 && p.z < PIER.z1 - .5){ const side = p.x < (PIER.x0 + PIER.x1) / 2 ? -1 : 1, edge = side < 0 ? p.x - PIER.x0 : PIER.x1 - p.x; if (edge < 1.7 && wx * side > .35) return { dx: side, dz: 0, sp: 4.2 }; }
  return null;
}
// a swimmer next to the corniche, the pier or the bridge climbs out
function climbTarget(p){
  let t = null;
  if (p.z < NILE_Z + 4.8 && Math.abs(p.x - BRIDGE.x) > BRIDGE.w / 2 + 1 && p.x > X0 - 5 && p.x < XMAX + 5) t = [p.x, .15, NILE_Z - 1.3];
  else if (p.z > NILE_Z + 1 && p.z < PIER.z1 && p.x > PIER.x0 - 2.8 && p.x < PIER.x0) t = [PIER.x0 + 1, .15, p.z];
  else if (p.z > NILE_Z + 1 && p.z < PIER.z1 && p.x > PIER.x1 && p.x < PIER.x1 + 2.8) t = [PIER.x1 - 1, .15, p.z];
  else if (p.z > NILE_Z + 2 && p.z < BRIDGE.z1 - 2){ const dx = p.x - BRIDGE.x; if (Math.abs(dx) > BRIDGE.w / 2 && Math.abs(dx) < BRIDGE.w / 2 + 2.8) t = [BRIDGE.x + Math.sign(dx) * (BRIDGE.w / 2 - 1.3), 0, p.z]; }
  if (!t) return null;
  const [fx, fz] = freeSpot(t[0], t[2]); return new THREE.Vector3(fx, t[1], fz);
}
function splashFx(p){ noise(.5, 1500, .3); noise(.35, 420, .28, .05); for (let i = 0; i < 6; i++){ _t.set(p.x + R(-.6, .6), WATER_Y + .2, p.z + R(-.6, .6)); puff(_t, .5); } }
function resetMotion(){
  const M = MOVE, p = hero.pos;
  M.air = false; M.vy = 0; M.vault = null; M.climb = null; M.pipe = null; M.land = 0; M.jumpReq = 0;
  M.swim = !HOUSE.inside && overWater(p.x, p.z);
  if (M.swim) p.y = WATER_Y - 1.45;
}

function heroMotion(dt, wx, wz, mag, wantRun){
  const M = MOVE, p = hero.pos, v = hero.vel;
  if (M.lx !== undefined && (Math.hypot(p.x - M.lx, p.z - M.lz) > 4 || runTime - M.lt > .15)) resetMotion();   // something moved the hero (a scene, a door, a car) or he wasn't walking
  M.lt = runTime;
  if (M.jumpReq > 0) M.jumpReq -= dt;
  const jump = M.jumpReq > 0 && !hero.locked;
  if (pipeStep(dt)){ M.lx = p.x; M.lz = p.z; return; }   // climbing a drainpipe (19w)
  // ---- climbing out of the sea: a short pull-up, nothing else happens meanwhile ----
  if (M.climb){
    const c = M.climb; c.t += dt / c.dur; const k = Math.min(1, c.t), up = Math.min(1, k * 1.7), fw = Math.max(0, (k - .35) / .65);
    p.x = lerpN(c.from.x, c.to.x, fw); p.z = lerpN(c.from.z, c.to.z, fw); p.y = lerpN(c.from.y, c.to.y + .25, up) - (k > .85 ? (k - .85) / .15 * .25 : 0);
    v.set(0, 0, 0); hero.d.faceYaw = null; hero.d.yaw = Math.atan2(c.to.x - c.from.x, c.to.z - c.from.z);
    if (k >= 1){ M.climb = null; M.swim = false; M.air = false; p.copy(c.to); }
    M.lx = p.x; M.lz = p.z; return;
  }
  // ---- how fast he wants to go: a light push on the joystick walks slowly, a full one walks, the run button runs ----
  const k = mag > .05 ? 1 / mag : 0, dirX = wx * k, dirZ = wz * k;
  let spd = mag > .05 ? (M.swim ? 1.4 + .9 * Math.min(1, mag / .9) : 1.7 + 3.3 * Math.min(1, mag / .9)) : 0;
  const run = wantRun && !hero.tired && mag > .1;
  if (run){ spd = M.swim ? 3.6 : 9.2; hero.stamina -= dt * (M.swim ? .26 : .2); if (hero.stamina <= 0){ hero.stamina = 0; hero.tired = true; } }
  else { hero.stamina = Math.min(1, hero.stamina + dt * (M.swim ? .07 : .15)); if (hero.tired && hero.stamina > .35) hero.tired = false; }
  if (M.land > 0){ M.land -= dt; spd *= M.land > .5 ? 0 : .35; }
  // ---- speeding up and slowing down: he doesn't start or stop dead, and turning back at a run skids a little ----
  if (M.vault){ v.set(M.vault.dx * M.vault.sp, 0, M.vault.dz * M.vault.sp); }
  else {
    const tx = dirX * spd, tz = dirZ * spd, dx = tx - v.x, dz = tz - v.z, dl = Math.hypot(dx, dz);
    if (dl > 1e-4){
      const cur = Math.hypot(v.x, v.z), want = Math.hypot(tx, tz), back = v.x * tx + v.z * tz < 0;
      let a = M.air ? 5 : M.swim ? 4.5 : want > cur ? (run ? 12 : 17) : 24; if (back && !M.air) a *= 1.5;
      const s = Math.min(dl, a * dt); v.x += dx / dl * s; v.z += dz / dl * s;
    }
  }
  hero.knock.multiplyScalar(Math.exp(-dt * 5));
  // ---- moving, one axis at a time so he slides along walls instead of sticking to them ----
  const mx = (v.x + hero.knock.x) * dt, mz = (v.z + hero.knock.z) * dt;
  const stuck = !M.swim && heroBlockedAt(p.x, p.z, p.y);
  if (stuck && !M.air && !HOUSE.inside && p.y < groundY(p.x, p.z) + .6){ const [fx, fz] = freeSpot(p.x, p.z); if (Math.hypot(fx - p.x, fz - p.z) < 4){ p.x = fx; p.z = fz; } }   // squeezed into a wall: out to the nearest free spot
  let hitWall = false;
  if (stuck || !heroBlockedAt(p.x + mx, p.z, p.y)) p.x += mx; else { v.x = 0; hero.knock.x = 0; hitWall = true; }
  if (stuck || !heroBlockedAt(p.x, p.z + mz, p.y)) p.z += mz; else { v.z = 0; hero.knock.z = 0; hitWall = true; }
  // jumping against a wall that isn't too high: grab the edge and pull up (19w)
  if (M.air && !M.vault && hitWall && mag > .2 && M.vy < 4){ const L = ledgeAt(p, dirX, dirZ, 1.9); if (L){ startLedgeClimb(L); M.lx = p.x; M.lz = p.z; return; } }
  // people on the pavement: he doesn't walk through them, he squeezes past
  if (!M.swim && !HOUSE.inside) for (const n of npcs){
    if (n.state === 'hidden' || !n.g.visible) continue; const q = n.g.position, ex = p.x - q.x, ez = p.z - q.z, d = Math.hypot(ex, ez);
    if (d < .62 && d > 1e-3 && Math.abs(q.y - p.y) < 1.2){ const push = (.62 - d) * .6, nx = p.x + ex / d * push, nz = p.z + ez / d * push; if (!heroBlockedAt(nx, nz, p.y)){ p.x = nx; p.z = nz; } }
  }
  // ---- up and down ----
  if (SCENE.lockY){ M.lx = p.x; M.lz = p.z; return; }
  const g = heroGround(p.x, p.z, p.y);
  if (M.swim && !swimOK(p.x, p.z)){ let done = false; for (let r = .5; r < 9 && !done; r += .5) for (let a = 0; a < 6.28 && !done; a += .3){ const nx = p.x + Math.sin(a) * r, nz = p.z + Math.cos(a) * r; if (swimOK(nx, nz)){ p.x = nx; p.z = nz; done = true; } } }
  if (M.swim){
    const moving = Math.hypot(v.x, v.z) > .6; M.swimK += ((moving ? 1 : 0) - M.swimK) * damp(3, dt);
    const want = WATER_Y - lerpN(1.45, CLIPS_READY && CLIPS.swim ? .45 : .3, M.swimK)   /* the swim clip lies flat by itself, with the hips higher off the feet */ + Math.sin(runTime * 2.1) * .03;
    p.y += (want - p.y) * damp(5, dt);
    if (g > WATER_Y - 1 && stairAt(p.x, p.z)){ M.swim = false; M.swimK = 0; }       // the stairs are shallow enough to stand on
    else if (jump){ const to = climbTarget(p); M.jumpReq = 0; if (to){ M.climb = { from: p.clone(), to, t: 0, dur: 1.05 }; noise(.25, 1100, .12); } }
    if (M.swim && M.tipT <= 0 && climbTarget(p)){ M.tipT = 30; banner(isTouch ? 'دوس زرار النط علشان تطلع' : 'دوس مسافة (Space) علشان تطلع', 'info', 2.2); }
    if (M.tipT > 0) M.tipT -= dt;
  } else if (M.air){
    M.vy -= 22 * dt; p.y += M.vy * dt; M.peak = Math.max(M.peak, p.y);
    if (overWater(p.x, p.z) && p.y <= WATER_Y - .25){ M.air = false; M.vault = null; M.swim = true; M.swimK = .3; M.vy = 0; splashFx(p); }
    else if (p.y <= g && M.vy <= 0){
      const drop = M.peak - g; p.y = g; M.air = false; M.vault = null; M.vy = 0;
      if (drop > 4.2){ heroDamage(drop > 14 ? 999 : (drop - 4.2) * 11 + 8, 'fall'); hero.d.downT = 1.1; M.land = 1.2; thud(1); }   // off a roof: a few floors kill
      else if (drop > 1.6){ M.land = .32; thud(.6); }
      else { M.land = .07; if (drop > .5) stepSfx(4); }
    }
  } else {
    if (g < p.y - .35){ M.air = true; M.vy = 0; M.peak = p.y; }                   // walked off a ledge (a bench, a table)
    else p.y += (g - p.y) * damp(18, dt);                                         // curbs and stairs: smooth
    if (!M.air && g < WATER_Y - 1.05 && (stairAt(p.x, p.z) || overWater(p.x, p.z))){ M.swim = true; M.swimK = 0; splashFx(p); }   // walked down into deep water
    else if (!M.air && jump && M.land <= .5){
      M.jumpReq = 0; const L = mag > .2 ? ledgeAt(p, dirX, dirZ) : null;
      if (L){ startLedgeClimb(L); M.lx = p.x; M.lz = p.z; return; }   // something to climb right ahead: pull up onto it
      M.vault = vaultDir(p, dirX * Math.min(1, mag * 2), dirZ * Math.min(1, mag * 2));
      M.air = true; M.vy = M.vault ? 6.5 : 6.2; M.peak = p.y; hero.stamina = Math.max(0, hero.stamina - .04);
      noise(.12, 900, .06); if (M.vault) tone(300, 520, .2, 'sine', .05);
    }
  }
  M.lx = p.x; M.lz = p.z;
}
// which body pose goes with what the hero is doing now (read by the main loop before it animates him)
function heroMotionPose(hd, dt){
  const M = MOVE; let pitch = 0;
  if (hero.veh || CUT.on){ M.pitch = 0; hd.pitch = 0; return; }
  if (M.climb || M.pipe) hd.forceMove = 'climb';
  else if (M.swim){ hd.forceMove = M.swimK > .5 ? 'swim' : 'tread'; pitch = CLIPS_READY && CLIPS.swim ? 0 : M.swimK * 1.35; }
  else if (M.air) hd.forceMove = M.vy > .5 ? 'jump' : M.peak - hero.pos.y > 1.3 ? 'fall' : 'jump';
  else if (M.land > .05 && hd.downT <= 0) hd.forceMove = M.land > .2 ? 'landHard' : 'land';
  if (POL.panel) hd.forceMove = 'kneel';   // caught by the police
  M.pitch += (pitch - M.pitch) * damp(5, dt); hd.pitch = M.pitch;
  if (hd.blob) hd.blob.visible = !M.swim && !M.air && !M.climb;
}
