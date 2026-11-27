// ================= wanted man (police mode) =================
const wanted = { d: wantedD, pos: new THREE.Vector3(), active: false, caught: false, state: 'idle', speed: 7, dirX: 0, dirZ: 1, retarget: 0, shoutT: 0 };
function spawnWanted(){ wanted.active = true; wanted.caught = false; wanted.d.root.visible = true; wanted.d.downT = 0; wanted.pos.copy(randomSidewalkPoint(70, hero.pos)); wanted.state = 'idle'; wanted.speed = 7 * DIFF.enemySpd; wanted.home = null; wanted.leash = 60; }
function arrestWanted(){ if (!wanted.active || wanted.caught) return; wanted.caught = true; wanted.d.downT = 99; say(wanted, 'خلاص خلاص… سلّمت!', 3, 'angry'); if (modeObj.onArrest) modeObj.onArrest(); }
function updateWanted(dt){
  if (!wanted.active) return;
  const p = wanted.pos; let vx = 0, vz = 0;
  if (!wanted.caught){
    const t = hero.veh ? hero.veh.pos : hero.pos; const dx = p.x - t.x, dz = p.z - t.z, dist = Math.hypot(dx, dz);
    const spotted = dist < 14 || (dist < 32 && lineOfSight(p.x, p.z, t.x, t.z));
    if (spotted){
      if (wanted.state !== 'flee'){ say(wanted, rpick(['مش هتمسكني!','يا نهار أبيض… الحكومة!','اجري يا واد!']), 2.5, 'angry'); }
      wanted.state = 'flee'; wanted.lostT = 0;
    } else if (wanted.state === 'flee'){ wanted.lostT = (wanted.lostT||0) + dt; if (wanted.lostT > 6) wanted.state = 'idle'; }
    if (wanted.state === 'flee'){
      wanted.retarget -= dt;
      if (wanted.retarget <= 0){
        wanted.retarget = .35; let best = -1e9, bx = 0, bz = 1; const ax = dx/(dist||1), az = dz/(dist||1);
        for (let i=0;i<16;i++){ const a = i/16*Math.PI*2, cx = Math.sin(a), cz = Math.cos(a); let score = (cx*ax + cz*az)*2 + Math.random()*.4 + (cx*wanted.dirX + cz*wanted.dirZ)*.6; if (staticBlocked(p.x+cx*3, p.z+cz*3, .5) || staticBlocked(p.x+cx*1.2, p.z+cz*1.2, .4)) score -= 6; const nx = p.x+cx*8, nz = p.z+cz*8; if (!inWorld(nx, nz)) score -= 4; if (wanted.home){ const hd = Math.hypot(nx - wanted.home.x, nz - wanted.home.z); if (hd > wanted.leash) score -= (hd - wanted.leash) * .35; } if (score > best){ best = score; bx = cx; bz = cz; } }
        wanted.dirX = bx; wanted.dirZ = bz;
      }
      vx = wanted.dirX*wanted.speed; vz = wanted.dirZ*wanted.speed; moveWithSlide(p, vx*dt, vz*dt, .4);
      wanted.shoutT -= dt; if (wanted.shoutT <= 0){ wanted.shoutT = R(5,8); say(wanted, rpick(['مش هتمسكني!','ابعد عني!','أنا مظلوم يا باشا!']), 2, 'angry'); }
    }
    if (hero.veh && Math.abs(hero.veh.speed) > 1.5){ for (const c of vCircles(hero.veh)) if (Math.hypot(c.x-p.x, c.z-p.z) < c.r + .7){ arrestWanted(); break; } }
  }
  p.y += (groundY(p.x, p.z) - p.y) * damp(15, dt);
  wanted.d.root.position.copy(p); wanted.vx = vx; wanted.vz = vz;
}
