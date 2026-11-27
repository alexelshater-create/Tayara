// ================= domino (Egyptian rules: 1v1 and 2v2) =================
// 1v1: 7 tiles each, 14 in the boneyard (الكومة): draw until you can play. 2v2: 7 each, no boneyard, partners sit opposite.
// The match is to 250. The side that goes out takes the pips left in the losing side's hands, rounded to the nearest 10,
// and a 5 goes down: 25 → 20, 26 → 30, 1–5 → 0.
// Who opens: the first hand (and after a redeal or a tied قفلة) the holder of الدش (6-6) opens with it. After that the winner of
// the last hand opens with any tile.
// Redeal: anyone dealt 5 doubles, or 6 tiles of one number.
// باب = how many tiles of one number you hold. مسبعين = a side holds all 7 of a number. Both are shown only; no points.
// قفلة (blocked game): the side with fewer pips takes the other side's pips (rounded); a tie scores nothing.
// Cheating, and catching cheats, is only in the optional fun mode («غش للهزار»).
const NUMN = ['أبيض','يك','دو','سيه','جوهار','بانج','شيش'];
const DBL = ['البلاطة','الهبياك','الدوبارة','الدوسة','الدورجي','الدبش','الدش'];
const tName = t => t[0] === t[1] ? DBL[t[0]] : `${NUMN[Math.max(t[0],t[1])]} ${NUMN[Math.min(t[0],t[1])]}`;
const pipsOf = arr => arr.reduce((s,t) => s + t[0] + t[1], 0);
const sameT = (a,b) => (a[0]===b[0] && a[1]===b[1]) || (a[0]===b[1] && a[1]===b[0]);
const touches = (t, v) => t[0] === v || t[1] === v;
const ALL_TILES = []; for (let a=0;a<=6;a++) for (let b=a;b<=6;b++) ALL_TILES.push([a,b]);
const round10 = x => { const r = x % 10; return r <= 5 ? x - r : x + 10 - r; };   // 25 → 20, 26 → 30
const babCounts = h => [0,1,2,3,4,5,6].map(v => h.filter(t => touches(t, v)).length);
const DOM = { mode: null, seats: [], hands: [], dealt: [], bone: [], board: [], start: 0, L: null, R: null, turn: 0, sel: null, selCheat: false, score: [0,0], target: 250, over: true, matchOver: true, mustStart: null, lastWinner: null, weak: [], cheats: [], accused: false, lastSide: 'R', endBy: { L: -1, R: -1 }, aiTimer: null,
  diff: ['easy','normal','hard'].includes(store.get('ty_dom_diff')) ? store.get('ty_dom_diff') : 'normal', cheat: store.get('ty_dom_cheat') === '1' };
const PIPS = { 0:[], 1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8] };
const tileHTML = (t, cls='', attrs='') => `<span class="tile ${t[0]===t[1] ? 'dbl' : ''} ${cls}" ${attrs}>${[t[0],t[1]].map(v => `<span class="half">${[...Array(9)].map((_,i) => PIPS[v].includes(i) ? '<i class="pip"></i>' : '<i></i>').join('')}</span>`).join('')}</span>`;
const teamOf = s => s % 2;          // seat 0 (you) and 2 (partner) are team 0
const isMe = s => s === 0;
const NS = () => DOM.seats.length;
const hand = s => DOM.hands[s];
const teamName = tm => DOM.mode === '1v1' ? (tm === 0 ? heroName : 'الحاج كامل') : (tm === 0 ? 'إحنا' : 'هما');
// a match belongs to where it was started: a half-played game from the Games menu must not continue inside a story mission (with a bet)
const domCtx = () => modeId + (modeId === 'story' ? ':' + SAVE.m : '');
// the story's first domino game goes to 101, not 250 (a full match took 10–20 minutes in chapter one)
const domTarget = () => modeId === 'story' ? 101 : 250;
function openDomino(){
  if (!DOM.matchOver && DOM.ctx !== domCtx()){ DOM.matchOver = true; DOM.over = true; clearTimeout(DOM.aiTimer); }
  hero.locked = true; $('domino').hidden = false; document.body.classList.add('in-domino');
  if (DOM.matchOver){ $('dPick').hidden = false; $('dGame').hidden = true; renderDomOpts(); $('dScore').textContent = modeObj.domBet ? `الرهان ${Math.min(modeObj.domBet, Math.floor(hero.money))} جنيه` : ''; $('dScore').textContent = AR($('dScore').textContent); }
  else { $('dPick').hidden = true; $('dGame').hidden = false; renderDomino(); if (!DOM.over && !isMe(DOM.turn)) scheduleAI(); }
}
function closeDomino(){ $('domino').hidden = true; hero.locked = false; document.body.classList.remove('in-domino'); clearTimeout(DOM.aiTimer); }
$('dExit').onclick = closeDomino;
document.querySelectorAll('[data-dm]').forEach(b => b.onclick = () => newDominoMatch(b.dataset.dm));
$('dAgain').onclick = () => { if (DOM.matchOver){ $('dPick').hidden = false; $('dGame').hidden = true; renderDomOpts(); } else newDominoRound(); };
// match options: how good the others play, and the fun cheating mode
function renderDomOpts(){
  document.querySelectorAll('.dmode span').forEach(s => { s.textContent = s.textContent.replace(/لـ [٠-٩0-9]+$/, 'لـ ' + AR(domTarget())); });
  document.querySelectorAll('[data-dd]').forEach(b => b.classList.toggle('on', b.dataset.dd === DOM.diff));
  $('dCheatMode').classList.toggle('on', DOM.cheat); $('dCheatMode').textContent = DOM.cheat ? 'الغش شغال (للهزار)' : 'من غير غش';
}
document.querySelectorAll('[data-dd]').forEach(b => b.onclick = () => { DOM.diff = b.dataset.dd; store.set('ty_dom_diff', DOM.diff); renderDomOpts(); });
$('dCheatMode').onclick = () => { DOM.cheat = !DOM.cheat; store.set('ty_dom_cheat', DOM.cheat ? '1' : '0'); renderDomOpts(); };
function newDominoMatch(mode){
  DOM.mode = mode; DOM.ctx = domCtx(); DOM.score = [0,0]; DOM.matchOver = false; DOM.lastWinner = null; DOM.target = domTarget();
  DOM.seats = mode === '1v1'
    ? [{ name: heroName, face: CH.hero.img.face }, { name: 'الحاج كامل', face: null }]
    : [{ name: heroName, face: CH.hero.img.face }, { name: 'شمس', face: CH.wanted.img.face }, { name: 'إسلام', face: CH.islam.img.face }, { name: 'العربي', face: CH.enemy.img.face }];
  $('dPick').hidden = true; $('dGame').hidden = false; document.querySelector('.seats').classList.toggle('four', mode === '2v2');
  newDominoRound();
}
// deal; deal again while anyone has 5 doubles or 6 of one number
function dealDomino(){
  for (let tries = 0; tries < 50; tries++){
    const all = ALL_TILES.map(t => [...t]);
    for (let i=all.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [all[i],all[j]] = [all[j],all[i]]; }
    const hands = []; for (let s=0;s<NS();s++) hands.push(all.slice(s*7, s*7+7));
    const bad = hands.findIndex(h => h.filter(t => t[0] === t[1]).length >= 5 || Math.max(...babCounts(h)) >= 6);
    if (bad < 0 || tries === 49) return { hands, bone: all.slice(NS()*7), redeals: tries };
  }
}
function newDominoRound(){
  clearTimeout(DOM.aiTimer);
  const d = dealDomino();
  DOM.hands = d.hands; DOM.bone = d.bone; DOM.dealt = d.hands.map(h => h.map(t => [...t]));
  DOM.hands[0].sort((a,b) => (b[0]+b[1]) - (a[0]+a[1]));
  Object.assign(DOM, { board: [], start: 0, L: null, R: null, sel: null, selCheat: false, over: false, weak: DOM.seats.map(() => []), cheats: [], accused: false, mustStart: null, endBy: { L: -1, R: -1 } });
  if (d.redeals) DOM.lastWinner = null;          // after a redeal الدش opens again
  let who, msg;
  if (DOM.lastWinner !== null){ who = DOM.lastWinner; msg = isMe(who) ? 'كسبت الدور اللي فات… ابدأ بأي حجر' : `${DOM.seats[who].name} كسب الدور اللي فات… هو اللي هيبدأ`; }
  else {
    // الدش; if it is in the boneyard (1v1), the highest double; no double at all: the heaviest tile
    let st = null;
    for (let dd=6; dd>=0 && !st; dd--) for (let s=0; s<NS() && !st; s++) if (hand(s).some(t => t[0]===dd && t[1]===dd)) st = { s, t: [dd,dd] };
    if (!st){ let best = null; for (let s=0;s<NS();s++) for (const t of hand(s)) if (!best || t[0]+t[1] > best.t[0]+best.t[1]) best = { s, t }; st = best; }
    who = st.s; DOM.mustStart = st.t; msg = isMe(who) ? `معاك ${tName(st.t)}… ابدأ بيه` : `${DOM.seats[who].name} معاه ${tName(st.t)}… هو اللي هيبدأ`;
  }
  if (d.redeals) msg = `اتفرّقت تاني ${d.redeals === 1 ? '' : d.redeals + ' مرات '}(حد كان معاه ٥ دبش أو ٦ من باب) · ` + msg;
  DOM.turn = who; dMsg(msg); renderDomino(); if (!isMe(who)) scheduleAI(1400);
}
function fits(t){ if (!DOM.board.length) return !DOM.mustStart || sameT(t, DOM.mustStart); return touches(t, DOM.L) || touches(t, DOM.R); }
function placeTile(t, side, cheat){
  if (!DOM.board.length){ DOM.board.push([t[0],t[1]]); DOM.start = 0; DOM.L = t[0]; DOM.R = t[1]; return 'R'; }
  let o;
  if (side === 'L'){ if (t[1]===DOM.L) o = [t[0],t[1]]; else if (t[0]===DOM.L) o = [t[1],t[0]]; else if (cheat) o = [t[0],t[1]]; else return null; DOM.board.unshift(o); DOM.start++; DOM.L = o[0]; return 'L'; }
  if (t[0]===DOM.R) o = [t[0],t[1]]; else if (t[1]===DOM.R) o = [t[1],t[0]]; else if (cheat) o = [t[0],t[1]]; else return null; DOM.board.push(o); DOM.R = o[1]; return 'R';
}
function unplace(side, prev){ if (side === 'L'){ DOM.board.shift(); DOM.start--; } else DOM.board.pop(); DOM.L = prev.L; DOM.R = prev.R; }
// blocked when every tile with either end number is already on the table (visible to everyone)
const endsBlocked = (L, R, board) => ALL_TILES.filter(t => touches(t, L) || touches(t, R)).every(t => board.some(b => sameT(b, t)));
function isBlocked(){ return DOM.board.length > 0 && endsBlocked(DOM.L, DOM.R, DOM.board); }
function dMsg(t){ $('dMsg').textContent = AR(t); }
function nextTurn(){ DOM.turn = (DOM.turn + 1) % NS(); DOM.sel = null; DOM.selCheat = false; renderDomino(); if (!isMe(DOM.turn) && !DOM.over) scheduleAI(); }
// a person thinks a bit longer when there is more to choose from
function scheduleAI(ms){
  clearTimeout(DOM.aiTimer);
  if (ms === undefined){ const n = DOM.over ? 0 : aiLegal(DOM.turn).length, c = DOM_AI[DOM.diff]; ms = c.think[0] + Math.min(1, Math.max(0, n - 1) / 4) * (c.think[1] - c.think[0]) + Math.random() * 350; }
  DOM.aiTimer = setTimeout(aiTurn, ms);
}
// باب: the numbers you hold 3 or more of
function babText(h){
  const c = babCounts(h).map((n, v) => ({ n, v })).filter(x => x.n >= 3).sort((a, b) => b.n - a.n);
  return c.length ? 'بابك: ' + c.map(x => `${NUMN[x.v]} <b>${x.n}</b>`).join(' · ') : '';
}

// ---------- rendering ----------
function renderDomino(){
  const [a, b] = DOM.score;
  $('dScore').textContent = `${teamName(0)} ${a} — ${b} ${teamName(1)} · لـ ${DOM.target}${modeObj.domBet ? ' · الرهان ' + Math.min(modeObj.domBet, Math.floor(hero.money)) + ' ج' : ''}`; $('dScore').textContent = AR($('dScore').textContent);
  for (const s of [1,2,3]){
    const el = $('seat' + s); const seat = DOM.mode === '1v1' ? (s === 2 ? 1 : null) : s;
    if (seat === null || !DOM.seats[seat]){ el.hidden = true; continue; }
    el.hidden = false; const p = DOM.seats[seat];
    el.className = `seat ${s === 2 ? 'top' : s === 1 ? 'left' : 'right'} ${teamOf(seat) === 0 ? 'mate' : 'opp'} ${DOM.turn === seat && !DOM.over ? 'active' : ''}`;
    el.innerHTML = `${p.face ? `<img src="${p.face}" alt="">` : '<span class="noface"></span>'}<span class="sn">${p.name}${teamOf(seat) === 0 && seat !== 0 ? ' (معاك)' : ''}</span><span class="sc">${hand(seat).length}</span>${DOM.over ? `<span class="reveal">${hand(seat).map(t => tileHTML(t, 'mini')).join('')}</span>` : ''}`;
  }
  drawBoard();
  const myTurn = isMe(DOM.turn) && !DOM.over;
  $('dHand').innerHTML = hand(0).map((t,i) => `<div class="hwrap">${tileHTML(t, (myTurn ? (fits(t) ? 'ok' : 'no') : 'no') + (DOM.sel === i ? ' sel' : ''), `data-i="${i}"`)}<small>${tName(t)}</small></div>`).join('');
  $('dHand').querySelectorAll('.tile').forEach(el => el.onclick = () => playerPick(+el.dataset.i));
  const canPlay = hand(0).some(fits), started = DOM.board.length > 0;
  $('dDraw').hidden = !(myTurn && started && !canPlay && DOM.bone.length && DOM.mode === '1v1');
  $('dPass').hidden = !(myTurn && started && ((!canPlay && (!DOM.bone.length || DOM.mode === '2v2')) || DOM.cheat));
  $('dCheat').hidden = !(DOM.cheat && myTurn && DOM.board.length > 1 && !DOM.accused);
  $('dBab').innerHTML = babText(hand(0));
  const showSides = DOM.sel !== null;
  $('dLeft').hidden = $('dRight').hidden = !showSides; $('dCancel').hidden = !showSides;
  if (showSides){ $('dLeft').textContent = `على الـ ${NUMN[DOM.L]}`; $('dRight').textContent = `على الـ ${NUMN[DOM.R]}`; }
  $('dAgain').hidden = !DOM.over; $('dAgain').textContent = DOM.matchOver ? 'ماتش جديد' : 'دور جديد';
}
// board drawn on a canvas as a real snake: it turns at the edges, doubles lie crosswise
function drawBoard(){
  const cv = $('dCanvas'), box = cv.parentElement.getBoundingClientRect();
  const W = Math.max(260, box.width), H = cv.clientHeight || 220, dpr = Math.min(devicePixelRatio || 1, 2);
  if (cv.width !== Math.round(W*dpr) || cv.height !== Math.round(H*dpr)){ cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  const gr = g.createRadialGradient(W/2,H/2,20,W/2,H/2,W*.7); gr.addColorStop(0,'#2a6b3f'); gr.addColorStop(1,'#163d25'); g.fillStyle = gr; g.fillRect(0,0,W,H);
  if (!DOM.board.length){ g.fillStyle = 'rgba(230,255,235,.6)'; g.font = '700 16px Cairo, sans-serif'; g.textAlign = 'center'; g.direction = 'rtl'; g.fillText('الترابيزة فاضية', W/2, H/2); return; }
  const padX = DOM.mode === '2v2' ? 86 : 18, padY = 14;
  let u = 22, rects;
  for (; u >= 7; u -= 1){ rects = layoutSnake(u, padX, W - padX); const bb = bbox(rects); if (bb.h <= H - padY*2 && bb.minX >= 4 && bb.maxX <= W - 4) break; }
  const bb = bbox(rects); const oy = (H - bb.h)/2 - bb.minY, ox = 0;
  for (const r of rects) drawTile(g, r.x+ox, r.y+oy, r.w, r.h, r.vals, r.dir, u, r.end);
}
function bbox(rs){ let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9; for (const r of rs){ minX=Math.min(minX,r.x); minY=Math.min(minY,r.y); maxX=Math.max(maxX,r.x+r.w); maxY=Math.max(maxY,r.y+r.h); } return { minX, minY, maxX, maxY, h: maxY-minY }; }
function layoutSnake(u, minX, maxX){
  const out = [], cx = (minX + maxX)/2, cy = 0;
  const st = DOM.board[DOM.start], sd = st[0] === st[1];
  const s = sd ? { x: cx - u/2, y: cy - u, w: u, h: 2*u } : { x: cx - u, y: cy - u/2, w: 2*u, h: u };
  out.push({ ...s, vals: [st[0], st[1]], dir: 'R', end: DOM.board.length === 1 });
  const arm = (tiles, dirs, p0, last0) => {
    let k = 0, p = { ...p0 }, last = last0;
    tiles.forEach((t, i) => {
      const dbl = t[0] === t[1]; const along = dbl ? u : 2*u, across = dbl ? 2*u : u;
      let d = dirs[k % dirs.length];
      if ((d === 'R' && p.x + along > maxX) || (d === 'L' && p.x - along < minX)){
        const vert = dirs[(k+1) % dirs.length];
        p = { x: d === 'R' ? last.x + last.w - u/2 : last.x + u/2, y: vert === 'D' ? last.y + last.h : last.y };
        k++; d = vert;
      }
      let r;
      if (d === 'R') r = { x: p.x, y: p.y - across/2, w: along, h: across };
      else if (d === 'L') r = { x: p.x - along, y: p.y - across/2, w: along, h: across };
      else if (d === 'D') r = { x: p.x - across/2, y: p.y, w: across, h: along };
      else r = { x: p.x - across/2, y: p.y - along, w: across, h: along };
      out.push({ ...r, vals: t, dir: d, end: i === tiles.length - 1 });
      if (d === 'R') p = { x: r.x + r.w, y: p.y }; else if (d === 'L') p = { x: r.x, y: p.y };
      else { const nh = dirs[(k+1) % dirs.length]; p = { x: nh === 'L' ? r.x : r.x + r.w, y: d === 'D' ? r.y + r.h - u/2 : r.y + u/2 }; k++; }
      last = r;
    });
  };
  const right = DOM.board.slice(DOM.start + 1).map(t => [t[0], t[1]]);
  const left = DOM.board.slice(0, DOM.start).reverse().map(t => [t[1], t[0]]);
  arm(right, ['R','D','L','D'], { x: s.x + s.w, y: cy }, s);
  arm(left, ['L','U','R','U'], { x: s.x, y: cy }, s);
  return out;
}
function drawTile(g, x, y, w, h, vals, dir, u, end){
  const rr = Math.max(3, u*.22);
  g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = u*.35; g.shadowOffsetY = u*.12;
  g.fillStyle = '#f7f2e6'; g.beginPath(); g.roundRect(x+.5, y+.5, w-1, h-1, rr); g.fill(); g.restore();
  g.strokeStyle = end ? '#ffd34d' : '#bdb39d'; g.lineWidth = end ? 2.2 : 1; g.beginPath(); g.roundRect(x+.5, y+.5, w-1, h-1, rr); g.stroke();
  const horizontalTile = w > h;
  // which half touches the previous tile
  let first = vals[0], second = vals[1];
  const halves = horizontalTile ? [[x, y, w/2, h], [x + w/2, y, w/2, h]] : [[x, y, w, h/2], [x, y + h/2, w, h/2]];
  let order = [first, second];
  if (dir === 'L' && horizontalTile) order = [second, first];
  if (dir === 'U' && !horizontalTile) order = [second, first];
  g.strokeStyle = '#3a3a3a'; g.lineWidth = Math.max(1, u*.06); g.beginPath();
  if (horizontalTile){ g.moveTo(x + w/2, y + h*.18); g.lineTo(x + w/2, y + h*.82); } else { g.moveTo(x + w*.18, y + h/2); g.lineTo(x + w*.82, y + h/2); }
  g.stroke();
  halves.forEach(([hx, hy, hw, hh], i) => {
    const v = order[i]; const pr = Math.max(1.3, u*.1);
    g.fillStyle = '#151515';
    for (const idx of PIPS[v]){ const cxp = hx + hw*(.22 + (idx%3)*.28), cyp = hy + hh*(.22 + Math.floor(idx/3)*.28); g.beginPath(); g.arc(cxp, cyp, pr, 0, 7); g.fill(); }
  });
}

// ---------- you ----------
function playerPick(i){
  if (!isMe(DOM.turn) || DOM.over) return;
  const t = hand(0)[i]; DOM.sel = null; DOM.selCheat = false;
  if (!fits(t)){
    if (!DOM.board.length){ dMsg(`لازم تبدأ بـ ${tName(DOM.mustStart)}`); return renderDomino(); }
    if (!DOM.cheat){ dMsg(`${tName(t)} مش راكب على الـ${NUMN[DOM.L]} ولا الـ${NUMN[DOM.R]}`); return renderDomino(); }
    DOM.sel = i; DOM.selCheat = true; dMsg(`${tName(t)} مش راكب… لو نزلته يبقى غش`); return renderDomino();
  }
  if (!DOM.board.length) return commitPlayer(i, 'R');
  const l = touches(t, DOM.L), r = touches(t, DOM.R);
  if (l && r && DOM.L !== DOM.R){ DOM.sel = i; dMsg('تحطه فين؟'); return renderDomino(); }
  commitPlayer(i, l ? 'L' : 'R');
}
$('dLeft').onclick = () => { if (DOM.sel !== null) commitPlayer(DOM.sel, 'L', DOM.selCheat); };
$('dRight').onclick = () => { if (DOM.sel !== null) commitPlayer(DOM.sel, 'R', DOM.selCheat); };
$('dCancel').onclick = () => { DOM.sel = null; DOM.selCheat = false; dMsg('دورك'); renderDomino(); };
function commitPlayer(i, side, cheat=false){
  const t = hand(0)[i], prev = { L: DOM.L, R: DOM.R }, first = !DOM.board.length;
  const s = placeTile(t, side, cheat); if (!s) return;
  hand(0).splice(i,1); DOM.sel = null; DOM.selCheat = false; DOM.lastSide = s; DOM.cheats = []; DOM.accused = false;
  if (first) DOM.endBy = { L: 0, R: 0 }; else DOM.endBy[s] = 0;
  tileClack(); buzz(10);
  if (cheat){
    if (Math.random() < .6){ unplace(s, prev); hand(0).splice(i, 0, t); DOM.score[1] += 50; tone(300,150,.4,'sawtooth',.1); buzz(60); dMsg(`اتمسكت بتغش! +٥٠ لـ ${teamName(1)}`); speak('بتغش؟'); renderDomino(); checkMatch(); return; }
    dMsg(`نزّلت ${tName(t)} غش… محدش خد باله`);
  } else dMsg(`نزّلت ${tName(t)}`);
  afterPlay(0);
}
$('dDraw').onclick = () => {
  if (!isMe(DOM.turn) || !DOM.bone.length) return;
  DOM.weak[0] = [...new Set([...DOM.weak[0], DOM.L, DOM.R])];
  const t = DOM.bone.pop(); hand(0).push(t); hand(0).sort((a,b) => (b[0]+b[1]) - (a[0]+a[1]));
  dMsg(fits(t) ? `سحبت ${tName(t)}… ينفع ينزل ✓` : `سحبت ${tName(t)}… اسحب تاني`); tone(500,600,.05,'triangle',.08); renderDomino();
};
$('dPass').onclick = () => {
  if (!isMe(DOM.turn) || DOM.over) return;
  const canPlay = hand(0).some(fits);
  if (!canPlay && DOM.bone.length && DOM.mode === '1v1') return dMsg('اسحب من الكومة الأول');
  if (canPlay){
    if (!DOM.cheat) return dMsg('معاك حجر بيركب… مينفعش تفوّت');
    if (Math.random() < .5){ DOM.score[1] += 50; buzz(60); dMsg(`فوّت وانت معاك؟! اتمسكت… +٥٠ لـ ${teamName(1)}`); renderDomino(); if (checkMatch()) return; }
    else dMsg('فوّت وانت معاك… محدش خد باله');
  } else { dMsg('فوّت'); DOM.weak[0] = [...new Set([...DOM.weak[0], DOM.L, DOM.R])]; }
  DOM.cheats = []; nextTurn();
};
$('dCheat').onclick = () => {
  if (DOM.accused || !DOM.cheat) return; DOM.accused = true;
  const c = DOM.cheats.find(x => teamOf(x.seat) === 1);
  if (c){
    DOM.score[0] += 50; coin();
    if (c.type === 'tile'){ const endT = c.side === 'L' ? DOM.board[0] : DOM.board[DOM.board.length-1]; if (endT && sameT(endT, c.t)){ unplace(c.side, c.prev); hand(c.seat).push(c.t); } }
    dMsg(`مسكت ${DOM.seats[c.seat].name} بيغش! +٥٠ لـ ${teamName(0)}`); speak('خلاص خلاص… مسكتني');
  } else dMsg('ظلمتهم… محدش كان بيغش');
  DOM.cheats = DOM.cheats.filter(x => x !== c); renderDomino(); checkMatch();
};

// ---------- after any move ----------
function afterPlay(seat){
  if (!hand(seat).length) return endRound({ type: 'out', seat });
  if (isBlocked()) return endRound({ type: 'block', seat });
  nextTurn();
}

// ---------- computer players ----------
// easy: plays almost at random among what fits. normal: plays well with a bit of noise.
// hard: counts the tiles, remembers who passed on what, plays for the partner and against the next player.
const DOM_AI = {
  easy:   { think: [900, 1700], noise: 10, know: false, look: 0,  partner: 0 },
  normal: { think: [800, 1700], noise: 3,  know: true,  look: .6, partner: .5 },
  hard:   { think: [700, 2100], noise: .7, know: true,  look: 1,  partner: 1 },
};
function aiLegal(seat){
  const o = [];
  if (!DOM.board.length){ hand(seat).forEach(t => { if (!DOM.mustStart || sameT(t, DOM.mustStart)) o.push({ t, side: 'R' }); }); return o; }
  hand(seat).forEach(t => { if (touches(t, DOM.L)) o.push({ t, side: 'L' }); if (touches(t, DOM.R) && (DOM.L !== DOM.R || !touches(t, DOM.L))) o.push({ t, side: 'R' }); });
  return o;
}
// the tiles a seat can't see: not on the table and not in its own hand
const unseenBy = seat => ALL_TILES.filter(t => !DOM.board.some(b => sameT(b, t)) && !hand(seat).some(h => sameT(h, t)));
// chance that seat s holds a tile for the ends (L, R), worked out from what is unseen and the numbers s has passed on
function pCanPlay(s, L, R, pool){
  const W = DOM.weak[s] || [];
  const possible = pool.filter(t => !W.includes(t[0]) && !W.includes(t[1]));
  const N = possible.length, k = possible.filter(t => touches(t, L) || touches(t, R)).length, h = hand(s).length;
  if (!k || !h) return 0; if (h >= N) return 1;
  let none = 1; for (let i = 0; i < h; i++) none *= Math.max(0, N - k - i) / (N - i);
  return 1 - none;
}
function aiEval(seat, o, cfg, pool){
  const t = o.t, rest = hand(seat).filter(x => x !== t);
  let L = DOM.L, R = DOM.R;
  if (!DOM.board.length){ L = t[0]; R = t[1]; }
  else if (o.side === 'L') L = t[0] === DOM.L ? t[1] : t[0];
  else R = t[0] === DOM.R ? t[1] : t[0];
  if (!rest.length) return 1e6;                                             // going out
  const oppMin = Math.min(...DOM.seats.map((_, s) => teamOf(s) !== teamOf(seat) ? hand(s).length : 99));
  let sc = (t[0] + t[1]) * (oppMin <= 2 ? 1.6 : .8);                        // get rid of heavy tiles, faster when someone is nearly out
  if (t[0] === t[1]) sc += 6;                                               // doubles are hard to place later
  sc += rest.filter(x => touches(x, L) || touches(x, R)).length * 2.5;      // keep something to play next turn
  sc += new Set(rest.flat()).size;                                          // keep different numbers
  if (cfg.know){
    for (let k = 1; k < NS(); k++){
      const s = (seat + k) % NS(), w = k === 1 ? 1 : .45, p = pCanPlay(s, L, R, pool);
      if (teamOf(s) !== teamOf(seat)) sc -= 16 * p * w * cfg.look;          // make the other side pass
      else sc += 10 * p * w * cfg.partner;                                   // leave something for the partner
    }
    if (NS() === 4 && DOM.board.length && DOM.endBy[o.side] === (seat + 2) % 4) sc -= 5 * cfg.partner;   // don't cover what the partner just opened
  }
  if (endsBlocked(L, R, [...DOM.board, t])){
    // closing the game: worth it only if this side has fewer pips (own hand exact, the others guessed)
    const avg = pool.length ? pipsOf(pool) / pool.length : 6;
    let ours = pipsOf(rest), theirs = 0;
    DOM.seats.forEach((_, s) => { if (s === seat) return; const est = hand(s).length * avg; if (teamOf(s) === teamOf(seat)) ours += est; else theirs += est; });
    sc += (ours < theirs ? 45 : -45) * (cfg.know ? 1 : .3);
  }
  return sc + (Math.random() * 2 - 1) * cfg.noise * 3;
}
const TALK = ['اتلمّ يا ' + heroName, 'دي لعبتي من زمان', 'ركّز يا ابني', 'هتعمل إيه دلوقتي؟', 'شوف دي بقى', 'ماشي ماشي', 'العب يا عم', 'خد بالك من دي'];
function aiTurn(){
  if (DOM.over || isMe(DOM.turn) || $('domino').hidden) return;
  const seat = DOM.turn, p = DOM.seats[seat], opp = teamOf(seat) === 1, cfg = DOM_AI[DOM.diff];
  let opts = aiLegal(seat);
  // fun mode only: the other side cheats now and then
  if (DOM.cheat && DOM.board.length && opp && opts.length && Math.random() < .05){ DOM.cheats.push({ seat, type: 'pass' }); dMsg(`${p.name}: «فوّت»`); return nextTurn(); }
  if (DOM.cheat && DOM.board.length && opp && Math.random() < .04 && hand(seat).length > 1){ const bad = hand(seat).find(t => !touches(t, DOM.L) && !touches(t, DOM.R)); if (bad){ const prev = { L: DOM.L, R: DOM.R }, side = Math.random() < .5 ? 'L' : 'R'; placeTile(bad, side, true); hand(seat).splice(hand(seat).indexOf(bad), 1); DOM.lastSide = side; DOM.endBy[side] = seat; DOM.cheats.push({ seat, type: 'tile', t: bad, side, prev }); dMsg(`${p.name} نزل ${tName(bad)}`); tileClack(); return afterPlay(seat); } }
  let drew = 0;
  if (DOM.mode === '1v1') while (!opts.length && DOM.bone.length){ DOM.weak[seat] = [...new Set([...DOM.weak[seat], DOM.L, DOM.R])]; hand(seat).push(DOM.bone.pop()); drew++; opts = aiLegal(seat); }
  if (!opts.length){ DOM.weak[seat] = [...new Set([...DOM.weak[seat], DOM.L, DOM.R])]; dMsg(drew ? `${p.name} سحب ${drew} وفوّت` : `${p.name} فوّت`); return nextTurn(); }
  const pool = unseenBy(seat);
  const scored = opts.map(o => ({ o, s: aiEval(seat, o, cfg, pool) })).sort((a, b) => b.s - a.s);
  const o = scored[0].o, first = !DOM.board.length;
  placeTile(o.t, o.side); hand(seat).splice(hand(seat).indexOf(o.t), 1); DOM.lastSide = o.side;
  if (first) DOM.endBy = { L: seat, R: seat }; else DOM.endBy[o.side] = seat;
  tileClack();
  const blocked = isBlocked();
  dMsg(`${drew ? `${p.name} سحب ${drew} ونزل ` : `${p.name} نزل `}${tName(o.t)}${blocked ? ' وقال «قفلة!»' : ''}${!blocked && hand(seat).length && Math.random() < .22 ? ' · «' + rpick(TALK) + '»' : ''}`);
  if (Math.random() < .5) speak(blocked ? 'قفلة' : tName(o.t));
  afterPlay(seat);
}

// ---------- round and match end ----------
function endRound(res){
  DOM.over = true; clearTimeout(DOM.aiTimer);
  const teamPips = tm => DOM.hands.reduce((s, h, i) => s + (teamOf(i) === tm ? pipsOf(h) : 0), 0);
  let txt = '';
  if (res.type === 'out'){
    const tm = teamOf(res.seat), raw = teamPips(1 - tm), pts = round10(raw); DOM.score[tm] += pts; DOM.lastWinner = res.seat;
    txt = `${DOM.seats[res.seat].name} خلّص حجارته ${raw} نقطة ← +${pts} لـ ${teamName(tm)}`;
  } else {
    const a = teamPips(0), b = teamPips(1);
    if (a !== b){
      const w = a < b ? 0 : 1, pts = round10(w === 0 ? b : a); DOM.score[w] += pts; DOM.lastWinner = lowestSeat(w);
      txt = `قفلة ${teamName(0)} ${a} و${teamName(1)} ${b}… +${pts} لـ ${teamName(w)}`;
      if (w === 0 && isMe(res.seat)) stat('qafla');
    } else { DOM.lastWinner = null; txt = `قفلة متعادلين (${a})… محدش ياخد حاجة، والدش يبدأ`; }
  }
  const sab = sab3een(); if (sab) txt += ' · ' + sab;
  if (!checkMatch(txt)) dMsg(txt);
  renderDomino();
}
// مسبعين: a side that was dealt all 7 tiles of one number (shown only)
function sab3een(){
  const out = [];
  for (let tm = 0; tm < 2; tm++){ const h = DOM.dealt.filter((_, s) => teamOf(s) === tm).flat(); for (let v = 0; v <= 6; v++) if (h.filter(t => touches(t, v)).length === 7) out.push(`${teamName(tm)} ${DOM.mode === '1v1' ? 'كان' : 'كانوا'} مسبعين في الـ${NUMN[v]} 7️⃣`); }
  return out.join(' · ');
}
function lowestSeat(tm){ let best = null; DOM.hands.forEach((h, i) => { if (teamOf(i) === tm && (best === null || pipsOf(h) < pipsOf(DOM.hands[best]))) best = i; }); return best; }
function checkMatch(prefix=''){
  const [a, b] = DOM.score;
  if (a < DOM.target && b < DOM.target) return false;
  DOM.over = true; DOM.matchOver = true; clearTimeout(DOM.aiTimer); const w = a >= b;
  if (w){ stat('domWin'); if (DOM.mode === '2v2') stat('domWin2'); }
  let betTxt = ''; if (modeObj.onDomino){ const bt = modeObj.onDomino(w); if (bt) betTxt = w ? ` · +${bt} جنيه` : ` · -${bt} جنيه`; }
  dMsg(`${prefix ? prefix + ' — ' : ''}${w ? `كسبتوا الماتش ${a}–${b}!` : `${teamName(1)} كسب الماتش ${b}–${a}`}${betTxt}`.replace('كسبتوا', DOM.mode === '1v1' ? 'كسبت' : 'كسبتوا'));
  if (w) coin(); speak(w ? 'ماشي… كسبتوا المرة دي' : 'اتعلم يا ابني');
  renderDomino(); return true;
}
addEventListener('resize', () => { if (!$('domino').hidden && !$('dGame').hidden) drawBoard(); });
