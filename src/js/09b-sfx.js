// ================= sound effects =================
// Everything is made in code with Web Audio (no sound files): the engine that rises and falls with speed,
// tyres, doors, crashes, footsteps, punches, falls, the sea and gulls, crickets at night, the shisha, UI clicks.
const SFX = { ready: false, stepD: 0, lastSp: 0, crashT: 0, gullT: 4, cricketT: 2, shishaT: 2, eng: null, skid: null, sea: null };
function sfxVol(x, z, r = 8){ const d = Math.hypot(camera.position.x - x, camera.position.z - z); return 1 / (1 + Math.max(0, d - 2) / r); }
function loopNoise(type, freq, q = .7){
  if (!noiseBuf){ noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1; }
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.loopStart = Math.random() * .5;
  const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = AC.createGain(); g.gain.value = 0;
  s.connect(f); f.connect(g); g.connect(sfx); s.start(); return { s, f, g };
}
function sfxInit(){
  if (!AC || SFX.ready) return; SFX.ready = true;
  // engine: a sawtooth and a square an octave down, through a low-pass, plus a little rumble
  const o1 = AC.createOscillator(), o2 = AC.createOscillator(), g2 = AC.createGain(), lp = AC.createBiquadFilter(), g = AC.createGain();
  o1.type = 'sawtooth'; o2.type = 'square'; g2.gain.value = .45; lp.type = 'lowpass'; lp.frequency.value = 600; g.gain.value = 0;
  o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(sfx); o1.start(); o2.start();
  SFX.eng = { o1, o2, lp, g, rumble: loopNoise('lowpass', 220) };
  SFX.skid = loopNoise('bandpass', 1700, 3);
  SFX.sea = loopNoise('lowpass', 520, .5);
  SFX.wind = loopNoise('bandpass', 380, .4);
}
const ramp = (param, v, dt, k = 8) => { param.value += (v - param.value) * (1 - Math.exp(-k * dt)); };
// one-shots
function stepSfx(sp){ const v = Math.min(1, sp / 4); if (playS(HOUSE.inside ? 'stepw' : 'step', .22 + .22 * v)) return; noise(.045, 650 + Math.random() * 500, .09 * v); tone(130 + Math.random() * 30, 70, .05, 'sine', .05 * v); }
function punchWhoosh(){ noise(.16, 1300, .22, 0, 'bandpass'); }
function thud(v = 1){ if (playS('fall', Math.min(1, .85 * v))) return; tone(110, 42, .28, 'sine', .4 * v); noise(.14, 380, .32 * v); }
function doorSfx(slam = true){ noise(.05, 2400, .16, 0, 'highpass'); if (slam){ tone(170, 80, .14, 'square', .07, .06); noise(.1, 500, .3, .06); } }
function engineStart(type){ const b = type === 'moto' ? 70 : type === 'tuk' ? 52 : 40; tone(b * .6, b * 1.6, .35, 'sawtooth', .07); tone(b * 1.6, b * 1.1, .4, 'sawtooth', .05, .32); }
function crashSfx(sp){ const v = Math.min(1, sp / 18) * .6 + .4; if (playS('metal', v)){ if (sp > 12) playS('glass', .55 * v); playS('crash', .4 * v); return; } noise(.4, 650, .7 * v); tone(90, 38, .32, 'sawtooth', .22 * v); tone(3100, 2600, .18, 'sine', .04 * v, .06); tone(4200, 3800, .14, 'sine', .03 * v, .1); }
function gull(v){ const p = 1 + Math.random() * .25; tone(1500 * p, 950 * p, .22, 'sawtooth', .018 * v); tone(1650 * p, 1000 * p, .2, 'sawtooth', .015 * v, .26); }
function cricket(v){ const f = 4200 + Math.random() * 600; for (let i = 0; i < 3; i++) tone(f, f * .97, .035, 'sine', .012 * v, i * .06); }
function shishaBubbles(v){ const n = 3 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) tone(280 + Math.random() * 180, 700 + Math.random() * 500, .07, 'sine', .05 * v, i * (.06 + Math.random() * .05)); }
function tileClack(){ noise(.03, 3200, .25, 0, 'highpass'); tone(2100, 1500, .04, 'triangle', .06); }
function uiClick(){ tone(1250, 900, .035, 'triangle', .045); }
document.addEventListener('click', e => { if (AC && !muted && e.target.closest && e.target.closest('button')) uiClick(); }, true);

function sfxUpdate(dt, t){
  if (!AC) return; sfxInit(); if (!SAMP.loading) loadSamples(); if (!SFX.ready || dt <= 0) return;
  const playing = state === 'play' && !CUT.on, v = hero.veh;
  // engine and tyres of the vehicle you drive
  let eg = 0, pitch = 40, sk = 0;
  if (v && playing){
    const sp = Math.abs(v.speed), base = v.type === 'moto' ? 72 : v.type === 'tuk' ? 50 : 38;
    const gear = sp < 1 ? 0 : (sp % 9) / 9;                       // the pitch climbs, drops at each gear change, climbs again
    pitch = base * (1 + sp * .03 + gear * .55); eg = v.type === 'moto' ? .055 : v.type === 'tuk' ? .05 : .045;
    const dv = (SFX.lastSp - sp) / dt; SFX.lastSp = sp;
    if ((dv > 12 && sp > 6) || (Math.abs(v.steer || 0) > .75 && sp > 14)) sk = v.type === 'moto' ? .05 : .085;
  } else SFX.lastSp = 0;
  const E = SFX.eng; ramp(E.o1.frequency, pitch, dt, 10); ramp(E.o2.frequency, pitch / 2, dt, 10); ramp(E.lp.frequency, 300 + pitch * 7, dt, 6);
  if (SAMP.eng){   // the recorded engine: its speed follows the revs; the drawn one stays silent
    const base0 = v ? (v.type === 'moto' ? 72 : v.type === 'tuk' ? 50 : 38) : 38, er = pitch / base0, kind = v && v.type === 'moto' ? 1.3 : v && v.type === 'tuk' ? 1.15 : 1;
    ramp(SAMP.eng.src.playbackRate, clamp((.62 + (er - 1) * .95) * kind, .55, 2.4), dt, 10); ramp(SAMP.eng.g.gain, muted ? 0 : eg * 6, dt, 6);
    ramp(E.g.gain, 0, dt, 6); ramp(E.rumble.g.gain, muted ? 0 : eg * .35, dt, 6);
  } else { ramp(E.g.gain, muted ? 0 : eg, dt, 6); ramp(E.rumble.g.gain, muted ? 0 : eg * .8, dt, 6); } ramp(SFX.skid.g.gain, muted ? 0 : sk, dt, 14);
  SFX.crashT -= dt;
  // footsteps
  if (!v && playing && !hero.locked && !MOVE.air && !MOVE.swim && !MOVE.climb){ const sp = Math.hypot(hero.vel.x, hero.vel.z); if (sp > .5){ SFX.stepD += sp * dt; if (SFX.stepD > (sp > 5.4 ? 1.45 : .78)){ SFX.stepD = 0; stepSfx(sp); } } else SFX.stepD = .5; }
  // the sea along the corniche (louder as you get close, rolling like waves), wind, gulls by day, crickets at night
  const p = v ? v.pos : hero.pos, toSea = Math.max(0, NILE_Z - p.z), near = clamp(1 - toSea / 55, 0, 1);
  const outside = state === 'play' && !HOUSE.inside && !ST.kind;
  ramp(SFX.sea.g.gain, muted || !outside ? 0 : near * (.045 + .03 * Math.sin(t * .5) + .015 * Math.sin(t * 1.3)), dt, 3);
  ramp(SFX.wind.g.gain, muted || !outside ? 0 : .006 + near * .012 + .004 * Math.sin(t * .23), dt, 2);
  const night = isNight();
  if (outside && !muted){
    if (!night && near > .15){ SFX.gullT -= dt; if (SFX.gullT <= 0){ SFX.gullT = R(5, 13); gull(near); } }
    if (night){ SFX.cricketT -= dt; if (SFX.cricketT <= 0){ SFX.cricketT = R(.6, 2.2); cricket(1 - near * .7); } }
    // الحاج كامل's shisha at the domino table: bubbles when you're near
    const dv = sfxVol(SPOT.domino.x, SPOT.domino.z, 3); if (dv > .25){ SFX.shishaT -= dt; if (SFX.shishaT <= 0){ SFX.shishaT = R(3, 6.5); shishaBubbles(dv); } }
  }
}
