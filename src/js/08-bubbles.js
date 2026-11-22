// ================= bubbles =================
const bubbleLayer = $('bubbles'); const bubbles = [];
function headOf(ent){ if (ent.g) return _v.set(ent.g.position.x, ent.g.position.y + ent.head - (ent.state==='sit'||ent.state==='customer'||ent.state==='domino' ? .45 : 0), ent.g.position.z); if (ent.d) return _v.set(ent.d.root.position.x, ent.d.root.position.y + ent.d.height + .25, ent.d.root.position.z); return _v.set(0,0,0); }
function say(ent, text, dur=2.6, cls=''){
  let b = bubbles.find(b => b.ent === ent && !b.persist);
  if (!b){ const el = document.createElement('div'); bubbleLayer.appendChild(el); b = { el, ent }; bubbles.push(b); }
  b.el.className = 'bubble ' + cls; b.el.textContent = text; b.t = dur;
  if (ent.g && Math.random() < .55) speak(text);
}
function orderBubble(ent){ const el = document.createElement('div'); el.className = 'bubble order'; bubbleLayer.appendChild(el); const b = { el, ent, persist: true, t: 1e9 }; bubbles.push(b); return b; }
function removeBubble(b){ const i = bubbles.indexOf(b); if (i >= 0) bubbles.splice(i,1); b.el.remove(); }
function clearBubbles(){ while (bubbles.length) removeBubble(bubbles[0]); }
const _p = new THREE.Vector3();
function updateBubbles(dt){
  for (let i=bubbles.length-1;i>=0;i--){
    const b = bubbles[i]; if (!b.persist){ b.t -= dt; if (b.t <= 0){ removeBubble(b); continue; } }
    _p.copy(headOf(b.ent)); const dist = _p.distanceTo(camera.position); _p.project(camera);
    if (_p.z > 1 || dist > 40 || (b.ent.g && !b.ent.g.visible) || (b.ent.d && !b.ent.d.root.visible)){ b.el.style.display = 'none'; continue; }
    b.el.style.display = ''; b.el.style.left = ((_p.x+1)/2*innerWidth) + 'px'; b.el.style.top = ((1-_p.y)/2*innerHeight) + 'px';
  }
}
