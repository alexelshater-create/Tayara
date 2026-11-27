// ================= photo characters =================
const blobTex = makeTex(128,128,(g)=>{ const gr = g.createRadialGradient(64,64,0,64,64,64); gr.addColorStop(0,'rgba(0,0,0,.6)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,0,128,128); });
const blobGeo = new THREE.PlaneGeometry(1.3,.8), blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });
function makeDoll(c, heightM){
  const S = heightM / c.PH;
  const root = new THREE.Group(), doll = new THREE.Group(); root.add(doll);
  const P = {}, mats = [];
  for (const [key,order,z] of [['legL',10,-.012],['legR',10,-.012],['body',11,0],['armL',12,.012],['armR',12,.012]]){
    const [x0,y0,w,h] = c.parts[key]; const piv = c.piv[key];
    const mat = new THREE.MeshBasicMaterial({ map: dataTex(c.img[key]), transparent: true, alphaTest: .03, side: THREE.DoubleSide, toneMapped: false, color: new THREE.Color(.95,.95,.95) });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w*S, h*S), mat); mesh.renderOrder = order;
    const p = new THREE.Group(); const px = piv ? (piv[0]-c.FX)*S : 0, py = piv ? (c.FY-piv[1])*S : 0;
    p.position.set(px, py, z); mesh.position.set((x0+w/2-c.FX)*S - px, (c.FY-(y0+h/2))*S - py, 0);
    p.add(mesh); doll.add(p); P[key] = p; mats.push(mat);
  }
  const blob = new THREE.Mesh(blobGeo, blobMat); blob.rotation.x = -Math.PI/2; blob.position.y = .03; root.add(blob);
  scene.add(root);
  return { S, c, root, doll, P, mats, blob, phase: 0, tilt: 0, punchT: 0, punchSide: 1, downT: 0, fall: 0, height: heightM, hipY: (c.FY - c.parts.body[1] - c.parts.body[3]) * S };
}
// a 3D character with the same fields as a photo doll, so the rest of the game can use either one.
// P holds stand-ins (not in the scene): hiding the legs still means "seated" (moto), and photo-only extras attach harmlessly.
function makeDoll3D(R, c, heightM){
  const root = new THREE.Group(), doll = new THREE.Group(); root.add(doll);
  const k = heightM / R.H; R.mesh.scale.setScalar(k); doll.add(R.mesh);
  const P = { legL: new THREE.Object3D(), legR: new THREE.Object3D(), body: new THREE.Object3D(), armL: new THREE.Object3D(), armR: new THREE.Object3D() };
  const blob = new THREE.Mesh(blobGeo, blobMat); blob.rotation.x = -Math.PI/2; blob.position.y = .03; blob.scale.set(.7, .9, 1); root.add(blob);
  scene.add(root);
  return { is3D: true, R, S: heightM / c.PH, c, root, doll, P, mats: [R.mesh.material], blob, phase: 0, tilt: 0, punchT: 0, punchSide: 1, downT: 0, fall: 0, height: heightM,
    hipY: .5 * heightM - .02, yaw: 0, faceYaw: null, forceMove: null, seatMove: 'moto' };
}
// a thud when someone hits the ground
function fallSfx(d){ if (d.fall > .6 && !d.thudded){ d.thudded = true; if (d.root.visible) thud(sfxVol(d.root.position.x, d.root.position.z)); } else if (d.fall < .2) d.thudded = false; }
function makeCharacter(model, c, heightM){ return MODELS3D[model] ? makeDoll3D(MODELS3D[model], c, heightM) : makeDoll(c, heightM); }
function anim3D(d, vx, vz, dt, t){
  const sp = Math.hypot(vx, vz), seated = !d.P.legL.visible;
  let move = seated ? d.seatMove : sp > 5.4 ? 'run' : sp > .35 ? 'walk' : 'idle', o = { f: clamp(sp * 1.55, 3.2, 11), stride: clamp(sp / 4.2, .45, 1.15), sp };   // slow steps are short steps (no sliding feet)
  if (d.gunSet && !seated && d.gunSet[move]) move = d.gunSet[move];   // 19s-weapons.js: holding a gun
  if (d.forceMove){ move = d.forceMove; d.forceMove = null; } else if (d.holdMove) move = d.holdMove;
  if (d.punchT > 0 && !seated){ d.punchT -= dt; move = 'punch'; o.k = Math.sin(clamp(1 - d.punchT/.28, 0, 1) * Math.PI); o.side = d.punchSide; }
  if (d.strike){ if (!seated){ move = 'strike'; o.clip = d.strike.clip; o.ct = d.strike.t; o.mirror = !!d.strike.mirror; } d.strike = null; }   // 19r-melee.js
  else if (move === 'idle' && d.combatT > 0) move = 'fightIdle';
  if (d.downT > 0) d.downT -= dt;
  d.fall += ((d.downT > 0 ? 1 : 0) - d.fall) * damp(d.downT > 0 ? 9 : 4, dt);
  if (d.fall > .05) move = 'idle';
  fallSfx(d);
  // taking a hit (set by the damage code), and talking with the hands while his line is on screen
  if (d.hitT > 0){ d.hitT -= dt; if (!seated && d.fall < .05 && move !== 'punch'){ move = 'hit'; o.k = clamp(d.hitT / .45 * 1.6, 0, 1); } }
  if (d.talkT > 0){ d.talkT -= dt; if (move === 'idle' && d.fall < .05) move = 'talk'; }
  // facing: the bike's heading when seated, the way he moves when walking; standing still, the others turn to the hero
  let want = null;
  if (seated) want = d.faceYaw;
  else if (d.aimYaw != null) want = d.aimYaw;   // aiming (19s): face the crosshair while walking
  else if (sp > .35) want = Math.atan2(vx, vz);
  else if (d !== hero.d){ const dx = hero.pos.x - d.root.position.x, dz = hero.pos.z - d.root.position.z, dd = Math.hypot(dx, dz); if (dd > .4 && dd < 25) want = Math.atan2(dx, dz); }
  const yaw0 = d.yaw;
  if (want != null) d.yaw = seated ? want : lerpAngle(d.yaw, want, damp(sp > .35 ? 12 : 4, dt));
  d.root.rotation.y = d.yaw;
  // lean into turns when running; standing still, the head turns toward the camera (cutscenes) or the hero
  const turn = dt > 0 ? lerpAngle(0, d.yaw - yaw0, 1) / dt : 0;
  d.lean = (d.lean || 0) + ((sp > 3 && !seated ? clamp(-turn * sp * .012, -.25, .25) : 0) - (d.lean || 0)) * damp(6, dt); o.lean = d.lean;
  if (!seated && sp < .35 && d.fall < .05){
    const tgt = CUT.on || d === hero.d ? camera.position : hero.pos, dx = tgt.x - d.root.position.x, dz = tgt.z - d.root.position.z;
    const rel = lerpAngle(0, Math.atan2(dx, dz) - d.yaw, 1), want2 = Math.abs(rel) < 1.7 && Math.hypot(dx, dz) < 20 ? rel * .85 : 0;
    d.look = (d.look || 0) + (want2 - (d.look || 0)) * damp(5, dt);
  } else d.look = (d.look || 0) * (1 - damp(8, dt));
  o.look = d.look;
  d.blob.visible = d.blob.visible && !seated;
  poseRig(d.R, move, dt, o); applyRecoil(d);
  d.doll.position.set(0, d.fall * .12, 0); d.doll.rotation.set(-d.fall * 1.45 + (d.pitch || 0), 0, d.roll || 0);   // pitch: lying forward to swim
}
function animDoll(d, vx, vz, dt, t){
  if (d.is3D) return anim3D(d, vx, vz, dt, t);
  const sp = Math.hypot(vx, vz);
  d.phase += dt * sp * 1.6;
  const amp = Math.min(sp/5, 1.35), s = Math.sin(d.phase);
  d.doll.position.y = Math.abs(Math.cos(d.phase)) * .05 * amp;
  d.P.legL.scale.y = 1 - Math.max(0, s)*.09*amp; d.P.legR.scale.y = 1 - Math.max(0, -s)*.09*amp;
  d.P.armL.scale.y = 1 - Math.max(0, -s)*.1*amp; d.P.armR.scale.y = 1 - Math.max(0, s)*.1*amp;
  let rl = -Math.max(0,-s)*.06*amp, rr = Math.max(0,s)*.06*amp;
  if (d.punchT > 0){ d.punchT -= dt; const k = Math.sin((1 - d.punchT/.28) * Math.PI); if (d.punchSide > 0){ rr = 1.3*k; d.P.armR.scale.y = 1 - .2*k; } else { rl = -1.3*k; d.P.armL.scale.y = 1 - .2*k; } }
  d.P.armL.rotation.z = rl; d.P.armR.rotation.z = rr;
  d.doll.rotation.z = s * .025 * amp;
  d.doll.scale.y = 1 + (sp < .3 ? Math.sin(t*2.2)*.006 : 0);
  // face the camera (billboard around Y), with a little turn toward movement
  const cdx = camera.position.x - d.root.position.x, cdz = camera.position.z - d.root.position.z;
  const yaw = Math.atan2(cdx, cdz);
  const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
  d.tilt += (clamp((vx*rightX + vz*rightZ)/9, -1, 1)*.4 - d.tilt) * damp(8, dt);
  d.root.rotation.y = yaw + d.tilt;
  if (d.downT > 0) d.downT -= dt;
  d.fall += ((d.downT > 0 ? 1 : 0) - d.fall) * damp(d.downT > 0 ? 9 : 4, dt);
  d.doll.rotation.x = -d.fall * 1.45; d.doll.position.y += d.fall * .12;
  fallSfx(d);
}
const hero = { d: makeCharacter('tayara', CH.hero, 1.8), pos: new THREE.Vector3(), vel: new THREE.Vector3(), knock: new THREE.Vector3(), hp: 100, stamina: 1, tired: false, inv: 0, hurtT: 0, money: 50, veh: null, locked: false, lastDir: new THREE.Vector3(0,0,1) };
const wantedD = makeCharacter('shams', CH.wanted, 1.78), enemyD = makeCharacter('arabi', CH.enemy, 1.84);
