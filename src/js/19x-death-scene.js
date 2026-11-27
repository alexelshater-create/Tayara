// ================= «راحت عليك» / «اتمسكت»: the death and arrest scenes (like GTA) =================
// Everything slows down, the hero falls (or kneels with his hands up for the police), the camera circles him and rises,
// the picture goes grey and the big word comes up. Then a fade, and the game goes on (19q's bribe panel, the knockout).
const DSC = { on: false, t: 0, kind: null, after: null, ang: 0, clip: null, said: false, done: false };
const DSC_SLOW = .32;
function sceneTimeScale(){ return DSC.on ? DSC_SLOW : 1; }
const bigMsg = document.createElement('div'); bigMsg.id = 'bigMsg'; bigMsg.innerHTML = '<b></b><small></small>'; document.body.appendChild(bigMsg);
function deathScene(kind, why, after){
  if (DSC.on){ return; }
  if (CUT.on || HOUSE.inside || state !== 'play' || !hero.d.is3D){ after(); return; }   // no scene where it can't be shown
  Object.assign(DSC, { on: true, t: 0, kind, after, said: false, done: false, ang: CAM.orbitSm });
  if (hero.veh) exitVehicle(true);
  hero.locked = true; hero.inv = 99; hero.vel.set(0, 0, 0); if (typeof setWeapon === 'function' && kind === 'dead') setWeapon('none', true);
  DSC.clip = kind === 'busted' ? 'kneel' : why === 'car' ? (CLIPS.hitByCar ? 'hitByCar' : 'dying') : why === 'fall' ? (CLIPS.knocked ? 'knocked' : 'dying') : (CLIPS.dying ? 'dying' : 'knocked');
  document.body.classList.add('dscene', 'ds-' + kind);
  playS(kind === 'busted' ? 'block' : 'fall', .8, .8);
}
function deathSceneUpdate(dt){
  if (!DSC.on) return; const real = dt / DSC_SLOW; DSC.t += real;
  const C = CLIPS[DSC.clip];
  if (C){ const len = C.dur || 2; hero.d.strike = { clip: DSC.clip, t: DSC.kind === 'busted' ? Math.min(len * .55, .3 + DSC.t * .5) : Math.min(len - .05, DSC.t * .95) }; }
  if (!DSC.said && DSC.t > .9){ DSC.said = true; bigMsg.querySelector('b').textContent = DSC.kind === 'busted' ? 'اتمسكت' : 'راحت عليك'; bigMsg.querySelector('small').textContent = ''; bigMsg.className = 'show ' + DSC.kind; }
  if (!DSC.done && DSC.t > 4.3){ DSC.done = true; const after = DSC.after;
    fadeTo(() => { DSC.on = false; bigMsg.className = ''; document.body.classList.remove('dscene', 'ds-dead', 'ds-busted'); hero.locked = false; hero.inv = 2; hero.d.strike = null; try { after(); } catch (e){ console.error(e); } }); }
}
// the camera: around the hero, slowly going up and back
function deathCam(dt){
  const real = dt / DSC_SLOW, p = hero.pos; DSC.ang += real * .32;
  const R = 4.2 + Math.min(DSC.t, 4) * .7, H = 1.6 + Math.min(DSC.t, 4) * 1.1;
  _t.set(p.x + Math.sin(DSC.ang) * R, p.y + H, p.z + Math.cos(DSC.ang) * R);
  camera.position.lerp(_t, damp(2.5, real)); lookAt.lerp(_t.set(p.x, p.y + .5, p.z), damp(4, real));
}
