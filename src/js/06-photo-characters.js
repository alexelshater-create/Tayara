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
function animDoll(d, vx, vz, dt, t){
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
}
const hero = { d: makeDoll(CH.hero, 1.8), pos: new THREE.Vector3(), vel: new THREE.Vector3(), knock: new THREE.Vector3(), hp: 100, stamina: 1, tired: false, inv: 0, hurtT: 0, money: 50, veh: null, locked: false, lastDir: new THREE.Vector3(0,0,1) };
const wantedD = makeDoll(CH.wanted, 1.78), enemyD = makeDoll(CH.enemy, 1.84);
