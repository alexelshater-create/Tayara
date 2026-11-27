// ================= HUD helpers =================
let bannerT = 0;
function banner(text, cls='info', dur=2.5){ const b = $('banner'); b.textContent = AR(text); b.className = 'banner show ' + cls; bannerT = dur; }
function setObjective(title, html){ $('objTitle').textContent = AR(title); $('objText').innerHTML = ARH(html); hudHint(html, true); }
// the objective: one line at the bottom like GTA (no box), key words in colour; it shows when it changes, then fades
const HINT = { key: '', t: 0 };
function hudHint(html, force){
  const el = $('hint'), plain = String(html || '').replace(/<[^>]+>/g, '').replace(/[0-9٠-٩.,:]+/g, '#').trim();
  if (!plain){ el.classList.remove('show'); HINT.key = ''; return; }
  if (plain !== HINT.key || force){ HINT.key = plain; HINT.t = 8; el.innerHTML = ARH(html); el.classList.add('show'); }
  else if (HINT.t > 0) el.innerHTML = ARH(html);   // only a number changed (a distance, a count): keep it fresh while it shows
}
// activities and jobs: their live counters top-right under the money, like GTA's mission counters
function hudCounter(html){ const el = $('counter'); if (!html){ el.hidden = true; return; } el.hidden = false; const h = ARH(html); if (el._h !== h){ el._h = h; el.innerHTML = h; } }
// subtitles: what people say, at the bottom (characters with their name in colour, people in the street smaller)
const SUBS = [];
function subtitle(text, name, kind = 'npc', dur = 3){
  const box = $('subs'); if (!box || !text) return;
  if (kind === 'npc' && SUBS.some(s => s.kind === 'npc' && s.t > dur - .6)) return;   // the street doesn't talk over itself
  const el = document.createElement('div'); el.className = 'sub ' + kind;
  el.innerHTML = (name ? `<b>${AR(name)}:</b> ` : '') + AR(text).replace(/[<>]/g, '');
  box.appendChild(el); SUBS.push({ el, t: dur, kind });
  while (SUBS.length > 2){ SUBS.shift().el.remove(); }
}
function updateSubs(dt){
  for (let i = SUBS.length - 1; i >= 0; i--){ const s = SUBS[i]; s.t -= dt; if (s.t < .4) s.el.style.opacity = Math.max(0, s.t / .4); if (s.t <= 0){ s.el.remove(); SUBS.splice(i, 1); } }
  if (HINT.t > 0){ HINT.t -= dt; if (HINT.t <= 0) $('hint').classList.remove('show'); }
}
const WEAP_IC = { none: 'fist', knife: 'knife', machete: 'knife', stick: 'stick', broom: 'stick', slipper: 'hand-stop', chair: 'stick', bottle: 'flame', bin: 'stick', pistol: 'crosshair', shotgun: 'crosshair', ak: 'crosshair', molotov: 'flame' };
function flash(){ $('flash').style.opacity = 1; setTimeout(() => $('flash').style.opacity = 0, 180); }
function updateHud(){
  $('hpBar').style.width = clamp(hero.hp,0,100) + '%';
  $('stBar').style.width = (hero.stamina*100).toFixed(0) + '%'; $('stWrap').classList.toggle('tired', hero.tired);
  $('money').textContent = egp(hero.money);
  const ck = $('hudClock'); if (ck && typeof TOD !== 'undefined'){ const h = Math.floor(TOD.h) % 24, m = Math.floor((TOD.h % 1) * 60); const s = AR(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`); if (ck.textContent !== s) ck.textContent = s; }
}
function heroDamage(n, why){
  if (hero.inv > 0 || state !== 'play' || CUT.on || HOUSE.inside) return;
  if (why === 'enemy' || why === 'npc'){ n = meleeDefend(n); if (n <= 0) return; }
  hero.hp -= n; hero.hurtT = 0; hero.d.hitT = .45; flash(); thwack(); shake = Math.max(shake, .35);
  if (hero.hp <= 0){ hero.hp = 0; deathScene('dead', why, () => { modeObj.onKO ? modeObj.onKO(why) : knockout(why); }); }   // «راحت عليك» first (19x)
}
function knockout(why){
  if (typeof POL !== 'undefined' && POL.on) polEnd(null);
  banner('فوقت في القهوة · دفعت ٢٠ جنيه علاج', 'bad', 3);
  hero.hp = 100; hero.money = Math.max(0, hero.money - 20); if (hero.veh) exitVehicle(true);
  hero.pos.copy(SPOT.spawn); hero.inv = 2;
}
