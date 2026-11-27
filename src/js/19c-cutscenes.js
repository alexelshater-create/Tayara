// ================= cutscenes and dialogue =================
// A cutscene is a list of steps: { cam, look, t } moves the camera, { say, text } shows a line,
// { do } runs code, { wait } pauses, { walk: [doll, x, z, speed] } walks a photo character.
// Story steps: { narr: 'kamel_03_1' } الحاج كامل narrates (audio + subtitle), { flash: true|false } old-film flashback look,
// { card: chapterIndex|false } the big black chapter card, { rain: true|false } the storm.
const CAST = {
  tayara: { name: () => heroName, face: () => CH.hero.img.face }, arabi: { name: () => 'العربي', face: () => CH.enemy.img.face },
  shams: { name: () => 'شمس', face: () => CH.wanted.img.face }, youssef: { name: () => 'يوسف إبراهيم', face: () => CH.youssef.img.face },
  islam: { name: () => 'إسلام', face: () => CH.islam.img.face }, sayed: { name: () => 'الحاج كامل', emoji: '👳‍♂️' },
  moallem: { name: () => 'المعلم عبده', emoji: '🧔' }, landlord: { name: () => 'الحاج محمود', emoji: '👳' }, azzouz: { name: () => 'عزوز', emoji: '👨‍🍳' },
  fathi: { name: () => 'الحاج فتحي', emoji: '🧆' }, crowd: { name: () => 'الناس', emoji: '👥' }, police: { name: () => 'الظابط', emoji: '👮' }, mechanic: { name: () => 'الأسطى رضا', emoji: '🔧' }, phone: { name: () => 'الموبايل', emoji: '📱' }, thug: { name: () => 'رجالة شمس', emoji: '😠' },
};
const CAST_DOLLS = { tayara: hero.d, arabi: enemyD, shams: wantedD, youssef: youssefD, islam: islamD };
const CUT = { on: false, timers: [], cam: null, walkers: [], typing: null, waitTap: null, skip: false, idle: new Set() };
function showActor(d, x, z, legs=true){ [x, z] = RELOC(x, z); d.holdMove = null; d.root.visible = true; d.root.position.set(x, groundY(x, z), z); d.P.legL.visible = d.P.legR.visible = legs; d.blob.visible = legs; d.downT = 0; if (d !== hero.d) CUT.idle.add(d); }
function hideActor(d){ d.root.visible = false; d.holdMove = null; CUT.idle.delete(d); }
const cv3 = a => { if (a instanceof THREE.Vector3) return a.clone(); const [x, z] = RELOC(a[0], a[2]); return new THREE.Vector3(x, a[1], z); };
function cutWait(s){ return new Promise(res => CUT.timers.push({ t: s, res })); }
function tickCutscene(dt){
  for (let i = CUT.timers.length - 1; i >= 0; i--){ const w = CUT.timers[i]; w.t -= dt; if (w.t <= 0 || CUT.skip){ CUT.timers.splice(i, 1); w.res(); } }
  if (CUT.cam){ const c = CUT.cam; c.k = Math.min(1, c.k + dt / c.t); const e = c.k < .5 ? 2*c.k*c.k : 1 - Math.pow(-2*c.k + 2, 2)/2; camera.position.lerpVectors(c.p0, c.p1, e); lookAt.lerpVectors(c.l0, c.l1, e); if (c.k >= 1 || CUT.skip){ camera.position.copy(c.p1); lookAt.copy(c.l1); CUT.cam = null; c.res(); } }
  const walking = new Set();
  for (let i = CUT.walkers.length - 1; i >= 0; i--){
    const w = CUT.walkers[i], isHero = w.d === hero.d, p = isHero ? hero.pos : w.d.root.position, dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz);
    if (d < .12 || CUT.skip){ p.x = w.x; p.z = w.z; if (isHero) hero.vel.set(0,0,0); CUT.walkers.splice(i, 1); w.res(); continue; }
    const s = Math.min(d, w.sp*dt); p.x += dx/d*s; p.z += dz/d*s; p.y = groundY(p.x, p.z);
    if (isHero) hero.vel.set(dx/d*w.sp, 0, dz/d*w.sp); else { animDoll(w.d, dx/d*w.sp, dz/d*w.sp, dt, performance.now()/1000); walking.add(w.d); }
  }
  for (const d of CUT.idle) if (!walking.has(d) && d.root.visible) animDoll(d, 0, 0, dt, performance.now()/1000);
  if (CUT.typing){ const ty = CUT.typing; ty.i = Math.min(ty.full.length, ty.i + dt*38); $('dlgText').textContent = ty.full.slice(0, Math.floor(ty.i)); if (ty.i >= ty.full.length) CUT.typing = null; }
}
function dlgShow(who, text, narr){
  const c = CAST[who] || CAST.crowd; const face = c.face && c.face();
  $('dlgFace').innerHTML = face ? `<img src="${face}" alt="">` : `<span>${icon('user')}</span>`;
  $('dlgName').textContent = c.name(); $('dlg').hidden = false; $('dlgText').textContent = ''; $('dlg').classList.toggle('narr', !!narr);
  CUT.typing = { full: text, i: 0 };
  const td = CAST_DOLLS[who]; if (td && td.is3D) td.talkT = clamp(text.length * .055, 1.2, 4.5);
  if (narr) playNarr(narr); else if (!muted && !playVoice(text)) speak(text);
}
function dlgTap(){
  if (!CUT.on) return;
  if (CUT.typing){ $('dlgText').textContent = CUT.typing.full; CUT.typing = null; return; }
  if (CUT.waitTap){ const r = CUT.waitTap; CUT.waitTap = null; r(); }
}
$('dlg').addEventListener('pointerdown', e => { e.stopPropagation(); dlgTap(); });
$('cine').addEventListener('pointerdown', e => { if (e.target.id === 'cineSkip') return; dlgTap(); });
$('cineSkip').addEventListener('pointerdown', e => { e.stopPropagation(); CUT.skip = true; if (CUT.waitTap){ const r = CUT.waitTap; CUT.waitTap = null; r(); } });
addEventListener('keydown', e => { if (CUT.on && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')){ e.preventDefault(); dlgTap(); } if (CUT.on && e.code === 'Escape'){ CUT.skip = true; if (CUT.waitTap){ const r = CUT.waitTap; CUT.waitTap = null; r(); } } }, true);
async function playCut(steps){
  if (CUT.on) return;
  CUT.on = true; CUT.skip = false; hero.locked = true; if (steps.some(s => s && s.flash === true)) CUT.todBefore = TOD.h; document.body.classList.add('cutscene'); $('cine').hidden = false; hero.vel.set(0,0,0);
  if (innerHeight < 520) camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * .17, innerWidth, innerHeight);
  if (hero.veh) hero.veh.speed = 0;
  try {
    for (const s of steps){
      if (s.do){ try { s.do(); } catch(e){ console.error(e); } }
      if (CUT.skip && !s.do) continue;
      if (s.cam){ await new Promise(res => { CUT.cam = { p0: camera.position.clone(), p1: cv3(s.cam), l0: lookAt.clone(), l1: cv3(s.look || s.cam), k: s.t === 0 ? 1 : 0, t: s.t ?? 1.4, res }; }); }
      if (s.walk){ const [d, x, z, sp] = s.walk; const pr = new Promise(res => CUT.walkers.push({ d, x, z, sp: sp || 2.2, res })); if (!s.noWait) await pr; }
      if (s.flash !== undefined){ if (!s.flash && CUT.todBefore != null){ applyTimeOfDay(CUT.todBefore); CUT.todBefore = null; } setFlashback(s.flash); }
      if (s.rain !== undefined) setRain(s.rain);
      if (s.card !== undefined) chapterCardBig(s.card);
      if (s.narr && !NARR[s.narr] && !s.text) continue;
      if (s.say || s.narr){ const text = s.narr ? (NARR[s.narr] || s.text) : s.text; dlgShow(s.narr ? 'kamel' : s.say, text, s.narr); s.text = text; let tapped = false; const tap = new Promise(res => { CUT.waitTap = () => { tapped = true; res(); }; });
        await Promise.race([tap, cutWait(s.auto || Math.max(6, s.text.length * .09 + 3))]);
        if (!tapped && !CUT.skip && voiceLeft() > .2) await Promise.race([tap, cutWait(voiceLeft() + .35)]);
        CUT.waitTap = null; CUT.typing = null; stopVoice(); }
      if (s.wait) await cutWait(s.wait);
      if (s.fade) await fadeTo(s.fade === true ? null : s.fade);
    }
  } finally {
    $('dlg').hidden = true; $('cine').hidden = true; document.body.classList.remove('cutscene'); stopVoice(); setFlashback(false); if (CUT.todBefore != null){ applyTimeOfDay(CUT.todBefore); CUT.todBefore = null; } chapterCardBig(false); SCENE.hideHero = false; SCENE.lockY = false; if (!ST.kind) camera.clearViewOffset();
    CUT.on = false; CUT.cam = null; CUT.walkers.length = 0; CUT.skip = false; hero.locked = false;
    CAM.orbit = CAM.orbitSm = camYaw;
  }
}
// camera helpers for scripting: a spot near a point, looking at it
function camNear(p, dx=0, dy=2.2, dz=4.5){ return [p.x + dx, (p.y||0) + dy, p.z + dz]; }
function lookAtP(p, dy=1.4){ return [p.x, (p.y||0) + dy, p.z]; }
