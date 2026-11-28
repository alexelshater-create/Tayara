// ================= stage 18½: the police on foot, done properly =================
// - every officer has his own copy of the model (before, all of them shared ONE mesh: only the last one was drawn right)
// - the uniform follows the season like in Egypt: white in summer (May–October), black with the beret in winter
//   (assets/models/police-white / police-black when they are there, else the old model)
// - a real pistol in his hand (the game's pistol model), held with the pistol clips; he stops to shoot instead of
//   sliding backwards while shooting; shot or beaten down he falls with the «dying» clip, not like a plank
const COPM = { cur: 'soldier', summer: (m => m >= 4 && m <= 9)(new Date().getMonth()) };
(async () => {
  if (store.get('chars2d') === '1') return;
  const m = COPM.summer ? 'police-white' : 'police-black';
  for (let i = 0; i < 120 && typeof CLIPS_READY !== 'undefined' && !CLIPS_READY; i++) await new Promise(r => setTimeout(r, 500));
  try { if (!MODELS3D[m]){ const r = await loadModel3D(m); if (r) MODELS3D[m] = r; } } catch (e){}
  if (MODELS3D[m]) COPM.cur = m;
})();
copMake = function(){
  const m = MODELS3D[COPM.cur] ? COPM.cur : MODELS3D.soldier ? 'soldier' : null;
  const d = m ? makeDoll3D(cloneRig(MODELS3D[m]), CH.hero, 1.8) : makeDoll(CH.hero, 1.8); d.root.visible = false;
  if (d.R) d.R.mesh.castShadow = GFX !== 'low';
  return { d, pos: d.root.position, on: false, state: 'out', hp: 100, gunCd: 1, unit: null, vel: new THREE.Vector3(), hit: false, downT: 0, skin: m, gun: null };
};
// the uniform changed (the model came in after the first officers were made): officers off duty get the new one
{ const _sp = copSpawn; copSpawn = function(unit, side){
  for (let i = 0; i < POL.cops.length; i++){ const c = POL.cops[i]; if (!c.on && c.skin !== COPM.cur && MODELS3D[COPM.cur]){ scene.remove(c.d.root); if (c.gun) scene.remove(c.gun); POL.cops[i] = copMake(); } }
  const c = _sp(unit, side); if (c){ c.deadT = 0; c.d.gunSet = null; } return c;
}; }
{ const _hd = copHide; copHide = function(c){ _hd(c); if (c.gun) c.gun.visible = false; }; }

// the pistol in the hand
function copGunMesh(){
  const h = new THREE.Group();
  if (typeof WMODEL !== 'undefined' && WMODEL.pistol) h.add(WMODEL.pistol.clone());
  else { const m = new THREE.Mesh(new THREE.BoxGeometry(.035, .2, .05), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: .4, metalness: .6 })); m.position.y = .06; h.add(m); }
  h.visible = false; scene.add(h); return h;
}
const _cgF = new THREE.Vector3(), _cgY = new THREE.Vector3(), _cgZ = new THREE.Vector3(), _cgX = new THREE.Vector3(), _cgM = new THREE.Matrix4(), _cgQ = new THREE.Quaternion(), _cgP = new THREE.Vector3(), _cgU = new THREE.Vector3(0, 1, 0);
function placeCopGun(c, aiming){
  const R = c.d.R, B = R && R.bones; if (!B || !B.handR){ if (c.gun) c.gun.visible = false; return; }
  if (!c.gun || (!c.gun.userData.real && typeof WMODEL !== 'undefined' && WMODEL.pistol)){ if (c.gun) scene.remove(c.gun); c.gun = copGunMesh(); c.gun.userData.real = typeof WMODEL !== 'undefined' && !!WMODEL.pistol; }
  R.mesh.updateMatrixWorld(true); B.handR.getWorldPosition(_cgP);
  _cgF.set(Math.sin(c.d.yaw), 0, Math.cos(c.d.yaw));
  if (aiming){ const f = heroAt(); _cgY.set(f.x - _cgP.x, (hero.veh ? f.y + .9 : hero.pos.y + 1.2) - _cgP.y, f.z - _cgP.z).normalize(); }
  else _cgY.copy(_cgF).multiplyScalar(.45).addScaledVector(_cgU, -.9).normalize();   // pointing at the ground while he runs
  _cgZ.copy(_cgU).addScaledVector(_cgY, -_cgY.dot(_cgU)).normalize().negate(); _cgX.crossVectors(_cgY, _cgZ).normalize();
  _cgM.makeBasis(_cgX, _cgY, _cgZ); _cgQ.setFromRotationMatrix(_cgM);
  c.gun.position.copy(_cgP); c.gun.quaternion.copy(_cgQ); c.gun.visible = c.d.root.visible;
  c.muzzle = (c.muzzle || new THREE.Vector3()).copy(_cgP).addScaledVector(_cgY, .2);
}
// the shot comes out of the gun, not out of his chest
{ const _cs = copShoot; copShoot = function(c){ _cs(c); if (c.muzzle){ const T = copTracers.find(T => T.t > .05); if (T){ const a = T.l.geometry.attributes.position; a.setXYZ(0, c.muzzle.x, c.muzzle.y, c.muzzle.z); a.needsUpdate = true; } } }; }

copStep = function(c, dt, t){
  const d0 = c.d, clips = typeof CLIPS_READY !== 'undefined' && CLIPS_READY && CLIPS.dying;
  if (c.state === 'down'){
    c.downT -= dt; c.deadT = (c.deadT || 0) + dt; if (c.gun) c.gun.visible = false; d0.gunSet = null;
    if (c.downT <= 0 && Math.hypot(c.pos.x - hero.pos.x, c.pos.z - hero.pos.z) > 40){ copHide(c); return; }
    if (d0.is3D && clips){ d0.downT = 0; d0.fall = 0; d0.strike = { clip: 'dying', t: Math.min(c.deadT, CLIPS.dying.dur - .02) }; }
    animDoll(d0, 0, 0, dt, t); return;
  }
  const f = heroAt(), dx = f.x - c.pos.x, dz = f.z - c.pos.z, d = Math.hypot(dx, dz) || 1;
  const armed = POL.heat >= 3, los = lineOfSight(c.pos.x, c.pos.z, f.x, f.z);
  let vx = 0, vz = 0, sp = 0, aiming = false;
  const away = hero.veh && Math.abs(hero.veh.speed) > 4;
  if (c.state === 'back'){ c.backT = (c.backT || 0) + dt; if (c.backT > 3.5){ copHide(c); return; } } else c.backT = 0;
  if (c.state === 'back' || away){
    c.state = 'back'; const v = c.unit && c.unit.active ? c.unit.v : null;
    if (!v){ copHide(c); return; }
    const ex = v.pos.x - c.pos.x, ez = v.pos.z - c.pos.z, e = Math.hypot(ex, ez) || 1;
    if (e < 2.4){ copHide(c); return; }
    sp = 5.6; vx = ex / e * sp; vz = ez / e * sp;
    if (!away && (!hero.veh || Math.abs(hero.veh.speed) < 3) && d < 30) c.state = 'run';
  } else if (armed){
    c.state = 'run';
    if (d > 17 || !los){ sp = d > 26 ? 5.4 : 2.4; vx = dx / d * sp; vz = dz / d * sp; }   // close enough: walks in with the gun up
    else aiming = true;                                                                    // in sight and in range: stands and shoots
    if (sp > 0 && sp < 3 && los) aiming = true;
    c.gunCd -= dt;
    if (c.gunCd <= 0 && los && d < 32 && aiming){ c.gunCd = 1.15 + Math.random() * .8 - POL.heat * .08; copShoot(c); }
    if (aiming && sp === 0) d0.strike = { clip: 'pistolShoot', t: c.fireT > 0 ? 1.08 : 1.0 };
    if (c.fireT > 0) c.fireT -= dt;
  } else {
    c.state = 'run';
    if (d > 1.15){ sp = d > 4 ? 5.6 : 2.2; vx = dx / d * sp; vz = dz / d * sp; }
  }
  d0.gunSet = armed && c.state !== 'back' ? { idle: 'pistolIdle', walk: 'pistolWalk', run: 'run' } : null;
  if (aiming && sp > 0) d0.aimYaw = Math.atan2(dx, dz); else d0.aimYaw = null;
  if (sp){ moveWithSlide(c.pos, vx * dt, vz * dt, .3); c.pos.y = groundY(c.pos.x, c.pos.z); }
  for (const o of POL.cops) if (o !== c && o.on){ const ex = c.pos.x - o.pos.x, ez = c.pos.z - o.pos.z, e = Math.hypot(ex, ez); if (e < .8 && e > .01){ c.pos.x += ex / e * (.8 - e) * .5; c.pos.z += ez / e * (.8 - e) * .5; } }
  animDoll(d0, vx, vz, dt, t);
  if (d0.is3D && armed && c.state !== 'back' && Math.hypot(c.pos.x - camera.position.x, c.pos.z - camera.position.z) < 60) placeCopGun(c, aiming);
  else if (c.gun) c.gun.visible = false;
};
