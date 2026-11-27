// ================= Mixamo moves on our own characters =================
// assets/anims/<name>.json are made by tools/mixamo_to_clips.py from Mixamo animations. Each frame stores how much the
// body (pelvis, spine, chest, neck, head) has turned, the direction every arm and leg bone points, and where the hips
// are. Here those are put on each character's own skeleton (05b-rig3d.js): body bones copy the turn, limb bones are
// turned from their own rest direction to the clip's direction, so the move fits any body shape and any rest pose.
// Loading runs in the background; until a clip is there (or for moves without one, like riding the moto) the
// hand-made poses in poseRig() are used.
const CLIP_NAMES = ['idle', 'look', 'walk', 'run', 'sprint', 'crouch', 'jump', 'fall', 'hardLand', 'roll', 'getUp', 'swim', 'tread', 'climb',
  'fightIdle', 'jab', 'cross', 'hook', 'kick', 'block', 'stab', 'melee', 'throw', 'hit', 'hit2', 'knocked', 'dying',
  'pistolIdle', 'pistolWalk', 'pistolShoot', 'rifleIdle', 'rifleWalk', 'rifleRun', 'rifleFire', 'reload',
  'sit', 'sitTalk', 'standUp', 'talk', 'phone', 'wave', 'cheer', 'clap', 'argue', 'dance1', 'dance2', 'kneel',
  // stage 10: cars, falls, reactions, greeting and provoking
  'carEnter', 'carExit', 'pullDriver', 'pulledOut', 'hitByCar', 'shoved', 'stumbleBack', 'trip', 'loseBalance', 'thrown', 'flyBack', 'terrified', 'filming', 'handshake', 'greet', 'taunt', 'insult', 'angry', 'push', 'coverIdle'];
const CLIPS = {}; let CLIPS_READY = false;
const CLIP_CARRIED = ['climb', 'roll', 'knocked', 'dying', 'getUp'];
const CLIP_PINGPONG = ['phone', 'argue'];   // first and last frames differ: play forward then back
// how fast each step clip walks at rate 1, in hip heights per second (measured from the planted foot)
const CLIP_SPEED = { walk: 1.85, run: 4.14, sprint: 5.53, pistolWalk: 2.55, rifleWalk: 1.41, rifleRun: 3.12 };
const CLIP_BODY = ['pelvis', 'spine', 'chest', 'neck', 'head'];
const CLIP_LIMB = [['upperArmL', 'chest'], ['lowerArmL', 'upperArmL'], ['handL', 'lowerArmL'], ['upperArmR', 'chest'], ['lowerArmR', 'upperArmR'], ['handR', 'lowerArmR'],
  ['upperLegL', 'pelvis'], ['lowerLegL', 'upperLegL'], ['footL', 'lowerLegL'], ['upperLegR', 'pelvis'], ['lowerLegR', 'upperLegR'], ['footR', 'lowerLegR']];
if (store.get('ty_clips') !== '0') (async () => {
  await Promise.all(CLIP_NAMES.map(async n => {
    try { const j = await (await fetch(`assets/anims/${n}.json`)).json(); const T = {}; for (const k in j.tracks) T[k] = Float32Array.from(j.tracks[k]); CLIPS[n] = { fps: j.fps, n: j.frames, dur: j.dur, T };
      // clips where the game itself carries the character (up the ledge, along the roll): take out the clip's own travel
      if (CLIP_CARRIED.includes(n) && T.hipsP){ const H = T.hipsP, F = j.frames; for (let f = 0; f < F; f++){ const k = f / (F - 1); for (let a = 0; a < 3; a++) H[f*3+a] -= (H[(F-1)*3+a] - H[a]) * k; } }
    }
    catch (e){ console.warn('clip failed', n); }
  }));
  CLIPS_READY = Object.keys(CLIPS).length > 0;
})();

// each character's rest directions, from its own joints
function rigRestDirs(R){
  if (R.rd) return R.rd; const J = R.J, d = (a, b) => b.clone().sub(a).normalize();
  R.rd = {};
  for (const [s, A, L] of [['L', J.armL, J.legL], ['R', J.armR, J.legR]]){
    R.rd['upperArm' + s] = d(A.sh, A.el); R.rd['lowerArm' + s] = d(A.el, A.wr); R.rd['hand' + s] = d(A.wr, A.tip);
    R.rd['upperLeg' + s] = d(L.hip, L.knee); R.rd['lowerLeg' + s] = d(L.knee, L.ankle); R.rd['foot' + s] = d(L.ankle, L.toe);
  }
  return R.rd;
}
const _cq0 = new THREE.Quaternion(), _cq1 = new THREE.Quaternion(), _cv0 = new THREE.Vector3(), _cv1 = new THREE.Vector3(), _cW = {};
for (const k of [...CLIP_BODY, ...CLIP_LIMB.map(x => x[0])]) _cW[k] = new THREE.Quaternion();
const _cInv = new THREE.Quaternion();
// put frame-time t of clip C on rig R (bones were reset to rest by poseRig just before)
function applyClip(R, C, t, mir){   // mir: mirrored left / right (a move done from the other side)
  const B = R.bones, T = C.T, f = clamp(t * C.fps, 0, C.n - 1), i0 = Math.floor(f), i1 = Math.min(C.n - 1, i0 + 1), k = f - i0;
  for (const b of CLIP_BODY){ const a = T[b]; _cq0.fromArray(a, i0 * 4); _cq1.fromArray(a, i1 * 4); _cW[b].slerpQuaternions(_cq0, _cq1, k); if (mir) _cW[b].set(_cW[b].x, -_cW[b].y, -_cW[b].z, _cW[b].w); }
  B.pelvis.quaternion.copy(_cW.pelvis);
  B.spine.quaternion.copy(_cInv.copy(_cW.pelvis).invert().multiply(_cW.spine));
  B.chest.quaternion.copy(_cInv.copy(_cW.spine).invert().multiply(_cW.chest));
  B.neck.quaternion.copy(_cInv.copy(_cW.chest).invert().multiply(_cW.neck));
  B.head.quaternion.copy(_cInv.copy(_cW.neck).invert().multiply(_cW.head));
  const rd = rigRestDirs(R);
  for (const [b, parent] of CLIP_LIMB){
    const a = T[mir ? (b.endsWith('L') ? b.slice(0, -1) + 'R' : b.endsWith('R') ? b.slice(0, -1) + 'L' : b) : b]; if (!a) continue;
    _cv0.fromArray(a, i0 * 3); _cv1.fromArray(a, i1 * 3); _cv0.lerp(_cv1, k).normalize(); if (mir) _cv0.x = -_cv0.x;
    _cW[b].setFromUnitVectors(rd[b], _cv0);
    B[b].quaternion.copy(_cInv.copy(_cW[parent]).invert().multiply(_cW[b]));
  }
  const H = T.hipsP; if (H){ _cv0.fromArray(H, i0 * 3); _cv1.fromArray(H, i1 * 3); _cv0.lerp(_cv1, k); if (mir) _cv0.x = -_cv0.x; const hp = R.J.pelvis.y; B.pelvis.position.set(R.J.pelvis.x + _cv0.x * hp, _cv0.y * hp, _cv0.z * hp); }
}
// which clip goes with a move, how fast, and whether it loops. o.sp = the character's speed (m/s)
const CLIP_FOR = { pistolIdle: 'pistolIdle', rifleIdle: 'rifleIdle', idle: 'idle', hit: 'hit2', fall: 'fall', landHard: 'hardLand', swim: 'swim', tread: 'tread', climb: 'climb', sit: 'sit', shisha: 'sit',
  cheer: 'cheer', wave: 'wave', kneel: 'kneel', phone: 'phone', clap: 'clap', argue: 'argue', fightIdle: 'fightIdle', block: 'block', kick: 'kick', getUp: 'getUp', knocked: 'knocked', dying: 'dying' };
const CLIP_ONCE = { jump: .22, landHard: .25, climb: 0, hit: 0, punch: .18, kick: .1, knocked: 0, getUp: 0, dying: 0 };   // non-looping, with where they start (s)
function clipPose(R, move, dt, o){
  if (!CLIPS_READY || R.noClips) return false;
  if (move === 'strike'){ const C = CLIPS[o.clip]; if (!C) return false; const A = R.anim || (R.anim = {}); A.name = o.clip; A.move = 'strike'; applyClip(R, C, clamp(o.ct, 0, C.dur), o.mirror); return true; }
  let name = CLIP_FOR[move], rate = 1;
  if (move === 'pistolWalk' || move === 'rifleWalk' || move === 'rifleRun'){ name = move; rate = clamp((o.sp ?? 2) / (CLIP_SPEED[move] * (R.J.pelvis.y || .9)), .6, 1.9); }
  else if (move === 'walk' || move === 'run'){
    let sp = o.sp ?? (move === 'run' ? 5 : 1.5); if (sp < .1) sp = move === 'run' ? 4 : 1.5;   // standing still but told to walk/run (cutscenes)
    const hp = R.J.pelvis.y || .9;
    name = sp < 2.7 ? 'walk' : (sp < 6.8 || R.skirt) ? 'run' : 'sprint';
    rate = clamp(sp / (CLIP_SPEED[name] * hp), .7, 1.9);
  } else if (move === 'punch') { name = (o.side || 1) > 0 ? 'cross' : 'jab'; rate = 1.5; }
  else if (move === 'jump') name = 'jump';
  else if (move === 'dance') name = (R.mesh.id % 2) ? 'dance2' : 'dance1';
  else if (move === 'swim') rate = clamp((o.sp ?? 2) / 1.8, .7, 1.6);
  else if (move === 'climb') rate = 1.9;
  const C = name && CLIPS[name]; if (!C) return false;
  const A = R.anim || (R.anim = {});
  const once = move in CLIP_ONCE;
  if (A.name !== name || A.move !== move){ A.name = name; A.move = move; A.t = once ? CLIP_ONCE[move] || 0 : (A.t || 0); }
  A.t += dt * rate;
  let t = once ? Math.min(A.t, C.dur) : A.t % C.dur;
  if (!once && CLIP_PINGPONG.includes(name) && (A.t % (2 * C.dur)) > C.dur) t = C.dur - t;
  applyClip(R, C, t);
  return true;
}
