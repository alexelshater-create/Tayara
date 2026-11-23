let BUILD_CULL2 = 215 * 215;   // set by gfxWorld(): buildings further than the fog aren't drawn
// ================= camera =================
const lookAt = new THREE.Vector3(); let camYaw = 0;
const ray = new THREE.Ray(), headPos = new THREE.Vector3(), _t = new THREE.Vector3();
function updateCamera(dt){
  const v = hero.veh;
  if (CUT.on){ /* the cutscene moves the camera */ } else if (ACT.cam){ camera.position.lerp(ACT.cam.p, damp(5, dt)); lookAt.lerp(ACT.cam.l, damp(6, dt)); } else if (ST.kind){ stationCamera(dt); } else if (v){
    // look-around offset from dragging; it eases back behind the vehicle after a moment
    if (performance.now() - CAM.lastDrag > 1400) CAM.veh *= Math.exp(-dt*2.5);
    const sp = clamp(Math.abs(v.speed) / v.max, 0, 1);
    const fv = (CAM.vmode === 2 ? 62 : 46) + sp*12; if (Math.abs(camera.fov - fv) > .2){ camera.fov += (fv - camera.fov)*damp(3, dt); camera.updateProjectionMatrix(); }
    // the camera's own heading swings round after the car's (quicker when going fast), so turns feel smooth, not stiff
    let dy = v.yaw - CAM.cy; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); CAM.cy += dy * damp(2.2 + sp*3, dt);
    if (CAM.vmode === 2){
      // inside: just above the bonnet, looking down the road
      const fx = Math.sin(v.yaw + CAM.veh), fz = Math.cos(v.yaw + CAM.veh), h = v.type === 'moto' ? 1.55 : v.type === 'tuk' ? 1.6 : 1.4, fwd = v.type === 'moto' ? .1 : v.type === 'tuk' ? .6 : 1.85;
      camera.position.set(v.pos.x + Math.sin(v.yaw)*fwd, v.pos.y + h, v.pos.z + Math.cos(v.yaw)*fwd);
      lookAt.set(v.pos.x + fx*12, v.pos.y + h - .55, v.pos.z + fz*12);
    } else {
      const far = CAM.vmode === 1, vy = CAM.cy + CAM.veh, fx = Math.sin(vy), fz = Math.cos(vy);
      const back = (v.type === 'moto' ? 5.6 : 7.2) * (far ? 1.55 : 1) + sp*1.2, up = (v.type === 'moto' ? 2.4 : 3) * (.6 + CAM.tilt*.9) * (far ? 1.45 : 1);
      _t.set(v.pos.x - fx*back, v.pos.y + up, v.pos.z - fz*back);
      camera.position.x = _t.x; camera.position.z = _t.z; camera.position.y += (_t.y - camera.position.y) * damp(6, dt);
      // look a little ahead of the car, more at speed
      const ahead = 2.5 + sp*5, ly = v.yaw; lookAt.lerp(_t.set(v.pos.x + Math.sin(ly)*ahead, v.pos.y + 1.1, v.pos.z + Math.cos(ly)*ahead), damp(10, dt));
    }
  } else {
    if (Math.abs(camera.fov - 46) > .2){ camera.fov += (46 - camera.fov)*damp(4, dt); camera.updateProjectionMatrix(); }
    camDist += (camTarget - camDist) * damp(5, dt); const p = hero.pos;
    if (keys.KeyQ) CAM.orbit += dt*2; if (keys.KeyR) CAM.orbit -= dt*2;
    CAM.orbitSm += (CAM.orbit - CAM.orbitSm) * damp(14, dt);
    lookAt.lerp(_t.set(p.x, p.y + 1.2, p.z), damp(9, dt));
    const o = CAM.orbitSm, hgt = .4 + camDist*CAM.tilt;
    camera.position.set(lookAt.x + Math.sin(o)*camDist, lookAt.y - .1 + hgt, lookAt.z + Math.cos(o)*camDist);
    if (HOUSE.inside){ const r = HOUSE.room; camera.position.x = clamp(camera.position.x, r.x0 + .25, r.x1 - .25); camera.position.z = clamp(camera.position.z, r.z0 + .25, r.z1 - .1); camera.position.y = Math.min(camera.position.y, 2.75); }
  }
  if (shake > 0){ shake -= dt; camera.position.x += (Math.random()-.5)*shake*.5; camera.position.y += (Math.random()-.5)*shake*.5; }
  camera.lookAt(lookAt);
  camYaw = Math.atan2(camera.position.x - lookAt.x, camera.position.z - lookAt.z);
  // fade buildings between the camera and the focus point
  const f = CUT.on ? lookAt : v ? v.pos : hero.pos; headPos.set(f.x, f.y + (CUT.on ? 0 : 1.4), f.z);   // in a scene: whatever the camera looks at
  ray.origin.copy(camera.position); ray.direction.copy(headPos).sub(camera.position); const segLen = ray.direction.length(); ray.direction.normalize();
  for (const b of buildings){
    if (b.cx === undefined){ b.box.getCenter(_t); b.cx = _t.x; b.cz = _t.z; }
    const ddx = b.cx - f.x, ddz = b.cz - f.z, vis = ddx*ddx + ddz*ddz < BUILD_CULL2; if (b.grp.visible !== vis) b.grp.visible = vis; if (!vis) continue;
    const hit = ray.intersectBox(b.box, _t); const blocking = hit && camera.position.distanceTo(_t) < segLen - .3;
    const target = blocking ? .18 : 1;
    if (Math.abs(b.opacity - target) > .005){ b.opacity += (target - b.opacity) * damp(10, dt); const tr = b.opacity < .98; for (const m of b.mats){ m.opacity = b.opacity; if (m.transparent !== tr){ m.transparent = tr; m.depthWrite = !tr; m.needsUpdate = true; } } }
  }
  sun.target.position.copy(f); sun.position.copy(f).addScaledVector(sunDir, 120);
}
