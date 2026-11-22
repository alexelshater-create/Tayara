// ================= enemy (hates the hero) =================
const enemy = { d: enemyD, pos: new THREE.Vector3(), vel: new THREE.Vector3(), hp: 100, active: false, state: 'roam', cd: 0, atk: 0, block: 0, t: 0, dir: 1, tauntT: 0 };
const ENEMY_LINES = ['انت تاني يا طيارة!','تعالى هنا!','مش طايقك!','النهارده يومك!','هتروح فين مني؟'];
function spawnEnemy(){ enemy.active = true; enemy.d.root.visible = true; enemy.hp = 100; enemy.state = 'roam'; enemy.cd = 6; const p = randomSidewalkPoint(45, hero.pos); enemy.pos.copy(p); enemy.block = blocksInfo.findIndex(b => Math.abs(p.x-b.cx) < 20 && Math.abs(p.z-b.cz) < 20); if (enemy.block < 0) enemy.block = 0; enemy.t = R(0,4); enemy.d.downT = 0; }
function hitEnemy(dmg, from){
  enemy.hp -= dmg; thwack(); const dx = enemy.pos.x - from.x, dz = enemy.pos.z - from.z, d = Math.hypot(dx,dz)||1;
  moveWithSlide(enemy.pos, dx/d*1.2, dz/d*1.2);
  if (enemy.hp <= 0){ enemy.d.downT = 6; enemy.state = 'down'; enemy.cd = 12; enemy.hp = enemy.maxHp || 100; say(enemy, 'ماشي يا طيارة… هترجعلي', 3, 'angry'); if (modeObj.onEnemyDown) modeObj.onEnemyDown(); }
  else say(enemy, rpick(['آه!','ماشي!','بتضربني؟!']), 1.2, 'angry');
}
function updateEnemy(dt){
  if (!enemy.active) return;
  if (enemy.ally){ allyUpdate(dt); return; }
  const p = enemy.pos, target = hero.veh ? hero.veh.pos : hero.pos;
  const dx = target.x - p.x, dz = target.z - p.z, dist = Math.hypot(dx, dz);
  let vx = 0, vz = 0;
  if (enemy.cd > 0) enemy.cd -= dt;
  if (enemy.d.downT > 0 || enemy.state === 'wait'){ if (enemy.state === 'wait'){ p.copy(ENEMY_WAIT); enemy.tauntT -= dt; if (enemy.tauntT <= 0 && p.distanceTo(hero.pos) < 14){ enemy.tauntT = R(5,8); say(enemy, rpick(['تعالى نتسابق يا طيارة','خايف؟','موتوسيكلك خردة']), 2.2, 'angry'); } } }
  else {
    if (enemy.state === 'down') enemy.state = 'roam';
    const sees = dist < 24 && enemy.cd <= 0 && lineOfSight(p.x, p.z, target.x, target.z);
    if (sees && enemy.state !== 'chase'){ enemy.state = 'chase'; say(enemy, rpick(ENEMY_LINES), 2.4, 'angry'); }
    if (enemy.state === 'chase'){
      if (dist > 40){ enemy.state = 'roam'; }
      else if (dist > 1.1){ const sp = (enemy.boss ? 7.2 : 6.4) * DIFF.enemySpd; vx = dx/dist*sp; vz = dz/dist*sp; moveWithSlide(p, vx*dt, vz*dt); }
      enemy.tauntT -= dt; if (enemy.tauntT <= 0){ enemy.tauntT = R(4,7); say(enemy, rpick(ENEMY_LINES), 2, 'angry'); }
      if (dist < 1.45 && !hero.veh){ enemy.atk -= dt; if (enemy.atk <= 0){ enemy.atk = .95; enemy.d.punchT = .28; enemy.d.punchSide = (dx*Math.cos(camYaw) - dz*Math.sin(camYaw)) >= 0 ? -1 : 1; setTimeout(() => { if (enemy.active && enemy.d.downT <= 0 && enemy.pos.distanceTo(hero.pos) < 1.8) { heroDamage((enemy.boss ? 12 : 8) * DIFF.dmg, 'enemy'); hero.knock.set(dx/dist*-0, 0, 0); } }, 130); } }
    } else {
      const b = blocksInfo[enemy.block]; const old = perimPos(b, enemy.t); enemy.t += enemy.dir * 1.3 * dt / 33.2; const np = perimPos(b, enemy.t);
      const tx = np[0], tz = np[1]; const ddx = tx - p.x, ddz = tz - p.z, dd = Math.hypot(ddx, ddz);
      if (dd > 2) { vx = ddx/dd*3; vz = ddz/dd*3; moveWithSlide(p, vx*dt, vz*dt); } else { vx = (np[0]-old[0])/dt; vz = (np[1]-old[1])/dt; p.x = tx; p.z = tz; }
    }
  }
  // getting run over
  if (hero.veh && Math.abs(hero.veh.speed) > 4 && enemy.d.downT <= 0){ for (const c of vCircles(hero.veh)) if (Math.hypot(c.x-p.x, c.z-p.z) < c.r + .5){ hitEnemy(60, hero.veh.pos); enemy.d.downT = Math.max(enemy.d.downT, 4); break; } }
  p.y += (groundY(p.x, p.z) - p.y) * damp(15, dt);
  enemy.d.root.position.copy(p);
  enemy.vel.set(vx, 0, vz);
}
