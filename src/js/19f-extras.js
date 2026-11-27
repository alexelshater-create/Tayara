// ================= progress across all modes: stats, achievements, gold tea glasses, photo mode =================
const PROG_KEY = 'ty_prog';
const PROG = (() => { try { const p = JSON.parse(store.get(PROG_KEY) || 'null'); if (p) return { ...p, glasses: p.glasses || [], ach: p.ach || {}, stats: p.stats || {}, best: p.best || {} }; } catch(e){} return { glasses: [], ach: {}, stats: {}, best: {} }; })();
const saveProg = () => store.set(PROG_KEY, JSON.stringify(PROG));
function stat(key, n=1){ PROG.stats[key] = (PROG.stats[key] || 0) + n; achCheckSoon(); }
function bestOf(key, v, lower=false){ const b = PROG.best[key]; if (b === undefined || (lower ? v < b : v > b)){ PROG.best[key] = v; saveProg(); return true; } return false; }
const stS = k => PROG.stats[k] || 0;
// ---- achievements ----
const ACH = [
  { id: 'shift', icon: '☕', name: 'أول وردية', desc: 'قدّم أول مشروب في قصر الملوك', ok: () => stS('drinks') >= 1 },
  { id: 'tea50', icon: '🫖', name: 'معلم الشاي', desc: 'قدّم ٥٠ مشروب', ok: () => stS('drinks') >= 50, prog: () => [stS('drinks'), 50] },
  { id: 'foul30', icon: '🧆', name: 'ملك الفول', desc: 'بيع ٣٠ طلب فول', ok: () => stS('foul') >= 30, prog: () => [stS('foul'), 30] },
  { id: 'dom', icon: '🎲', name: 'إيد خفيفة', desc: 'اكسب ماتش دومنو', ok: () => stS('domWin') >= 1 },
  { id: 'dom2', icon: '🤝', name: 'شركاء', desc: 'اكسب ماتش ٢ ضد ٢ مع إسلام', ok: () => stS('domWin2') >= 1 },
  { id: 'qafla', icon: '🔒', name: 'قفلة!', desc: 'اقفل الدور وانت أقل في النقط', ok: () => stS('qafla') >= 1 },
  { id: 'tawla', icon: '🎯', name: 'عم الطاولة', desc: 'اكسب عشرة طاولة', ok: () => stS('tawlaWin') >= 1 },
  { id: 'g1', icon: '🏆', name: 'أول كوباية دهب', desc: 'لاقي كوباية شاي دهب', ok: () => PROG.glasses.length >= 1 },
  { id: 'g10', icon: '✨', name: 'نص الطقم', desc: 'لاقي ١٠ كوبايات دهب', ok: () => PROG.glasses.length >= 10, prog: () => [PROG.glasses.length, 10] },
  { id: 'g20', icon: '👑', name: 'الطقم الدهب كامل', desc: 'لاقي الـ ٢٠ كوباية الدهب', ok: () => PROG.glasses.length >= 20, prog: () => [PROG.glasses.length, 20] },
  { id: 'arabi5', icon: '👊', name: 'مش خايف', desc: 'وقّع العربي ٥ مرات', ok: () => stS('arabiDown') >= 5, prog: () => [stS('arabiDown'), 5] },
  { id: 'thief5', icon: '🥪', name: 'صايد الحرامي', desc: 'امسك يوسف ٥ مرات', ok: () => stS('thief') >= 5, prog: () => [stS('thief'), 5] },
  { id: 'pizza10', icon: '🍕', name: 'طيار ديليفري', desc: 'وصّل ١٠ بيتزا', ok: () => stS('pizza') >= 10, prog: () => [stS('pizza'), 10] },
  { id: 'tuk10', icon: '🛺', name: 'أسطى توكتوك', desc: 'وصّل ١٠ زباين بالتوكتوك', ok: () => stS('tuk') >= 10, prog: () => [stS('tuk'), 10] },
  { id: 'goal5', icon: '⚽', name: 'هداف الحتة', desc: 'سجّل ٥ من ٥ ضربات جزاء', ok: () => stS('penalty5') >= 1 },
  { id: 'park', icon: '🅿️', name: 'السايس مبسوط', desc: 'اركن في أقل من ٢٠ ثانية', ok: () => stS('parkFast') >= 1 },
  { id: 'stunt', icon: '🏍️', name: 'طيارة بجد', desc: 'اطلع في الهوا ثانيتين بالموتوسيكل', ok: () => stS('air2') >= 1 },
  { id: 'pigeon', icon: '🕊️', name: 'غِيّة الحمام', desc: 'رجّع الحمام كله للغِيّة', ok: () => stS('pigeons') >= 1 },
  { id: 'kameen', icon: '🚓', name: 'ورقك سليم', desc: 'عدّي من كمين من غير مخالفة', ok: () => stS('kameenOk') >= 1 },
  { id: 'garage', icon: '🔧', name: 'عربيتي على مزاجي', desc: 'غيّر لون أو ركّب حاجة في الجراج', ok: () => stS('garage') >= 1 },
  { id: 'house3', icon: '🏠', name: 'بيت الجامد', desc: 'جدّد البيت لآخر مستوى', ok: () => typeof SAVE !== 'undefined' && SAVE.house >= 3 },
  { id: 'photo5', icon: '📸', name: 'مصوّر الحتة', desc: 'صوّر ٥ صور', ok: () => stS('photos') >= 5, prog: () => [stS('photos'), 5] },
  { id: 'ramadan', icon: '🌙', name: 'ليلة رمضان', desc: 'لف في الحتة في ليلة رمضان', ok: () => stS('ramadan') >= 1 },
  { id: 'story', icon: '👑', name: 'الجامد', desc: 'خلّص القصة كلها', ok: () => typeof SAVE !== 'undefined' && SAVE.ended },
];
let achT = 0; const achCheckSoon = () => { achT = Math.min(achT, .2); };
const achQueue = [];
function achCheck(){ let any = false; for (const a of ACH){ if (PROG.ach[a.id]) continue; let ok = false; try { ok = a.ok(); } catch(e){} if (ok){ PROG.ach[a.id] = Date.now(); achQueue.push(a); any = true; } } if (any) saveProg(); }
function achToastTick(dt){
  const el = $('achToast');
  if (achToastTick.t > 0){ achToastTick.t -= dt; if (achToastTick.t <= 0) el.classList.remove('show'); return; }
  const a = achQueue.shift(); if (!a || CUT.on) { if (a) achQueue.unshift(a); return; }
  el.innerHTML = `<span class="ai">${icon('trophy')}</span><span><small>إنجاز جديد</small><b>${a.name}</b></span>`; el.classList.add('show'); achToastTick.t = 3.6;
  tone(660, 660, .12, 'triangle', .15); tone(880, 880, .12, 'triangle', .15, .12); tone(1320, 1320, .3, 'triangle', .15, .24); buzz(30);
}
achToastTick.t = 0;
function openAch(){
  if (state === 'play'){ state = 'pause'; for (const k in keys) keys[k] = false; }
  const done = ACH.filter(a => PROG.ach[a.id]).length;
  $('achHead').textContent = AR(`الإنجازات · ${done}/${ACH.length} · كوبايات دهب ${PROG.glasses.length}/20`);
  $('achList').innerHTML = ARH(ACH.map(a => { const got = !!PROG.ach[a.id], p = !got && a.prog ? a.prog() : null; return `<div class="ach ${got ? 'got' : ''}"><span class="ai">${icon(got ? 'trophy' : 'lock')}</span><span><b>${a.name}</b><small>${a.desc}${p ? ` · ${Math.min(p[0], p[1])}/${p[1]}` : ''}</small></span></div>`; }).join(''));
  $('achOv').hidden = false;
}
$('achClose').onclick = () => { $('achOv').hidden = true; resumeIfFree(); };
// ---- 20 gold tea glasses hidden around the map ----
const goldMat = new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 1, roughness: .22, emissive: 0x6a4500, emissiveIntensity: .55 });
const goldTea = new THREE.MeshStandardMaterial({ color: 0x8a2a06, emissive: 0x3a1000, emissiveIntensity: .4, roughness: .3 });
const GLASS_SPOTS = (() => {
  const rnd = mulberry32(2024), out = [];
  const blockAt = (i, k) => { const [cx, cz] = RELOC(X0 + PITCH/2 + i*PITCH, Z0 + PITCH/2 + k*PITCH); return blocksInfo.find(b => Math.abs(b.cx - cx) < 2 && Math.abs(b.cz - cz) < 2); };
  const picks = [[0,0],[1,3],[2,0],[3,4],[4,1],[5,3],[6,0],[7,1],[1,4],[0,4],[3,1],[5,0],[2,4],[2,3],[4,3],[1,1]];
  for (const [i, k] of picks){ const b = blockAt(i, k); if (!b) continue; const p = perimPos(b, rnd()*4); out.push([p[0], p[1]]); }
  const lmk = k => CITY && CLM[k] ? [CLM[k].x + 8, CLM[k].z - CLM[k].x * 0 - 30] : null;
  out.push(...[[62, 276], [142, 282], [216, -24]].map(([x, z]) => RELOC(x, z)), ...[lmk('mursi'), lmk('saad'), lmk('soldier')].filter(Boolean));
  return out.slice(0, 20).map(([x, z], id) => { const [fx, fz] = freeSpot(x, z); return { id, x: fx, z: fz }; });
})();
const goldGlasses = GLASS_SPOTS.map(s => {
  const g = new THREE.Group();
  const gl = makeGlass('شاي'); gl.traverse(m => { if (m.isMesh) m.material = m.material === glassMat ? goldMat : m.material === saucerMat ? goldMat : goldTea; }); gl.scale.setScalar(4.2); g.add(gl);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); beam.scale.set(.35, .45, .35); g.add(beam);
  g.position.set(s.x, groundY(s.x, s.z), s.z); g.visible = false; scene.add(g);
  return { ...s, g, gl, got: () => PROG.glasses.includes(s.id) };
});
const glassesOn = () => state === 'play' && (modeId === 'story' || modeId === 'free');
function updateGlasses(dt, t){
  const on = glassesOn(), f = hero.veh ? hero.veh.pos : hero.pos;
  for (const G of goldGlasses){
    const vis = on && !G.got() && !HOUSE.inside && Math.abs(G.x - f.x) < 140 && Math.abs(G.z - f.z) < 140;
    G.g.visible = vis; if (!vis) continue;
    G.gl.rotation.y = t*1.8 + G.id; G.gl.position.y = 1 + Math.sin(t*2.4 + G.id)*.15;
    const d = Math.hypot(G.x - f.x, G.z - f.z);
    if (d < (hero.veh ? 3.2 : 1.8)){
      PROG.glasses.push(G.id); saveProg(); G.g.visible = false; const n = PROG.glasses.length;
      const pay = n >= 20 ? 500 : 25; hero.money += pay; coin(); tone(1046, 1568, .35, 'triangle', .16); buzz(40); stat('glassFound'); heroCheer();
      banner(n >= 20 ? `لقيت الطقم الدهب كله! +${pay} جنيه` : `كوباية دهب ${n}/20 · +${pay} جنيه`, 'ok', 3);
    }
  }
}
// ---- photo mode ----
const PHOTO = { on: false, yaw: 0, tilt: .25, dist: 4.2, filter: 'none', pose: 0, last: null };
const PHOTO_FILTERS = [['none', 'عادي'], ['sepia(.85) contrast(1.05)', 'قديم'], ['grayscale(1) contrast(1.15)', 'أبيض وأسود'], ['saturate(1.5) contrast(1.08)', 'ألوان'], ['sepia(.35) saturate(1.4) hue-rotate(-12deg)', 'دافي']];
const POSES = ['واقف', 'بوكس', 'بيرقص', 'واقع'];
function openPhoto(){
  if (state !== 'play' || CUT.on || ST.kind || RHY.on) return;
  PHOTO.on = true; PHOTO.yaw = camYaw; PHOTO.tilt = .25; PHOTO.dist = 4.2; PHOTO.pose = 0;
  document.body.classList.add('photo'); $('photoUi').hidden = false; renderPhotoUi();
}
function closePhoto(){ PHOTO.on = false; document.body.classList.remove('photo'); $('photoUi').hidden = true; $('photoShot').hidden = true; canvas.style.filter = ''; hero.d.downT = 0; CAM.orbit = CAM.orbitSm = camYaw; }
function renderPhotoUi(){
  $('phFilter').textContent = PHOTO_FILTERS.find(f => f[0] === PHOTO.filter)[1];
  $('phPose').textContent = POSES[PHOTO.pose];
  canvas.style.filter = PHOTO.filter === 'none' ? '' : PHOTO.filter;
}
$('phFilter').onclick = () => { const i = PHOTO_FILTERS.findIndex(f => f[0] === PHOTO.filter); PHOTO.filter = PHOTO_FILTERS[(i + 1) % PHOTO_FILTERS.length][0]; renderPhotoUi(); };
$('phPose').onclick = () => { PHOTO.pose = (PHOTO.pose + 1) % POSES.length; renderPhotoUi(); };
$('phClose').onclick = closePhoto;
$('phZoomIn').onclick = () => { PHOTO.dist = clamp(PHOTO.dist - .8, 1.8, 14); };
$('phZoomOut').onclick = () => { PHOTO.dist = clamp(PHOTO.dist + .8, 1.8, 14); };
$('phSnap').onclick = takePhoto;
$('photoBtn').onclick = openPhoto;
function photoTick(dt, t){
  // drag anywhere to orbit; the world is frozen, only the hero poses
  const f = hero.veh ? hero.veh.pos : hero.pos;
  lookAt.set(f.x, f.y + 1.15, f.z);
  const h = .3 + PHOTO.dist * PHOTO.tilt;
  camera.position.set(f.x + Math.sin(PHOTO.yaw)*PHOTO.dist, f.y + 1.05 + h, f.z + Math.cos(PHOTO.yaw)*PHOTO.dist); camera.lookAt(lookAt);
  camYaw = PHOTO.yaw;
  const d = hero.d;
  if (!hero.veh){ d.root.position.copy(hero.pos); d.root.visible = true; }
  if (PHOTO.pose === 1){ if (d.punchT <= 0){ d.punchT = .28; d.punchSide = -d.punchSide || 1; } }
  if (PHOTO.pose === 3) d.downT = Math.max(d.downT, .5); else d.downT = 0;
  const dance = PHOTO.pose === 2 ? Math.sin(t*6) : 0;
  if (d.is3D){ d.forceMove = PHOTO.pose === 2 ? 'dance' : null; animDoll(d, 0, 0, dt, t); } else animDoll(d, dance*2.5, 0, dt, t); if (PHOTO.pose === 2 && !d.is3D){ d.doll.rotation.z = dance*.12; d.doll.position.y += Math.abs(dance)*.08; }
  for (const x of [enemy, wanted]) if (x.active && x.d.root.visible) animDoll(x.d, 0, 0, 0, t);
  updateBubbles(dt);
}
(() => { let drag = null;
  canvas.addEventListener('pointerdown', e => { if (!PHOTO.on) return; drag = { x: e.clientX, y: e.clientY }; });
  addEventListener('pointermove', e => { if (!PHOTO.on || !drag) return; PHOTO.yaw -= (e.clientX - drag.x) * .008; PHOTO.tilt = clamp(PHOTO.tilt + (e.clientY - drag.y) * .004, -.05, 1.2); drag = { x: e.clientX, y: e.clientY }; });
  addEventListener('pointerup', () => { drag = null; });
  addEventListener('wheel', e => { if (PHOTO.on) PHOTO.dist = clamp(PHOTO.dist + Math.sign(e.deltaY)*.6, 1.8, 14); }, { passive: true });
})();
function takePhoto(){
  photoTick(0, performance.now()/1000); renderer.render(scene, camera);
  const W = canvas.width, H = canvas.height, out = document.createElement('canvas'); out.width = W; out.height = H; const g = out.getContext('2d');
  if (PHOTO.filter !== 'none') g.filter = PHOTO.filter; g.drawImage(canvas, 0, 0); g.filter = 'none';
  const s = H / 720; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, H - 64*s, W, 64*s);
  g.font = `900 ${34*s}px Cairo, sans-serif`; g.fillStyle = '#ffc94a'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.direction = 'ltr'; g.fillText('Grand Thieves Alexandria', W - 22*s, H - 32*s);
  g.font = `700 ${20*s}px Cairo, sans-serif`; g.fillStyle = '#f6efe2'; g.textAlign = 'left'; g.direction = 'ltr'; g.fillText(`${DISTRICT_NAMES[districtAt(hero.pos.x, hero.pos.z)] || ''} · ${clockText()}`, 22*s, H - 32*s);
  PHOTO.last = out.toDataURL('image/jpeg', .9);
  $('photoImg').src = PHOTO.last; $('photoShot').hidden = false;
  noise(.08, 4000, .4); flash(); stat('photos');
}
$('phSave').onclick = () => { const a = document.createElement('a'); a.href = PHOTO.last; a.download = `tayara-${Date.now()}.jpg`; document.body.appendChild(a); a.click(); a.remove(); };
$('phShare').onclick = async () => { try { const blob = await (await fetch(PHOTO.last)).blob(); const file = new File([blob], 'tayara.jpg', { type: 'image/jpeg' }); if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Grand Thieves Alexandria' }); else $('phSave').onclick(); } catch(e){} };
$('phBack').onclick = () => { $('photoShot').hidden = true; };
$('phShare').hidden = !navigator.share;
// ---- per-frame ----
function updateExtras(dt, t){
  updateGlasses(dt, t);
  achT -= dt; if (achT <= 0){ achT = 1.5; achCheck(); }
  achToastTick(dt);
}
