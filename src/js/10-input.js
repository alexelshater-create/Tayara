// ================= input =================
const keys = {};
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  keys[e.code] = true; if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (state !== 'play') return;
  if (e.code === 'KeyE') action();
  if (e.code === 'KeyF') punch();
  if (e.code === 'KeyH') { if (hero.veh) horn(); }
  if (e.code === 'Escape'){ if (!$('shop').hidden){ $('shop').hidden = true; hero.locked = false; } else if (ST.kind && modeId !== 'foul') exitStation(); else if (!$('domino').hidden) closeDomino(); else openMenu(); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
canvas.addEventListener('mousedown', e => { if (e.button === 0 && state === 'play' && !isTouch && !ST.kind && $('domino').hidden) punch(); });
const ZOOMS = [5, 7.5, 11]; let zoomIdx = 0, camDist = 5, camTarget = 5;
addEventListener('wheel', e => { camTarget = clamp(camTarget + Math.sign(e.deltaY)*1.2, 4, 15); }, { passive: true });
$('zoomBtn').onclick = () => { zoomIdx = (zoomIdx+1) % ZOOMS.length; camTarget = ZOOMS[zoomIdx]; };
$('menuBtn').onclick = () => openMenu();
const goFull = () => { const d = document.documentElement; try { const r = (d.requestFullscreen || d.webkitRequestFullscreen).call(d); if (r && r.catch) r.catch(() => {}); } catch(e){} };
$('fsBtn').onclick = () => { if (document.fullscreenElement) { try { document.exitFullscreen(); } catch(e){} } else goFull(); };
canvas.addEventListener('contextmenu', e => e.preventDefault());
let joyHintOn = store.get('ty_joy') !== '1'; const hideJoyHint = () => { if (joyHintOn){ joyHintOn = false; store.set('ty_joy','1'); $('joyHint').classList.remove('show'); } };
if (joyHintOn) $('joyHint').classList.add('show');
const joy = { id: null, x0: 0, y0: 0, vx: 0, vz: 0, mag: 0 }; const joyEl = $('joy'), knob = $('knob');
// camera orbit: drag on the right side of the screen (touch) or with the right mouse button
const CAM = { orbit: 0, orbitSm: 0, tilt: .44, veh: 0, lastDrag: -9, drag: null };
canvas.addEventListener('pointerdown', e => {
  if (ST.kind || state !== 'play') return;
  const camSide = e.pointerType === 'mouse' ? (e.button === 2 || e.button === 1) : e.clientX > innerWidth * .45;
  if (camSide){ if (CAM.drag) return; CAM.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch(err){} return; }
  if (e.pointerType === 'mouse' || joy.id !== null) return;
  hideJoyHint(); joy.id = e.pointerId; joy.x0 = e.clientX; joy.y0 = e.clientY; joyEl.style.left = e.clientX+'px'; joyEl.style.top = e.clientY+'px'; joyEl.style.display = 'block'; knob.style.transform = '';
});
addEventListener('pointermove', e => {
  if (CAM.drag && e.pointerId === CAM.drag.id){
    const dx = e.clientX - CAM.drag.x, dy = e.clientY - CAM.drag.y; CAM.drag.x = e.clientX; CAM.drag.y = e.clientY;
    const k = isTouch ? .009 : .006;
    if (hero.veh) CAM.veh = clamp(CAM.veh - dx*k, -Math.PI, Math.PI); else CAM.orbit -= dx*k;
    CAM.tilt = clamp(CAM.tilt + dy*k*.6, .12, 1.2); CAM.lastDrag = performance.now(); return;
  }
  if (e.pointerId !== joy.id) return; let dx = e.clientX - joy.x0, dy = e.clientY - joy.y0; const m = Math.hypot(dx,dy), max = 55; if (m > max){ dx *= max/m; dy *= max/m; } joy.vx = dx/max; joy.vz = dy/max; joy.mag = Math.min(1, m/max); knob.style.transform = `translate(${dx}px,${dy}px)`;
});
const endJoy = e => { if (CAM.drag && e.pointerId === CAM.drag.id){ CAM.drag = null; return; } if (e.pointerId !== joy.id) return; joy.id = null; joy.vx = joy.vz = joy.mag = 0; joyEl.style.display = 'none'; };
addEventListener('pointerup', endJoy); addEventListener('pointercancel', endJoy);
let runBtn = false; const rb = $('runBtn');
rb.addEventListener('pointerdown', e => { e.stopPropagation(); runBtn = true; rb.classList.add('on'); });
['pointerup','pointerleave','pointercancel'].forEach(ev => rb.addEventListener(ev, () => { runBtn = false; rb.classList.remove('on'); }));
$('actBtn').addEventListener('pointerdown', e => { e.stopPropagation(); if (state === 'play') action(); });
$('punchBtn').addEventListener('pointerdown', e => { e.stopPropagation(); if (state === 'play'){ if (hero.veh) horn(); else punch(); } });
