// ================= boot: the logo → the intro film → the main menu → the loading screen → the game =================
// A plain script that runs before the game module, so the logo, the intro and the menu show at once
// while the city is still being built in the background (game.js). If you pick something before the
// city is ready, the loading screen waits for it (BOOT.ready() is called by loadDone() in 23b).

// ---- the poster line-up (shared with the game's poster image in 19l-intro.js) ----
const POSTER_CAST = [
  { k: 'youssef', name: 'يوسف إبراهيم', line: 'حرامي الساندوتشات… ممنوع دخوله في أي حتة', color: '#f4a300', from: 1 },
  { k: 'arabi', name: 'العربي', line: 'كان عايز الشغلانة… وعايز طيارة يختفي', color: '#e0457b', from: -1 },
  { k: 'islam', name: 'إسلام', line: 'الصاحب الجدع… وعريس الحتة', color: '#12a39a', from: 1 },
  { k: 'shams', name: 'شمس', line: 'المطلوب رقم ١… كان أشطر ميكانيكي في المنطقة', color: '#c62828', from: -1 },
  { k: 'tayara', name: 'طيارة', line: 'صبي قهوجي مفلس… وهيبقى الجامد', color: '#ffc94a', from: 1 },
];
// where each one stands: x = centre, b = feet line, h = height (fractions of the frame)
const POSTER_LAYOUT = {
  wide: { youssef: { x: .085, b: .97, h: .47, z: 4 }, arabi: { x: .275, b: .95, h: .64, z: 2 }, tayara: { x: .5, b: .98, h: .74, z: 3 }, islam: { x: .725, b: .95, h: .64, z: 2 }, shams: { x: .905, b: .94, h: .7, dim: .78, z: 1 }, title: { x: .5, y: .105, s: .1 }, fx: .5 },
  menuWide: { youssef: { x: .06, b: .99, h: .42, z: 4 }, arabi: { x: .17, b: .96, h: .58, z: 2 }, tayara: { x: .32, b: .99, h: .72, z: 3 }, islam: { x: .47, b: .96, h: .58, z: 2 }, shams: { x: .4, b: .86, h: .6, dim: .6, z: 0 }, fx: .4 },
  menuTall: { arabi: { x: .2, b: .44, h: .19, z: 1 }, shams: { x: .8, b: .44, h: .2, dim: .7, z: 1 }, islam: { x: .82, b: .52, h: .22, z: 2 }, tayara: { x: .52, b: .53, h: .3, z: 3 }, youssef: { x: .16, b: .54, h: .15, z: 4 }, fx: .29 },
  tall: { arabi: { x: .2, b: .8, h: .3, z: 1 }, shams: { x: .8, b: .8, h: .32, dim: .78, z: 1 }, islam: { x: .82, b: .985, h: .34, z: 2 }, tayara: { x: .52, b: .99, h: .48, z: 3 }, youssef: { x: .17, b: .995, h: .22, z: 4 }, title: { x: .5, y: .075, s: .072 }, fx: .29 },
};
const POSTER_FILE = { shams: 'shams-solo' };
const posterImg = k => `assets/poster/${k}.webp`;
const posterPart = k => posterImg(POSTER_FILE[k] || k);
function introLayout(){
  const el = document.getElementById('iFinal'), wide = innerWidth / innerHeight >= 1.05, L = POSTER_LAYOUT[wide ? 'wide' : 'tall'];
  for (const c of POSTER_CAST){ const p = L[c.k], img = el.querySelector(`[data-k="${c.k}"]`); Object.assign(img.style, { left: `${p.x*100}%`, top: `${(p.b - p.h)*100}%`, height: `${p.h*100}%`, zIndex: p.z, filter: p.dim ? `brightness(${p.dim}) saturate(.9)` : '' }); }
  const t = document.getElementById('iTitle'); Object.assign(t.style, { left: `${L.title.x*100}%`, top: `${L.title.y*100}%`, fontSize: `${(wide ? innerHeight : innerWidth) * L.title.s * (wide ? 1 : 1.9)}px` });
  document.querySelector('#intro .ibg').style.backgroundPosition = `${L.fx*100}% center`;
}

const BOOT = (() => {
  const $ = id => document.getElementById(id);
  const get = k => { try { return localStorage.getItem(k); } catch (e){ return null; } };
  const S = { ready: false, pending: null, phase: 'splash', ldShown: 0, ldOn: false, lastArt: '', storyArt: 'tayara', introFromMenu: false };
  // the film: who appears when (seconds into assets/intro/intro.mp4)
  const TAGS = [
    { t: 9.0, end: 13.2, name: 'طيارة', line: 'صبي القهوة… وهيبقى الجامد', color: '#ffc94a' },
    { t: 16.4, end: 20.6, name: 'العربي', line: 'ابن الحاج العربي الكبير… والفلوس عنده مش مشكلة', color: '#e0457b' },
    { t: 24.6, end: 28.8, name: 'إسلام', line: 'الصاحب الجدع… وعريس الحتة', color: '#12a39a' },
    { t: 31.2, end: 35.6, name: 'يوسف إبراهيم', line: 'بيدوّر على شغل… ولقى حاجة تانية', color: '#f4a300' },
    { t: 39.4, end: 43.6, name: 'شمس', line: 'محدش شاف وشه… غير اللي ندم', color: '#c62828' },
  ];
  const TITLE_AT = 46;

  // ---- black fade between the screens ----
  function fade(mid, ms = 420){
    const f = $('bootFade'); f.style.transitionDuration = ms + 'ms'; f.classList.add('on');
    setTimeout(() => { try { mid && mid(); } catch (e){ console.error(e); } requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on'))); }, ms + 30);
  }

  // ---- 1. the logo: it comes out of the dark, a light runs across it, then «دوس في أي حتة» ----
  function splash(){
    const s = $('splash'); s.hidden = false; S.phase = 'splash';
    requestAnimationFrame(() => s.classList.add('go'));
    setTimeout(() => s.classList.add('tap'), 2600);
    s.addEventListener('pointerdown', () => { if (S.phase !== 'splash') return; S.phase = 'intro'; fade(() => { s.hidden = true; playIntro(false); }, 380); }, { once: false });
    addEventListener('keydown', e => { if (S.phase === 'splash' && (e.code === 'Enter' || e.code === 'Space')){ S.phase = 'intro'; fade(() => { s.hidden = true; playIntro(false); }, 380); } });
  }

  // ---- 2. the intro film (every launch; تخطّي skips it). From the menu's «المقدمة» it comes back to the menu ----
  const I = { playing: false, ready: false, raf: 0 };
  function playIntro(fromMenu){
    S.introFromMenu = !!fromMenu; S.phase = 'intro';
    const v = $('iVideo'), box = $('intro');
    if (!v || !v.canPlayType('video/mp4')) return fallback();
    I.playing = true; I.ready = false;
    box.hidden = false; box.className = 'intro on video'; $('iFinal').className = 'ifinal'; $('iTitle').classList.remove('slam'); $('iTap').classList.remove('show');
    const tag = $('iTag'); tag.className = 'iname'; let shown = -1, titled = false;
    if (!v.getAttribute('src')) v.src = 'assets/intro/intro.mp4';
    v.muted = get('ty_mute') === '1'; try { v.currentTime = 0; } catch (e){}
    v.onerror = fallback;
    const tick = () => {
      if (!I.playing || box.hidden) return;
      const t = v.currentTime, k = TAGS.findIndex(c => t >= c.t && t < c.end);
      if (k !== shown){
        if (k >= 0){ const c = TAGS[k]; tag.style.setProperty('--c', c.color); tag.querySelector('b').textContent = c.name; tag.querySelector('span').textContent = c.line; tag.className = 'iname'; void tag.offsetWidth; tag.className = 'iname show'; }
        else if (shown >= 0) tag.className = 'iname hide';
        shown = k;
      }
      if (!titled && t >= TITLE_AT){ titled = true; introLayout(); box.classList.add('final'); $('iFinal').className = 'ifinal in'; setTimeout(() => $('iTitle').classList.add('slam'), 60); }
      I.raf = requestAnimationFrame(tick);
    };
    v.onended = () => { $('iTap').classList.add('show'); I.ready = true; };
    const p = v.play(); if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(fallback); });
    I.raf = requestAnimationFrame(tick);
  }
  // the film can't play: the game's drawn intro if the game is ready, else straight to the menu
  function fallback(){
    I.playing = false; cancelAnimationFrame(I.raf);
    if (typeof window.__posterIntro === 'function'){ window.__posterIntro(); return; }
    endIntro();
  }
  function endIntro(){
    if (S.phase !== 'intro') return;
    const v = $('iVideo'); try { v.pause(); } catch (e){}
    I.playing = false; I.ready = false; cancelAnimationFrame(I.raf);
    if (typeof window.__introStop === 'function') window.__introStop();
    fade(() => { const box = $('intro'); box.hidden = true; box.className = 'intro'; showMenu(); }, 420);
  }

  // ---- 3. the main menu ----
  function showMenu(){
    S.phase = 'menu'; const m = $('menu'); m.hidden = false;
    m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter');
  }

  // ---- 4. the loading screen: the painted pictures (assets/loading/<name>.webp) take turns with a cross-fade until the game is ready ----
  const ART = ['tayara', 'arabi', 'islam', 'youssef', 'shams'], ALL_ART = [...ART, 'kamel'];
  const ART_LEFT = ['arabi', 'youssef', 'kamel'];   // the character stands on the left: logo and spinner go right
  const artBad = {}, SLIDE_MS = 3400;
  const artSrc = k => `assets/loading/${k}.webp`;
  function artFor(what){
    if (S.nextArt){ const k = S.nextArt; S.nextArt = null; return k; }
    if (what === 'story') return S.storyArt || 'tayara';
    if (['domino', 'tawla', 'ahwa', 'foul'].includes(what)) return 'kamel';
    let k; do { k = ART[Math.floor(Math.random() * ART.length)]; } while (k === S.lastArt);
    return k;
  }
  // the pictures load early (after the logo) so the turns are instant
  function preloadArt(){ for (const k of ALL_ART){ const i = new Image(); i.onerror = () => { artBad[k] = true; }; i.src = artSrc(k); } }
  const SL = { layers: [], cur: 0, list: [], i: 0, timer: 0 };
  function slideLayers(){
    if (SL.layers.length) return SL.layers;
    const art = $('loader').querySelector('.ld-art');
    for (let n = 0; n < 2; n++){ const im = document.createElement('img'); im.className = 'ld-slide'; im.alt = ''; im.draggable = false; art.appendChild(im); SL.layers.push(im); }
    return SL.layers;
  }
  function showSlide(k, first){
    const L = $('loader'), [a, b] = slideLayers(), next = first ? a : (SL.cur ? a : b), prev = next === a ? b : a;
    SL.cur = next === a ? 0 : 1; S.lastArt = k;
    next.onerror = () => { artBad[k] = true; };
    next.src = artSrc(k); next.classList.remove('on'); void next.offsetWidth; next.classList.add('on'); next.style.zIndex = 2; prev.style.zIndex = 1;
    if (first){ prev.classList.remove('on'); L.classList.toggle('left', ART_LEFT.includes(k)); return; }
    setTimeout(() => prev.classList.remove('on'), 1200);
    // the logo and the spinner move to the free side: out, switch, in
    L.classList.add('swap'); setTimeout(() => { L.classList.toggle('left', ART_LEFT.includes(k)); L.classList.remove('swap'); }, 450);
  }
  function startSlides(k){
    clearInterval(SL.timer);
    const rest = ALL_ART.filter(x => x !== k && !artBad[x]).sort(() => Math.random() - .5);
    SL.list = [k, ...rest]; SL.i = 0; showSlide(k, true);
    SL.timer = setInterval(() => { SL.i = (SL.i + 1) % SL.list.length; showSlide(SL.list[SL.i], false); }, SLIDE_MS);
  }
  // show it (fading through black), then run `then` behind it
  function showLoader(k, then){
    const L = $('loader');
    if (S.ldOn){ if (then) setTimeout(then, 30); return; }
    S.ldOn = true; startSlides(k);
    fade(() => { L.hidden = false; L.classList.toggle('busy', !S.ready); S.ldShown = performance.now(); if (then) setTimeout(then, 60); }, 300);
  }
  // hide it once it has been up long enough to be seen (GTA keeps it a moment)
  function hideLoader(minMs = 1500){
    if (!S.ldOn) return;
    const wait = Math.max(0, S.ldShown + minMs - performance.now());
    setTimeout(() => fade(() => { $('loader').hidden = true; S.ldOn = false; clearInterval(SL.timer); }, 380), wait);
  }

  // ---- menu presses before the city is ready: show the loading screen and do them when it is ----
  const MODE_OF = b => b.id === 'mmPlay' ? 'story' : b.dataset.mode || '';
  function intercept(e){
    if (S.ready) return;
    const b = e.target.closest && e.target.closest('button'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    S.pending = b; showLoader(artFor(MODE_OF(b) || 'any'));
  }
  function ready(){
    S.ready = true; document.body.classList.add('game-ready'); $('loader').classList.remove('busy');
    const b = S.pending; S.pending = null;
    if (!b) return;
    if (MODE_OF(b)) b.click();                       // a mode: the game takes it from here (the loader stays up until it's running)
    else { hideLoader(600); setTimeout(() => b.click(), 450); }   // a page (settings, missions…): just open it
  }

  function start(){
    const m = $('menu'); m.hidden = true;
    m.addEventListener('click', intercept, true);
    if (new URLSearchParams(location.search).get('skipintro') === '1'){ $('splash').hidden = true; showMenu(); preloadArt(); return; }
    splash();
    setTimeout(preloadArt, 2500);
  }
  // the intro's buttons (the game's 19l only adds the drawn fallback)
  $('introSkip').addEventListener('click', e => { e.stopPropagation(); endIntro(); });
  $('intro').addEventListener('pointerdown', e => { if (I.ready && !e.target.closest('button')) endIntro(); });
  addEventListener('resize', () => { if (!$('intro').hidden) introLayout(); });
  start();
  return { S, ready, showLoader, hideLoader, artFor, playIntro: () => playIntro(true), endIntro, fade, showMenu, introReady(){ I.ready = true; }, get phase(){ return S.phase; }, set phase(v){ S.phase = v; } };
})();
