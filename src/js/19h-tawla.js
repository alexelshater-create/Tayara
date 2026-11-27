// ================= طاولة (backgammon) with عم رجب at قصر الملوك =================
// Standard rules as played in Egypt ("طاولة ٣١"): 15 pieces each, two dice, doubles play four times,
// a single piece (blot) can be hit and must re-enter from the bar first, you must use as much of the roll as possible
// (and the bigger die if only one can be used), bear off once all 15 are home. Match to 3; winning before the other
// side bears off a single piece (مارس) counts 2.
const TW = { pts: [], bar: [0, 0], off: [0, 0], dice: [], seqs: [], turn: 1, sel: null, score: [0, 0], target: 3, over: true, matchOver: true, busy: false, msg: '' };
const DIE_N = ['', 'يك', 'دو', 'سه', 'جهار', 'بيش', 'شيش'];
const DBL_N = ['', 'هبّاب', 'دوبارة', 'دوسة', 'دورجي', 'دبش', 'دُش'];
const rollName = (a, b) => a === b ? DBL_N[a] : `${DIE_N[Math.max(a, b)]} ${DIE_N[Math.min(a, b)]}`;
const TAWLA_SPOT = (() => { const [x, z] = TABLES[5]; return new THREE.Vector3(x, 0, z); })();
// pieces: +n = yours (moving 24 → 1), -n = عم رجب (moving 1 → 24). index 0 and 25 unused (0 = your bear-off, 25 = his)
function twNewGame(){
  TW.pts = Array(26).fill(0); TW.pts[24] = 2; TW.pts[13] = 5; TW.pts[8] = 3; TW.pts[6] = 5; TW.pts[1] = -2; TW.pts[12] = -5; TW.pts[17] = -3; TW.pts[19] = -5;
  TW.bar = [0, 0]; TW.off = [0, 0]; TW.dice = []; TW.seqs = []; TW.sel = null; TW.over = false;
}
const sideIdx = s => s === 1 ? 0 : 1;
function allHome(st, s){ if (st.bar[sideIdx(s)]) return false; for (let p = 1; p <= 24; p++){ if (st.pts[p]*s > 0 && (s === 1 ? p > 6 : p < 19)) return false; } return true; }
function canLand(st, s, p){ return st.pts[p]*s >= -1; }
function movesFor(st, s, d){
  const out = [], bi = sideIdx(s);
  if (st.bar[bi]){ const to = s === 1 ? 25 - d : d; if (canLand(st, s, to)) out.push({ from: 'bar', to, d }); return out; }
  const home = allHome(st, s);
  for (let p = 1; p <= 24; p++){
    if (st.pts[p]*s <= 0) continue;
    const to = p - d*s;
    if (to >= 1 && to <= 24){ if (canLand(st, s, to)) out.push({ from: p, to, d }); }
    else if (home){
      const exact = s === 1 ? to === 0 : to === 25;
      let higher = false; if (!exact){ for (let q = 1; q <= 24; q++) if (st.pts[q]*s > 0 && (s === 1 ? q > p : q < p) && (s === 1 ? q <= 6 : q >= 19)) higher = true; }
      if (exact || !higher) out.push({ from: p, to: s === 1 ? 0 : 25, d });
    }
  }
  return out;
}
function applyMove(st, s, m){
  const n = { pts: st.pts.slice(), bar: st.bar.slice(), off: st.off.slice() }, bi = sideIdx(s), hit = { v: false };
  if (m.from === 'bar') n.bar[bi]--; else n.pts[m.from] -= s;
  if (m.to === 0 || m.to === 25) n.off[bi]++;
  else { if (n.pts[m.to]*s === -1){ n.pts[m.to] = 0; n.bar[1 - bi]++; hit.v = true; } n.pts[m.to] += s; }
  n.hit = hit.v; return n;
}
function sequences(st, s, dice){
  const res = []; const seen = new Set();
  const rec = (state, left, seq) => {
    let any = false; const tried = new Set();
    for (let i = 0; i < left.length; i++){ const d = left[i]; if (tried.has(d)) continue; tried.add(d);
      for (const m of movesFor(state, s, d)){ any = true; const ns = applyMove(state, s, m); rec(ns, left.slice(0, i).concat(left.slice(i + 1)), seq.concat([{ ...m, hit: ns.hit }])); } }
    if (!any){ const key = seq.map(m => `${m.from}>${m.to}`).join(','); if (!seen.has(key)){ seen.add(key); res.push({ seq, end: state }); } }
  };
  rec(st, dice, []);
  const max = Math.max(0, ...res.map(r => r.seq.length));
  let keep = res.filter(r => r.seq.length === max);
  if (max === 1 && dice.length === 2 && dice[0] !== dice[1]){ const big = Math.max(...dice); if (keep.some(r => r.seq[0].d === big)) keep = keep.filter(r => r.seq[0].d === big); }
  return max ? keep : [];
}
function pipCount(st, s){ let n = st.bar[sideIdx(s)] * 25; for (let p = 1; p <= 24; p++) if (st.pts[p]*s > 0) n += st.pts[p]*s * (s === 1 ? p : 25 - p); return n; }
function evalPos(st, s){
  let v = (pipCount(st, -s) - pipCount(st, s)) * .12 + st.off[sideIdx(s)] * 3 + st.bar[sideIdx(-s)] * 7 - st.bar[sideIdx(s)] * 6;
  for (let p = 1; p <= 24; p++){ const c = st.pts[p]*s; const myHome = s === 1 ? p <= 6 : p >= 19;
    if (c >= 2) v += myHome ? 3 : 1.6;
    if (c === 1){ // a blot: how exposed is it to pieces behind it
      let danger = 0; for (let q = 1; q <= 24; q++){ if (st.pts[q]*s < 0){ const dist = s === 1 ? p - q : q - p; if (dist < 0 && -dist <= 11) danger += -dist <= 6 ? 2 : 1; } } if (st.bar[sideIdx(-s)]) danger += 2;
      v -= danger * (myHome ? 1.4 : 1); }
  }
  return v;
}
// ---------- UI ----------
const twCv = $('twCanvas'), twG = twCv.getContext('2d');
let twGeom = null;
function twLayout(){
  const W = Math.min(760, innerWidth - 52), H = Math.round(Math.min(W * .6, innerHeight - (innerHeight < 520 ? 118 : 200))), dpr = Math.min(2, devicePixelRatio || 1);
  twCv.width = W*dpr; twCv.height = H*dpr; twCv.style.width = W + 'px'; twCv.style.height = H + 'px'; twG.setTransform(dpr, 0, 0, dpr, 0, 0);
  const off = W*.08, bar = W*.06, pw = (W - off - bar - 16) / 12; twGeom = { W, H, off, bar, pw, x0: 8, r: Math.min(pw*.46, H*.045) };
}
// screen position of point p (1..24): bottom row right→left is 1..12, top row left→right is 13..24
function ptX(p){ const g = twGeom; const i = p <= 12 ? 12 - p : p - 13; return g.x0 + i*g.pw + (i >= 6 ? g.bar : 0) + g.pw/2; }
const ptTop = p => p > 12;
function drawTawla(){
  if (!twGeom) twLayout(); const g = twGeom, c = twG, { W, H } = g;
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#5a3418'; c.fillRect(0, 0, W, H); c.fillStyle = '#e8d2a8'; c.fillRect(g.x0, 8, W - g.off - 16, H - 16);
  const bx = g.x0 + 6*g.pw; c.fillStyle = '#4a2a12'; c.fillRect(bx, 0, g.bar, H);
  c.fillStyle = '#3a2210'; c.fillRect(W - g.off, 0, g.off, H);
  const legal = new Set(), dests = new Set();
  if (TW.turn === 1 && !TW.over && !TW.busy){ for (const r of TW.seqs){ const m = r.seq[0]; legal.add(String(m.from)); if (TW.sel !== null && String(m.from) === String(TW.sel)) dests.add(m.to); } }
  for (let p = 1; p <= 24; p++){
    const x = ptX(p), top = ptTop(p), y0 = top ? 8 : H - 8, y1 = top ? H*.44 : H*.56;
    c.fillStyle = p % 2 ? '#9c2f1f' : '#2f4a3a'; if (dests.has(p)) c.fillStyle = '#e0a21a';
    c.beginPath(); c.moveTo(x - g.pw/2 + 1, y0); c.lineTo(x + g.pw/2 - 1, y0); c.lineTo(x, y1); c.closePath(); c.fill();
    const n = Math.abs(TW.pts[p]); if (!n) continue; const mine = TW.pts[p] > 0;
    for (let k = 0; k < Math.min(n, 5); k++){ const y = top ? 8 + g.r + k*g.r*2 : H - 8 - g.r - k*g.r*2; twPiece(x, y, mine, String(TW.sel) === String(p) && k === Math.min(n, 5) - 1, legal.has(String(p)) && k === Math.min(n, 5) - 1); }
    if (n > 5){ const y = top ? 8 + g.r + 4*g.r*2 : H - 8 - g.r - 4*g.r*2; c.fillStyle = mine ? '#222' : '#fff'; c.font = `900 ${g.r}px Cairo, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n, x, y + 1); }
  }
  // bar
  for (let k = 0; k < TW.bar[0]; k++) twPiece(bx + g.bar/2, H*.62 + k*g.r*1.6, true, TW.sel === 'bar', legal.has('bar'));
  for (let k = 0; k < TW.bar[1]; k++) twPiece(bx + g.bar/2, H*.38 - k*g.r*1.6, false);
  // borne off
  c.fillStyle = dests.has(0) ? '#e0a21a' : '#2a1a0c'; c.fillRect(W - g.off + 4, H*.52, g.off - 8, H*.46);
  c.fillStyle = '#2a1a0c'; c.fillRect(W - g.off + 4, 8, g.off - 8, H*.4);
  for (let k = 0; k < TW.off[0]; k++){ c.fillStyle = '#f4efe2'; c.fillRect(W - g.off + 8, H - 12 - k*(H*.42/15), g.off - 16, H*.42/15 - 1); }
  for (let k = 0; k < TW.off[1]; k++){ c.fillStyle = '#1b1b1b'; c.fillRect(W - g.off + 8, 10 + k*(H*.38/15), g.off - 16, H*.38/15 - 1); }
  c.fillStyle = '#ffe9b0'; c.font = `800 ${Math.max(10, g.off*.2)}px Cairo, sans-serif`; c.textAlign = 'center'; c.fillText('برا', W - g.off/2, H*.5);
  // dice
  const dx = TW.turn === 1 ? g.x0 + 9*g.pw + g.bar : g.x0 + 3*g.pw, ds = Math.min(g.pw*.8, 34);
  TW.dice.forEach((d, i) => twDie(dx - ds*.7 + i*ds*1.4 - (TW.dice.length > 2 ? ds*1.4 : 0), H/2, ds, d, TW.turn === 1 ? '#fff' : '#222'));
}
function twPiece(x, y, mine, sel, can){
  const c = twG, r = twGeom.r, gr = c.createRadialGradient(x - r*.35, y - r*.35, r*.1, x, y, r);
  gr.addColorStop(0, mine ? '#ffffff' : '#555'); gr.addColorStop(1, mine ? '#cfc5ae' : '#111'); c.fillStyle = gr;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill(); c.lineWidth = sel ? 4 : can ? 2.5 : 1.2; c.strokeStyle = sel ? '#e0a21a' : can ? '#3cc870' : 'rgba(0,0,0,.5)'; c.stroke();
}
function twDie(x, y, s, n, col){
  const c = twG; c.fillStyle = col; c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.roundRect(x - s/2, y - s/2, s, s, s*.18); c.fill(); c.stroke();
  c.fillStyle = col === '#fff' ? '#111' : '#fff'; const P = { 1: [[0,0]], 2: [[-1,-1],[1,1]], 3: [[-1,-1],[0,0],[1,1]], 4: [[-1,-1],[1,-1],[-1,1],[1,1]], 5: [[-1,-1],[1,-1],[0,0],[-1,1],[1,1]], 6: [[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]] }[n] || [];
  for (const [a, b] of P){ c.beginPath(); c.arc(x + a*s*.25, y + b*s*.25, s*.08, 0, Math.PI*2); c.fill(); }
}
function twHit(px, py){
  const g = twGeom; if (px > g.W - g.off) return py > g.H*.5 ? 0 : null;
  const bx = g.x0 + 6*g.pw; if (px >= bx && px <= bx + g.bar) return 'bar';
  let i = Math.floor((px - g.x0 - (px > bx + g.bar ? g.bar : 0)) / g.pw); i = clamp(i, 0, 11);
  return py < g.H/2 ? 13 + i : 12 - i;
}
twCv.addEventListener('pointerdown', e => {
  if (TW.turn !== 1 || TW.over || TW.busy || !TW.seqs.length) return;
  const r = twCv.getBoundingClientRect(), hit = twHit(e.clientX - r.left, e.clientY - r.top); if (hit === null) return;
  if (TW.sel !== null){ const m = TW.seqs.map(s => s.seq[0]).find(m => String(m.from) === String(TW.sel) && m.to === hit); if (m){ twPlayerMove(m); return; } }
  const can = TW.seqs.some(s => String(s.seq[0].from) === String(hit)); TW.sel = can ? hit : null; if (!can && TW.bar[0]) twMsg('لازم تدخّل الحجر اللي على البار الأول'); drawTawla();
});
function twMsg(t){ $('twMsg').textContent = t; }
function twState(){ return { pts: TW.pts, bar: TW.bar, off: TW.off }; }
function twSet(st){ TW.pts = st.pts; TW.bar = st.bar; TW.off = st.off; }
function twRoll(){
  if (TW.over || TW.busy || TW.dice.length) return;
  const a = 1 + Math.floor(Math.random()*6), b = 1 + Math.floor(Math.random()*6); TW.dice = a === b ? [a, a, a, a] : [a, b];
  noise(.15, 3000, .4); tone(300, 200, .05, 'square', .06, .08);
  TW.seqs = sequences(twState(), TW.turn, TW.dice);
  const who = TW.turn === 1 ? heroName : 'عم رجب'; const nm = rollName(a, b);
  if (!TW.seqs.length){ twMsg(`${who}: ${nm}… مفيش لعب`); drawTawla(); TW.busy = true; setTimeout(() => { TW.busy = false; twEndTurn(); }, 1300); return; }
  twMsg(TW.turn === 1 ? `${nm}! اختار حجر وحرّكه (الحجارة اللي ليها لعب عليها دايرة خضرا)` : `عم رجب: «${nm}!»`); if (Math.random() < .5) speak(nm);
  drawTawla(); twButtons();
  if (TW.turn === -1) twAi();
}
function twPlayerMove(m){
  const st = applyMove(twState(), 1, m); twSet(st); tone(500, 380, .05, 'triangle', .12);
  if (m.hit){ twMsg('ضربت حجر عم رجب!'); thwack(); }
  TW.seqs = TW.seqs.filter(s => String(s.seq[0].from) === String(m.from) && s.seq[0].to === m.to).map(s => ({ seq: s.seq.slice(1), end: s.end })).filter(s => s.seq.length);
  TW.dice.splice(TW.dice.indexOf(m.d), 1); TW.sel = null;
  if (TW.off[0] >= 15) return twWin(1);
  if (!TW.seqs.length){ drawTawla(); TW.busy = true; setTimeout(() => { TW.busy = false; twEndTurn(); }, 500); return; }
  drawTawla();
}
function twAi(){
  let best = null, bv = -1e9; for (const r of TW.seqs){ const v = evalPos(r.end, -1) + Math.random()*.6; if (v > bv){ bv = v; best = r; } }
  const seq = best.seq.slice(); TW.busy = true;
  const step = () => { if (TW.over) return; const m = seq.shift(); if (!m){ TW.busy = false; if (TW.off[1] >= 15) return twWin(-1); return twEndTurn(); }
    twSet(applyMove(twState(), -1, m)); TW.dice.splice(TW.dice.indexOf(m.d), 1); tone(420, 300, .05, 'triangle', .1);
    if (m.hit){ twMsg('عم رجب ضرب حجرك! «معلش يا ابني»'); thwack(); }
    drawTawla(); if (TW.off[1] >= 15){ TW.busy = false; return twWin(-1); } setTimeout(step, 620); };
  setTimeout(step, 900);
}
function twEndTurn(){ TW.dice = []; TW.seqs = []; TW.sel = null; TW.turn = -TW.turn; drawTawla(); twButtons(); if (TW.turn === -1){ twMsg('دور عم رجب…'); setTimeout(twRoll, 700); } else twMsg('دورك… ارمي الزهر'); }
function twWin(s){
  TW.over = true; const loserOff = TW.off[sideIdx(-s)], pts = loserOff === 0 ? 2 : 1; TW.score[sideIdx(s)] += pts;
  const mars = pts === 2 ? ' (مارس! نقطتين)' : '';
  if (TW.score[0] >= TW.target || TW.score[1] >= TW.target){ TW.matchOver = true; const w = TW.score[0] > TW.score[1];
    let bet = ''; if (modeObj.onDomino && modeId === 'story'){ const b = Math.min(modeObj.domBet || 20, Math.max(0, Math.floor(hero.money))); hero.money += w ? b : -b; bet = w ? ` · +${b} جنيه` : ` · -${b} جنيه`; saveStory(); }
    if (w){ stat('tawlaWin'); coin(); }
    twMsg(`${w ? 'كسبت العشرة' : 'عم رجب كسب العشرة'} ${TW.score[0]}–${TW.score[1]}${mars}${bet}`); speak(w ? 'ماشي يا ابني… إيدك خفيفة' : 'اتعلم يا ابني');
  } else twMsg(`${s === 1 ? 'كسبت الدور' : 'عم رجب كسب الدور'}${mars} · ${TW.score[0]}–${TW.score[1]}`);
  drawTawla(); twButtons();
}
function twButtons(){
  $('twRoll').hidden = !(TW.turn === 1 && !TW.over && !TW.dice.length);
  $('twAgain').hidden = !TW.over; $('twAgain').textContent = TW.matchOver ? 'عشرة جديدة' : 'دور جديد';
  $('twScore').textContent = AR(`${heroName} ${TW.score[0]} · عم رجب ${TW.score[1]} (لـ ٣)`);
}
function openTawla(){
  hero.locked = true; $('tawla').hidden = false; document.body.classList.add('in-domino');
  if (TW.matchOver){ TW.score = [0, 0]; TW.matchOver = false; twStartGame(); } else { twLayout(); drawTawla(); twButtons(); }
}
function twStartGame(){
  twNewGame(); twLayout();
  // opening roll: each rolls one die, the higher starts
  let a, b; do { a = 1 + Math.floor(Math.random()*6); b = 1 + Math.floor(Math.random()*6); } while (a === b);
  TW.turn = a > b ? 1 : -1; twMsg(`${heroName} رمى ${DIE_N[a]} وعم رجب ${DIE_N[b]}… ${TW.turn === 1 ? 'انت تبدأ!' : 'عم رجب يبدأ'}`);
  drawTawla(); twButtons(); if (TW.turn === -1) setTimeout(twRoll, 1200);
}
function closeTawla(){ $('tawla').hidden = true; hero.locked = false; document.body.classList.remove('in-domino'); }
$('twRoll').onclick = twRoll; $('twExit').onclick = closeTawla;
$('twAgain').onclick = () => { if (TW.matchOver){ TW.score = [0, 0]; TW.matchOver = false; } twStartGame(); };
addEventListener('resize', () => { if (!$('tawla').hidden){ twLayout(); drawTawla(); } });
// the board on a café table
{ const p = []; box(p, .9, .06, .6, TAWLA_SPOT.x, 1.0, TAWLA_SPOT.z, '#7a4a22'); box(p, .86, .02, .56, TAWLA_SPOT.x, 1.035, TAWLA_SPOT.z, '#e8d2a8'); box(p, .04, .03, .6, TAWLA_SPOT.x, 1.04, TAWLA_SPOT.z, '#4a2a12');
  for (let i = 0; i < 6; i++){ box(p, .06, .025, .06, TAWLA_SPOT.x - .35 + i*.05, 1.05, TAWLA_SPOT.z - .2, '#f4efe2'); box(p, .06, .025, .06, TAWLA_SPOT.x + .1 + i*.05, 1.05, TAWLA_SPOT.z + .2, '#1b1b1b'); }
  const m = new THREE.Mesh(mergeGeometries(p), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 })); scene.add(m); }
