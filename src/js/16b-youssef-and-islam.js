// ================= youssef (food thief) and islam (seated at the domino table) =================
const youssefD = makeDoll(CH.youssef, 1.8); youssefD.root.visible = false;
const islamD = makeDoll(CH.islam, 1.78); islamD.root.visible = false;
islamD.P.legL.visible = islamD.P.legR.visible = false; islamD.blob.visible = false;
function seatIslam(on){
  islamD.root.visible = on;
  if (on) islamD.root.position.set(SPOT.domino.x + .85, .62 - islamD.hipY + .04, SPOT.domino.z);
}
const thief = { d: youssefD, pos: new THREE.Vector3(), active: false, caught: false, next: 75, dirX: 0, dirZ: 1, retarget: 0, lostT: 0, shoutT: 0, vx: 0, vz: 0 };
function thiefReset(){ thief.active = false; thief.caught = false; thief.next = R(60, 110); youssefD.root.visible = false; }
function thiefStart(at, line, ban){
  thief.active = true; thief.caught = false; thief.lostT = 0; thief.shoutT = 2;
  if (at) thief.pos.copy(at); else thief.pos.set(SPOT.cart.x + 1.6, .15, SPOT.cart.z + 2.4); youssefD.root.visible = true; youssefD.downT = 0; youssefD.P.legL.visible = youssefD.P.legR.visible = true; youssefD.blob.visible = true;
  say(thief, line || 'هوب! 🧆 ساندوتش ببلاش', 2.5, 'angry');
  banner(ban || '🚨 يوسف إبراهيم خطف ساندوتش من عربية الفول! الحقه', 'bad', 3.5); buzz(40);
}
function thiefCaught(){
  if (!thief.active || thief.caught) return;
  thief.caught = true; youssefD.downT = 2.5; thwack(); coin(); buzz(30); stat('thief');
  say(thief, 'خلاص خلاص… خد الساندوتش 😅', 2.5, 'angry');
  const reward = 40; hero.money += reward; if (modeId === 'story'){ SAVE.rep += 3; SAVE.cnt.thief = (SAVE.cnt.thief||0) + 1; saveStory(); }
  banner(`مسكت يوسف! +${reward} جنيه من صاحب العربية`, 'ok', 3);
  setTimeout(() => { thief.active = false; if (!CUT.idle.has(youssefD)) youssefD.root.visible = false; thief.next = R(150, 240); }, 2600);
}
function updateThief(dt, t){
  if (modeId !== 'story'){ if (thief.active) thiefReset(); return; }
  if (!thief.active){
    thief.next -= dt;
    if (thief.next <= 0 && !modeObj.job && !ST.kind && !JOB.kind && !CUT.on && !HOUSE.inside && storyAllowsThief() && hero.pos.distanceTo(SPOT.cart) < 70) thiefStart();
    return;
  }
  const p = thief.pos; let vx = 0, vz = 0;
  if (!thief.caught){
    const tg = hero.veh ? hero.veh.pos : hero.pos; const dx = p.x - tg.x, dz = p.z - tg.z, dist = Math.hypot(dx, dz);
    thief.retarget -= dt;
    if (thief.retarget <= 0){
      thief.retarget = .35; let best = -1e9, bx = 0, bz = 1; const ax = dx/(dist||1), az = dz/(dist||1);
      for (let i=0;i<16;i++){ const a = i/16*Math.PI*2, cx = Math.sin(a), cz = Math.cos(a); let score = (cx*ax + cz*az)*2 + Math.random()*.4 + (cx*thief.dirX + cz*thief.dirZ)*.6; if (staticBlocked(p.x+cx*3, p.z+cz*3, .5) || staticBlocked(p.x+cx*1.2, p.z+cz*1.2, .4)) score -= 6; if (!inWorld(p.x+cx*8, p.z+cz*8)) score -= 4; if (score > best){ best = score; bx = cx; bz = cz; } }
      thief.dirX = bx; thief.dirZ = bz;
    }
    const sp = 6.4 * DIFF.enemySpd; vx = thief.dirX*sp; vz = thief.dirZ*sp; moveWithSlide(p, vx*dt, vz*dt, .4);
    thief.shoutT -= dt; if (thief.shoutT <= 0){ thief.shoutT = R(4,7); say(thief, rpick(['مش هتلحقني!','جعان يا جدعان!','ده ساندوتش واحد بس!']), 2, 'angry'); }
    if (hero.veh && Math.abs(hero.veh.speed) > 1.5) for (const c of vCircles(hero.veh)) if (Math.hypot(c.x-p.x, c.z-p.z) < c.r + .7){ thiefCaught(); break; }
    if (dist > 60) thief.lostT += dt; else thief.lostT = 0;
    if (thief.lostT > 6){ thief.active = false; youssefD.root.visible = false; thief.next = R(120, 200); banner('يوسف هرب بالساندوتش 😤', 'bad', 2.5); }
  }
  p.y += (groundY(p.x, p.z) - p.y) * damp(15, dt);
  youssefD.root.position.copy(p); thief.vx = vx; thief.vz = vz;
  animDoll(youssefD, vx, vz, dt, t);
}
function updatePhotoSeats(dt, t){ if (islamD.root.visible) animDoll(islamD, 0, 0, dt, t); }
// difficulty switch in the menu
function renderDiff(){ $('diffBtn').textContent = diffKey === 'easy' ? '😊 سهل' : '💪 عادي'; }
$('diffBtn').onclick = () => { diffKey = diffKey === 'easy' ? 'normal' : 'easy'; DIFF = DIFFS[diffKey]; store.set('ty_diff', diffKey); renderDiff(); };
renderDiff();
