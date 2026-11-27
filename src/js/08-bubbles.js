// ================= bubbles =================
const bubbleLayer = $('bubbles'); const bubbles = [];
function headOf(ent){ if (ent.g) return _v.set(ent.g.position.x, ent.g.position.y + ent.head - (ent.state==='sit'||ent.state==='customer'||ent.state==='domino' ? .45 : 0), ent.g.position.z); if (ent.d) return _v.set(ent.d.root.position.x, ent.d.root.position.y + ent.d.height + .25, ent.d.root.position.z); return _v.set(0,0,0); }
function say(ent, text, dur=2.6, cls=''){
  if (!text) return;
  if (ent.arms) ent.gestT = Math.min(dur || 2, 2.2);
  if (ent.g && Math.random() < .55) speak(text);
  // who is talking: one of the story's people (name in colour) or someone in the street (only when you're close enough to hear)
  const doll = ent.d || null, key = doll && typeof CAST_DOLLS !== 'undefined' ? Object.keys(CAST_DOLLS).find(k => CAST_DOLLS[k] === doll) : null;
  const pos = ent.g ? ent.g.position : doll ? doll.root.position : null;
  if (!key && pos && !CUT.on && pos.distanceTo(heroAt()) > 16) return;
  subtitle(text, key ? CAST[key].name() : '', key ? 'main' : 'npc', Math.max(2, dur));
}
function orderBubble(ent){ const el = document.createElement('div'); el.className = 'bubble order'; bubbleLayer.appendChild(el); const b = { el, ent, persist: true, t: 1e9 }; bubbles.push(b); return b; }
function removeBubble(b){ const i = bubbles.indexOf(b); if (i >= 0) bubbles.splice(i,1); b.el.remove(); }
function clearBubbles(){ while (bubbles.length) removeBubble(bubbles[0]); }
const _p = new THREE.Vector3();
// bubbles keep out of the HUD (the cards and buttons at the top, the action buttons at the bottom) and inside the screen
let hudRects = [], hudRectT = 0;
function readHudRects(){ hudRects = $('hud').hidden ? [] : [...document.querySelectorAll('#hud .top .card, #hud .top .col:last-child, #hud .mbtns, #hud .banner.show')].filter(e => e.offsetWidth).map(e => e.getBoundingClientRect()); }
function placeBubble(b, x, y){
  const txt = b.el.textContent; if (b.txt !== txt || !b.w){ b.txt = txt; b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }   // (0 while its layer is hidden: measure again later)
  const w = b.w, h = b.h + 7;   // y is the tip of the bubble (it hangs above it)
  x = clamp(x, w/2 + 6, innerWidth - w/2 - 6);
  // if it lands on a HUD box: the nearest spot (one or two moves out of the boxes) that is free and on screen
  const hits = (px, py) => hudRects.some(r => px - w/2 < r.right + 4 && px + w/2 > r.left - 4 && py - h < r.bottom + 4 && py > r.top - 4);
  if (hits(x, y)){
    const outs = (px, py) => hudRects.flatMap(r => [[px, r.bottom + h + 6], [px, r.top - 6], [r.left - w/2 - 6, py], [r.right + w/2 + 6, py]]);
    const one = outs(x, y), cands = one.concat(one.flatMap(([px, py]) => outs(px, py)));
    let best = null, bd = 1e9;
    for (const [px, py] of cands){
      if (px - w/2 < 2 || px + w/2 > innerWidth - 2 || py - h < 2 || py > innerHeight - 2) continue;
      const d = Math.abs(px - x) + Math.abs(py - y); if (d < bd && !hits(px, py)){ bd = d; best = [px, py]; }
    }
    if (best){ x = best[0]; y = best[1]; }
  }
  b.el.style.left = x + 'px'; b.el.style.top = clamp(y, h + 4, innerHeight - 4) + 'px';
}
function updateBubbles(dt){
  updateSubs(dt);
  hudRectT -= dt; if (hudRectT <= 0){ hudRectT = .5; readHudRects(); }
  for (let i=bubbles.length-1;i>=0;i--){
    const b = bubbles[i]; if (!b.persist){ b.t -= dt; if (b.t <= 0){ removeBubble(b); continue; } }
    _p.copy(headOf(b.ent)); const dist = _p.distanceTo(camera.position); _p.project(camera);
    if (_p.z > 1 || dist > 40 || (b.ent.g && !b.ent.g.visible) || (b.ent.d && !b.ent.d.root.visible)){ b.el.style.display = 'none'; continue; }
    b.el.style.display = ''; placeBubble(b, (_p.x+1)/2*innerWidth, (1-_p.y)/2*innerHeight);
  }
}
