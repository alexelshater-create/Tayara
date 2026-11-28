// ================= stage 18½: real people only, and people die =================
// 1) Everyone in the street wears a 3D person (no more box people). Far away nobody is drawn and nobody is animated.
// 2) Shot, or run over fast → he dies: a real fall (the «dying» clip), blood, and the body stays until you have looked away
//    for 30 s, then it is gone (and the person goes back to the pool of walkers).
// 3) Knocked down (not dead): the «knocked» clip, then «getUp» – no more tipping the whole statue over.
// 4) You can hit someone on the ground: tap/hold next to a body = a kick at the body (4 kicks on a downed man kill him).
const P3 = { ready: false, list: [], far: LOW ? 38 : GFX === 'high' ? 85 : 58, fr: new THREE.Frustum(), frT: 0 };
const canDie = n => !n.thug && !n.friend && !n.keeperOf && !['friend', 'story', 'keeper', 'named', 'act', 'guest', 'pax', 'thug'].includes(n.role);
const clipsOk = () => typeof CLIPS_READY !== 'undefined' && CLIPS_READY && CLIPS.dying && CLIPS.knocked;

// a person can change clothes (the story's thugs put on the thug model even if he walked in another one)
{ const _w = npcWear3D; npcWear3D = function(n, model){ if (n.r3 && n.r3Model !== model && MODELS3D[model]) npcTakeOff3D(n); const ok = _w(n, model); if (ok) n.r3Model = model; return ok; }; }

// wait for the people models (19zzzzz-friends loads them), then everyone wears one
(async () => {
  if (store.get('chars2d') === '1') return;
  for (let i = 0; i < 400; i++){ const have = PEOPLE.filter(m => MODELS3D[m]); if (have.length >= 6 || (i > 240 && have.length)) break; await new Promise(r => setTimeout(r, 500)); }
  P3.list = PEOPLE.filter(m => MODELS3D[m]); if (MODELS3D.npc) P3.list.push('npc');
  P3.ready = P3.list.length > 0;
})();
let p3i = 0;
const dressUp = n => { if (!P3.ready || n.r3 || n.friend || n.role === 'friend') return; if (npcWear3D(n, P3.list[p3i++ % P3.list.length]) && n.r3) n.r3.mesh.castShadow = GFX === 'high'; };

// ---------- dying ----------
function npcDie(n, why){
  if (n.state === 'dead' || n.state === 'hidden' || !canDie(n)) return;
  n.state = 'dead'; n.deadT = 0; n.deadWhy = why; n.fightT = 0; n.fleeT = 0; n.chaseT = 0; n.lifeAnim = null; n.mstrike = null; n.mel = false; n.onArrive = null;
  n.dieClipT = why === 'car' || why === 'blast' ? (CLIPS.dying ? CLIPS.dying.dur * .55 : 0) : 0;   // thrown by a car: he lands already falling
  n.poolT = 0; n.poolAt = true;   // the blood pool comes where he ends up lying, not where he stood
  if (typeof crime === 'function') crime('murder', n.g.position, 2, n);
  // the people around scream and run
  for (const o of npcs){ if (o === n || o.state !== 'walk' || !o.g.visible) continue; if (o.g.position.distanceTo(n.g.position) < 18){ o.fleeT = 8; if (Math.random() < .3) say(o, rpick(['يا لهوي!! مات!', 'إسعاف!! حد يطلب الإسعاف!', 'قتله!! قتله!', 'لا حول ولا قوة إلا بالله']), 1.8, 'angry'); } }
}
// a shot that put a civilian down kills him
{ const _sh = shotHits; shotHits = function(h, dir, G, big){ _sh(h, dir, G, big); const n = h && h.who && h.who.n; if (n && n.shot && n.state === 'down' && !n.mel) npcDie(n, 'shot'); }; }
// a car that hits fast kills: he dies when he lands
{ const _nl = npcLaunch; npcLaunch = function(n, v){ _nl(n, v); if (Math.abs(v.speed) >= 9 && canDie(n)) n.dieOnLand = 'car'; }; }
// nothing makes a dead man stand up and talk
{ const _nh = npcHit; npcHit = function(n, power = 1){ if (n.state === 'dead'){ groundHit(n); return; } _nh(n, power); }; }
if (typeof meleeHitNPC === 'function'){ const _mh = meleeHitNPC; meleeHitNPC = function(n, ...a){ if (n.state === 'dead'){ groundHit(n); return; } return _mh(n, ...a); }; }

// ---------- hitting someone on the ground ----------
// the stomp (tap) and the kick at a body on the ground (hold): Mixamo «Stomp» and «Soccer Penalty Kick», the foot lands at .72 s / .8 s
STRIKES.stomp = { clip: 'stomp', s0: .38, tc: .72, te: 1.3, rate: 1.4, dmg: 1.6, push: 0, heavy: true, range: .1 };
STRIKES.groundKick = { clip: 'groundKick', s0: .5, tc: .8, te: 1.25, rate: 1.35, dmg: 2.2, push: 0, big: true, heavy: true, range: .2 };
function groundTarget(r){
  const p = hero.pos; let best = null, bd = r;
  for (const n of npcs){ if ((n.state !== 'down' && n.state !== 'dead') || !n.g.visible || n.fly) continue; const d = Math.hypot(n.g.position.x - p.x, n.g.position.z - p.z); if (d < bd){ bd = d; best = n; } }
  return best;
}
function groundHit(n){
  const p = n.g.position.clone().setY(n.g.position.y + .25);
  if (typeof bleed === 'function') bleed(p, new THREE.Vector3(0, 1, 0), false);
  thud(.6); shake = Math.max(shake, .06);
  n.jolt = .18;   // the body jerks
  if (n.state === 'down'){ n.downT = Math.max(n.downT, 4); n.groundHits = (n.groundHits || 0) + 1; if (n.groundHits >= 4) npcDie(n, 'beaten'); else if (typeof crime === 'function') crime('assault', n.g.position, 1, n); }
  if (!(n.poolT > 0) && Math.random() < .35) n.poolT = .3;
}
{ const _pu = punch; punch = function(kind){
  if (!isGun(WEAP.cur) && !hero.veh && !hero.locked && !MEL.atk && !MEL.grab && !MEL.dodge && !(hero.d.downT > 0)){
    const up = fightTargets(weaponRange() + .9);
    if (!up || up.d > 1.7){ const g = groundTarget(1.9);
      if (g){ const gk = kind === 'kick' ? (CLIPS.groundKick ? 'groundKick' : 'kick') : (CLIPS.stomp ? 'stomp' : 'kick'), st = STRIKES[gk], p = hero.pos, d = Math.hypot(g.g.position.x - p.x, g.g.position.z - p.z);
        hero.d.yaw = Math.atan2(g.g.position.x - p.x, g.g.position.z - p.z);
        if (d > 1.1){ hero.knock.x += (g.g.position.x - p.x) / d * 3; hero.knock.z += (g.g.position.z - p.z) / d * 3; }
        MEL.atk = { kind: gk, st, t: 0, hit: false, tg: { ground: g, x: g.g.position.x, z: g.g.position.z, d }, range: 2.2 }; MEL.combo = 0;
        if (!hero.d.is3D || !CLIPS_READY) hero.d.punchT = .28;
        punchWhoosh(); return; } }
  }
  return _pu(kind);
}; }
{ const _st = stillThere; stillThere = function(tg){ if (tg.ground) return tg.ground.state === 'down' || tg.ground.state === 'dead'; return _st(tg); }; }
{ const _ls = landStrike; landStrike = function(A){ if (A.tg && A.tg.ground){ const n = A.tg.ground, d = n.g.position.distanceTo(hero.pos); if (d < 2.3 && (n.state === 'down' || n.state === 'dead')) groundHit(n); return; } _ls(A); }; }

// ---------- the 3D people's poses while down / dead ----------
{ const _a3 = animNPC3D; animNPC3D = function(n, moving, sitting, dt){
  if (!n.r3.mesh.visible) return;   // too far to be drawn: no animation work either
  if ((n.state === 'down' || n.state === 'dead') && clipsOk()){
    let clip, ct;
    if (n.state === 'dead'){ clip = 'dying'; ct = Math.min(n.dieClipT, CLIPS.dying.dur - .02); }
    else { const gu = CLIPS.getUp, left = n.downT;
      if (gu && left < gu.dur * .8 && !n.thugDone && n.downT < 50){ clip = 'getUp'; ct = gu.dur * .2 + (gu.dur * .8 - left); }
      else { clip = 'knocked'; ct = Math.min(n.downAt || 0, CLIPS.knocked.dur - .02); } }
    if (n.jolt > 0) ct = Math.max(0, ct - n.jolt * .5);
    poseRig(n.r3, 'strike', dt, { clip, ct }); return;
  }
  _a3(n, moving, sitting, dt);
}; }

// ---------- every frame, per person ----------
{ const _un = updateNPC; updateNPC = function(n, dt){
  if (n.state !== 'hidden' && !n.r3) dressUp(n);
  if (n.state === 'down'){ n.downAt = (n._was === 'down' ? n.downAt || 0 : 0) + dt; if (n.dieOnLand && !n.fly){ const w = n.dieOnLand; n.dieOnLand = null; npcDie(n, w); } else if (n.fly && n.downT > 10 && !n.dieOnLand && canDie(n)) n.dieOnLand = 'blast'; }
  else { n.groundHits = 0; if (n.state !== 'dead') n.dieOnLand = null; }
  if (n.jolt > 0) n.jolt = Math.max(0, n.jolt - dt);
  if (n.state === 'dead'){
    n.deadT += dt; n.dieClipT += dt;
    if (n.poolAt && (!clipsOk() || !n.r3 || n.dieClipT > CLIPS.dying.dur * .8) && !n.fly){ n.poolAt = false; const v = new THREE.Vector3(); if (n.r3 && n.r3.bones.chest) n.r3.bones.chest.getWorldPosition(v); else v.copy(n.g.position);
      if (typeof bloodPool === 'function') bloodPool(v.x, v.z, .6 + Math.random() * .35); }
    n.fall += (1 - n.fall) * damp(10, dt);
    if (n.r3 && clipsOk()) animNPC3D(n, 0, false, dt);
    n.g.rotation.x = n.r3 && clipsOk() ? 0 : -n.fall * 1.5;
    if (!n.fly) n.g.position.y = groundY(n.g.position.x, n.g.position.z);
    // gone once you have not been looking for a while
    if (n.deadT > 30 && (n.deadT > 120 || !P3.fr.containsPoint(n.g.position) || n.g.position.distanceTo(camera.position) > 70)){
      n.state = 'hidden'; n.g.visible = false; n.shot = false; n.fly = null; n.dieOnLand = null; n.g.rotation.set(0, 0, 0); n.fall = 0; n.downT = 0;
      n.timeOff = true; n.role = n.crowd ? 'crowd' : 'walker';
    }
  } else _un(n, dt);
  if (n.r3 && clipsOk() && n.state === 'down') n.g.rotation.x = 0;   // the clip lays him down, the body is not tipped like a plank
  n._was = n.state;
  // what is drawn: 3D people near you; nobody far; never a box person once the models are here
  if (n.r3) n.r3.mesh.visible = n.g.position.distanceTo(camera.position) < P3.far || n.role === 'friend';
  else if (P3.ready && n.state !== 'hidden') n.body.visible = false;
}; }
{ const _ul = streetLifeUpdate; streetLifeUpdate = function(dt, t){ P3.frT -= dt; if (P3.frT <= 0){ P3.frT = .4; camera.updateMatrixWorld(); P3.fr.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)); } _ul(dt, t); }; }
