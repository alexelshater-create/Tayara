// ================= interactions =================
let nearAction = null;
function computeAction(){
  nearAction = null; if (state !== 'play') return;
  if (TRAMR.on){ nearAction = tramRideAction(); return; }
  if (ACT.kind && ACTS[ACT.kind].action){ nearAction = ACTS[ACT.kind].action(ACT.d); if (nearAction || hero.locked) return; }
  if (hero.locked) return;
  const p = hero.pos;
  if (HOUSE.inside){ nearAction = HOUSE.shop === 'cave' ? (Math.hypot(p.x - CAVE.doorIn.x, p.z - CAVE.doorIn.z) < 1.6 ? { text: 'اطلع من الكهف', fn: exitCave } : null) : HOUSE.shop ? shopAction() : houseAction(); return; }
  if (CAVE.out && !hero.veh && Math.hypot(p.x - CAVE.out.x, p.z - CAVE.out.z) < 2.2){ nearAction = { text: 'ادخل الكهف', fn: enterCave }; return; }
  if (hero.veh){ const ga = garageAction() || owVehAction(); if (ga){ nearAction = ga; return; } const va = modeObj.vehAction && modeObj.vehAction(); nearAction = va || { text: 'انزل', fn: () => animExit() }; return; }
  if (thief.active && !thief.caught && thief.pos.distanceTo(p) < 2){ nearAction = { text: 'امسك يوسف!', fn: thiefCaught }; return; }
  { const oa = owFootAction(p); if (oa){ nearAction = oa; return; } }
  const ma = modeObj.action && modeObj.action(); if (ma){ nearAction = ma; return; }
  { const aa = actionNearActivity(p); if (aa){ nearAction = aa; return; } }
  { const pa = propAction(p); if (pa){ nearAction = pa; return; } }
  if (modeObj.vehicles){ const sd = nearShopDoor(p); if (sd){ nearAction = { text: `ادخل ${sd.name.replace(/\s*\(جوه\)/, '')}`, fn: () => enterShop(sd) }; return; } const ta = tramAction(p); if (ta){ nearAction = ta; return; } }
  if (modeObj.vehicles && !POL.panel){ const hs = nearHutStreet(p); if (hs){ nearAction = { text: 'اطلع السطح', fn: () => takeStairs(hs, true) }; return; }
    const hr = nearHutRoof(p); if (hr){ nearAction = { text: 'انزل الشارع', fn: () => takeStairs(hr, false) }; return; }
    const pp = nearPipe(p); if (pp){ nearAction = { text: 'اطلع الماسورة', fn: () => startPipe(pp) }; return; } }
  if (modeObj.vehicles){ const st = nearestStop(p); if (st){ nearAction = { text: 'اركب مواصلة', fn: () => openTransit(st) }; return; } }
  if (modeObj.vehicles){ const tc = carjackTarget(p); if (tc){ nearAction = { text: 'اسحب السواق واركب', fn: () => animJack(tc) }; return; } }
  if (modeObj.vehicles){ let best = null, bd = 3.2; for (const v of vehicles){ if (v.wrecked || v.ai || (modeObj.canDrive && !modeObj.canDrive(v))) continue; const d = Math.hypot(v.pos.x-p.x, v.pos.z-p.z); if (d < bd){ bd = d; best = v; } } if (best){ nearAction = { text: best.type==='boat' ? 'اركب اللانش' : best.type==='moto' ? 'اركب الموتوسيكل' : best.type==='police' ? 'اركب البوكس' : best.type==='tuk' ? 'اركب التوكتوك' : 'اركب العربية', fn: () => animEnter(best) }; return; } }
  if (modeObj.vehicles && !hero.veh){ const cs = cshopNear(p); if (cs){ nearAction = { text: `ادخل ${cs.name}`, fn: () => enterCityShop(cs) }; return; } }
  if (modeObj.cafe){
    if (p.distanceTo(SPOT.domino) < 2.4) { nearAction = { text: 'العب دومنو مع الحاج كامل', fn: () => openDomino() }; return; }
    if (Math.hypot(p.x - TAWLA_SPOT.x, p.z - TAWLA_SPOT.z) < 1.9) { nearAction = { text: 'العب طاولة مع عم رجب', fn: openTawla }; return; }
    if (p.distanceTo(SPOT.counter) < 2.6) { nearAction = { text: 'اشرب كوباية شاي (٥ جنيه)', fn: () => { if (hero.money < 5) return banner('مفيش فلوس كفاية', 'bad', 1.5); hero.money -= 5; hero.hp = Math.min(100, hero.hp+20); clink(); banner('شاي تقيل ومظبوط +٢٠ صحة', 'ok', 2); } }; return; }
    if (Math.hypot(p.x-SPOT.cart.x, p.z-(SPOT.cart.z+1.4)) < 2.4) { nearAction = { text: 'اشتري سندوتش فلافل (٥ جنيه)', fn: () => { if (hero.money < 5) return banner('مفيش فلوس كفاية', 'bad', 1.5); hero.money -= 5; hero.hp = Math.min(100, hero.hp+35); coin(); banner('سندوتش فلافل سخن +٣٥ صحة', 'ok', 2); } }; return; }
  }
}
function action(){ if (CARANIM.on){ carAnimSkip(); return; } if (nearAction) nearAction.fn(); }
function punchOld(){   // replaced by punch() in 19r-melee.js
  if (WEAP.cur === 'pistol' && !hero.veh && !hero.locked){ shootPistol(); return; }
  if (hero.veh || hero.locked || hero.d.punchT > 0) return;
  // pick the closest target
  const p = hero.pos; let best = null, bd = weaponRange();
  const camRightX = Math.cos(camYaw), camRightZ = -Math.sin(camYaw);
  for (const n of npcs){ if (n.state === 'hidden' || n.state === 'down') continue; const d = Math.hypot(n.g.position.x-p.x, n.g.position.z-p.z); if (d < bd){ bd = d; best = { n, x:n.g.position.x, z:n.g.position.z }; } }
  if (enemy.active && !enemy.ally && enemy.d.downT <= 0){ const d = enemy.pos.distanceTo(p); if (d < Math.max(bd, 1.9)){ bd = d; best = { enemy: true, x: enemy.pos.x, z: enemy.pos.z }; } }
  if (wanted.active && !wanted.caught){ const d = wanted.pos.distanceTo(p); if (d < 1.9 && d <= bd + .3){ best = { wanted: true, x: wanted.pos.x, z: wanted.pos.z }; } }
  if (thief.active && !thief.caught){ const d = thief.pos.distanceTo(p); if (d < 1.9){ best = { thief: true, x: thief.pos.x, z: thief.pos.z }; } }
  { const bt = bossTarget(p); if (bt) best = bt; }
  hero.d.punchSide = best ? (((best.x-p.x)*camRightX + (best.z-p.z)*camRightZ) >= 0 ? 1 : -1) : 1;
  hero.d.punchT = .28; punchWhoosh();
  if (hero.d.is3D){ hero.d.punchSide = (hero.combo||0) % 2 ? -1 : 1; if (best) hero.d.yaw = Math.atan2(best.x - p.x, best.z - p.z); }   // the 3D hero turns to the target and swaps hands
  const pnow = runTime; hero.combo = (pnow - (hero.lastPunch ?? -9) < .8) ? (hero.combo||0) + 1 : 1; hero.lastPunch = pnow; const big = hero.combo % 3 === 0;
  if (!best) return;
  setTimeout(() => {
    if (big){ shake = .3; noise(.25, 600, .5); buzz(30); }
    const mult = weaponHit(best.n ? best.n : best.enemy ? enemy : null);
    if (best.n){ npcHit(best.n, (big ? 2 : 0) + (mult > 1.4 ? 1 : 0)); if (mult >= 1.5 && best.n.thug && !best.n.thugDone){ best.n.thugHits++; if (best.n.thugHits >= (best.n.thugNeed || 3)){ best.n.thugDone = true; best.n.downT = 999; best.n.fightT = 0; } } if (modeObj.onPunchNPC) modeObj.onPunchNPC(best.n); }
    else if (best.enemy){ hitEnemy((big ? 35 : 18) * mult, p);  }
    else if (best.wanted) arrestWanted();
    else if (best.thief) thiefCaught();
    else if (best.boss) bossHit(big || mult >= 2);
  }, 120);
}
