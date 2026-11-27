// ================= the city map (main menu → «الخريطة») =================
// Alexandria from the Western Port to Stanley, drawn from the real OpenStreetMap streets in the dark style.
// Drag to move, pinch / wheel / the buttons to zoom. (The live map with your position and the GPS comes with stages 12–16.)
const CMAP = { s: 1, x: 0, y: 0, min: 1, max: 4, ptrs: new Map(), pinch: null };
const cmapBox = document.createElement('div'); cmapBox.id = 'cityMap'; cmapBox.hidden = true;
cmapBox.innerHTML = '<div class="cm-view" id="cmView"><img id="cmImg" src="assets/map/alexandria.webp" alt="خريطة إسكندرية" draggable="false"></div>'
  + '<div class="cm-top"><button class="cm-btn" id="cmClose" aria-label="رجوع">➜</button><b>خريطة إسكندرية</b></div>'
  + '<div class="cm-zoom"><button class="cm-btn" id="cmIn" aria-label="قرّب">+</button><button class="cm-btn" id="cmOut" aria-label="بعّد">−</button></div>'
  + '<div class="cm-credit">© OpenStreetMap contributors</div>';
document.body.appendChild(cmapBox);
const cmImg = $('cmImg'), cmView = $('cmView');
function cmapApply(){
  const W = cmView.clientWidth, H = cmView.clientHeight, iw = cmImg.naturalWidth * CMAP.s, ih = cmImg.naturalHeight * CMAP.s;
  // keep the map on the screen: centred when smaller than the screen, edges stop at the screen edges when bigger
  CMAP.x = iw <= W ? (W - iw) / 2 : clamp(CMAP.x, W - iw, 0);
  CMAP.y = ih <= H ? (H - ih) / 2 : clamp(CMAP.y, H - ih, 0);
  cmImg.style.transform = `translate(${CMAP.x}px,${CMAP.y}px) scale(${CMAP.s})`;
}
function cmapZoom(f, cx, cy){
  const s = clamp(CMAP.s * f, CMAP.min, CMAP.max), k = s / CMAP.s;
  CMAP.x = cx - (cx - CMAP.x) * k; CMAP.y = cy - (cy - CMAP.y) * k; CMAP.s = s; cmapApply();
}
function cmapFit(){
  if (!cmImg.naturalWidth) return;
  const W = cmView.clientWidth, H = cmView.clientHeight;
  CMAP.min = Math.min(W / cmImg.naturalWidth, H / cmImg.naturalHeight); CMAP.max = CMAP.min * 4.5;
  // open a little zoomed in on the old city (Qaitbay → Raml Station)
  CMAP.s = Math.min(CMAP.max, CMAP.min * 1.6); const fx = .38, fy = .55;
  CMAP.x = W / 2 - cmImg.naturalWidth * CMAP.s * fx; CMAP.y = H / 2 - cmImg.naturalHeight * CMAP.s * fy; cmapApply();
}
function openCityMap(){ cmapBox.hidden = false; if (cmImg.complete) cmapFit(); else cmImg.onload = cmapFit; }
function closeCityMap(){ cmapBox.hidden = true; CMAP.ptrs.clear(); CMAP.pinch = null; }
$('cmClose').onclick = closeCityMap;
$('cmIn').onclick = () => cmapZoom(1.4, cmView.clientWidth / 2, cmView.clientHeight / 2);
$('cmOut').onclick = () => cmapZoom(1 / 1.4, cmView.clientWidth / 2, cmView.clientHeight / 2);
cmView.addEventListener('wheel', e => { e.preventDefault(); const r = cmView.getBoundingClientRect(); cmapZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
cmView.addEventListener('pointerdown', e => { try { cmView.setPointerCapture(e.pointerId); } catch (err){} CMAP.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); CMAP.pinch = null; });
cmView.addEventListener('pointermove', e => {
  const p = CMAP.ptrs.get(e.pointerId); if (!p) return;
  if (CMAP.ptrs.size === 1){ CMAP.x += e.clientX - p.x; CMAP.y += e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; cmapApply(); return; }
  p.x = e.clientX; p.y = e.clientY;
  const [a, b] = [...CMAP.ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = cmView.getBoundingClientRect(), cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top;
  if (CMAP.pinch){ cmapZoom(d / CMAP.pinch.d, cx, cy); CMAP.x += cx - CMAP.pinch.cx; CMAP.y += cy - CMAP.pinch.cy; cmapApply(); }
  CMAP.pinch = { d, cx, cy };
});
const cmapUp = e => { CMAP.ptrs.delete(e.pointerId); CMAP.pinch = null; };
cmView.addEventListener('pointerup', cmapUp); cmView.addEventListener('pointercancel', cmapUp);
addEventListener('resize', () => { if (!cmapBox.hidden) cmapApply(); });
addEventListener('keydown', e => { if (!cmapBox.hidden && e.key === 'Escape'){ e.stopPropagation(); closeCityMap(); } }, true);
$('mmMap').onclick = openCityMap;
