// ================= camera =================
const lookAt = new THREE.Vector3(); let camYaw = 0;
const ray = new THREE.Ray(), headPos = new THREE.Vector3(), _t = new THREE.Vector3();
function updateCamera(dt){
  const v = hero.veh;
  if (ST.kind){ stationCamera(dt); } else if (v){
    // look-around offset from dragging; it eases back behind the vehicle after a moment
    if (performance.now() - CAM.lastDrag > 1400) CAM.veh *= Math.exp(-dt*2.5);
    const vy = v.yaw + CAM.veh, fx = Math.sin(vy), fz = Math.cos(vy); const back = v.type === 'moto' ? 5.8 : 7.6, up = (v.type === 'moto' ? 2.6 : 3.2) * (.6 + CAM.tilt*.9);
    const fv = 46 + clamp(Math.abs(v.speed)/v.max, 0, 1)*12; if (Math.abs(camera.fov - fv) > .2){ camera.fov += (fv - camera.fov)*damp(3, dt); camera.updateProjectionMatrix(); }
    _t.set(v.pos.x - fx*back, v.pos.y + up, v.pos.z - fz*back); camera.position.lerp(_t, damp(CAM.drag ? 12 : 5, dt));
    lookAt.lerp(_t.set(v.pos.x + fx*3, v.pos.y + 1.1, v.pos.z + fz*3), damp(8, dt));
  } else {
    if (Math.abs(camera.fov - 46) > .2){ camera.fov += (46 - camera.fov)*damp(4, dt); camera.updateProjectionMatrix(); }
    camDist += (camTarget - camDist) * damp(5, dt); const p = hero.pos;
    if (keys.KeyQ) CAM.orbit += dt*2; if (keys.KeyR) CAM.orbit -= dt*2;
    CAM.orbitSm += (CAM.orbit - CAM.orbitSm) * damp(14, dt);
    lookAt.lerp(_t.set(p.x, p.y + 1.2, p.z), damp(9, dt));
    const o = CAM.orbitSm, hgt = .4 + camDist*CAM.tilt;
    camera.position.set(lookAt.x + Math.sin(o)*camDist, lookAt.y - .1 + hgt, lookAt.z + Math.cos(o)*camDist);
  }
  if (shake > 0){ shake -= dt; camera.position.x += (Math.random()-.5)*shake*.5; camera.position.y += (Math.random()-.5)*shake*.5; }
  camera.lookAt(lookAt);
  camYaw = Math.atan2(camera.position.x - lookAt.x, camera.position.z - lookAt.z);
  // fade buildings between the camera and the focus point
  const f = v ? v.pos : hero.pos; headPos.set(f.x, f.y + 1.4, f.z);
  ray.origin.copy(camera.position); ray.direction.copy(headPos).sub(camera.position); const segLen = ray.direction.length(); ray.direction.normalize();
  for (const b of buildings){
    const hit = ray.intersectBox(b.box, _t); const blocking = hit && camera.position.distanceTo(_t) < segLen - .3;
    const target = blocking ? .18 : 1;
    if (Math.abs(b.opacity - target) > .005){ b.opacity += (target - b.opacity) * damp(10, dt); const tr = b.opacity < .98; for (const m of b.mats){ m.opacity = b.opacity; if (m.transparent !== tr){ m.transparent = tr; m.depthWrite = !tr; m.needsUpdate = true; } } }
  }
  sun.target.position.copy(f); sun.position.copy(f).addScaledVector(sunDir, 120);
}
