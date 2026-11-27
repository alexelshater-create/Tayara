// ================= wedding dance: rhythm game on a mahraganat beat =================
// Notes fall in four lanes; tap the lane (or press D F J K / the arrow keys) when a note reaches the line.
const RHY = { on: false, t: 0, notes: [], hits: 0, total: 0, combo: 0, res: null, dur: 40, beat: 60/126, els: [] };
const LANE_KEYS = [['KeyD','ArrowLeft'], ['KeyF','ArrowDown'], ['KeyJ','ArrowUp'], ['KeyK','ArrowRight']];
function playWedding(){
  return new Promise(res => {
    RHY.on = true; RHY.t = -2; RHY.hits = 0; RHY.combo = 0; RHY.res = res; RHY.notes = [];
    const gap = DIFF.pat > 1 ? 2 : 1; // easier = fewer notes
    for (let b = 0; b * RHY.beat < RHY.dur; b += gap){ if (Math.random() < .2) continue; RHY.notes.push({ at: b * RHY.beat, lane: Math.floor(Math.random()*4), done: false, el: null }); if (b > 30 && Math.random() < .15) RHY.notes.push({ at: b * RHY.beat, lane: Math.floor(Math.random()*4), done: false, el: null }); }
    RHY.total = RHY.notes.length;
    $('rhy').hidden = false; $('rhyNotes').innerHTML = ''; hero.locked = true; document.body.classList.add('in-rhythm');
    beatNext = AC ? AC.currentTime + .05 : 0;
    rhyMsg('استعد…');
  });
}
function rhyMsg(t, cls=''){ const m = $('rhyMsg'); m.textContent = t; m.className = 'rhymsg ' + cls; }
function rhyHit(lane){
  if (!RHY.on || RHY.t < 0) return;
  const btn = document.querySelectorAll('.rlane')[lane]; btn.classList.add('hit'); setTimeout(() => btn.classList.remove('hit'), 90);
  let best = null, bd = 1e9; for (const n of RHY.notes){ if (n.done || n.lane !== lane) continue; const d = Math.abs(n.at - RHY.t); if (d < bd){ bd = d; best = n; } }
  if (best && bd < .24){ best.done = true; if (best.el) best.el.classList.add('gone'); RHY.hits++; RHY.combo++; rhyMsg(bd < .1 ? `جامد! ×${RHY.combo}` : `حلو ×${RHY.combo}`, 'good'); tone(880 + lane*110, 660, .06, 'triangle', .06); buzz(8); hero.d.punchT = .2; hero.d.punchSide = lane < 2 ? -1 : 1; }
  else { RHY.combo = 0; rhyMsg('فاتت', 'bad'); }
}
document.querySelectorAll('.rlane').forEach((b, i) => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); rhyHit(i); }));
addEventListener('keydown', e => { if (!RHY.on) return; LANE_KEYS.forEach((ks, i) => { if (ks.includes(e.code)){ e.preventDefault(); rhyHit(i); } }); });
function updateRhythm(dt){
  if (!RHY.on) return;
  RHY.t += dt;
  const H = $('rhyNotes').clientHeight || 300, travel = 1.6;
  for (const n of RHY.notes){
    const dtn = n.at - RHY.t;
    if (!n.done && dtn < -.25){ n.done = true; RHY.combo = 0; if (n.el) n.el.classList.add('miss'); }
    if (dtn > travel || (n.done && dtn < -.4)){ if (n.el && dtn < -.4){ n.el.remove(); n.el = null; } continue; }
    if (!n.el){ n.el = document.createElement('i'); n.el.className = `rnote l${n.lane}`; n.el.style.left = `${3 + n.lane*24}%`; $('rhyNotes').appendChild(n.el); }
    n.el.style.top = `${(1 - dtn/travel) * H - 15}px`;
  }
  $('rhyBar').style.width = `${clamp(RHY.t / RHY.dur, 0, 1)*100}%`;
  $('rhyScore').textContent = `${RHY.hits} / ${RHY.total}`;
  if (Math.floor((RHY.t) / RHY.beat) !== Math.floor((RHY.t - dt) / RHY.beat) && RHY.t > 0){ noise(.05, 2200, .12); }
  if (RHY.t >= RHY.dur + 1){
    RHY.on = false; $('rhy').hidden = true; hero.locked = false; document.body.classList.remove('in-rhythm'); $('rhyNotes').innerHTML = '';
    const pct = RHY.total ? RHY.hits / RHY.total : 0; const r = RHY.res; RHY.res = null; r && r({ pct, hits: RHY.hits, total: RHY.total });
  }
}
