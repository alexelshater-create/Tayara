// ================= main update =================
let chatterT = 3;
function update(dt, t){
  beatTick();
  const playing = state === 'play';
  if (playing){
    runTime += dt;
    if (modeObj.time !== undefined){ modeObj.time -= dt; if (modeObj.time <= 0){ modeObj.time = 0; modeObj.onTime && modeObj.onTime(); } }
    // input
    let ix = 0, iz = 0;
    if (keys.KeyW || keys.ArrowUp) iz -= 1; if (keys.KeyS || keys.ArrowDown) iz += 1; if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
    ix += joy.vx; iz += joy.vz; let mag = Math.hypot(ix, iz); if (mag > 1){ ix /= mag; iz /= mag; mag = 1; }
    if (hero.locked){ ix = iz = 0; mag = 0; }
    if (hero.veh){
      driveVehicle(hero.veh, dt, ix, iz, keys.Space || runBtn);
      hero.pos.copy(hero.veh.pos);
      // run over NPCs
      if (Math.abs(hero.veh.speed) > 3) for (const n of npcs){ if (n.state === 'hidden' || n.state === 'down') continue; for (const c of vCircles(hero.veh)) if (Math.hypot(c.x-n.g.position.x, c.z-n.g.position.z) < c.r + .45){ npcHit(n, 2); break; } }
      if (hero.veh === copCar){ const on = Math.floor(t*7)%2 === 0; copCar.mesh.userData.red.emissiveIntensity = on ? 3 : .2; copCar.mesh.userData.blue.emissiveIntensity = on ? .2 : 3; if (sirenGain && !chaser.active) sirenGain.gain.value = .05; }
      else if (sirenGain && !chaser.active) sirenGain.gain.value = 0;
    } else {
      if (sirenGain && !chaser.active) sirenGain.gain.value = 0;
      // walking: input relative to the camera direction
      const cy = Math.cos(camYaw), sy = Math.sin(camYaw);
      const wx = ix*cy + iz*sy, wz = -ix*sy + iz*cy;
      const wantRun = (keys.ShiftLeft || keys.ShiftRight || runBtn || joy.mag > .93) && mag > .1;
      let spd = 5;
      if (wantRun && !hero.tired){ spd = 9.2; hero.stamina -= dt*.2; if (hero.stamina <= 0){ hero.stamina = 0; hero.tired = true; } }
      else { hero.stamina = Math.min(1, hero.stamina + dt*.15); if (hero.tired && hero.stamina > .35) hero.tired = false; }
      _t.set(wx*spd, 0, wz*spd); hero.vel.lerp(_t, damp(12, dt)); hero.knock.multiplyScalar(Math.exp(-dt*5));
      const mx = (hero.vel.x + hero.knock.x)*dt, mz = (hero.vel.z + hero.knock.z)*dt; const p = hero.pos;
      if (!blocked(p.x+mx, p.z)) p.x += mx; else { hero.vel.x = 0; hero.knock.x = 0; }
      if (!blocked(p.x, p.z+mz)) p.z += mz; else { hero.vel.z = 0; hero.knock.z = 0; }
      p.x = clamp(p.x, -LIMIT, LIMIT); p.z = clamp(p.z, -LIMIT, LIMIT); p.y += (groundY(p.x, p.z) - p.y) * damp(18, dt);
    }
    if (hero.inv > 0) hero.inv -= dt;
    hero.hurtT += dt; if (hero.hurtT > 5 && hero.hp < 100) hero.hp = Math.min(100, hero.hp + dt*2);
    // mode logic
    if (modeId === 'cash'){
      for (const c of cash){ if (c.taken) continue; if (Math.hypot(c.x-hero.pos.x, c.z-hero.pos.z) < 1.4){ c.taken = true; c.pop = .001; modeObj.got++; modeObj.money += c.value; coin(); if (modeObj.got === 15){ const best = parseFloat(store.get('ty_best_cash')||'0'); let bt = ''; if (!best || runTime < best){ store.set('ty_best_cash', String(runTime)); bt = 'رقم قياسي جديد! 🏆'; } else bt = `أحسن وقت: ${fmtTime(best)}`; endMode('لميت كل الفلوس! 💰', `${heroName} لم ${egp(modeObj.money)} في ${fmtTime(runTime)}.`, bt); break; } if (!chaser.active) spawnChaser(); else banner(`+${c.value} جنيه`, 'ok', 1.1); } }
      updateChaser(dt);
    }
    if (modeId === 'ahwa' || modeObj.job === 'ahwa') updateAhwa(dt);
    if (modeId === 'story') updateStory(dt);
    if (modeId === 'foul' || modeObj.job === 'foul') updateFoul(dt);
    if (ST.kind) updateStation(dt, t);
    // traffic hits on foot
    if (!hero.veh && hero.inv <= 0) for (const c of traffic){ const L = carLocal(c, hero.pos); if (Math.abs(L.along) < c.userData.len && Math.abs(L.lat) < 1.2){ heroDamage((modeId === 'cash' ? 34 : 25) * DIFF.dmg, 'car'); hero.inv = 1.6; const fx = Math.sin(c.rotation.y), fz = Math.cos(c.rotation.y), side = L.lat >= 0 ? 1 : -1; hero.knock.set(fz*side*9 + fx*c.userData.speed*.5, 0, -fx*side*9 + fz*c.userData.speed*.5); horn(); break; } }
    // random street chatter
    chatterT -= dt;
    if (chatterT <= 0){ chatterT = R(4, 8); const near = npcs.filter(n => (n.state === 'walk' || n.state === 'sit' || n.state === 'domino') && n.g.position.distanceTo(hero.pos) < 16); if (near.length){ const n = rpick(near); say(n, rpick(n.state === 'domino' ? ['دومنو يا جدعان!','قفلتها عليك','هات الشيش'] : ['صباح الفل يا معلم','إزيك يا '+heroName+'!','الجو حر النهارده','حد شاف الواد ده؟','يا عم ركز في الطريق','الشاي هنا مفيش زيه','فين أيامك يا '+heroName,'الماتش النهارده الساعة كام؟']), 2.6); } }
  }
  // traffic
  for (const c of traffic){
    const u = c.userData; let target = u.base;
    for (const o of traffic){ if (o === c) continue; const w = o.userData; if (w.axis !== u.axis || w.road !== u.road || w.dir !== u.dir) continue; const ahead = (w.s - u.s) * u.dir; if (ahead > 0 && ahead < 10) target = Math.min(target, ahead < 6 ? 0 : w.speed); }
    if (hero.veh){ const L = carLocal(c, hero.veh.pos); if (L.along > 0 && L.along < 9 && Math.abs(L.lat) < 1.8) target = 0; }
    u.speed += (target - u.speed) * damp(3, dt); u.s += u.speed * u.dir * dt;
    if (u.s * u.dir > HALF + 25) u.s = -(HALF + 25) * u.dir;
    placeTraffic(c);
    if (playing && Math.random() < dt*.02 && c.position.distanceTo(hero.pos) < 30) horn();
  }
  npcs.forEach(n => updateNPC(n, dt));
  if (playing){ updateEnemy(dt); updateWanted(dt); updateThief(dt, t); }
  updatePhotoSeats(dt, t);
  // cash animation
  for (const c of cash){ if (!c.g.visible) continue; if (c.taken){ c.pop += dt; c.g.position.y = c.pop*6; c.g.scale.setScalar(Math.max(0, 1 - c.pop*2.5)); if (c.pop > .4) c.g.visible = false; continue; } c.st.rotation.y = t*1.6; c.st.position.y = 1 + Math.sin(t*2.4 + c.x)*.15; }
  // hero visuals
  const hd = hero.d;
  if (hero.veh){
    const v = hero.veh;
    if (v.type === 'moto'){ hd.root.visible = true; hd.P.legL.visible = hd.P.legR.visible = false; hd.root.position.set(v.pos.x - Math.sin(v.yaw)*.25, v.pos.y + .86 - hd.hipY, v.pos.z - Math.cos(v.yaw)*.25); animDoll(hd, 0, 0, dt, t); }
    else hd.root.visible = false;
  } else { hd.root.visible = !ST.kind; hd.P.legL.visible = hd.P.legR.visible = true; hd.root.position.copy(hero.pos); animDoll(hd, hero.vel.x, hero.vel.z, dt, t); hd.doll.visible = !(hero.inv > 0 && Math.floor(hero.inv*12) % 2 === 1); }
  if (enemy.active) animDoll(enemy.d, enemy.vel.x, enemy.vel.z, dt, t);
  if (wanted.active) animDoll(wanted.d, wanted.vx||0, wanted.vz||0, dt, t);
  if (trayGroup.visible){ trayGroup.position.set(hero.pos.x + Math.cos(camYaw)*.45, hero.pos.y + 1.2, hero.pos.z - Math.sin(camYaw)*.45); }
  updateCamera(dt);
  updateBubbles(dt); updateSteam(dt);
  // crowd ambience
  if (crowdGain){ const near = playing ? npcs.filter(n => n.state !== 'hidden' && n.g.position.distanceTo(hero.pos) < 18).length : 0; crowdGain.gain.value += ((muted ? 0 : Math.min(.05, near*.006)) - crowdGain.gain.value) * damp(2, dt); }
  if (playing){
    computeAction();
    const pr = $('prompt'); if (nearAction){ pr.innerHTML = `<kbd>E</kbd>${nearAction.text}`; pr.classList.add('show'); } else pr.classList.remove('show');
    if (bannerT > 0){ bannerT -= dt; if (bannerT <= 0) $('banner').className = 'banner'; }
    if (chaser.active && bannerT <= 0) banner('🚨 البوليس وراك!', 'police', 1.5);
    hudT -= dt; if (hudT <= 0){ hudT = .2; updateHud(); if (modeObj.hud) $('objText').innerHTML = modeObj.hud(); if (modeObj.hudTitle) $('objTitle').textContent = modeObj.hudTitle(); }
    drawRadar(t);
  }
}
let hudT = 0;

addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
hero.pos.copy(SPOT.spawn); resetWorld(); seatDeco(WALKERS);
camera.position.set(SPOT.spawn.x + 6, 5, SPOT.spawn.z + 9); lookAt.copy(SPOT.spawn);
const clock = new THREE.Clock(); let elapsed = 0;
let fpsAcc = 0, fpsN = 0, pxr = renderer.getPixelRatio();
renderer.setAnimationLoop(() => { const raw = clock.getDelta(), dt = Math.min(raw, .05); elapsed += dt; update(dt, elapsed); renderer.render(scene, camera);
  if (state === 'play'){ fpsAcc += raw; fpsN++; if (fpsN >= 150){ const avg = fpsAcc/fpsN; if (avg > 1/30 && pxr > .8){ pxr = Math.max(.8, pxr - .2); renderer.setPixelRatio(pxr); renderer.setSize(innerWidth, innerHeight); } else if (avg > 1/24 && sun.castShadow){ sun.castShadow = false; } fpsAcc = 0; fpsN = 0; } } });
renderModes();
$('loadMsg').textContent = 'اختار مود وابدأ.';
window.__game = { hero, enemy, wanted, vehicles, npcs, keys, get state(){ return state; }, get mode(){ return modeObj; }, startMode, action, punch, dbg: { ST, AH, FL, DOM, ahwaTap, ahwaHold, foulTap, stationBtn, enterStation, exitStation, openDomino, playerPick, SA, SF, get SAVE(){ return SAVE; }, completeMission, startJob, endJob, race, buyVehicle, MISSIONS, startRace, openShop, renderModes, thief, thiefStart, thiefCaught, islamD, CAM }, step(n=60){ for (let i=0;i<n;i++){ elapsed += 1/60; update(1/60, elapsed); } renderer.render(scene, camera); } };
