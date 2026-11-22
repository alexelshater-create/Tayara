// ================= first-person cooking stations =================
const ST = { kind: null, hold: null, labels: [], msgT: 0 };
const SM = {
  steel: new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: .85, roughness: .28, side: THREE.DoubleSide }),
  alu: new THREE.MeshStandardMaterial({ color: 0xb9bdc2, metalness: .8, roughness: .33 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc8963e, metalness: .85, roughness: .3, side: THREE.DoubleSide }),
  copper: new THREE.MeshStandardMaterial({ color: 0xb8692e, metalness: .85, roughness: .32, side: THREE.DoubleSide }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1b1b1b, metalness: .5, roughness: .5, side: THREE.DoubleSide }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: .7 }),
  jar: new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .25, roughness: .05, depthWrite: false, side: THREE.DoubleSide }),
  white: new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: .3 }),
  flame: new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }),
  hit: new THREE.MeshBasicMaterial({ visible: false }),
  ring: new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide }),
  paper: new THREE.MeshStandardMaterial({ color: 0xeadcbe, roughness: .9 }),
  sugar: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6, transparent: true }),
  green: new THREE.MeshStandardMaterial({ color: 0x2f5d3a, roughness: .8 }),
  tahina: new THREE.MeshStandardMaterial({ color: 0xd8c39a, roughness: .45 }),
  egg: new THREE.MeshStandardMaterial({ color: 0xf6f2e8, roughness: .4 }),
  yolk: new THREE.MeshStandardMaterial({ color: 0xf2b627, roughness: .5 }),
  foam: new THREE.MeshStandardMaterial({ color: 0xb48a58, roughness: .7 }),
  spill: new THREE.MeshStandardMaterial({ color: 0x3a2210, roughness: .3, transparent: true, opacity: .85 }),
};
const marbleTex = makeTex(512,512,(g,w,h)=>{ g.fillStyle='#ebe6dc'; g.fillRect(0,0,w,h); for (let i=0;i<40;i++){ g.strokeStyle=`rgba(120,110,100,${.05+Math.random()*.12})`; g.lineWidth=1+Math.random()*2; g.beginPath(); let x=Math.random()*w, y=Math.random()*h; g.moveTo(x,y); for (let k=0;k<8;k++){ x+=Math.random()*80-40; y+=Math.random()*80-40; g.lineTo(x,y); } g.stroke(); } grain(g,w,h,6000,.06); });
const steelTex = makeTex(512,512,(g,w,h)=>{ g.fillStyle='#b9bcc0'; g.fillRect(0,0,w,h); for (let y=0;y<h;y++){ g.fillStyle=`rgba(255,255,255,${Math.random()*.08})`; g.fillRect(0,y,w,1); } grain(g,w,h,4000,.08); });
const breadTex = makeTex(256,256,(g,w,h)=>{ const gr=g.createRadialGradient(128,128,20,128,128,128); gr.addColorStop(0,'#cf9f5f'); gr.addColorStop(1,'#9f6b34'); g.fillStyle=gr; g.fillRect(0,0,w,h); for (let i=0;i<900;i++){ g.fillStyle=`rgba(${90+Math.random()*60|0},${55+Math.random()*30|0},25,${.3+Math.random()*.4})`; g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*3,1+Math.random()*2); } for (let i=0;i<14;i++){ g.fillStyle='rgba(70,40,15,.35)'; g.beginPath(); g.ellipse(Math.random()*w,Math.random()*h,6+Math.random()*14,4+Math.random()*8,Math.random()*3,0,7); g.fill(); } });
const foulTex = makeTex(256,256,(g,w,h)=>{ g.fillStyle='#6b4524'; g.fillRect(0,0,w,h); for (let i=0;i<700;i++){ g.fillStyle=`rgba(${120+Math.random()*50|0},${75+Math.random()*30|0},35,.7)`; g.beginPath(); g.ellipse(Math.random()*w,Math.random()*h,4+Math.random()*4,3+Math.random()*3,Math.random()*3,0,7); g.fill(); } for (let i=0;i<30;i++){ g.fillStyle='rgba(230,190,60,.35)'; g.beginPath(); g.ellipse(Math.random()*w,Math.random()*h,8+Math.random()*16,5+Math.random()*10,0,0,7); g.fill(); } for (let i=0;i<250;i++){ g.fillStyle='rgba(150,90,30,.9)'; g.fillRect(Math.random()*w,Math.random()*h,1.5,1.5); } });
const mixTex = makeTex(256,256,(g,w,h)=>{ g.fillStyle='#5f7a36'; g.fillRect(0,0,w,h); for (let i=0;i<3000;i++){ g.fillStyle=`hsla(${70+Math.random()*40},${40+Math.random()*30}%,${25+Math.random()*30}%,.8)`; g.fillRect(Math.random()*w,Math.random()*h,2,2); } });
const steamTex = makeTex(64,64,(g)=>{ const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); });
const cylM = (rt, rb, h, mat, seg=20, open=false) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat);
function bowl(r, h, mat=SM.steel){ const g = new THREE.Group(); const w = cylM(r, r*.72, h, mat, 28, true); w.position.y = h/2; const b = cylM(r*.72, r*.72, .004, mat, 28); b.position.y = .002; g.add(w, b); return g; }
function disc(r, mat, y=0){ const d = cylM(r, r, .006, mat, 28); d.position.y = y; return d; }
const stGlassMat = new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, transparent: true, opacity: .42, roughness: .05, side: THREE.DoubleSide, depthWrite: false });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .1, transparent: true, opacity: .8 });
function emptyGlass(){ const g = new THREE.Group(); const gl = cylM(.045,.036,.11, stGlassMat, 16, true); gl.position.y = .058; gl.renderOrder = 3; const rim = new THREE.Mesh(new THREE.TorusGeometry(.045,.0025,6,24), rimMat); rim.rotation.x = Math.PI/2; rim.position.y = .113; const s = cylM(.075,.06,.012, saucerMat, 18); s.position.y = .006; g.add(s, gl, rim); return g; }
function cupModel(){ const g = new THREE.Group(); const c = cylM(.038,.03,.06, SM.white, 20, true); c.position.y = .042; const b = cylM(.03,.03,.004, SM.white, 20); b.position.y = .013; const h = new THREE.Mesh(new THREE.TorusGeometry(.016,.004,6,12,Math.PI), SM.white); h.rotation.z = -Math.PI/2; h.position.set(.042,.045,0); const s = cylM(.065,.055,.01, SM.white, 20); s.position.y = .005; g.add(c, b, h, s); return g; }
const stationAnchor = { ahwa: { pos: new THREE.Vector3(SPOT.counter.x, 1.15, SPOT.counter.z), yaw: 0 }, foul: { pos: new THREE.Vector3(SPOT.cart.x, 1.45, SPOT.cart.z), yaw: Math.PI } };
const STA = {};
function makeStation(kind){
  const a = stationAnchor[kind]; const grp = new THREE.Group(); grp.position.copy(a.pos); grp.rotation.y = a.yaw; scene.add(grp);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1, .03, 1), new THREE.MeshStandardMaterial(kind === 'ahwa' ? { map: marbleTex, roughness: .3 } : { map: steelTex, metalness: .6, roughness: .32 }));
  top.position.y = .015; top.receiveShadow = true; grp.add(top);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.13, .16, 36), SM.ring); ring.rotation.x = -Math.PI/2; ring.visible = false; grp.add(ring);
  const S = { kind, grp, top, ring, props: {}, hits: [], narrow: null }; STA[kind] = S; return S;
}
function addProp(S, name, label, obj, hit, w, n){
  const g = new THREE.Group(); g.add(obj); S.grp.add(g);
  const hm = new THREE.Mesh(new THREE.BoxGeometry(hit[0], hit[1], hit[0]), SM.hit); hm.position.y = hit[1]/2; hm.userData.prop = name; g.add(hm);
  obj.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const pr = { name, label, g, obj, hm, w, n }; S.props[name] = pr; S.hits.push(hm); return pr;
}
function layoutStation(S, narrow){
  S.narrow = narrow;
  for (const pr of Object.values(S.props)){ const [x,z] = narrow ? pr.n : pr.w; pr.g.position.set(x, .03, z); }
  if (narrow){ S.top.scale.set(1.42, 1, 1.62); S.top.position.z = -.07; } else { S.top.scale.set(2.05, 1, 1.22); S.top.position.z = .02; }
  if (S.onLayout) S.onLayout();
}
// steam puffs
const steamPool = [...Array(18)].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); return { s, life: 0 }; });
function puff(worldPos, size=.06){ const p = steamPool.find(p => p.life <= 0); if (!p) return; p.life = 1.6; p.s.visible = true; p.s.position.copy(worldPos); p.s.position.x += (Math.random()-.5)*.03; p.s.scale.setScalar(size); p.size = size; }
function updateSteam(dt){ for (const p of steamPool){ if (p.life <= 0) continue; p.life -= dt; p.s.position.y += dt*.12; p.s.position.x += Math.sin(p.life*5)*dt*.02; const k = p.life/1.6; p.s.material.opacity = Math.min(1, (1-k)*4) * k * .7; p.s.scale.setScalar(p.size * (1 + (1-k)*1.8)); if (p.life <= 0) p.s.visible = false; } }
// pouring stream
const streamMesh = new THREE.Mesh(new THREE.CylinderGeometry(.006,.004,1,8), new THREE.MeshStandardMaterial({ color: 0x8a2a08, transparent: true, opacity: .85, roughness: .1 })); streamMesh.visible = false; scene.add(streamMesh);
function showStream(from, to, color){ streamMesh.visible = true; streamMesh.material.color.set(color); const d = _t.copy(to).sub(from); const len = d.length(); streamMesh.position.copy(from).addScaledVector(d, .5); streamMesh.scale.set(1, len, 1); streamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize()); }
// looping sounds (pour, sizzle)
const loops = {};
function loopGain(name, freq, type){
  if (!AC) return null; if (loops[name]) return loops[name];
  if (!noiseBuf){ noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1; }
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 1.2; const g = AC.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(sfx); s.start(); loops[name] = g; return g;
}
function setLoop(name, v, freq, type){ const g = loopGain(name, freq, type); if (g) g.gain.value += (v - g.gain.value) * .25; }

// ----- tea & coffee station (النَصبة) -----
const AH = { vessel: null, pot: { coffee: 0, sugar: 0, heat: 0, onFire: false, ruined: false, foam: false }, pouring: null, stirT: 0 };
const SA = makeStation('ahwa');
{
  const S = SA;
  // stove
  const stove = new THREE.Group(); { const b = cylM(.12,.13,.035, SM.dark, 24); b.position.y = .017; const gr = new THREE.Mesh(new THREE.TorusGeometry(.085,.008,6,24), SM.dark); gr.rotation.x = Math.PI/2; gr.position.y = .04; const fl = new THREE.Mesh(new THREE.TorusGeometry(.055,.014,6,24), SM.flame); fl.rotation.x = Math.PI/2; fl.position.y = .045; fl.visible = false; const sp = disc(.11, SM.spill, .036); sp.visible = false; stove.add(b, gr, fl, sp); stove.userData = { flame: fl, spill: sp }; }
  addProp(S, 'stove', '🔥 النار', stove, [.3,.12], [-.78,-.32], [-.42,-.62]);
  // kanaka (كنكة)
  const kan = new THREE.Group(); { const body = cylM(.05,.062,.11, SM.brass, 22, true); body.position.y = .056; const bot = cylM(.062,.062,.004, SM.brass, 22); bot.position.y = .002; const hd = new THREE.Mesh(new THREE.BoxGeometry(.2,.012,.016), SM.brass); hd.position.set(-.15,.1,0); hd.rotation.z = -.35; const liq = disc(.048, new THREE.MeshStandardMaterial({ color: 0x2a1508, roughness: .2 }), .03); const foam = disc(.049, SM.foam, .03); foam.visible = false; kan.add(body, bot, hd, liq, foam); kan.userData = { liq, foam }; kan.scale.setScalar(1.25); }
  addProp(S, 'kanaka', 'الكنكة', kan, [.3,.25], [-.78,.06], [-.42,-.27]);
  // barrad (tea pot)
  const brd = new THREE.Group(); { const tilt = new THREE.Group(); brd.add(tilt); const body = new THREE.Mesh(new THREE.SphereGeometry(.1,24,16), SM.alu); body.scale.set(1,.85,1); body.position.y = .09; const lid = cylM(.045,.05,.02, SM.alu, 18); lid.position.y = .17; const knob = new THREE.Mesh(new THREE.SphereGeometry(.015,10,8), SM.dark); knob.position.y = .187; const sp = cylM(.01,.022,.15, SM.alu, 10); sp.rotation.z = -1.0; sp.position.set(.13,.12,0); const hd = new THREE.Mesh(new THREE.TorusGeometry(.055,.01,8,16,Math.PI), SM.dark); hd.rotation.z = Math.PI/2; hd.position.set(-.1,.1,0); tilt.add(body, lid, knob, sp, hd); brd.userData = { tilt, spout: new THREE.Vector3(.2,.18,0) }; }
  addProp(S, 'barrad', 'البراد', brd, [.32,.3], [-.36,-.34], [0,-.62]);
  // kettle (غلاية مية)
  const ket = new THREE.Group(); { const tilt = new THREE.Group(); ket.add(tilt); const body = cylM(.07,.08,.17, SM.steel, 22); body.position.y = .085; const lid = cylM(.05,.06,.02, SM.steel, 18); lid.position.y = .18; const hd = new THREE.Mesh(new THREE.TorusGeometry(.06,.01,8,16,Math.PI), SM.dark); hd.position.y = .19; const sp = cylM(.008,.016,.12, SM.steel, 10); sp.rotation.z = -1.1; sp.position.set(.1,.11,0); tilt.add(body, lid, hd, sp); ket.userData = { tilt, spout: new THREE.Vector3(.16,.15,0) }; }
  addProp(S, 'kettle', '💧 مية سخنة', ket, [.3,.3], [.04,-.34], [.42,-.62]);
  // tray
  const tr = new THREE.Group(); { const t = cylM(.2,.2,.014, SM.alu, 30); t.position.y = .007; const rim = new THREE.Mesh(new THREE.TorusGeometry(.2,.007,6,30), SM.alu); rim.rotation.x = Math.PI/2; rim.position.y = .015; tr.add(t, rim); tr.userData = { slots: new THREE.Group() }; tr.add(tr.userData.slots); }
  addProp(S, 'tray', '🍽️ الصينية', tr, [.4,.12], [.74,-.3], [.42,-.27]);
  // jars
  const jar = (col, lidCol) => { const g = new THREE.Group(); const gl = cylM(.058,.058,.13, SM.jar, 20, true); gl.position.y = .065; gl.renderOrder = 3; const c = cylM(.052,.052,.08, new THREE.MeshStandardMaterial({ color: col, roughness: .9 }), 20); c.position.y = .042; const l = cylM(.062,.062,.022, new THREE.MeshStandardMaterial({ color: lidCol, roughness: .5 }), 20); l.position.y = .14; g.add(c, gl, l); g.scale.setScalar(1.2); return g; };
  addProp(S, 'sugar', '🧂 سكر', jar(0xf7f5f0, 0xc0392b), [.24,.25], [-.42,.04], [0,-.27]);
  addProp(S, 'coffee', '☕ بُن', jar(0x3b2414, 0x2c3e50), [.24,.25], [-.16,.04], [-.42,.08]);
  addProp(S, 'anise', '🌿 ينسون', jar(0x8f8a4a, 0x27ae60), [.24,.25], [.1,.04], [0,.08]);
  addProp(S, 'helba', '🥛 حلبة', jar(0xc9a23a, 0xd4ac0d), [.24,.25], [.36,.04], [.42,.08]);
  // stacks
  const gls = new THREE.Group(); for (let i=0;i<3;i++){ const g = emptyGlass(); g.position.set((i-1)*.09, 0, 0); gls.add(g); } gls.scale.setScalar(1.3);
  addProp(S, 'glasses', '🥃 كوبايات', gls, [.36,.2], [.74,.38], [.42,.44]);
  const cps = new THREE.Group(); for (let i=0;i<2;i++){ const g = cupModel(); g.position.set((i-.5)*.13, 0, 0); cps.add(g); } cps.scale.setScalar(1.3);
  addProp(S, 'cups', '☕ فناجين', cps, [.32,.18], [.44,.38], [-.42,.44]);
  // work spot with the vessel
  const work = new THREE.Group(); { const mat = disc(.1, SM.green, .003); work.add(mat); const vg = new THREE.Group(); work.add(vg); work.userData = { vg }; }
  addProp(S, 'work', '👇 هنا', work, [.3,.3], [-.14,.38], [0,.44]);
  S.onLayout = () => {
    // turn the pots so their spouts face the work spot
    for (const nm of ['barrad','kettle']){ const pr = S.props[nm]; const w = S.props.work.g.position; const dx = w.x - pr.g.position.x, dz = w.z - pr.g.position.z; pr.obj.rotation.y = Math.atan2(-dz, dx); }
    const pr = S.props.kanaka, w = S.props.work.g.position; pr.obj.rotation.y = Math.atan2(-(w.z - pr.g.position.z), w.x - pr.g.position.x);
  };
  layoutStation(S, false);
}
function newVessel(kind){ return { kind, drink: null, herb: null, fill: 0, sugar: 0, stir: 0, spilled: false, foam: false, hotT: 0 }; }
function ahwaVisual(){
  const W = SA.props.work.obj.userData, vg = W.vg, v = AH.vessel;
  const key = v ? v.kind : 'none';
  if (W.key !== key){
    while (vg.children.length) vg.remove(vg.children[0]); W.key = key; W.P = null;
    if (v){
      const g = v.kind === 'glass' ? emptyGlass() : cupModel(); g.scale.setScalar(1.7); vg.add(g);
      const P = { g };
      if (v.kind === 'glass'){
        P.lq = new THREE.Mesh(new THREE.CylinderGeometry(.041,.034,1,16), new THREE.MeshStandardMaterial({ roughness: .15, transparent: true, opacity: .88, emissiveIntensity: .12 })); P.lq.geometry.translate(0,.5,0); P.lq.position.y = .01; g.add(P.lq);
        P.herb = disc(.03, new THREE.MeshStandardMaterial({ color: 0x6f6a32 }), .015); g.add(P.herb);
        P.sugar = cylM(.032,.032,.004, SM.sugar.clone(), 16); P.sugar.position.y = .013; g.add(P.sugar);
        P.spill = disc(.12, new THREE.MeshStandardMaterial({ transparent: true, opacity: .7, roughness: .1 }), .002); vg.add(P.spill);
        P.spoon = new THREE.Group(); const h = new THREE.Mesh(new THREE.BoxGeometry(.004,.16,.004), SM.steel); h.position.set(.015,.1,0); P.spoon.add(h); P.spoon.rotation.z = .2; g.add(P.spoon);
      } else {
        P.lq = disc(.029, new THREE.MeshStandardMaterial({ roughness: .2 }), .02); g.add(P.lq);
        P.foam = disc(.0295, SM.foam, .02); g.add(P.foam);
      }
      W.P = P;
    }
  }
  if (!v || !W.P) return;
  const P = W.P, col = { 'شاي': 0x7a2306, 'قهوة': 0x2a1508, 'ينسون': 0xa99a45, 'حلبة': 0xd4ad4f }[v.drink] || 0xa9c9d9;
  if (v.kind === 'glass'){
    P.lq.visible = v.fill > 0; P.lq.material.color.setHex(col); P.lq.material.emissive.setHex(col); P.lq.scale.y = Math.max(.001, Math.min(v.fill, 1.02)) * .105;
    P.herb.visible = !!v.herb && v.fill < .05; P.herb.material.color.setHex(v.herb === 'حلبة' ? 0xc9a23a : 0x6f6a32);
    P.sugar.visible = v.sugar > 0; P.sugar.scale.y = 1 + v.sugar*.8; P.sugar.material.opacity = Math.max(0, 1 - v.stir) * .95;
    P.spill.visible = v.spilled; P.spill.material.color.setHex(col);
    P.spoon.visible = !!ST.stirring;
  } else {
    P.lq.visible = v.fill > 0; P.lq.material.color.setHex(col); P.lq.position.y = .014 + Math.min(v.fill,1)*.055;
    P.foam.visible = v.fill > 0 && v.foam; P.foam.position.y = P.lq.position.y + .001;
  }
}
function ahwaPotVisual(){
  const k = SA.props.kanaka.obj.userData, p = AH.pot;
  k.liq.visible = p.coffee > 0 && !p.ruined; k.liq.position.y = .03 + Math.min(1, p.heat)*.03;
  const f = clamp((p.heat - .5)/.5, 0, 1); k.foam.visible = p.coffee > 0 && f > 0 && !p.ruined; k.foam.position.y = .045 + f*.05; k.foam.scale.setScalar(1 + f*.08);
  const st = SA.props.stove.obj.userData; st.flame.visible = p.onFire; st.spill.visible = p.ruined;
  const kp = SA.props.kanaka;
  const target = p.onFire ? SA.props.stove.g.position : null;
  if (target){ kp.g.position.set(target.x, .07, target.z); } else { const [x,z] = SA.narrow ? kp.n : kp.w; kp.g.position.set(x, .03, z); }
}
function ahwaTrayVisual(){
  const sl = SA.props.tray.obj.userData.slots; while (sl.children.length) sl.remove(sl.children[0]);
  (modeObj.tray || []).forEach((d,i) => { const g = d.drink === 'قهوة' ? cupModel() : makeGlass(d.drink); if (d.drink === 'قهوة'){ const l = disc(.029, coffeeMat, .065); g.add(l); g.scale.setScalar(1.3); } else g.scale.setScalar(1.05); const a = i/trayCap()*Math.PI*2; g.position.set(Math.cos(a)*.1, .014, Math.sin(a)*.1); sl.add(g); });
}
function stMsg(t, cls=''){ $('stHint').textContent = t; $('stHint').className = 'st-hint show ' + cls; ST.msgT = 2.4; }
function pendingAhwa(){
  if (!modeObj.patrons || (modeObj.story && modeObj.job !== 'ahwa')) return [];
  const list = modeObj.patrons.filter(n => n.state === 'customer' && n.order).sort((a,b) => a.patience - b.patience).map(n => ({ n, o: n.order }));
  const tray = [...(modeObj.tray||[])];
  return list.filter(({o}) => { const i = tray.findIndex(t => t.drink === o.drink && t.spoons === sugarSpoons(o.drink, o.sugar)); if (i >= 0){ tray.splice(i,1); return false; } return true; });
}
function ahwaTap(name){
  const v = AH.vessel, p = AH.pot, S = SA;
  const spoon = (from, to) => { tone(2400, 2300, .08, 'sine', .05); buzz(10); spoonFly(S.props[from], S.props[to]); };
  if (name === 'glasses' || name === 'cups'){
    if (v) return stMsg('فيه حاجة قدامك… حطها على الصينية أو ارميها');
    AH.vessel = newVessel(name === 'glasses' ? 'glass' : 'cup'); clink(); ahwaVisual(); return;
  }
  if (name === 'sugar'){
    if (p.coffee > 0 && !p.onFire && p.heat < .05 && (!v || v.kind === 'cup')){ if (p.sugar >= 4) return stMsg('كفاية سكر!'); p.sugar++; spoon('sugar','kanaka'); return stMsg(`سكر في الكنكة: ${p.sugar} معلقة`); }
    if (v && v.kind === 'glass' && !v.spilled){ if (v.sugar >= 5) return stMsg('كفاية سكر!'); v.sugar++; v.stir = 0; spoon('sugar','work'); ahwaVisual(); return stMsg(`سكر: ${v.sugar} معلقة`); }
    return stMsg('هات كوباية الأول… أو حط بُن في الكنكة للقهوة');
  }
  if (name === 'coffee'){
    if (p.ruined) return stMsg('القهوة فارت… دوس ارمي الأول', 'bad');
    if (p.onFire || p.heat > .05 || p.foam) return stMsg('الكنكة شغالة خلاص');
    if (p.coffee >= 2) return stMsg('معلقة بُن كفاية للفنجان');
    p.coffee++; spoon('coffee','kanaka'); ahwaPotVisual(); return stMsg('بُن في الكنكة ✔️ حط سكر لو عايز، وبعدين على النار');
  }
  if (name === 'anise' || name === 'helba'){
    const herb = name === 'anise' ? 'ينسون' : 'حلبة';
    if (!v || v.kind !== 'glass') return stMsg('هات كوباية الأول');
    if (v.fill > 0 || v.herb) return stMsg('الكوباية فيها حاجة');
    v.herb = herb; spoon(name, 'work'); ahwaVisual(); return stMsg(`${herb} في الكوباية ✔️ صب مية سخنة من الغلاية`);
  }
  if (name === 'kanaka' || name === 'stove'){
    if (p.ruined) return stMsg('القهوة فارت… دوس ارمي', 'bad');
    if (p.coffee === 0) return stMsg('حط معلقة بُن في الكنكة الأول');
    if (p.onFire){ p.onFire = false; tone(300,200,.15,'sine',.08); if (p.heat >= .72){ p.foam = true; stMsg('الوش مظبوط 👌 هات فنجان واضغط مطوّل على الكنكة', 'ok'); } else stMsg('لسه بدري… رجّعها على النار'); }
    else { if (p.foam) return stMsg('القهوة جاهزة… صبها في فنجان (اضغط مطوّل)'); p.onFire = true; noise(.3, 600, .12); stMsg('على النار… استنى الوش يطلع ومتسيبهاش تفور'); }
    ahwaPotVisual(); return;
  }
  if (name === 'barrad' || name === 'kettle') return stMsg('اضغط مطوّل عشان تصب');
  if (name === 'work'){ if (!v) return stMsg('هات كوباية أو فنجان'); if (v.kind === 'glass' && v.sugar > 0 && v.fill > .3){ v.stir = Math.min(1, v.stir + .3); clink(); ahwaVisual(); return stMsg(v.stir >= 1 ? 'السكر داب ✔️' : 'قلّب كمان… (أو اضغط مطوّل)'); } return; }
  if (name === 'tray') return stationBtn('toTray');
}
function ahwaHold(name, dt){
  const v = AH.vessel, p = AH.pot;
  if (name === 'barrad' || name === 'kettle'){
    if (!v || v.kind !== 'glass') { if (!ST.warned) stMsg('هات كوباية الأول'); ST.warned = true; return false; }
    if (v.spilled) return false;
    if (name === 'barrad' && v.herb){ if (!ST.warned) stMsg('دي للينسون/الحلبة… استخدم الغلاية'); ST.warned = true; return false; }
    if (name === 'kettle' && !v.herb){ if (!ST.warned) stMsg('الغلاية للينسون والحلبة… للشاي استخدم البراد'); ST.warned = true; return false; }
    v.drink = name === 'barrad' ? 'شاي' : v.herb; v.fill += dt * (SAVE.up.fastpour ? .55 : .38); v.hotT = 25;
    if (v.fill > DIFF.spill){ v.spilled = true; v.fill = DIFF.spill; stMsg('دلقت! ارمي الكوباية 🗑️', 'bad'); buzz(60); }
    AH.pouring = name; ahwaVisual(); return true;
  }
  if (name === 'kanaka'){
    if (!p.foam || p.onFire) return false;
    if (!v || v.kind !== 'cup'){ if (!ST.warned) stMsg('القهوة بتتصب في فنجان… هات فنجان'); ST.warned = true; return false; }
    if (v.fill >= 1) return false;
    v.drink = 'قهوة'; v.foam = true; v.sugar = p.sugar; v.fill += dt * .5; v.hotT = 25; AH.pouring = 'kanaka';
    if (v.fill >= .9){ v.fill = Math.min(v.fill, 1); Object.assign(p, { coffee:0, sugar:0, heat:0, foam:false }); ahwaPotVisual(); AH.pouring = null; stMsg('فنجان قهوة بوش ✔️ حطه على الصينية', 'ok'); }
    ahwaVisual(); return true;
  }
  if (name === 'work'){
    if (!v || v.kind !== 'glass' || v.fill < .3) return false;
    if (v.sugar === 0){ if (!ST.warned) stMsg('مفيش سكر تقلّبه'); ST.warned = true; return false; }
    v.stir = Math.min(1, v.stir + dt*.9); ST.stirring = true; ST.stirT = (ST.stirT||0) + dt; if (ST.stirT > .35){ ST.stirT = 0; tone(2800,2700,.05,'sine',.04); }
    ahwaVisual(); const P = SA.props.work.obj.userData.P; if (P && P.spoon) P.spoon.rotation.y = performance.now()/120;
    if (v.stir >= 1 && !ST.stirDone){ ST.stirDone = true; stMsg('السكر داب ✔️', 'ok'); }
    return true;
  }
  return false;
}
function ahwaRelease(){ AH.pouring = null; ST.stirring = false; ST.stirDone = false; ahwaVisual(); const v = AH.vessel; if (v && !v.spilled && v.fill > 0 && v.kind === 'glass' && (AH.lastPour)){ if (v.fill >= .78 && v.fill <= .98) stMsg('مظبوطة على الخط ✔️', 'ok'); else if (v.fill < .78) stMsg('لسه ناقصة شوية'); } }
function ahwaNext(){
  const v = AH.vessel, p = AH.pot, pend = pendingAhwa(), o = pend[0] && pend[0].o;
  if (p.ruined) return { btn: 'trash', text: 'القهوة فارت 😬 ارمي وابدأ من الأول' };
  if (p.onFire) return { prop: 'kanaka', text: p.heat > .72 ? 'الوش طلع! شيل الكنكة دلوقتي 🔥' : 'استنى الوش يطلع… متسيبهاش تفور' };
  if (v){
    if (v.spilled) return { btn: 'trash', text: 'الكوباية مدلوقة… ارميها' };
    const want = pend.find(x => v.kind === 'cup' ? x.o.drink === 'قهوة' : (v.herb ? x.o.drink === v.herb : x.o.drink === 'شاي')) || pend.find(x => x.o.drink !== 'قهوة');
    if (v.kind === 'cup'){
      if (v.fill < .85){ if (p.foam) return { prop: 'kanaka', text: 'اضغط مطوّل على الكنكة عشان تصب' }; if (p.coffee === 0) return { prop: 'coffee', text: 'حط بُن في الكنكة' }; return { prop: 'kanaka', text: 'حط الكنكة على النار' }; }
      return { btn: 'toTray', text: 'حط الفنجان على الصينية' };
    }
    if (!v.herb && v.fill === 0 && want && (want.o.drink === 'ينسون' || want.o.drink === 'حلبة')) return { prop: want.o.drink === 'ينسون' ? 'anise' : 'helba', text: `${want.o.drink}: حط معلقة في الكوباية` };
    if (v.fill < .78) return { prop: v.herb ? 'kettle' : 'barrad', text: 'اضغط مطوّل عشان تصب… وقف عند الخط الأخضر' };
    const need = want ? sugarSpoons(want.o.drink, want.o.sugar) : v.sugar;
    if (v.sugar < need) return { prop: 'sugar', text: `${want.o.drink} ${want.o.sugar}: ${need} معلقة سكر (${v.sugar}/${need})` };
    if (v.sugar > 0 && v.stir < 1) return { prop: 'work', text: 'قلّب السكر: اضغط مطوّل على الكوباية' };
    return { btn: 'toTray', text: 'حطها على الصينية' };
  }
  if ((modeObj.tray||[]).length >= trayCap()) return { btn: 'done', text: 'الصينية مليانة… روح وزّع' };
  if (!o) return (modeObj.tray||[]).length ? { btn: 'done', text: 'كده تمام… دوس خلاص ووزّع الطلبات' } : { text: 'مستني طلبات… الزباين جايين' };
  if (o.drink === 'قهوة'){
    const need = sugarSpoons('قهوة', o.sugar);
    if (p.foam) return { prop: 'cups', text: 'القهوة جاهزة… هات فنجان' };
    if (p.coffee === 0) return { prop: 'coffee', text: `قهوة ${o.sugar}: حط معلقة بُن في الكنكة` };
    if (p.sugar < need) return { prop: 'sugar', text: `حط ${need} معلقة سكر في الكنكة (${p.sugar}/${need})` };
    return { prop: 'kanaka', text: 'حط الكنكة على النار' };
  }
  return { prop: 'glasses', text: `${orderLabel(o)}: هات كوباية` };
}

// ----- foul & falafel cart -----
const FL = { fry: [], sF: [], sP: [], sand: null, bag: [] };
const SF = makeStation('foul');
const ballGeo = new THREE.IcosahedronGeometry(.026, 1);
{ const p = ballGeo.attributes.position; for (let i=0;i<p.count;i++){ _v.fromBufferAttribute(p,i); _v.multiplyScalar(1 + (Math.random()-.5)*.12); p.setXYZ(i,_v.x,_v.y,_v.z); } ballGeo.computeVertexNormals(); }
const friesGeo = (() => { const a = []; for (let i=0;i<14;i++){ const g = new THREE.BoxGeometry(.009,.009,.075); g.rotateY(Math.random()*Math.PI); g.rotateX((Math.random()-.5)*.4); g.translate((Math.random()-.5)*.08, .006 + Math.random()*.02, (Math.random()-.5)*.08); a.push(g); } return mergeGeometries(a); })();
{
  const S = SF;
  // big pot of foul
  const pot = new THREE.Group(); { const b = cylM(.17,.19,.24, SM.copper, 30, true); b.position.y = .12; const bt = cylM(.19,.19,.006, SM.copper, 30); bt.position.y = .003; const rim = new THREE.Mesh(new THREE.TorusGeometry(.17,.012,8,30), SM.brass); rim.rotation.x = Math.PI/2; rim.position.y = .24; const f = disc(.165, new THREE.MeshStandardMaterial({ map: foulTex, roughness: .35 }), .2); const lad = new THREE.Group(); const st = cylM(.007,.007,.36, SM.steel, 8); st.position.y = .18; const bw = new THREE.Mesh(new THREE.SphereGeometry(.045,14,8,0,Math.PI*2,Math.PI/2,Math.PI/2), SM.steel); lad.add(st, bw); lad.rotation.z = .35; lad.position.set(.09,.05,0); pot.add(b, bt, rim, f, lad); pot.userData = { lad }; }
  addProp(S, 'pot', '🥣 قِدرة الفول', pot, [.42,.3], [-.72,-.3], [-.42,-.62]);
  // frying pan with oil
  const pan = new THREE.Group(); { const b = cylM(.22,.18,.07, SM.dark, 32, true); b.position.y = .035; const bt = cylM(.18,.18,.006, SM.dark, 32); bt.position.y = .003; const oil = disc(.205, new THREE.MeshStandardMaterial({ color: 0xc99a2e, roughness: .05, metalness: .2, transparent: true, opacity: .9, emissive: 0x3a2a00, emissiveIntensity: .3 }), .05); const hd = new THREE.Mesh(new THREE.BoxGeometry(.2,.015,.03), SM.wood); hd.position.set(-.3,.06,0); const fl = new THREE.Mesh(new THREE.TorusGeometry(.12,.014,6,24), SM.flame); fl.rotation.x = Math.PI/2; fl.position.y = -.005; const items = new THREE.Group(); pan.add(b, bt, oil, hd, fl, items); pan.userData = { items, oil }; }
  addProp(S, 'pan', '🍳 طاسة الزيت', pan, [.48,.15], [-.12,-.32], [.06,-.62]);
  const mix = bowl(.13,.08); { const m = new THREE.Mesh(new THREE.SphereGeometry(.12,20,10,0,Math.PI*2,0,Math.PI/2), new THREE.MeshStandardMaterial({ map: mixTex, roughness: .9 })); m.scale.y = .35; m.position.y = .055; mix.add(m); }
  addProp(S, 'mix', '🟢 عجينة الفلافل', mix, [.3,.15], [.42,-.3], [.48,-.62]);
  const bread = new THREE.Group(); { const bm = [new THREE.MeshStandardMaterial({ color: 0xa8743a, roughness: .8 }), new THREE.MeshStandardMaterial({ map: breadTex, roughness: .85 }), new THREE.MeshStandardMaterial({ map: breadTex, roughness: .85 })]; for (let i=0;i<4;i++){ const d = new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.018,26), bm); d.position.set((Math.random()-.5)*.01, .01 + i*.019, (Math.random()-.5)*.01); bread.add(d); } }
  addProp(S, 'bread', '🍞 عيش', bread, [.3,.12], [-.74,.08], [-.42,-.24]);
  const tah = bowl(.08,.06); tah.add(disc(.075, SM.tahina, .045)); addProp(S, 'tahina', '⚪ طحينة', tah, [.22,.12], [-.45,.08], [0,-.24]);
  const sal = bowl(.09,.06); { const a = []; for (let i=0;i<40;i++){ const g = new THREE.BoxGeometry(.014,.014,.014); g.translate((Math.random()-.5)*.11, .045 + Math.random()*.02, (Math.random()-.5)*.11); a.push(colored(g, rpick(['#d1291d','#e03a2a','#4e8f2f','#6fae3a','#f4efe4']))); } const sm = new THREE.Mesh(mergeGeometries(a), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5 })); sal.add(sm); }
  addProp(S, 'salad', '🥗 سلطة', sal, [.24,.12], [-.17,.08], [.42,-.24]);
  const egg = bowl(.09,.06); for (let i=0;i<4;i++){ const e = new THREE.Mesh(new THREE.SphereGeometry(.022,12,10), SM.egg); e.scale.y = 1.3; e.position.set(Math.cos(i*1.6)*.035, .05, Math.sin(i*1.6)*.035); egg.add(e); }
  addProp(S, 'eggs', '🥚 بيض', egg, [.24,.12], [.11,.08], [-.42,.1]);
  const fr = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(.18,.06,.14), SM.dark); b.position.y = .03; const f = new THREE.Mesh(friesGeo, new THREE.MeshStandardMaterial({ color: 0xf1e2b0, roughness: .7 })); f.position.y = .06; fr.add(b, f); }
  addProp(S, 'fries', '🥔 بطاطس', fr, [.26,.12], [.4,.08], [0,.1]);
  const strainer = () => { const g = bowl(.1,.05, SM.dark); const it = new THREE.Group(); g.add(it); g.userData = { items: it }; return g; };
  addProp(S, 'sF', '🧆 فلافل جاهزة', strainer(), [.26,.12], [.74,.08], [.42,.1]);
  addProp(S, 'sP', '🍟 بطاطس جاهزة', strainer(), [.26,.12], [.74,.4], [.45,.46]);
  const board = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(.34,.02,.24), SM.wood); b.position.y = .01; const sg = new THREE.Group(); board.add(b, sg); board.userData = { sg }; }
  addProp(S, 'board', '🔪 اللوح', board, [.36,.15], [-.34,.4], [-.36,.46]);
  const bag = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(.16,.18,.1), SM.paper); b.position.y = .09; const it = new THREE.Group(); bag.add(b, it); bag.userData = { it }; }
  addProp(S, 'bag', '🛍️ الكيس', bag, [.24,.22], [.22,.4], [.08,.46]);
  layoutStation(S, false);
}
const BALL_COLS = [[0, new THREE.Color('#6d8a3e')], [6, new THREE.Color('#b9772a')], [10, new THREE.Color('#6b3a14')], [13, new THREE.Color('#2b1a0c')]];
function fryColor(t, type, out){ const tt = type === 'ball' ? t : t*.78; let a = BALL_COLS[0], b = BALL_COLS[BALL_COLS.length-1]; for (let i=0;i<BALL_COLS.length-1;i++) if (tt >= BALL_COLS[i][0] && tt <= BALL_COLS[i+1][0]){ a = BALL_COLS[i]; b = BALL_COLS[i+1]; break; } if (tt > b[0]) { out.copy(b[1]); return out; } const k = (tt - a[0]) / (b[0] - a[0] || 1); out.copy(a[1]).lerp(b[1], clamp(k,0,1)); if (type === 'fries'){ out.lerp(new THREE.Color('#f3e3b0'), tt < 6 ? .6 - tt*.08 : 0); } return out; }
const doneness = (t, type) => type === 'ball' ? (t < 5 ? 'raw' : t <= 10*DIFF.fry ? 'good' : 'burnt') : (t < 7 ? 'raw' : t <= 13*DIFF.fry ? 'good' : 'burnt');
function foulVisual(){
  const pan = SF.props.pan.obj.userData.items;
  // strainers
  const fill = (pr, arr) => { const it = SF.props[pr].obj.userData.items; while (it.children.length) it.remove(it.children[0]); arr.forEach((x,i) => { const m = new THREE.Mesh(x.type === 'ball' ? ballGeo : friesGeo, new THREE.MeshStandardMaterial({ color: fryColor(x.t, x.type, new THREE.Color()), roughness: .85 })); const a = i*2.1; m.position.set(Math.cos(a)*.035*(i%3), .035 + Math.floor(i/6)*.02, Math.sin(a)*.035*(i%3)); it.add(m); }); };
  fill('sF', FL.sF); fill('sP', FL.sP);
  // sandwich on the board
  const sg = SF.props.board.obj.userData.sg; while (sg.children.length) sg.remove(sg.children[0]);
  const s = FL.sand;
  if (s){
    const bm = [new THREE.MeshStandardMaterial({ color: 0xa8743a, roughness: .8 }), new THREE.MeshStandardMaterial({ map: breadTex, roughness: .85 }), new THREE.MeshStandardMaterial({ color: 0xe6d2a8, roughness: .9 })];
    const half = new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.016,26,1,false,0,Math.PI), bm); half.position.y = .03; half.rotation.y = Math.PI/2; sg.add(half);
    const inner = disc(.1, bm[2], .021); inner.scale.z = .55; inner.position.z = .02; sg.add(inner);
    const top = .04;
    if (s.base === 'فول'){ const f = new THREE.Mesh(new THREE.SphereGeometry(.06,16,8,0,Math.PI*2,0,Math.PI/2), new THREE.MeshStandardMaterial({ map: foulTex, roughness: .35 })); f.scale.set(1.3,.4,.7); f.position.set(0,top-.01,.02); sg.add(f); }
    if (s.base === 'فلافل') for (let i=0;i<3;i++){ const m = new THREE.Mesh(ballGeo, new THREE.MeshStandardMaterial({ color: fryColor(s.t||7, 'ball', new THREE.Color()), roughness: .85 })); m.position.set((i-1)*.05, top+.01, .02); sg.add(m); }
    if (s.base === 'بطاطس'){ const m = new THREE.Mesh(friesGeo, new THREE.MeshStandardMaterial({ color: fryColor(s.t||9, 'fries', new THREE.Color()), roughness: .8 })); m.position.set(0,top-.005,.02); m.scale.set(1.6,1,1); sg.add(m); }
    if (s.base === 'بيض') for (let i=0;i<4;i++){ const w = disc(.022, SM.egg, top+.002+i*.003); w.position.x = (i-1.5)*.04; w.position.z = .02; const y = disc(.011, SM.yolk, top+.006+i*.003); y.position.copy(w.position); y.position.y += .004; sg.add(w, y); }
    if (s.tahina) for (let i=0;i<3;i++){ const t = new THREE.Mesh(new THREE.TorusGeometry(.05,.004,6,20,Math.PI), SM.tahina); t.rotation.x = Math.PI/2; t.position.set((i-1)*.025, top+.025, .02); sg.add(t); }
    if (s.salad){ const a = []; for (let i=0;i<14;i++){ const g = new THREE.BoxGeometry(.012,.012,.012); g.translate((Math.random()-.5)*.13, top+.02, .02+(Math.random()-.5)*.04); a.push(colored(g, rpick(['#d1291d','#4e8f2f','#f4efe4']))); } sg.add(new THREE.Mesh(mergeGeometries(a), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5 }))); }
  }
  // wrapped sandwiches in the bag
  const it = SF.props.bag.obj.userData.it; while (it.children.length) it.remove(it.children[0]);
  FL.bag.forEach((b,i) => { const w = cylM(.032,.032,.17, SM.paper, 14); w.rotation.x = Math.PI/2; w.position.set(-.05 + (i%3)*.05, .2 + Math.floor(i/3)*.04, 0); it.add(w); });
  void pan;
}
function addFry(type){
  const items = SF.props.pan.obj.userData.items;
  const mesh = new THREE.Mesh(type === 'ball' ? ballGeo : friesGeo, new THREE.MeshStandardMaterial({ color: 0x6d8a3e, roughness: .85 }));
  const a = Math.random()*Math.PI*2, r = type === 'ball' ? .05 + Math.random()*.09 : .02; mesh.position.set(Math.cos(a)*r, .055, Math.sin(a)*r); items.add(mesh);
  FL.fry.push({ type, t: 0, mesh }); noise(.5, 5000, .25, 0, 'highpass'); buzz(12);
}
function foulTap(name){
  const s = FL.sand;
  const needBase = () => { if (!s) { stMsg('خد رغيف عيش الأول 🫓'); return false; } if (s.base){ stMsg('الرغيف فيه حشو خلاص'); return false; } return true; };
  if (name === 'mix'){ if (FL.fry.filter(f => f.type === 'ball').length >= 9) return stMsg('الطاسة مليانة'); addFry('ball'); return stMsg('قرص فلافل في الزيت… شيله لما يبقى دهبي'); }
  if (name === 'fries'){ if (FL.fry.some(f => f.type === 'fries')) return stMsg('فيه بطاطس في الزيت'); addFry('fries'); return stMsg('البطاطس في الزيت'); }
  if (name === 'pan'){
    if (!FL.fry.length) return stMsg('الطاسة فاضية');
    const items = SF.props.pan.obj.userData.items;
    FL.fry.forEach(f => { items.remove(f.mesh); (f.type === 'ball' ? FL.sF : FL.sP).push({ type: f.type, t: f.t }); });
    const q = FL.fry.map(f => doneness(f.t, f.type)); FL.fry = []; tone(500,300,.1,'triangle',.08); foulVisual();
    if (q.includes('burnt')) return stMsg('فيه حاجة اتحرقت! 😬', 'bad'); if (q.includes('raw')) return stMsg('فيه حاجة لسه نية…', 'bad'); return stMsg('دهبي ومظبوط 👌', 'ok');
  }
  if (name === 'bread'){ if (s) return stMsg('فيه رغيف على اللوح… كمّله أو ارميه'); FL.sand = { base: null, tahina: false, salad: false, q: 'good' }; tone(300,250,.08,'triangle',.08); foulVisual(); return stMsg('فتحت الرغيف ✔️'); }
  if (name === 'pot'){ if (!needBase()) return; s.base = 'فول'; const lad = SF.props.pot.obj.userData.lad; lad.rotation.z = -.4; setTimeout(() => lad.rotation.z = .35, 300); noise(.2, 400, .2); foulVisual(); return stMsg('غرفت فول ✔️'); }
  if (name === 'sF'){ if (!needBase()) return; if (FL.sF.length < 3) return stMsg('محتاج ٣ أقراص فلافل في المصفاية'); const take = FL.sF.splice(0,3); const qs = take.map(x => doneness(x.t, 'ball')); s.base = 'فلافل'; s.q = qs.includes('burnt') ? 'burnt' : qs.includes('raw') ? 'raw' : 'good'; s.t = take.reduce((a,x) => a + x.t, 0)/3; foulVisual(); return stMsg('٣ أقراص فلافل ✔️'); }
  if (name === 'sP'){ if (!needBase()) return; if (!FL.sP.length) return stMsg('مفيش بطاطس جاهزة'); const b = FL.sP.shift(); s.base = 'بطاطس'; s.q = doneness(b.t, 'fries'); s.t = b.t; foulVisual(); return stMsg('بطاطس ✔️'); }
  if (name === 'eggs'){ if (!needBase()) return; s.base = 'بيض'; foulVisual(); return stMsg('بيض مسلوق ✔️'); }
  if (name === 'tahina'){ if (!s || !s.base) return stMsg('حط الحشو الأول'); if (s.tahina) return stMsg('فيه طحينة خلاص'); s.tahina = true; noise(.25, 700, .1); foulVisual(); return stMsg('طحينة ✔️'); }
  if (name === 'salad'){ if (!s || !s.base) return stMsg('حط الحشو الأول'); if (s.salad) return stMsg('فيه سلطة خلاص'); s.salad = true; foulVisual(); return stMsg('سلطة ✔️'); }
  if (name === 'board') return stationBtn('wrap');
  if (name === 'bag') return stationBtn('serve');
}
function foulFront(){ const c = modeObj.queue && modeObj.queue[0]; return c && c.ready ? c : null; }
function foulMissing(c){ const need = c.order.map(sandKey); FL.bag.forEach(b => { const i = need.indexOf(sandKey(b)); if (i >= 0) need.splice(i,1); }); return need.map(k => { const [base,t,s] = k.split('|'); return { base, tahina: t === '1', salad: s === '1' }; }); }
function foulNext(){
  const c = foulFront();
  if (!c) return { text: 'مستني زبون… جهّز فلافل في الزيت من دلوقتي' };
  const miss = foulMissing(c);
  if (!miss.length && !FL.sand) return { btn: 'serve', text: 'الطلب كامل… سلّمه' };
  const s = FL.sand, want = miss[0];
  if (s){
    if (!s.base){
      if (!want) return { btn: 'trash', text: 'الطلب مش محتاج ده' };
      if (want.base === 'فول') return { prop: 'pot', text: 'اغرف فول من القِدرة' };
      if (want.base === 'بيض') return { prop: 'eggs', text: 'حط بيض' };
      if (want.base === 'فلافل'){ if (FL.sF.length >= 3) return { prop: 'sF', text: 'حط ٣ أقراص فلافل' }; if (FL.fry.some(f => f.type === 'ball')){ const ok = FL.fry.filter(f => f.type === 'ball' && f.t >= 5).length; return { prop: ok ? 'pan' : null, text: ok ? 'الفلافل بقت دهبي… شيلها (دوس على الطاسة)' : 'استنى الفلافل تحمر…' }; } return { prop: 'mix', text: 'اعمل ٣ أقراص فلافل وحطها في الزيت' }; }
      if (want.base === 'بطاطس'){ if (FL.sP.length) return { prop: 'sP', text: 'حط البطاطس' }; const f = FL.fry.find(f => f.type === 'fries'); if (f) return { prop: f.t >= 7 ? 'pan' : null, text: f.t >= 7 ? 'البطاطس استوت… شيلها' : 'استنى البطاطس تستوي…' }; return { prop: 'fries', text: 'نزّل البطاطس في الزيت' }; }
    }
    const tgt = miss.find(m => m.base === s.base) || want;
    if (tgt && tgt.tahina && !s.tahina) return { prop: 'tahina', text: 'زوّد طحينة' };
    if (tgt && tgt.salad && !s.salad) return { prop: 'salad', text: 'زوّد سلطة' };
    return { btn: 'wrap', text: 'لف الساندوتش' };
  }
  if (want && want.base === 'فلافل' && FL.sF.length < 3 && FL.fry.filter(f => f.type === 'ball').length + FL.sF.length < 3) return { prop: 'mix', text: 'ابدأ اقلي فلافل (٣ أقراص)' };
  return { prop: 'bread', text: `اللي جاي: ${sandLabel(want)} — خد رغيف` };
}
function serveFoul(){
  const m = modeObj, c = foulFront(); if (!c) return stMsg('مفيش زبون مستني');
  if (!FL.bag.length) return stMsg('الكيس فاضي');
  const miss = foulMissing(c); const need = c.order.map(sandKey); const extra = FL.bag.filter(b => { const i = need.indexOf(sandKey(b)); if (i >= 0){ need.splice(i,1); return false; } return true; });
  if (miss.length || extra.length){ say(c.n, miss.length ? `ناقص: ${miss.map(sandLabel).join('، ').replace(/[^؀-ۿ\s+،]/g,'')}` : 'ده مش طلبي!', 2.2, 'angry'); c.patience -= 6; buzz(40); return stMsg(miss.length ? 'الطلب ناقص' : 'فيه حاجة زيادة مش مطلوبة', 'bad'); }
  const bad = FL.bag.find(b => b.q !== 'good');
  const price = c.order.reduce((s,o) => s + sandPrice(o), 0); const tip = bad ? 0 : Math.round(4*clamp(c.patience/c.maxPat,0,1) + 1);
  m.served++; m.earned += price + tip; hero.money += price + tip; coin(); buzz(25); if (m.onServe) m.onServe('foul'); stat('foul');
  FL.bag = []; foulVisual();
  if (bad) { say(c.n, bad.q === 'burnt' ? 'الفلافل محروقة يا معلم!' : 'ده لسه ني!', 2, 'angry'); stMsg(`+${price} جنيه (من غير بقشيش)`, 'bad'); }
  else stMsg(`+${price + tip} جنيه 👌`, 'ok');
  finishFoulCustomer(c, !bad);
}

// ----- station flow -----
const STATION_BTNS = {
  ahwa: [['toTray','✅ على الصينية'],['trash','🗑️ ارمي'],['done','🚶 خلاص']],
  foul: [['wrap','🌯 لف الساندوتش'],['serve','🤝 سلّم الطلب'],['trash','🗑️ ارمي']],
};
function stationBtn(id){
  if (ST.kind === 'ahwa'){
    const v = AH.vessel, p = AH.pot;
    if (id === 'toTray'){
      if (!v || v.fill < .5) return stMsg('الكوباية لسه فاضية');
      if (v.spilled) return stMsg('دي مدلوقة… ارميها', 'bad');
      if ((modeObj.tray||[]).length >= trayCap()) return stMsg('الصينية مليانة… روح وزّع الأول');
      const drink = v.drink; modeObj.tray.push({ drink, spoons: v.sugar, fill: v.fill, stirred: v.kind === 'cup' || v.sugar === 0 || v.stir >= 1, good: v.fill >= .72 && v.fill <= DIFF.spill });
      AH.vessel = null; clink(); buzz(15); ahwaVisual(); ahwaTrayVisual(); return stMsg(`${DRINK_ICON[drink]} ${drink} ${sugarLabel(drink, modeObj.tray[modeObj.tray.length-1].spoons)} على الصينية ✔️`, 'ok');
    }
    if (id === 'trash'){ if (v){ AH.vessel = null; ahwaVisual(); noise(.2, 800, .2); return stMsg('رميتها'); } if (p.ruined || p.coffee || p.sugar){ Object.assign(p, { coffee:0, sugar:0, heat:0, onFire:false, ruined:false, foam:false }); ahwaPotVisual(); return stMsg('نضّفت الكنكة'); } return stMsg('مفيش حاجة ترميها'); }
    if (id === 'done') return exitStation();
  }
  if (ST.kind === 'foul'){
    if (id === 'wrap'){ const s = FL.sand; if (!s) return stMsg('خد رغيف الأول'); if (!s.base) return stMsg('الرغيف فاضي'); FL.bag.push(s); FL.sand = null; noise(.25, 2500, .12); buzz(15); foulVisual(); return stMsg(`${sandLabel(s)} في الكيس ✔️`, 'ok'); }
    if (id === 'serve') return serveFoul();
    if (id === 'done') return endJob(false);
    if (id === 'trash'){ if (FL.sand){ FL.sand = null; foulVisual(); return stMsg('رميت الرغيف'); } if (FL.bag.length){ FL.bag = []; foulVisual(); return stMsg('فضّيت الكيس'); } if (FL.sF.length || FL.sP.length){ FL.sF = []; FL.sP = []; foulVisual(); return stMsg('فضّيت المصافي'); } return stMsg('مفيش حاجة ترميها'); }
  }
}
function enterStation(kind){
  ST.kind = kind; ST.hold = null; hero.locked = true; hero.d.root.visible = false; trayGroup.visible = false; $('tray').hidden = true;
  document.body.classList.add('in-station'); $('station').hidden = false;
  $('stBtns').innerHTML = (kind === 'foul' && modeObj.story ? [...STATION_BTNS.foul, ['done','🚶 خلّص']] : STATION_BTNS[kind]).map(([id,t]) => `<button data-b="${id}" id="stb_${id}">${t}</button>`).join('');
  $('stBtns').querySelectorAll('button').forEach(b => b.onclick = () => stationBtn(b.dataset.b));
  const S = STA[kind]; $('plabels').innerHTML = ''; ST.labels = Object.values(S.props).map(pr => { const el = document.createElement('div'); el.className = 'plabel'; el.textContent = pr.label; $('plabels').appendChild(el); return { el, pr }; });
  camera.fov = 50; camera.updateProjectionMatrix(); const aw = scene.getObjectByName('cafeAwning'); if (aw) aw.visible = kind !== 'ahwa'; const um = scene.getObjectByName('cartUmbrella'); if (um) um.visible = kind !== 'foul';
  if (kind === 'ahwa'){ ahwaVisual(); ahwaPotVisual(); ahwaTrayVisual(); }
  if (kind === 'foul') foulVisual();
  stMsg(kind === 'ahwa' ? 'دوس على الحاجات عشان تمسكها… واضغط مطوّل عشان تصب' : 'دوس على الحاجات… الحلقة الصفرا بتقولك الخطوة الجاية');
}
function exitStation(silent){
  if (!ST.kind) return;
  const k = ST.kind; ST.kind = null; ST.hold = null; streamMesh.visible = false; setLoop('pour', 0, 900, 'bandpass'); setLoop('sizzle', 0, 4000, 'highpass');
  STA[k].ring.visible = false; $('station').hidden = true; $('plabels').innerHTML = ''; ST.labels = []; document.body.classList.remove('in-station');
  hero.locked = false; hero.d.root.visible = true; camera.fov = 46; camera.updateProjectionMatrix(); const aw = scene.getObjectByName('cafeAwning'); if (aw) aw.visible = true; const um = scene.getObjectByName('cartUmbrella'); if (um) um.visible = true;
  if (k === 'ahwa' && STA.ahwa.narrow) layoutStation(STA.ahwa, false); if (k === 'foul' && STA.foul.narrow) layoutStation(STA.foul, false);
  if (k === 'ahwa'){ ahwaPotVisual(); refreshTray(); if (!silent && (modeObj.tray||[]).length) banner('وزّع الطلبات على الزباين ☕', 'info', 2); }
}
// fly a spoon from a jar to its target
const flySpoon = new THREE.Group(); { const h = new THREE.Mesh(new THREE.BoxGeometry(.006,.006,.12), SM.steel); const b = new THREE.Mesh(new THREE.SphereGeometry(.014,10,6), SM.steel); b.scale.y = .4; b.position.z = .065; flySpoon.add(h, b); flySpoon.visible = false; }
let spoonAnim = null;
function spoonFly(from, to){ const S = STA[ST.kind]; S.grp.add(flySpoon); flySpoon.visible = true; spoonAnim = { a: from.g.position.clone().add(new THREE.Vector3(0,.22,0)), b: to.g.position.clone().add(new THREE.Vector3(0,.2,0)), t: 0 }; }
// pointer handling inside stations
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
canvas.addEventListener('pointerdown', e => {
  if (!ST.kind || state !== 'play') return;
  const S = STA[ST.kind]; ndc.set(e.clientX/innerWidth*2-1, -(e.clientY/innerHeight)*2+1); raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(S.hits, false)[0]; if (!hit) return;
  ST.hold = { name: hit.object.userData.prop, t: 0, held: false, id: e.pointerId }; ST.warned = false;
  try { canvas.setPointerCapture(e.pointerId); } catch(err){}
});
const stUp = (e, cancel) => { const h = ST.hold; if (!h || e.pointerId !== h.id) return; ST.hold = null; streamMesh.visible = false; if (h.held){ AH.lastPour = true; if (ST.kind === 'ahwa') ahwaRelease(); } else if (!cancel){ if (ST.kind === 'ahwa') ahwaTap(h.name); else foulTap(h.name); } AH.lastPour = false; };
addEventListener('pointerup', e => stUp(e, false)); addEventListener('pointercancel', e => stUp(e, true));
function stationCamera(dt){
  const S = STA[ST.kind]; const asp = innerWidth/innerHeight; const narrow = asp < .95;
  if (S.narrow !== narrow){ layoutStation(S, narrow); if (ST.kind === 'ahwa') ahwaPotVisual(); }
  const vf = 50*Math.PI/180, hf = 2*Math.atan(Math.tan(vf/2)*asp);
  const W = narrow ? 1.34 : 1.9, Dd = narrow ? 1.45 : 1.5, pitch = narrow ? 1.12 : .98;
  const D = Math.max((W/2)/Math.tan(hf/2), (Dd/2)/Math.tan(vf/2)) * (narrow ? 1.0 : 1.02);
  const cp = new THREE.Vector3(0, Math.sin(pitch)*D, Math.cos(pitch)*D - (narrow ? .07 : 0)); S.grp.localToWorld(cp);
  const lp = new THREE.Vector3(0, 0, narrow ? -.02 : .16); S.grp.localToWorld(lp);
  camera.position.lerp(cp, damp(6, dt)); lookAt.lerp(lp, damp(8, dt));
}
const _sw = new THREE.Vector3(), _sw2 = new THREE.Vector3(), _fc = new THREE.Color();
function updateStation(dt, t){
  const S = STA[ST.kind];
  // hold logic
  let pouring = false;
  if (ST.hold){ ST.hold.t += dt; if (ST.hold.t > .16){ const ok = ST.kind === 'ahwa' ? ahwaHold(ST.hold.name, dt) : false; if (ok) ST.hold.held = true; pouring = ok && ST.kind === 'ahwa' && AH.pouring; } }
  // ahwa simulation
  if (ST.kind === 'ahwa'){
    const p = AH.pot;
    for (const nm of ['barrad','kettle','kanaka']){ const pr = S.props[nm]; const tilt = pr.obj.userData.tilt || pr.obj; const want = (pouring && AH.pouring === nm) ? (nm === 'kanaka' ? -.9 : -.75) : 0; if (nm === 'kanaka'){ pr.obj.rotation.z += ((pouring && AH.pouring === 'kanaka' ? -.8 : 0) - pr.obj.rotation.z) * damp(10, dt); } else tilt.rotation.z += (want - tilt.rotation.z) * damp(10, dt); }
    if (pouring && AH.vessel){
      const nm = AH.pouring, pr = S.props[nm];
      if (nm === 'kanaka') _sw.set(.11, .14, 0).applyEuler(pr.obj.rotation).multiplyScalar(1.25).add(pr.g.position); else _sw.copy(pr.obj.userData.spout).applyEuler(new THREE.Euler(0, pr.obj.rotation.y, pr.obj.userData.tilt.rotation.z)).add(pr.g.position);
      S.grp.localToWorld(_sw);
      _sw2.copy(S.props.work.g.position); _sw2.y += AH.vessel.kind === 'cup' ? .14 : .2; S.grp.localToWorld(_sw2);
      showStream(_sw, _sw2, { 'شاي': 0x7a2306, 'قهوة': 0x2a1508, 'ينسون': 0xbcae66, 'حلبة': 0xd4ad4f }[AH.vessel.drink] || 0xcfe6f0);
      setLoop('pour', .22, 900, 'bandpass');
      $('stMeter').hidden = false; $('stMeterLabel').textContent = AH.vessel.kind === 'cup' ? 'الفنجان' : 'الكوباية'; $('stMeterBar').style.width = (Math.min(AH.vessel.fill,1)*100) + '%'; $('stBand').style.left = '78%'; $('stBand').style.width = '20%';
    } else { streamMesh.visible = false; setLoop('pour', 0, 900, 'bandpass'); }
    if (p.onFire){
      p.heat += dt * .105 * DIFF.heat; ahwaPotVisual();
      const fl = S.props.stove.obj.userData.flame; fl.scale.setScalar(1 + Math.sin(t*30)*.08);
      if (p.heat > .45 && Math.random() < dt*6){ _sw.copy(S.props.kanaka.g.position); _sw.y += .2; S.grp.localToWorld(_sw); puff(_sw, .05); }
      if (p.heat > .8 && Math.random() < dt*8) tone(180 + Math.random()*80, 120, .05, 'sine', .03);
      if (p.heat >= 1.0){ p.onFire = false; p.ruined = true; p.foam = false; ahwaPotVisual(); noise(.6, 500, .3); buzz(80); stMsg('القهوة فارت! 😬 دوس ارمي', 'bad'); }
      $('stMeter').hidden = false; $('stMeterLabel').textContent = 'النار'; $('stMeterBar').style.width = (Math.min(p.heat,1)*100) + '%'; $('stBand').style.left = '72%'; $('stBand').style.width = '26%';
    } else if (!pouring) $('stMeter').hidden = true;
    const v = AH.vessel;
    if (v && v.hotT > 0 && v.fill > .3){ v.hotT -= dt; if (Math.random() < dt*3){ _sw.copy(S.props.work.g.position); _sw.y += v.kind === 'cup' ? .15 : .24; S.grp.localToWorld(_sw); puff(_sw, .05); } }
    if (Math.random() < dt*1.2){ _sw.copy(S.props.barrad.g.position); _sw.y += .26; S.grp.localToWorld(_sw); puff(_sw, .04); }
  }
  // foul simulation
  if (ST.kind === 'foul' || modeId === 'foul'){
    for (const f of FL.fry){ f.t += dt; fryColor(f.t, f.type, f.mesh.material.color); f.mesh.position.y = .052 + Math.sin(t*20 + f.t*3)*.003; }
    if (FL.fry.length && Math.random() < dt*FL.fry.length*2){ const f = rpick(FL.fry); _sw.copy(f.mesh.position); f.mesh.parent.localToWorld(_sw); _sw.y += .03; puff(_sw, .035); }
    setLoop('sizzle', ST.kind === 'foul' ? Math.min(.14, FL.fry.length*.025) : 0, 4000, 'highpass');
  }
  // spoon flight
  if (spoonAnim){ spoonAnim.t += dt/.35; const k = Math.min(1, spoonAnim.t); flySpoon.position.lerpVectors(spoonAnim.a, spoonAnim.b, k); flySpoon.position.y += Math.sin(k*Math.PI)*.12; flySpoon.rotation.x = -k*1.2; if (k >= 1){ spoonAnim = null; flySpoon.visible = false; } }
  // hint ring + labels + ticket
  const nx = ST.kind === 'ahwa' ? ahwaNext() : foulNext();
  if (nx.prop && S.props[nx.prop]){ S.ring.visible = true; S.ring.position.set(S.props[nx.prop].g.position.x, .04, S.props[nx.prop].g.position.z); const sc = 1 + Math.sin(t*6)*.12; S.ring.scale.set(sc, sc, sc); } else S.ring.visible = false;
  $('stBtns').querySelectorAll('button').forEach(b => b.classList.toggle('pulse', b.dataset.b === nx.btn));
  if (ST.msgT > 0){ ST.msgT -= dt; } else { $('stHint').textContent = nx.text; $('stHint').className = 'st-hint show'; }
  for (const L of ST.labels){ _sw.copy(L.pr.g.position); _sw.z += .14; S.grp.localToWorld(_sw); _sw.project(camera); L.el.style.left = ((_sw.x+1)/2*innerWidth) + 'px'; L.el.style.top = ((1-_sw.y)/2*innerHeight + 4) + 'px'; L.el.classList.toggle('hot', L.pr.name === nx.prop); }
  ST.tick = (ST.tick||0) - dt;
  if (ST.tick <= 0){ ST.tick = .25; renderTicket(); }
}
function renderTicket(){
  let html = '';
  if (ST.kind === 'ahwa'){
    const list = modeObj.patrons ? modeObj.patrons.filter(n => n.state === 'customer' && n.order).sort((a,b) => a.patience - b.patience) : [];
    html = '<b>الطلبات</b>' + (list.length ? list.slice(0,5).map(n => { const f = clamp(n.patience/n.maxPat,0,1); return `<div class="tk"><span>${orderLabel(n.order)} <small>🥄×${sugarSpoons(n.order.drink, n.order.sugar)}</small></span><i style="width:${f*100}%;background:${f<.3?'#e33':'#3aa84a'}"></i></div>`; }).join('') : '<div class="tk muted">مفيش طلبات دلوقتي</div>');
    const tr = modeObj.tray || []; html += `<div class="tk tr">الصينية (${tr.length}/${trayCap()}): ${tr.map(d => DRINK_ICON[d.drink]).join(' ') || '—'}</div>`;
  } else {
    const c = foulFront();
    if (c){ const f = clamp(c.patience/c.maxPat,0,1); const miss = foulMissing(c).map(sandKey); html = `<b>${c.n.name} عايز:</b>` + c.order.map(o => { const k = sandKey(o); const i = miss.indexOf(k); const done = i < 0; if (!done) miss.splice(i,1); return `<div class="tk ${done ? 'ok' : ''}">${done ? '✅' : '⬜'} ${sandLabel(o)}</div>`; }).join('') + `<div class="pat2"><i style="width:${f*100}%;background:${f<.3?'#e33':'#3aa84a'}"></i></div>`; }
    else html = '<b>مستني زبون…</b>';
    html += `<div class="tk tr">في الكيس: ${FL.bag.length} · في الطابور: ${Math.max(0,(modeObj.queue||[]).length - (c?1:0))}</div>`;
  }
  $('stTicket').innerHTML = html;
}
