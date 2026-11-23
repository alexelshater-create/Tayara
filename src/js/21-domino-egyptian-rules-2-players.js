// ================= domino (Egyptian rules: 1v1 and 2v2) =================
// 1v1: 7 tiles each, 14 in the boneyard (الكومة). Draw until you can play; pass only when the boneyard is empty. Match to 101.
// 2v2: 7 tiles each, no boneyard, partners sit opposite, play goes round the table. Pass when you can't play. Match to 151.
// First round: the highest double opens (الدش in 2v2 always). Later rounds: the player who went out opens with any tile.
// Going out: the winners take the pips left in the losing side's hands. Blocked game (قفلة): lower total wins and takes the other side's pips; a tie scores nothing.
// House rules: the player who closes the game must say «قفلة» first, otherwise the other side gets 50. Getting caught cheating gives the other side 50.
const NUMN = ['أبيض','يك','دو','سيه','جوهار','بانج','شيش'];
const DBL = ['البلاطة','الهبياك','الدوبارة','الدوسة','الدورجي','الدبش','الدش'];
const tName = t => t[0] === t[1] ? DBL[t[0]] : `${NUMN[Math.max(t[0],t[1])]} ${NUMN[Math.min(t[0],t[1])]}`;
const pipsOf = arr => arr.reduce((s,t) => s + t[0] + t[1], 0);
const sameT = (a,b) => (a[0]===b[0] && a[1]===b[1]) || (a[0]===b[1] && a[1]===b[0]);
const touches = (t, v) => t[0] === v || t[1] === v;
const DOM = { mode: null, seats: [], hands: [], bone: [], board: [], start: 0, L: null, R: null, turn: 0, sel: null, selCheat: false, score: [0,0], target: 101, over: true, matchOver: true, qafla: false, mustStart: null, lastWinner: null, weak: [], cheats: [], accused: false, lastSide: 'R', aiTimer: null };
const PIPS = { 0:[], 1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8] };
const tileHTML = (t, cls='', attrs='') => `<span class="tile ${t[0]===t[1] ? 'dbl' : ''} ${cls}" ${attrs}>${[t[0],t[1]].map(v => `<span class="half">${[...Array(9)].map((_,i) => PIPS[v].includes(i) ? '<i class="pip"></i>' : '<i></i>').join('')}</span>`).join('')}</span>`;
const teamOf = s => s % 2;          // seat 0 (you) and 2 (partner) are team 0
const isMe = s => s === 0;
const NS = () => DOM.seats.length;
const hand = s => DOM.hands[s];
const teamName = tm => DOM.mode === '1v1' ? (tm === 0 ? heroName : 'الحاج كامل') : (tm === 0 ? 'إحنا' : 'هما');
function openDomino(){
  hero.locked = true; $('domino').hidden = false; document.body.classList.add('in-domino');
  if (DOM.matchOver){ $('dPick').hidden = false; $('dGame').hidden = true; $('dScore').textContent = modeObj.domBet ? `الرهان ${Math.min(modeObj.domBet, Math.floor(hero.money))} جنيه` : ''; }
  else { $('dPick').hidden = true; $('dGame').hidden = false; renderDomino(); if (!DOM.over && !isMe(DOM.turn)) scheduleAI(); }
}
function closeDomino(){ $('domino').hidden = true; hero.locked = false; document.body.classList.remove('in-domino'); clearTimeout(DOM.aiTimer); }
$('dExit').onclick = closeDomino;
document.querySelectorAll('[data-dm]').forEach(b => b.onclick = () => newDominoMatch(b.dataset.dm));
$('dAgain').onclick = () => { if (DOM.matchOver){ $('dPick').hidden = false; $('dGame').hidden = true; } else newDominoRound(); };
function newDominoMatch(mode){
  DOM.mode = mode; DOM.score = [0,0]; DOM.matchOver = false; DOM.lastWinner = null;
  DOM.target = mode === '1v1' ? 101 : 151;
  DOM.seats = mode === '1v1'
    ? [{ name: heroName, face: CH.hero.img.face }, { name: 'الحاج كامل', face: null }]
    : [{ name: heroName, face: CH.hero.img.face }, { name: 'شمس', face: CH.wanted.img.face }, { name: 'إسلام', face: CH.islam.img.face }, { name: 'العربي', face: CH.enemy.img.face }];
  $('dPick').hidden = true; $('dGame').hidden = false; document.querySelector('.seats').classList.toggle('four', mode === '2v2');
  newDominoRound();
}
function newDominoRound(){
  clearTimeout(DOM.aiTimer);
  const all = []; for (let a=0;a<=6;a++) for (let b=a;b<=6;b++) all.push([a,b]);
  for (let i=all.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [all[i],all[j]] = [all[j],all[i]]; }
  DOM.hands = []; for (let s=0;s<NS();s++) DOM.hands.push(all.slice(s*7, s*7+7));
  DOM.hands[0].sort((a,b) => (b[0]+b[1]) - (a[0]+a[1]));
  DOM.bone = all.slice(NS()*7);
  Object.assign(DOM, { board: [], start: 0, L: null, R: null, sel: null, selCheat: false, over: false, qafla: false, weak: DOM.seats.map(() => []), cheats: [], accused: false, mustStart: null });
  let who, msg;
  if (DOM.lastWinner !== null){ who = DOM.lastWinner; msg = `${DOM.seats[who].name} كسب الدور اللي فات… يبدأ بأي حجر`; }
  else {
    let st = null;
    for (let d=6; d>=0 && !st; d--) for (let s=0; s<NS() && !st; s++) if (hand(s).some(t => t[0]===d && t[1]===d)) st = { s, t: [d,d] };
    if (!st){ let best = null; for (let s=0;s<NS();s++) for (const t of hand(s)) if (!best || t[0]+t[1] > best.t[0]+best.t[1]) best = { s, t }; st = best; }
    who = st.s; DOM.mustStart = st.t; msg = isMe(who) ? `معاك ${tName(st.t)}… ابدأ بيه 👇` : `${DOM.seats[who].name} معاه ${tName(st.t)}… هو اللي هيبدأ`;
  }
  DOM.turn = who; dMsg(msg); renderDomino(); if (!isMe(who)) scheduleAI(1300);
}
function fits(t){ if (!DOM.board.length) return !DOM.mustStart || sameT(t, DOM.mustStart); return touches(t, DOM.L) || touches(t, DOM.R); }
function placeTile(t, side, cheat){
  if (!DOM.board.length){ DOM.board.push([t[0],t[1]]); DOM.start = 0; DOM.L = t[0]; DOM.R = t[1]; return 'R'; }
  let o;
  if (side === 'L'){ if (t[1]===DOM.L) o = [t[0],t[1]]; else if (t[0]===DOM.L) o = [t[1],t[0]]; else if (cheat) o = [t[0],t[1]]; else return null; DOM.board.unshift(o); DOM.start++; DOM.L = o[0]; return 'L'; }
  if (t[0]===DOM.R) o = [t[0],t[1]]; else if (t[1]===DOM.R) o = [t[1],t[0]]; else if (cheat) o = [t[0],t[1]]; else return null; DOM.board.push(o); DOM.R = o[1]; return 'R';
}
function unplace(side, prev){ if (side === 'L'){ DOM.board.shift(); DOM.start--; } else DOM.board.pop(); DOM.L = prev.L; DOM.R = prev.R; }
function isBlocked(){ if (!DOM.board.length) return false; return ![...DOM.hands.flat(), ...DOM.bone].some(t => touches(t, DOM.L) || touches(t, DOM.R)); }
function dMsg(t){ $('dMsg').textContent = t; }
function nextTurn(){ DOM.turn = (DOM.turn + 1) % NS(); DOM.sel = null; DOM.selCheat = false; renderDomino(); if (!isMe(DOM.turn) && !DOM.over) scheduleAI(); }
function scheduleAI(ms=950){ clearTimeout(DOM.aiTimer); DOM.aiTimer = setTimeout(aiTurn, ms); }

// ---------- rendering ----------
function renderDomino(){
  const [a, b] = DOM.score;
  $('dScore').textContent = `${teamName(0)} ${a} — ${b} ${teamName(1)} · لـ ${DOM.target}${modeObj.domBet ? ' · الرهان ' + Math.min(modeObj.domBet, Math.floor(hero.money)) + ' ج' : ''}`;
  for (const s of [1,2,3]){
    const el = $('seat' + s); const seat = DOM.mode === '1v1' ? (s === 2 ? 1 : null) : s;
    if (seat === null || !DOM.seats[seat]){ el.hidden = true; continue; }
    el.hidden = false; const p = DOM.seats[seat];
    el.className = `seat ${s === 2 ? 'top' : s === 1 ? 'left' : 'right'} ${teamOf(seat) === 0 ? 'mate' : 'opp'} ${DOM.turn === seat && !DOM.over ? 'active' : ''}`;
    el.innerHTML = `${p.face ? `<img src="${p.face}" alt="">` : '<span class="noface">👴</span>'}<span class="sn">${p.name}${teamOf(seat) === 0 && seat !== 0 ? ' 🤝' : ''}</span><span class="sc">🂠 ${hand(seat).length}</span>${DOM.over ? `<span class="reveal">${hand(seat).map(t => tileHTML(t, 'mini')).join('')}</span>` : ''}`;
  }
  drawBoard();
  const myTurn = isMe(DOM.turn) && !DOM.over;
  $('dHand').innerHTML = hand(0).map((t,i) => `<div class="hwrap">${tileHTML(t, (myTurn ? (fits(t) ? 'ok' : 'no') : 'no') + (DOM.sel === i ? ' sel' : ''), `data-i="${i}"`)}<small>${tName(t)}</small></div>`).join('');
  $('dHand').querySelectorAll('.tile').forEach(el => el.onclick = () => playerPick(+el.dataset.i));
  const canPlay = hand(0).some(fits), started = DOM.board.length > 0;
  $('dDraw').hidden = !(myTurn && started && !canPlay && DOM.bone.length && DOM.mode === '1v1');
  $('dPass').hidden = !(myTurn && started && (canPlay || !DOM.bone.length || DOM.mode === '2v2'));
  $('dQafla').hidden = !(myTurn && started); $('dQafla').classList.toggle('on', DOM.qafla);
  $('dCheat').hidden = !(myTurn && DOM.cheats.length >= 0 && DOM.board.length > 1 && !DOM.accused);
  const showSides = DOM.sel !== null;
  $('dLeft').hidden = $('dRight').hidden = !showSides; $('dCancel').hidden = !showSides;
  if (showSides){ $('dLeft').textContent = `⬅️ على الـ ${NUMN[DOM.L]}`; $('dRight').textContent = `على الـ ${NUMN[DOM.R]} ➡️`; }
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
    DOM.sel = i; DOM.selCheat = true; dMsg(`${tName(t)} مش راكب… لو نزلته يبقى غش 😈`); return renderDomino();
  }
  if (!DOM.board.length) return commitPlayer(i, 'R');
  const l = touches(t, DOM.L), r = touches(t, DOM.R);
  if (l && r && DOM.L !== DOM.R){ DOM.sel = i; dMsg('تحطه فين؟'); return renderDomino(); }
  commitPlayer(i, l ? 'L' : 'R');
}
$('dLeft').onclick = () => { if (DOM.sel !== null) commitPlayer(DOM.sel, 'L', DOM.selCheat); };
$('dRight').onclick = () => { if (DOM.sel !== null) commitPlayer(DOM.sel, 'R', DOM.selCheat); };
$('dCancel').onclick = () => { DOM.sel = null; DOM.selCheat = false; dMsg('دورك'); renderDomino(); };
$('dQafla').onclick = () => { DOM.qafla = !DOM.qafla; dMsg(DOM.qafla ? 'قلت «قفلة» 🔒… انزل الحجر اللي بيقفل' : 'لغيت القفلة'); renderDomino(); };
function commitPlayer(i, side, cheat=false){
  const t = hand(0)[i], prev = { L: DOM.L, R: DOM.R };
  const s = placeTile(t, side, cheat); if (!s) return;
  hand(0).splice(i,1); DOM.sel = null; DOM.selCheat = false; DOM.lastSide = s; DOM.cheats = []; DOM.accused = false;
  tileClack(); buzz(10);
  if (cheat){
    if (Math.random() < .6){ unplace(s, prev); hand(0).splice(i, 0, t); DOM.score[1] += 50; tone(300,150,.4,'sawtooth',.1); buzz(60); dMsg(`🚨 اتمسكت بتغش! +٥٠ لـ ${teamName(1)}`); speak('بتغش؟'); renderDomino(); checkMatch(); return; }
    dMsg(`نزّلت ${tName(t)} غش… محدش خد باله 🤫`);
  } else dMsg(`نزّلت ${tName(t)}`);
  afterPlay(0, DOM.qafla);
}
$('dDraw').onclick = () => {
  if (!isMe(DOM.turn) || !DOM.bone.length) return;
  DOM.weak[0] = [...new Set([...DOM.weak[0], DOM.L, DOM.R])];
  const t = DOM.bone.pop(); hand(0).push(t); hand(0).sort((a,b) => (b[0]+b[1]) - (a[0]+a[1]));
  dMsg(fits(t) ? `سحبت ${tName(t)}… ينفع ينزل ✔️` : `سحبت ${tName(t)}… اسحب تاني`); tone(500,600,.05,'triangle',.08); renderDomino();
};
$('dPass').onclick = () => {
  if (!isMe(DOM.turn) || DOM.over) return;
  const canPlay = hand(0).some(fits);
  if (!canPlay && DOM.bone.length && DOM.mode === '1v1') return dMsg('اسحب من الكومة الأول');
  if (canPlay){
    if (Math.random() < .5){ DOM.score[1] += 50; buzz(60); dMsg(`🚨 فوّت وانت معاك؟! اتمسكت… +٥٠ لـ ${teamName(1)}`); renderDomino(); if (checkMatch()) return; }
    else dMsg('فوّت وانت معاك… محدش خد باله 🤫');
  } else { dMsg('فوّت'); DOM.weak[0] = [...new Set([...DOM.weak[0], DOM.L, DOM.R])]; }
  DOM.qafla = false; DOM.cheats = []; nextTurn();
};
$('dCheat').onclick = () => {
  if (DOM.accused) return; DOM.accused = true;
  const c = DOM.cheats.find(x => teamOf(x.seat) === 1);
  if (c){
    DOM.score[0] += 50; coin();
    if (c.type === 'tile'){ const endT = c.side === 'L' ? DOM.board[0] : DOM.board[DOM.board.length-1]; if (endT && sameT(endT, c.t)){ unplace(c.side, c.prev); hand(c.seat).push(c.t); } }
    dMsg(`🚨 مسكت ${DOM.seats[c.seat].name} بيغش! +٥٠ لـ ${teamName(0)}`); speak('خلاص خلاص… مسكتني');
  } else dMsg('ظلمتهم… محدش كان بيغش 😅');
  DOM.cheats = DOM.cheats.filter(x => x !== c); renderDomino(); checkMatch();
};

// ---------- after any move ----------
function afterPlay(seat, announced){
  DOM.qafla = false;
  if (!hand(seat).length) return endRound({ type: 'out', seat });
  if (isBlocked()){ if (announced){ if (isMe(seat)) stat('qafla'); return endRound({ type: 'block', seat }); } DOM.score[1 - teamOf(seat)] += 50; return endRound({ type: 'penalty', seat }); }
  if (announced && isMe(seat)) dMsg('قلت «قفلة» ومكانتش قفلة 😅');
  nextTurn();
}

// ---------- computer players ----------
function aiScore(seat, o){
  const t = o.t, exposed = o.side === 'L' ? (t[1] === DOM.L ? t[0] : t[1]) : (t[0] === DOM.R ? t[1] : t[0]);
  const other = o.side === 'L' ? DOM.R : DOM.L; const mine = hand(seat);
  let sc = t[0] + t[1] + (t[0] === t[1] ? 6 : 0) + (exposed === other ? 2 : 0) + mine.filter(x => x !== t && touches(x, exposed)).length * 2;
  for (let s=0;s<NS();s++){ if (s === seat) continue; const w = DOM.weak[s] || []; if (!w.includes(exposed)) continue; sc += teamOf(s) === teamOf(seat) ? -7 : 9; }
  return sc;
}
function aiLegal(seat){ const o = []; if (!DOM.board.length){ hand(seat).forEach(t => { if (!DOM.mustStart || sameT(t, DOM.mustStart)) o.push({ t, side: 'R' }); }); return o; } hand(seat).forEach(t => { if (touches(t, DOM.L)) o.push({ t, side: 'L' }); if (touches(t, DOM.R) && DOM.L !== DOM.R) o.push({ t, side: 'R' }); else if (touches(t, DOM.R) && !touches(t, DOM.L)) o.push({ t, side: 'R' }); }); return o; }
const TALK = ['اتلمّ يا ' + heroName, 'دي لعبتي من زمان', 'ركّز يا ابني', 'هتعمل إيه دلوقتي؟', 'شوف دي بقى', 'ماشي ماشي'];
function aiTurn(){
  if (DOM.over || isMe(DOM.turn) || $('domino').hidden) return;
  const seat = DOM.turn, p = DOM.seats[seat], opp = teamOf(seat) === 1;
  let opts = aiLegal(seat);
  if (DOM.board.length && opp && opts.length && Math.random() < .05){ DOM.cheats.push({ seat, type: 'pass' }); dMsg(`${p.name}: «فوّت»`); return nextTurn(); }
  if (DOM.board.length && opp && Math.random() < .03 && hand(seat).length > 1){ const bad = hand(seat).find(t => !touches(t, DOM.L) && !touches(t, DOM.R)); if (bad){ const prev = { L: DOM.L, R: DOM.R }, side = Math.random() < .5 ? 'L' : 'R'; placeTile(bad, side, true); hand(seat).splice(hand(seat).indexOf(bad), 1); DOM.lastSide = side; DOM.cheats.push({ seat, type: 'tile', t: bad, side, prev }); dMsg(`${p.name} نزل ${tName(bad)}`); tileClack(); return afterPlay(seat, false); } }
  let drew = 0;
  if (DOM.mode === '1v1') while (!opts.length && DOM.bone.length){ DOM.weak[seat] = [...new Set([...DOM.weak[seat], DOM.L, DOM.R])]; hand(seat).push(DOM.bone.pop()); drew++; opts = aiLegal(seat); }
  if (!opts.length){ DOM.weak[seat] = [...new Set([...DOM.weak[seat], DOM.L, DOM.R])]; dMsg(drew ? `${p.name} سحب ${drew} وفوّت` : `${p.name} فوّت`); return nextTurn(); }
  opts.sort((a,b) => aiScore(seat, b) - aiScore(seat, a));
  const o = opts[0]; placeTile(o.t, o.side); hand(seat).splice(hand(seat).indexOf(o.t), 1); DOM.lastSide = o.side;
  tileClack();
  const blocked = isBlocked(), says = blocked && Math.random() < .88;
  dMsg(`${drew ? `${p.name} سحب ${drew} ونزل ` : `${p.name} نزل `}${tName(o.t)}${says ? ' وقال «قفلة!» 🔒' : ''}${!blocked && hand(seat).length && Math.random() < .25 ? ' · «' + rpick(TALK) + '»' : ''}`);
  if (Math.random() < .5) speak(tName(o.t));
  afterPlay(seat, says);
}

// ---------- round and match end ----------
function endRound(res){
  DOM.over = true; clearTimeout(DOM.aiTimer);
  const teamPips = tm => DOM.hands.reduce((s, h, i) => s + (teamOf(i) === tm ? pipsOf(h) : 0), 0);
  let txt = '';
  if (res.type === 'out'){
    const tm = teamOf(res.seat), pts = teamPips(1 - tm); DOM.score[tm] += pts; DOM.lastWinner = res.seat;
    txt = `${DOM.seats[res.seat].name} خلّص حجارته 🎉 +${pts} لـ ${teamName(tm)}`;
  } else if (res.type === 'block'){
    const a = teamPips(0), b = teamPips(1);
    if (a < b){ DOM.score[0] += b; DOM.lastWinner = lowestSeat(0); txt = `قفلة 🔒 ${teamName(0)} ${a} و${teamName(1)} ${b}… +${b} لـ ${teamName(0)}`; }
    else if (b < a){ DOM.score[1] += a; DOM.lastWinner = lowestSeat(1); txt = `قفلة 🔒 ${teamName(0)} ${a} و${teamName(1)} ${b}… +${a} لـ ${teamName(1)}`; }
    else { DOM.lastWinner = null; txt = `قفلة 🔒 متعادلين (${a})… محدش ياخد حاجة`; }
  } else {
    const tm = teamOf(res.seat); DOM.lastWinner = null;
    txt = `${DOM.seats[res.seat].name} قفلها من غير ما يقول «قفلة»! +٥٠ لـ ${teamName(1 - tm)}`;
  }
  if (!checkMatch(txt)) dMsg(txt);
  renderDomino();
}
function lowestSeat(tm){ let best = null; DOM.hands.forEach((h, i) => { if (teamOf(i) === tm && (best === null || pipsOf(h) < pipsOf(DOM.hands[best]))) best = i; }); return best; }
function checkMatch(prefix=''){
  const [a, b] = DOM.score;
  if (a < DOM.target && b < DOM.target) return false;
  DOM.over = true; DOM.matchOver = true; clearTimeout(DOM.aiTimer); const w = a >= b;
  if (w){ stat('domWin'); if (DOM.mode === '2v2') stat('domWin2'); }
  let betTxt = ''; if (modeObj.onDomino){ const bt = modeObj.onDomino(w); if (bt) betTxt = w ? ` · +${bt} جنيه` : ` · -${bt} جنيه`; }
  dMsg(`${prefix ? prefix + ' — ' : ''}${w ? `🏆 كسبتوا الماتش ${a}–${b}!` : `${teamName(1)} كسب الماتش ${b}–${a} 😅`}${betTxt}`.replace('كسبتوا', DOM.mode === '1v1' ? 'كسبت' : 'كسبتوا'));
  if (w) coin(); speak(w ? 'ماشي… كسبتوا المرة دي' : 'اتعلم يا ابني');
  renderDomino(); return true;
}
addEventListener('resize', () => { if (!$('domino').hidden && !$('dGame').hidden) drawBoard(); });
