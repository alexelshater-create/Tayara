// ================= menus: loading, main menu pages, missions, pause, "too hard?", credits, the back button =================

// ---- loading: the main menu stays dim (nothing can be pressed) until everything is built ----
function loadDone(){
  loadStep(1, 'جاهزة! يلا بينا 👑');
  setTimeout(() => { $('menu').classList.remove('loading'); $('menu').classList.add('ready'); }, 300);
}

// ---- main menu pages: the side panel shows one page at a time ----
function mmPage(id){ for (const p of document.querySelectorAll('.mm-page')) p.hidden = p.id !== id; }
$('mmGames').onclick = () => mmPage('mmGamesPage');
document.querySelectorAll('.mm-page [data-back]').forEach(b => b.onclick = () => mmPage('mmMain'));
$('mmMissions').onclick = () => openMissions();
$('mmCred').onclick = () => { $('credits').hidden = false; };
$('credClose').onclick = () => { $('credits').hidden = true; };

// ---- missions: every chapter and its missions. Finished ones can be played again; the real save is not touched ----
let misCh = 0;
const storyChapter = () => SAVE.ended ? MS[MS.length - 1].ch : (MS[SAVE.m] || MS[MS.length - 1]).ch;
function openMissions(){ misCh = storyChapter(); renderMissions(); $('missions').hidden = false; }
function renderMissions(){
  const has = SAVE.started || SAVE.m > 0, now = storyChapter();
  const chs = [...new Set(MS.map(m => m.ch))];
  $('misN').textContent = `خلّصت ${SAVE.ended ? MS.length : SAVE.m} من ${MS.length}`;
  $('misChaps').innerHTML = chs.map(c => { const lock = !SAVE.ended && c > now; return `<button data-ch="${c}" class="${c === misCh ? 'on' : ''}${lock ? ' lock' : ''}">${lock ? '🔒 ' : ''}${CHAPS[c][0]}</button>`; }).join('');
  const rows = MS.map((m, i) => ({ m, i })).filter(r => r.m.ch === misCh);
  $('misList').innerHTML = `<div class="mis-title">${CHAPS[misCh][0]}: <b>${CHAPS[misCh][1]}</b></div>` + rows.map(({ m, i }) => {
    const done = SAVE.ended || i < SAVE.m, cur = !SAVE.ended && i === SAVE.m;
    const note = done ? (SAVE.skipped && SAVE.skipped[m.id] ? 'عدّيتها ⏭️' : 'خلصت ✓') : cur ? (has ? 'دي اللي عليك دلوقتي' : 'أول مهمة') : 'لسه مقفولة';
    const btn = done ? `<button data-replay="${i}">↻ العبها تاني</button>` : cur ? `<button data-go>▶ ${has ? 'كمّل' : 'ابدأ'}</button>` : '';
    return `<div class="mis-row ${done ? 'done' : cur ? 'cur' : 'lock'}"><span class="mi">${done ? '✓' : cur ? '▶' : '🔒'}</span><span class="mt">${done || cur ? m.title : '؟؟؟'}<small>${note}</small></span>${btn}</div>`;
  }).join('') + (has ? `<div class="mis-foot"><button class="diffbtn danger" id="misReset">↺ ابدأ القصة من الأول</button></div>` : '');
  $('misChaps').querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { misCh = +b.dataset.ch; renderMissions(); });
  $('misList').querySelectorAll('[data-replay]').forEach(b => b.onclick = () => startReplay(+b.dataset.replay));
  $('misList').querySelectorAll('[data-go]').forEach(b => b.onclick = () => { $('missions').hidden = true; startMode('story'); });
  const rs = $('misReset');
  if (rs) rs.onclick = () => { if (!rs.dataset.armed){ rs.dataset.armed = '1'; rs.textContent = 'متأكد؟ هتبدأ من الصفر… دوس تاني'; return; } SAVE = newStory(); store.set(STORY_KEY, JSON.stringify(SAVE)); applyAccessories(); renderModes(); misCh = 0; renderMissions(); };
  const on = $('misChaps').querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
}
$('misClose').onclick = () => { $('missions').hidden = true; };
function startReplay(i){
  if (!REPLAY.on) REPLAY.back = SAVE;
  SAVE = JSON.parse(JSON.stringify(REPLAY.back));
  Object.assign(SAVE, { m: i, introSeen: -1, chSeen: -1, ended: false, started: true });
  REPLAY.on = true; REPLAY.i = i; REPLAY.last = i;
  $('missions').hidden = true; startMode('story');
}
function stopReplay(){ if (!REPLAY.on) return; SAVE = REPLAY.back; REPLAY.on = false; REPLAY.back = null; }
function endReplay(M){ stopReplay(); applyAccessories(); endMode('خلّصتها تاني 👏', `«${M.title}» خلصت. قصتك الأصلية زي ما هي.`); }

// ---- make it easier: for the rest of this mission only (after 3 fails) ----
const EASY = { on: false };
function easyOn(){ EASY.on = true; DIFF = { ...DIFFS.easy, pat: 2.2, dmg: .3, enemySpd: .7, spill: 1.2, heat: .55, fry: 1.9, race: 1.6 }; hero.hp = 100; }
function easyOff(){ if (!EASY.on) return; EASY.on = false; DIFF = DIFFS[diffKey]; }

// ---- skip a mission (pause menu, or after 3 fails). Things a mission gives you are given anyway ----
const SKIP_GIVES = { buyMoto: () => { SAVE.owned.moto = true; }, reno1: () => { SAVE.house = Math.max(SAVE.house, 1); houseVisual(); } };
function canSkip(){ return modeId === 'story' && !!curM() && !CUT.on && ['goto', 'active', 'failed', 'retrying', 'asking'].includes(ST2.phase); }
function skipMission(){
  if (!canSkip()) return false;
  const M = curM();
  closePanels();
  if (!REPLAY.on){ (SAVE.skipped ||= {})[M.id] = 1; if (SKIP_GIVES[M.id]) SKIP_GIVES[M.id](); }
  banner(`⏭️ عدّيت «${M.title}»`, 'info', 2.2);
  ST2.skipping = true; finishMission();
  return true;
}
// close the small windows that lock the hero (before skipping or leaving)
function closePanels(){
  if (!$('shop').hidden){ $('shop').hidden = true; hero.locked = false; }
  if (!$('domino').hidden) closeDomino();
  if (!$('tawla').hidden) closeTawla();
  if (!$('mapOv').hidden) $('mapOv').hidden = true;
  if (ST.kind && modeId !== 'foul') exitStation(true);
}

// ---- "too hard?" after the 3rd fail of the same mission ----
function openFailAsk(){ const M = curM(); $('faSub').textContent = M ? `«${M.title}» فشلت ${ST2.fails} مرات. عادي… كلنا بنتزنق.` : ''; state = 'pause'; $('failAsk').hidden = false; }
function closeFailAsk(){ $('failAsk').hidden = true; if (state === 'pause') state = 'play'; }
$('faEasy').onclick = () => { closeFailAsk(); easyOn(); ST2.phase = 'retrying'; retryMission(); banner('😌 سهّلناها: وقت أكتر، ضرب أخف، والناس أهدى', 'ok', 3); };
$('faSkip').onclick = () => { closeFailAsk(); skipMission(); };
$('faRetry').onclick = () => { closeFailAsk(); ST2.phase = 'retrying'; retryMission(); };

// ---- pause menu (☰, Escape, Android back) ----
function openPause(){
  if (state !== 'play' || CUT.on) return;
  state = 'pause'; for (const k in keys) keys[k] = false;
  const M = curM(), story = modeId === 'story';
  $('psSub').innerHTML = story ? (M ? `${CHAPS[M.ch][0]}: ${CHAPS[M.ch][1]}<br><b>📱 ${M.title}</b>${REPLAY.on ? ' (إعادة)' : ''}` : 'خلصت القصة 👑') : (modeObj.title || '');
  const sk = $('psSkip'); sk.hidden = !story || !M; sk.disabled = !canSkip(); sk.dataset.armed = ''; sk.classList.remove('armed'); sk.textContent = '⏭️ عدّي المهمة';
  $('pause').hidden = false;
}
function closePause(){ if ($('pause').hidden) return; $('pause').hidden = true; if (state === 'pause') state = 'play'; }
$('psResume').onclick = closePause;
$('psMap').onclick = () => { closePause(); openMap(); };
$('psSet').onclick = () => { renderModes(); $('resetStory').parentElement.hidden = true; $('settings').hidden = false; };   // no wiping the story from inside it
$('psHome').onclick = () => { closePause(); closePanels(); openMenu(); };
$('psSkip').onclick = () => { const b = $('psSkip'); if (!b.dataset.armed){ b.dataset.armed = '1'; b.classList.add('armed'); b.textContent = 'متأكد؟ دوس تاني'; return; } closePause(); skipMission(); };

// ---- back: closes whatever is on top. Android back button, Escape on a computer ----
function uiBack(){
  const open = id => !$(id).hidden;
  if (open('intro')){ endIntro(); return true; }
  if (open('introStart')){ $('introStartSkip').click(); return true; }
  if (CUT.on && state === 'play') return true;                      // a cutscene has its own skip button; back does nothing (no skipping by mistake)
  if (open('tut')){ $('tutNext').click(); return true; }
  if (open('phone')){ if (PHONE.app !== 'home'){ PHONE.app = 'home'; renderPhone(); } else closePhone(); return true; }
  if (open('failAsk')){ $('faRetry').click(); return true; }
  if (open('settings')){ $('setClose').click(); return true; }
  for (const id of ['credits', 'achOv', 'missions', 'mapOv']) if (open(id)){ $(id).hidden = true; return true; }
  if (open('shop')){ $('shopClose').click(); return true; }
  if (open('photoShot')){ $('phBack').click(); return true; }
  if (PHOTO.on){ closePhoto(); return true; }
  if (open('tawla')){ closeTawla(); return true; }
  if (open('domino')){ closeDomino(); return true; }
  if (ST.kind && modeId !== 'foul'){ exitStation(); return true; }
  if (open('storyEnd')){ $('storyEndBtn').click(); return true; }
  if (open('pause')){ closePause(); return true; }
  if (open('end')){ openMenu(); return true; }
  if (state === 'play'){ openPause(); return true; }
  if (state === 'menu' && $('mmMain').hidden){ mmPage('mmMain'); return true; }
  return false;                                  // main menu with nothing open
}
addEventListener('keydown', e => { if (e.code === 'Escape' && !e.repeat && !CUT.on && !(e.target && e.target.tagName === 'INPUT')){ e.preventDefault(); uiBack(); } });
// on the main menu, back twice (within 2 s) leaves the game
let backArmT = -9999;
function backPressed(){
  if (uiBack()) return false;
  const now = performance.now();
  if (now - backArmT < 2000) return true;
  backArmT = now; const t = $('backToast'); t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800);
  return false;
}
const capApp = (() => { try { const C = window.Capacitor; if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null; return (C.Plugins && C.Plugins.App) || (C.registerPlugin ? C.registerPlugin('App') : null); } catch(e){ return null; } })();
if (capApp){ try { capApp.addListener('backButton', () => { if (backPressed()) capApp.exitApp(); }); } catch(e){ console.warn('back button', e); } }
else if (isTouch){
  // phone browser: keep one history step so the back gesture comes here instead of leaving the page
  let pushed = false;
  addEventListener('pointerdown', () => { if (!pushed){ pushed = true; history.pushState({ ty: 1 }, ''); } }, true);
  addEventListener('popstate', () => { if (backPressed()) history.back(); else history.pushState({ ty: 1 }, ''); });
}
