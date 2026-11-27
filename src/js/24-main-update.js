// ================= main update =================
let chatterT = 3;
function update(dt, t){
  tickCutscene(dt);
  beatTick(); sfxUpdate(dt, t);
  const playing = state === 'play';
  if (document.body.classList.contains('driving') !== !!hero.veh){ document.body.classList.toggle('driving', !!hero.veh); hideSteerHint(); for (const k in pedal) pedal[k] = false; }
  if (playing){
    runTime += dt;
    if (modeObj.time !== undefined){ modeObj.time -= dt; if (modeObj.time <= 0){ modeObj.time = 0; modeObj.onTime && modeObj.onTime(); } }
    // input
    let ix = 0, iz = 0;
    if (keys.KeyW || keys.ArrowUp) iz -= 1; if (keys.KeyS || keys.ArrowDown) iz += 1; if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
    ix += joy.vx; iz += joy.vz; let mag = Math.hypot(ix, iz); if (mag > 1){ ix /= mag; iz /= mag; mag = 1; }
    if (hero.locked){ ix = iz = 0; mag = 0; }
    if (hero.veh){
      const tz = clamp(iz + (pedal.brake ? 1 : 0) - (pedal.gas ? 1 : 0), -1, 1);
      driveVehicle(hero.veh, dt, isTouch && joy.id !== null ? Math.sign(ix) * Math.pow(Math.abs(ix), 1.35) : ix, tz, keys.Space || runBtn);
      if (hero.veh) hero.pos.copy(hero.veh.pos);
      // run over NPCs
      if (hero.veh && Math.abs(hero.veh.speed) > 3) for (const n of npcs){ if (n.state === 'hidden' || n.state === 'down') continue; for (const c of vCircles(hero.veh)) if (Math.hypot(c.x-n.g.position.x, c.z-n.g.position.z) < c.r + .45){ npcHit(n, 2); npcLaunch(n, hero.veh); break; } }
      if (hero.veh === copCar){ const on = Math.floor(t*7)%2 === 0; copCar.mesh.userData.red.emissiveIntensity = on ? 3 : .2; copCar.mesh.userData.blue.emissiveIntensity = on ? .2 : 3; if (sirenGain && !chaser.active) sirenGain.gain.value = .05; }
      else if (sirenGain && !chaser.active) sirenGain.gain.value = 0;
    } else if (CUT.on){ if (!SCENE.lockY) hero.pos.y += (groundY(hero.pos.x, hero.pos.z) - hero.pos.y) * damp(18, dt); } else {
      if (sirenGain && !chaser.active) sirenGain.gain.value = 0;
      // walking: input relative to the camera direction
      const cy = Math.cos(camYaw), sy = Math.sin(camYaw);
      const wx = ix*cy + iz*sy, wz = -ix*sy + iz*cy;
      const wantRun = (keys.ShiftLeft || keys.ShiftRight || runBtn || joy.mag > .93) && mag > .1;
      if (keys.Space) wantJump();
      heroMotion(dt, wx, wz, mag * meleeMoveScale(), wantRun && !MEL.atk && !MEL.block);   // 12b-hero-motion.js
    }
    if (hero.inv > 0) hero.inv -= dt;
    hero.hurtT += dt; if (hero.hurtT > 5 && hero.hp < 100) hero.hp = Math.min(100, hero.hp + dt*2);
    // mode logic
    if (modeId === 'cash'){
      for (const c of cash){ if (c.taken) continue; if (Math.hypot(c.x-hero.pos.x, c.z-hero.pos.z) < 1.4){ c.taken = true; c.pop = .001; modeObj.got++; modeObj.money += c.value; coin(); if (modeObj.got === 15){ const best = parseFloat(store.get('ty_best_cash')||'0'); let bt = ''; if (!best || runTime < best){ store.set('ty_best_cash', String(runTime)); bt = 'رقم قياسي جديد!'; } else bt = `أحسن وقت: ${fmtTime(best)}`; endMode('لميت كل الفلوس!', `${heroName} لم ${egp(modeObj.money)} في ${fmtTime(runTime)}.`, bt); break; } if (!chaser.active) spawnChaser(); else banner(`+${c.value} جنيه`, 'ok', 1.1); } }
      updateChaser(dt);
    }
    if (modeId === 'ahwa' || modeObj.job === 'ahwa') updateAhwa(dt);
    if (modeId === 'story') updateStory(dt);
    if (modeId === 'foul' || modeObj.job === 'foul') updateFoul(dt);
    if (ST.kind) updateStation(dt, t);
    updateJobs(dt); updateRhythm(dt); updateExtras(dt, t); updateActivities(dt, t); updateLife(dt, t);
    // traffic hits on foot
    if (!hero.veh && hero.inv <= 0 && !CUT.on && !HOUSE.inside) for (const c of traffic){ const L = carLocal(c, hero.pos); if (Math.abs(L.along) < c.userData.len && Math.abs(L.lat) < 1.2){ heroDamage((modeId === 'cash' ? 34 : 25) * DIFF.dmg, 'car'); hero.inv = 1.6; const fx = Math.sin(c.rotation.y), fz = Math.cos(c.rotation.y), side = L.lat >= 0 ? 1 : -1; hero.knock.set(fz*side*9 + fx*c.userData.speed*.5, 0, -fx*side*9 + fz*c.userData.speed*.5); horn(); break; } }
    // random street chatter
    chatterT -= dt;
    if (chatterT <= 0 && !CUT.on){ chatterT = R(4, 8); const near = npcs.filter(n => (n.state === 'walk' || n.state === 'sit' || n.state === 'domino') && n.g.position.distanceTo(hero.pos) < 16); if (near.length){ const n = rpick(near); say(n, rpick(n.state === 'domino' ? ['دومنو يا جدعان!','قفلتها عليك','هات الشيش'] : ['صباح الفل يا معلم','إزيك يا '+heroName+'!','الجو حر النهارده','حد شاف الواد ده؟','يا عم ركز في الطريق','الشاي هنا مفيش زيه','فين أيامك يا '+heroName,'الماتش النهارده الساعة كام؟']), 2.6); } }
  }
  // traffic
  for (const c of traffic){
    trafficStep(c, dt, t, playing);
    if (playing && Math.random() < dt*.01 && c.position.distanceTo(hero.pos) < 30) horn();
  }
  updateTram(dt, t, playing); vehicleKicks(dt); updateCityLife(dt); updateCityStreets(dt);
  storyFxTick(dt, t); updateStage5(dt, t);
  waterTex.offset.x += dt * .006; waterTex.offset.y = Math.sin(t * .35) * .03;   // the sea moves a little
  npcs.forEach(n => updateNPC(n, dt)); meleeUpdate(dt); weaponsUpdate(dt); carsAliveUpdate(dt, t); streetLifeUpdate(dt, t); cityMovesUpdate(dt); deathSceneUpdate(dt); updateWorldMarks(dt); updateOpenWorld(dt, t); if (!HOUSE.inside){ const f = hero.veh ? hero.veh.pos : hero.pos; updateCity(f.x, f.z); updateLandmarks(f); updateBeaches(f); updateAround(f); updateCityTrams(dt); }
  if (playing && !CUT.on){ updateEnemy(dt); updateWanted(dt); updateThief(dt, t); }
  for (const f of feluccas){ f.g.position.x += f.sp*dt; if (f.g.position.x > 60) f.g.position.x = -260; else if (f.g.position.x < -260 && f.sp < 0) f.g.position.x = 60; f.g.position.y = -1 + Math.sin(t*.8 + f.ph)*.06; f.g.rotation.z = Math.sin(t*.6 + f.ph)*.03; }
  updatePhotoSeats(dt, t);
  // cash animation
  for (const c of cash){ if (!c.g.visible) continue; if (c.taken){ c.pop += dt; c.g.position.y = c.pop*6; c.g.scale.setScalar(Math.max(0, 1 - c.pop*2.5)); if (c.pop > .4) c.g.visible = false; continue; } c.st.rotation.y = t*1.6; c.st.position.y = 1 + Math.sin(t*2.4 + c.x)*.15; }
  // hero visuals
  const hd = hero.d;
  if (hero.veh){
    const v = hero.veh;
    if (v.type === 'moto'){ const ln = v.lean || 0; hd.root.visible = true; hd.P.legL.visible = hd.P.legR.visible = false; hd.root.position.set(v.pos.x - Math.sin(v.yaw)*.25, v.pos.y + .86 - hd.hipY, v.pos.z - Math.cos(v.yaw)*.25); hd.faceYaw = v.yaw; hd.roll = -ln; animDoll(hd, 0, 0, dt, t); }
    else hd.root.visible = false;
  } else { hd.root.visible = !ST.kind && !TRAMR.on && !SCENE.hideHero; hd.P.legL.visible = hd.P.legR.visible = true; hd.root.position.copy(hero.pos); hd.roll = 0; heroMotionPose(hd, dt); animDoll(hd, hero.vel.x, hero.vel.z, dt, t); cheerPose(dt); hd.doll.visible = !(hero.inv > 0 && Math.floor(hero.inv*12) % 2 === 1); }
  if (enemy.active && !CUT.idle.has(enemy.d)) animDoll(enemy.d, enemy.vel.x, enemy.vel.z, dt, t);
  if (wanted.active && !CUT.idle.has(wanted.d)) animDoll(wanted.d, wanted.vx||0, wanted.vz||0, dt, t);
  if (trayGroup.visible){ trayGroup.position.set(hero.pos.x + Math.cos(camYaw)*.45, hero.pos.y + 1.2, hero.pos.z - Math.sin(camYaw)*.45); }
  updateCamera(dt);
  updateBubbles(dt); updateSteam(dt);
  // crowd ambience
  if (crowdGain){ const near = playing ? npcs.filter(n => n.state !== 'hidden' && n.g.position.distanceTo(hero.pos) < 18).length : 0; crowdGain.gain.value += ((muted ? 0 : Math.min(.05, near*.006)) - crowdGain.gain.value) * damp(2, dt); }
  if (playing){
    computeAction();
    const pr = $('prompt'); if (nearAction){ pr.innerHTML = `<kbd>E</kbd>${nearAction.text}`; pr.classList.add('show'); } else pr.classList.remove('show');
    { const al = $('actLbl'), ab = $('actBtn'), tx = nearAction ? AR(nearAction.text) : ''; if (al.textContent !== tx) al.textContent = tx; ab.classList.toggle('has', !!nearAction); }
    if (bannerT > 0){ bannerT -= dt; if (bannerT <= 0) $('banner').className = 'banner'; }
    if (chaser.active && bannerT <= 0) banner('البوليس وراك!', 'police', 1.5);
    hudT -= dt; if (hudT <= 0){ hudT = .2; updateHud(); if (ACT.kind && ACTS[ACT.kind].hud){ hudCounter(ACTS[ACT.kind].hud(ACT.d)); } else if (JOB.kind && modeId !== 'story'){ hudCounter(jobHud()); } else if (modeId === 'story'){ hudCounter(''); if (modeObj.hud) hudHint(modeObj.hud().replace(/<br><small[\s\S]*$/, '')); } else if (modeId === 'free'){ hudCounter(''); } else hudCounter(modeObj.hud ? modeObj.hud() : ''); /* the story: the objective line; free roam: nothing; the other modes: their counters */ }
    drawRadar(t);
  }
}
let hudT = 0;

addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });   // pixel ratio is kept by applyGfx()
hero.pos.copy(SPOT.spawn); resetWorld(); seatDeco(WALKERS); applyTimeOfDay(15); setNoEntryShown(1); setPostersShown(true);
camera.position.set(SPOT.spawn.x + 6, 5, SPOT.spawn.z + 9); lookAt.copy(SPOT.spawn);
const clock = new THREE.Clock(); let elapsed = 0;
let fpsAcc = 0, fpsN = 0, pxr = renderer.getPixelRatio();
// graphics + FPS settings
const GFX_NAME = { low: 'خفيف', mid: 'عادي', high: 'عالي' };
let showFps = store.get('ty_fps') === '1'; const fpsT = { n: 0, t: 0 };
function renderGfxBtns(){ $('gfxBtn').textContent = GFX_NAME[GFX]; $('fpsBtn').textContent = showFps ? 'ظاهر' : 'مخفي'; $('fpsBox').hidden = !showFps; }
$('gfxBtn').onclick = () => { GFX = GFX === 'low' ? 'mid' : GFX === 'mid' ? 'high' : 'low'; store.set('ty_gfx', GFX); applyGfx(); gfxWorld(); renderGfxBtns(); if (state === 'play' || state === 'pause') banner('عدد الناس والعربيات في الشارع بيتغير لما تفتح اللعبة تاني', 'info', 2.5); };
$('fpsBtn').onclick = () => { showFps = !showFps; store.set('ty_fps', showFps ? '1' : '0'); renderGfxBtns(); };
// the parts of the graphics level that touch the world (after it is built)
function gfxWorld(){
  BUILD_CULL2 = (scene.fog.far + 15) ** 2;
  for (const b of buildings) b.grp.children.forEach(m => { m.castShadow = GFX === 'high'; });   // buildings cast shadows on high only; people and cars always do
}
chunkInstances();
gfxWorld();
renderGfxBtns();
renderer.setAnimationLoop(() => { const raw = clock.getDelta(), dt = Math.min(raw, .05); sky.position.copy(camera.position);   /* the sky goes with you (the city is wider than the sky's box) */ if (showFps){ fpsT.n++; fpsT.t += raw; if (fpsT.t >= .5){ $('fpsBox').textContent = `${Math.round(fpsT.n / fpsT.t)} FPS · ${GFX_NAME[GFX]}`; fpsT.n = 0; fpsT.t = 0; } } const sdt = dt * meleeTimeScale(dt) * sceneTimeScale(); elapsed += sdt; if (PHOTO.on) photoTick(dt, elapsed); else update(sdt, elapsed); renderer.render(scene, camera);
  if (state === 'play'){ fpsAcc += raw; fpsN++; if (fpsN >= 150){ const avg = fpsAcc/fpsN; if (avg > 1/30 && pxr > .8){ pxr = Math.max(.8, pxr - .2); renderer.setPixelRatio(pxr); renderer.setSize(innerWidth, innerHeight); } else if (avg > 1/24 && sun.castShadow){ sun.castShadow = false; } else if (avg > 1/24 && GFX !== 'low'){ GFX = 'low'; applyGfx(); gfxWorld(); renderGfxBtns(); pxr = renderer.getPixelRatio(); }   /* still slow: light graphics for this session (not saved) */ fpsAcc = 0; fpsN = 0; } } });
renderModes();
loadDone(); introOnLoad();
window.__game = { hero, enemy, wanted, vehicles, npcs, keys, get state(){ return state; }, get mode(){ return modeObj; }, startMode, action, punch, dbg: { rinfo(){ return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures }; }, camShot(x, y, z, lx, lz){ CUT.on = true; camera.position.set(x, y, z); lookAt.set(lx, 0, lz); camera.lookAt(lookAt); }, camOff(){ CUT.on = false; }, graphNearest, obstacles, keysDown: keys, GLASS_SPOTS, crimeTest: () => crime("assault", heroAt(), 3), spawnPoint: (a, b, c) => spawnPoint(a, b, c), MS, graphRoute, inWorld: (x, z) => inWorld(x, z), staticBlocked: (x, z, p) => staticBlocked(x, z, p), SETS, BEACHES, LM, CAVE, freeSpot, THREE, get CBEACHES(){ return CBEACHES; }, get CFOOT(){ return CFOOT; }, CTRAM, ctAt, traffic, cityDistrict, gpsPlaces: () => gpsPlaces(), setOrbit(a){ CAM.orbit = CAM.orbitSm = a; }, setCam(d, tilt){ camTarget = camDist = d; if (tilt != null) CAM.tilt = tilt; }, CITY, CGRAPH, cityR, cityDistrict, CITY_CH, CCH, enterVehicle, exitVehicle: (f) => exitVehicle(f), get nearAction(){ return nearAction; }, OWS, playAs, switchTo, openWheel2, GARAGES, OW_LEFT, OW_MADE, storeCar, takeOut, openSaves, openDone, completion, setSlot, get SLOT(){ return SLOT; }, SW, tayaraD, get SAVE(){ return SAVE; }, owMissionAction, CLIPS, get clipsReady(){ return CLIPS_READY; }, get cam(){ return { yaw: camYaw, p: camera.position.clone(), l: lookAt.clone() }; }, GM, GPS, openMap, gpsPlaces, get state(){ return state; }, DSC, deathScene, heroDamage, busted, hudHint, hudCounter, subtitle, say, banner, setObjective, CMOVE, MOVE, ledgeAt, startPipe, takeStairs, toggleHideCar, polSightR, roofTop, buildings, OG, heroGround, LIFE, BREAK, startEvent, endEvent, streetDrama, shopsPanic, greet, provoke, npcLaunch, thiefChase, startFilming, CHAIRM, streetLifeUpdate, CARANIM, animEnter, animExit, animJack, carDamaged, explode, crackGlass, DEBRIS, heroMoto, carjackTarget, SAMP, playS, GSND, playGun, ROADS_X, ROADS_Z, spawnPoint, aiDrive, copSpawn, copHit, roadBlock, polUnit, onScreen, crossTarget, SHELLM, WMODEL, AIM_RAISE, GW, GUN, AMMO, BLOOD, FX, MOLO, fireGun, gunPress, gunRelease, throwMolotov, startReload, buyAmmo, openWheel, closeWheel, aimTarget, traceShot, MEL, STRIKES, FSTYLE, PROPS, attackPress, attackRelease, blockPress, blockRelease, grabPress, meleeHitNPC, styleOf, pickProp, updateNPC, showActor, hideActor, shadiaD, haidyD, kamelD, POL, crime, wantedUp, polEnd, busted, carjack, carjackTarget, isTheft, TL, tlPhase, tlFor, CROWD, CROSSERS, traffic, crowdWanted, trafficWanted, TOD, applyTimeOfDay, MOVE, wantJump, SEA_STAIRS, heroGround, joy, NILE_Z, WATER_Y, get camYaw(){ return camYaw; }, WEAP, setWeapon, POL, GPS, gpsSet, gpsPlaces, openPhone, closePhone, PHONE, ACTS, actStart, TUTS, inSea, vCircles, CUT, MS, curM, NARR, setRain, giveStick, launches, arabiCar, setCam: (d, tl) => { camTarget = camDist = d; CAM.tilt = tl; }, tram, TRAMR, SHOPS, enterShop, exitShop, FORT, VILLA, traffic, vehicles, heroCar, copCar, enterVehicle, CAM, pedal, joy, dom: { DOM, round10, newDominoMatch, newDominoRound, commitPlayer, aiLegal, aiEval, unseenBy, DOM_AI, aiTurn, babCounts, isBlocked, hand: s => DOM.hands[s] }, say, failMission, skipMission, uiBack, startReplay, ST2, REPLAY, EASY, get SAVE(){ return SAVE; }, get DIFF(){ return DIFF; }, RIG_MS, renderer, scene, camera, SFX, spawnThugs, npcWear3D, playIntroSeq, endIntro, makePosterImage, introLayout, VOICE, playVoice, vHash, voiceLeft, heroCheer, cats, mesa, PROG_R: () => PROG.ramadan, nightVisuals, openGarage, applyGarage, GARAGE_POS, TW, openTawla, twRoll, twPlayerMove, twStartGame, closeTawla, sequences, TAWLA_SPOT, ACT, ACTS, actStart, actEnd, kameenSpawn, pigeons, RAMPS, parkCar, LOT, PEN, COOP, PROG, ACH, achCheck, openAch, openPhoto, closePhoto, takePhoto, PHOTO, goldGlasses, staticBlocked, blocked, obstacles, freeSpot, SPOT, STOPS, ST, AH, FL, DOM, ahwaTap, ahwaHold, foulTap, stationBtn, enterStation, exitStation, openDomino, playerPick, SA, SF, get SAVE(){ return SAVE; }, startJob, endJob, race, buyVehicle, MS, ST2, CUT, JOB, RHY, HOUSE, TOD, boss, pickups, checkpoints, idx, curM, finishMission, failMission, applyStoryWorld, playCut, dlgTap, applyTimeOfDay, enterHouse, exitHouse, houseAction, openTransit, ride, startPizzaJob, startTukJob, endJob2, playWedding, rhyHit, pizzaMoto, tukVeh, arabiMoto, heroMoto, storyAction, openShop, renderModes, thief, thiefStart, thiefCaught, islamD, CAM }, step(n=60){ for (let i=0;i<n;i++){ elapsed += 1/60; update(1/60, elapsed); } renderer.render(scene, camera); } };
