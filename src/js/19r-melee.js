// ================= stage 8: fighting with your hands =================
// Tap = a 3-hit combo (jab, cross, hook). Hold = a kick (breaks a guard). held = block; while moving = dodge
// (dodge right as a hit lands = slow motion and a stronger counter). = grab, again (or) = throw: into a wall
// or a car hurts more, into another man knocks him down too. Chairs, bottles and bins lying around can be picked up.
// Street fighters take turns (two at most come at you, the others circle), and each has a style: the fast one,
// the one who blocks, the big slow one who hits hard. A red ring under a man = he is about to hit.
const STRIKES = {   // clip, where it starts / lands / ends in the clip (s), playback rate, damage, knockback
  jab:   { clip: 'jab',   s0: .32, tc: .63, te: .98, rate: 1.7, dmg: 1,   push: 2.2 },
  cross: { clip: 'cross', s0: .78, tc: 1.13, te: 1.5, rate: 1.7, dmg: 1.2, push: 2.8 },
  hook:  { clip: 'hook',  s0: .62, tc: 1.03, te: 1.5, rate: 1.5, dmg: 1.6, push: 5,   big: true },
  kick:  { clip: 'kick',  s0: .3,  tc: .7,  te: 1.15, rate: 1.35, dmg: 2.2, push: 6.5, big: true, heavy: true, range: .35 },
  swing: { clip: 'melee', s0: .45, tc: .9,  te: 1.35, rate: 1.6, dmg: 1,   push: 4 },
  throw: { clip: 'throw', s0: .45, tc: .87, te: 1.3, rate: 1.5 },
};
const FSTYLE = {
  rusher:  { hp: 3, block: .08, gap: 1.0, wind: .38, dmg: 5,  speed: 4.6, reach: 1.6,  clip: 'jab',   s0: .32, tc: .63, te: .98, push: 2 },
  blocker: { hp: 4, block: .5,  gap: 1.5, wind: .5,  dmg: 7,  speed: 3.8, reach: 1.65, clip: 'cross', s0: .78, tc: 1.13, te: 1.5, push: 3 },
  brute:   { hp: 7, block: .2,  gap: 2.1, wind: .8,  dmg: 13, speed: 3.1, reach: 1.8,  clip: 'hook',  s0: .62, tc: 1.03, te: 1.5, push: 6, heavy: true, noGrab: true },
};
const MEL = { atk: null, combo: 0, comboT: 0, queued: false, pressT: -1, heavyDone: false, blockKey: false, blockPressT: 9, block: false,
  dodge: null, dodgeCd: 0, guardBreak: 0, grab: null, hitstop: 0, slow: 0, counter: 0, tokens: new Set(), stats: { dodged: 0, perfect: 0, blocked: 0, parried: 0, landed: 0 }, tipShown: store.get('ty_fight') === '1' };

// ---------- time: a short freeze on every hit, slow motion after a perfect dodge (the real-time loop calls this) ----------
function meleeTimeScale(dt){
  if (MEL.hitstop > 0){ MEL.hitstop -= dt; return .04; }
  if (MEL.slow > 0){ MEL.slow -= dt; return .3; }
  return 1;
}
function meleeMoveScale(){ return MEL.dodge ? 0 : GW.aimK > .5 ? .55 : MEL.grab ? .45 : MEL.block ? .3 : MEL.atk ? .35 : 1; }

// ---------- input ----------
function attackPress(){
  if (state !== 'play') return;
  if (hero.veh){ horn(); return; }
  if (isGun(WEAP.cur)){ gunPress(); return; }
  if (MEL.grab){ throwGrab(); return; }
  MEL.pressT = 0; MEL.heavyDone = false;
}
function attackRelease(){ gunRelease(); if (MEL.pressT >= 0 && !MEL.heavyDone) punch(); MEL.pressT = -1; }
function blockPress(){
  if (state !== 'play' || hero.veh || hero.locked) return;
  MEL.blockKey = true; MEL.blockPressT = 0;
  if (hero.vel.lengthSq() > 1.2 && !MEL.grab) dodge();
}
function blockRelease(){ MEL.blockKey = false; }
function grabPress(){ if (state !== 'play' || hero.veh || hero.locked) return; if (MEL.grab) throwGrab(); else tryGrab(); }

// ---------- the hero's attacks ----------
function fightTargets(range){
  const p = hero.pos; let best = null, bd = range;
  for (const n of npcs){ if (n.state === 'hidden' || n.state === 'down' || n.state === 'dead' || n.state === 'sit' || !n.g.visible || n === (MEL.grab && MEL.grab.n)) continue; const d = Math.hypot(n.g.position.x - p.x, n.g.position.z - p.z); if (d < bd){ bd = d; best = { n, x: n.g.position.x, z: n.g.position.z, d }; } }
  if (enemy.active && !enemy.ally && enemy.d.downT <= 0){ const d = enemy.pos.distanceTo(p); if (d < Math.max(bd, 1.9)){ bd = d; best = { enemy: true, x: enemy.pos.x, z: enemy.pos.z, d }; } }
  if (wanted.active && !wanted.caught){ const d = wanted.pos.distanceTo(p); if (d < 1.9 && d <= bd + .3) best = { wanted: true, x: wanted.pos.x, z: wanted.pos.z, d }; }
  if (thief.active && !thief.caught){ const d = thief.pos.distanceTo(p); if (d < 1.9) best = { thief: true, x: thief.pos.x, z: thief.pos.z, d }; }
  { const bt = bossTarget(p); if (bt){ bt.d = boss.pos.distanceTo(p); best = bt; } }
  for (const c of POL.cops){ if (!c.on || c.state === 'down') continue; const d = Math.hypot(c.pos.x - p.x, c.pos.z - p.z); if (d < bd){ bd = d; best = { cop: c, x: c.pos.x, z: c.pos.z, d }; } }
  return best;
}
// a quick attack (tap), or kind = 'kick' (hold). Keeps the old name: other code and the tests call punch()
function punch(kind){
  if (isGun(WEAP.cur) && !hero.veh && !hero.locked){ if (WEAP.cur === 'molotov') throwMolotov(); else fireGun(); return; }
  if (hero.veh || hero.locked || MEL.dodge || hero.d.downT > 0) return;
  if (MEL.grab){ throwGrab(); return; }
  if (MEL.atk){ if (MEL.atk.t > .06 && MEL.atk.kind !== 'throw') MEL.queued = kind || true; return; }
  const armed = WEAP.cur !== 'none';
  if (!kind){
    if (armed) kind = WEAP.cur === 'knife' ? 'stab' : 'swing';
    else { MEL.combo = MEL.comboT > 0 ? MEL.combo % 3 + 1 : 1; kind = ['jab', 'cross', 'hook'][MEL.combo - 1]; }
  }
  if (kind === 'kick') MEL.combo = 0;
  const st = STRIKES[kind], range = weaponRange() + (st.range || 0);
  const tg = fightTargets(range + .9), p = hero.pos;
  if (tg){
    hero.d.yaw = Math.atan2(tg.x - p.x, tg.z - p.z);
    if (tg.d > range - .5 && tg.d < range + .9){ const k = Math.min(4.5, (tg.d - range + .7) * 6); hero.knock.x += (tg.x - p.x) / tg.d * k; hero.knock.z += (tg.z - p.z) / tg.d * k; }   // step in so the hit connects
  }
  MEL.atk = { kind, st, t: 0, hit: false, tg, range };
  hero.d.punchSide = kind === 'jab' ? -1 : 1;
  if (!hero.d.is3D || !CLIPS_READY) hero.d.punchT = .28;   // the old drawn hero: the hand-made punch
  punchWhoosh(); if (st.big) tone(90, 50, .12, 'sine', .08);
  if (!MEL.tipShown){ MEL.tipShown = true; store.set('ty_fight', '1'); banner(isTouch ? 'دوسة = ضربة · دوسة طويلة = شلوت · صد (وانت ماشي = تفادي) · امسك وارمي' : 'F ضربة · F مطوّل شلوت · Q صد (وانت ماشي تفادي) · G امسك وارمي · X السلاح', 'info', 5); }
}
function landStrike(A){
  const st = A.st, p = hero.pos, tg = A.tg && stillThere(A.tg) ? A.tg : fightTargets(A.range);
  if (!tg) return;
  const d = Math.hypot(tg.x - p.x, tg.z - p.z); if (d > A.range + .35) return;
  const ctr = MEL.counter > 0; if (ctr) MEL.counter = 0;
  const big = !!st.big || ctr || (!!WEAPONS[WEAP.cur].heavy && Math.random() < .5), fighter = tg.n && isFighter(tg.n);
  const mult = (fighter ? WEAPONS[WEAP.cur].mult : weaponHit(tg.n ? tg.n : tg.enemy ? enemy : null)) * (ctr ? 1.5 : 1);
  hitFeel(big, tg); meleeLanded(tg, big);
  if (tg.n){ const n = tg.n;
    if (fighter){ if (meleeHitNPC(n, st.dmg * mult, { big, heavy: st.heavy || ctr, push: st.push * (WEAP.cur !== 'none' ? 1.3 : 1) }) !== 'blocked') weaponHit(n); }
    else { npcHit(n, (big ? 2 : 0) + (mult > 1.4 ? 1 : 0)); if (mult >= 1.5 && n.thug && !n.thugDone){ n.thugHits++; if (n.thugHits >= (n.thugNeed || 3)){ n.thugDone = true; n.downT = 999; n.fightT = 0; } } }
    if (modeObj.onPunchNPC) modeObj.onPunchNPC(n);
  }
  else if (tg.enemy){ hitEnemy(15 * st.dmg * mult, p);  }
  else if (tg.wanted) arrestWanted();
  else if (tg.thief) thiefCaught();
  else if (tg.boss) bossHit(big || mult >= 2);
  else if (tg.cop) copHit(tg.cop, st.dmg * mult * (big ? 1.5 : 1));
}
function stillThere(tg){
  if (tg.n){ if (tg.n.state === 'hidden' || tg.n.state === 'down' || tg.n.state === 'dead') return false; tg.x = tg.n.g.position.x; tg.z = tg.n.g.position.z; return true; }
  if (tg.enemy){ if (!enemy.active || enemy.d.downT > 0) return false; tg.x = enemy.pos.x; tg.z = enemy.pos.z; return true; }
  if (tg.boss){ if (!boss.active) return false; tg.x = boss.pos.x; tg.z = boss.pos.z; return true; }
  if (tg.cop){ if (!tg.cop.on || tg.cop.state === 'down') return false; tg.x = tg.cop.pos.x; tg.z = tg.cop.pos.z; return true; }
  return true;
}
function hitFeel(big, tg){
  MEL.hitstop = big ? .085 : .045; shake = Math.max(shake, big ? .32 : .12); buzz(big ? 32 : 12);
  thwack(); if (big) playS('fall', .45, 1.25);
}

// ---------- block and dodge ----------
function dodge(){
  if (MEL.dodge || MEL.dodgeCd > 0 || hero.d.downT > 0 || MOVE.air || MOVE.swim) return;
  const v = hero.vel, l = Math.hypot(v.x, v.z) || 1;
  MEL.dodge = { t: 0, dur: .5 }; MEL.atk = null; MEL.dodgeCd = .55;
  hero.knock.x += v.x / l * 10.5; hero.knock.z += v.z / l * 10.5; hero.d.yaw = Math.atan2(v.x, v.z);
  noise(.14, 900, .25);
}
// a man's hit reaches the hero: dodged, blocked (or parried), or it lands
function meleeHitHero(src, dmg, S, from){
  if (hero.inv > 0 || hero.veh || state !== 'play') return;
  const p = hero.pos, dx = from.x - p.x, dz = from.z - p.z, dl = Math.hypot(dx, dz) || 1;
  if (MEL.dodge && MEL.dodge.t < .34){
    MEL.stats.dodged++; if (MEL.dodge.t < .2 && MEL.slow <= 0){ MEL.stats.perfect++; MEL.slow = .45; MEL.counter = 1.6; banner('تفادي مظبوط! ردّها', 'ok', 1); tone(660, 990, .18, 'sine', .1); }
    return;
  }
  const facing = (Math.sin(hero.d.yaw) * dx + Math.cos(hero.d.yaw) * dz) / dl > -.05;
  if (MEL.block && facing){
    if (MEL.blockPressT < .2 && !S.heavy){   // blocked just in time: he loses his balance
      MEL.stats.parried++; if (src && src.g){ src.state = 'stagger'; src.stagT = .75; } tone(1200, 700, .1, 'square', .08); shake = Math.max(shake, .1); MEL.hitstop = .05; return;
    }
    MEL.stats.blocked++; playS('block', .7); shake = Math.max(shake, .12);
    hero.knock.x -= dx / dl * (S.heavy ? 4 : 1.5); hero.knock.z -= dz / dl * (S.heavy ? 4 : 1.5);
    if (S.heavy){ MEL.guardBreak = .9; banner('الضربة كسرت الصدّة!', 'bad', 1); }
    const chip = dmg * (S.heavy ? .45 : .12); if (chip >= 1){ heroDamage(chip, 'npcm'); hero.d.hitT = 0; }
    return;
  }
  MEL.atk = null; MEL.queued = false; MEL.stats.landed++; if (MEL.block) MEL.stats.behind = (MEL.stats.behind || 0) + 1; if (MEL.blockKey && !MEL.block) MEL.stats.guardDown = (MEL.stats.guardDown || 0) + 1;
  heroDamage(dmg, 'npcm');
  hero.knock.x -= dx / dl * S.push; hero.knock.z -= dz / dl * S.push;
  if (S.heavy && Math.random() < .45){ hero.d.downT = 1; banner('وقعت! قوم بسرعة', 'bad', 1); }
}
// the Arabi and the boss hit through heroDamage(…, 'enemy'): dodging and blocking work on them too
function meleeDefend(dmg){
  if (MEL.dodge && MEL.dodge.t < .34){ MEL.stats.dodged++; if (MEL.dodge.t < .2 && MEL.slow <= 0){ MEL.stats.perfect++; MEL.slow = .45; MEL.counter = 1.6; banner('تفادي مظبوط! ردّها', 'ok', 1); } return 0; }
  const src = boss.active && boss.pos.distanceTo(hero.pos) < 3 ? boss.pos : enemy.active ? enemy.pos : null, heavy = src === boss.pos;
  const facing = !src || (Math.sin(hero.d.yaw) * (src.x - hero.pos.x) + Math.cos(hero.d.yaw) * (src.z - hero.pos.z)) > 0;
  if (MEL.block && facing){
    noise(.1, 2400, .3);
    if (MEL.blockPressT < .2 && !heavy){ MEL.stats.parried++; return 0; }
    MEL.stats.blocked++; if (heavy){ MEL.guardBreak = .9; return dmg * .45; } return dmg * .2;
  }
  MEL.atk = null; MEL.stats.landed++; return dmg;
}

// ---------- grab and throw ----------
function grabbable(){
  const p = hero.pos, fx = Math.sin(hero.d.yaw), fz = Math.cos(hero.d.yaw); let best = null, bd = 1.7;
  for (const n of npcs){
    if (n.state === 'hidden' || n.state === 'down' || n.state === 'dead' || n.state === 'sit' || n.state === 'customer' || n.state === 'domino' || !n.g.visible || n.role === 'story') continue;
    const dx = n.g.position.x - p.x, dz = n.g.position.z - p.z, d = Math.hypot(dx, dz); if (d > bd || d < .2) continue;
    if ((dx * fx + dz * fz) / d < -.2) continue;
    if (n.mel && styleOf(n).noGrab && n.state !== 'stagger') continue;
    bd = d; best = n;
  }
  return best;
}
function tryGrab(){
  const n = grabbable(); if (!n){ banner('مفيش حد قريب تمسكه', 'info', 1); return; }
  if (!n.thug && !n.mel) crime('assault', n.g.position, 1, n);
  MEL.grab = { n, t: 0, was: n.state, wasFighter: !!(n.mel || n.thug || n.state === 'fight' || n.state === 'stagger') }; n.state = 'held'; n.windT = 0; n.mstrike = null; dropToken(n);
  hero.d.yaw = Math.atan2(n.g.position.x - hero.pos.x, n.g.position.z - hero.pos.z);
  noise(.08, 700, .3); say(n, rpick(['سيبني!', 'إيه ده؟!', 'آه… آه!']), 1.4, 'angry');
}
function throwGrab(){
  const G = MEL.grab; if (!G) return; const n = G.n; MEL.grab = null;
  MEL.atk = { kind: 'throw', st: STRIKES.throw, t: 0, hit: true, tg: null, range: 0 };
  const fx = Math.sin(hero.d.yaw), fz = Math.cos(hero.d.yaw);
  n.state = 'down'; n.downT = n.thug && (n.mhp ?? 1) <= 2 ? 999 : 3.2; n.prevState = n.mel || n.thug ? 'fight' : n.prevState || 'walk';
  if (n.mel || n.thug) n.fightT = Math.max(n.fightT || 0, n.thug ? 999 : 6);
  n.fly = { vx: fx * 7.5, vz: fz * 7.5, vy: 3.4, y: n.g.position.y + .2 };
  meleeHitNPC(n, 2, { big: true, heavy: true, push: 0, thrown: true });
  punchWhoosh(); shake = Math.max(shake, .2);
}
function updateFlying(n, dt){
  const F = n.fly, p = n.g.position, nx = p.x + F.vx * dt, nz = p.z + F.vz * dt;
  F.vy -= 14 * dt; F.y += F.vy * dt;
  const wall = staticBlocked(nx, nz, .3) || (typeof vehBlockedAt === 'function' && vehBlockedAt(nx, nz, .3, hero.veh));
  if (wall){ F.vx *= -.2; F.vz *= -.2; if (!F.slam){ F.slam = true; meleeHitNPC(n, 1.5, { big: true, heavy: true, push: 0, thrown: true }); thud(1); shake = Math.max(shake, .35); MEL.hitstop = .08; say(n, 'آآآه!', 1.2, 'angry'); } }
  else { p.x = nx; p.z = nz; }
  for (const o of npcs){ if (o === n || o.state === 'hidden' || o.state === 'down' || o.state === 'dead' || o.state === 'sit' || !o.g.visible || (F.hit && F.hit.has(o))) continue; if (Math.hypot(o.g.position.x - p.x, o.g.position.z - p.z) < .8){ (F.hit || (F.hit = new Set())).add(o); if (o.mel || o.thug) meleeHitNPC(o, 1.5, { big: true, heavy: true, push: 3, from: p }); else npcHit(o, 1); F.vx *= .4; F.vz *= .4; } }
  const gy = groundY(p.x, p.z);
  if (F.y <= gy){ p.y = gy; n.fly = null; thud(.8); if (staticBlocked(p.x, p.z, .25) && typeof freeSpot === 'function'){ const [fx2, fz2] = freeSpot(p.x, p.z); p.x = fx2; p.z = fz2; } } else p.y = F.y;
}

// ---------- street fighters ----------
function styleOf(n){
  if (!n.fstyle){ const i = npcs.indexOf(n); n.fstyle = n.thug ? ['rusher', 'blocker', 'brute'][i % 3] : (Math.random() < .7 ? 'rusher' : 'blocker'); }
  const S = FSTYLE[n.fstyle]; if (n.mhp === undefined) n.mhp = S.hp + (n.thug ? 1 : 0); return S;
}
const isFighter = n => !!(n.thug || n.mel || n.state === 'fight' || n.state === 'stagger' || n.state === 'held');
// a man hit by the hero in a fight: he blocks, staggers, falls for a moment, or is beaten
function meleeHitNPC(n, power, o){
  const S = styleOf(n); n.mel = true; const p = hero.pos, from = o.from || p;
  const dx = n.g.position.x - from.x, dz = n.g.position.z - from.z, dl = Math.hypot(dx, dz) || 1;
  const facing = n.state !== 'held' && !n.fly && (Math.sin(n.yaw) * -dx + Math.cos(n.yaw) * -dz) / dl > .3;
  if (!o.heavy && !o.thrown && facing && !(n.windT > 0) && n.state !== 'stagger' && Math.random() < S.block){
    n.blockT = .45; playS('block', .7); n.kb = { x: dx / dl * 1.5, z: dz / dl * 1.5 }; MEL.hitstop = .03;
    if (Math.random() < .3) say(n, rpick(['مش هتعرف!', 'إيه ده بس؟', 'تاني!']), 1.2, 'angry'); return 'blocked';
  }
  n.mhp -= power; n.windT = 0; n.mstrike = null; dropToken(n);
  if (n.thug){ n.thugHits = Math.max(n.thugHits || 0, Math.ceil((1 - Math.max(0, n.mhp) / (S.hp + 1)) * (n.thugNeed || 3))); }
  if (n.mhp <= 0){
    n.state = 'down'; n.fall = n.fall || 0; n.downT = n.thug ? 999 : 5; n.fightT = n.thug ? 0 : 0; n.prevState = 'walk';
    if (n.thug){ n.thugDone = true; say(n, 'خلاص… خلاص!', 2, 'angry'); } else say(n, rpick(['خلاص يا عم… خلاص!', 'كفاية!', 'إنت جامد…']), 2, 'angry');
    n.mel = false; MEL.hitstop = .12; shake = Math.max(shake, .35);
  } else if (o.thrown || (o.big && Math.random() < .55)){
    if (n.state !== 'down'){ n.prevState = 'fight'; n.state = 'down'; n.downT = 1.7; }
    n.fightT = Math.max(n.fightT || 0, n.thug ? 999 : 8);
  } else { n.state = 'stagger'; n.stagT = o.big ? .6 : .38; n.fightT = Math.max(n.fightT || 0, n.thug ? 999 : 8); if (Math.random() < .25) say(n, rpick(['آه!', 'يا ابن الـ…', 'استنى!']), 1, 'angry'); }
  if (o.push) n.kb = { x: dx / dl * o.push, z: dz / dl * o.push };
}
const MAX_TOKENS = () => (typeof EASY !== 'undefined' && EASY.on) ? 1 : 2;
function wantToken(n){
  if (MEL.tokens.has(n)) return true;
  if ((n.tokCd || 0) > 0 || MEL.tokens.size >= MAX_TOKENS()) return false;
  MEL.tokens.add(n); return true;
}
function dropToken(n){ if (MEL.tokens.delete(n)) n.tokCd = 1 + Math.random() * 1.4; }
// called by updateNPC (07) for a man in the 'fight' state who is close enough: returns his walking speed
function npcFight(n, dt, dx, dz, d){
  const S = styleOf(n); n.mel = true; n.yaw = Math.atan2(dx, dz);
  if (n.tokCd > 0) n.tokCd -= dt;
  if (n.windT > 0){   // winding up: the red ring shows, then the hit
    n.windT -= dt; const k = 1 - n.windT / S.wind; n.mstrike = { clip: S.clip, t: S.s0 + (S.tc - S.s0) * Math.min(1, k) * .85 };
    n.arms[1].rotation.x = -.6 - k * 1.2;
    if (n.windT <= 0){
      n.punchT = .3; n.arms[1].rotation.x = -1.6; n.afterT = .3;
      if (d < S.reach && !hero.veh) meleeHitHero(n, S.dmg * DIFF.dmg, S, n.g.position); else punchWhoosh();
      n.atkCd = S.gap * (.8 + Math.random() * .45); dropToken(n);
    }
    return 0;
  }
  if (n.afterT > 0){ n.afterT -= dt; n.mstrike = { clip: S.clip, t: S.tc + (S.te - S.tc) * (1 - n.afterT / .3) }; return 0; }
  n.mstrike = null;
  n.atkCd = (n.atkCd ?? .4 + Math.random() * .8) - dt;
  if (wantToken(n)){
    if (d > S.reach - .45){ const s = S.speed * dt; moveWithSlide(n.g.position, dx / d * s, dz / d * s, .3); return S.speed; }
    if (n.atkCd <= 0 && npcs.some(o => o !== n && o.windT > 0)) n.atkCd = .35 + Math.random() * .3;   // one wind-up at a time: the other waits a beat
    if (n.atkCd <= 0 && !hero.veh && hero.d.downT <= 0){ n.windT = S.wind; if (Math.random() < .2) say(n, rpick(['خد دي!', 'تعالى!', 'هوب!']), .9, 'angry'); }
    return 0;
  }
  // waiting for a turn: keep 2.6–3.4 m away and circle slowly
  if (n.circ === undefined){ n.circ = Math.random() < .5 ? 1 : -1; n.ringR = 2.6 + Math.random() * .8; }
  let mx = 0, mz = 0; const ux = dx / d, uz = dz / d;
  const far = d > n.ringR + .5, near = d < n.ringR - .4;
  if (far){ mx += ux; mz += uz; } else if (near){ mx -= ux; mz -= uz; }
  mx += -uz * n.circ * .45; mz += ux * n.circ * .45;
  const sp = far ? S.speed * .8 : near ? 1.6 : .7;
  moveWithSlide(n.g.position, mx * sp * dt, mz * sp * dt, .3);
  if (Math.random() < dt * .15) n.circ *= -1;
  return far ? sp : 0;
}
// the red ring under a man who is about to hit
const ringGeo = new THREE.RingGeometry(.35, .5, 24).rotateX(-Math.PI / 2), ringMat = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: .75, depthWrite: false });
function ringFor(n){ if (!n.ring){ n.ring = new THREE.Mesh(ringGeo, ringMat); n.ring.renderOrder = 2; scene.add(n.ring); } return n.ring; }

// ---------- pick-up things: plastic chairs, bottles, bins, sticks ----------
const PROPS = [];
function propMesh(kind){
  const p = [];
  if (kind === 'chair'){ box(p, .42, .04, .42, 0, .42, 0, '#e53935'); box(p, .42, .4, .04, 0, .64, -.2, '#e53935'); for (const [x, z] of [[-.18, .18], [.18, .18], [-.18, -.18], [.18, -.18]]) box(p, .03, .42, .03, x, .21, z, '#c62828'); }
  if (kind === 'bottle'){ cyl(p, .045, .045, .22, 0, .11, 0, '#2e7d32'); cyl(p, .015, .04, .1, 0, .27, 0, '#2e7d32'); }
  if (kind === 'bin'){ cyl(p, .22, .19, .62, 0, .31, 0, '#78909c'); cyl(p, .24, .24, .05, 0, .64, 0, '#607d8b'); }
  if (kind === 'stick'){ const c = new THREE.CylinderGeometry(.022, .032, .95, 8); c.rotateZ(Math.PI / 2); c.translate(0, .04, 0); p.push(colored(c, '#6b4423')); }
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: kind === 'bottle' ? .15 : .6, metalness: kind === 'bin' ? .4 : 0 }));
  m.castShadow = true; return m;
}
function placeProps(){
  const spots = [];
  const add = (kind, base, ox, oz) => { if (!base) return; let [x, z] = [base.x + ox, base.z + oz]; if (typeof freeSpot === 'function') [x, z] = freeSpot(x, z); spots.push({ kind, x, z }); };
  add('chair', SPOT.counter, 2.2, 1.6); add('chair', SPOT.domino, -2.2, 1.4); add('bottle', SPOT.cart, 1.4, 2.4); add('bottle', SPOT.counter, -1.8, 2.2);
  if (typeof PL !== 'undefined') add('bin', PL.cafeOut, 3.2, -1.2);
  add('bin', SPOT.house, 2, 2); add('chair', SPOT.house, -2.2, 1.8);
  if (typeof PORT !== 'undefined'){ add('stick', PORT.door, 2.5, 1.5); add('bottle', PORT.door, -2.4, 2); add('bin', PORT.door, 3.5, -2); }
  if (typeof POL_STATION !== 'undefined') add('bin', POL_STATION, 3, 3);
  for (const s of spots){ const m = propMesh(s.kind); m.position.set(s.x, groundY(s.x, s.z), s.z); m.rotation.y = Math.random() * 6.28; scene.add(m); PROPS.push({ ...s, m, back: 0 }); }
}
let propsPlaced = false;   // placed on the first frame of play (the places are defined after this file)
const PROP_NAMES = { chair: 'الكرسي', bottle: 'القزازة', bin: 'الصفيحة', stick: 'الشومة' };
function propAction(p){
  if (hero.veh || MEL.grab) return null;
  let best = null, bd = 1.5;
  for (const pr of PROPS){ if (!pr.m.visible || WEAP.cur === pr.kind) continue; const d = Math.hypot(pr.m.position.x - p.x, pr.m.position.z - p.z); if (d < bd){ bd = d; best = pr; } }
  return best ? { text: `شيل ${PROP_NAMES[best.kind]}`, fn: () => pickProp(best) } : null;
}
function pickProp(pr){
  pr.m.visible = false; pr.back = 45; WEAP.picked = pr.kind; setWeapon(pr.kind); if (!WEAPONS[pr.kind].uses) WEAP.chairUses = 6; noise(.08, 900, .25);
}

// ---------- every frame ----------
function meleeUpdate(dt){
  if (state !== 'play'){ MEL.pressT = -1; return; }
  if (!propsPlaced){ propsPlaced = true; try { placeProps(); } catch (e){ console.warn('props', e); } }
  const d = hero.d;
  if (MEL.comboT > 0) MEL.comboT -= dt; if (MEL.dodgeCd > 0) MEL.dodgeCd -= dt; if (MEL.counter > 0) MEL.counter -= dt; if (MEL.guardBreak > 0) MEL.guardBreak -= dt;
  MEL.blockPressT += dt;
  // holding the attack button long enough = a kick
  if (MEL.pressT >= 0){ MEL.pressT += dt; if (MEL.pressT > .32 && !MEL.heavyDone){ MEL.heavyDone = true; if (!MEL.atk) punch(WEAP.cur === 'none' ? 'kick' : 'swing'); else MEL.queued = 'kick'; } }
  if (hero.veh || hero.locked || CUT.on){ MEL.atk = null; MEL.block = false; MEL.dodge = null; if (MEL.grab){ MEL.grab.n.state = 'walk'; MEL.grab = null; } }
  // the current attack
  if (MEL.atk){
    const A = MEL.atk, st = A.st; A.t += dt;
    if (d.is3D && CLIPS_READY) d.strike = { clip: st.clip, t: st.s0 + A.t * st.rate };
    if (!A.hit && A.t >= (st.tc - st.s0) / st.rate){ A.hit = true; landStrike(A); }
    if (A.t >= (st.te - st.s0) / st.rate){
      MEL.atk = null; if (A.kind !== 'throw') MEL.comboT = .5;
      if (MEL.queued){ const q = MEL.queued; MEL.queued = false; punch(q === true ? undefined : q); }
    }
  }
  // block / dodge
  MEL.block = MEL.blockKey && !MEL.atk && !MEL.dodge && !MEL.grab && MEL.guardBreak <= 0 && d.downT <= 0;
  if (MEL.block && d.is3D && CLIPS_READY) d.strike = { clip: 'block', t: 1.05 };
  if (MEL.dodge){ MEL.dodge.t += dt; if (d.is3D && CLIPS_READY) d.strike = { clip: 'roll', t: .1 + MEL.dodge.t * 3.2 }; if (MEL.dodge.t >= MEL.dodge.dur) MEL.dodge = null; }
  // holding someone
  if (MEL.grab){
    const G = MEL.grab, n = G.n; G.t += dt;
    if (n.state !== 'held'){ MEL.grab = null; }
    else if (d.downT > 0){ MEL.grab = null; n.state = G.wasFighter ? 'fight' : 'walk'; if (!G.wasFighter){ n.fleeT = 5; n.mel = false; } }
    else if (G.t > 1.8){   // he breaks free
      MEL.grab = null; if (G.wasFighter){ n.state = 'fight'; n.fightT = Math.max(n.fightT || 0, 6); } else { n.state = 'walk'; n.fleeT = 5; n.mel = false; n.mhp = undefined; } hero.knock.x -= Math.sin(d.yaw) * 4; hero.knock.z -= Math.cos(d.yaw) * 4; say(n, 'فلتّ منك!', 1.2, 'angry');
    } else {
      const fx = Math.sin(d.yaw), fz = Math.cos(d.yaw);
      let hx = hero.pos.x + fx * .72, hz = hero.pos.z + fz * .72;
      if (staticBlocked(hx, hz, .3)){ hx = hero.pos.x + fx * .3; hz = hero.pos.z + fz * .3; if (staticBlocked(hx, hz, .25)){ hx = n.g.position.x; hz = n.g.position.z; } }
      n.g.position.set(hx, groundY(hx, hz), hz); n.yaw = d.yaw + Math.PI; n.g.rotation.y = n.yaw;
      if (d.is3D && CLIPS_READY) d.strike = { clip: 'throw', t: .3 };
    }
  }
  // the men: flying after a throw, sliding back from a hit, staggering, blocking, the red ring
  let foeNear = false;
  for (const n of npcs){
    if (n.state === 'hidden'){ if (n.ring) n.ring.visible = false; dropToken(n); continue; }
    if (n.fly) updateFlying(n, dt);
    if (n.mel && (n.state === 'fight' || n.state === 'stagger') && !n.fly && staticBlocked(n.g.position.x, n.g.position.z, .2) && typeof freeSpot === 'function'){ const [ux, uz] = freeSpot(n.g.position.x, n.g.position.z); n.g.position.x = ux; n.g.position.z = uz; }   // never stuck inside a wall
    if (n.kb){ moveWithSlide(n.g.position, n.kb.x * dt, n.kb.z * dt, .3); const k = Math.exp(-dt * 7); n.kb.x *= k; n.kb.z *= k; if (Math.abs(n.kb.x) + Math.abs(n.kb.z) < .05) n.kb = null; }
    if (n.state === 'stagger'){ n.stagT -= dt; if (n.stagT <= 0) n.state = 'fight'; }
    if (n.blockT > 0) n.blockT -= dt;
    if (n.state !== 'fight' && n.state !== 'stagger') { if (n.windT > 0) n.windT = 0; if (n.state !== 'held') dropToken(n); }
    if (n.state === 'down' && n.mel && n.downT > 50) n.mel = false;
    if (!n.thug && n.mel && (n.state === 'walk' || n.state === 'goto')){ n.mel = false; n.mhp = undefined; }
    const r = n.ring; if (r || n.windT > 0){ const on = n.windT > 0; const R2 = ringFor(n); R2.visible = on; if (on){ R2.position.set(n.g.position.x, n.g.position.y + .04, n.g.position.z); const k = 1 - n.windT / styleOf(n).wind; R2.scale.setScalar(1.3 - k * .5); } }
    if (!foeNear && (n.state === 'fight' || n.state === 'stagger') && n.g.position.distanceTo(hero.pos) < 5) foeNear = true;
  }
  // in a fight, standing still, the hero keeps facing the man about to hit him (or the closest one)
  if (foeNear && !MEL.atk && !MEL.dodge && !MEL.grab && hero.vel.lengthSq() < .5){
    let best = null, bs = 1e9;
    for (const n of npcs){ if (n.state !== 'fight' && n.state !== 'stagger') continue; const dd = n.g.position.distanceTo(hero.pos) - (n.windT > 0 ? 3 : 0); if (dd < bs){ bs = dd; best = n; } }
    if (best) d.yaw = lerpAngle(d.yaw, Math.atan2(best.g.position.x - hero.pos.x, best.g.position.z - hero.pos.z), damp(MEL.block ? 14 : 6, dt));
  }
  d.combatT = foeNear || (enemy.active && !enemy.ally && enemy.pos.distanceTo(hero.pos) < 5) || (boss.active && boss.pos.distanceTo(hero.pos) < 5) ? .3 : Math.max(0, (d.combatT || 0) - dt);
  // the pick-ups come back after a while (when you are not looking)
  for (const pr of PROPS) if (!pr.m.visible){ pr.back -= dt; if (pr.back <= 0 && Math.hypot(pr.x - hero.pos.x, pr.z - hero.pos.z) > 15) pr.m.visible = true; }
  // the mobile buttons
  const b = document.body; b.classList.toggle('can-grab', !!MEL.grab || (!hero.veh && !!grabbable() && (foeNear || d.combatT > 0))); b.classList.toggle('blocking', MEL.block);
}
